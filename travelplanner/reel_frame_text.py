"""Sample frames from a reel/video and OCR on-screen text (OpenAI vision)."""

from __future__ import annotations

import base64
import logging
import ssl
import subprocess
import tempfile
import urllib.request
from pathlib import Path

import certifi

from travelplanner import settings
from travelplanner.clients.openai import get_client

logger = logging.getLogger(__name__)

DEFAULT_FRAME_TIMESTAMPS_SECONDS = (0.5, 2.0, 5.0, 8.0, 12.0, 15.0)
_OCR_SYSTEM = (
  "Extract ONLY text visibly written on the image (titles, overlays, map labels, "
  "watermarks). Return verbatim text, one line per distinct text block. "
  "If there is no readable text, return an empty string. "
  "Do not describe the scene."
)


def _download_video(video_url: str, dest: Path) -> bool:
  context = ssl.create_default_context(cafile=certifi.where())
  req = urllib.request.Request(video_url, headers={"User-Agent": "Mozilla/5.0"})
  try:
    with urllib.request.urlopen(req, timeout=90, context=context) as resp:
      dest.write_bytes(resp.read())
    return dest.exists() and dest.stat().st_size > 0
  except Exception:
    logger.exception("reel frame download failed")
    return False


def _ffmpeg_exe() -> str | None:
  try:
    import imageio_ffmpeg
  except ImportError:
    logger.warning("imageio-ffmpeg not installed; reel frame OCR unavailable")
    return None
  return imageio_ffmpeg.get_ffmpeg_exe()


def _sample_frames(
  video_path: Path,
  work_dir: Path,
  timestamps: tuple[float, ...],
) -> list[tuple[float, Path]]:
  ffmpeg = _ffmpeg_exe()
  if not ffmpeg:
    return []

  frames: list[tuple[float, Path]] = []
  for index, timestamp in enumerate(timestamps):
    out_path = work_dir / f"frame_{index}_{timestamp:.1f}s.jpg"
    cmd = [
      ffmpeg,
      "-y",
      "-ss",
      str(timestamp),
      "-i",
      str(video_path),
      "-frames:v",
      "1",
      "-q:v",
      "2",
      str(out_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if out_path.exists() and out_path.stat().st_size > 0:
      frames.append((timestamp, out_path))
    else:
      logger.warning(
        "ffmpeg frame sample failed t=%.1fs err=%s",
        timestamp,
        (proc.stderr or "")[-200:],
      )
  return frames


def _ocr_frame(image_path: Path, *, timestamp_s: float) -> str:
  client = get_client()
  if client is None:
    return ""
  b64 = base64.b64encode(image_path.read_bytes()).decode("ascii")
  try:
    resp = client.chat.completions.create(
      model=settings.openai_model(),
      temperature=0,
      messages=[
        {"role": "system", "content": _OCR_SYSTEM},
        {
          "role": "user",
          "content": [
            {
              "type": "text",
              "text": f"Frame at {timestamp_s}s. Verbatim on-image text only.",
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
    logger.exception("openai vision OCR failed t=%.1fs", timestamp_s)
    return ""
  return (resp.choices[0].message.content or "").strip()


def _merge_ocr_lines(per_frame_text: list[str]) -> str | None:
  seen: set[str] = set()
  merged: list[str] = []
  for text in per_frame_text:
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


def read_reel_frame_text(
  video_url: str,
  *,
  timestamps: tuple[float, ...] = DEFAULT_FRAME_TIMESTAMPS_SECONDS,
) -> str | None:
  """Download a video, OCR sampled frames, return merged on-screen text."""
  if not video_url.strip():
    return None
  if get_client() is None:
    logger.warning("reel frame OCR skipped: OpenAI not configured")
    return None
  if _ffmpeg_exe() is None:
    return None

  with tempfile.TemporaryDirectory(prefix="reel_frames_") as tmp:
    work = Path(tmp)
    video_path = work / "reel.mp4"
    if not _download_video(video_url, video_path):
      return None
    frames = _sample_frames(video_path, work, timestamps)
    if not frames:
      return None
    texts = [_ocr_frame(path, timestamp_s=ts) for ts, path in frames]
    return _merge_ocr_lines(texts)
