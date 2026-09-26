from types import SimpleNamespace

from fastapi.testclient import TestClient

from server.app import app
from travelplanner.clients import mindcase
from travelplanner.db import places_repo, user_places_repo, user_settings_repo
from travelplanner.models import Place, PlaceLocation


def _lisbon(monkeypatch) -> None:
  monkeypatch.setattr(
    "server.for_travel.geocode_normalized",
    lambda query, **kwargs: SimpleNamespace(
      latitude=38.7223,
      longitude=-9.1393,
      display_name="Lisbon, Portugal",
    ),
  )


def test_search_reels_sends_keyword_query(monkeypatch) -> None:
  monkeypatch.setenv("MINDCASE_API_KEY", "mk_live_test")
  seen: dict = {}

  def fake_request(method: str, path: str, body: dict | None = None) -> dict:
    seen["body"] = body
    return {
      "status": "completed",
      "data": [{"postUrl": "https://www.instagram.com/reel/abc/"}],
    }

  monkeypatch.setattr(mindcase, "_request", fake_request)
  rows = mindcase.search_reels("Lisbon", limit=20)
  assert rows[0]["postUrl"].endswith("/reel/abc/")
  assert seen["body"] == {"params": {"query": "Lisbon", "maxPages": 2}}


def test_city_search_starts_ingest(dynamodb, monkeypatch) -> None:
  started: dict = {}

  def fake_search(query: str, *, limit: int):
    assert query == "Lisbon"
    assert limit == 20
    return [
      {
        "post_url": "https://www.instagram.com/reel/one/",
        "author": "lisbonwalks",
        "caption": "Alfama at night",
        "thumbnail_url": None,
      }
    ]

  def fake_start(job_id: str, post_urls: list[str], *, user_id: str, refresh: bool) -> str:
    started["job_id"] = job_id
    started["post_urls"] = post_urls
    started["user_id"] = user_id
    return "arn:aws:states:us-west-2:123:execution:test:job"

  monkeypatch.setattr("server.for_travel.search_city_reels", fake_search)
  monkeypatch.setattr("server.for_travel.start_ingest_job", fake_start)
  _lisbon(monkeypatch)

  client = TestClient(app)
  response = client.post("/api/for-travel/searches", json={"query": "Lisbon"})
  assert response.status_code == 202
  body = response.json()
  assert body["reel_limit"] == 20
  assert body["reels"][0]["post_url"].endswith("/reel/one/")
  assert started["post_urls"] == ["https://www.instagram.com/reel/one/"]
  assert started["user_id"] == "for-travel-planning"
  assert started["job_id"] == body["job_id"]


def test_city_search_requires_key_when_configured(dynamodb, monkeypatch) -> None:
  monkeypatch.setenv("FOR_TRAVEL_API_KEY", "secret-key")
  _lisbon(monkeypatch)
  monkeypatch.setattr("server.for_travel.search_city_reels", lambda query, *, limit: [])
  client = TestClient(app)
  denied = client.post("/api/for-travel/searches", json={"query": "Lisbon"})
  assert denied.status_code == 401
  allowed = client.post(
    "/api/for-travel/searches",
    json={"query": "Lisbon"},
    headers={"X-For-Travel-Key": "secret-key"},
  )
  assert allowed.status_code == 404


def test_library_drops_places_beyond_a_day_trip(dynamodb) -> None:
  user_id = "for-travel-planning"
  user_settings_repo.set_city_search_anchor(
    user_id,
    query="Lisbon",
    latitude=38.7223,
    longitude=-9.1393,
  )
  near = Place(
    place_id="sintra",
    display_name="Sintra",
    location=PlaceLocation(display_name="Sintra", latitude=38.8029, longitude=-9.3817),
  )
  far = Place(
    place_id="porto",
    display_name="Porto",
    location=PlaceLocation(display_name="Porto", latitude=41.1579, longitude=-8.6291),
  )
  places_repo.save_place(near)
  places_repo.save_place(far)
  user_places_repo.link_user_place(user_id, near.place_id)
  user_places_repo.link_user_place(user_id, far.place_id)

  client = TestClient(app)
  response = client.get("/api/for-travel/library")
  assert response.status_code == 200
  names = [place["display_name"] for place in response.json()["places"]]
  assert names == ["Sintra"]
  assert set(user_places_repo.list_user_place_ids(user_id)) == {"sintra"}
