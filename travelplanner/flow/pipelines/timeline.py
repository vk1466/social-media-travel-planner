from travelplanner.steps.dedupe_resolve import DEDUPE_RESOLVE_STEP
from travelplanner.steps.locate_by_coordinates import LOCATE_BY_COORDINATES_STEP
from travelplanner.steps.locate_by_name import LOCATE_BY_NAME_STEP
from travelplanner.steps.nearby_pois import NEARBY_POIS_STEP
from travelplanner.steps.upsert_place import UPSERT_PLACE_STEP

TIMELINE_VISIT_STEPS = (
  LOCATE_BY_NAME_STEP,
  LOCATE_BY_COORDINATES_STEP,
  NEARBY_POIS_STEP,
  DEDUPE_RESOLVE_STEP,
  UPSERT_PLACE_STEP,
)

__all__ = ["TIMELINE_VISIT_STEPS"]
