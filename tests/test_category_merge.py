"""Category merge helpers and upsert sticky/precedence rules."""

from __future__ import annotations

from travelplanner.categories import (
  filter_attributes,
  normalize_category,
  resolve_category,
)
from travelplanner.models import PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places.resolve import upsert_place
from travelplanner.places.store import load_place


def test_normalize_category_unknown_is_none() -> None:
  assert normalize_category("hike") == "hike"
  assert normalize_category("HIKE") == "hike"
  assert normalize_category("spaceship") is None
  assert normalize_category("") is None
  assert normalize_category(None) is None


def test_filter_attributes_clips_and_drops_self() -> None:
  assert filter_attributes("hike", ("viewpoint", "waterfall", "hike", "free")) == (
    "viewpoint",
    "waterfall",
  )
  assert filter_attributes(None, ("viewpoint",)) == ()
  assert filter_attributes("park", ("viewpoint", "hike")) == ()
  assert filter_attributes("landmark", ("hike", "viewpoint", "free")) == ("hike", "viewpoint")
  assert filter_attributes("waterfall", ("hike", "viewpoint")) == ("hike", "viewpoint")
  assert filter_attributes("viewpoint", ("hike",)) == ("hike",)


def test_resolve_category_sticky_and_precedence() -> None:
  assert resolve_category(None, "hike") == "hike"
  assert resolve_category("hike", None) == "hike"
  assert resolve_category("hike", "hike") == "hike"
  # Specific not overwritten by broader
  assert resolve_category("hike", "park") == "hike"
  # Broader upgraded by specific
  assert resolve_category("park", "hike") == "hike"
  # Same band keeps existing
  assert resolve_category("hike", "viewpoint") == "hike"
  assert resolve_category("viewpoint", "hike") == "viewpoint"


def test_upsert_folds_overwritten_category_into_attributes(dynamodb, monkeypatch) -> None:
  location = PlaceLocation(
    display_name="Misery Ridge",
    continent="North America",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Terrebonne",
    latitude=44.36,
    longitude=-121.14,
  )
  upsert_place(
    PlaceMention(place_name="Misery Ridge", category="viewpoint"),
    location,
    "instagram:a",
  )
  # Phase 1 same-band sticky would keep viewpoint; force an overwrite to assert
  # the fold wiring (losing category → attribute when allowlisted).
  monkeypatch.setattr(
    "travelplanner.places.resolve.resolve_category",
    lambda existing, incoming, votes=None: "hike",
  )
  place_id = upsert_place(
    PlaceMention(place_name="Misery Ridge", category="hike", attributes=("loop",)),
    location,
    "instagram:b",
  )
  place = load_place(place_id)
  assert place is not None
  assert place.category == "hike"
  assert place.attributes == ("loop", "viewpoint")


def test_upsert_drops_overwritten_category_not_in_allowlist(dynamodb) -> None:
  location = PlaceLocation(
    display_name="Smith Rock",
    continent="North America",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Terrebonne",
    latitude=44.37,
    longitude=-121.14,
  )
  upsert_place(
    PlaceMention(place_name="Smith Rock", category="park"),
    location,
    "instagram:a",
  )
  place_id = upsert_place(
    PlaceMention(place_name="Smith Rock", category="hike"),
    location,
    "instagram:b",
  )
  place = load_place(place_id)
  assert place is not None
  assert place.category == "hike"
  assert place.attributes == ()


def test_upsert_does_not_overwrite_specific_with_park(dynamodb) -> None:
  location = PlaceLocation(
    display_name="Tunnel Falls",
    continent="North America",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Cascade Locks",
    latitude=45.62,
    longitude=-121.97,
  )
  upsert_place(
    PlaceMention(place_name="Tunnel Falls", category="waterfall", attributes=("hike",)),
    location,
    "instagram:a",
  )
  place_id = upsert_place(
    PlaceMention(place_name="Tunnel Falls", category="park"),
    location,
    "instagram:b",
  )
  place = load_place(place_id)
  assert place is not None
  assert place.category == "waterfall"
  assert place.attributes == ("hike",)
