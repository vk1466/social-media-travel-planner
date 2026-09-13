from __future__ import annotations

import json

from travelplanner.places.facts.queue import enqueue_place_facts, parse_place_facts_message


class _FakeSqs:
  def __init__(self) -> None:
    self.bodies: list[str] = []

  def send_message(self, *, QueueUrl: str, MessageBody: str) -> None:
    assert QueueUrl == "https://sqs.example/place-facts"
    self.bodies.append(MessageBody)


def test_parse_place_facts_message_requires_place_id() -> None:
  assert parse_place_facts_message("{}") is None
  parsed = parse_place_facts_message(
    '{"place_id":"us-oregon-crater-lake","trigger":"ingest","force":false}'
  )
  assert parsed is not None
  assert parsed["place_id"] == "us-oregon-crater-lake"
  assert parsed["trigger"] == "ingest"
  assert parsed["force"] is False


def test_enqueue_place_facts_sends_one_message_per_unique_id(monkeypatch) -> None:
  fake = _FakeSqs()
  monkeypatch.setattr(
    "travelplanner.places.facts.queue.settings.place_facts_queue_url",
    lambda: "https://sqs.example/place-facts",
  )
  monkeypatch.setattr(
    "travelplanner.places.facts.queue.boto3.client",
    lambda service, region_name=None: fake,
  )
  sent = enqueue_place_facts(
    ["a", "b", "a", ""],
    trigger="ingest",
    force=False,
    source_post_id="instagram:abc",
  )
  assert sent == 2
  place_ids = [json.loads(body)["place_id"] for body in fake.bodies]
  assert place_ids == ["a", "b"]
  first = json.loads(fake.bodies[0])
  assert first["schema_version"] == 1
  assert first["trigger"] == "ingest"
  assert first["source_post_id"] == "instagram:abc"
  assert first["force"] is False


def test_enqueue_place_facts_skips_when_queue_unset(monkeypatch) -> None:
  monkeypatch.setattr(
    "travelplanner.places.facts.queue.settings.place_facts_queue_url",
    lambda: None,
  )
  assert enqueue_place_facts(["a"], trigger="ingest") == 0
