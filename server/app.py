from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

from travelplanner import settings
from travelplanner.library import list_user_places, list_user_posts, user_owns_post
from travelplanner.models import TAGS, Place, Platform, SavedPost, Visit, make_post_id, parse_post_id
from travelplanner.pipeline import unlink_post_from_user
from travelplanner.places import cleanup_all_data, list_places, load_place, place_to_dict, reprocess_all_places
from travelplanner.store import load_post, post_to_dict
from travelplanner.visits import (
  create_visit,
  delete_visit,
  list_visits,
  load_visit,
  visit_to_dict,
  visited_place_ids,
)

from server.auth import AdminUserId, CurrentUserId
from server.ingest_runner import start_ingest_job
from server import jobs
from server.media_proxy import fetch_proxied_media
from server.schemas import (
  PlaceSchema,
  ErrorResponse,
  IngestRequest,
  IngestResponse,
  JobSchema,
  MaintenanceResultSchema,
  PlaceDetailSchema,
  SavedPostSchema,
  VisitCreateRequest,
  VisitDetailSchema,
  VisitSchema,
)

app = FastAPI(title="Travel Post Ingest API", version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.cors_origins(),
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


def _dedupe_links(links: list[str]) -> list[str]:
  seen: set[str] = set()
  deduped: list[str] = []
  for link in links:
    normalized = link.strip()
    if not normalized or normalized in seen:
      continue
    seen.add(normalized)
    deduped.append(normalized)
  return deduped


def _post_to_schema(post: SavedPost) -> SavedPostSchema:
  return SavedPostSchema(**post_to_dict(post))


def _place_to_schema(place: Place) -> PlaceSchema:
  return PlaceSchema(**place_to_dict(place))


def _visit_to_schema(visit: Visit) -> VisitSchema:
  return VisitSchema(**visit_to_dict(visit))


@app.post(
  "/api/ingest",
  response_model=IngestResponse,
  status_code=202,
  responses={400: {"model": ErrorResponse}},
)
def start_ingest(
  request: IngestRequest,
  user_id: CurrentUserId,
) -> IngestResponse:
  links = _dedupe_links(request.links)
  if not links:
    raise HTTPException(status_code=400, detail="At least one link is required")

  job_id = jobs.create_job(links, user_id=user_id, refresh=request.refresh)
  start_ingest_job(
    job_id,
    links,
    user_id=user_id,
    refresh=request.refresh,
  )
  return IngestResponse(job_id=job_id)


@app.get("/api/jobs/{job_id}", response_model=JobSchema, responses={404: {"model": ErrorResponse}})
def get_job(job_id: str, user_id: CurrentUserId) -> JobSchema:
  job = jobs.get_job_for_user(job_id, user_id)
  if job is None:
    raise HTTPException(status_code=404, detail="Job not found")
  return job


@app.get("/api/posts", response_model=list[SavedPostSchema])
def list_posts(
  user_id: CurrentUserId,
  platform: Platform | None = Query(default=None),
) -> list[SavedPostSchema]:
  posts = list_user_posts(user_id, platform=platform)
  return [_post_to_schema(post) for post in posts]


@app.get("/api/posts/{platform}/{post_id}", response_model=SavedPostSchema, responses={404: {"model": ErrorResponse}})
def get_post(platform: Platform, post_id: str, user_id: CurrentUserId) -> SavedPostSchema:
  global_post_id = post_id if ":" in post_id else make_post_id(platform, post_id)
  if not user_owns_post(user_id, global_post_id):
    raise HTTPException(status_code=404, detail="Post not found")
  post = load_post(platform, post_id)
  if post is None:
    raise HTTPException(status_code=404, detail="Post not found")
  return _post_to_schema(post)


@app.get("/api/media/proxy")
def proxy_media(user_id: CurrentUserId, url: str = Query(..., min_length=8)) -> Response:
  """Proxy Instagram CDN images so the browser is not blocked by CORP."""
  del user_id
  return fetch_proxied_media(url)


@app.delete("/api/posts/{platform}/{post_id}", status_code=204, response_class=Response)
def remove_post(platform: Platform, post_id: str, user_id: CurrentUserId) -> Response:
  global_post_id = post_id if ":" in post_id else make_post_id(platform, post_id)
  if not unlink_post_from_user(user_id, global_post_id):
    raise HTTPException(status_code=404, detail="Post not found")
  return Response(status_code=204)


@app.post("/api/places/reprocess", response_model=MaintenanceResultSchema)
def reprocess_places(user_id: AdminUserId) -> MaintenanceResultSchema:
  """Rebuild the place library from saved posts without re-fetching links."""
  del user_id
  reprocess_all_places()
  return MaintenanceResultSchema()


@app.post("/api/data/cleanup", response_model=MaintenanceResultSchema)
def cleanup_data(user_id: AdminUserId) -> MaintenanceResultSchema:
  """Delete all saved posts, canonical places, memberships, and visits."""
  del user_id
  posts_deleted, places_deleted, visits_deleted = cleanup_all_data()
  return MaintenanceResultSchema(
    posts_deleted=posts_deleted,
    places_deleted=places_deleted,
    visits_deleted=visits_deleted,
  )


@app.get("/api/visits", response_model=list[VisitDetailSchema])
def list_all_visits(user_id: CurrentUserId) -> list[VisitDetailSchema]:
  details: list[VisitDetailSchema] = []
  for visit in list_visits(user_id):
    place = load_place(visit.place_id)
    details.append(
      VisitDetailSchema(
        visit=_visit_to_schema(visit),
        place=_place_to_schema(place) if place is not None else None,
      )
    )
  return details


@app.get("/api/visits/place-ids", response_model=list[str])
def list_visited_place_ids(user_id: CurrentUserId) -> list[str]:
  return sorted(visited_place_ids(user_id))


@app.post(
  "/api/visits",
  response_model=VisitDetailSchema,
  status_code=201,
  responses={400: {"model": ErrorResponse}},
)
def add_visit(request: VisitCreateRequest, user_id: CurrentUserId) -> VisitDetailSchema:
  if not request.place_id and not (request.place_query and request.place_query.strip()):
    raise HTTPException(status_code=400, detail="Provide place_id or place_query")
  try:
    visit = create_visit(
      user_id=user_id,
      visited_from=request.visited_from,
      visited_to=request.visited_to,
      notes=request.notes,
      place_id=request.place_id,
      place_query=request.place_query,
      city=request.city,
      country=request.country,
    )
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc

  place = load_place(visit.place_id)
  return VisitDetailSchema(
    visit=_visit_to_schema(visit),
    place=_place_to_schema(place) if place is not None else None,
  )


@app.delete(
  "/api/visits/{visit_id}",
  status_code=204,
  response_class=Response,
  responses={404: {"model": ErrorResponse}},
)
def remove_visit(visit_id: str, user_id: CurrentUserId) -> Response:
  if load_visit(user_id, visit_id) is None:
    raise HTTPException(status_code=404, detail="Visit not found")
  delete_visit(user_id, visit_id)
  return Response(status_code=204)


@app.get("/api/tags", response_model=list[str])
def list_tags(user_id: CurrentUserId) -> list[str]:
  del user_id
  return list(TAGS)


@app.get("/api/places", response_model=list[PlaceSchema])
def list_all_places(
  user_id: CurrentUserId,
  continent: str | None = Query(default=None),
  country: str | None = Query(default=None),
  state_province: str | None = Query(default=None),
  city: str | None = Query(default=None),
  tag: str | None = Query(default=None),
  roots_only: bool = Query(default=False),
  parent_place_id: str | None = Query(default=None),
) -> list[PlaceSchema]:
  places = list_user_places(
    user_id,
    continent=continent,
    country=country,
    state_province=state_province,
    city=city,
    tag=tag,
    roots_only=roots_only,
    parent_place_id=parent_place_id,
  )
  return [_place_to_schema(place) for place in places]


@app.get(
  "/api/places/{place_id}",
  response_model=PlaceDetailSchema,
  responses={404: {"model": ErrorResponse}},
)
def get_place(place_id: str, user_id: CurrentUserId) -> PlaceDetailSchema:
  user_place_ids = set(
    p.place_id
    for p in list_user_places(user_id)
  )
  place = load_place(place_id)
  if place is None:
    raise HTTPException(status_code=404, detail="Place not found")
  # Allow detail if the place is in the user's library or is a child of one.
  if place_id not in user_place_ids and (
    place.parent_place_id is None or place.parent_place_id not in user_place_ids
  ):
    raise HTTPException(status_code=404, detail="Place not found")

  source_posts: list[SavedPostSchema] = []
  for source_post_id in place.source_post_ids:
    if not user_owns_post(user_id, source_post_id):
      continue
    try:
      platform, native_post_id = parse_post_id(source_post_id)
    except ValueError:
      continue
    post = load_post(platform, native_post_id)
    if post is not None:
      source_posts.append(_post_to_schema(post))

  parent = None
  if place.parent_place_id:
    parent_place = load_place(place.parent_place_id)
    if parent_place is not None:
      parent = _place_to_schema(parent_place)

  children = [
    _place_to_schema(child)
    for child in list_places(parent_place_id=place.place_id)
  ]

  return PlaceDetailSchema(
    place=_place_to_schema(place),
    source_posts=source_posts,
    parent=parent,
    children=children,
  )
