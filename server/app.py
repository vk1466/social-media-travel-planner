from __future__ import annotations

from fastapi import BackgroundTasks, FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware

from travelplanner.models import TAGS, CanonicalPlace, Platform, SavedPost
from travelplanner.pipeline import ingest_link
from travelplanner.hierarchy import link_places
from travelplanner.places import cleanup_all_data, list_places, load_place, place_to_dict, reprocess_all_places
from travelplanner.store import delete_post, load_all_posts, load_post, post_to_dict

from server.jobs import job_store
from server.schemas import (
  CanonicalPlaceSchema,
  ErrorResponse,
  IngestRequest,
  IngestResponse,
  JobSchema,
  MaintenanceResultSchema,
  PlaceDetailSchema,
  SavedPostSchema,
)

app = FastAPI(title="Travel Post Ingest API", version="0.1.0")

app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ],
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


def _place_to_schema(place: CanonicalPlace) -> CanonicalPlaceSchema:
  return CanonicalPlaceSchema(**place_to_dict(place))


def _sort_posts_newest_first(posts: list[SavedPost]) -> list[SavedPost]:
  return sorted(posts, key=lambda post: post.fetched_at or "", reverse=True)


def _run_ingest_job(job_id: str, post_urls: list[str], *, refresh: bool) -> None:
  for post_url in post_urls:
    job_store.mark_fetching(job_id, post_url)
    result = ingest_link(post_url, refresh=refresh)
    job_store.update_link(job_id, result)
  try:
    link_places()
  except Exception:
    pass
  job_store.mark_done(job_id)


@app.post(
  "/api/ingest",
  response_model=IngestResponse,
  status_code=202,
  responses={400: {"model": ErrorResponse}},
)
def start_ingest(request: IngestRequest, background_tasks: BackgroundTasks) -> IngestResponse:
  links = _dedupe_links(request.links)
  if not links:
    raise HTTPException(status_code=400, detail="At least one link is required")

  job_id = job_store.create_job(links, refresh=request.refresh)
  background_tasks.add_task(_run_ingest_job, job_id, links, refresh=request.refresh)
  return IngestResponse(job_id=job_id)


@app.get("/api/jobs/{job_id}", response_model=JobSchema, responses={404: {"model": ErrorResponse}})
def get_job(job_id: str) -> JobSchema:
  job = job_store.to_schema(job_id)
  if job is None:
    raise HTTPException(status_code=404, detail="Job not found")
  return job


@app.get("/api/posts", response_model=list[SavedPostSchema])
def list_posts(platform: Platform | None = Query(default=None)) -> list[SavedPostSchema]:
  posts = _sort_posts_newest_first(load_all_posts(platform=platform))
  return [_post_to_schema(post) for post in posts]


@app.get(
  "/api/posts/{platform}/{post_id}",
  response_model=SavedPostSchema,
  responses={404: {"model": ErrorResponse}},
)
def get_post(platform: Platform, post_id: str) -> SavedPostSchema:
  post = load_post(platform, post_id)
  if post is None:
    raise HTTPException(status_code=404, detail="Post not found")
  return _post_to_schema(post)


@app.delete("/api/posts/{platform}/{post_id}", status_code=204, response_class=Response)
def remove_post(platform: Platform, post_id: str) -> Response:
  deleted = delete_post(platform, post_id)
  if not deleted:
    raise HTTPException(status_code=404, detail="Post not found")
  return Response(status_code=204)


@app.post("/api/places/reprocess", response_model=MaintenanceResultSchema)
def reprocess_places() -> MaintenanceResultSchema:
  """Rebuild the place library from saved posts without re-fetching links."""
  reprocess_all_places()
  return MaintenanceResultSchema()


@app.post("/api/data/cleanup", response_model=MaintenanceResultSchema)
def cleanup_data() -> MaintenanceResultSchema:
  """Delete all saved posts and canonical places."""
  posts_deleted, places_deleted = cleanup_all_data()
  return MaintenanceResultSchema(posts_deleted=posts_deleted, places_deleted=places_deleted)


@app.get("/api/tags", response_model=list[str])
def list_tags() -> list[str]:
  return list(TAGS)


@app.get("/api/places", response_model=list[CanonicalPlaceSchema])
def list_all_places(
  continent: str | None = Query(default=None),
  country: str | None = Query(default=None),
  state_province: str | None = Query(default=None),
  city: str | None = Query(default=None),
  tag: str | None = Query(default=None),
  roots_only: bool = Query(default=False),
  parent_place_id: str | None = Query(default=None),
) -> list[CanonicalPlaceSchema]:
  places = list_places(
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
def get_place(place_id: str) -> PlaceDetailSchema:
  place = load_place(place_id)
  if place is None:
    raise HTTPException(status_code=404, detail="Place not found")

  source_posts: list[SavedPostSchema] = []
  for source_post_id in place.source_post_ids:
    platform_value, _, post_id = source_post_id.partition(":")
    try:
      platform = Platform(platform_value)
    except ValueError:
      continue
    post = load_post(platform, post_id)
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
