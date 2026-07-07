from common.models import SocialPlatform, TravelPost
from ingest.parser import parse_travel_post


def detect_platform(post_url: str) -> SocialPlatform:
  lowered = post_url.lower()
  if "instagram.com" in lowered:
    return SocialPlatform.INSTAGRAM
  if "tiktok.com" in lowered:
    return SocialPlatform.TIKTOK
  if "pinterest.com" in lowered or "pin.it" in lowered:
    return SocialPlatform.PINTEREST
  if "youtube.com" in lowered or "youtu.be" in lowered:
    return SocialPlatform.YOUTUBE
  return SocialPlatform.OTHER


def fetch_post(post_url: str) -> TravelPost:
  """
  Fetch a social post by URL.

  TODO: Wire up platform APIs or oEmbed endpoints.
  For now, returns a stub post so downstream planner code can be developed.
  """
  platform = detect_platform(post_url)
  return parse_travel_post(
    post_url=post_url,
    platform=platform,
    caption="",
    author_handle=None,
    places=(),
  )
