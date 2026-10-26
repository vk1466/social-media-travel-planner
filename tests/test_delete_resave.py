from dataclasses import replace

from travelplanner.db import ingest_failures_repo, user_posts_repo
from travelplanner.flow.context import IngestContext
from travelplanner.flow.runner import PipelineResult
from travelplanner.models import Platform, SavedPost, make_post_id
from travelplanner.personas.link_ingest import IngestDeps, ingest_link, unlink_post_from_user
from travelplanner.store import delete_post, load_post, save_post

USER = "test-user-resave"
POST_URL = "https://www.instagram.com/reel/CtestResave123/"
SHORTCODE = "CtestResave123"
POST_ID = make_post_id(Platform.INSTAGRAM, SHORTCODE)


def _fresh_post(post_url: str) -> SavedPost:
  return SavedPost(
    post_id=POST_ID,
    post_url=post_url,
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="Original caption from Instagram",
    title="Original Extracted Title",
    content_category="travel",
    fetched_at="2026-07-06T21:15:04Z",
  )


def test_delete_then_resave_does_not_restore_edited_metadata(dynamodb) -> None:
  """Deleting a post and re-saving the same URL must not restore old edited title/category."""
  deps = IngestDeps(
    run_pipeline=lambda ctx: PipelineResult(
      context=replace(ctx, post=_fresh_post(ctx.post_url), place_ids=[])
    ),
    record_failure=ingest_failures_repo.record_ingest_failure,
    clear_failure=ingest_failures_repo.clear_ingest_failure,
  )

  # 1. Initial save
  result = ingest_link(POST_URL, user_id=USER, deps=deps)
  assert result.outcome == "saved"
  assert result.post_id == POST_ID
  assert user_posts_repo.user_has_post(USER, POST_ID)

  initial_post = load_post(Platform.INSTAGRAM, SHORTCODE)
  assert initial_post is not None
  assert initial_post.title == "Original Extracted Title"
  assert initial_post.content_category == "travel"

  # 2. User edits title and category
  edited_post = replace(
    initial_post,
    title="User Customized Title That Should Be Forgotten",
    content_category="food",
  )
  save_post(edited_post)

  loaded_edited = load_post(Platform.INSTAGRAM, SHORTCODE)
  assert loaded_edited is not None
  assert loaded_edited.title == "User Customized Title That Should Be Forgotten"
  assert loaded_edited.content_category == "food"

  # 3. User deletes the post
  unlinked = unlink_post_from_user(USER, POST_ID)
  assert unlinked is True
  deleted = delete_post(Platform.INSTAGRAM, POST_ID)
  assert deleted is True

  # Verify it is deleted
  assert not user_posts_repo.user_has_post(USER, POST_ID)
  assert load_post(Platform.INSTAGRAM, SHORTCODE) is None

  # 4. Re-save the exact same URL
  resave_result = ingest_link(POST_URL, user_id=USER, deps=deps)
  assert resave_result.outcome == "saved"
  assert resave_result.post_id == POST_ID
  assert user_posts_repo.user_has_post(USER, POST_ID)

  # 5. Verify the re-saved post has fresh data, NOT the old edited title or category!
  freshly_saved_post = load_post(Platform.INSTAGRAM, SHORTCODE)
  assert freshly_saved_post is not None
  assert freshly_saved_post.title == "Original Extracted Title"
  assert freshly_saved_post.title != "User Customized Title That Should Be Forgotten"
  assert freshly_saved_post.content_category == "travel"
  assert freshly_saved_post.content_category != "food"
