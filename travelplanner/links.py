from __future__ import annotations

import re

from travelplanner.models import Platform

INSTAGRAM_SHORTCODE_PATTERN = re.compile(
  r"instagram\.com/(?:p|reels?|tv)/([A-Za-z0-9_-]+)",
  re.IGNORECASE,
)


def detect_platform(post_url: str) -> Platform | None:
  lowered = post_url.lower()
  if "instagram.com" in lowered:
    return Platform.INSTAGRAM
  if "youtube.com" in lowered or "youtu.be" in lowered:
    return Platform.YOUTUBE
  if "tiktok.com" in lowered:
    return Platform.TIKTOK
  if "reddit.com" in lowered:
    return Platform.REDDIT
  return None


def extract_instagram_shortcode(post_url: str) -> str:
  match = INSTAGRAM_SHORTCODE_PATTERN.search(post_url)
  if not match:
    raise ValueError(
      f"Could not extract Instagram shortcode from URL: {post_url!r} "
      "(expected /p/, /reel/, /reels/, or /tv/ path)"
    )
  return match.group(1)


def extract_post_id(platform: Platform, post_url: str) -> str:
  if platform == Platform.INSTAGRAM:
    return extract_instagram_shortcode(post_url)
  raise ValueError(f"No post ID extractor for platform: {platform.value}")
