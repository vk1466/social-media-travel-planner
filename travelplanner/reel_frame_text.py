"""Sample frames from a reel/video and OCR on-screen text (OpenAI vision)."""

from __future__ import annotations

import logging
import re
import subprocess
import tempfile
from pathlib import Path

from travelplanner.clients.openai import get_client
from travelplanner.image_text import download_bytes, merge_ocr_lines, ocr_image_path

logger = logging.getLogger(__name__)

DEFAULT_FRAME_TIMESTAMPS_SECONDS = tuple(
  round(t * 1.5, 1) for t in range(1, 21)
)

_EXPECTED_COUNT_PATTERNS = [
  re.compile(r"\btop\s*(\d{1,2})\b", re.IGNORECASE),
  re.compile(
    r"\b(\d{1,2})\s*(?:best|hidden|must[- ](?:see|visit)|favorite|secret|top|unreal|incredible)\s+"
    r"(?:places|spots|things|cafes|restaurants|stops|gems|destinations|activities|locations|beaches|hikes|attractions)\b",
    re.IGNORECASE,
  ),
  re.compile(
    r"\b(\d{1,2})\s+(?:places|spots|things|cafes|restaurants|stops|gems|destinations|beaches|hikes|attractions)\s+"
    r"(?:to\s+(?:visit|see|do|eat|try)|in|around|near|of)\b",
    re.IGNORECASE,
  ),
  re.compile(r"\b(\d{1,2})\s+of\s+the\s+best\b", re.IGNORECASE),
]


def parse_expected_list_count(text: str | None) -> int | None:
  """Detect expected count from phrases like 'Top 10', '10 best places', '7 things to do'."""
  if not text or not text.strip():
    return None
  for pattern in _EXPECTED_COUNT_PATTERNS:
    match = pattern.search(text)
    if match:
      try:
        count = int(match.group(1))
        if 2 <= count <= 50:
          return count
      except (ValueError, TypeError):
        pass
  return None


def adaptive_frame_timestamps(
  duration_s: float,
  max_frames: int = 30,
  interval_s: float = 1.5,
) -> tuple[float, ...]:
  """Generate timestamps across video key moments (adaptive, 1 every ~1.5s, capped)."""
  if duration_s <= 2.0:
    return (round(max(0.5, duration_s / 2.0), 1),)

  timestamps: list[float] = []
  t = 0.5
  while t < duration_s - 0.2 and len(timestamps) < max_frames - 1:
    timestamps.append(round(t, 1))
    t += interval_s

  end_card = round(max(0.5, duration_s - 1.0), 1)
  if end_card not in timestamps and len(timestamps) < max_frames:
    timestamps.append(end_card)

  return tuple(sorted(set(timestamps))[:max_frames])


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
  timestamps: tuple[float, ...] | None = None,
  adaptive: bool = True,
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

    if timestamps is not None:
      selected_timestamps = timestamps
    elif adaptive:
      duration = _probe_duration_seconds(video_path)
      if duration and duration > 0:
        selected_timestamps = adaptive_frame_timestamps(duration)
      else:
        selected_timestamps = DEFAULT_FRAME_TIMESTAMPS_SECONDS
    else:
      selected_timestamps = DEFAULT_FRAME_TIMESTAMPS_SECONDS

    frames = _sample_frames(video_path, work, selected_timestamps)
    if not frames:
      return None
    texts = [
      ocr_image_path(path, hint=f"Frame at {timestamp_s}s")
      for timestamp_s, path in frames
    ]
    return merge_ocr_lines(texts)
