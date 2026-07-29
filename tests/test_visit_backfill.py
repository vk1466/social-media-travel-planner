from travelplanner.db.visits_repo import visit_from_dict, visit_to_dict
from travelplanner.models import Visit
from travelplanner.visits import parse_review_suggestion

from scripts.backfill_visit_status import migrate_visit


def test_visit_from_dict_migrates_timeline_review_source() -> None:
  visit = visit_from_dict(
    {
      "visit_id": "v1",
      "place_id": "p1",
      "place_name": "Odd Building",
      "source": "timeline_review",
      "notes": "Timeline review · suggest=unsure · when=local · maybe",
    }
  )
  assert visit.source == "timeline"
  assert visit.status == "needs_review"
  assert visit.review_suggestion == "unsure"
  assert visit.review_reason == "maybe"
  assert visit.travel_kind == "local"


def test_visit_from_dict_defaults_status_confirmed() -> None:
  visit = visit_from_dict(
    {
      "visit_id": "v1",
      "place_id": "p1",
      "place_name": "Falls",
      "source": "timeline",
    }
  )
  assert visit.status == "confirmed"


def test_parse_review_suggestion_legacy_notes() -> None:
  suggestion, reason, travel_kind = parse_review_suggestion(
    "Timeline review · suggest=discard · when=trip · noisy pin"
  )
  assert suggestion == "discard"
  assert reason == "noisy pin"
  assert travel_kind == "trip"


def test_backfill_migrate_visit_idempotent() -> None:
  raw = visit_to_dict(
    Visit(
      visit_id="v1",
      place_id="p1",
      place_name="Place",
      user_id="user-a",
      source="timeline",
      status="needs_review",
      review_suggestion="keep",
      review_reason="looks good",
      travel_kind="trip",
    )
  )
  assert migrate_visit(raw) is None

  legacy = {
    "visit_id": "v2",
    "place_id": "p2",
    "place_name": "Legacy",
    "user_id": "user-a",
    "source": "timeline_review",
    "notes": "Timeline review · suggest=unsure · when=local · maybe",
  }
  migrated = migrate_visit(legacy)
  assert migrated is not None
  assert migrated.source == "timeline"
  assert migrated.status == "needs_review"
  assert migrated.review_suggestion == "unsure"
