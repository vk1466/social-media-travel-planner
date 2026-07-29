from travelplanner.steps.extract_places import EXTRACT_PLACES_STEP
from travelplanner.steps.instagram.detect_resource_type import DETECT_RESOURCE_TYPE_STEP
from travelplanner.steps.instagram.extract_image_text import EXTRACT_IMAGE_TEXT_STEP
from travelplanner.steps.instagram.fetch_media import FETCH_MEDIA_STEP
from travelplanner.steps.instagram.fetch_transcript import FETCH_TRANSCRIPT_STEP
from travelplanner.steps.process_mentions import PROCESS_MENTIONS_STEP

INSTAGRAM_HEAD_STEPS = (
  DETECT_RESOURCE_TYPE_STEP,
  FETCH_MEDIA_STEP,
)

SHARED_CLOSE_STEPS = (
  EXTRACT_PLACES_STEP,
  PROCESS_MENTIONS_STEP,
)

INSTAGRAM_TAIL_BY_RESOURCE_TYPE: dict[str, tuple] = {
  "reel": (FETCH_TRANSCRIPT_STEP,),
  "video": (FETCH_TRANSCRIPT_STEP,),
  "image": (EXTRACT_IMAGE_TEXT_STEP,),
  "carousel": (EXTRACT_IMAGE_TEXT_STEP,),
}

__all__ = [
  "INSTAGRAM_HEAD_STEPS",
  "INSTAGRAM_TAIL_BY_RESOURCE_TYPE",
  "SHARED_CLOSE_STEPS",
]
