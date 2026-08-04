from unittest.mock import patch

from travelplanner.flow.context import IngestContext
from travelplanner.models import PlaceLocation, Platform, SavedPost
from travelplanner.place_hints import ExtractedPlace
from travelplanner.places.locate import LocateDebugResult
from travelplanner.steps.process_mentions import process_mentions


def _post_with_place(name: str, category: str = "cafe") -> SavedPost:
  return SavedPost(
    post_id="instagram:testshop",
    post_url="https://www.instagram.com/p/test/",
    platform=Platform.INSTAGRAM,
    media_kind="carousel",
    caption="coffee shops",
    extracted_places=(
      ExtractedPlace(
        place_name=name,
        city="Mexico City",
        country="Mexico",
        category=category,
      ),
    ),
  )


def test_process_mentions_keeps_bakery_shop(monkeypatch, dynamodb) -> None:
  post = _post_with_place("Panadería Rosetta")
  location = PlaceLocation(
    display_name="Panadería Rosetta",
    continent="North America",
    country="Mexico",
    country_code="MX",
    city="Mexico City",
    latitude=19.425,
    longitude=-99.16,
    osm_class="shop",
    osm_type="bakery",
  )

  monkeypatch.setattr(
    "travelplanner.steps.process_mentions.locate_mention_debug",
    lambda mention, **_: LocateDebugResult(
      status="resolved",
      location=location,
      match_confidence=0.9,
      notes=("ok",),
    ),
  )

  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post, place_library=[])
  result = process_mentions(ctx)
  assert len(result.place_ids) == 1
  assert result.place_outcomes[0].status == "resolved"


def test_process_mentions_llm_gates_ambiguous_shop(monkeypatch, dynamodb) -> None:
  post = _post_with_place("Cool Boutique", category="landmark")
  location = PlaceLocation(
    display_name="Cool Boutique",
    country="Mexico",
    country_code="MX",
    city="Mexico City",
    latitude=19.4,
    longitude=-99.1,
    osm_class="shop",
    osm_type="clothes",
  )

  monkeypatch.setattr(
    "travelplanner.steps.process_mentions.locate_mention_debug",
    lambda mention, **_: LocateDebugResult(
      status="resolved",
      location=location,
      match_confidence=0.8,
      notes=("ok",),
    ),
  )

  ctx = IngestContext(post_url=post.post_url, user_id="u1", post=post, place_library=[])
  with patch(
    "travelplanner.steps.process_mentions.llm_ambiguous_shop_is_travel",
    return_value=(False, "everyday clothing store"),
  ) as mock_gate:
    result = process_mentions(ctx)
  mock_gate.assert_called_once()
  assert result.place_ids == []
  assert result.place_outcomes[0].status == "rejected"
  assert "ambiguous shop rejected" in (result.place_outcomes[0].reason or "")

  with patch(
    "travelplanner.steps.process_mentions.llm_ambiguous_shop_is_travel",
    return_value=(True, "destination boutique mentioned in travel reel"),
  ):
    kept = process_mentions(
      IngestContext(post_url=post.post_url, user_id="u1", post=post, place_library=[])
    )
  assert len(kept.place_ids) == 1
  assert kept.place_outcomes[0].status == "resolved"
