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
