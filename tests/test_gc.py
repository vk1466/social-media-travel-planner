from travelplanner.db.gc import garbage_collect_orphaned_posts
from travelplanner.db import user_posts_repo
from travelplanner.models import Platform, SavedPost
from travelplanner.store import has_post, save_post


def test_garbage_collect_orphaned_posts(dynamodb) -> None:
  orphan = SavedPost(
    post_id="instagram:orphan",
    post_url="https://www.instagram.com/p/orphan/",
    platform=Platform.INSTAGRAM,
    media_kind="image",
    caption="orphan",
  )
  linked = SavedPost(
    post_id="instagram:linked",
    post_url="https://www.instagram.com/p/linked/",
    platform=Platform.INSTAGRAM,
    media_kind="image",
    caption="linked",
  )
  save_post(orphan)
  save_post(linked)
  user_posts_repo.link_user_post("user-a", linked.post_id)

  deleted = garbage_collect_orphaned_posts()
  assert deleted == 1
  assert has_post(Platform.INSTAGRAM, "orphan") is False
  assert has_post(Platform.INSTAGRAM, "linked") is True
