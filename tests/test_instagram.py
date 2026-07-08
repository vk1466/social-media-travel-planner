import json
from pathlib import Path

from travelplanner.sources.instagram import _trim_post_info

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "instagram_post_raw.json"


def test_trim_post_info_from_fixture() -> None:
  raw = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
  trimmed = _trim_post_info(raw)

  assert trimmed["caption"] == "3 days in Lisbon you can't miss #lisbon #portugal"
  assert trimmed["author_handle"] == "wanderlust_ana"
  assert trimmed["media_kind"] == "reel"
  assert trimmed["posted_at"] == "2023-02-10T16:46:10Z"
  assert trimmed["like_count"] == 48210
  assert trimmed["comment_count"] == 13
  assert "The pastel de nata spot is Manteigaria!" in trimmed["top_comments"]
  assert trimmed["hashtags"] == ("lisbon", "portugal")
  assert len(trimmed["places"]) == 1
  assert trimmed["places"][0].place_name == "Alfama"
  assert trimmed["places"][0].city == "Lisbon"
  assert trimmed["places"][0].country == "Portugal"
  assert trimmed["places"][0].latitude == 38.7131
  assert trimmed["places"][0].longitude == -9.1279
