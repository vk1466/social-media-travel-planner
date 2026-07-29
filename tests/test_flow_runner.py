from dataclasses import replace

from travelplanner.flow.context import IngestContext
from travelplanner.flow.runner import PipelineResult, StepConfigError, run_pipeline, validate_step
from travelplanner.flow.step import Step


def _noop(ctx: IngestContext) -> IngestContext:
  return ctx


def test_runner_retries_transient_failure() -> None:
  attempts = {"count": 0}

  def flaky(ctx: IngestContext) -> IngestContext:
    attempts["count"] += 1
    if attempts["count"] < 2:
      raise TimeoutError("temporary")
    return ctx

  step = Step(
    name="flaky",
    run=flaky,
    retry_attempts=2,
    retry_backoff_seconds=0,
    retry_on=(TimeoutError,),
  )
  result = run_pipeline(IngestContext(post_url="u", user_id="x"), [step])
  assert result.success
  assert attempts["count"] == 2


def test_idempotency_guard_raises_step_config_error() -> None:
  step = Step(
    name="write_without_key",
    run=_noop,
    writes_data=True,
    retry_attempts=1,
  )
  try:
    validate_step(step)
    raise AssertionError("expected StepConfigError")
  except StepConfigError:
    pass
