#!/usr/bin/env python3
"""One-time backfill: migrate timeline_review visits to status=needs_review."""

from __future__ import annotations

import argparse
import logging

from travelplanner.db import visits_repo
from travelplanner.db.visits_repo import visit_from_dict, visit_to_dict
from travelplanner.models import Visit
from travelplanner.visits import parse_review_suggestion

logger = logging.getLogger(__name__)


def migrate_visit(raw: dict) -> Visit | None:
  """Return an updated Visit when migration is needed, else None."""
  visit = visit_from_dict(raw)
  changed = False

  source = raw.get("source") or "manual"
  if source == "timeline_review":
    changed = True

  if visit.status == "needs_review" and (
    visit.review_suggestion is None or raw.get("status") is None
  ):
    suggestion, reason, travel_kind = parse_review_suggestion(raw.get("notes"))
    updates: dict[str, object] = {}
    if visit.review_suggestion is None and suggestion is not None:
      updates["review_suggestion"] = suggestion
    if visit.review_reason is None and reason is not None:
      updates["review_reason"] = reason
    if visit.travel_kind is None and travel_kind is not None:
      updates["travel_kind"] = travel_kind
    if updates:
      visit = Visit(**{**visit_to_dict(visit), **updates})
      changed = True

  if raw.get("status") is None and visit.status == "confirmed" and source != "timeline_review":
    changed = True

  if not changed:
    return None
  return visit


def backfill_user(user_id: str, *, dry_run: bool = False) -> int:
  updated = 0
  for visit in visits_repo.load_all_visits(user_id):
    migrated = migrate_visit(visit_to_dict(visit))
    if migrated is None:
      continue
    updated += 1
    if dry_run:
      logger.info("would update visit_id=%s user_id=%s", visit.visit_id, user_id)
      continue
    visits_repo.save_visit(migrated)
    logger.info("updated visit_id=%s user_id=%s", visit.visit_id, user_id)
  return updated


def main() -> None:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--user-id", help="Limit backfill to one user")
  parser.add_argument("--dry-run", action="store_true")
  args = parser.parse_args()

  logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

  if args.user_id:
    count = backfill_user(args.user_id, dry_run=args.dry_run)
  else:
    count = 0
    # Scan all users via visits table — load per user from query isn't available globally.
    from travelplanner.db.tables import get_table
    from travelplanner.db.serialize import from_dynamo

    table = get_table("Visits")
    user_ids: set[str] = set()
    scan_kwargs: dict = {"ProjectionExpression": "user_id"}
    while True:
      response = table.scan(**scan_kwargs)
      for item in response.get("Items", []):
        user_ids.add(from_dynamo(item)["user_id"])
      last_key = response.get("LastEvaluatedKey")
      if not last_key:
        break
      scan_kwargs["ExclusiveStartKey"] = last_key
    for user_id in sorted(user_ids):
      count += backfill_user(user_id, dry_run=args.dry_run)

  logger.info("backfill complete updated=%d dry_run=%s", count, args.dry_run)


if __name__ == "__main__":
  main()
