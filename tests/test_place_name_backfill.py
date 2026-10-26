from scripts.backfill_place_names import backfill_place_names
from travelplanner.db import places_repo
from travelplanner.models import Place, PlaceLocation


def test_backfill_place_names_dry_run_and_apply(dynamodb) -> None:
  # Insert test place with uncapitalized venue name
  place = Place(
    place_id="test_ichiran",
    display_name="ichiran ramen",
    location=PlaceLocation(
      display_name="ichiran ramen",
      city="Tokyo",
      country="Japan",
      latitude=35.66,
      longitude=139.70,
    ),
  )
  places_repo.save_place(place)

  # 1. Dry run should detect update needed but not mutate
  total, updated = backfill_place_names(dry_run=True)
  assert total >= 1
  assert updated >= 1
  loaded = places_repo.load_place("test_ichiran")
  assert loaded is not None
  assert loaded.display_name == "ichiran ramen"

  # 2. Apply should update DynamoDB
  total, updated = backfill_place_names(dry_run=False)
  assert total >= 1
  assert updated >= 1
  loaded_after = places_repo.load_place("test_ichiran")
  assert loaded_after is not None
  assert loaded_after.display_name == "Ichiran Ramen"
