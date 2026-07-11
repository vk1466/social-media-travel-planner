from __future__ import annotations

import ssl
import urllib.error
import urllib.request
from urllib.parse import urlparse

import certifi
from fastapi import HTTPException
from fastapi.responses import Response

ALLOWED_MEDIA_HOST_SUFFIXES = (
  ".cdninstagram.com",
  ".fbcdn.net",
  "cdninstagram.com",
  "fbcdn.net",
  "instagram.com",
)

# Match geocoder: macOS Python often lacks system CAs without certifi.
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())


def is_allowed_media_url(url: str) -> bool:
  try:
    parsed = urlparse(url)
  except ValueError:
    return False
  if parsed.scheme not in {"http", "https"}:
    return False
  host = (parsed.hostname or "").lower()
  if not host:
    return False
  return any(host == suffix.lstrip(".") or host.endswith(suffix) for suffix in ALLOWED_MEDIA_HOST_SUFFIXES)


def fetch_proxied_media(url: str) -> Response:
  if not is_allowed_media_url(url):
    raise HTTPException(status_code=400, detail="Media host not allowed")

  request = urllib.request.Request(
    url,
    headers={
      "User-Agent": "Mozilla/5.0",
      "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  )
  try:
    with urllib.request.urlopen(request, timeout=20, context=_SSL_CONTEXT) as upstream:
      content = upstream.read()
      content_type = upstream.headers.get_content_type()
  except urllib.error.HTTPError as exc:
    raise HTTPException(status_code=502, detail=f"Upstream returned {exc.code}") from exc
  except urllib.error.URLError as exc:
    raise HTTPException(status_code=502, detail=f"Failed to fetch media: {exc.reason}") from exc

  if not content_type.startswith("image/"):
    raise HTTPException(status_code=502, detail="Upstream response was not an image")

  return Response(
    content=content,
    media_type=content_type,
    headers={
      "Cache-Control": "public, max-age=86400",
    },
  )
