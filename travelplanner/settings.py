from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


def ensembledata_token() -> str:
  value = os.getenv("ENSEMBLEDATA_TOKEN")
  if not value:
    raise RuntimeError(
      "Missing ENSEMBLEDATA_TOKEN environment variable. "
      "Copy .env.example to .env and set your EnsembleData API token."
    )
  return value


def supadata_api_key() -> str:
  value = os.getenv("SUPADATA_API_KEY")
  if not value:
    raise RuntimeError(
      "Missing SUPADATA_API_KEY environment variable. "
      "Copy .env.example to .env and set your Supadata API key."
    )
  return value


def openai_api_key() -> str | None:
  value = os.getenv("OPENAI_API_KEY")
  return value.strip() if value else None


def openai_model() -> str:
  return os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def dynamodb_region() -> str:
  return os.getenv("DYNAMODB_REGION", "us-east-1").strip() or "us-east-1"


def dynamodb_stage() -> str:
  """Environment segment in table names: test | dev | prod."""
  return os.getenv("DYNAMODB_STAGE", "dev").strip() or "dev"


def aws_access_key_id() -> str | None:
  value = os.getenv("AWS_ACCESS_KEY_ID", "").strip()
  return value or None


def aws_secret_access_key() -> str | None:
  value = os.getenv("AWS_SECRET_ACCESS_KEY", "").strip()
  return value or None


def clerk_issuer() -> str | None:
  value = os.getenv("CLERK_ISSUER", "").strip()
  return value or None


def clerk_jwks_url() -> str | None:
  value = os.getenv("CLERK_JWKS_URL", "").strip()
  if value:
    return value
  issuer = clerk_issuer()
  if issuer:
    return f"{issuer.rstrip('/')}/.well-known/jwks.json"
  return None


def clerk_audience() -> str | None:
  value = os.getenv("CLERK_AUDIENCE", "").strip()
  return value or None


def admin_user_ids() -> frozenset[str]:
  raw = os.getenv("ADMIN_USER_IDS", "").strip()
  if not raw:
    return frozenset()
  return frozenset(part.strip() for part in raw.split(",") if part.strip())


def is_admin_user(user_id: str) -> bool:
  """True when ADMIN_USER_IDS is empty (dev) or user_id is listed."""
  admins = admin_user_ids()
  return not admins or user_id in admins


def auth_disabled() -> bool:
  """Test bypass when Clerk is not configured (pytest only)."""
  flag = os.getenv("AUTH_DISABLED", "").strip().lower()
  if flag in {"1", "true", "yes"}:
    return True
  return clerk_issuer() is None


def state_machine_arn() -> str | None:
  value = os.getenv("STATE_MACHINE_ARN", "").strip()
  return value or None


def cors_origins() -> list[str]:
  raw = os.getenv("CORS_ORIGINS", "").strip()
  if raw:
    return [origin.strip() for origin in raw.split(",") if origin.strip()]
  return [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]


def log_level() -> str:
  """Root log level for CLI / Lambda (DEBUG | INFO | WARNING | ERROR)."""
  value = os.getenv("LOG_LEVEL", "INFO").strip().upper()
  if value in {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}:
    return value
  return "INFO"


def instagram_profile_post_limit() -> int:
  """How many latest Instagram posts to import from a profile (default 5).

  Set high (e.g. 500) to approximate “everything”. Must be >= 1.
  """
  raw = os.getenv("INSTAGRAM_PROFILE_POST_LIMIT", "5").strip()
  try:
    limit = int(raw)
  except ValueError as exc:
    raise RuntimeError(
      f"INSTAGRAM_PROFILE_POST_LIMIT must be an integer, got {raw!r}"
    ) from exc
  if limit < 1:
    raise RuntimeError("INSTAGRAM_PROFILE_POST_LIMIT must be >= 1")
  return limit


def timeline_max_places_per_call() -> int:
  """Max unique Timeline places per worker batch (default 100).

  Nominatim is ~1 req/s; one Lambda batch must finish within the timeout.
  """
  raw = os.getenv("TIMELINE_MAX_PLACES_PER_CALL", os.getenv("TIMELINE_IMPORT_MAX_PLACES", "100")).strip()
  try:
    limit = int(raw)
  except ValueError as exc:
    raise RuntimeError(
      f"TIMELINE_MAX_PLACES_PER_CALL must be an integer, got {raw!r}"
    ) from exc
  if limit < 1:
    raise RuntimeError("TIMELINE_MAX_PLACES_PER_CALL must be >= 1")
  return limit


def timeline_batch_size() -> int:
  """How many clusters per Step Functions Map item (default 100)."""
  raw = os.getenv("TIMELINE_BATCH_SIZE", "100").strip()
  try:
    limit = int(raw)
  except ValueError as exc:
    raise RuntimeError(f"TIMELINE_BATCH_SIZE must be an integer, got {raw!r}") from exc
  if limit < 1:
    raise RuntimeError("TIMELINE_BATCH_SIZE must be >= 1")
  return limit


def timeline_home_exclude_km() -> float:
  """Drop Timeline visits within this many km of home (default 30)."""
  raw = os.getenv("TIMELINE_HOME_EXCLUDE_KM", "30").strip()
  try:
    value = float(raw)
  except ValueError as exc:
    raise RuntimeError(
      f"TIMELINE_HOME_EXCLUDE_KM must be a number, got {raw!r}"
    ) from exc
  if value < 0:
    raise RuntimeError("TIMELINE_HOME_EXCLUDE_KM must be >= 0")
  return value


def timeline_imports_bucket() -> str | None:
  value = os.getenv("TIMELINE_IMPORTS_BUCKET", "").strip()
  return value or None


def timeline_state_machine_arn() -> str | None:
  value = os.getenv("TIMELINE_STATE_MACHINE_ARN", "").strip()
  return value or None


def timeline_import_max_bytes() -> int:
  """Max upload size for Timeline JSON/ZIP staging payload (default 40 MiB)."""
  raw = os.getenv("TIMELINE_IMPORT_MAX_BYTES", str(40 * 1024 * 1024)).strip()
  try:
    limit = int(raw)
  except ValueError as exc:
    raise RuntimeError(
      f"TIMELINE_IMPORT_MAX_BYTES must be an integer, got {raw!r}"
    ) from exc
  if limit < 1024:
    raise RuntimeError("TIMELINE_IMPORT_MAX_BYTES must be >= 1024")
  return limit


# Back-compat alias used by older call sites / env docs.
def timeline_import_max_places() -> int:
  return timeline_max_places_per_call()
