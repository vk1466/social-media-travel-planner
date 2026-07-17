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
  assert needs_user_review(restaurant) is False

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
  from travelplanner.timeline import import_visits as import_mod
  from travelplanner.visits import list_timeline_reviews, list_visits

  monkeypatch.setattr(
    import_mod,
    "locate_mention",
    lambda mention: PlaceLocation(
      display_name="Telus Garden",
      country="Canada",
      country_code="CA",
      city="Vancouver",
      state_province="British Columbia",
      latitude=mention.latitude or 49.28,
      longitude=mention.longitude or -123.12,
      osm_class="building",
      osm_type="commercial",
    ),
  )
  monkeypatch.setattr(import_mod, "needs_user_review", lambda place: True)
  monkeypatch.setattr(
    import_mod,
    "suggest_travel_place",
    lambda place: ("discard", "office building"),
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
  assert reviews[0].source == "timeline_review"
  assert "suggest=discard" in (reviews[0].notes or "")


def test_nearby_fallback_when_reverse_is_house(monkeypatch, dynamodb) -> None:
  from travelplanner.clients.geocoder import GeocodeResult
  from travelplanner.timeline import import_visits as import_mod
  from travelplanner.visits import list_visits

  monkeypatch.setattr(
    import_mod.geocoder,
    "reverse_geocode_normalized",
    lambda lat, lon, *, fallback_name="": GeocodeResult(
      display_name="5170",
      latitude=lat,
      longitude=lon,
      city="Mukilteo",
      state_province="Washington",
      country="United States",
      country_code="US",
      osm_class="place",
      osm_type="house",
    ),
  )
  monkeypatch.setattr(
    import_mod,
    "search_nearby_travel_pois",
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
  monkeypatch.setattr(import_mod, "needs_user_review", lambda place: False)

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
  from travelplanner.timeline import import_visits as import_mod
  from travelplanner.visits import (
    accept_timeline_review,
    discard_timeline_review,
    list_timeline_reviews,
    list_visits,
  )

  monkeypatch.setattr(
    import_mod,
    "locate_mention",
    lambda mention: PlaceLocation(
      display_name=mention.place_name,
      country="United States",
      country_code="US",
      city="Seattle",
      latitude=47.6,
      longitude=-122.3,
      osm_class="building",
      osm_type="yes",
    ),
  )
  monkeypatch.setattr(import_mod, "needs_user_review", lambda place: True)
  monkeypatch.setattr(import_mod, "suggest_travel_place", lambda place: ("unsure", "maybe"))

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
  from travelplanner.timeline import import_visits as import_mod

  monkeypatch.setattr(
    import_mod,
    "locate_mention",
    lambda mention: PlaceLocation(
      display_name=mention.place_name or "Place",
      country="United States",
      country_code="US",
      latitude=mention.latitude or 44.4,
      longitude=mention.longitude or -121.15,
      osm_class="tourism",
      osm_type="attraction",
    ),
  )

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
  from travelplanner.timeline import import_visits as import_mod

  monkeypatch.setattr(
    import_mod,
    "locate_mention",
    lambda mention: PlaceLocation(
      display_name="Near home cafe",
      country="United States",
      country_code="US",
      latitude=45.51,
      longitude=-122.61,
      osm_class="amenity",
      osm_type="cafe",
    ),
  )

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
  from travelplanner.timeline import import_visits as import_mod

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

  monkeypatch.setattr(import_mod.geocoder, "reverse_geocode_normalized", fake_reverse)

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
  assert result.skipped_unresolved == 1


def test_import_timeline_creates_visits(monkeypatch, dynamodb) -> None:
  from travelplanner.timeline import import_visits as import_mod

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

  monkeypatch.setattr(import_mod, "locate_mention", fake_locate)

  fmt, visits = parse_timeline_payload(TAKEOUT_SAMPLE)
  result = import_timeline_visits(visits, user_id=USER, source_format=fmt, max_places=10)

  assert result.imported == 1
  assert result.unique_places == 1
  assert visited_place_ids(USER)
  trip = list_visits(USER)[0]
  assert trip.place_name == "Multnomah Falls"
  assert trip.source == "timeline"
  assert trip.visited_from == "2024-06-12"
  assert trip.visited_to == "2024-06-13"


def test_delete_visits_by_source(monkeypatch, dynamodb) -> None:
  from travelplanner.timeline import import_visits as import_mod

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

  monkeypatch.setattr(import_mod, "locate_mention", fake_locate)
  fmt, visits = parse_timeline_payload(TAKEOUT_SAMPLE)
  import_timeline_visits(visits, user_id=USER, source_format=fmt)
  assert len(list_visits(USER)) == 1
  deleted = delete_visits_by_source(user_id=USER, source="timeline")
  assert deleted == 1
  assert list_visits(USER) == []


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
