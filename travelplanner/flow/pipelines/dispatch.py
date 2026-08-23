from __future__ import annotations

import logging

from travelplanner.content_categories import (
  CLOSE_PIPELINE_MOVIE,
  CLOSE_PIPELINE_PLACE,
  close_pipeline_for_category,
)
from travelplanner.flow.context import IngestContext, TimelineContext
from travelplanner.flow.pipelines.instagram import (
  INSTAGRAM_HEAD_STEPS,
  INSTAGRAM_TAIL_BY_RESOURCE_TYPE,
  MOVIE_CLOSE_STEPS,
  PLACE_CLOSE_STEPS,
)
from travelplanner.flow.pipelines.timeline import TIMELINE_VISIT_STEPS
from travelplanner.flow.runner import PipelineResult, PipelineStepError, run_pipeline
from travelplanner.steps.classify_content import CLASSIFY_CONTENT_STEP

logger = logging.getLogger(__name__)


def _instagram_tail_steps(resource_type: str | None) -> tuple:
  if not resource_type:
    return ()
  return INSTAGRAM_TAIL_BY_RESOURCE_TYPE.get(resource_type, ())


def close_steps_for_category(category: str | None) -> tuple[str, tuple]:
  """Return (pipeline_name, steps) for the category's close pipeline."""
  pipeline = close_pipeline_for_category(category)
  if pipeline == CLOSE_PIPELINE_MOVIE:
    return "instagram_movie_close", MOVIE_CLOSE_STEPS
  if pipeline == CLOSE_PIPELINE_PLACE:
    return "instagram_place_close", PLACE_CLOSE_STEPS
  return "instagram_close_skipped", ()


def run_instagram_pipeline(ctx: IngestContext) -> PipelineResult[IngestContext]:
  """Instagram ingest: head, resource-type tail, classify, then category close."""
  try:
    result = run_pipeline(ctx, INSTAGRAM_HEAD_STEPS, pipeline_name="instagram_head")
    ctx = result.context
    tail = _instagram_tail_steps(ctx.resource_type)
    if tail:
      tail_result = run_pipeline(ctx, tail, pipeline_name="instagram_tail")
      ctx = tail_result.context
      steps_completed = result.steps_completed + tail_result.steps_completed
    else:
      steps_completed = result.steps_completed
      logger.info(
        "instagram_tail skipped resource_type=%s",
        ctx.resource_type,
      )
    classify_result = run_pipeline(
      ctx,
      (CLASSIFY_CONTENT_STEP,),
      pipeline_name="instagram_classify",
    )
    ctx = classify_result.context
    steps_completed += classify_result.steps_completed
    category = ctx.post.content_category if ctx.post is not None else None
    close_name, close_steps = close_steps_for_category(category)
    if not close_steps:
      logger.info("instagram_close skipped category=%s", category)
      return PipelineResult(context=ctx, steps_completed=steps_completed)
    close_result = run_pipeline(ctx, close_steps, pipeline_name=close_name)
    return PipelineResult(
      context=close_result.context,
      steps_completed=steps_completed + close_result.steps_completed,
    )
  except PipelineStepError as exc:
    ctx.error_stage = exc.step_name
    ctx.error_message = str(exc)
    return PipelineResult(
      context=ctx,
      failed_step=exc.step_name,
      error_message=str(exc),
    )


def run_timeline_pipeline(ctx: TimelineContext) -> PipelineResult[TimelineContext]:
  """Locate a Timeline cluster and upsert a library place when trusted."""
  try:
    return run_pipeline(ctx, TIMELINE_VISIT_STEPS, pipeline_name="timeline_visit")
  except PipelineStepError as exc:
    ctx.error_stage = exc.step_name
    ctx.error_message = str(exc)
    return PipelineResult(
      context=ctx,
      failed_step=exc.step_name,
      error_message=str(exc),
    )
