from common.models import Place, SocialPlatform, TravelPost
from common.text import extract_hashtags, normalize_caption


def parse_travel_post(
  *,
  post_url: str,
  platform: SocialPlatform,
  caption: str,
  author_handle: str | None = None,
  places: tuple[Place, ...] = (),
) -> TravelPost:
  """Normalize raw post fields into a TravelPost."""
  return TravelPost(
    post_url=post_url,
    platform=platform,
    caption=normalize_caption(caption),
    author_handle=author_handle,
    places=places,
    hashtags=extract_hashtags(caption),
  )
