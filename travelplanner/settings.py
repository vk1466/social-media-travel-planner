from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


def mindcase_api_key() -> str | None:
  """Optional until first Instagram fetch; client raises if missing then."""
  value = os.getenv("MINDCASE_API_KEY")
  return value.strip() if value else None


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


def google_maps_api_key() -> str | None:
  """Optional Google Maps / Places key for locate fallback (1f)."""
  value = os.getenv("GOOGLE_MAPS_API_KEY")
  return value.strip() if value else None


def tmdb_api_key() -> str | None:
  """Optional TMDB v3 API key for movie resolve / facts."""
  value = os.getenv("TMDB_API_KEY")
  return value.strip() if value else None


def omdb_api_key() -> str | None:
  """Optional OMDb key for IMDb / Rotten Tomatoes scores."""
  value = os.getenv("OMDB_API_KEY")
  return value.strip() if value else None


def openai_model() -> str:
  return os.getenv("OPENAI_MODEL", "gpt-4o-mini")

def openai_temperature() -> float:
  """Sampling temperature for extraction.

  Defaults to 0 so the same reel yields the same places and categories across
  runs; anything higher makes category assignment drift between ingests.
  """
  raw = os.getenv("OPENAI_TEMPERATURE", "0").strip()
  try:
    return float(raw)
  except ValueError as exc:
    raise RuntimeError(f"OPENAI_TEMPERATURE must be a number, got {raw!r}") from exc



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


# Sole super-admin: vipul.kumar.sea@gmail.com (Clerk user id). Not configurable
# via env so other accounts cannot gain view-as / impersonation access.
_SUPER_ADMIN_USER_IDS = frozenset({"user_3GLjUeF6M5n7ZTDnzK1CFuQU9O1"})


def super_admin_user_ids() -> frozenset[str]:
  return _SUPER_ADMIN_USER_IDS


def is_super_admin_user(user_id: str) -> bool:
  """True only for the hardcoded super-admin Clerk user id."""
  return bool(user_id) and user_id in _SUPER_ADMIN_USER_IDS


def is_admin_user(user_id: str) -> bool:
  """True when ADMIN_USER_IDS is empty (dev), listed, or user is super admin."""
  if is_super_admin_user(user_id):
    return True
  admins = admin_user_ids()
  return not admins or user_id in admins


def clerk_secret_key() -> str | None:
  value = os.getenv("CLERK_SECRET_KEY", "").strip()
  return value or None


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


def media_bucket() -> str | None:
  """S3 bucket for durable post thumbnails (unset = skip persistence)."""
  value = os.getenv("MEDIA_BUCKET", "").strip()
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

def timeline_day_trip_min_km() -> float:
  """Distance from home that counts as travel on its own (default 150 km).

  Lets a single-day excursion qualify without an overnight stay.
  """
  raw = os.getenv("TIMELINE_DAY_TRIP_MIN_KM", "150").strip()
  try:
    value = float(raw)
  except ValueError as exc:
    raise RuntimeError(
      f"TIMELINE_DAY_TRIP_MIN_KM must be a number, got {raw!r}"
    ) from exc
  if value < 0:
    raise RuntimeError("TIMELINE_DAY_TRIP_MIN_KM must be >= 0")
  return value

def timeline_min_trip_days() -> int:
  """Consecutive away-from-home days needed to call a run a trip (default 2)."""
  raw = os.getenv("TIMELINE_MIN_TRIP_DAYS", "2").strip()
  try:
    value = int(raw)
  except ValueError as exc:
    raise RuntimeError(f"TIMELINE_MIN_TRIP_DAYS must be an integer, got {raw!r}") from exc
  if value < 1:
    raise RuntimeError("TIMELINE_MIN_TRIP_DAYS must be >= 1")
  return value

def timeline_routine_visit_count() -> int:
  """Separate visits after which a place is routine, not a travel memory (default 5).

  Set to 0 to keep places regardless of how often they were visited.
  """
  raw = os.getenv("TIMELINE_ROUTINE_VISIT_COUNT", "5").strip()
  try:
    value = int(raw)
  except ValueError as exc:
    raise RuntimeError(
      f"TIMELINE_ROUTINE_VISIT_COUNT must be an integer, got {raw!r}"
    ) from exc
  if value < 0:
    raise RuntimeError("TIMELINE_ROUTINE_VISIT_COUNT must be >= 0")
  return value

