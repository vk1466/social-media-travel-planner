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
