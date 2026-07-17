"""Start a Timeline import job via Step Functions."""

from __future__ import annotations

import json

import boto3

from travelplanner import settings
from travelplanner.db import jobs_repo

from server import jobs


def start_timeline_job(
  job_id: str,
  *,
  user_id: str,
  s3_key: str,
  source_format: str,
  total_places: int,
  batch_size: int,
  home_latitude: float | None = None,
  home_longitude: float | None = None,
) -> str:
  state_machine_arn = settings.timeline_state_machine_arn()
  if not state_machine_arn:
    raise RuntimeError("TIMELINE_STATE_MACHINE_ARN is required to start Timeline import")

  batch_count = (total_places + batch_size - 1) // batch_size
  batches = [
    {
      "batch_index": index,
      "batch_start": index * batch_size,
      "batch_count": min(batch_size, total_places - index * batch_size),
      "post_url": f"timeline-batch:{index}",
    }
    for index in range(batch_count)
  ]
  payload: dict = {
    "job_id": job_id,
    "user_id": user_id,
    "s3_key": s3_key,
    "source_format": source_format,
    "total_places": total_places,
    "batch_size": batch_size,
    "batches": batches,
    "home_latitude": home_latitude,
    "home_longitude": home_longitude,
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


def create_and_start_timeline_job(
  *,
  user_id: str,
  s3_key: str,
  source_format: str,
  total_places: int,
  batch_size: int | None = None,
  home_latitude: float | None = None,
  home_longitude: float | None = None,
) -> str:
  size = batch_size if batch_size is not None else settings.timeline_batch_size()
  job_id = jobs_repo.create_timeline_job(
    user_id=user_id,
    s3_key=s3_key,
    source_format=source_format,
    total_places=total_places,
    batch_size=size,
    home_latitude=home_latitude,
    home_longitude=home_longitude,
  )
  start_timeline_job(
    job_id,
    user_id=user_id,
    s3_key=s3_key,
    source_format=source_format,
    total_places=total_places,
    batch_size=size,
    home_latitude=home_latitude,
    home_longitude=home_longitude,
  )
  return job_id
