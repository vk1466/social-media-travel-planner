from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from travelplanner.db import jobs_repo

from server import jobs


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
  assert [link["status"] for link in job["links"]] == ["pending", "pending"]
  assert "ttl" in job

  jobs_repo.mark_fetching(job_id, "https://a.example/1")
  jobs_repo.update_link(
    job_id,
    post_url="https://a.example/1",
    status="saved",
    post_id="instagram:1",
  )
  jobs_repo.mark_done(job_id)

  schema = jobs.get_job_for_user(job_id, "user-a")
  assert schema is not None
  assert schema.status == "done"
  assert schema.links[0].status == "saved"
  assert schema.counts == type(schema.counts)(
    **Counter(link.status for link in schema.links)
  )
  assert jobs.get_job_for_user(job_id, "user-b") is None


def test_jobs_repo_concurrent_link_updates(dynamodb) -> None:
  urls = [f"https://a.example/{i}" for i in range(6)]
  job_id = jobs_repo.create_job(urls, user_id="user-a", refresh=False)

  def save_one(post_url: str) -> None:
    jobs_repo.mark_fetching(job_id, post_url)
    jobs_repo.update_link(
      job_id,
      post_url=post_url,
      status="saved",
      post_id=f"instagram:{post_url.rsplit('/', 1)[-1]}",
    )

  with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(save_one, urls))

  job = jobs_repo.get_job(job_id)
  assert job is not None
  assert [link["status"] for link in job["links"]] == ["saved"] * len(urls)
  assert all(link.get("post_id") for link in job["links"])
