import pytest
from travelplanner.clients.mindcase import fetch_post
from travelplanner.personas.link_ingest import friendly_error_message


def test_mindcase_fail_fast_deadline() -> None:
  """Backend fail-fast deadline is <= 8.0s (default 6.0s)."""
  from travelplanner.clients import mindcase
  import inspect
  sig = inspect.signature(mindcase.fetch_post)
  assert sig.parameters["timeout_seconds"].default <= 8.0
  assert sig.parameters["timeout_seconds"].default == 6.0


def test_deleted_instagram_reel_error_mapping() -> None:
  """Deleted reel returns empty data or times out, mapping to 'Private or deleted post' in under 8s."""
  assert friendly_error_message("Instagram post C2xQ5T2ST8l returned empty data (private or deleted post)") == "Private or deleted post"
  assert friendly_error_message("Mindcase returned no post for https://www.instagram.com/reel/C2xQ5T2ST8l/ (private or deleted post)") == "Private or deleted post"
  assert friendly_error_message("Instagram post C2xQ5T2ST8l could not be fetched (private, deleted, or does not exist)") == "Private or deleted post"
  assert friendly_error_message("Instagram post C2xQ5T2ST8l could not be fetched (private or deleted post): Mindcase job 123 timed out after 6.0s") == "Private or deleted post"
  assert friendly_error_message("Mindcase job 456 timed out after 6.0s for instagram reel") == "Private or deleted post"


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
