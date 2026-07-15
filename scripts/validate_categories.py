#!/usr/bin/env python3
"""Live validation suite for attraction category + attribute extraction.

Builds short synthetic reel captions for places worldwide (famous + hidden gems,
small + large) and checks that extract() assigns an acceptable category and
expected attributes.

Usage:
  source .venv/bin/activate
  set -a && source .env && set +a
  python3 scripts/validate_categories.py

Writes docs/category-extract-validation.json
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "docs" / "category-extract-validation.json"

# expect: primary expected category
# accept: additional categories that still count as category PASS
# expect_attrs: attributes that must be present when category is in accept
#   (skipped when got category has empty allowlist / not in accept for attr check)
# region / tier: reporting buckets
CASES: list[dict] = [
  # --- Americas: famous ---
  {
    "label": "Multnomah Falls",
    "region": "Americas",
    "tier": "famous",
    "caption": (
      "📍 Multnomah Falls, Columbia River Gorge, Oregon — tallest waterfall in "
      "Oregon. Short paved walk from the parking lot to the lower bridge view."
    ),
    "place_name": "Multnomah Falls",
    "expect": "waterfall",
    "accept": ("waterfall",),
    "expect_attrs": (),
    "expect_attrs_any": (("hike", "viewpoint"),),
  },
  {
    "label": "Angel's Landing",
    "region": "Americas",
    "tier": "famous",
    "caption": "📍 Angel's Landing, Zion National Park, Utah — iconic hike with chains and crazy views. Bring gloves.",
    "place_name": "Angel's Landing",
    "expect": "hike",
    "accept": ("hike",),
    "expect_attrs": ("viewpoint",),
  },
  {
    "label": "Grand Canyon South Rim",
    "region": "Americas",
    "tier": "famous",
    "caption": "📍 Grand Canyon National Park, Arizona — South Rim overlooks at sunset. Park entry fee required.",
    "place_name": "Grand Canyon National Park",
    "expect": "park",
    "accept": ("park", "viewpoint", "landmark"),
    "expect_attrs": (),
  },
  {
    "label": "Machu Picchu",
    "region": "Americas",
    "tier": "famous",
    "caption": "📍 Machu Picchu, Peru — Inca citadel in the Andes. Book tickets weeks ahead; steep walk from the bus stop.",
    "place_name": "Machu Picchu",
    "expect": "landmark",
    "accept": ("landmark", "park"),
    "expect_attrs": (),
  },
  {
    "label": "Christ the Redeemer",
    "region": "Americas",
    "tier": "famous",
    "caption": "📍 Christ the Redeemer, Rio de Janeiro, Brazil — statue atop Corcovado with city views. Go early to beat clouds.",
    "place_name": "Christ the Redeemer",
    "expect": "landmark",
    "accept": ("landmark",),
    "expect_attrs": ("viewpoint",),
  },
  {
    "label": "Torres del Paine",
    "region": "Americas",
    "tier": "famous",
    "caption": "📍 Torres del Paine National Park, Chile — Patagonia towers and windy trails. Reserve campsites.",
    "place_name": "Torres del Paine National Park",
    "expect": "park",
    "accept": ("park",),
    "expect_attrs": (),
  },
  # --- Americas: hidden / smaller ---
  {
    "label": "Misery Ridge Trail",
    "region": "Americas",
    "tier": "hidden",
    "caption": "📍 Misery Ridge Trail, Smith Rock State Park, Oregon — steep scramble with climber views. Bring water.",
    "place_name": "Misery Ridge Trail",
    "expect": "hike",
    "accept": ("hike",),
    "expect_attrs": ("viewpoint",),
  },
  {
    "label": "Picture Lake",
    "region": "Americas",
    "tier": "hidden",
    "caption": "📍 Picture Lake, Mt. Baker, Washington — short walk to the classic Mt Shuksan reflection. Foggy mornings are magic.",
    "place_name": "Picture Lake",
    "expect": "viewpoint",
    "accept": ("viewpoint", "park", "landmark"),
    "expect_attrs": (),
    "expect_attrs_any": (("hike",),),
  },
  {
    "label": "Tunnel Falls",
    "region": "Americas",
    "tier": "hidden",
    "caption": "📍 Tunnel Falls, Columbia River Gorge, Oregon — waterfall you walk behind via a carved tunnel on the Eagle Creek trail.",
    "place_name": "Tunnel Falls",
    "expect": "waterfall",
    "accept": ("waterfall",),
    "expect_attrs": ("hike",),
  },
  {
    "label": "Haystack Rock",
    "region": "Americas",
    "tier": "famous",
    "caption": "📍 Haystack Rock, Cannon Beach, Oregon — tide pools at low tide around the sea stack.",
    "place_name": "Haystack Rock",
    "expect": "landmark",
    "accept": ("landmark", "beach", "viewpoint"),
    "expect_attrs": (),
  },
  {
    "label": "Bondi Beach",
    "region": "Oceania",
    "tier": "famous",
    "caption": "📍 Bondi Beach, Sydney, Australia — swim between the flags and walk the Bondi to Coogee coastal path.",
    "place_name": "Bondi Beach",
    "expect": "beach",
    "accept": ("beach",),
    "expect_attrs": ("hike",),
  },
  {
    "label": "Uluru",
    "region": "Oceania",
    "tier": "famous",
    "caption": "📍 Uluru, Northern Territory, Australia — sacred sandstone monolith. Base walk at sunrise.",
    "place_name": "Uluru",
    "expect": "landmark",
    "accept": ("landmark", "park", "hike"),
    "expect_attrs": (),
  },
  {
    "label": "Milford Sound",
    "region": "Oceania",
    "tier": "famous",
    "caption": "📍 Milford Sound, Fiordland National Park, New Zealand — cruise the fjord under steep peaks. Pack rain gear.",
    "place_name": "Milford Sound",
    "expect": "park",
    "accept": ("park", "viewpoint", "landmark"),
    "expect_attrs": (),
  },
  {
    "label": "Cathedral Cove",
    "region": "Oceania",
    "tier": "hidden",
    "caption": "📍 Cathedral Cove, Coromandel, New Zealand — beach reached by a short coastal hike through a rock arch.",
    "place_name": "Cathedral Cove",
    "expect": "beach",
    "accept": ("beach",),
    "expect_attrs": ("hike",),
  },
  # --- Europe ---
  {
    "label": "Eiffel Tower",
    "region": "Europe",
    "tier": "famous",
    "caption": "📍 Eiffel Tower, Paris, France — book summit tickets online. Best photos from Trocadéro at dusk.",
    "place_name": "Eiffel Tower",
    "expect": "landmark",
    "accept": ("landmark",),
    "expect_attrs": ("viewpoint",),
  },
  {
    "label": "Colosseum",
    "region": "Europe",
    "tier": "famous",
    "caption": "📍 Colosseum, Rome, Italy — ancient amphitheater. Combined ticket with Forum saves time.",
    "place_name": "Colosseum",
    "expect": "landmark",
    "accept": ("landmark", "museum"),
    "expect_attrs": (),
  },
  {
    "label": "Sagrada Familia",
    "region": "Europe",
    "tier": "famous",
    "caption": "📍 Sagrada Familia, Barcelona, Spain — Gaudí basilica still under construction. Towers are worth the climb.",
    "place_name": "Sagrada Familia",
    "expect": "landmark",
    "accept": ("landmark", "museum"),
    "expect_attrs": (),
  },
  {
    "label": "Louvre",
    "region": "Europe",
    "tier": "famous",
    "caption": "📍 Louvre Museum, Paris, France — go Wednesday evening when it's quieter. Mona Lisa is always crowded.",
    "place_name": "Louvre Museum",
    "expect": "museum",
    "accept": ("museum",),
    "expect_attrs": (),
  },
  {
    "label": "Alfama",
    "region": "Europe",
    "tier": "famous",
    "caption": "📍 Alfama, Lisbon, Portugal — old hillside neighborhood with fado bars and miradouros. Get lost in the alleys.",
    "place_name": "Alfama",
    "expect": "neighborhood",
    "accept": ("neighborhood",),
    "expect_attrs": (),
  },
  {
    "label": "Plitvice Lakes",
    "region": "Europe",
    "tier": "famous",
    "caption": "📍 Plitvice Lakes National Park, Croatia — boardwalks over turquoise lakes and waterfalls. Enter from Entrance 2.",
    "place_name": "Plitvice Lakes National Park",
    "expect": "park",
    "accept": ("park", "waterfall"),
    "expect_attrs": (),
  },
  {
    "label": "Trolltunga",
    "region": "Europe",
    "tier": "hidden",
    "caption": "📍 Trolltunga, Norway — long day hike to the rock tongue above the fjord. Start before dawn in summer.",
    "place_name": "Trolltunga",
    "expect": "hike",
    "accept": ("hike",),
    "expect_attrs": ("viewpoint",),
  },
  {
    "label": "Neist Point",
    "region": "Europe",
    "tier": "hidden",
    "caption": "📍 Neist Point, Isle of Skye, Scotland — lighthouse viewpoint for sunset over the cliffs; short walk from the car park.",
    "place_name": "Neist Point",
    "expect": "viewpoint",
    "accept": ("viewpoint", "landmark"),
    "expect_attrs": (),
    "expect_attrs_any": (("hike",),),
  },
  # --- Asia ---
  {
    "label": "Taj Mahal",
    "region": "Asia",
    "tier": "famous",
    "caption": "📍 Taj Mahal, Agra, India — marble mausoleum. Sunrise tickets sell out — book early.",
    "place_name": "Taj Mahal",
    "expect": "landmark",
    "accept": ("landmark", "museum"),
    "expect_attrs": (),
  },
  {
    "label": "Angkor Wat",
    "region": "Asia",
    "tier": "famous",
    "caption": "📍 Angkor Wat, Siem Reap, Cambodia — temple complex at sunrise. Multi-day pass is worth it.",
    "place_name": "Angkor Wat",
    "expect": "landmark",
    "accept": ("landmark", "park", "museum"),
    "expect_attrs": (),
  },
  {
    "label": "Mount Fuji",
    "region": "Asia",
    "tier": "famous",
    "caption": "📍 Mount Fuji, Japan — climb in July–August only. Start from the 5th station overnight for the summit sunrise.",
    "place_name": "Mount Fuji",
    "expect": "hike",
    "accept": ("hike",),
    "expect_attrs": (),
    "expect_attrs_any": (("viewpoint", "summit"),),
  },
  {
    "label": "Fushimi Inari",
    "region": "Asia",
    "tier": "famous",
    "caption": "📍 Fushimi Inari Shrine, Kyoto, Japan — thousands of torii gates up the mountain trail. Go early morning.",
    "place_name": "Fushimi Inari Shrine",
    "expect": "landmark",
    "accept": ("landmark", "hike"),
    "expect_attrs": (),
  },
  {
    "label": "Ha Long Bay",
    "region": "Asia",
    "tier": "famous",
    "caption": "📍 Ha Long Bay, Vietnam — overnight cruise among limestone karsts. Pick a mid-size boat.",
    "place_name": "Ha Long Bay",
    "expect": "park",
    "accept": ("park", "viewpoint", "landmark"),
    "expect_attrs": (),
  },
  {
    "label": "Tiger's Nest",
    "region": "Asia",
    "tier": "hidden",
    "caption": "📍 Paro Taktsang (Tiger's Nest), Bhutan — cliffside monastery hike. Horses available for part of the climb.",
    "place_name": "Paro Taktsang",
    "expect": "hike",
    "accept": ("hike", "landmark"),
    "expect_attrs": ("viewpoint",),
  },
  {
    "label": "Railay Beach",
    "region": "Asia",
    "tier": "hidden",
    "caption": "📍 Railay Beach, Krabi, Thailand — beach only reachable by longtail boat, limestone cliffs for climbing.",
    "place_name": "Railay Beach",
    "expect": "beach",
    "accept": ("beach",),
    "expect_attrs": (),
  },
  # --- Africa / Middle East ---
  {
    "label": "Table Mountain",
    "region": "Africa",
    "tier": "famous",
    "caption": "📍 Table Mountain, Cape Town, South Africa — cable car or Platteklip Gorge hike to the flat summit views. Check wind closures.",
    "place_name": "Table Mountain",
    "expect": "hike",
    "accept": ("hike", "landmark", "viewpoint"),
    "expect_attrs": ("viewpoint",),
  },
  {
    "label": "Victoria Falls",
    "region": "Africa",
    "tier": "famous",
    "caption": "📍 Victoria Falls, Zimbabwe/Zambia — walk the rainforest trail for spray views of the waterfall. Bring a poncho.",
    "place_name": "Victoria Falls",
    "expect": "waterfall",
    "accept": ("waterfall",),
    "expect_attrs": (),
    "expect_attrs_any": (("hike", "viewpoint"),),
  },
  {
    "label": "Pyramids of Giza",
    "region": "Africa",
    "tier": "famous",
    "caption": "📍 Great Pyramid of Giza, Egypt — go at opening. Camel photos are touristy but the plateau views are real.",
    "place_name": "Great Pyramid of Giza",
    "expect": "landmark",
    "accept": ("landmark",),
    "expect_attrs": (),
  },
  {
    "label": "Petra",
    "region": "Middle East",
    "tier": "famous",
    "caption": "📍 Petra, Jordan — hike the Siq to the Treasury, then up to the Monastery. Two days if you can.",
    "place_name": "Petra",
    "expect": "landmark",
    "accept": ("landmark", "hike"),
    "expect_attrs": (),
  },
  {
    "label": "Wadi Rum",
    "region": "Middle East",
    "tier": "famous",
    "caption": "📍 Wadi Rum, Jordan — desert protected area with jeep tours and Bedouin camps under the stars.",
    "place_name": "Wadi Rum",
    "expect": "park",
    "accept": ("park", "landmark"),
    "expect_attrs": (),
  },
  # --- Food / stay / market (type coverage) ---
  {
    "label": "Tsukiji Outer Market",
    "region": "Asia",
    "tier": "famous",
    "caption": "📍 Tsukiji Outer Market, Tokyo, Japan — street food and knife shops. Try tamagoyaki from a stall.",
    "place_name": "Tsukiji Outer Market",
    "expect": "market",
    "accept": ("market",),
    "expect_attrs": (),
  },
  {
    "label": "Cafe Central Vienna",
    "region": "Europe",
    "tier": "famous",
    "caption": "📍 Café Central, Vienna, Austria — classic Viennese coffeehouse. Order melange and apfelstrudel.",
    "place_name": "Café Central",
    "expect": "cafe",
    "accept": ("cafe", "restaurant"),
    "expect_attrs": (),
  },
  {
    "label": "Noma Copenhagen",
    "region": "Europe",
    "tier": "famous",
    "caption": "📍 Noma, Copenhagen, Denmark — reservation-only tasting menu restaurant. Book months ahead.",
    "place_name": "Noma",
    "expect": "restaurant",
    "accept": ("restaurant",),
    "expect_attrs": (),
  },
  {
    "label": "Aman Tokyo",
    "region": "Asia",
    "tier": "famous",
    "caption": "📍 Aman Tokyo, Japan — quiet luxury hotel above Otemachi with onsen and city views.",
    "place_name": "Aman Tokyo",
    "expect": "hotel",
    "accept": ("hotel",),
    "expect_attrs": (),
  },
  {
    "label": "Old Faithful",
    "region": "Americas",
    "tier": "famous",
    "caption": "📍 Old Faithful, Yellowstone National Park, Wyoming — geyser erupts about every 90 minutes. Stay for two cycles.",
    "place_name": "Old Faithful",
    "expect": "landmark",
    "accept": ("landmark", "viewpoint", "park"),
    "expect_attrs": (),
  },
  {
    "label": "Lake Louise",
    "region": "Americas",
    "tier": "famous",
    "caption": "📍 Lake Louise, Banff National Park, Canada — turquoise alpine lake with canoe rentals and mountain reflections from the shore.",
    "place_name": "Lake Louise",
    "expect": "viewpoint",
    "accept": ("viewpoint", "park", "landmark"),
    "expect_attrs": (),
  },
]


def _normalize(name: str) -> str:
  return name.strip().lower()


def _match_place(extracted_places: tuple, target: str):
  target_key = _normalize(target)
  for place in extracted_places:
    name = _normalize(place.place_name)
    if target_key in name or name in target_key:
      return place
  tokens = set(target_key.replace("'", "").split())
  best = None
  best_score = 0
  for place in extracted_places:
    name_tokens = set(_normalize(place.place_name).replace("'", "").split())
    score = len(tokens & name_tokens)
    if score > best_score:
      best = place
      best_score = score
  if best_score >= max(1, len(tokens) // 2):
    return best
  return None


def _expected_attrs_for_category(case: dict, category: str | None) -> tuple[str, ...]:
  """Attrs required only when they are allowlisted for the winning category."""
  from travelplanner.categories import ATTRIBUTES_BY_CATEGORY

  if category is None:
    return ()
  allowed = set(ATTRIBUTES_BY_CATEGORY.get(category, ()))
  return tuple(attr for attr in case.get("expect_attrs", ()) if attr in allowed)


def _optional_attr_groups(case: dict, category: str | None) -> list[tuple[str, ...]]:
  """Each group is satisfied if ≥1 allowlisted member is present."""
  from travelplanner.categories import ATTRIBUTES_BY_CATEGORY

  if category is None:
    return []
  allowed = set(ATTRIBUTES_BY_CATEGORY.get(category, ()))
  groups: list[tuple[str, ...]] = []
  for group in case.get("expect_attrs_any", ()):
    filtered = tuple(attr for attr in group if attr in allowed)
    if filtered:
      groups.append(filtered)
  return groups


def run() -> int:
  from travelplanner import settings
  from travelplanner.extract import ReelBundle, fetch_places_from_reel

  if not settings.openai_api_key():
    print("ERROR: OPENAI_API_KEY required", file=sys.stderr)
    return 2

  print(f"model: {settings.openai_model()}")
  print(f"cases: {len(CASES)}")

  results: list[dict] = []
  pass_n = fail_n = miss_n = 0
  attr_fail_n = 0

  for index, case in enumerate(CASES, 1):
    label = case["label"]
    print(f"\n[{index}/{len(CASES)}] {label}", flush=True)
    started = time.time()
    extraction = fetch_places_from_reel(ReelBundle(caption=case["caption"]))
    elapsed = time.time() - started

    matched = _match_place(extraction.places, case["place_name"])
    names = [p.place_name for p in extraction.places]
    accept = set(case.get("accept") or (case["expect"],))

    if matched is None:
      verdict = "MISS"
      miss_n += 1
      got_category = None
      got_attrs: list[str] = []
      reasons = [f"place not extracted; got={names}"]
      missing_attrs: list[str] = []
    else:
      got_category = matched.category
      got_attrs = list(matched.attributes)
      reasons = []
      missing_attrs = []

      if got_category not in accept:
        verdict = "FAIL"
        fail_n += 1
        reasons.append(
          f"category got={got_category!r} expect={case['expect']!r} accept={sorted(accept)}"
        )
      else:
        if got_category != case["expect"]:
          reasons.append(f"accepted alt ({case['expect']}→{got_category})")
        required_attrs = _expected_attrs_for_category(case, got_category)
        missing_attrs = [attr for attr in required_attrs if attr not in got_attrs]
        for group in _optional_attr_groups(case, got_category):
          if not any(attr in got_attrs for attr in group):
            missing_attrs.append(f"any_of{list(group)}")
        if missing_attrs:
          verdict = "FAIL"
          fail_n += 1
          attr_fail_n += 1
          reasons.append(f"missing attrs={missing_attrs} got={got_attrs}")
        else:
          verdict = "PASS"
          pass_n += 1

    print(
      f"  {verdict:4} category={got_category!r} attrs={got_attrs} "
      f"places={names} ({elapsed:.1f}s)",
      flush=True,
    )
    if reasons:
      print(f"       {'; '.join(reasons)}", flush=True)

    results.append(
      {
        "label": label,
        "region": case["region"],
        "tier": case["tier"],
        "place_name": case["place_name"],
        "expect": case["expect"],
        "accept": sorted(accept),
        "expect_attrs": list(case.get("expect_attrs", ())),
        "got_category": got_category,
        "got_attributes": got_attrs,
        "missing_attrs": missing_attrs,
        "extracted_names": names,
        "verdict": verdict,
        "reasons": reasons,
        "elapsed_s": round(elapsed, 1),
      }
    )

  print("\n" + "=" * 60)
  print(
    f"SUMMARY: {len(CASES)} cases — PASS={pass_n} FAIL={fail_n} MISS={miss_n} "
    f"(attr-related fails={attr_fail_n}, {100 * pass_n / len(CASES):.0f}% pass)"
  )
  print("=" * 60)

  by_region: dict[str, dict[str, int]] = {}
  for row in results:
    bucket = by_region.setdefault(row["region"], {"PASS": 0, "FAIL": 0, "MISS": 0})
    bucket[row["verdict"]] += 1
  for region, counts in sorted(by_region.items()):
    total = sum(counts.values())
    print(f"  {region:12} PASS={counts['PASS']} FAIL={counts['FAIL']} MISS={counts['MISS']} / {total}")

  failures = [r for r in results if r["verdict"] != "PASS"]
  if failures:
    print("\nFailures / misses:")
    for row in failures:
      print(
        f"  - {row['label']}: {row['verdict']} "
        f"got={row['got_category']!r} attrs={row['got_attributes']} "
        f"({'; '.join(row['reasons'])})"
      )

  OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
  payload = {
    "model": settings.openai_model(),
    "summary": {
      "total": len(CASES),
      "pass": pass_n,
      "fail": fail_n,
      "miss": miss_n,
      "attr_fail": attr_fail_n,
      "pass_rate": round(pass_n / len(CASES), 3),
    },
    "by_region": by_region,
    "results": results,
  }
  OUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
  print(f"\nWrote {OUT_PATH}")
  return 0 if fail_n == 0 and miss_n == 0 else 1


if __name__ == "__main__":
  raise SystemExit(run())
