"""Clerk Backend API helpers (user listing for super-admin view-as)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from travelplanner import settings

logger = logging.getLogger(__name__)

CLERK_API_BASE = "https://api.clerk.com/v1"


@dataclass(frozen=True)
class ClerkUserSummary:
  user_id: str
  email: str | None
  display_name: str | None


def _display_name(payload: dict[str, Any]) -> str | None:
  first = (payload.get("first_name") or "").strip()
  last = (payload.get("last_name") or "").strip()
  name = " ".join(part for part in (first, last) if part)
  if name:
    return name
  username = (payload.get("username") or "").strip()
  return username or None


def _primary_email(payload: dict[str, Any]) -> str | None:
  primary_id = payload.get("primary_email_address_id")
  emails = payload.get("email_addresses") or []
  if not isinstance(emails, list):
    return None
  if primary_id:
    for entry in emails:
      if isinstance(entry, dict) and entry.get("id") == primary_id:
        email = entry.get("email_address")
        return email if isinstance(email, str) else None
  for entry in emails:
    if isinstance(entry, dict):
      email = entry.get("email_address")
      if isinstance(email, str) and email.strip():
        return email
  return None


def list_clerk_users(*, limit: int = 250) -> list[ClerkUserSummary]:
  """List users from Clerk. Returns [] when secret key is unset."""
  secret = settings.clerk_secret_key()
  if not secret:
    return []

  users: list[ClerkUserSummary] = []
  offset = 0
  page_limit = min(max(limit, 1), 500)
  with httpx.Client(timeout=20.0) as client:
    while True:
      response = client.get(
        f"{CLERK_API_BASE}/users",
        params={"limit": page_limit, "offset": offset, "order_by": "-created_at"},
        headers={"Authorization": f"Bearer {secret}"},
      )
      if response.status_code >= 400:
        logger.warning(
          "Clerk users list failed status=%s body=%s",
          response.status_code,
          response.text[:300],
        )
        response.raise_for_status()
      payload = response.json()
      if not isinstance(payload, list):
        logger.warning("Unexpected Clerk users payload type=%s", type(payload).__name__)
        break
      if not payload:
        break
      for row in payload:
        if not isinstance(row, dict):
          continue
        user_id = row.get("id")
        if not isinstance(user_id, str) or not user_id:
          continue
        users.append(
          ClerkUserSummary(
            user_id=user_id,
            email=_primary_email(row),
            display_name=_display_name(row),
          )
        )
      if len(payload) < page_limit:
        break
      offset += page_limit
      if offset >= 2000:
        break
  return users
