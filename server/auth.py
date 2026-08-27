"""Clerk JWT verification and FastAPI auth dependency."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException
from jwt import PyJWKClient

from travelplanner import settings


@lru_cache(maxsize=1)
def _jwks_client() -> PyJWKClient | None:
  jwks_url = settings.clerk_jwks_url()
  if not jwks_url:
    return None
  return PyJWKClient(jwks_url)


def reset_auth_cache() -> None:
  _jwks_client.cache_clear()


def _verify_clerk_token(token: str) -> str:
  client = _jwks_client()
  if client is None:
    raise HTTPException(status_code=401, detail="Auth is not configured")
  try:
    signing_key = client.get_signing_key_from_jwt(token)
    decode_kwargs: dict = {
      "algorithms": ["RS256"],
      "issuer": settings.clerk_issuer(),
    }
    audience = settings.clerk_audience()
    if audience:
      decode_kwargs["audience"] = audience
    else:
      decode_kwargs["options"] = {"verify_aud": False}
    payload = jwt.decode(token, signing_key.key, **decode_kwargs)
  except jwt.PyJWTError as exc:
    raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

  user_id = payload.get("sub")
  if not user_id or not isinstance(user_id, str):
    raise HTTPException(status_code=401, detail="Token missing subject")
  return user_id


def get_authenticated_user_id(
  authorization: Annotated[str | None, Header()] = None,
  x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
) -> str:
  """Resolve the real signed-in user id from Clerk JWT or local dev header."""
  if authorization and authorization.lower().startswith("bearer "):
    token = authorization.split(" ", 1)[1].strip()
    if token:
      if settings.auth_disabled() and token.startswith("dev:"):
        return token.removeprefix("dev:") or "local-dev-user"
      if not settings.auth_disabled():
        return _verify_clerk_token(token)
      # AUTH_DISABLED with a non-dev bearer: treat opaque token as user id for tests
      if settings.auth_disabled():
        return token

  if settings.auth_disabled():
    if x_user_id and x_user_id.strip():
      return x_user_id.strip()
    return "local-dev-user"

  raise HTTPException(status_code=401, detail="Missing Authorization bearer token")


def get_acting_user_id(
  auth_user_id: Annotated[str, Depends(get_authenticated_user_id)],
  x_view_as_user_id: Annotated[str | None, Header(alias="X-View-As-User-Id")] = None,
) -> str:
  """User id for library/data scoping. Super admin may view another profile."""
  if not x_view_as_user_id or not x_view_as_user_id.strip():
    return auth_user_id
  target_user_id = x_view_as_user_id.strip()
  if not settings.is_super_admin_user(auth_user_id):
    raise HTTPException(status_code=403, detail="View-as requires super admin")
  return target_user_id


def require_admin(
  user_id: Annotated[str, Depends(get_authenticated_user_id)],
) -> str:
  admins = settings.admin_user_ids()
  if settings.is_super_admin_user(user_id):
    return user_id
  if admins and user_id not in admins:
    raise HTTPException(status_code=403, detail="Admin access required")
  # When ADMIN_USER_IDS is empty, any authenticated user may run maintenance (dev).
  return user_id


def require_super_admin(
  user_id: Annotated[str, Depends(get_authenticated_user_id)],
) -> str:
  if not settings.is_super_admin_user(user_id):
    raise HTTPException(status_code=403, detail="Super admin access required")
  return user_id


# Data routes use acting user (honors view-as for super admin only).
CurrentUserId = Annotated[str, Depends(get_acting_user_id)]
# Identity / privilege checks always use the real signed-in user.
AuthenticatedUserId = Annotated[str, Depends(get_authenticated_user_id)]
AdminUserId = Annotated[str, Depends(require_admin)]
SuperAdminUserId = Annotated[str, Depends(require_super_admin)]
