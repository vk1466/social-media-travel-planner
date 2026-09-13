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


def test_list_jobs_for_user_is_newest_first_and_hydrates_legacy(dynamodb) -> None:
  from travelplanner.db.serialize import to_dynamo
  from travelplanner.db.tables import get_table

  table = get_table("Jobs")
  for job_id, user_id, created_at in (
    ("older", "user-a", "2026-01-01T00:00:00Z"),
    ("newer", "user-a", "2026-01-02T00:00:00Z"),
    ("other-user", "user-b", "2026-01-03T00:00:00Z"),
  ):
    table.put_item(
      Item=to_dynamo(
        {
          "job_id": job_id,
          "user_id": user_id,
          "status": "done",
          "refresh": False,
          "links": [{"post_url": f"https://example.com/{job_id}", "status": "saved"}],
          "created_at": created_at,
          "ttl": 9999999999,
        }
      )
    )

  listed = jobs_repo.list_jobs_for_user("user-a", limit=1)
  assert [job["job_id"] for job in listed] == ["newer"]
  assert listed[0]["items"][0]["item_ref"] == "https://example.com/newer"

  schemas = jobs.list_jobs_for_user("user-a")
  assert [job.job_id for job in schemas] == ["newer", "older"]
  assert schemas[0].created_at == "2026-01-02T00:00:00Z"


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


def test_append_pending_urls_and_remove(dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://a.example/1"],
    user_id="user-a",
    refresh=False,
  )
  added = jobs_repo.append_pending_urls(
    job_id,
    ["https://a.example/1", "https://a.example/2"],
  )
  assert added == ["https://a.example/1", "https://a.example/2"]
  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert _item_refs(job) == ["https://a.example/1", "https://a.example/2"]

  jobs_repo.remove_pending_item(job_id, "https://a.example/2")
  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert _item_refs(job) == ["https://a.example/1"]

  jobs_repo.mark_fetching(job_id, "https://a.example/1")
  try:
    jobs_repo.remove_pending_item(job_id, "https://a.example/1")
    raise AssertionError("expected ValueError")
  except ValueError:
    pass


def test_append_rejected_when_job_done(dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://a.example/1"],
    user_id="user-a",
    refresh=False,
  )
  jobs_repo.mark_done(job_id)
  try:
    jobs_repo.append_pending_urls(job_id, ["https://a.example/2"])
    raise AssertionError("expected JobNotRunningError")
  except jobs_repo.JobNotRunningError:
    pass


def test_try_mark_done_waits_for_pending(dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://a.example/1", "https://a.example/2"],
    user_id="user-a",
    refresh=False,
  )
  jobs_repo.update_item(job_id, "https://a.example/1", status="saved", post_id="instagram:1")
  assert jobs_repo.try_mark_done(job_id) is False
  assert jobs_repo.get_job(job_id)["status"] == "running"

  jobs_repo.update_item(job_id, "https://a.example/2", status="saved", post_id="instagram:2")
  assert jobs_repo.try_mark_done(job_id) is True
  assert jobs_repo.get_job(job_id)["status"] == "done"


def test_reserve_runnable_urls_honors_default_concurrency(dynamodb) -> None:
  job_id = jobs_repo.create_job(
    ["https://a.example/1", "https://a.example/2", "https://a.example/3"],
    user_id="user-a",
    refresh=False,
  )
  reserved = jobs_repo.reserve_runnable_urls(job_id, concurrency=1)
  assert reserved == ["https://a.example/1"]
  job = jobs_repo.get_job(job_id)
  assert [item["status"] for item in job["items"]] == ["fetching", "pending", "pending"]

  assert jobs_repo.reserve_runnable_urls(job_id, concurrency=1) == []
  claimed = jobs_repo.claim_pending_item(job_id, "https://a.example/2")
  assert claimed is False
  assert jobs_repo.get_job(job_id)["items"][1]["status"] == "pending"


def test_reserve_runnable_urls_uses_account_concurrency(dynamodb) -> None:
  from travelplanner.db import user_settings_repo

  user_settings_repo.set_ingest_concurrency("user-a", 2)
  job_id = jobs_repo.create_job(
    ["https://a.example/1", "https://a.example/2", "https://a.example/3"],
    user_id="user-a",
    refresh=False,
  )
  from server import jobs as job_helpers

  reserved = job_helpers.reserve_runnable_links(job_id)
  assert reserved == ["https://a.example/1", "https://a.example/2"]
  assert [item["status"] for item in jobs_repo.get_job(job_id)["items"]] == [
    "fetching",
    "fetching",
    "pending",
  ]
