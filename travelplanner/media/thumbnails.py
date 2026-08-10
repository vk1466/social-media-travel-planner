"""Download Instagram cover images and store durable copies in S3."""

from __future__ import annotations

import logging
import re
import ssl
import urllib.error
import urllib.request
from functools import lru_cache
from typing import Any

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


def extension_for_content_type(content_type: str) -> str:
  base = content_type.split(";", 1)[0].strip().lower()
  return _CONTENT_TYPE_EXTENSIONS.get(base, ".jpg")


def object_key(post_id: str, *, content_type: str = "image/jpeg") -> str:
  platform, native_id = parse_post_id(post_id)
  safe_native = _SAFE_KEY_SEGMENT.sub("_", native_id.strip()) or "unknown"
  ext = extension_for_content_type(content_type)
  return f"thumbnails/{platform.value}/{safe_native}{ext}"


def public_object_url(*, bucket: str, key: str, region: str) -> str:
  return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


def download_image(url: str) -> tuple[bytes, str]:
  """Fetch image bytes and content-type from a CDN URL."""
  request = urllib.request.Request(
    url,
    headers={
      "User-Agent": "Mozilla/5.0",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  )
  with urllib.request.urlopen(request, timeout=20, context=_SSL_CONTEXT) as response:
    content_type = response.headers.get_content_type() or "application/octet-stream"
    body = response.read()
  if not content_type.startswith("image/") or not body:
    raise ValueError(f"Upstream response was not an image ({content_type})")
  return body, content_type


def persist_thumbnail(post_id: str, source_url: str | None) -> str | None:
  """Download `source_url` into MEDIA_BUCKET and return the public HTTPS URL.

  Returns None when MEDIA_BUCKET is unset, source_url is empty, or download/upload fails.
  Never raises — callers keep the CDN URL as a temporary fallback.
  """
  bucket = settings.media_bucket()
  if not bucket:
    return None
  trimmed = (source_url or "").strip()
  if not trimmed:
    return None

  try:
    body, content_type = download_image(trimmed)
    key = object_key(post_id, content_type=content_type)
    region = settings.dynamodb_region()
    _s3_client().put_object(
      Bucket=bucket,
      Key=key,
      Body=body,
      ContentType=content_type,
      CacheControl="public, max-age=31536000, immutable",
    )
    durable = public_object_url(bucket=bucket, key=key, region=region)
    logger.info(
      "persist_thumbnail ok post_id=%s bytes=%d key=%s",
      post_id,
      len(body),
      key,
    )
    return durable
  except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, OSError, ValueError) as exc:
    logger.warning("persist_thumbnail failed post_id=%s: %s", post_id, exc)
    return None
  except Exception as exc:  # boto / unexpected — never fail ingest
    logger.warning("persist_thumbnail failed post_id=%s: %s", post_id, exc)
    return None
