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
