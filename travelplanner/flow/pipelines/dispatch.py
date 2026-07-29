from __future__ import annotations

import logging

from travelplanner.flow.context import IngestContext, TimelineContext
from travelplanner.flow.pipelines.instagram import (
  INSTAGRAM_HEAD_STEPS,
  INSTAGRAM_TAIL_BY_RESOURCE_TYPE,
  SHARED_CLOSE_STEPS,
)
from travelplanner.flow.pipelines.timeline import TIMELINE_VISIT_STEPS
from travelplanner.flow.runner import PipelineResult, PipelineStepError, run_pipeline

logger = logging.getLogger(__name__)


def _instagram_tail_steps(resource_type: str | None) -> tuple:
  if not resource_type:
    return ()
  return INSTAGRAM_TAIL_BY_RESOURCE_TYPE.get(resource_type, ())


def run_instagram_pipeline(ctx: IngestContext) -> PipelineResult[IngestContext]:
  """Two-phase Instagram ingest: head, resource-type tail, shared close."""
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
    close_result = run_pipeline(ctx, SHARED_CLOSE_STEPS, pipeline_name="instagram_close")
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
