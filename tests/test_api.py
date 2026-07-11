from fastapi.testclient import TestClient

from travelplanner import places, store, visits
from travelplanner.models import PlaceLocation, Platform, SavedPost
from travelplanner.place_hints import PlaceMention
from travelplanner.pipeline import IngestResult
from travelplanner.store import save_post

from server.app import app


def test_ingest_requires_links() -> None:
  client = TestClient(app)
  response = client.post("/api/ingest", json={"links": []})
  assert response.status_code == 400
  assert response.json()["detail"] == "At least one link is required"


def test_ingest_job_completes_and_lists_posts(monkeypatch, tmp_path) -> None:
  def fake_ingest(post_url: str, *, refresh: bool = False) -> IngestResult:
    shortcode = post_url.rstrip("/").split("/")[-1]
    post = SavedPost(
      post_id=f"instagram:{shortcode}",
      post_url=post_url,
      platform=Platform.INSTAGRAM,
      media_kind="image",
      caption="saved via api",
      fetched_at="2026-07-06T21:15:04Z",
    )
    save_post(post, data_dir=tmp_path)
    return IngestResult(post_url=post_url, status="saved", post_id=post.post_id)

  monkeypatch.setattr("server.app.ingest_link", fake_ingest)
  monkeypatch.setattr(
    "server.app.load_all_posts",
    lambda platform=None: store.load_all_posts(platform=platform, data_dir=tmp_path),
  )
  monkeypatch.setattr(
    "server.app.load_post",
    lambda platform, post_id: store.load_post(platform, post_id, data_dir=tmp_path),
  )
  monkeypatch.setattr(
    "server.app.delete_post",
    lambda platform, post_id: store.delete_post(
      platform, post_id, data_dir=tmp_path, places_data_dir=tmp_path / "places"
    ),
  )

  client = TestClient(app)
  start = client.post(
    "/api/ingest",
    json={"links": ["https://www.instagram.com/p/api123/"]},
  )
  assert start.status_code == 202
  job_id = start.json()["job_id"]

  job = client.get(f"/api/jobs/{job_id}")
  assert job.status_code == 200
  body = job.json()
  assert body["status"] == "done"
  assert body["links"][0]["status"] == "saved"

  posts = client.get("/api/posts")
  assert posts.status_code == 200
  assert len(posts.json()) == 1
  assert posts.json()[0]["post_id"] == "instagram:api123"


def test_get_job_not_found() -> None:
  client = TestClient(app)
  response = client.get("/api/jobs/does-not-exist")
  assert response.status_code == 404


def test_list_and_get_place(monkeypatch, tmp_path) -> None:
  post = SavedPost(
    post_id="instagram:reelA",
    post_url="https://www.instagram.com/reel/reelA/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="waterfall day",
    fetched_at="2026-07-06T21:15:04Z",
  )
  save_post(post, data_dir=tmp_path / "posts")

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
  place_id = places.upsert_place(mention, location, "instagram:reelA", data_dir=tmp_path / "places")

  monkeypatch.setattr(
    "server.app.list_places",
    lambda **kwargs: places.list_places(data_dir=tmp_path / "places", **kwargs),
  )
  monkeypatch.setattr(
    "server.app.load_place",
    lambda place_id: places.load_place(place_id, data_dir=tmp_path / "places"),
  )
  monkeypatch.setattr(
    "server.app.load_post",
    lambda platform, post_id: store.load_post(platform, post_id, data_dir=tmp_path / "posts"),
  )

  client = TestClient(app)

  listed = client.get("/api/places")
  assert listed.status_code == 200
  assert [place["place_id"] for place in listed.json()] == [place_id]

  filtered = client.get("/api/places", params={"tag": "waterfall"})
  assert len(filtered.json()) == 1
  empty = client.get("/api/places", params={"tag": "beach"})
  assert empty.json() == []

  roots = client.get("/api/places", params={"roots_only": True})
  assert roots.status_code == 200
  assert len(roots.json()) == 1

  detail = client.get(f"/api/places/{place_id}")
  assert detail.status_code == 200
  body = detail.json()
  assert body["place"]["display_name"] == "Multnomah Falls"
  assert body["source_posts"][0]["post_id"] == "instagram:reelA"
  assert body["children"] == []
  assert body["parent"] is None


def test_get_place_not_found(monkeypatch, tmp_path) -> None:
  monkeypatch.setattr(
    "server.app.load_place",
    lambda place_id: places.load_place(place_id, data_dir=tmp_path),
  )
  client = TestClient(app)
  response = client.get("/api/places/does-not-exist")
  assert response.status_code == 404


def test_list_tags() -> None:
  client = TestClient(app)
  response = client.get("/api/tags")
  assert response.status_code == 200
  assert "waterfall" in response.json()


def test_cleanup_data_endpoint(monkeypatch) -> None:
  monkeypatch.setattr("server.app.cleanup_all_data", lambda: (2, 5, 3))

  client = TestClient(app)
  response = client.post("/api/data/cleanup")
  assert response.status_code == 200
  assert response.json() == {"posts_deleted": 2, "places_deleted": 5, "visits_deleted": 3}


def test_create_and_list_visits(monkeypatch, tmp_path) -> None:
  places_dir = tmp_path / "places"
  visits_dir = tmp_path / "visits"

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
  place_id = places.upsert_place(mention, location, "instagram:reelA", data_dir=places_dir)

  def fake_create_visit(**kwargs):
    return visits.create_visit(
      **kwargs,
      visits_data_dir=visits_dir,
      places_data_dir=places_dir,
    )

  monkeypatch.setattr("server.app.create_visit", fake_create_visit)
  monkeypatch.setattr(
    "server.app.list_visits",
    lambda: visits.list_visits(data_dir=visits_dir),
  )
  monkeypatch.setattr(
    "server.app.load_place",
    lambda place_id: places.load_place(place_id, data_dir=places_dir),
  )
  monkeypatch.setattr(
    "server.app.load_visit",
    lambda visit_id: visits.load_visit(visit_id, data_dir=visits_dir),
  )
  monkeypatch.setattr(
    "server.app.delete_visit",
    lambda visit_id: visits.delete_visit(visit_id, data_dir=visits_dir),
  )
  monkeypatch.setattr(
    "server.app.visited_place_ids",
    lambda: visits.visited_place_ids(data_dir=visits_dir),
  )

  client = TestClient(app)

  created = client.post(
    "/api/visits",
    json={
      "place_id": place_id,
      "visited_from": "2024-06-12",
      "visited_to": "2024-06-14",
      "notes": "Day hike",
    },
  )
  assert created.status_code == 201
  body = created.json()
  assert body["visit"]["place_id"] == place_id
  assert body["visit"]["visited_from"] == "2024-06-12"
  assert body["place"]["display_name"] == "Multnomah Falls"
  visit_id = body["visit"]["visit_id"]

  listed = client.get("/api/visits")
  assert listed.status_code == 200
  assert len(listed.json()) == 1

  ids = client.get("/api/visits/place-ids")
  assert ids.status_code == 200
  assert ids.json() == [place_id]

  missing = client.post("/api/visits", json={"visited_from": "2024-01-01"})
  assert missing.status_code == 400

  deleted = client.delete(f"/api/visits/{visit_id}")
  assert deleted.status_code == 204
  assert client.get("/api/visits").json() == []


def test_reprocess_places_endpoint(monkeypatch) -> None:
  called = {"reprocess": False}

  def fake_reprocess() -> None:
    called["reprocess"] = True

  monkeypatch.setattr("server.app.reprocess_all_places", fake_reprocess)

  client = TestClient(app)
  response = client.post("/api/places/reprocess")
  assert response.status_code == 200
  assert response.json() == {
    "posts_deleted": None,
    "places_deleted": None,
    "visits_deleted": None,
  }
  assert called["reprocess"] is True

