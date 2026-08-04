"""Sample frames from a reel/video and OCR on-screen text (OpenAI vision)."""

from __future__ import annotations

import logging
import subprocess
import tempfile
from pathlib import Path

from travelplanner.clients.openai import get_client
from travelplanner.image_text import download_bytes, merge_ocr_lines, ocr_image_path

logger = logging.getLogger(__name__)

DEFAULT_FRAME_TIMESTAMPS_SECONDS = (0.5, 2.0, 5.0, 8.0, 12.0, 15.0)


def _download_video(video_url: str, dest: Path) -> bool:
  data = download_bytes(video_url, timeout=90)
  if not data:
    return False
  dest.write_bytes(data)
  return dest.exists() and dest.stat().st_size > 0


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
    texts = [
      ocr_image_path(path, hint=f"Frame at {timestamp_s}s")
      for timestamp_s, path in frames
    ]
    return merge_ocr_lines(texts)
