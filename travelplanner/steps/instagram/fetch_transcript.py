from __future__ import annotations

import logging
import re
from dataclasses import replace

from travelplanner.clients.supadata import fetch_transcript
from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.steps.instagram.media import canonical_media_url

logger = logging.getLogger(__name__)

MUSIC_TAG_PATTERN = re.compile(
  r"[♪♫♩♬]|\[(?:music|singing|instrumental|applause)\]|\((?:music|singing|instrumental)\)",
  re.IGNORECASE,
)

REPETITIVE_LYRIC_PATTERN = re.compile(
  r"\b(la\s+la|na\s+na|yeah\s+yeah|oh\s+oh|ooh\s+ooh|baby\s+baby|hey\s+hey|da\s+da)\b",
  re.IGNORECASE,
)


def is_music_transcript(transcript: str | None) -> bool:
  """Detect if a transcript represents background music/song lyrics rather than spoken speech."""
  if not transcript or not transcript.strip():
    return False
  text = transcript.strip()

  # 1. Direct musical notes or tags
  if MUSIC_TAG_PATTERN.search(text):
    return True

  lines = [line.strip() for line in text.split("\n") if line.strip()]
  if not lines:
    return False

  # 2. Check musical note lines ratio
  music_tagged_lines = sum(1 for line in lines if MUSIC_TAG_PATTERN.search(line))
  if music_tagged_lines / len(lines) >= 0.15:
    return True

  # 3. Repetitive chorus / pop lyric words
  lyric_matches = len(REPETITIVE_LYRIC_PATTERN.findall(text))
  if lyric_matches >= 2:
    return True

  # 4. Low vocabulary richness with short phrases
  words = re.findall(r"\b[A-Za-z']+\b", text.lower())
  if len(words) >= 15:
    unique_ratio = len(set(words)) / len(words)
    avg_line_len = len(words) / max(1, len(lines))
    if unique_ratio < 0.38 and avg_line_len < 6.0:
      return True

  return False


def fetch_transcript_step(ctx: IngestContext) -> IngestContext:
  if ctx.resource_type not in {"video", "reel"}:
    return ctx
  if not ctx.shortcode:
    return ctx
  media_kind = ctx.resource_type
  media_url = canonical_media_url(ctx.shortcode, media_kind)
  raw_transcript = fetch_transcript(media_url)
  is_music = is_music_transcript(raw_transcript)
  ctx.transcript = raw_transcript
  ctx.transcript_is_music = is_music
  if ctx.post is not None:
    ctx.post = replace(ctx.post, transcript=raw_transcript, transcript_is_music=is_music)
  logger.info(
    "fetch_transcript shortcode=%s has_transcript=%s is_music=%s",
    ctx.shortcode,
    bool(ctx.transcript),
    is_music,
  )
  return ctx


FETCH_TRANSCRIPT_STEP = Step(
  name="fetch_transcript",
  run=fetch_transcript_step,
  retry_attempts=1,
  retry_backoff_seconds=1.0,
  retry_on=(TimeoutError, ConnectionError, OSError),
)
