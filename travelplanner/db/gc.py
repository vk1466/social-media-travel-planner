"""Optional garbage collection for shared posts with no user links."""

from __future__ import annotations

from travelplanner.db import user_posts_repo
from travelplanner.models import Platform, parse_post_id
from travelplanner.store import delete_post, load_all_posts


def garbage_collect_orphaned_posts() -> int:
  """Delete shared Posts that no UserPosts row references. Returns count deleted."""
  deleted = 0
  for post in load_all_posts():
    if user_posts_repo.count_user_links_for_post(post.post_id) > 0:
      continue
    try:
      platform, _ = parse_post_id(post.post_id)
    except ValueError:
      platform = post.platform
    if delete_post(platform, post.post_id, unlink_places=True):
      deleted += 1
  return deleted
