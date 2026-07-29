from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Generic, Sequence, TypeVar

from travelplanner.flow.step import ContextT, Step

logger = logging.getLogger(__name__)


class StepConfigError(ValueError):
  """Invalid step metadata discovered at registration or pipeline build."""


class PipelineStepError(RuntimeError):
  """A pipeline step failed after retries were exhausted."""

  def __init__(self, step_name: str, message: str, *, cause: Exception | None = None) -> None:
    self.step_name = step_name
    super().__init__(message)
    self.__cause__ = cause


@dataclass
class PipelineResult(Generic[ContextT]):
  context: ContextT
  steps_completed: int = 0
  failed_step: str | None = None
  error_message: str | None = None

  @property
  def success(self) -> bool:
    return self.failed_step is None


def validate_step(step: Step[ContextT]) -> None:
  """Refuse write steps that retry without an idempotency key."""
  if step.writes_data and step.retry_attempts > 0 and step.idempotency_key is None:
    raise StepConfigError(
      f"step {step.name!r} has writes_data=True and retry_attempts>0 "
      "but no idempotency_key"
    )


def run_pipeline(
  ctx: ContextT,
  steps: Sequence[Step[ContextT]],
  *,
  pipeline_name: str | None = None,
) -> PipelineResult[ContextT]:
  """Run steps in order with logging, retries, and structured failure."""
  label = pipeline_name or "pipeline"
  completed = 0

  for step in steps:
    validate_step(step)
    logger.info("%s step start name=%s", label, step.name)
    attempt = 0
    while True:
      try:
        ctx = step.run(ctx)
        completed += 1
        logger.info("%s step done name=%s", label, step.name)
        break
      except Exception as exc:
        retryable = bool(step.retry_on) and isinstance(exc, step.retry_on)
        if retryable and attempt < step.retry_attempts:
          attempt += 1
          delay = step.retry_backoff_seconds * attempt
          logger.warning(
            "%s step retry name=%s attempt=%d/%d delay=%.1fs error=%s",
            label,
            step.name,
            attempt,
            step.retry_attempts,
            delay,
            exc,
          )
          if delay > 0:
            time.sleep(delay)
          continue
        logger.exception("%s step failed name=%s", label, step.name)
        raise PipelineStepError(
          step.name,
          f"{label} failed at step {step.name!r}: {exc}",
          cause=exc,
        ) from exc

  return PipelineResult(context=ctx, steps_completed=completed)
