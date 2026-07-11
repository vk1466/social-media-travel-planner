"""Start an ingest job via local background tasks or Step Functions."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import boto3

from travelplanner import settings

from server import jobs
from server.workers import finalize_job, ingest_one_link

if TYPE_CHECKING:
  from fastapi import BackgroundTasks


def run_local_ingest_job(
  job_id: str,
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool,
) -> None:
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


def start_step_functions_execution(
  job_id: str,
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool,
) -> str:
  state_machine_arn = settings.state_machine_arn()
  if not state_machine_arn:
    raise RuntimeError("STATE_MACHINE_ARN is required when INGEST_MODE=stepfunctions")

  payload = {
    "job_id": job_id,
    "user_id": user_id,
    "refresh": refresh,
    "links": [{"post_url": post_url} for post_url in post_urls],
  }
  client = boto3.client("stepfunctions", region_name=settings.dynamodb_region())
  response = client.start_execution(
    stateMachineArn=state_machine_arn,
    name=job_id,
    input=json.dumps(payload),
  )
  execution_arn = response["executionArn"]
  jobs.set_execution_arn(job_id, execution_arn)
  return execution_arn


def start_ingest_job(
  job_id: str,
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool,
  background_tasks: BackgroundTasks | None = None,
) -> None:
  if settings.ingest_mode() == "stepfunctions":
    start_step_functions_execution(
      job_id,
      post_urls,
      user_id=user_id,
      refresh=refresh,
    )
    return

  if background_tasks is None:
    raise RuntimeError("background_tasks required when INGEST_MODE=local")
  background_tasks.add_task(
    run_local_ingest_job,
    job_id,
    post_urls,
    user_id=user_id,
    refresh=refresh,
  )
