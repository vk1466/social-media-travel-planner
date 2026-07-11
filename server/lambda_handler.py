"""AWS Lambda entrypoint for the FastAPI app (API Gateway HTTP API)."""

from __future__ import annotations

from mangum import Mangum

from travelplanner import settings

from server.app import app

if settings.ingest_mode() == "stepfunctions" and settings.auth_disabled():
  raise RuntimeError(
    "CLERK_ISSUER is required when INGEST_MODE=stepfunctions "
    "(production must not run with auth disabled)."
  )

handler = Mangum(app, lifespan="off")
