"""App logging for Lambda, CLI, and local runs.

Call `configure_logging()` once at process entry (CLI, Lambda handlers).
Business modules use `logging.getLogger(__name__)` and assume that setup.
"""

from __future__ import annotations

import logging
import sys

_CONFIGURED = False

_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"


def configure_logging(level: int | str | None = None) -> None:
  """Idempotent root setup for the `travelplanner` and `server` loggers."""
  global _CONFIGURED
  if _CONFIGURED:
    return

  from travelplanner import settings

  if level is None:
    level = settings.log_level()
  if isinstance(level, str):
    level = getattr(logging, level.upper(), logging.INFO)

  root = logging.getLogger()
  if not root.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(_FORMAT))
    root.addHandler(handler)
  root.setLevel(level)

  # Keep third-party noise down unless explicitly debugging.
  for noisy in ("urllib3", "botocore", "boto3", "httpx", "httpcore", "openai"):
    logging.getLogger(noisy).setLevel(logging.WARNING)

  _CONFIGURED = True
