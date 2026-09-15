"""Tests for Google OR-Tools distance-optimized route planning."""

from __future__ import annotations

import json
import pytest
from starlette.testclient import TestClient

from server.app import app
from server.workers import optimize_route_worker
from travelplanner.routing import (
  RouteOptimizationRequest,
  RouteStop,
  StartMode,
  TravelMode,
  build_apple_maps_url,
  build_google_maps_url,
  haversine_distance_meters,
  optimize_route,
)

# Coordinates for the 6 resolved Amsterdam places from reel DOd5nuWDAuP
AMSTERDAM_STOPS = [
  RouteStop("moco", "Moco Museum", 52.3587165, 4.8819619, "museum"),
  RouteStop("anne-frank", "Anne Frank House", 52.3752, 4.8840, "landmark"),
  RouteStop("corner-bakery", "Corner Bakery Amsterdam", 52.3551, 4.8849, "cafe"),
  RouteStop("burger-maffia", "The Burger Maffia", 52.3683, 4.8693, "restaurant"),
  RouteStop("ripleys", "Ripley's Believe It or Not!", 52.3728, 4.8936, "landmark"),
  RouteStop("red-light", "Red Light District", 52.3725, 4.8978, "neighborhood"),
]


def test_haversine_distance_basic():
  # Distance between Moco Museum and Corner Bakery is ~448 meters
  d = haversine_distance_meters(52.3587165, 4.8819619, 52.3551, 4.8849)
  assert 440 <= d <= 460


def test_optimize_route_empty_and_single():
  # 0 stops
  r0 = optimize_route(RouteOptimizationRequest(stops=[]))
  assert len(r0.ordered_stops) == 0
  assert r0.total_distance_meters == 0
  assert r0.legs == []

  # 1 stop
  r1 = optimize_route(RouteOptimizationRequest(stops=[AMSTERDAM_STOPS[0]]))
  assert len(r1.ordered_stops) == 1
  assert r1.total_distance_meters == 0
  assert r1.legs == []


def test_optimize_route_two_stops():
  stops = [AMSTERDAM_STOPS[0], AMSTERDAM_STOPS[1]]
  res = optimize_route(RouteOptimizationRequest(stops=stops))
  assert len(res.ordered_stops) == 2
  assert res.ordered_stops[0].stop_id == "moco"
  assert res.ordered_stops[1].stop_id == "anne-frank"
  assert len(res.legs) == 1
  assert res.total_distance_meters > 1800


def test_optimize_route_open_tour_fixed_start():
  """Tests open tour keeping Moco Museum as stop 0."""
  req = RouteOptimizationRequest(
    stops=AMSTERDAM_STOPS,
    start_mode=StartMode.FIXED,
    round_trip=False,
  )
  res = optimize_route(req)

  assert len(res.ordered_stops) == 6
  assert res.ordered_stops[0].stop_id == "moco"
  # Optimized distance should be ~4.51 km vs original ~7.89 km
  assert 4400 <= res.total_distance_meters <= 4600
  assert res.savings_meters > 3000
  assert res.savings_percent > 40.0
  assert len(res.legs) == 5
  assert "google.com/maps/dir" in res.google_maps_url
  assert "maps.apple.com" in res.apple_maps_url


def test_optimize_route_global_optimal_any_start():
  """Tests any-start open tour (Corner Bakery breakfast optimal start)."""
  req = RouteOptimizationRequest(
    stops=AMSTERDAM_STOPS,
    start_mode=StartMode.ANY,
    round_trip=False,
  )
  res = optimize_route(req)

  assert len(res.ordered_stops) == 6
  # Corner Bakery or Red Light District are the natural open tour ends
  start_id = res.ordered_stops[0].stop_id
  assert start_id in ("corner-bakery", "red-light")
  # Total distance should be ~4.07 km
  assert 4000 <= res.total_distance_meters <= 4200
  assert res.savings_percent > 45.0


def test_optimize_route_round_trip():
  """Tests closed loop returning to starting point."""
  req = RouteOptimizationRequest(
    stops=AMSTERDAM_STOPS,
    start_mode=StartMode.FIXED,
    round_trip=True,
  )
  res = optimize_route(req)

  # Round trip has 7 entries in ordered_stops (returns to start)
  assert len(res.ordered_stops) == 7
  assert res.ordered_stops[0].stop_id == "moco"
  assert res.ordered_stops[-1].stop_id == "moco"
  assert 6100 <= res.total_distance_meters <= 6300
  assert len(res.legs) == 6


def test_optimize_route_custom_start():
  """Tests prepending a custom starting point (e.g. Amsterdam Centraal Station)."""
  custom_start = RouteStop(
    stop_id="custom-hotel",
    name="Amsterdam Centraal Hotel",
    latitude=52.3791,
    longitude=4.9003,
  )
  req = RouteOptimizationRequest(
    stops=AMSTERDAM_STOPS,
    start_mode=StartMode.CUSTOM,
    custom_start=custom_start,
    round_trip=False,
  )
  res = optimize_route(req)

  assert res.ordered_stops[0].stop_id == "custom-hotel"
  assert len(res.ordered_stops) == 7


def test_urls_generation():
  stops = AMSTERDAM_STOPS[:3]
  g_url = build_google_maps_url(stops, TravelMode.WALKING)
  assert "travelmode=walking" in g_url
  assert "52.358716,4.881962" in g_url

  a_url = build_apple_maps_url(stops)
  assert "saddr=52.358716,4.881962" in a_url
  assert "daddr=52.355100,4.884900" in a_url


def test_lambda_worker_direct_invocation():
  payload = {
    "stops": [s.to_dict() for s in AMSTERDAM_STOPS],
    "start_mode": "fixed",
    "round_trip": False,
  }
  res = optimize_route_worker(payload)
  assert "ordered_stops" in res
  assert res["ordered_stops"][0]["stop_id"] == "moco"
  assert res["total_distance_km"] < 5.0
  assert "google_maps_url" in res


def test_lambda_worker_api_gateway_proxy_invocation():
  body_dict = {
    "stops": [s.to_dict() for s in AMSTERDAM_STOPS],
    "start_mode": "any",
    "round_trip": False,
  }
  event = {
    "rawPath": "/optimize",
    "headers": {"Content-Type": "application/json"},
    "body": json.dumps(body_dict),
  }
  res = optimize_route_worker(event)
  assert res["statusCode"] == 200
  parsed = json.loads(res["body"])
  assert len(parsed["ordered_stops"]) == 6
  assert parsed["savings_percent"] > 45.0


def test_fastapi_optimize_endpoint():
  client = TestClient(app)
  payload = {
    "stops": [
      {"stop_id": "moco", "name": "Moco Museum", "latitude": 52.3587165, "longitude": 4.8819619},
      {"stop_id": "anne", "name": "Anne Frank", "latitude": 52.3752, "longitude": 4.8840},
      {"stop_id": "corner", "name": "Corner Bakery", "latitude": 52.3551, "longitude": 4.8849},
    ],
    "start_mode": "fixed",
    "round_trip": False,
    "travel_mode": "driving",
    "filter_unreachable": False,
  }
  response = client.post("/api/routes/optimize", json=payload)
  assert response.status_code == 200
  data = response.json()
  assert len(data["ordered_stops"]) == 3
  assert data["ordered_stops"][0]["stop_id"] == "moco"
  assert "legs" in data
  assert len(data["legs"]) == 2
  assert "google_maps_url" in data
  assert data["total_distance_km"] > 0
  assert "excluded_stops" in data


def test_osrm_check_nearest_road(monkeypatch):
  from travelplanner.clients.osrm import check_nearest_road

  class FakeResponse:
    status_code = 200

    def json(self):
      return {
        "code": "Ok",
        "waypoints": [
          {
            "distance": 42.5,
            "name": "Paulus Potterstraat",
            "location": [4.8820, 52.3588],
          }
        ],
      }

  class FakeClient:
    def get(self, url):
      return FakeResponse()

  res = check_nearest_road(52.3587, 4.8819, http_client=FakeClient())
  assert res.has_road is True
  assert res.distance_meters == 42.5
  assert res.snapped_latitude == 52.3588
  assert res.road_name == "Paulus Potterstraat"


def test_osrm_check_nearest_road_offroad(monkeypatch):
  from travelplanner.clients.osrm import check_nearest_road

  # Distance 3200m > default 1500m threshold
  class FakeResponse:
    status_code = 200

    def json(self):
      return {
        "code": "Ok",
        "waypoints": [
          {
            "distance": 3200.0,
            "name": "Wilderness Path",
            "location": [-119.53, 37.74],
          }
        ],
      }

  class FakeClient:
    def get(self, url):
      return FakeResponse()

  res = check_nearest_road(37.74, -119.53, max_distance_meters=1500.0, http_client=FakeClient())
  assert res.has_road is False
  assert res.distance_meters == 3200.0


def test_osrm_network_error_fail_open(monkeypatch):
  from travelplanner.clients.osrm import check_nearest_road

  class FaultyClient:
    def get(self, url):
      raise ConnectionError("Network unreachable")

  res = check_nearest_road(52.3587, 4.8819, http_client=FaultyClient())
  # Should fail open so we don't crash optimization when OSRM is unreachable
  assert res.has_road is True
  assert "Network unreachable" in str(res.error)


def test_optimize_route_filters_offroad_stop(monkeypatch):
  """Tests that off-road coordinate is excluded when filter_unreachable is True."""
  from travelplanner.clients.osrm import OsrmNearestResult

  def fake_check(latitude=None, longitude=None, **kwargs):
    # If it's the wilderness stop, simulate far off-road
    if latitude is not None and abs(latitude - 37.745) < 0.01:
      return OsrmNearestResult(has_road=False, distance_meters=3500.0)
    return OsrmNearestResult(has_road=True, distance_meters=20.0, snapped_latitude=latitude, snapped_longitude=longitude)

  monkeypatch.setattr("travelplanner.clients.osrm.check_nearest_road", fake_check)

  stops = [
    AMSTERDAM_STOPS[0],
    AMSTERDAM_STOPS[1],
    RouteStop("remote-peak", "Wilderness Peak", 37.745, -119.533),
  ]

  # 1. With filtering enabled (default)
  res_filtered = optimize_route(
    RouteOptimizationRequest(stops=stops, filter_unreachable=True, travel_mode=TravelMode.DRIVING)
  )
  assert len(res_filtered.ordered_stops) == 2
  assert len(res_filtered.excluded_stops) == 1
  assert res_filtered.excluded_stops[0]["stop_id"] == "remote-peak"
  assert "No drivable road" in res_filtered.excluded_stops[0]["reason"]

  # 2. With filtering disabled
  res_unfiltered = optimize_route(
    RouteOptimizationRequest(stops=stops, filter_unreachable=False, travel_mode=TravelMode.DRIVING)
  )
  assert len(res_unfiltered.ordered_stops) == 3
  assert len(res_unfiltered.excluded_stops) == 0

