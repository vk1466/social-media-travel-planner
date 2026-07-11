"""Start an ingest job via Step Functions."""

from __future__ import annotations

import json

import boto3

from travelplanner import settings

from server import jobs


def start_ingest_job(
  job_id: str,
  post_urls: list[str],
  *,
  user_id: str,
  refresh: bool,
) -> str:
  state_machine_arn = settings.state_machine_arn()
  if not state_machine_arn:
    raise RuntimeError("STATE_MACHINE_ARN is required to start ingest")

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
