"""City search for the For Travel app.

No user accounts yet: one shared library on the existing ingest pipeline.
The app sends X-For-Travel-Key. Reel count is CITY_REEL_LIMIT (default 20).
"""

from __future__ import annotations

import logging
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException

from travelplanner import settings
from travelplanner.clients.geocoder import geocode_normalized
from travelplanner.db import user_places_repo, user_settings_repo
from travelplanner.library import list_user_places, list_user_posts
from travelplanner.models import Place, SavedPost
from travelplanner.places.mention_details import compact_mention_details
from travelplanner.places.nearby import place_is_nearby, place_is_tourist_destination
from travelplanner.places import place_to_dict
from travelplanner.sources.instagram_search import search_city_reels
from travelplanner.store import post_to_dict

from server.ingest_runner import start_ingest_job
from server import jobs
from server.schemas import (
  ForTravelLibrarySchema,
  ForTravelReelSchema,
  ForTravelSearchRequest,
  ForTravelSearchResponse,
  JobSchema,
  PlaceSchema,
  SavedPostSchema,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/for-travel", tags=["for-travel"])


def for_travel_user(
  x_for_travel_key: Annotated[str | None, Header(alias="X-For-Travel-Key")] = None,
) -> str:
  expected = settings.for_travel_api_key()
  if expected:
    supplied = (x_for_travel_key or "").strip()
    if not supplied or not secrets.compare_digest(supplied, expected):
      raise HTTPException(status_code=401, detail="Invalid for-travel key")
    return settings.for_travel_user_id()
  if settings.auth_disabled():
    return settings.for_travel_user_id()
  raise HTTPException(status_code=401, detail="For Travel is not configured")


ForTravelUserId = Annotated[str, Depends(for_travel_user)]


def _place_to_schema(place: Place) -> PlaceSchema:
  data = place_to_dict(place)
  data["details"] = list(
    compact_mention_details(place.details, place_name=place.display_name)
  )
  return PlaceSchema(**data)


def _post_to_schema(post: SavedPost) -> SavedPostSchema:
  return SavedPostSchema(**post_to_dict(post))


def _places_near_search(user_id: str, places: list[Place]) -> list[Place]:
  """Drop places outside a day trip, and anything that is not a tourist destination."""
  anchor = user_settings_repo.get_city_search_anchor(user_id)
  radius_km = settings.city_nearby_km()
  kept: list[Place] = []
  for place in places:
    if not place_is_tourist_destination(place):
      logger.info(
        "for-travel drop non-destination user_id=%s place_id=%s name=%s category=%s",
        user_id,
        place.place_id,
        place.display_name,
        place.category,
      )
      user_places_repo.unlink_user_place(user_id, place.place_id)
      continue
    if anchor is not None:
      _query, latitude, longitude = anchor
      if not place_is_nearby(
        place,
        latitude=latitude,
        longitude=longitude,
        radius_km=radius_km,
      ):
        logger.info(
          "for-travel drop far place user_id=%s place_id=%s name=%s",
          user_id,
          place.place_id,
          place.display_name,
        )
        user_places_repo.unlink_user_place(user_id, place.place_id)
        continue
    kept.append(place)
  return kept


@router.post(
  "/searches",
  response_model=ForTravelSearchResponse,
  status_code=202,
)
def start_city_search(
  request: ForTravelSearchRequest,
  user_id: ForTravelUserId,
) -> ForTravelSearchResponse:
  query = request.query.strip()
  if not query:
    raise HTTPException(status_code=400, detail="Enter a city or place")

  located = geocode_normalized(query, fallback_name=query)
  if located is None:
    raise HTTPException(status_code=400, detail="Couldn't find that city on the map")
  user_settings_repo.set_city_search_anchor(
    user_id,
    query=query,
    latitude=located.latitude,
    longitude=located.longitude,
  )

  reel_limit = settings.city_reel_limit()
  try:
    reels = search_city_reels(query, limit=reel_limit)
  except ValueError as exc:
    raise HTTPException(status_code=400, detail=str(exc)) from exc
  except Exception as exc:
    logger.exception("for-travel search failed query=%s", query)
    raise HTTPException(
      status_code=502,
      detail=f"Instagram search failed: {exc}",
    ) from exc

  if not reels:
    raise HTTPException(
      status_code=404,
      detail="No Instagram reels found for that place.",
    )

  urls = [reel["post_url"] for reel in reels if reel.get("post_url")]
  job_id = jobs.enqueue_link_ingest(urls, user_id=user_id, refresh=False)
  to_start = jobs.reserve_runnable_links(job_id)
  if to_start:
    try:
      start_ingest_job(job_id, to_start, user_id=user_id, refresh=False)
    except Exception as exc:
      logger.exception("for-travel ingest start failed job_id=%s", job_id)
      raise HTTPException(
        status_code=502,
        detail=f"Could not start place extraction: {exc}",
      ) from exc

  return ForTravelSearchResponse(
    job_id=job_id,
    query=query,
    reel_limit=reel_limit,
    reels=[ForTravelReelSchema(**reel) for reel in reels],
  )


@router.get("/jobs/{job_id}", response_model=JobSchema)
def get_city_job(job_id: str, user_id: ForTravelUserId) -> JobSchema:
  job = jobs.get_job_for_user(job_id, user_id)
  if job is None:
    raise HTTPException(status_code=404, detail="Job not found")
  return job


@router.get("/library", response_model=ForTravelLibrarySchema)
def get_library(user_id: ForTravelUserId) -> ForTravelLibrarySchema:
  places = _places_near_search(user_id, list_user_places(user_id))
  posts = list_user_posts(user_id)
  return ForTravelLibrarySchema(
    places=[_place_to_schema(place) for place in places],
    posts=[_post_to_schema(post) for post in posts],
  )
