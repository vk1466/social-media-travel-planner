from __future__ import annotations

import logging
from dataclasses import replace

from travelplanner.flow.context import IngestContext
from travelplanner.flow.step import Step
from travelplanner.media.thumbnails import persist_thumbnail

logger = logging.getLogger(__name__)


def persist_post_thumbnail(ctx: IngestContext) -> IngestContext:
  """Copy the CDN cover image into S3; keep CDN URL if persistence is unavailable."""
  post = ctx.post
  if post is None:
    return ctx
  source = (post.thumbnail_url or "").strip()
  if not source:
    return ctx

  durable = persist_thumbnail(post.post_id, source)
  if not durable or durable == source:
    return ctx

  ctx.post = replace(post, thumbnail_url=durable)
  logger.info("persist_post_thumbnail post_id=%s", post.post_id)
  return ctx


PERSIST_THUMBNAIL_STEP = Step(
  name="persist_thumbnail",
  run=persist_post_thumbnail,
  writes_data=True,
)
