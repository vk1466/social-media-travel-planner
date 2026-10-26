#!/usr/bin/env python3
"""Backfill script: update existing DynamoDB place records to properly capitalized English names.

Defaults to --dry-run so no changes are applied unless --apply is passed explicitly.
"""

from __future__ import annotations

import argparse
import logging
import os

from travelplanner.clients.geocoder import capitalize_place_name
from travelplanner.db.tables import get_table

logger = logging.getLogger(__name__)


def backfill_place_names(*, dry_run: bool = True) -> tuple[int, int]:
  """Scan places and apply proper capitalization / English name preference.

  Returns (total_scanned, updated_count).
  """
  table = get_table("Places")
  logger.info("Scanning table %s (dry_run=%s)...", table.name, dry_run)
  total = 0
  updated = 0

  scan_kwargs = {}
  while True:
    res = table.scan(**scan_kwargs)
    items = res.get("Items", [])
    for item in items:
      total += 1
      place_id = item.get("place_id")
      current_name = item.get("display_name", "")
      new_name = capitalize_place_name(current_name)
      if new_name and new_name != current_name:
        updated += 1
        if dry_run:
          logger.info("[DRY RUN] Would update place %s: %r -> %r", place_id, current_name, new_name)
        else:
          table.update_item(
            Key={"place_id": place_id},
            UpdateExpression="SET display_name = :new_name",
            ExpressionAttributeValues={":new_name": new_name},
          )
          logger.info("[UPDATED] Place %s: %r -> %r", place_id, current_name, new_name)

    if "LastEvaluatedKey" in res:
      scan_kwargs["ExclusiveStartKey"] = res["LastEvaluatedKey"]
    else:
      break

  logger.info("Finished: scanned %d places, %d %s.", total, updated, "would be updated" if dry_run else "updated")
  return total, updated


def main() -> None:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument(
    "--apply",
    action="store_true",
    help="Apply updates to DynamoDB (default is dry-run mode)",
  )
  parser.add_argument(
    "--stage",
    default=os.environ.get("DYNAMODB_STAGE", "dev"),
    help="DynamoDB stage (dev/prod, default: dev)",
  )
  args = parser.parse_args()

  logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
  os.environ["DYNAMODB_STAGE"] = args.stage

  dry_run = not args.apply
  if dry_run:
    print(f"Running in DRY-RUN mode against stage '{args.stage}'. Use --apply to execute updates.")
  else:
    print(f"Applying updates to stage '{args.stage}'!")

  total, updated = backfill_place_names(dry_run=dry_run)
  print(f"Summary: {total} total scanned, {updated} needing update (dry_run={dry_run}).")


if __name__ == "__main__":
  main()
