"""One-shot migrator: JSON data/ → DynamoDB.

Usage (with local DynamoDB running and tables created):

  python scripts/migrate_json_to_dynamodb.py
  python scripts/migrate_json_to_dynamodb.py --user-id user_xxx
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from travelplanner.db import user_places_repo, user_posts_repo
from travelplanner.db.client import reset_client_cache
from travelplanner.db.places_repo import place_from_dict, save_place
from travelplanner.db.posts_repo import post_from_dict, save_post
from travelplanner.db.tables import ensure_tables
from travelplanner.db.visits_repo import save_visit, visit_from_dict


def _load_json_files(directory: Path) -> list[dict]:
  if not directory.exists():
    return []
  items: list[dict] = []
  for path in sorted(directory.rglob("*.json")):
    with path.open(encoding="utf-8") as handle:
      items.append(json.load(handle))
  return items


def main() -> None:
  parser = argparse.ArgumentParser(description="Migrate JSON data/ into DynamoDB")
  parser.add_argument("--posts-dir", type=Path, default=Path("data/posts"))
  parser.add_argument("--places-dir", type=Path, default=Path("data/places"))
  parser.add_argument("--visits-dir", type=Path, default=Path("data/visits"))
  parser.add_argument(
    "--user-id",
    default="local-dev-user",
    help="Attach migrated posts/places/visits to this user",
  )
  args = parser.parse_args()

  reset_client_cache()
  ensure_tables()

  posts = 0
  for raw in _load_json_files(args.posts_dir):
    post = post_from_dict(raw)
    save_post(post)
    user_posts_repo.link_user_post(args.user_id, post.post_id)
    user_places_repo.sync_places_from_post(args.user_id, post.place_ids)
    posts += 1

  places = 0
  for raw in _load_json_files(args.places_dir):
    # Skip nested dirs that aren't place files — rglob already; place files are flat.
    if "place_id" not in raw:
      continue
    save_place(place_from_dict(raw))
    places += 1

  visits = 0
  for raw in _load_json_files(args.visits_dir):
    if "visit_id" not in raw:
      continue
    raw = {**raw, "user_id": raw.get("user_id") or args.user_id}
    visit = visit_from_dict(raw)
    save_visit(visit)
    user_places_repo.link_user_place(args.user_id, visit.place_id, source="manual")
    visits += 1

  print(f"Migrated posts={posts} places={places} visits={visits} user_id={args.user_id}")


if __name__ == "__main__":
  main()
