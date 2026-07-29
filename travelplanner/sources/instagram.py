"""Instagram fetch — thin shim over steps (kept for tests and PLATFORM_FETCHERS)."""

from __future__ import annotations

from datetime import UTC, datetime

from travelplanner.clients.ensembledata import fetch_post_info_and_comments
from travelplanner.clients.supadata import fetch_transcript
from travelplanner.extract import ContentBundle, fetch_places_from_content
from travelplanner.links import extract_instagram_shortcode
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.steps.instagram.media import (
  TOP_COMMENT_LIMIT,
  canonical_media_url,
  location_tag,
  trim_post_info,
)

# Re-export for tests that import private helpers historically.
_trim_post_info = trim_post_info


def fetch_instagram_post(post_url: str) -> SavedPost:
  """Legacy one-shot fetch+extract. Prefer the Instagram pipeline for new code."""
  shortcode = extract_instagram_shortcode(post_url)
  raw = fetch_post_info_and_comments(code=shortcode, num_comments=TOP_COMMENT_LIMIT)
  trimmed = trim_post_info(raw)
  media_kind = trimmed["media_kind"]
  transcript = (
    fetch_transcript(canonical_media_url(shortcode, media_kind))
    if media_kind in {"video", "reel"}
    else None
  )
  extraction = fetch_places_from_content(
    ContentBundle(
      caption=trimmed["caption"],
      hashtags=trimmed["hashtags"],
      top_comments=trimmed["top_comments"],
      location_tag=location_tag(trimmed["places"]),
      transcript=transcript,
    )
  )
  return SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, shortcode),
    post_url=post_url,
    platform=Platform.INSTAGRAM,
    extracted_places=extraction.places,
    reel_summary=extraction.reel_summary,
    fetched_at=datetime.now(tz=UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
    **trimmed,
  )
