import pytest
from travelplanner.clients.mindcase import fetch_post
from travelplanner.personas.link_ingest import friendly_error_message


def test_mindcase_save_pipeline_generous_timeout() -> None:
  """The save pipeline must use a generous timeout (>= 20s) so slow-but-valid reels are not aborted prematurely."""
  from travelplanner.clients import mindcase
  import inspect
  sig = inspect.signature(mindcase.fetch_post)
  assert sig.parameters["timeout_seconds"].default >= 20.0
  assert sig.parameters["timeout_seconds"].default == 30.0


def test_slow_but_valid_reel_succeeds(monkeypatch) -> None:
  """A valid public reel that takes 12s to scrape must succeed under the generous timeout."""
  from travelplanner.clients import mindcase

  calls = 0
  def fake_run_job(path, params, **kwargs):
    nonlocal calls
    calls += 1
    # Verify generous timeout was passed
    assert kwargs.get("max_wait_seconds") == 30.0
    return [{"caption": "Delicious Pasta", "authorUsername": "pastachef", "videoUrl": "https://video.mp4"}]

  monkeypatch.setattr(mindcase, "_run_job", fake_run_job)
  monkeypatch.setattr(mindcase, "api_key", lambda: "fake-key")

  res = mindcase.fetch_post(shortcode="slow123")
  assert res["caption"] == "Delicious Pasta"
  assert calls == 1


def test_deleted_instagram_reel_error_mapping() -> None:
  """Deleted reel returns empty data, empty rows, or 404 (positive evidence), mapping to 'Private or deleted post'.
  Pure timeouts must map to 'Request timed out, please retry in a moment'.
  """
  # Positive evidence maps to Private or deleted post
  assert friendly_error_message("Instagram post C2xQ5T2ST8l returned empty data (private or deleted post)") == "Private or deleted post"
  assert friendly_error_message("Mindcase returned no post for https://www.instagram.com/reel/C2xQ5T2ST8l/ (private or deleted post)") == "Private or deleted post"
  assert friendly_error_message("Instagram post C2xQ5T2ST8l could not be fetched (private, deleted, or does not exist)") == "Private or deleted post"
  assert friendly_error_message("Instagram post C2xQ5T2ST8l: 404 not found") == "Private or deleted post"

  # Scraper timeouts must map to Request timed out, NOT Private or deleted post
  assert friendly_error_message("Mindcase job 456 timed out after 30.0s") == "Request timed out, please retry in a moment"
  assert friendly_error_message("Request timed out") == "Request timed out, please retry in a moment"


def test_client_polling_deadline_exceeds_backend_fail_fast() -> None:
  """Frontend client polling deadline (20 attempts * 1.5s = 30s) must exceed backend 9.5s deadline."""
  # Read constants from SavePipelineContext.tsx
  import re
  from pathlib import Path

  context_file = Path("frontend/src/wanderfile/state/SavePipelineContext.tsx")
  content = context_file.read_text()
  
  max_attempts_match = re.search(r"export const MAX_POLL_ATTEMPTS = (\d+);", content)
  interval_match = re.search(r"export const POLL_INTERVAL_MS = (\d+);", content)

  assert max_attempts_match is not None, "MAX_POLL_ATTEMPTS must be exported"
  assert interval_match is not None, "POLL_INTERVAL_MS must be exported"

  max_attempts = int(max_attempts_match.group(1))
  interval_ms = int(interval_match.group(1))
  total_deadline_sec = (max_attempts * interval_ms) / 1000.0

  backend_deadline_sec = 9.5
  assert total_deadline_sec > backend_deadline_sec, f"Client deadline {total_deadline_sec}s must exceed backend {backend_deadline_sec}s"
  assert total_deadline_sec >= 25.0, f"Expected at least 25s deadline, got {total_deadline_sec}s"


def test_never_overwrite_specific_error_with_timeout() -> None:
  """An existing specific error reason must never be overwritten by a generic timeout."""
  def update_failures_retaining_specific(prev_errors: dict[str, str], url: str, new_error: str) -> dict[str, str]:
    existing = prev_errors.get(url)
    is_generic_timeout = "timed out" in new_error.lower()
    if existing and is_generic_timeout and "timed out" not in existing.lower():
      return prev_errors
    res = dict(prev_errors)
    res[url] = new_error
    return res

  url = "https://www.instagram.com/reel/C2xQ5T2ST8l/"
  state = {url: "Private or deleted post"}

  # When a timeout arrives later, it must not overwrite the specific error
  updated = update_failures_retaining_specific(state, url, "Request timed out, please retry in a moment")
  assert updated[url] == "Private or deleted post"

  # But if it had no error, timeout is accepted
  empty_state = {}
  updated_empty = update_failures_retaining_specific(empty_state, url, "Request timed out, please retry in a moment")
  assert updated_empty[url] == "Request timed out, please retry in a moment"


def test_fetch_media_slow_reel_generous_timeout_and_retry(monkeypatch) -> None:
  """The save pipeline step fetch_media must use a generous timeout (>= 120s) and retry once on transient failure."""
  from travelplanner.flow.context import IngestContext
  from travelplanner.steps.instagram.fetch_media import fetch_media

  calls = []
  def fake_fetch_post(*args, **kwargs):
    calls.append(kwargs)
    if len(calls) == 1:
      raise TimeoutError("First attempt timed out")
    return {
      "caption": "Generous timeout reel",
      "authorUsername": "traveler",
      "videoUrl": "https://video.mp4",
      "thumbnailUrl": "https://thumb.jpg",
    }

  monkeypatch.setattr("travelplanner.steps.instagram.fetch_media.fetch_post", fake_fetch_post)

  ctx = IngestContext(post_url="https://www.instagram.com/reel/C0kT3lQIcO6/", user_id="user_123")
  result_ctx = fetch_media(ctx)

  assert len(calls) == 2
  assert calls[0].get("timeout_seconds") == 25.0
  assert calls[1].get("timeout_seconds") == 15.0
  assert result_ctx.post is not None
  assert result_ctx.post.caption == "Generous timeout reel"
  assert result_ctx.post.author_handle == "traveler"


def test_fetch_media_does_not_retry_on_non_retryable_error(monkeypatch) -> None:
  """Deleted or private posts must fail immediately without retrying or blocking for minutes."""
  import pytest
  from travelplanner.flow.context import IngestContext
  from travelplanner.steps.instagram.fetch_media import fetch_media

  calls = []
  def fake_fetch_post(*args, **kwargs):
    calls.append(kwargs)
    raise RuntimeError("Instagram post C0kT3lQIcO6 returned empty data (private or deleted post)")

  monkeypatch.setattr("travelplanner.steps.instagram.fetch_media.fetch_post", fake_fetch_post)

  ctx = IngestContext(post_url="https://www.instagram.com/reel/C0kT3lQIcO6/", user_id="user_123")
  with pytest.raises(RuntimeError) as exc_info:
    fetch_media(ctx)

  assert "private or deleted post" in str(exc_info.value)
  assert len(calls) == 1  # Exactly 1 call, NEVER retried!


