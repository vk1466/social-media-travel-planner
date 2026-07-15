from travelplanner.db import ingest_failures_repo, user_posts_repo
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.pipeline import IngestDeps, ingest_link, ingest_links
from travelplanner.sources import PLATFORM_FETCHERS
from travelplanner.store import load_post, save_post

USER = "user-a"


def _fake_instagram_post(post_url: str) -> SavedPost:
  shortcode = post_url.rstrip("/").split("/")[-1]
  return SavedPost(
    post_id=make_post_id(Platform.INSTAGRAM, shortcode),
    post_url=post_url,
    platform=Platform.INSTAGRAM,
    media_kind="image",
    caption="test caption",
    fetched_at="2026-07-06T21:15:04Z",
  )


def test_ingest_link_saved(monkeypatch, dynamodb) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)

  result = ingest_link("https://www.instagram.com/p/abc123/", user_id=USER)
  assert result.status == "saved"
  assert result.post_id == "instagram:abc123"
  assert user_posts_repo.user_has_post(USER, "instagram:abc123")


def test_ingest_link_linked_when_already_stored_for_other_user(monkeypatch, dynamodb) -> None:
  existing = _fake_instagram_post("https://www.instagram.com/p/abc123/")
  save_post(existing)
  user_posts_repo.link_user_post("user-b", existing.post_id)

  def fail_fetch(_: str) -> SavedPost:
    raise AssertionError("fetch should not run when post is already stored")

  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, fail_fetch)

  result = ingest_link("https://www.instagram.com/p/abc123/", user_id=USER)
  assert result.status == "linked"
  assert result.post_id == "instagram:abc123"
  assert user_posts_repo.user_has_post(USER, "instagram:abc123")


def test_ingest_link_skipped_when_already_in_library(monkeypatch, dynamodb) -> None:
  existing = _fake_instagram_post("https://www.instagram.com/p/abc123/")
  save_post(existing)
  user_posts_repo.link_user_post(USER, existing.post_id)

  def fail_fetch(_: str) -> SavedPost:
    raise AssertionError("fetch should not run when post is already stored")

  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, fail_fetch)

  result = ingest_link("https://www.instagram.com/p/abc123/", user_id=USER)
  assert result.status == "skipped"


def test_ingest_link_refresh(monkeypatch, dynamodb) -> None:
  existing = _fake_instagram_post("https://www.instagram.com/p/abc123/")
  save_post(existing)

  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)

  result = ingest_link("https://www.instagram.com/p/abc123/", user_id=USER, refresh=True)
  assert result.status == "saved"


def test_ingest_link_unsupported() -> None:
  result = ingest_link("https://example.com/unknown", user_id=USER)
  assert result.status == "unsupported"


def test_ingest_link_unrouted_platform() -> None:
  result = ingest_link("https://www.youtube.com/watch?v=dQw4w9WgXcQ", user_id=USER)
  assert result.status == "unsupported"


def test_ingest_link_error_isolation(monkeypatch, dynamodb) -> None:
  def fetch_or_fail(post_url: str) -> SavedPost:
    if "bad123" in post_url:
      raise RuntimeError("API down")
    return _fake_instagram_post(post_url)

  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, fetch_or_fail)

  results = ingest_links(
    [
      "https://www.instagram.com/p/good123/",
      "https://www.instagram.com/p/bad123/",
    ],
    user_id=USER,
  )
  assert len(results) == 2
  assert results[0].status == "saved"
  assert results[1].status == "error"


def test_ingest_link_attaches_place_ids_from_place_processing(monkeypatch, dynamodb) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)
  monkeypatch.setattr(
    "travelplanner.pipeline.process_post_places",
    lambda post: ("us-or-portland-multnomah-falls",),
  )

  result = ingest_link("https://www.instagram.com/p/withplace/", user_id=USER)
  assert result.status == "saved"

  saved = load_post(Platform.INSTAGRAM, "withplace")
  assert saved is not None
  assert saved.place_ids == ("us-or-portland-multnomah-falls",)


def test_ingest_link_saves_post_even_when_place_processing_fails(monkeypatch, dynamodb) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)

  def fail_places(post: SavedPost):
    raise RuntimeError("geocoder unavailable")

  monkeypatch.setattr("travelplanner.pipeline.process_post_places", fail_places)

  result = ingest_link("https://www.instagram.com/p/noplace/", user_id=USER)
  assert result.status == "saved"

  saved = load_post(Platform.INSTAGRAM, "noplace")
  assert saved is not None
  assert saved.place_ids == ()


def _boom_fetch(_: str) -> SavedPost:
  raise RuntimeError("API down")


def test_ingest_link_persists_fetch_failure(monkeypatch, dynamodb) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _boom_fetch)

  result = ingest_link("https://www.instagram.com/p/bad123/", user_id=USER)

  assert result.status == "error"
  failures = ingest_failures_repo.list_failures(user_id=USER)
  assert len(failures) == 1
  assert failures[0].stage == "fetch"
  assert failures[0].status == "error"
  assert failures[0].error_message == "API down"
  assert failures[0].post_id == "instagram:bad123"
  assert failures[0].attempts == 1


def test_ingest_link_persists_unsupported(dynamodb) -> None:
  result = ingest_link("https://example.com/unknown", user_id=USER)

  assert result.status == "unsupported"
  failures = ingest_failures_repo.list_failures()
  assert len(failures) == 1
  assert failures[0].status == "unsupported"
  assert failures[0].stage == "unsupported"


def test_ingest_link_persists_bad_post_id(dynamodb) -> None:
  result = ingest_link("https://www.instagram.com/", user_id=USER)

  assert result.status == "error"
  failures = ingest_failures_repo.list_failures(user_id=USER)
  assert len(failures) == 1
  assert failures[0].stage == "post_id"


def test_ingest_link_increments_attempts_on_repeated_failure(monkeypatch, dynamodb) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _boom_fetch)
  url = "https://www.instagram.com/p/bad123/"

  ingest_link(url, user_id=USER)
  ingest_link(url, user_id=USER)

  failures = ingest_failures_repo.list_failures(user_id=USER)
  assert len(failures) == 1
  assert failures[0].attempts == 2


def test_ingest_link_clears_failure_on_success(monkeypatch, dynamodb) -> None:
  url = "https://www.instagram.com/p/abc123/"
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _boom_fetch)
  ingest_link(url, user_id=USER)
  assert len(ingest_failures_repo.list_failures(user_id=USER)) == 1

  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)
  result = ingest_link(url, user_id=USER, refresh=True)

  assert result.status == "saved"
  assert ingest_failures_repo.list_failures(user_id=USER) == []


def test_ingest_link_persists_place_processing_failure(monkeypatch, dynamodb) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)

  def fail_places(post: SavedPost):
    raise RuntimeError("geocoder unavailable")

  monkeypatch.setattr("travelplanner.pipeline.process_post_places", fail_places)

  result = ingest_link("https://www.instagram.com/p/noplace/", user_id=USER)

  assert result.status == "saved"
  failures = ingest_failures_repo.list_failures(user_id=USER)
  assert len(failures) == 1
  assert failures[0].stage == "place_processing"
  assert failures[0].post_id == "instagram:noplace"


def test_ingest_link_uses_injected_deps(dynamodb) -> None:
  recorded: list[dict] = []
  cleared: list[dict] = []

  deps = IngestDeps(
    fetchers={Platform.INSTAGRAM: _fake_instagram_post},
    process_places=lambda post: (),
    record_failure=lambda **kwargs: recorded.append(kwargs),
    clear_failure=lambda **kwargs: cleared.append(kwargs),
  )

  result = ingest_link("https://www.instagram.com/p/inj123/", user_id=USER, deps=deps)

  assert result.status == "saved"
  assert recorded == []
  assert len(cleared) == 1


def test_ingest_links_on_result_callback(monkeypatch, dynamodb) -> None:
  monkeypatch.setitem(PLATFORM_FETCHERS, Platform.INSTAGRAM, _fake_instagram_post)

  seen: list[str] = []

  ingest_links(
    [
      "https://www.instagram.com/p/one/",
      "https://www.instagram.com/p/two/",
    ],
    user_id=USER,
    on_result=lambda result: seen.append(result.post_url),
  )

  assert len(seen) == 2
