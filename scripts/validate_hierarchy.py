#!/usr/bin/env python3
"""Robust validation for region buckets & hierarchy.

Deterministic (moto) cases cover:
  - parent materialization + parent_category
  - OSM category fallback for parents
  - category-aware root election (park / city / neighborhood)
  - LLM group-name cannot promote a hike over a broad root
  - cross-post linking + idempotency

Optional live extract checks (--live) need OPENAI_API_KEY.

Usage:
  source .venv/bin/activate
  python3 scripts/validate_hierarchy.py
  python3 scripts/validate_hierarchy.py --live   # also hit OpenAI extract
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "docs" / "hierarchy-validation.json"
sys.path.insert(0, str(ROOT))


@dataclass
class CaseResult:
  label: str
  passed: bool
  detail: str


def _setup_moto() -> None:
  os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
  os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
  os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
  os.environ.setdefault("DYNAMODB_REGION", "us-east-1")
  os.environ.setdefault("DYNAMODB_STAGE", "test")
  os.environ.setdefault("AUTH_DISABLED", "1")


def _sample_post(*, post_id: str, extracted=(), places=(), place_ids=()):
  from travelplanner.models import Platform, SavedPost, make_post_id

  native = post_id.split(":", 1)[-1]
  return SavedPost(
    post_id=post_id if ":" in post_id else make_post_id(Platform.INSTAGRAM, post_id),
    post_url=f"https://www.instagram.com/p/{native}/",
    platform=Platform.INSTAGRAM,
    media_kind="reel",
    caption="validation",
    places=places,
    extracted_places=extracted,
    place_ids=place_ids,
    fetched_at="2026-07-14T00:00:00Z",
  )


def _loc(
  name: str,
  *,
  lat: float,
  lon: float,
  country_code: str = "US",
  state: str = "Oregon",
  osm_class: str | None = None,
  osm_type: str | None = None,
):
  from travelplanner.models import PlaceLocation

  return PlaceLocation(
    display_name=name,
    country_code=country_code,
    state_province=state,
    latitude=lat,
    longitude=lon,
    osm_class=osm_class,
    osm_type=osm_type,
  )


def _run_unit_cases() -> list[CaseResult]:
  from moto import mock_aws

  from travelplanner.db.client import reset_client_cache
  from travelplanner.db.tables import ensure_tables
  from travelplanner.hierarchy import link_places
  from travelplanner.place_hints import ExtractedPlace, PlaceMention, PlatformPlace
  from travelplanner.places import load_all_places, load_place, upsert_place
  from travelplanner.places.mentions import mentions_from_post
  from travelplanner.places.store import delete_all_places
  from travelplanner.store import delete_all_posts, save_post

  results: list[CaseResult] = []

  def check(label: str, cond: bool, detail: str) -> None:
    results.append(CaseResult(label=label, passed=cond, detail=detail))

  def wipe() -> None:
    delete_all_places()
    delete_all_posts()

  with mock_aws():
    reset_client_cache()
    ensure_tables()

    import travelplanner.hierarchy as hierarchy_mod

    original_choose = hierarchy_mod.choose_group_name

    def elect_without_llm() -> None:
      hierarchy_mod.choose_group_name = lambda names: None
      try:
        link_places()
      finally:
        hierarchy_mod.choose_group_name = original_choose

    # --- 1. Parent materialization with parent_category=park ---
    mentions = mentions_from_post(
      _sample_post(
        post_id="instagram:smith1",
        extracted=(
          ExtractedPlace(
            place_name="Misery Ridge Trail",
            state_province="Oregon",
            country="USA",
            category="hike",
            parent_place_name="Smith Rock State Park",
            parent_category="park",
          ),
        ),
      )
    )
    parent = next(m for m in mentions if m.place_name == "Smith Rock State Park")
    child = next(m for m in mentions if m.place_name == "Misery Ridge Trail")
    check(
      "materialize parent category=park",
      parent.category == "park" and child.category == "hike",
      f"parent={parent.category!r} child={child.category!r}",
    )

    # --- 2. Steam Clock → Gastown neighborhood ---
    mentions = mentions_from_post(
      _sample_post(
        post_id="instagram:gastown1",
        extracted=(
          ExtractedPlace(
            place_name="Steam Clock",
            state_province="British Columbia",
            country="Canada",
            category="landmark",
            parent_place_name="Gastown",
            parent_category="neighborhood",
          ),
        ),
      )
    )
    parent = next(m for m in mentions if m.place_name == "Gastown")
    check(
      "materialize parent category=neighborhood",
      parent.category == "neighborhood",
      f"parent={parent.category!r}",
    )

    # --- 3. No parent_category → None (OSM fills later) ---
    mentions = mentions_from_post(
      _sample_post(
        post_id="instagram:osm1",
        extracted=(
          ExtractedPlace(
            place_name="Steam Clock",
            parent_place_name="Gastown",
            category="landmark",
          ),
        ),
      )
    )
    parent = next(m for m in mentions if m.place_name == "Gastown")
    check(
      "blank parent_category stays None",
      parent.category is None,
      f"parent={parent.category!r}",
    )

    # --- 4. OSM fills neighborhood on upsert ---
    wipe()
    place_id = upsert_place(
      PlaceMention(place_name="Gastown"),
      _loc(
        "Gastown",
        lat=49.2840,
        lon=-123.1090,
        country_code="CA",
        state="British Columbia",
        osm_class="place",
        osm_type="neighbourhood",
      ),
      "instagram:osm1",
    )
    place = load_place(place_id)
    check(
      "OSM fallback → neighborhood",
      place is not None and place.category == "neighborhood",
      f"category={place.category if place else None!r}",
    )

    # --- 5. OSM fills city ---
    wipe()
    place_id = upsert_place(
      PlaceMention(place_name="Portland"),
      _loc(
        "Portland",
        lat=45.5152,
        lon=-122.6784,
        osm_class="place",
        osm_type="city",
      ),
      "instagram:pdx1",
    )
    place = load_place(place_id)
    check(
      "OSM fallback → city",
      place is not None and place.category == "city",
      f"category={place.category if place else None!r}",
    )

    # --- 6. Park beats hike without parent hint ---
    wipe()
    park = upsert_place(
      PlaceMention(place_name="Smith Rock State Park", category="park"),
      _loc(
        "Smith Rock State Park",
        lat=44.3665,
        lon=-121.1408,
        osm_class="leisure",
        osm_type="park",
      ),
      "instagram:root1",
    )
    trail = upsert_place(
      PlaceMention(place_name="Misery Ridge", category="hike"),
      _loc(
        "Misery Ridge",
        lat=44.3670,
        lon=-121.1410,
        osm_class="highway",
        osm_type="path",
      ),
      "instagram:root1",
    )
    save_post(
      _sample_post(
        post_id="instagram:root1",
        places=(PlatformPlace(place_name="Smith Rock State Park"),),
        place_ids=(park, trail),
      )
    )
    elect_without_llm()
    root = load_place(park)
    child = load_place(trail)
    check(
      "category root: park over hike (no hint)",
      root is not None
      and child is not None
      and root.parent_place_id is None
      and child.parent_place_id == park,
      f"root_parent={root.parent_place_id if root else None!r} "
      f"child_parent={child.parent_place_id if child else None!r}",
    )

    # --- 7. Neighborhood beats landmark even if LLM names the landmark ---
    wipe()
    gastown = upsert_place(
      PlaceMention(place_name="Gastown", category="neighborhood"),
      _loc(
        "Gastown",
        lat=49.2840,
        lon=-123.1090,
        country_code="CA",
        state="British Columbia",
      ),
      "instagram:g2",
    )
    clock = upsert_place(
      PlaceMention(place_name="Steam Clock", category="landmark"),
      _loc(
        "Steam Clock",
        lat=49.2845,
        lon=-123.1087,
        country_code="CA",
        state="British Columbia",
      ),
      "instagram:g2",
    )
    save_post(
      _sample_post(
        post_id="instagram:g2",
        places=(PlatformPlace(place_name="Gastown"),),
        place_ids=(gastown, clock),
      )
    )
    hierarchy_mod.choose_group_name = lambda names: "Steam Clock"
    try:
      link_places()
    finally:
      hierarchy_mod.choose_group_name = original_choose

    root = load_place(gastown)
    child = load_place(clock)
    check(
      "LLM name cannot promote landmark over neighborhood",
      root is not None
      and child is not None
      and root.parent_place_id is None
      and child.parent_place_id == gastown
      and root.display_name == "Gastown",
      f"root={root.display_name if root else None!r} "
      f"child_parent={child.parent_place_id if child else None!r}",
    )

    # --- 8. City beats restaurant ---
    wipe()
    city = upsert_place(
      PlaceMention(place_name="Portland", category="city"),
      _loc("Portland", lat=45.5152, lon=-122.6784, osm_class="place", osm_type="city"),
      "instagram:food1",
    )
    resto = upsert_place(
      PlaceMention(place_name="Canard", category="restaurant"),
      _loc("Canard", lat=45.5220, lon=-122.6750),
      "instagram:food1",
    )
    save_post(
      _sample_post(
        post_id="instagram:food1",
        extracted=(
          ExtractedPlace(
            place_name="Canard",
            category="restaurant",
            parent_place_name="Portland",
            parent_category="city",
          ),
        ),
        places=(PlatformPlace(place_name="Portland"),),
        place_ids=(city, resto),
      )
    )
    elect_without_llm()
    root = load_place(city)
    child = load_place(resto)
    check(
      "category root: city over restaurant",
      root is not None
      and child is not None
      and root.parent_place_id is None
      and child.parent_place_id == city,
      f"root_parent={root.parent_place_id if root else None!r} "
      f"child_parent={child.parent_place_id if child else None!r}",
    )

    # --- 9. Parent hint links when categories missing ---
    wipe()
    park = upsert_place(
      PlaceMention(place_name="Zion National Park"),
      _loc("Zion National Park", lat=37.2982, lon=-113.0263, state="Utah"),
      "instagram:zion1",
    )
    hike = upsert_place(
      PlaceMention(place_name="Angel's Landing"),
      _loc("Angel's Landing", lat=37.2693, lon=-112.9480, state="Utah"),
      "instagram:zion1",
    )
    save_post(
      _sample_post(
        post_id="instagram:zion1",
        extracted=(
          ExtractedPlace(
            place_name="Angel's Landing",
            parent_place_name="Zion National Park",
            state_province="Utah",
            country="USA",
          ),
        ),
        place_ids=(park, hike),
      )
    )
    elect_without_llm()
    root = load_place(park)
    child = load_place(hike)
    check(
      "parent hint links without categories",
      root is not None
      and child is not None
      and root.parent_place_id is None
      and child.parent_place_id == park,
      f"child_parent={child.parent_place_id if child else None!r}",
    )

    # --- 10. Cross-post: park from A, trail+hint from B ---
    wipe()
    park = upsert_place(
      PlaceMention(place_name="Crater Lake National Park", category="park"),
      _loc("Crater Lake National Park", lat=42.9446, lon=-122.1090),
      "instagram:postA",
    )
    island = upsert_place(
      PlaceMention(place_name="Wizard Island", category="landmark"),
      _loc("Wizard Island", lat=42.9380, lon=-122.1460),
      "instagram:postB",
    )
    save_post(
      _sample_post(
        post_id="instagram:postA",
        extracted=(ExtractedPlace(place_name="Crater Lake National Park", category="park"),),
        place_ids=(park,),
      )
    )
    save_post(
      _sample_post(
        post_id="instagram:postB",
        extracted=(
          ExtractedPlace(
            place_name="Wizard Island",
            category="landmark",
            parent_place_name="Crater Lake National Park",
            parent_category="park",
          ),
        ),
        place_ids=(island,),
      )
    )
    elect_without_llm()
    root = load_place(park)
    child = load_place(island)
    check(
      "cross-post hint clusters under park",
      root is not None
      and child is not None
      and root.parent_place_id is None
      and child.parent_place_id == park,
      f"child_parent={child.parent_place_id if child else None!r}",
    )

    # --- 11. Idempotent ---
    before = {p.place_id: (p.parent_place_id, p.display_name) for p in load_all_places()}
    elect_without_llm()
    after = {p.place_id: (p.parent_place_id, p.display_name) for p in load_all_places()}
    check("link_places idempotent", before == after, f"before={len(before)} after={len(after)}")

    # --- 12. Two hikes only → one still becomes root ---
    wipe()
    left = upsert_place(
      PlaceMention(place_name="Misery Ridge Trail", category="hike"),
      _loc("Misery Ridge Trail", lat=44.3670, lon=-121.1410),
      "instagram:hikes",
    )
    right = upsert_place(
      PlaceMention(place_name="Monkey Face Trail", category="hike"),
      _loc("Monkey Face Trail", lat=44.3680, lon=-121.1420),
      "instagram:hikes",
    )
    save_post(
      _sample_post(
        post_id="instagram:hikes",
        places=(PlatformPlace(place_name="Misery Ridge Trail"),),
        place_ids=(left, right),
      )
    )
    elect_without_llm()
    places = load_all_places()
    roots = [p for p in places if p.parent_place_id is None]
    kids = [p for p in places if p.parent_place_id is not None]
    check(
      "all-hike cluster still elects one root",
      len(roots) == 1 and len(kids) == 1 and kids[0].parent_place_id == roots[0].place_id,
      f"roots={len(roots)} kids={len(kids)}",
    )

    # --- 13. Dedup same parent across children ---
    mentions = mentions_from_post(
      _sample_post(
        post_id="instagram:dedupe",
        extracted=(
          ExtractedPlace(
            place_name="Misery Ridge Trail",
            parent_place_name="Smith Rock State Park",
            parent_category="park",
            category="hike",
          ),
          ExtractedPlace(
            place_name="Monkey Face",
            parent_place_name="Smith Rock State Park",
            parent_category="park",
            category="landmark",
          ),
        ),
      )
    )
    parents = [m for m in mentions if m.place_name == "Smith Rock State Park"]
    check(
      "dedupe synthesized parent once",
      len(parents) == 1 and parents[0].category == "park",
      f"parent_count={len(parents)}",
    )

    # --- 14. LLM category wins over OSM ---
    wipe()
    place_id = upsert_place(
      PlaceMention(place_name="Portland", category="city"),
      _loc(
        "Portland",
        lat=45.5152,
        lon=-122.6784,
        osm_class="place",
        osm_type="city",
      ),
      "instagram:pdx2",
    )
    place = load_place(place_id)
    check(
      "LLM category wins over OSM",
      place is not None and place.category == "city",
      f"category={place.category if place else None!r}",
    )

    # --- 15. National park OSM type ---
    wipe()
    place_id = upsert_place(
      PlaceMention(place_name="Yellowstone"),
      _loc(
        "Yellowstone National Park",
        lat=44.4280,
        lon=-110.5885,
        state="Wyoming",
        osm_class="boundary",
        osm_type="national_park",
      ),
      "instagram:ys",
    )
    place = load_place(place_id)
    check(
      "OSM national_park → park",
      place is not None and place.category == "park",
      f"category={place.category if place else None!r}",
    )

    reset_client_cache()

  return results


def _run_live_extract_cases() -> list[CaseResult]:
  from travelplanner.extract import ReelBundle, fetch_places_from_reel

  cases = [
    {
      "label": "live: Misery Ridge → Smith Rock park",
      "caption": (
        "📍 Misery Ridge Trail, Smith Rock State Park, Oregon — steep scramble "
        "with climber views. Start early for parking."
      ),
      "child": "misery ridge",
      "parent": "smith rock",
      "parent_category": ("park",),
      "child_category": ("hike",),
    },
    {
      "label": "live: Steam Clock → Gastown neighborhood",
      "caption": (
        "📍 Steam Clock, Gastown, Vancouver, BC — classic photo spot in the "
        "historic district. Go at golden hour."
      ),
      "child": "steam clock",
      "parent": "gastown",
      "parent_category": ("neighborhood", "city"),
      "child_category": ("landmark",),
    },
    {
      "label": "live: restaurant → Portland city",
      "caption": (
        "📍 Canard, Portland, Oregon — French-ish dinner spot in the Pearl. "
        "Book ahead on weekends."
      ),
      "child": "canard",
      "parent": "portland",
      "parent_category": ("city", "neighborhood"),
      "child_category": ("restaurant",),
    },
    {
      "label": "live: Angel's Landing → Zion park",
      "caption": (
        "📍 Angel's Landing, Zion National Park, Utah — iconic hike with chains. "
        "Permit required."
      ),
      "child": "angel",
      "parent": "zion",
      "parent_category": ("park",),
      "child_category": ("hike",),
    },
    {
      "label": "live: Picture Lake → Mt. Baker landmark/park",
      "caption": (
        "📍 Picture Lake, Mt. Baker, Washington — short walk to the Mt Shuksan "
        "reflection. Foggy mornings are magic."
      ),
      "child": "picture lake",
      "parent": "baker",
      "parent_category": ("landmark", "park", "city"),
      "child_category": ("viewpoint", "park", "landmark"),
    },
  ]

  results: list[CaseResult] = []
  for case in cases:
    extraction = fetch_places_from_reel(ReelBundle(caption=case["caption"]))
    if not extraction.places:
      results.append(CaseResult(case["label"], False, "no places extracted"))
      continue

    child = next(
      (
        p
        for p in extraction.places
        if case["child"] in p.place_name.lower()
      ),
      None,
    )
    if child is None:
      names = [p.place_name for p in extraction.places]
      results.append(CaseResult(case["label"], False, f"child not found in {names}"))
      continue

    parent_name = (child.parent_place_name or "").lower()
    parent_ok = case["parent"] in parent_name
    parent_cat_ok = child.parent_category in case["parent_category"] if child.parent_category else False
    # Also accept if parent was extracted as its own place with the category
    if not parent_cat_ok and child.parent_place_name:
      sibling = next(
        (
          p
          for p in extraction.places
          if p.place_name.lower() == child.parent_place_name.lower()
        ),
        None,
      )
      if sibling and sibling.category in case["parent_category"]:
        parent_cat_ok = True

    child_cat_ok = child.category in case["child_category"] if child.category else False
    passed = parent_ok and parent_cat_ok and child_cat_ok
    detail = (
      f"place={child.place_name!r} cat={child.category!r} "
      f"parent={child.parent_place_name!r} parent_cat={child.parent_category!r}"
    )
    results.append(CaseResult(case["label"], passed, detail))

  return results


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument(
    "--live",
    action="store_true",
    help="Also run live OpenAI extract checks for parent_category",
  )
  args = parser.parse_args()

  _setup_moto()
  print("Running deterministic hierarchy cases (moto)…")
  results = _run_unit_cases()

  if args.live:
    if not os.environ.get("OPENAI_API_KEY"):
      print("WARN: --live requested but OPENAI_API_KEY unset; skipping live cases")
    else:
      print("Running live extract parent_category cases…")
      results.extend(_run_live_extract_cases())

  passed = sum(1 for r in results if r.passed)
  failed = [r for r in results if not r.passed]

  print()
  for r in results:
    mark = "PASS" if r.passed else "FAIL"
    print(f"  [{mark}] {r.label}")
    print(f"         {r.detail}")

  payload = {
    "passed": passed,
    "total": len(results),
    "failed": [{"label": r.label, "detail": r.detail} for r in failed],
    "results": [
      {"label": r.label, "passed": r.passed, "detail": r.detail} for r in results
    ],
  }
  OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n")
  print()
  print(f"Summary: {passed}/{len(results)} passed")
  print(f"Wrote {OUT_PATH}")
  return 0 if not failed else 1


if __name__ == "__main__":
  raise SystemExit(main())
