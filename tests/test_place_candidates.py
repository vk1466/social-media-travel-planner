from __future__ import annotations

from travelplanner.db import place_candidates_repo
from travelplanner.models import PlaceLocation, Platform, SavedPost
from travelplanner.place_hints import ExtractedPlace, PlaceMention, PlatformPlace
from travelplanner.places import load_all_places, load_place, process_post_places
from travelplanner.places.candidates import make_candidate_id, record_candidate, retry_place_candidates
from travelplanner.places.locate import LocateDebugResult
from travelplanner.store import load_post_by_id, save_post


def _sample_post(*, places=(), extracted_places=(), post_id: str = "instagram:post1") -> SavedPost:
  native_id = post_id.split(":", 1)[-1]
  return SavedPost(
    post_id=post_id if ":" in post_id else f"instagram:{post_id}",
    post_url=f"https://www.instagram.com/p/{native_id}/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="a trip",
    places=places,
    extracted_places=extracted_places,
  )


def _falls_location() -> PlaceLocation:
  return PlaceLocation(
    display_name="Multnomah Falls",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )


def test_make_candidate_id_is_stable() -> None:
  assert make_candidate_id("instagram:post1", "Multnomah Falls") == (
    "instagram-post1-multnomah-falls"
  )


def test_persists_unresolved_candidate(monkeypatch, dynamodb) -> None:
  post = _sample_post(places=(PlatformPlace(place_name="Nowhereville"),))
  monkeypatch.setattr(
    "travelplanner.places.pipeline.locate_mention_debug",
    lambda mention: LocateDebugResult(status="unresolved"),
  )

  place_ids = process_post_places(post)

  assert place_ids == ()
  assert load_all_places() == []
  candidates = place_candidates_repo.load_candidates_for_post(post.post_id)
  assert len(candidates) == 1
  assert candidates[0].status == "unresolved"
  assert candidates[0].place_name == "Nowhereville"
  assert candidates[0].hints.place_name == "Nowhereville"
  assert candidates[0].resolved_place_id is None


def test_persists_low_confidence_and_upserts_place(monkeypatch, dynamodb) -> None:
  post = _sample_post(
    extracted_places=(ExtractedPlace(place_name="Multnomah Falls", tags=("waterfall",)),),
  )
  location = _falls_location()
  monkeypatch.setattr(
    "travelplanner.places.pipeline.locate_mention_debug",
    lambda mention: LocateDebugResult(
      status="low_confidence",
      location=location,
      match_confidence=0.55,
    ),
  )

  place_ids = process_post_places(post)

  assert place_ids == ("us-oregon-portland-multnomah-falls",)
  candidates = place_candidates_repo.load_open_candidates(statuses=("low_confidence",))
  assert len(candidates) == 1
  assert candidates[0].resolved_place_id == place_ids[0]
  assert candidates[0].status == "low_confidence"


def test_resolved_clears_prior_candidate(monkeypatch, dynamodb) -> None:
  post = _sample_post(
    extracted_places=(ExtractedPlace(place_name="Multnomah Falls"),),
  )
  location = _falls_location()

  monkeypatch.setattr(
    "travelplanner.places.pipeline.locate_mention_debug",
    lambda mention: LocateDebugResult(status="unresolved"),
  )
  process_post_places(post)
  assert len(place_candidates_repo.load_open_candidates()) == 1

  monkeypatch.setattr(
    "travelplanner.places.pipeline.locate_mention_debug",
    lambda mention: LocateDebugResult(status="resolved", location=location),
  )
  place_ids = process_post_places(post)

  open_candidates = place_candidates_repo.load_open_candidates()
  assert open_candidates == []
  resolved = place_candidates_repo.load_candidate(
    make_candidate_id(post.post_id, "Multnomah Falls"),
  )
  assert resolved is not None
  assert resolved.status == "resolved"
  assert resolved.resolved_place_id == place_ids[0]


def test_retry_place_candidates_without_instagram_refetch(monkeypatch, dynamodb) -> None:
  post = _sample_post(
    extracted_places=(
      ExtractedPlace(
        place_name="Multnomah Falls",
        state_province="Oregon",
        country="USA",
      ),
    ),
  )
  save_post(post)

  record_candidate(
    source_post_id=post.post_id,
    mention=PlaceMention(
      place_name="Multnomah Falls",
      state_province="Oregon",
      country="USA",
    ),
    status="unresolved",
  )

  location = _falls_location()
  monkeypatch.setattr(
    "travelplanner.places.locate.locate_mention_debug",
    lambda mention: LocateDebugResult(status="resolved", location=location),
  )

  result = retry_place_candidates()

  assert result.attempted == 1
  assert result.resolved == 1
  assert result.still_open == 0
  assert result.place_ids == ("us-oregon-portland-multnomah-falls",)

  candidate = place_candidates_repo.load_candidate(
    make_candidate_id(post.post_id, "Multnomah Falls"),
  )
  assert candidate is not None
  assert candidate.status == "resolved"
  assert candidate.resolved_place_id == "us-oregon-portland-multnomah-falls"

  updated_post = load_post_by_id(post.post_id)
  assert updated_post is not None
  assert "us-oregon-portland-multnomah-falls" in updated_post.place_ids
  assert load_place("us-oregon-portland-multnomah-falls") is not None
