"""Tests for Google Maps Timeline parse + import."""

from __future__ import annotations

import io
import json
import zipfile

from travelplanner.models import PlaceLocation
from travelplanner.place_hints import PlaceMention
from travelplanner.places import upsert_place
from travelplanner.timeline.import_visits import cluster_timeline_visits, import_timeline_visits
from travelplanner.timeline.parse import (
  TimelineVisit,
  detect_format,
  parse_timeline_bytes,
  parse_timeline_payload,
)
from travelplanner.visits import list_visits, visited_place_ids

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
          "semanticType": "UNKNOWN",
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
  ]
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
          "semanticType": "TYPE_ATTRACTION",
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
          "semanticType": "TYPE_ATTRACTION",
        },
        "duration": {
          "startTimestamp": "2024-06-13T10:00:00.000Z",
          "endTimestamp": "2024-06-13T11:00:00.000Z",
        },
      }
    },
  ]
}


def test_detect_phone_and_takeout_formats() -> None:
  assert detect_format(PHONE_SAMPLE) == "phone"
  assert detect_format(TAKEOUT_SAMPLE) == "takeout_semantic"
  assert detect_format({"locations": []}) == "records"


def test_parse_phone_skips_home() -> None:
  fmt, visits = parse_timeline_payload(PHONE_SAMPLE)
  assert fmt == "phone"
  assert len(visits) == 1
  assert visits[0].google_place_id == "ChIJ_smith_rock"
  assert visits[0].visited_from == "2024-04-03"
  assert abs(visits[0].latitude - 44.3656) < 1e-4


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
      source_format="takeout_semantic",
    ),
    TimelineVisit(
      latitude=45.5763,
      longitude=-122.1159,
      visited_from="2024-06-13",
      visited_to="2024-06-13",
      place_name="Multnomah Falls",
      google_place_id="ChIJ_falls",
      source_format="takeout_semantic",
    ),
  ]
  clusters = cluster_timeline_visits(visits)
  assert len(clusters) == 1
  assert clusters[0].visited_from == "2024-06-12"
  assert clusters[0].visited_to == "2024-06-13"
  assert clusters[0].visit_count == 2


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
  assert result.visits_parsed == 2
  assert visited_place_ids(USER)
  trip = list_visits(USER)[0]
  assert trip.place_name == "Multnomah Falls"
  assert trip.visited_from == "2024-06-12"
  assert trip.visited_to == "2024-06-13"
  assert trip.notes and "Timeline" in trip.notes


def test_import_skips_already_visited(monkeypatch, dynamodb) -> None:
  from travelplanner.timeline import import_visits as import_mod

  place_id = upsert_place(
    PlaceMention(place_name="Multnomah Falls"),
    PlaceLocation(
      display_name="Multnomah Falls",
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
    ),
    None,
  )

  def fake_locate(mention: PlaceMention) -> PlaceLocation:
    return PlaceLocation(
      display_name="Multnomah Falls",
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

  from travelplanner.visits import create_visit

  create_visit(user_id=USER, place_id=place_id, visited_from="2023-01-01")

  fmt, visits = parse_timeline_payload(TAKEOUT_SAMPLE)
  result = import_timeline_visits(visits, user_id=USER, source_format=fmt)
  assert result.imported == 0
  assert result.skipped_existing == 1
  assert len(list_visits(USER)) == 1


def test_api_import_timeline(monkeypatch, dynamodb) -> None:
  from fastapi.testclient import TestClient

  from server.app import app
  from travelplanner.timeline import import_visits as import_mod

  def fake_locate(mention: PlaceMention) -> PlaceLocation:
    return PlaceLocation(
      display_name=mention.place_name or "Place",
      continent="North America",
      country="United States",
      country_code="US",
      state_province="Oregon",
      city="Portland",
      latitude=mention.latitude or 45.5762,
      longitude=mention.longitude or -122.1158,
      provider_place_id="osm-2",
      osm_class="tourism",
      osm_type="attraction",
    )

  monkeypatch.setattr(import_mod, "locate_mention", fake_locate)

  fmt, visits = parse_timeline_payload(TAKEOUT_SAMPLE)
  client = TestClient(app)
  response = client.post(
    "/api/visits/import-timeline",
    headers={"X-User-Id": USER},
    json={
      "format": fmt,
      "visits": [
        {
          "latitude": visit.latitude,
          "longitude": visit.longitude,
          "visited_from": visit.visited_from,
          "visited_to": visit.visited_to,
          "place_name": visit.place_name,
          "google_place_id": visit.google_place_id,
          "semantic_type": visit.semantic_type,
          "address": visit.address,
        }
        for visit in visits
      ],
    },
  )
  assert response.status_code == 200, response.text
  body = response.json()
  assert body["format"] == "takeout_semantic"
  assert body["visits_parsed"] == 2
  assert body["imported"] == 1
  assert body["unique_places"] == 1


def test_import_phone_uses_reverse_geocode(monkeypatch, dynamodb) -> None:
  from travelplanner.clients.geocoder import GeocodeResult
  from travelplanner.timeline import import_visits as import_mod

  def fake_reverse(lat: float, lon: float, *, fallback_name: str = "") -> GeocodeResult:
    return GeocodeResult(
      display_name="Smith Rock",
      latitude=lat,
      longitude=lon,
      country="United States",
      country_code="US",
      state_province="Oregon",
      city="Terrebonne",
      provider_place_id="osm-3",
      category="attraction",
      osm_class="tourism",
      osm_type="attraction",
    )

  monkeypatch.setattr(import_mod.geocoder, "reverse_geocode_normalized", fake_reverse)

  fmt, visits = parse_timeline_payload(PHONE_SAMPLE)
  result = import_timeline_visits(visits, user_id=USER, source_format=fmt)
  assert result.imported == 1
  assert list_visits(USER)[0].place_name == "Smith Rock"
