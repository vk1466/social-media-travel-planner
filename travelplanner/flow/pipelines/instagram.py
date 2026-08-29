from travelplanner.steps.extract_movies import EXTRACT_MOVIES_STEP
from travelplanner.steps.extract_places import EXTRACT_PLACES_STEP
from travelplanner.steps.resolve_movies import RESOLVE_MOVIES_STEP
from travelplanner.steps.instagram.analyze_video import ANALYZE_VIDEO_STEP
from travelplanner.steps.instagram.extract_image_text import EXTRACT_IMAGE_TEXT_STEP
from travelplanner.steps.instagram.extract_reel_frame_text import (
  EXTRACT_REEL_FRAME_TEXT_STEP,
)
from travelplanner.steps.instagram.fetch_media import FETCH_MEDIA_STEP
from travelplanner.steps.instagram.fetch_transcript import FETCH_TRANSCRIPT_STEP
from travelplanner.steps.instagram.persist_thumbnail import PERSIST_THUMBNAIL_STEP
from travelplanner.steps.instagram.seed_instagram_post import SEED_INSTAGRAM_POST_STEP
from travelplanner.steps.enrich_place_facts import ENRICH_PLACE_FACTS_STEP
from travelplanner.steps.process_mentions import PROCESS_MENTIONS_STEP

INSTAGRAM_HEAD_STEPS = (
  SEED_INSTAGRAM_POST_STEP,
  FETCH_MEDIA_STEP,
  PERSIST_THUMBNAIL_STEP,
)

PLACE_CLOSE_STEPS = (
  EXTRACT_PLACES_STEP,
  PROCESS_MENTIONS_STEP,
  ENRICH_PLACE_FACTS_STEP,
)

MOVIE_CLOSE_STEPS = (
  EXTRACT_MOVIES_STEP,
  RESOLVE_MOVIES_STEP,
)

INSTAGRAM_TAIL_BY_RESOURCE_TYPE: dict[str, tuple] = {
  "reel": (
    FETCH_TRANSCRIPT_STEP,
    ANALYZE_VIDEO_STEP,
    EXTRACT_REEL_FRAME_TEXT_STEP,
  ),
  "video": (
    FETCH_TRANSCRIPT_STEP,
    ANALYZE_VIDEO_STEP,
    EXTRACT_REEL_FRAME_TEXT_STEP,
  ),
  "image": (EXTRACT_IMAGE_TEXT_STEP,),
  "carousel": (EXTRACT_IMAGE_TEXT_STEP,),
}

__all__ = [
  "INSTAGRAM_HEAD_STEPS",
  "INSTAGRAM_TAIL_BY_RESOURCE_TYPE",
  "MOVIE_CLOSE_STEPS",
  "PLACE_CLOSE_STEPS",
]
