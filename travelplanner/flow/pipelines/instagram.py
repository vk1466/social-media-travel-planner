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
from travelplanner.steps.process_mentions import PROCESS_MENTIONS_STEP
from travelplanner.steps.fetch_recipe_source import FETCH_RECIPE_SOURCE_STEP
from travelplanner.steps.extract_recipe_frames import EXTRACT_RECIPE_FRAMES_STEP
from travelplanner.steps.extract_recipe import EXTRACT_RECIPE_STEP
from travelplanner.steps.enrich_recipe import ENRICH_RECIPE_STEP
from travelplanner.steps.calculate_recipe_nutrition import CALCULATE_RECIPE_NUTRITION_STEP

INSTAGRAM_HEAD_STEPS = (
  SEED_INSTAGRAM_POST_STEP,
  FETCH_MEDIA_STEP,
  PERSIST_THUMBNAIL_STEP,
)

PLACE_CLOSE_STEPS = (
  EXTRACT_PLACES_STEP,
  PROCESS_MENTIONS_STEP,
)

MOVIE_CLOSE_STEPS = (
  EXTRACT_MOVIES_STEP,
  RESOLVE_MOVIES_STEP,
)

RECIPE_CLOSE_STEPS = (
  FETCH_RECIPE_SOURCE_STEP,
  EXTRACT_RECIPE_FRAMES_STEP,
  EXTRACT_RECIPE_STEP,
  ENRICH_RECIPE_STEP,
  CALCULATE_RECIPE_NUTRITION_STEP,
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
  "RECIPE_CLOSE_STEPS",
  "PLACE_CLOSE_STEPS",
]
