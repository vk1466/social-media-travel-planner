#!/usr/bin/env python3
from __future__ import annotations

import argparse
from collections import Counter
from pathlib import Path

from travelplanner.logging_config import configure_logging
from travelplanner.pipeline import IngestResult, ingest_links
from travelplanner.places import reprocess_all_places, retry_place_candidates
from travelplanner.places.facts.enrich import enrich_places


def _print_result(result: IngestResult) -> None:
  if result.status == "saved":
    print(f"saved     {result.post_url} ({result.post_id})")
  elif result.status == "linked":
    print(f"linked    {result.post_url} ({result.post_id})")
  elif result.status == "skipped":
    print(f"skipped   {result.post_url} ({result.post_id})")
  elif result.status == "unsupported":
    print(f"unsupported {result.post_url}")
  else:
    detail = f": {result.error_message}" if result.error_message else ""
    print(f"error     {result.post_url}{detail}")


def _read_links(path: Path) -> list[str]:
  links: list[str] = []
  for line in path.read_text(encoding="utf-8").splitlines():
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
      continue
    links.append(stripped)
  return links


def main() -> None:
  configure_logging()
  parser = argparse.ArgumentParser(description="Ingest social media links into DynamoDB.")
  parser.add_argument(
    "links_file",
    type=Path,
    nargs="?",
    help="Text file with one URL per line",
  )
  parser.add_argument(
    "--user-id",
    required=False,
    default="local-dev-user",
    help="User id to attach ingested posts to (default: local-dev-user)",
  )
  parser.add_argument(
    "--refresh",
    action="store_true",
    help="Re-fetch posts even if they are already stored",
  )
  parser.add_argument(
    "--reprocess-places",
    action="store_true",
    help="Re-run place enrichment on all saved posts without re-fetching links",
  )
  parser.add_argument(
    "--retry-place-candidates",
    action="store_true",
    help="Retry unresolved PlaceCandidates without re-fetching Instagram posts",
  )
  parser.add_argument(
    "--include-low-confidence",
    action="store_true",
    help="With --retry-place-candidates, also retry low_confidence candidates",
  )
  parser.add_argument(
    "--source-post-id",
    default=None,
    help="With --retry-place-candidates, limit retry to one source post",
  )
  parser.add_argument(
    "--enrich-place-facts",
    action="store_true",
    help="Fetch type-specific place facts (OSM / Wikipedia) for one place or a category batch",
  )
  parser.add_argument(
    "--place-id",
    default=None,
    help="With --enrich-place-facts, enrich a single place_id",
  )
  parser.add_argument(
    "--category",
    default=None,
    help="With --enrich-place-facts, filter batch by category (e.g. park)",
  )
  parser.add_argument(
    "--limit",
    type=int,
    default=10,
    help="With --enrich-place-facts batch mode, max places to enrich (default 10)",
  )
  parser.add_argument(
    "--force",
    action="store_true",
    help="With --enrich-place-facts, ignore TTL and place_facts feature flag",
  )

  args = parser.parse_args()

  if args.enrich_place_facts:
    results = enrich_places(
      place_id=args.place_id,
      category=args.category,
      limit=args.limit,
      force=args.force,
    )
    for result in results:
      facts_status = result.facts.status if result.facts else "-"
      print(
        f"{result.status:10} {result.place_id} "
        f"facts={facts_status} ({result.note})"
      )
    print(f"done: enriched {len(results)} place(s)")
    return

  if args.retry_place_candidates:
    result = retry_place_candidates(
      source_post_id=args.source_post_id,
      include_low_confidence=args.include_low_confidence,
    )
    print(
      "done: retried place candidates — "
      f"attempted={result.attempted}, "
      f"resolved={result.resolved}, "
      f"still_open={result.still_open}, "
      f"place_ids={len(result.place_ids)}"
    )
    return

  if args.reprocess_places:
    reprocess_all_places()
    print("done: reprocessed places for all saved posts")
    return

  if args.links_file is None:
    parser.error(
      "links_file is required unless --reprocess-places, --retry-place-candidates, or --enrich-place-facts is set"
    )

  post_urls = _read_links(args.links_file)
  results = ingest_links(
    post_urls,
    user_id=args.user_id,
    refresh=args.refresh,
    on_result=_print_result,
  )

  counts = Counter(result.status for result in results)
  print(
    "summary: "
    f"saved: {counts.get('saved', 0)}, "
    f"linked: {counts.get('linked', 0)}, "
    f"skipped: {counts.get('skipped', 0)}, "
    f"unsupported: {counts.get('unsupported', 0)}, "
    f"errors: {counts.get('error', 0)}"
  )


if __name__ == "__main__":
  main()
