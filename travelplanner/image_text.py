"""Download images and OCR on-screen text (OpenAI vision).

Shared by carousel/image posts and reel frame sampling.
"""

from __future__ import annotations

import base64
import logging
import ssl
import urllib.request
from pathlib import Path

import certifi

from travelplanner import settings
from travelplanner.clients.openai import get_client

logger = logging.getLogger(__name__)

OCR_SYSTEM = (
  "Extract ONLY text visibly written on the image (titles, overlays, map labels, "
  "watermarks). Return verbatim text, one line per distinct text block. "
  "If there is no readable text, return an empty string. "
  "Do not describe the scene."
)


def download_bytes(url: str, *, timeout: int = 60) -> bytes | None:
  """Fetch URL bytes; return None on failure."""
  if not url.strip():
    return None
  context = ssl.create_default_context(cafile=certifi.where())
  req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
  try:
    with urllib.request.urlopen(req, timeout=timeout, context=context) as resp:
      data = resp.read()
    return data if data else None
  except Exception:
    logger.exception("image download failed url=%s", url[:120])
    return None


def ocr_image_bytes(image_bytes: bytes, *, hint: str = "Image") -> str:
  """Verbatim on-image text via OpenAI vision, or empty string on failure."""
  client = get_client()
  if client is None or not image_bytes:
    return ""
  b64 = base64.b64encode(image_bytes).decode("ascii")
  try:
    resp = client.chat.completions.create(
      model=settings.openai_model(),
      temperature=0,
      messages=[
        {"role": "system", "content": OCR_SYSTEM},
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": f"{hint}. Verbatim on-image text only.",
            },
            {
              "type": "image_url",
              "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
            },
          ],
        },
      ],
    )
  except Exception:
    logger.exception("openai vision OCR failed hint=%s", hint)
    return ""
  return (resp.choices[0].message.content or "").strip()


def ocr_image_path(image_path: Path, *, hint: str = "Image") -> str:
  return ocr_image_bytes(image_path.read_bytes(), hint=hint)


def merge_ocr_lines(per_image_text: list[str]) -> str | None:
  """Dedupe lines across slides/frames (case-insensitive)."""
  seen: set[str] = set()
  merged: list[str] = []
  for text in per_image_text:
    for line in text.splitlines():
      cleaned = line.strip().strip("`").strip()
      if not cleaned:
        continue
      key = cleaned.lower()
      if key in seen:
        continue
      seen.add(key)
      merged.append(cleaned)
  return "\n".join(merged) if merged else None


def read_image_urls_text(image_urls: list[str] | tuple[str, ...]) -> str | None:
  """Download each image URL, OCR, return merged on-image text."""
  urls = [u for u in image_urls if u and str(u).strip()]
  if not urls:
    return None
  if get_client() is None:
    logger.warning("image OCR skipped: OpenAI not configured")
    return None

  texts: list[str] = []
  for index, url in enumerate(urls):
    data = download_bytes(str(url))
    if not data:
      continue
    text = ocr_image_bytes(data, hint=f"Slide {index + 1}")
    if text:
      texts.append(text)
  return merge_ocr_lines(texts)
