"""Distance-optimized route planner module using Google OR-Tools.

Takes coordinate stops (or place IDs / post ID) and computes the optimal visiting sequence
to minimize travel distance, with support for open tours, round trips, custom start points,
and navigation URL generation (Google Maps & Apple Maps).
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
import enum
import logging
import math
import time
from typing import Any, List, Optional
import urllib.parse

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

logger = logging.getLogger(__name__)

EARTH_RADIUS_METERS = 6371000


class StartMode(str, enum.Enum):
  FIXED = "fixed"  # Keep the first stop as the starting point
  ANY = "any"  # Find the global optimal starting stop that minimizes total distance
  CUSTOM = "custom"  # Prepend an explicit custom start coordinate (e.g. user GPS / hotel)


class TravelMode(str, enum.Enum):
  DRIVING = "driving"
  WALKING = "walking"
  BICYCLING = "bicycling"


@dataclass
class RouteStop:
  """A waypoint in a route."""

  stop_id: str
  name: str
  latitude: float
  longitude: float
  category: Optional[str] = None
  address: Optional[str] = None

  def to_dict(self) -> dict[str, Any]:
    return asdict(self)

  @classmethod
  def from_dict(cls, data: dict[str, Any]) -> RouteStop:
    return cls(
      stop_id=str(data.get("stop_id") or data.get("id") or data.get("place_id") or "stop"),
      name=str(data.get("name") or data.get("display_name") or "Unnamed Stop"),
      latitude=float(data["latitude"] if "latitude" in data else data["lat"]),
      longitude=float(data["longitude"] if "longitude" in data else data["lng"]),
      category=data.get("category"),
      address=data.get("address") or data.get("display_address"),
    )


@dataclass
class RouteLeg:
  """Travel segment between two consecutive stops."""

  from_stop_id: str
  to_stop_id: str
  from_name: str
  to_name: str
  distance_meters: int
  est_walking_minutes: int
  est_driving_minutes: int

  def to_dict(self) -> dict[str, Any]:
    return asdict(self)


@dataclass
class RouteOptimizationRequest:
  """Input configuration for route optimization."""

  stops: list[RouteStop] = field(default_factory=list)
  place_ids: list[str] = field(default_factory=list)
  post_id: Optional[str] = None
  start_mode: StartMode = StartMode.FIXED
  custom_start: Optional[RouteStop] = None
  custom_end: Optional[RouteStop] = None
  round_trip: bool = False
  travel_mode: TravelMode = TravelMode.DRIVING


@dataclass
class RouteOptimizationResult:
  """Result of a distance-optimized route."""

  ordered_stops: list[RouteStop]
  legs: list[RouteLeg]
  total_distance_meters: int
  total_distance_km: float
  original_distance_meters: int
  savings_meters: int
  savings_percent: float
  google_maps_url: str
  apple_maps_url: str
  round_trip: bool
  travel_mode: str
  solver_time_ms: float

  def to_dict(self) -> dict[str, Any]:
    return {
      "ordered_stops": [s.to_dict() for s in self.ordered_stops],
      "legs": [leg.to_dict() for leg in self.legs],
      "total_distance_meters": self.total_distance_meters,
      "total_distance_km": round(self.total_distance_km, 2),
      "original_distance_meters": self.original_distance_meters,
      "savings_meters": self.savings_meters,
      "savings_percent": round(self.savings_percent, 1),
      "google_maps_url": self.google_maps_url,
      "apple_maps_url": self.apple_maps_url,
      "round_trip": self.round_trip,
      "travel_mode": self.travel_mode,
      "solver_time_ms": round(self.solver_time_ms, 2),
    }


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
  """Great-circle distance between two points in meters."""
  phi1, phi2 = math.radians(lat1), math.radians(lat2)
  dphi = math.radians(lat2 - lat1)
  dlambda = math.radians(lon2 - lon1)
  a = (
    math.sin(dphi / 2) ** 2
    + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
  )
  return int(2 * EARTH_RADIUS_METERS * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


def build_distance_matrix(stops: list[RouteStop]) -> list[list[int]]:
  """Builds an N x N pairwise distance matrix in meters."""
  n = len(stops)
  matrix = [[0] * n for _ in range(n)]
  for i in range(n):
    for j in range(i + 1, n):
      dist = haversine_distance_meters(
        stops[i].latitude, stops[i].longitude, stops[j].latitude, stops[j].longitude
      )
      matrix[i][j] = dist
      matrix[j][i] = dist
  return matrix


def estimate_travel_times(distance_meters: int) -> tuple[int, int]:
  """Returns estimated (walking_minutes, driving_minutes)."""
  walking_min = max(1, math.ceil(distance_meters / 80.0)) if distance_meters > 0 else 0
  driving_min = max(1, math.ceil(distance_meters / 450.0)) if distance_meters > 0 else 0
  return walking_min, driving_min


def build_google_maps_url(
  stops: list[RouteStop], travel_mode: TravelMode = TravelMode.DRIVING
) -> str:
  """Constructs a Google Maps universal directions URL supporting multiple waypoints."""
  if not stops:
    return "https://www.google.com/maps"
  if len(stops) == 1:
    return f"https://www.google.com/maps/search/?api=1&query={stops[0].latitude},{stops[0].longitude}"

  mode_param = travel_mode.value.lower()
  coords = [f"{s.latitude:.6f},{s.longitude:.6f}" for s in stops]
  path = "/".join(coords)
  return f"https://www.google.com/maps/dir/{path}/?entry=ttu&travelmode={mode_param}"


def build_apple_maps_url(stops: list[RouteStop]) -> str:
  """Constructs an Apple Maps directions link between origin and destination with waypoints."""
  if not stops:
    return "https://maps.apple.com"
  if len(stops) == 1:
    return f"https://maps.apple.com/?q={stops[0].latitude},{stops[0].longitude}"

  saddr = f"{stops[0].latitude:.6f},{stops[0].longitude:.6f}"
  daddr = f"{stops[-1].latitude:.6f},{stops[-1].longitude:.6f}"
  return f"https://maps.apple.com/?saddr={saddr}&daddr={daddr}"


def _solve_tsp_ortools(
  dist_matrix: list[list[int]],
  start_index: int,
  end_index: Optional[int],
  round_trip: bool,
) -> list[int]:
  """Solves TSP using OR-Tools for given distance matrix and constraints."""
  n = len(dist_matrix)
  if n <= 1:
    return list(range(n))
  if n == 2:
    if round_trip:
      return [start_index, 1 if start_index == 0 else 0, start_index]
    return [start_index, 1 if start_index == 0 else 0]

  if round_trip:
    manager = pywrapcp.RoutingIndexManager(n, 1, start_index)
    routing = pywrapcp.RoutingModel(manager)

    def dist_cb_loop(from_idx: int, to_idx: int) -> int:
      return dist_matrix[manager.IndexToNode(from_idx)][manager.IndexToNode(to_idx)]

    transit_idx = routing.RegisterTransitCallback(dist_cb_loop)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_idx)

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
      routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    solution = routing.SolveWithParameters(search_params)
    if not solution:
      return list(range(n))

    route = []
    idx = routing.Start(0)
    while not routing.IsEnd(idx):
      route.append(manager.IndexToNode(idx))
      idx = solution.Value(routing.NextVar(idx))
    route.append(manager.IndexToNode(idx))  # Closing loop
    return route

  # Open Tour (Start fixed, End anywhere or fixed)
  if end_index is not None:
    # Fixed start and fixed end
    manager = pywrapcp.RoutingIndexManager(n, 1, [start_index], [end_index])
    routing = pywrapcp.RoutingModel(manager)

    def dist_cb_fixed_end(from_idx: int, to_idx: int) -> int:
      return dist_matrix[manager.IndexToNode(from_idx)][manager.IndexToNode(to_idx)]

    transit_idx = routing.RegisterTransitCallback(dist_cb_fixed_end)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_idx)
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
      routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )

    solution = routing.SolveWithParameters(search_params)
    if not solution:
      return list(range(n))

    route = []
    idx = routing.Start(0)
    while not routing.IsEnd(idx):
      route.append(manager.IndexToNode(idx))
      idx = solution.Value(routing.NextVar(idx))
    route.append(manager.IndexToNode(idx))
    return route

  # Open Tour: End anywhere. Add dummy end node (index n) with 0 distance from all nodes.
  open_matrix = [row + [0] for row in dist_matrix]
  open_matrix.append([0] * (n + 1))

  manager = pywrapcp.RoutingIndexManager(n + 1, 1, [start_index], [n])
  routing = pywrapcp.RoutingModel(manager)

  def dist_cb_open(from_idx: int, to_idx: int) -> int:
    return open_matrix[manager.IndexToNode(from_idx)][manager.IndexToNode(to_idx)]

  transit_idx = routing.RegisterTransitCallback(dist_cb_open)
  routing.SetArcCostEvaluatorOfAllVehicles(transit_idx)

  search_params = pywrapcp.DefaultRoutingSearchParameters()
  search_params.first_solution_strategy = (
    routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
  )

  solution = routing.SolveWithParameters(search_params)
  if not solution:
    return list(range(n))

  route = []
  idx = routing.Start(0)
  while not routing.IsEnd(idx):
    node = manager.IndexToNode(idx)
    if node < n:  # Omit dummy end node
      route.append(node)
    idx = solution.Value(routing.NextVar(idx))

  return route


def resolve_stops_from_db(
  place_ids: list[str] | None = None, post_id: str | None = None
) -> list[RouteStop]:
  """Fetches coordinates for place_ids or post_id from DynamoDB repos."""
  resolved_ids: list[str] = []
  if place_ids:
    resolved_ids.extend(place_ids)

  if post_id:
    from travelplanner.store import load_post_by_id

    post = load_post_by_id(post_id)
    if post and post.place_ids:
      for pid in post.place_ids:
        if pid not in resolved_ids:
          resolved_ids.append(pid)

  if not resolved_ids:
    return []

  from travelplanner.places import load_place

  stops: list[RouteStop] = []
  for pid in resolved_ids:
    place = load_place(pid)
    if place and place.latitude is not None and place.longitude is not None:
      stops.append(
        RouteStop(
          stop_id=place.place_id,
          name=place.name,
          latitude=place.latitude,
          longitude=place.longitude,
          category=place.category,
          address=place.address,
        )
      )
  return stops


def optimize_route(request: RouteOptimizationRequest) -> RouteOptimizationResult:
  """Optimizes a list of route stops using Google OR-Tools."""
  start_time = time.perf_counter()

  # 1. Resolve stops from DB if place_ids or post_id provided
  initial_stops = list(request.stops)
  if not initial_stops and (request.place_ids or request.post_id):
    initial_stops = resolve_stops_from_db(request.place_ids, request.post_id)

  # 2. Inject custom start / custom end if requested
  stops: list[RouteStop] = []
  if request.start_mode == StartMode.CUSTOM and request.custom_start:
    stops.append(request.custom_start)
    for s in initial_stops:
      if s.stop_id != request.custom_start.stop_id:
        stops.append(s)
  else:
    stops = list(initial_stops)

  if request.custom_end:
    for s in list(stops):
      if s.stop_id == request.custom_end.stop_id:
        stops.remove(s)
    stops.append(request.custom_end)

  n = len(stops)

  # Handle edge cases: 0 or 1 stop
  if n <= 1:
    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    return RouteOptimizationResult(
      ordered_stops=stops,
      legs=[],
      total_distance_meters=0,
      total_distance_km=0.0,
      original_distance_meters=0,
      savings_meters=0,
      savings_percent=0.0,
      google_maps_url=build_google_maps_url(stops, request.travel_mode),
      apple_maps_url=build_apple_maps_url(stops),
      round_trip=request.round_trip,
      travel_mode=request.travel_mode.value,
      solver_time_ms=elapsed_ms,
    )

  # 3. Distance Matrix
  dist_matrix = build_distance_matrix(stops)

  # Original sequence distance
  original_distance = 0
  for i in range(n - 1):
    original_distance += dist_matrix[i][i + 1]
  if request.round_trip and n > 2:
    original_distance += dist_matrix[n - 1][0]

  # 4. Determine Start & End parameters
  best_route_indices: list[int] = []

  if request.start_mode == StartMode.ANY and not request.round_trip and not request.custom_end:
    best_dist = float("inf")
    for start_cand in range(n):
      cand_route = _solve_tsp_ortools(
        dist_matrix, start_index=start_cand, end_index=None, round_trip=False
      )
      cand_dist = sum(
        dist_matrix[cand_route[k]][cand_route[k + 1]]
        for k in range(len(cand_route) - 1)
      )
      if cand_dist < best_dist:
        best_dist = cand_dist
        best_route_indices = cand_route
  else:
    start_idx = 0
    end_idx = (n - 1) if request.custom_end else None
    best_route_indices = _solve_tsp_ortools(
      dist_matrix,
      start_index=start_idx,
      end_index=end_idx,
      round_trip=request.round_trip,
    )

  # 5. Build Ordered Stops & Legs
  ordered_stops = [stops[i] for i in best_route_indices]

  legs: list[RouteLeg] = []
  total_distance = 0
  for i in range(len(ordered_stops) - 1):
    from_s = ordered_stops[i]
    to_s = ordered_stops[i + 1]
    from_node = best_route_indices[i]
    to_node = best_route_indices[i + 1]
    leg_dist = dist_matrix[from_node][to_node]
    total_distance += leg_dist
    walk_min, drive_min = estimate_travel_times(leg_dist)
    legs.append(
      RouteLeg(
        from_stop_id=from_s.stop_id,
        to_stop_id=to_s.stop_id,
        from_name=from_s.name,
        to_name=to_s.name,
        distance_meters=leg_dist,
        est_walking_minutes=walk_min,
        est_driving_minutes=drive_min,
      )
    )

  savings_meters = max(0, original_distance - total_distance)
  savings_pct = (savings_meters / original_distance * 100.0) if original_distance > 0 else 0.0

  elapsed_ms = (time.perf_counter() - start_time) * 1000.0

  return RouteOptimizationResult(
    ordered_stops=ordered_stops,
    legs=legs,
    total_distance_meters=total_distance,
    total_distance_km=total_distance / 1000.0,
    original_distance_meters=original_distance,
    savings_meters=savings_meters,
    savings_percent=savings_pct,
    google_maps_url=build_google_maps_url(ordered_stops, request.travel_mode),
    apple_maps_url=build_apple_maps_url(ordered_stops),
    round_trip=request.round_trip,
    travel_mode=request.travel_mode.value,
    solver_time_ms=elapsed_ms,
  )
