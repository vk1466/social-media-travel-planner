"""AWS Lambda entrypoint for the FastAPI app (Lambda Function URL)."""

from __future__ import annotations

from mangum import Mangum

from travelplanner import settings
from travelplanner.logging_config import configure_logging

from server.app import app

configure_logging()

if settings.auth_disabled():
  raise RuntimeError(
    "CLERK_ISSUER is required in AWS "
    "(production must not run with auth disabled)."
  )

handler = Mangum(app, lifespan="off")
