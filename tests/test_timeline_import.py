"""Tests for Google Maps Timeline parse + filtered import."""

from __future__ import annotations

import io
import json
import zipfile

from travelplanner.clients.geocoder import GeocodeResult
from travelplanner.models import PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places import upsert_place
from travelplanner.places.store import is_visitable_place
from travelplanner.timeline.import_visits import (
  VisitCluster,
  cluster_timeline_visits,
  import_timeline_visits,
)
from travelplanner.timeline.parse import (
  TimelineVisit,
  detect_format,
  parse_timeline_bytes,
  parse_timeline_payload,
)
from travelplanner.timeline.semantic_types import (
  category_from_semantic_type,
  classify_semantic,
)
from travelplanner.visits import delete_visits_by_source, list_visits, visited_place_ids

USER = "user-a"


def _patch_timeline_locate(monkeypatch, fake_locate) -> None:
  from travelplanner.places.locate import LocateDebugResult
  from travelplanner.steps import locate_by_name

  def fake_debug(mention, anchor_cache=None):
    location = fake_locate(mention)
    if location is None:
      return LocateDebugResult(status="unresolved")
    return LocateDebugResult(status="resolved", location=location)

  monkeypatch.setattr(locate_by_name, "locate_mention_debug", fake_debug)


def _patch_timeline_reverse(monkeypatch, fake_reverse) -> None:
  from travelplanner.steps import locate_by_coordinates

  monkeypatch.setattr(
    locate_by_coordinates.geocoder,
    "reverse_geocode_normalized",
    fake_reverse,
  )


def _patch_nearby_pois(monkeypatch, fake_search) -> None:
  from travelplanner.steps import nearby_pois

  monkeypatch.setattr(nearby_pois, "search_nearby_travel_pois", fake_search)


def _patch_osm_travel_gate(monkeypatch, passes: bool) -> None:
  from travelplanner.steps import locate_by_coordinates, locate_by_name, nearby_pois

  gate = lambda location: passes
  monkeypatch.setattr(locate_by_name, "_passes_osm_travel_gate", gate)
  monkeypatch.setattr(locate_by_coordinates, "_passes_osm_travel_gate", gate)
  monkeypatch.setattr(nearby_pois, "_passes_osm_travel_gate", gate)


def _patch_is_visitable(monkeypatch, visitable: bool) -> None:
  from travelplanner.steps import locate_by_coordinates, nearby_pois

  check = lambda location: visitable
  monkeypatch.setattr(locate_by_coordinates, "is_visitable_place", check)
  monkeypatch.setattr(nearby_pois, "is_visitable_place", check)


def _timeline_import_mod():
  from travelplanner.personas import timeline_import as import_mod

  return import_mod


PHONE_SAMPLE = {
  "semanticSegments": [
    {
      "startTime": "2024-04-03T08:13:57.000+02:00",
      "endTime": "2024-04-03T20:10:18.000+02:00",
      "visit": {
        "probability": 0.85,
        "topCandidate": {
          "placeId": "ChIJ_smith_rock",
          "semanticType": "TYPE_TOURIST_ATTRACTION",
          "placeLocation": {"latLng": "44.3656°, -121.1400°"},
        },
      },
    },
    {
      "startTime": "2024-04-04T09:00:00.000+02:00",
      "endTime": "2024-04-04T10:00:00.000+02:00",
      "visit": {
        "topCandidate": {
          "placeId": "ChIJ_home",
          "semanticType": "HOME",
          "placeLocation": {"latLng": "45.5000°, -122.6000°"},
        },
      },
    },
    {
      "startTime": "2024-04-05T09:00:00.000+02:00",
      "endTime": "2024-04-05T09:30:00.000+02:00",
      "visit": {
        "topCandidate": {
          "placeId": "ChIJ_gas",
          "semanticType": "TYPE_GAS_STATION",
          "placeLocation": {"latLng": "44.4000°, -121.1500°"},
        },
      },
    },
  ],
  "userLocationProfile": {
    "frequentPlaces": [
      {
        "placeId": "ChIJ_home",
        "placeLocation": "45.5000°, -122.6000°",
        "label": "HOME",
      }
    ]
  },
}

TAKEOUT_SAMPLE = {
  "timelineObjects": [
    {
      "placeVisit": {
        "location": {
          "latitudeE7": 455762000,
          "longitudeE7": -1221158000,
          "placeId": "ChIJ_falls",
          "name": "Multnomah Falls",
          "address": "Oregon",
          "semanticType": "TYPE_TOURIST_ATTRACTION",
        },
        "duration": {
          "startTimestamp": "2024-06-12T15:00:00.000Z",
          "endTimestamp": "2024-06-12T18:00:00.000Z",
        },
      }
    },
    {
      "placeVisit": {
        "location": {
          "latitudeE7": 455762000,
          "longitudeE7": -1221158000,
          "placeId": "ChIJ_falls",
          "name": "Multnomah Falls",
          "semanticType": "TYPE_TOURIST_ATTRACTION",
        },
        "duration": {
          "startTimestamp": "2024-06-13T10:00:00.000Z",
          "endTimestamp": "2024-06-13T11:00:00.000Z",
        },
      }
    },
  ]
}


def test_semantic_classify_and_category() -> None:
  assert classify_semantic("TYPE_GAS_STATION") == "block"
  assert classify_semantic("TYPE_MUSEUM") == "allow"
  assert classify_semantic("TYPE_UNKNOWN") == "unknown"
  assert classify_semantic(None) == "unknown"
  assert category_from_semantic_type("TYPE_CAFE") == "cafe"
  assert category_from_semantic_type("TYPE_TOURIST_ATTRACTION") == "landmark"
  assert category_from_semantic_type("TYPE_SPA") == "hotel"
  assert category_from_semantic_type("TYPE_POINT_OF_INTEREST") is None
  assert category_from_semantic_type("TYPE_BEACH") == "beach"


def test_is_visitable_rejects_fuel_and_supermarket() -> None:
  assert not is_visitable_place(
    PlaceLocation(display_name="Shell", osm_class="amenity", osm_type="fuel")
  )
  assert not is_visitable_place(
    PlaceLocation(display_name="Safeway", osm_class="shop", osm_type="supermarket")
  )
  assert is_visitable_place(
    PlaceLocation(display_name="Smith Rock", osm_class="tourism", osm_type="attraction")
  )


def test_is_visitable_rejects_house_numbers_and_homes() -> None:
  assert not is_visitable_place(
    PlaceLocation(
      display_name="5170",
      city="Mukilteo",
      state_province="Washington",
      country="United States",
      osm_class="place",
      osm_type="house",
    )
  )
  assert not is_visitable_place(
    PlaceLocation(
      display_name="5170 Mukilteo",
      city="Mukilteo",
      state_province="Washington",
      country="United States",
    )
  )
  assert not is_visitable_place(
    PlaceLocation(display_name="933 Main St", city="Centralia", osm_type="house")
  )
  # Named attractions that happen to start with digits should still pass.
  assert is_visitable_place(
    PlaceLocation(display_name="360 Chicago", city="Chicago", osm_class="tourism", osm_type="attraction")
  )


def test_point_of_interest_is_unknown_semantic() -> None:
  assert classify_semantic("TYPE_POINT_OF_INTEREST") == "unknown"
  assert classify_semantic("TYPE_STREET_ADDRESS") == "unknown"
  assert classify_semantic("TYPE_MUSEUM") == "allow"


def test_is_visitable_rejects_errand_shops_and_street_furniture() -> None:
  assert not is_visitable_place(
    PlaceLocation(display_name="Costco", osm_class="shop", osm_type="wholesale")
  )
  assert not is_visitable_place(
    PlaceLocation(display_name="HairMasters", osm_class="shop", osm_type="hairdresser")
  )
  assert not is_visitable_place(
    PlaceLocation(display_name="Redbox", osm_class="amenity", osm_type="vending_machine")
  )
  assert not is_visitable_place(
    PlaceLocation(display_name="Marine Park Playground", osm_class="leisure", osm_type="playground")
  )


def test_llm_gate_needed_for_ambiguous_not_trusted_restaurant() -> None:
  from travelplanner.models import Place
  from travelplanner.timeline.llm_gate import needs_user_review

  restaurant = Place(
    place_id="p1",
    display_name="Spork",
    location=PlaceLocation(
      display_name="Spork",
      city="Bend",
      osm_class="amenity",
      osm_type="restaurant",
    ),
    category="restaurant",
  )
  # A restaurant is only auto-saved when the visit happened on a trip.
  assert needs_user_review(restaurant, travel_kind="trip") is False
  assert needs_user_review(restaurant, travel_kind="local") is True
  assert needs_user_review(restaurant) is True

  building = Place(
    place_id="p2",
    display_name="Kunthara Auto License",
    location=PlaceLocation(
      display_name="Kunthara Auto License",
      city="Lynnwood",
      osm_class="building",
      osm_type="yes",
    ),
    category=None,
  )
  assert needs_user_review(building) is True


def test_import_queues_ambiguous_for_review(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()
  from travelplanner.visits import list_timeline_reviews, list_visits

  _patch_timeline_locate(monkeypatch, lambda mention: PlaceLocation(
      display_name="Telus Garden",
      country="Canada",
      country_code="CA",
      city="Vancouver",
      state_province="British Columbia",
      latitude=mention.latitude or 49.28,
      longitude=mention.longitude or -123.12,
      osm_class="building",
      osm_type="commercial",
    ))
  monkeypatch.setattr(import_mod, "needs_user_review", lambda place, **kwargs: True)
  monkeypatch.setattr(
    import_mod,
    "suggest_travel_place",
    lambda place, **kwargs: ("discard", "office building"),
  )

  clusters = [
    VisitCluster(
      latitude=49.28,
      longitude=-123.12,
      visited_from="2024-04-01",
      visited_to="2024-04-01",
      place_name="Telus Garden",
      google_place_id="ChIJ_telus",
      address=None,
      visit_count=1,
      semantic_type="TYPE_TOURIST_ATTRACTION",
    )
  ]
  result = import_timeline_visits(
    clusters=clusters,
    user_id=USER,
    source_format="phone",
  )
  assert result.imported == 0
  assert result.queued_for_review == 1
  assert list_visits(USER) == []
  reviews = list_timeline_reviews(USER)
  assert len(reviews) == 1
  assert reviews[0].source == "timeline"
  assert reviews[0].status == "needs_review"
  assert reviews[0].review_suggestion == "discard"


def test_nearby_fallback_when_reverse_is_house(monkeypatch, dynamodb) -> None:
  from travelplanner.clients.geocoder import GeocodeResult
  import_mod = _timeline_import_mod()
  from travelplanner.visits import list_visits

  _patch_timeline_reverse(monkeypatch, lambda lat, lon, *, fallback_name="": GeocodeResult(
      display_name="5170",
      latitude=lat,
      longitude=lon,
      city="Mukilteo",
      state_province="Washington",
      country="United States",
      country_code="US",
      osm_class="place",
      osm_type="house",
    ))
  _patch_nearby_pois(
    monkeypatch,
    lambda lat, lon, *, radius_m=150, limit=8: [
      GeocodeResult(
        display_name="Mukilteo Lighthouse",
        latitude=lat,
        longitude=lon,
        city="Mukilteo",
        state_province="Washington",
        country="United States",
        country_code="US",
        osm_class="tourism",
        osm_type="attraction",
        provider="overpass",
      )
    ],
  )
  monkeypatch.setattr(import_mod, "needs_user_review", lambda place, **kwargs: False)

  clusters = [
    VisitCluster(
      latitude=47.94,
      longitude=-122.3,
      visited_from="2024-05-01",
      visited_to="2024-05-01",
      place_name=None,
      google_place_id=None,
      address=None,
      visit_count=1,
      semantic_type="TYPE_UNKNOWN",
    )
  ]
  result = import_timeline_visits(
    clusters=clusters,
    user_id=USER,
    source_format="phone",
  )
  assert result.imported == 1
  assert list_visits(USER)[0].place_name == "Mukilteo Lighthouse"


def test_accept_and_discard_timeline_review(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()
  from travelplanner.visits import (
    accept_timeline_review,
    discard_timeline_review,
    list_timeline_reviews,
    list_visits,
  )

  _patch_timeline_locate(monkeypatch, lambda mention: PlaceLocation(
      display_name=mention.place_name,
      country="United States",
      country_code="US",
      city="Seattle",
      latitude=47.6,
      longitude=-122.3,
      osm_class="building",
      osm_type="yes",
    ))
  monkeypatch.setattr(import_mod, "needs_user_review", lambda place, **kwargs: True)
  monkeypatch.setattr(
    import_mod, "suggest_travel_place", lambda place, **kwargs: ("unsure", "maybe")
  )

  import_timeline_visits(
    clusters=[
      VisitCluster(
        latitude=47.6,
        longitude=-122.3,
        visited_from="2024-01-01",
        visited_to="2024-01-01",
        place_name="Odd Building",
        google_place_id="ChIJ_odd",
        address=None,
        visit_count=1,
        semantic_type="TYPE_TOURIST_ATTRACTION",
      )
    ],
    user_id=USER,
    source_format="phone",
  )
  review = list_timeline_reviews(USER)[0]
  accepted = accept_timeline_review(user_id=USER, visit_id=review.visit_id)
  assert accepted.source == "timeline"
  assert accepted.status == "confirmed"
  assert list_visits(USER)[0].visit_id == review.visit_id
  assert list_timeline_reviews(USER) == []

  import_timeline_visits(
    clusters=[
      VisitCluster(
        latitude=47.61,
        longitude=-122.31,
        visited_from="2024-02-01",
        visited_to="2024-02-01",
        place_name="Another Odd",
        google_place_id="ChIJ_odd2",
        address=None,
        visit_count=1,
        semantic_type="TYPE_TOURIST_ATTRACTION",
      )
    ],
    user_id=USER,
    source_format="phone",
  )
  pending = list_timeline_reviews(USER)[0]
  assert discard_timeline_review(user_id=USER, visit_id=pending.visit_id) is True
  assert list_timeline_reviews(USER) == []


def test_detect_phone_and_takeout_formats() -> None:
  assert detect_format(PHONE_SAMPLE) == "phone"
  assert detect_format(TAKEOUT_SAMPLE) == "takeout_semantic"
  assert detect_format({"locations": []}) == "records"


def test_parse_phone_skips_home_in_parser() -> None:
  fmt, visits = parse_timeline_payload(PHONE_SAMPLE)
  assert fmt == "phone"
  # Parser still skips HOME/WORK; gas remains for import-stage semantic filter.
  types = {v.semantic_type for v in visits}
  assert "HOME" not in types and "TYPE_HOME" not in types
  assert "TYPE_GAS_STATION" in types
  assert "TYPE_TOURIST_ATTRACTION" in types


def test_parse_takeout_semantic_with_names() -> None:
  fmt, visits = parse_timeline_payload(TAKEOUT_SAMPLE)
  assert fmt == "takeout_semantic"
  assert len(visits) == 2
  assert visits[0].place_name == "Multnomah Falls"
  assert visits[0].visited_from == "2024-06-12"


def test_parse_zip_takeout(dynamodb) -> None:
  del dynamodb
  buf = io.BytesIO()
  with zipfile.ZipFile(buf, "w") as archive:
    archive.writestr(
      "Takeout/Location History/Semantic Location History/2024/2024_JUNE.json",
      json.dumps(TAKEOUT_SAMPLE),
    )
  fmt, visits = parse_timeline_bytes(buf.getvalue(), filename="takeout.zip")
  assert fmt == "takeout_semantic"
  assert len(visits) == 2


def test_cluster_merges_same_place_id() -> None:
  visits = [
    TimelineVisit(
      latitude=45.5762,
      longitude=-122.1158,
      visited_from="2024-06-12",
      visited_to="2024-06-12",
      place_name="Multnomah Falls",
      google_place_id="ChIJ_falls",
      semantic_type="TYPE_TOURIST_ATTRACTION",
      source_format="takeout_semantic",
    ),
    TimelineVisit(
      latitude=45.5763,
      longitude=-122.1159,
      visited_from="2024-06-13",
      visited_to="2024-06-13",
      place_name="Multnomah Falls",
      google_place_id="ChIJ_falls",
      semantic_type="TYPE_TOURIST_ATTRACTION",
      source_format="takeout_semantic",
    ),
  ]
  clusters = cluster_timeline_visits(visits)
  assert len(clusters) == 1
  assert clusters[0].visited_from == "2024-06-12"
  assert clusters[0].visited_to == "2024-06-13"
  assert clusters[0].visit_count == 2


def test_import_skips_semantic_blocklist(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  _patch_timeline_locate(monkeypatch, lambda mention: PlaceLocation(
      display_name=mention.place_name or "Place",
      country="United States",
      country_code="US",
      latitude=mention.latitude or 44.4,
      longitude=mention.longitude or -121.15,
      osm_class="tourism",
      osm_type="attraction",
    ))

  clusters = [
    VisitCluster(
      latitude=44.4,
      longitude=-121.15,
      visited_from="2024-04-05",
      visited_to="2024-04-05",
      place_name="Gas",
      google_place_id="ChIJ_gas",
      address=None,
      visit_count=1,
      semantic_type="TYPE_GAS_STATION",
    )
  ]
  result = import_timeline_visits(
    clusters=clusters,
    user_id=USER,
    source_format="phone",
  )
  assert result.imported == 0
  assert result.skipped_semantic == 1


def test_import_skips_home_region(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  _patch_timeline_locate(monkeypatch, lambda mention: PlaceLocation(
      display_name="Near home cafe",
      country="United States",
      country_code="US",
      latitude=45.51,
      longitude=-122.61,
      osm_class="amenity",
      osm_type="cafe",
    ))

  clusters = [
    VisitCluster(
      latitude=45.51,
      longitude=-122.61,
      visited_from="2024-04-01",
      visited_to="2024-04-01",
      place_name="Near home cafe",
      google_place_id="ChIJ_cafe",
      address=None,
      visit_count=1,
      semantic_type="TYPE_CAFE",
    )
  ]
  result = import_timeline_visits(
    clusters=clusters,
    user_id=USER,
    source_format="phone",
    home_latitude=45.5,
    home_longitude=-122.6,
    home_exclude_km=30,
  )
  assert result.imported == 0
  assert result.skipped_home == 1


def test_import_unknown_requires_osm_travel_gate(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  def fake_reverse(lat, lon, *, fallback_name=""):
    return GeocodeResult(
      display_name="Corner market",
      latitude=lat,
      longitude=lon,
      country="United States",
      country_code="US",
      category="commercial",
      osm_class="shop",
      osm_type="convenience",
    )

  _patch_timeline_reverse(monkeypatch, fake_reverse)
  _patch_nearby_pois(monkeypatch, lambda *args, **kwargs: [])

  clusters = [
    VisitCluster(
      latitude=44.36,
      longitude=-121.14,
      visited_from="2024-05-01",
      visited_to="2024-05-01",
      place_name=None,
      google_place_id="ChIJ_unknown",
      address=None,
      visit_count=1,
      semantic_type="TYPE_UNKNOWN",
    )
  ]
  result = import_timeline_visits(clusters=clusters, user_id=USER, source_format="phone")
  assert result.imported == 0
  assert result.skipped_errand == 1
  assert result.skipped_unresolved == 0


def test_classify_skip_reason_from_osm_and_name() -> None:
  from travelplanner.timeline.skip_reason import classify_skip_reason

  assert (
    classify_skip_reason(
      location=PlaceLocation(
        display_name="Shell",
        osm_class="amenity",
        osm_type="fuel",
      )
    )
    == "errand"
  )
  assert (
    classify_skip_reason(
      location=PlaceLocation(
        display_name="I 5",
        osm_class="highway",
        osm_type="motorway",
      )
    )
    == "highway"
  )
  assert (
    classify_skip_reason(
      location=PlaceLocation(
        display_name="12 Main Street",
        osm_class="place",
        osm_type="house",
      )
    )
    == "address"
  )
  assert (
    classify_skip_reason(
      location=PlaceLocation(
        display_name="Lot A",
        osm_class="amenity",
        osm_type="parking",
      )
    )
    == "parking"
  )
  assert classify_skip_reason(place_name="Arco Bend") == "errand"
  assert classify_skip_reason(place_name="US Customs Bus Lane") == "highway"
  assert (
    classify_skip_reason(
      location=PlaceLocation(
        display_name="Todd Lake Trailhead",
        osm_class="tourism",
        osm_type="attraction",
      )
    )
    == "unresolved"
  )


def test_import_classifies_gas_highway_and_true_unresolved(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  def fake_reverse(lat, lon, *, fallback_name=""):
    if abs(lat - 44.1) < 0.01:
      return GeocodeResult(
        display_name="Shell",
        latitude=lat,
        longitude=lon,
        country="United States",
        country_code="US",
        osm_class="amenity",
        osm_type="fuel",
      )
    if abs(lat - 44.2) < 0.01:
      return GeocodeResult(
        display_name="I 5",
        latitude=lat,
        longitude=lon,
        country="United States",
        country_code="US",
        osm_class="highway",
        osm_type="motorway",
      )
    return GeocodeResult(
      display_name="Todd Lake Trailhead",
      latitude=lat,
      longitude=lon,
      country="United States",
      country_code="US",
      osm_class="tourism",
      osm_type="attraction",
    )

  _patch_timeline_reverse(monkeypatch, fake_reverse)
  _patch_nearby_pois(monkeypatch, lambda *args, **kwargs: [])
  # Force OSM travel gate fail for the trailhead so it stays unresolved (not imported).
  _patch_osm_travel_gate(monkeypatch, False)
  _patch_is_visitable(monkeypatch, True)
  monkeypatch.setattr(
    import_mod,
    "suggest_unresolved_cluster",
    lambda **kwargs: ("discard", "test discard"),
  )

  clusters = [
    VisitCluster(
      latitude=44.1,
      longitude=-121.1,
      visited_from="2024-06-01",
      visited_to="2024-06-01",
      place_name=None,
      google_place_id="g1",
      address=None,
      visit_count=1,
      semantic_type="TYPE_UNKNOWN",
    ),
    VisitCluster(
      latitude=44.2,
      longitude=-121.2,
      visited_from="2024-06-01",
      visited_to="2024-06-01",
      place_name=None,
      google_place_id="g2",
      address=None,
      visit_count=1,
      semantic_type="TYPE_UNKNOWN",
    ),
    VisitCluster(
      latitude=44.3,
      longitude=-121.3,
      visited_from="2024-06-01",
      visited_to="2024-06-01",
      place_name="Todd Lake Trailhead",
      google_place_id="g3",
      address=None,
      visit_count=1,
      semantic_type="TYPE_UNKNOWN",
    ),
  ]
  result = import_timeline_visits(
    clusters=clusters,
    user_id=USER,
    source_format="phone",
    home_latitude=45.5,
    home_longitude=-122.6,
  )
  assert result.skipped_errand == 1
  assert result.skipped_highway == 1
  assert result.skipped_llm == 1
  assert result.skipped_unresolved == 0
  assert result.imported == 0


def test_unresolved_llm_keep_imports(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()
  from travelplanner.visits import list_visits

  _patch_timeline_reverse(monkeypatch, lambda lat, lon, *, fallback_name="": GeocodeResult(
      display_name="Todd Lake Trailhead",
      latitude=lat,
      longitude=lon,
      country="United States",
      country_code="US",
      state_province="Oregon",
      osm_class="tourism",
      osm_type="attraction",
    ))
  _patch_nearby_pois(monkeypatch, lambda *args, **kwargs: [])
  _patch_osm_travel_gate(monkeypatch, False)
  _patch_is_visitable(monkeypatch, True)
  monkeypatch.setattr(
    import_mod,
    "suggest_unresolved_cluster",
    lambda **kwargs: ("keep", "named trailhead on a trip"),
  )

  clusters = [
    VisitCluster(
      latitude=44.03,
      longitude=-121.68,
      visited_from="2024-05-30",
      visited_to="2024-05-30",
      place_name="Todd Lake Trailhead",
      google_place_id="g_todd",
      address=None,
      visit_count=1,
      semantic_type="TYPE_UNKNOWN",
    )
  ]
  result = import_timeline_visits(
    clusters=clusters,
    user_id=USER,
    source_format="phone",
    home_latitude=45.5,
    home_longitude=-122.6,
  )
  assert result.imported == 1
  assert result.skipped_llm == 0
  assert result.skipped_unresolved == 0
  visits = list_visits(USER)
  assert len(visits) == 1
  assert visits[0].source == "timeline"
  assert "LLM keep" in (visits[0].notes or "")


def test_unresolved_llm_unsure_queues_review(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()
  from travelplanner.visits import list_timeline_reviews

  _patch_timeline_reverse(monkeypatch, lambda lat, lon, *, fallback_name="": GeocodeResult(
      display_name="The COVE",
      latitude=lat,
      longitude=lon,
      country="United States",
      country_code="US",
      osm_class="building",
      osm_type="yes",
    ))
  _patch_nearby_pois(monkeypatch, lambda *args, **kwargs: [])
  _patch_is_visitable(monkeypatch, False)
  monkeypatch.setattr(
    import_mod,
    "suggest_unresolved_cluster",
    lambda **kwargs: ("unsure", "could be a lodge amenity"),
  )

  # classify_skip_reason for building=yes may be unresolved (not errand)
  clusters = [
    VisitCluster(
      latitude=43.88,
      longitude=-121.44,
      visited_from="2024-05-31",
      visited_to="2024-05-31",
      place_name="The COVE",
      google_place_id="g_cove",
      address=None,
      visit_count=1,
      semantic_type="TYPE_UNKNOWN",
    )
  ]
  result = import_timeline_visits(
    clusters=clusters,
    user_id=USER,
    source_format="phone",
    home_latitude=45.5,
    home_longitude=-122.6,
  )
  assert result.queued_for_review == 1
  assert result.imported == 0
  reviews = list_timeline_reviews(USER)
  assert len(reviews) == 1
  assert reviews[0].review_suggestion == "unsure"


def test_errand_skip_does_not_call_unresolved_llm(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  called = {"llm": 0}

  _patch_timeline_reverse(monkeypatch, lambda lat, lon, *, fallback_name="": GeocodeResult(
      display_name="Shell",
      latitude=lat,
      longitude=lon,
      country="United States",
      country_code="US",
      osm_class="amenity",
      osm_type="fuel",
    ))
  _patch_nearby_pois(monkeypatch, lambda *args, **kwargs: [])

  def boom(**kwargs):
    called["llm"] += 1
    raise AssertionError("LLM should not run for errand skips")

  monkeypatch.setattr(import_mod, "suggest_unresolved_cluster", boom)

  clusters = [
    VisitCluster(
      latitude=44.1,
      longitude=-121.1,
      visited_from="2024-06-01",
      visited_to="2024-06-01",
      place_name=None,
      google_place_id="g_gas",
      address=None,
      visit_count=1,
      semantic_type="TYPE_UNKNOWN",
    )
  ]
  result = import_timeline_visits(
    clusters=clusters,
    user_id=USER,
    source_format="phone",
    home_latitude=45.5,
    home_longitude=-122.6,
  )
  assert result.skipped_errand == 1
  assert called["llm"] == 0


def test_import_timeline_creates_visits(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  def fake_locate(mention: PlaceMention) -> PlaceLocation:
    return PlaceLocation(
      display_name=mention.place_name,
      continent="North America",
      country="United States",
      country_code="US",
      state_province="Oregon",
      city="Portland",
      latitude=mention.latitude or 45.5762,
      longitude=mention.longitude or -122.1158,
      provider_place_id="osm-1",
      osm_class="tourism",
      osm_type="attraction",
    )

  _patch_timeline_locate(monkeypatch, fake_locate)

  fmt, visits = parse_timeline_payload(TAKEOUT_SAMPLE)
  result = import_timeline_visits(visits, user_id=USER, source_format=fmt, max_places=10)

  assert result.imported == 1
  assert result.unique_places == 1
  assert visited_place_ids(USER)
  trip = list_visits(USER)[0]
  assert trip.place_name == "Multnomah Falls"
  assert trip.source == "timeline"
  # Cluster spanned 12→13 June; Visit stores the most recent day only.
  assert trip.visited_from == "2024-06-13"
  assert trip.visited_to == "2024-06-13"


def test_delete_visits_by_source(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  def fake_locate(mention: PlaceMention) -> PlaceLocation:
    return PlaceLocation(
      display_name=mention.place_name,
      continent="North America",
      country="United States",
      country_code="US",
      state_province="Oregon",
      city="Portland",
      latitude=45.5762,
      longitude=-122.1158,
      provider_place_id="osm-1",
      osm_class="tourism",
      osm_type="attraction",
    )

  _patch_timeline_locate(monkeypatch, fake_locate)
  fmt, visits = parse_timeline_payload(TAKEOUT_SAMPLE)
  import_timeline_visits(visits, user_id=USER, source_format=fmt)
  assert len(list_visits(USER)) == 1
  deleted = delete_visits_by_source(user_id=USER, source="timeline")
  assert deleted == 1
  assert list_visits(USER) == []


def _cluster(
  latitude: float,
  longitude: float,
  *,
  day: str,
  end_day: str | None = None,
  name: str | None = None,
  semantic_type: str = "TYPE_RESTAURANT",
  visit_count: int = 1,
) -> VisitCluster:
  return VisitCluster(
    latitude=latitude,
    longitude=longitude,
    visited_from=day,
    visited_to=end_day or day,
    place_name=name,
    google_place_id=f"g:{name or day}:{latitude}",
    address=None,
    visit_count=visit_count,
    semantic_type=semantic_type,
  )


def test_chain_brand_matches_franchises_not_lookalikes() -> None:
  from travelplanner.timeline.chains import chain_brand, is_chain_place

  assert chain_brand("McDonald's") == "mcdonalds"
  assert chain_brand("Starbucks Reserve Roastery") == "starbucks"
  assert chain_brand("Dunkin' Donuts") == "dunkin donuts"
  assert chain_brand("In-N-Out Burger #42") == "in n out burger"
  assert is_chain_place("Taco Bell Cantina")
  # Independents that merely contain a brand word are not chains.
  assert chain_brand("Sunset Cafe by the Subway Bridge") is None
  assert chain_brand("Multnomah Falls") is None
  assert chain_brand(None) is None


def test_trip_segmentation_separates_trips_from_errands() -> None:
  from travelplanner.timeline.trips import build_travel_context, classify_travel_context

  home = (45.5, -122.6)
  near_home = _cluster(45.51, -122.61, day="2024-03-04", name="Corner cafe")
  # Two consecutive days ~350 km away.
  trip_day_one = _cluster(48.6, -121.0, day="2024-06-01", name="Diablo Lake")
  trip_day_two = _cluster(48.7, -121.1, day="2024-06-02", name="Trip dinner")
  # One ordinary day 60 km out — not far enough and not part of a trip.
  errand = _cluster(45.9, -122.9, day="2024-04-10", name="Outlet mall")

  context = build_travel_context(
    [near_home, trip_day_one, trip_day_two, errand],
    home_latitude=home[0],
    home_longitude=home[1],
    home_radius_km=30,
  )
  assert len(context.trips) == 1
  assert context.trips[0].start_date == "2024-06-01"
  assert context.trips[0].end_date == "2024-06-02"

  assert classify_travel_context(near_home, context) == "home"
  assert classify_travel_context(trip_day_one, context) == "trip"
  assert classify_travel_context(trip_day_two, context) == "trip"
  assert classify_travel_context(errand, context) == "local"


def test_long_day_trip_counts_without_overnight() -> None:
  from travelplanner.timeline.trips import build_travel_context, classify_travel_context

  far = _cluster(48.6, -121.0, day="2024-06-01", name="Diablo Lake")
  context = build_travel_context(
    [far], home_latitude=45.5, home_longitude=-122.6, home_radius_km=30
  )
  assert classify_travel_context(far, context) == "trip"


def test_travel_context_without_home_is_unknown() -> None:
  from travelplanner.timeline.trips import build_travel_context, classify_travel_context

  cluster = _cluster(48.6, -121.0, day="2024-06-01", name="Somewhere")
  context = build_travel_context([cluster])
  assert context.has_home is False
  assert classify_travel_context(cluster, context) == "unknown"


def test_infer_home_needs_a_dominant_cell() -> None:
  from travelplanner.timeline.trips import infer_home_location

  # A single trip's worth of scattered pins must not nominate a home.
  scattered = [
    _cluster(40.0 + index * 0.5, -100.0 - index * 0.5, day="2024-06-01")
    for index in range(25)
  ]
  assert infer_home_location(scattered) is None

  # Repeated visits around one metro area do.
  homebound = [_cluster(45.5 + index * 0.001, -122.6, day="2024-06-01") for index in range(22)]
  guess = infer_home_location(homebound + scattered[:5])
  assert guess is not None
  assert abs(guess[0] - 45.5) < 0.1
  assert abs(guess[1] + 122.6) < 0.1


def test_import_drops_chain_restaurant_on_a_trip(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  _patch_timeline_locate(monkeypatch, lambda mention: PlaceLocation(
      display_name="McDonald's",
      country="United States",
      country_code="US",
      city="Bend",
      latitude=mention.latitude or 44.05,
      longitude=mention.longitude or -121.3,
      osm_class="amenity",
      osm_type="restaurant",
    ))

  clusters = [_cluster(44.05, -121.3, day="2024-06-01", name="McDonald's")]
  result = import_timeline_visits(
    clusters=clusters,
    user_id=USER,
    source_format="phone",
    home_latitude=45.5,
    home_longitude=-122.6,
    home_exclude_km=30,
  )
  assert result.imported == 0
  assert result.queued_for_review == 0
  assert result.skipped_chain == 1
  assert list_visits(USER) == []


def test_import_drops_local_restaurant_but_keeps_local_landmark(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  def fake_locate(mention: PlaceMention) -> PlaceLocation:
    is_food = mention.place_name == "Neighborhood Diner"
    return PlaceLocation(
      display_name=mention.place_name,
      country="United States",
      country_code="US",
      city="Longview",
      latitude=mention.latitude or 45.9,
      longitude=mention.longitude or -122.9,
      osm_class="amenity" if is_food else "tourism",
      osm_type="restaurant" if is_food else "attraction",
    )

  _patch_timeline_locate(monkeypatch, fake_locate)

  # Both on an ordinary day, 60 km from home: too far to be home, too near to
  # be a trip. The diner is noise; the landmark is still a place worth keeping.
  result = import_timeline_visits(
    clusters=[
      _cluster(45.9, -122.9, day="2024-04-10", name="Neighborhood Diner"),
      _cluster(
        45.91,
        -122.91,
        day="2024-04-10",
        name="Mount St Helens Viewpoint",
        semantic_type="TYPE_TOURIST_ATTRACTION",
      ),
    ],
    user_id=USER,
    source_format="phone",
    home_latitude=45.5,
    home_longitude=-122.6,
    home_exclude_km=30,
  )
  assert result.skipped_local == 1
  assert result.imported == 1
  assert [visit.place_name for visit in list_visits(USER)] == ["Mount St Helens Viewpoint"]


def test_import_skips_routine_repeat_visits(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  _patch_timeline_locate(monkeypatch, lambda mention: PlaceLocation(
      display_name=mention.place_name,
      country="United States",
      country_code="US",
      latitude=mention.latitude or 48.6,
      longitude=mention.longitude or -121.0,
      osm_class="amenity",
      osm_type="cafe",
    ))

  result = import_timeline_visits(
    clusters=[
      _cluster(48.6, -121.0, day="2024-06-01", name="The Usual", visit_count=9),
    ],
    user_id=USER,
    source_format="phone",
    home_latitude=45.5,
    home_longitude=-122.6,
    home_exclude_km=30,
  )
  assert result.imported == 0
  assert result.skipped_routine == 1


def test_import_keeps_trip_restaurant(monkeypatch, dynamodb) -> None:
  import_mod = _timeline_import_mod()

  _patch_timeline_locate(monkeypatch, lambda mention: PlaceLocation(
      display_name=mention.place_name,
      country="Italy",
      country_code="IT",
      city="Florence",
      latitude=mention.latitude or 43.77,
      longitude=mention.longitude or 11.25,
      osm_class="amenity",
      osm_type="restaurant",
    ))

  result = import_timeline_visits(
    clusters=[
      _cluster(43.77, 11.25, day="2024-09-10", name="Trattoria Mario"),
      _cluster(43.78, 11.26, day="2024-09-11", name="Il Latini"),
    ],
    user_id=USER,
    source_format="phone",
    home_latitude=45.5,
    home_longitude=-122.6,
    home_exclude_km=30,
  )
  assert result.imported == 2
  assert result.skipped_local == 0
  assert result.queued_for_review == 0


def test_create_timeline_job_schema(dynamodb) -> None:
  from travelplanner.db import jobs_repo

  job_id = jobs_repo.create_timeline_job(
    user_id=USER,
    s3_key=f"timeline/{USER}/abc.json",
    source_format="phone",
    total_places=250,
    batch_size=100,
    home_latitude=45.5,
    home_longitude=-122.6,
  )
  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert job["kind"] == jobs_repo.JOB_KIND_TIMELINE_IMPORT
  assert job["total_places"] == 250
  assert len(job["links"]) == 3
  assert job["links"][0]["post_url"] == "timeline-batch:0"
  assert job["links"][2]["batch_count"] == 50
