from travelplanner.db import ingest_failures_repo, user_posts_repo
from travelplanner.flow.context import IngestContext
from travelplanner.flow.runner import PipelineResult, PipelineStepError
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.personas.link_ingest import IngestDeps, ingest_link, ingest_links
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


def _success_pipeline(ctx: IngestContext, *, place_ids: list[str] | None = None) -> PipelineResult[IngestContext]:
  ctx.post = _fake_instagram_post(ctx.post_url)
  ctx.place_ids = list(place_ids or ())
  return PipelineResult(context=ctx)


def _boom_pipeline(ctx: IngestContext) -> PipelineResult[IngestContext]:
  raise PipelineStepError("fetch_media", "API down")


def test_ingest_link_saved(dynamodb) -> None:
  deps = IngestDeps(
    run_pipeline=lambda ctx: _success_pipeline(ctx),
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )
  result = ingest_link("https://www.instagram.com/p/abc123/", user_id=USER, deps=deps)
  assert result.outcome == "saved"
  assert result.post_id == "instagram:abc123"
  assert user_posts_repo.user_has_post(USER, "instagram:abc123")


def test_ingest_link_linked_when_already_stored_for_other_user(dynamodb) -> None:
  existing = _fake_instagram_post("https://www.instagram.com/p/abc123/")
  save_post(existing)
  user_posts_repo.link_user_post("user-b", existing.post_id)

  def fail_pipeline(_: IngestContext) -> PipelineResult[IngestContext]:
    raise AssertionError("pipeline should not run when post is already stored")

  deps = IngestDeps(
    run_pipeline=fail_pipeline,
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )

  result = ingest_link("https://www.instagram.com/p/abc123/", user_id=USER, deps=deps)
  assert result.outcome == "linked"
  assert result.post_id == "instagram:abc123"
  assert user_posts_repo.user_has_post(USER, "instagram:abc123")


def test_ingest_link_skipped_when_already_in_library(dynamodb) -> None:
  existing = _fake_instagram_post("https://www.instagram.com/p/abc123/")
  save_post(existing)
  user_posts_repo.link_user_post(USER, existing.post_id)

  def fail_pipeline(_: IngestContext) -> PipelineResult[IngestContext]:
    raise AssertionError("pipeline should not run when post is already stored")

  deps = IngestDeps(
    run_pipeline=fail_pipeline,
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )

  result = ingest_link("https://www.instagram.com/p/abc123/", user_id=USER, deps=deps)
  assert result.outcome == "skipped"


def test_ingest_link_refresh(dynamodb) -> None:
  existing = _fake_instagram_post("https://www.instagram.com/p/abc123/")
  save_post(existing)

  deps = IngestDeps(
    run_pipeline=lambda ctx: _success_pipeline(ctx),
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )

  result = ingest_link("https://www.instagram.com/p/abc123/", user_id=USER, refresh=True, deps=deps)
  assert result.outcome == "saved"


def test_ingest_link_unsupported() -> None:
  result = ingest_link("https://example.com/unknown", user_id=USER)
  assert result.outcome == "unsupported"


def test_ingest_link_unrouted_platform() -> None:
  result = ingest_link("https://www.youtube.com/watch?v=dQw4w9WgXcQ", user_id=USER)
  assert result.outcome == "unsupported"


def test_ingest_link_error_isolation(dynamodb) -> None:
  def pipeline_or_fail(ctx: IngestContext) -> PipelineResult[IngestContext]:
    if "bad123" in ctx.post_url:
      raise PipelineStepError("fetch_media", "API down")
    return _success_pipeline(ctx)

  deps = IngestDeps(
    run_pipeline=pipeline_or_fail,
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )

  results = ingest_links(
    [
      "https://www.instagram.com/p/good123/",
      "https://www.instagram.com/p/bad123/",
    ],
    user_id=USER,
    deps=deps,
  )
  assert len(results) == 2
  assert results[0].outcome == "saved"
  assert results[1].outcome == "error"


def test_ingest_link_attaches_place_ids_from_pipeline(dynamodb) -> None:
  deps = IngestDeps(
    run_pipeline=lambda ctx: _success_pipeline(
      ctx,
      place_ids=["us-or-portland-multnomah-falls"],
    ),
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )

  result = ingest_link("https://www.instagram.com/p/withplace/", user_id=USER, deps=deps)
  assert result.outcome == "saved"

  saved = load_post(Platform.INSTAGRAM, "withplace")
  assert saved is not None
  assert saved.place_ids == ("us-or-portland-multnomah-falls",)


def test_ingest_link_pipeline_failure_returns_error(dynamodb) -> None:
  deps = IngestDeps(
    run_pipeline=_boom_pipeline,
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )

  result = ingest_link("https://www.instagram.com/p/noplace/", user_id=USER, deps=deps)
  assert result.outcome == "error"

  saved = load_post(Platform.INSTAGRAM, "noplace")
  assert saved is None


def test_ingest_link_persists_fetch_failure(dynamodb) -> None:
  deps = IngestDeps(
    run_pipeline=_boom_pipeline,
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )

  result = ingest_link("https://www.instagram.com/p/bad123/", user_id=USER, deps=deps)

  assert result.outcome == "error"
  failures = ingest_failures_repo.list_failures(user_id=USER)
  assert len(failures) == 1
  assert failures[0].stage == "fetch_media"
  assert failures[0].status == "error"
  assert failures[0].error_message == "API down"
  assert failures[0].post_id == "instagram:bad123"
  assert failures[0].attempts == 1


def test_ingest_link_persists_unsupported(dynamodb) -> None:
  result = ingest_link("https://example.com/unknown", user_id=USER)

  assert result.outcome == "unsupported"
  failures = ingest_failures_repo.list_failures()
  assert len(failures) == 1
  assert failures[0].status == "unsupported"
  assert failures[0].stage == "unsupported"


def test_ingest_link_persists_bad_post_id(dynamodb) -> None:
  result = ingest_link("https://www.instagram.com/", user_id=USER)

  assert result.outcome == "error"
  failures = ingest_failures_repo.list_failures(user_id=USER)
  assert len(failures) == 1
  assert failures[0].stage == "post_id"


def test_ingest_link_increments_attempts_on_repeated_failure(dynamodb) -> None:
  deps = IngestDeps(
    run_pipeline=_boom_pipeline,
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )
  url = "https://www.instagram.com/p/bad123/"

  ingest_link(url, user_id=USER, deps=deps)
  ingest_link(url, user_id=USER, deps=deps)

  failures = ingest_failures_repo.list_failures(user_id=USER)
  assert len(failures) == 1
  assert failures[0].attempts == 2


def test_ingest_link_clears_failure_on_success(dynamodb) -> None:
  url = "https://www.instagram.com/p/abc123/"
  fail_deps = IngestDeps(
    run_pipeline=_boom_pipeline,
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )
  ingest_link(url, user_id=USER, deps=fail_deps)
  assert len(ingest_failures_repo.list_failures(user_id=USER)) == 1

  ok_deps = IngestDeps(
    run_pipeline=lambda ctx: _success_pipeline(ctx),
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )
  result = ingest_link(url, user_id=USER, refresh=True, deps=ok_deps)

  assert result.outcome == "saved"
  assert ingest_failures_repo.list_failures(user_id=USER) == []


def test_ingest_link_uses_injected_deps(dynamodb) -> None:
  recorded: list[dict] = []
  cleared: list[dict] = []

  deps = IngestDeps(
    run_pipeline=lambda ctx: _success_pipeline(ctx),
    record_failure=lambda **kwargs: recorded.append(kwargs),
    clear_failure=lambda **kwargs: cleared.append(kwargs),
  )

  result = ingest_link("https://www.instagram.com/p/inj123/", user_id=USER, deps=deps)

  assert result.outcome == "saved"
  assert recorded == []
  assert len(cleared) == 1


def test_ingest_links_on_result_callback(dynamodb) -> None:
  deps = IngestDeps(
    run_pipeline=lambda ctx: _success_pipeline(ctx),
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )

  seen: list[str] = []

  ingest_links(
    [
      "https://www.instagram.com/p/one/",
      "https://www.instagram.com/p/two/",
    ],
    user_id=USER,
    on_result=lambda result: seen.append(result.post_url),
    deps=deps,
  )

  assert len(seen) == 2
