"""AWS Lambda entrypoint for the FastAPI app (Lambda Function URL)."""

from __future__ import annotations

from mangum import Mangum

from travelplanner import settings

from server.app import app

if settings.auth_disabled():
  raise RuntimeError(
    "CLERK_ISSUER is required in AWS "
    "(production must not run with auth disabled)."
  )

handler = Mangum(app, lifespan="off")
