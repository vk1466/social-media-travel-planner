from fastapi.testclient import TestClient

from travelplanner import places
from travelplanner.db import user_places_repo, user_posts_repo
from travelplanner.models import PlaceLocation, Platform, SavedPost
from travelplanner.place_hints import PlaceMention
from travelplanner.pipeline import IngestResult
from travelplanner.store import save_post

from server.app import app
from server.workers import finalize_job, ingest_one_link

HEADERS = {"X-User-Id": "user-a"}


def _run_ingest_inline(
  job_id: str,
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool,
) -> str:
  """Stand in for Step Functions in API tests."""
  for post_url in post_urls:
    ingest_one_link(
      {
        "job_id": job_id,
        "post_url": post_url,
        "user_id": user_id,
        "refresh": refresh,
      }
    )
  finalize_job({"job_id": job_id})
  return f"arn:aws:states:us-east-1:123:execution:test:{job_id}"


def test_ingest_requires_links(dynamodb) -> None:
  client = TestClient(app)
  response = client.post("/api/ingest", json={"links": []}, headers=HEADERS)
  assert response.status_code == 400
  assert response.json()["detail"] == "At least one link is required"


def test_ingest_job_completes_and_lists_posts(monkeypatch, dynamodb) -> None:
  def fake_ingest(post_url: str, *, user_id: str, refresh: bool = False) -> IngestResult:
    shortcode = post_url.rstrip("/").split("/")[-1]
    post = SavedPost(
      post_id=f"instagram:{shortcode}",
      post_url=post_url,
      platform=Platform.INSTAGRAM,
      media_kind="image",
      caption="saved via api",
      fetched_at="2026-07-06T21:15:04Z",
    )
    save_post(post)
    user_posts_repo.link_user_post(user_id, post.post_id)
    return IngestResult(post_url=post_url, status="saved", post_id=post.post_id)

  monkeypatch.setattr("server.workers.ingest_link", fake_ingest)
  monkeypatch.setattr("server.workers.link_places", lambda: None)
  monkeypatch.setattr("server.app.start_ingest_job", _run_ingest_inline)

  client = TestClient(app)
  start = client.post(
    "/api/ingest",
    json={"links": ["https://www.instagram.com/p/api123/"]},
    headers=HEADERS,
  )
  assert start.status_code == 202
  job_id = start.json()["job_id"]

  job = client.get(f"/api/jobs/{job_id}", headers=HEADERS)
  assert job.status_code == 200
  body = job.json()
  assert body["status"] == "done"
  assert body["links"][0]["status"] == "saved"

  posts = client.get("/api/posts", headers=HEADERS)
  assert posts.status_code == 200
  assert len(posts.json()) == 1
  assert posts.json()[0]["post_id"] == "instagram:api123"


def test_get_job_scoped_to_owner(monkeypatch, dynamodb) -> None:
  monkeypatch.setattr(
    "server.workers.ingest_link",
    lambda post_url, *, user_id, refresh=False: IngestResult(
      post_url=post_url, status="skipped"
    ),
  )
  monkeypatch.setattr("server.workers.link_places", lambda: None)
  monkeypatch.setattr("server.app.start_ingest_job", _run_ingest_inline)

  client = TestClient(app)
  start = client.post(
    "/api/ingest",
    json={"links": ["https://www.instagram.com/p/owned/"]},
    headers=HEADERS,
  )
  job_id = start.json()["job_id"]

  assert client.get(f"/api/jobs/{job_id}", headers=HEADERS).status_code == 200
  assert (
    client.get(f"/api/jobs/{job_id}", headers={"X-User-Id": "user-b"}).status_code
    == 404
  )


def test_get_job_not_found(dynamodb) -> None:
  client = TestClient(app)
  response = client.get("/api/jobs/does-not-exist", headers=HEADERS)
  assert response.status_code == 404


def test_list_and_get_place(dynamodb) -> None:
  post = SavedPost(
    post_id="instagram:reelA",
    post_url="https://www.instagram.com/reel/reelA/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="waterfall day",
    fetched_at="2026-07-06T21:15:04Z",
  )
  save_post(post)
  user_posts_repo.link_user_post("user-a", post.post_id)

  location = PlaceLocation(
    display_name="Multnomah Falls",
    continent="North America",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )
  mention = PlaceMention(place_name="Multnomah Falls", tags=("waterfall",))
  place_id = places.upsert_place(mention, location, "instagram:reelA")
  user_places_repo.link_user_place("user-a", place_id, source="from_post")

  client = TestClient(app)

  listed = client.get("/api/places", headers=HEADERS)
  assert listed.status_code == 200
  assert [place["place_id"] for place in listed.json()] == [place_id]

  filtered = client.get("/api/places", params={"tag": "waterfall"}, headers=HEADERS)
  assert len(filtered.json()) == 1
  empty = client.get("/api/places", params={"tag": "beach"}, headers=HEADERS)
  assert empty.json() == []

  roots = client.get("/api/places", params={"roots_only": True}, headers=HEADERS)
  assert roots.status_code == 200
  assert len(roots.json()) == 1

  detail = client.get(f"/api/places/{place_id}", headers=HEADERS)
  assert detail.status_code == 200
  body = detail.json()
  assert body["place"]["display_name"] == "Multnomah Falls"
  assert body["source_posts"][0]["post_id"] == "instagram:reelA"
  assert body["children"] == []
  assert body["parent"] is None


def test_get_place_not_found(dynamodb) -> None:
  client = TestClient(app)
  response = client.get("/api/places/does-not-exist", headers=HEADERS)
  assert response.status_code == 404


def test_list_tags(dynamodb) -> None:
  client = TestClient(app)
  response = client.get("/api/tags", headers=HEADERS)
  assert response.status_code == 200
  assert "waterfall" in response.json()


def test_cleanup_data_endpoint(monkeypatch, dynamodb) -> None:
  monkeypatch.setattr("server.app.cleanup_all_data", lambda: (2, 5, 3))

  client = TestClient(app)
  response = client.post("/api/data/cleanup", headers=HEADERS)
  assert response.status_code == 200
  assert response.json() == {"posts_deleted": 2, "places_deleted": 5, "visits_deleted": 3}


def test_create_and_list_visits(dynamodb) -> None:
  location = PlaceLocation(
    display_name="Multnomah Falls",
    continent="North America",
    country="United States",
    country_code="US",
    state_province="Oregon",
    city="Portland",
    latitude=45.5762,
    longitude=-122.1158,
  )
  mention = PlaceMention(place_name="Multnomah Falls", tags=("waterfall",))
  place_id = places.upsert_place(mention, location, "instagram:reelA")

  client = TestClient(app)

  created = client.post(
    "/api/visits",
    json={
      "place_id": place_id,
      "visited_from": "2024-06-12",
      "visited_to": "2024-06-14",
      "notes": "Day hike",
    },
    headers=HEADERS,
  )
  assert created.status_code == 201
  body = created.json()
  assert body["visit"]["place_id"] == place_id
  assert body["visit"]["visited_from"] == "2024-06-12"
  assert body["place"]["display_name"] == "Multnomah Falls"
  visit_id = body["visit"]["visit_id"]

  listed = client.get("/api/visits", headers=HEADERS)
  assert listed.status_code == 200
  assert len(listed.json()) == 1

  ids = client.get("/api/visits/place-ids", headers=HEADERS)
  assert ids.status_code == 200
  assert ids.json() == [place_id]

  missing = client.post("/api/visits", json={"visited_from": "2024-01-01"}, headers=HEADERS)
  assert missing.status_code == 400

  deleted = client.delete(f"/api/visits/{visit_id}", headers=HEADERS)
  assert deleted.status_code == 204
  assert client.get("/api/visits", headers=HEADERS).json() == []


def test_reprocess_places_endpoint(monkeypatch, dynamodb) -> None:
  called = {"reprocess": False}

  def fake_reprocess() -> None:
    called["reprocess"] = True

  monkeypatch.setattr("server.app.reprocess_all_places", fake_reprocess)

  client = TestClient(app)
  response = client.post("/api/places/reprocess", headers=HEADERS)
  assert response.status_code == 200
  assert response.json() == {
    "posts_deleted": None,
    "places_deleted": None,
    "visits_deleted": None,
  }
  assert called["reprocess"] is True


def test_users_see_only_their_posts(dynamodb) -> None:
  post = SavedPost(
    post_id="instagram:shared",
    post_url="https://www.instagram.com/p/shared/",
    platform=Platform.INSTAGRAM,
    media_kind="image",
    caption="shared",
    fetched_at="2026-07-06T21:15:04Z",
  )
  save_post(post)
  user_posts_repo.link_user_post("user-a", post.post_id)

  client = TestClient(app)
  assert len(client.get("/api/posts", headers={"X-User-Id": "user-a"}).json()) == 1
  assert client.get("/api/posts", headers={"X-User-Id": "user-b"}).json() == []


def test_admin_me_reports_admin(dynamodb) -> None:
  client = TestClient(app)
  response = client.get("/api/admin/me", headers=HEADERS)
  assert response.status_code == 200
  body = response.json()
  assert body["is_admin"] is True
  assert "place_pipeline" not in body


def test_admin_locate_read_only(monkeypatch, dynamodb) -> None:
  from types import SimpleNamespace

  location = PlaceLocation(
    display_name="Misery Ridge Trail",
    latitude=44.3705,
    longitude=-121.141,
  )
  monkeypatch.setattr(
    "travelplanner.places.debug.locate_mention_debug",
    lambda mention: SimpleNamespace(
      status="resolved",
      location=location,
      match_confidence=0.95,
      category="attraction",
      provider="nominatim",
      queries_tried=("q3",),
      notes=("picked trail",),
    ),
  )

  client = TestClient(app)
  response = client.post(
    "/api/admin/places/locate",
    headers=HEADERS,
    json={
      "place_name": "Misery Ridge",
      "parent_place_name": "Smith Rock State Park",
      "state_province": "Oregon",
      "country": "USA",
    },
  )
  assert response.status_code == 200
  body = response.json()
  assert body["result"]["status"] == "resolved"
  assert body["result"]["match_confidence"] == 0.95
  assert places.load_all_places() == []


def test_admin_list_place_candidates(dynamodb) -> None:
  from travelplanner.places.candidates import record_candidate

  record_candidate(
    source_post_id="instagram:abc",
    mention=PlaceMention(
      place_name="Nowhereville",
      state_province="Oregon",
      country="USA",
    ),
    status="unresolved",
  )
  record_candidate(
    source_post_id="instagram:abc",
    mention=PlaceMention(place_name="Maybe Falls", country="USA"),
    status="low_confidence",
    resolved_place_id="us-maybe-falls",
  )

  client = TestClient(app)
  unresolved = client.get("/api/admin/places/candidates", headers=HEADERS)
  assert unresolved.status_code == 200
  body = unresolved.json()
  assert body["count"] == 1
  assert body["candidates"][0]["place_name"] == "Nowhereville"
  assert body["candidates"][0]["status"] == "unresolved"
  assert body["candidates"][0]["hints"]["state_province"] == "Oregon"

  open_list = client.get("/api/admin/places/candidates?status=open", headers=HEADERS)
  assert open_list.status_code == 200
  assert open_list.json()["count"] == 2

  filtered = client.get(
    "/api/admin/places/candidates?source_post_id=instagram:abc&status=low_confidence",
    headers=HEADERS,
  )
  assert filtered.status_code == 200
  assert filtered.json()["candidates"][0]["resolved_place_id"] == "us-maybe-falls"
