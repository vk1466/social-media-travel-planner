from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.media.thumbnails import persist_avatar, persist_thumbnail

logger = logging.getLogger(__name__)


def persist_post_thumbnail(ctx: IngestContext) -> IngestContext:
  """Copy the CDN cover image and creator avatar into durable storage (Vercel Blob or S3)."""
  post = ctx.post
  if post is None:
    return ctx

  source = (post.thumbnail_url or "").strip()
  avatar_source = (post.author_avatar_url or "").strip()

  durable_thumb = persist_thumbnail(post.post_id, source) if source else None
  durable_avatar = (
    persist_avatar(post.author_handle or post.post_id, avatar_source)
    if avatar_source
    else None
  )

  new_thumb = durable_thumb or post.thumbnail_url
  new_avatar = durable_avatar or post.author_avatar_url

  if new_thumb != post.thumbnail_url or new_avatar != post.author_avatar_url:
    ctx.post = replace(post, thumbnail_url=new_thumb, author_avatar_url=new_avatar)
    logger.info(
      "persist_post_thumbnail post_id=%s persisted_thumb=%s persisted_avatar=%s",
      post.post_id,
      bool(durable_thumb),
      bool(durable_avatar),
    )

  return ctx


PERSIST_THUMBNAIL_STEP = Step(
  name="persist_thumbnail",
  run=persist_post_thumbnail,
  writes_data=True,
)
