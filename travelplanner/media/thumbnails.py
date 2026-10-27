"""Download Instagram cover images and creator avatars and store durable copies in Vercel Blob or S3."""

from __future__ import annotations

import json
import logging
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from functools import lru_cache
from typing import Any
from urllib.parse import urlparse

import boto3
import certifi

from travelplanner import settings
from travelplanner.models import parse_post_id

logger = logging.getLogger(__name__)

_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

_CONTENT_TYPE_EXTENSIONS = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
}

_SAFE_KEY_SEGMENT = re.compile(r"[^A-Za-z0-9._-]+")


@lru_cache(maxsize=1)
def _s3_client() -> Any:
  return boto3.client("s3", region_name=settings.dynamodb_region())


def reset_s3_client_cache() -> None:
  """Clear cached S3 client (tests when env/moto changes)."""
  _s3_client.cache_clear()


def is_durable_media_url(url: str | None) -> bool:
  """Check if a URL points to durable storage (Vercel Blob or AWS S3)."""
  if not url or not url.strip():
    return False
  try:
    host = urlparse(url.strip()).hostname or ""
  except ValueError:
    return False
  host = host.lower()
  return (
    ("amazonaws.com" in host and "s3" in host)
    or "blob.vercel-storage.com" in host
    or "vercel-storage.com" in host
  )


def extension_for_content_type(content_type: str) -> str:
  base = content_type.split(";", 1)[0].strip().lower()
  return _CONTENT_TYPE_EXTENSIONS.get(base, ".jpg")


def object_key(post_id: str, *, content_type: str = "image/jpeg") -> str:
  platform, native_id = parse_post_id(post_id)
  safe_native = _SAFE_KEY_SEGMENT.sub("_", native_id.strip()) or "unknown"
  ext = extension_for_content_type(content_type)
  return f"thumbnails/{platform.value}/{safe_native}{ext}"


def avatar_object_key(identifier: str, *, content_type: str = "image/jpeg") -> str:
  safe_id = _SAFE_KEY_SEGMENT.sub("_", identifier.strip().lstrip("@")) or "unknown"
  ext = extension_for_content_type(content_type)
  return f"avatars/{safe_id}{ext}"


def public_object_url(*, bucket: str, key: str, region: str) -> str:
  return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


def download_image(url: str) -> tuple[bytes, str]:
  """Fetch image bytes and content-type from a CDN URL with anti-blocking headers."""
  request = urllib.request.Request(
    url,
    headers={
      "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
      ),
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      "Referer": "https://www.instagram.com/",
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site",
    },
  )
  with urllib.request.urlopen(request, timeout=20, context=_SSL_CONTEXT) as response:
    content_type = response.headers.get_content_type() or "application/octet-stream"
    body = response.read()
  if not content_type.startswith("image/") or not body:
    raise ValueError(f"Upstream response was not an image ({content_type})")
  return body, content_type


def _upload_to_vercel_blob(
  pathname: str,
  body: bytes,
  content_type: str,
  token: str,
) -> str:
  """Upload raw bytes to Vercel Blob store via REST API and return the public URL."""
  clean_path = pathname.lstrip("/")
  url = f"https://blob.vercel-storage.com/{urllib.parse.quote(clean_path)}"
  request = urllib.request.Request(
    url,
    data=body,
    headers={
      "Authorization": f"Bearer {token}",
      "x-api-version": "7",
      "content-type": content_type,
      "x-add-random-suffix": "false",
    },
    method="PUT",
  )
  with urllib.request.urlopen(request, timeout=30, context=_SSL_CONTEXT) as resp:
    data = json.loads(resp.read().decode("utf-8"))
    return str(data["url"])


def _store_media_bytes(key: str, body: bytes, content_type: str) -> str | None:
  """Upload bytes to Vercel Blob (if token set) or S3 (if bucket set)."""
  blob_token = settings.blob_read_write_token()
  if blob_token:
    return _upload_to_vercel_blob(key, body, content_type, blob_token)

  bucket = settings.media_bucket()
  if bucket:
    region = settings.dynamodb_region()
    _s3_client().put_object(
      Bucket=bucket,
      Key=key,
      Body=body,
      ContentType=content_type,
      CacheControl="public, max-age=31536000, immutable",
    )
    return public_object_url(bucket=bucket, key=key, region=region)

  return None


def persist_thumbnail(post_id: str, source_url: str | None) -> str | None:
  """Download `source_url` into Vercel Blob or S3 and return the permanent public HTTPS URL.

  Returns None when neither storage is configured, source_url is empty, or download/upload fails.
  Never raises — callers keep the CDN URL as a temporary fallback.
  """
  trimmed = (source_url or "").strip()
  if not trimmed:
    return None

  # If already in durable storage, don't re-download
  if is_durable_media_url(trimmed):
    return trimmed

  # Check if any storage backend is configured
  if not settings.blob_read_write_token() and not settings.media_bucket():
    return None

  try:
    body, content_type = download_image(trimmed)
    key = object_key(post_id, content_type=content_type)
    durable = _store_media_bytes(key, body, content_type)
    if durable:
      logger.info(
        "persist_thumbnail ok post_id=%s bytes=%d url=%s",
        post_id,
        len(body),
        durable[:96],
      )
    return durable
  except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
    logger.warning("persist_thumbnail failed post_id=%s: %s", post_id, exc)
    return None
  except Exception as exc:  # boto / unexpected — never fail ingest
    logger.warning("persist_thumbnail failed post_id=%s: %s", post_id, exc)
    return None


def persist_avatar(identifier: str, source_url: str | None) -> str | None:
  """Download creator avatar into Vercel Blob or S3 and return the permanent public HTTPS URL."""
  trimmed = (source_url or "").strip()
  if not trimmed:
    return None

  if is_durable_media_url(trimmed):
    return trimmed

  if not settings.blob_read_write_token() and not settings.media_bucket():
    return None

  try:
    body, content_type = download_image(trimmed)
    key = avatar_object_key(identifier, content_type=content_type)
    durable = _store_media_bytes(key, body, content_type)
    if durable:
      logger.info(
        "persist_avatar ok id=%s bytes=%d url=%s",
        identifier,
        len(body),
        durable[:96],
      )
    return durable
  except Exception as exc:
    logger.warning("persist_avatar failed id=%s: %s", identifier, exc)
    return None
