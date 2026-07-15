from travelplanner.db import jobs_repo
from travelplanner.pipeline import IngestResult

from server.workers import finalize_job, ingest_one_link


def test_ingest_one_link_updates_job(monkeypatch, dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://www.instagram.com/p/w1/"],
    user_id="user-a",
    refresh=False,
  )

  monkeypatch.setattr(
    "server.workers.ingest_link",
    lambda post_url, *, user_id, refresh=False: IngestResult(
      post_url=post_url,
      status="saved",
      post_id="instagram:w1",
    ),
  )

  result = ingest_one_link(
    {
      "job_id": job_id,
      "post_url": "https://www.instagram.com/p/w1/",
      "user_id": "user-a",
      "refresh": False,
    }
  )
  assert result["status"] == "saved"

  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert job["links"][0]["status"] == "saved"
  assert job["links"][0]["post_id"] == "instagram:w1"


def test_ingest_one_link_records_errors(monkeypatch, dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://www.instagram.com/p/boom/"],
    user_id="user-a",
    refresh=False,
  )

  def boom(post_url: str, *, user_id: str, refresh: bool = False) -> IngestResult:
    raise RuntimeError("upstream failed")

  monkeypatch.setattr("server.workers.ingest_link", boom)

  result = ingest_one_link(
    {
      "job_id": job_id,
      "post_url": "https://www.instagram.com/p/boom/",
      "user_id": "user-a",
      "refresh": False,
    }
  )
  assert result["status"] == "error"

  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert job["links"][0]["status"] == "error"
  assert "upstream failed" in (job["links"][0].get("error_message") or "")


def test_ingest_one_link_auto_marks_visited(monkeypatch, dynamodb) -> None:
  from travelplanner.models import PlaceLocation, Platform, SavedPost
  from travelplanner.place_hints import PlaceMention
  from travelplanner.places import upsert_place
  from travelplanner.store import save_post
  from travelplanner.visits import visited_place_ids

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
      provider_place_id="falls-1",
    ),
    "instagram:w1",
  )
  post = SavedPost(
    post_id="instagram:w1",
    post_url="https://www.instagram.com/p/w1/",
    platform=Platform.INSTAGRAM,
    media_kind="image",
    caption="falls",
    fetched_at="2024-06-12T12:00:00Z",
    posted_at="2024-06-12T12:00:00Z",
    place_ids=(place_id,),
  )
  save_post(post)

  job_id = jobs_repo.create_job(
    ["https://www.instagram.com/p/w1/"],
    user_id="user-a",
    refresh=False,
    kind=jobs_repo.JOB_KIND_INSTAGRAM_PROFILE_IMPORT,
    mark_visited=True,
    username="traveler",
  )

  monkeypatch.setattr(
    "server.workers.ingest_link",
    lambda post_url, *, user_id, refresh=False: IngestResult(
      post_url=post_url,
      status="saved",
      post_id="instagram:w1",
    ),
  )

  result = ingest_one_link(
    {
      "job_id": job_id,
      "post_url": "https://www.instagram.com/p/w1/",
      "user_id": "user-a",
      "refresh": False,
      "mark_visited": True,
    }
  )
  assert result["status"] == "saved"
  assert place_id in visited_place_ids("user-a")


def test_finalize_job_marks_done(monkeypatch, dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://www.instagram.com/p/x/"],
    user_id="user-a",
    refresh=False,
  )
  called = {"link": False}

  def fake_link() -> None:
    called["link"] = True

  monkeypatch.setattr("server.workers.link_places", fake_link)

  out = finalize_job({"job_id": job_id})
  assert out["status"] == "done"
  assert called["link"] is True
  assert jobs_repo.get_job(job_id)["status"] == "done"
