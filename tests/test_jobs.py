from travelplanner.db import jobs_repo

from server import jobs


def _item_refs(job: dict) -> list[str]:
  return [item["item_ref"] for item in job["items"]]


def test_jobs_repo_create_and_progress(dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://a.example/1", "https://a.example/2"],
    user_id="user-a",
    refresh=True,
  )
  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert job["user_id"] == "user-a"
  assert job["refresh"] is True
  assert job["status"] == "running"
  assert job["kind"] == jobs_repo.JOB_KIND_LINK_INGEST
  assert "mark_visited" not in job
  assert [item["status"] for item in job["items"]] == ["pending", "pending"]
  assert "ttl" in job

  jobs_repo.mark_fetching(job_id, "https://a.example/1")
  jobs_repo.update_item(
    job_id,
    "https://a.example/1",
    status="saved",
    post_id="instagram:1",
  )
  jobs_repo.mark_done(job_id)

  schema = jobs.get_job_for_user(job_id, "user-a")
  assert schema is not None
  assert schema.status == "done"
  assert schema.items[0].status == "saved"
  assert schema.links[0].status == "saved"
  assert schema.counts.saved == 1
  assert jobs.get_job_for_user(job_id, "user-b") is None


def test_get_active_job_for_user(dynamodb) -> None:
  done_id = jobs_repo.create_job(
    ["https://a.example/done"],
    user_id="user-a",
    refresh=False,
    kind=jobs_repo.JOB_KIND_INSTAGRAM_PROFILE_IMPORT,
    username="traveler",
  )
  jobs_repo.mark_done(done_id)

  running_id = jobs_repo.create_job(
    ["https://a.example/run"],
    user_id="user-a",
    refresh=False,
    kind=jobs_repo.JOB_KIND_INSTAGRAM_PROFILE_IMPORT,
    username="traveler",
  )

  active = jobs_repo.get_active_job_for_user(
    "user-a",
    kind=jobs_repo.JOB_KIND_INSTAGRAM_PROFILE_IMPORT,
  )
  assert active is not None
  assert active["job_id"] == running_id
  assert active["username"] == "traveler"

  schema = jobs.get_active_job_for_user(
    "user-a",
    kind=jobs_repo.JOB_KIND_INSTAGRAM_PROFILE_IMPORT,
  )
  assert schema is not None
  assert schema.job_id == running_id
  assert schema.kind == jobs_repo.JOB_KIND_INSTAGRAM_PROFILE_IMPORT


def test_jobs_repo_concurrent_item_updates(dynamodb) -> None:
  urls = [f"https://a.example/{i}" for i in range(6)]
  job_id = jobs_repo.create_job(urls, user_id="user-a", refresh=False)

  def save_one(post_url: str) -> None:
    jobs_repo.mark_fetching(job_id, post_url)
    jobs_repo.update_item(
      job_id,
      post_url,
      status="saved",
      post_id=f"instagram:{post_url.rsplit('/', 1)[-1]}",
    )

  from concurrent.futures import ThreadPoolExecutor

  with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(save_one, urls))

  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert [item["status"] for item in job["items"]] == ["saved"] * len(urls)
  assert all(item.get("post_id") for item in job["items"])


def test_jobs_repo_reads_legacy_links(dynamodb) -> None:
  from travelplanner.db.serialize import to_dynamo
  from travelplanner.db.tables import get_table

  job_id = "legacy-job"
  get_table("Jobs").put_item(
    Item=to_dynamo(
      {
        "job_id": job_id,
        "user_id": "user-a",
        "status": "running",
        "refresh": False,
        "kind": jobs_repo.JOB_KIND_LINK_INGEST,
        "links": [{"post_url": "https://legacy/1", "status": "pending"}],
        "version": 0,
        "created_at": "2026-01-01T00:00:00Z",
        "ttl": 9999999999,
      }
    )
  )
  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert _item_refs(job) == ["https://legacy/1"]
