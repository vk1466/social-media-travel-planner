"""SQS enqueue for async place-facts enrichment. One message per place_id."""

from __future__ import annotations

import json
import logging
from typing import Any, Iterable

import boto3

from travelplanner import settings
from travelplanner.places.facts.types import utc_now_iso

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1


def enqueue_place_facts(
  place_ids: Iterable[str],
  *,
  trigger: str,
  force: bool = False,
  source_post_id: str | None = None,
) -> int:
  """Put one message per unique place_id. No-op when the queue URL is unset."""
  queue_url = settings.place_facts_queue_url()
  if not queue_url:
    logger.info("place_facts queue unset; skip enqueue trigger=%s", trigger)
    return 0

  unique: list[str] = []
  seen: set[str] = set()
  for place_id in place_ids:
    cleaned = (place_id or "").strip()
    if not cleaned or cleaned in seen:
      continue
    seen.add(cleaned)
    unique.append(cleaned)
  if not unique:
    return 0

  client = boto3.client("sqs", region_name=settings.dynamodb_region())
  sent = 0
  for place_id in unique:
    body = {
      "schema_version": SCHEMA_VERSION,
      "place_id": place_id,
      "trigger": trigger,
      "force": bool(force),
      "source_post_id": source_post_id,
      "enqueued_at": utc_now_iso(),
    }
    client.send_message(QueueUrl=queue_url, MessageBody=json.dumps(body))
    sent += 1
  logger.info(
    "place_facts enqueued count=%d trigger=%s source_post_id=%s",
    sent,
    trigger,
    source_post_id,
  )
  return sent


def parse_place_facts_message(body: str | dict[str, Any]) -> dict[str, Any] | None:
  """Return a validated message dict, or None when the payload is unusable."""
  payload: Any = body
  if isinstance(body, str):
    try:
      payload = json.loads(body)
    except json.JSONDecodeError:
      logger.warning("place_facts message is not JSON")
      return None
  if not isinstance(payload, dict):
    return None
  place_id = str(payload.get("place_id") or "").strip()
  if not place_id:
    logger.warning("place_facts message missing place_id")
    return None
  try:
    schema_version = int(payload.get("schema_version") or SCHEMA_VERSION)
  except (TypeError, ValueError):
    schema_version = SCHEMA_VERSION
  trigger = str(payload.get("trigger") or "unknown").strip() or "unknown"
  return {
    "schema_version": schema_version,
    "place_id": place_id,
    "trigger": trigger,
    "force": bool(payload.get("force")),
    "source_post_id": payload.get("source_post_id") or None,
    "enqueued_at": payload.get("enqueued_at"),
  }
