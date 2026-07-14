#!/usr/bin/env python3
"""Live validation suite for places locate (Nominatim + optional LLM pick).

Usage:
  source .venv/bin/activate
  set -a && source .env && set +a   # needs network; OPENAI_API_KEY optional but recommended
  python3 scripts/validate_locate_v3.py
  python3 scripts/validate_locate_v3.py --compare   # also run legacy/v2/v3 compare on hard cases
  python3 scripts/validate_locate_v3.py --unit-only # pytest only

Writes docs/locate-v3-global-validation.json (live run).
"""

from __future__ import annotations

import argparse
import json
import math
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "docs" / "locate-v3-global-validation.json"

# (label, PlaceMention kwargs, expect_name substring, expect_near (lat,lon,max_km) | None, reject_name | None)
CASES: list[dict] = [
  {
    "label": "Misery Ridge @ Smith Rock",
    "mention": {
      "place_name": "Misery Ridge",
      "parent_place_name": "Smith Rock State Park",
      "state_province": "Oregon",
      "country": "USA",
    },
    "expect_name": "misery ridge",
    "expect_near": (44.3705, -121.1410, 5),
  },
  {
    "label": "Angel's Landing @ Zion",
    "mention": {
      "place_name": "Angel's Landing",
      "parent_place_name": "Zion National Park",
      "state_province": "Utah",
      "country": "USA",
    },
    "expect_name": "angel",
    "expect_near": (37.2693, -112.9480, 5),
    "reject_name": "drive",
  },
  {
    "label": "Old Faithful @ Yellowstone",
    "mention": {
      "place_name": "Old Faithful",
      "parent_place_name": "Yellowstone National Park",
      "state_province": "Wyoming",
      "country": "USA",
    },
    "expect_name": "old faithful",
    "expect_near": (44.4605, -110.8281, 2),
    "reject_name": "inn",
  },
  {
    "label": "Smith Rock + coords",
    "mention": {
      "place_name": "Smith Rock",
      "latitude": 44.365,
      "longitude": -121.138,
      "state_province": "Oregon",
      "country": "USA",
    },
    "expect_name": "smith rock",
    "expect_near": (44.365, -121.14, 2),
    "reject_name": "crooked river",
  },
  {
    "label": "Haystack Rock @ Cannon Beach",
    "mention": {
      "place_name": "Haystack Rock",
      "parent_place_name": "Cannon Beach",
      "state_province": "Oregon",
      "country": "USA",
    },
    "expect_name": "haystack",
    "expect_near": (45.8844, -123.9684, 2),
  },
  {
    "label": "Multnomah Falls OR",
    "mention": {"place_name": "Multnomah Falls", "state_province": "Oregon", "country": "USA"},
    "expect_name": "multnomah",
    "expect_near": (45.576, -122.115, 2),
  },
  {
    "label": "Lake Louise @ Banff",
    "mention": {
      "place_name": "Lake Louise",
      "parent_place_name": "Banff National Park",
      "country": "Canada",
    },
    "expect_name": "louise",
    "expect_near": (51.425, -116.177, 15),
  },
  {
    "label": "Moraine Lake @ Banff",
    "mention": {
      "place_name": "Moraine Lake",
      "parent_place_name": "Banff National Park",
      "country": "Canada",
    },
    "expect_name": "moraine",
    "expect_near": (51.322, -116.186, 10),
  },
  {
    "label": "CN Tower Toronto",
    "mention": {"place_name": "CN Tower", "city": "Toronto", "country": "Canada"},
    "expect_name": "cn tower",
    "expect_near": (43.6426, -79.3871, 2),
  },
  {
    "label": "Banff Canada",
    "mention": {"place_name": "Banff", "country": "Canada"},
    "expect_name": "banff",
    "expect_near": (51.175, -115.572, 10),
  },
  {
    "label": "Eiffel Tower France",
    "mention": {"place_name": "Eiffel Tower", "country": "France"},
    "expect_name": "eiffel",
    "expect_near": (48.8583, 2.2945, 1),
  },
  {
    "label": "Colosseum Rome",
    "mention": {"place_name": "Colosseum", "city": "Rome", "country": "Italy"},
    "expect_name": "colosseum",
    "expect_near": (41.8902, 12.4922, 2),
  },
  {
    "label": "Sagrada Familia Barcelona",
    "mention": {"place_name": "Sagrada Familia", "city": "Barcelona", "country": "Spain"},
    "expect_name": "sagrada",
    "expect_near": (41.4036, 2.1744, 2),
  },
  {
    "label": "Matterhorn Switzerland",
    "mention": {"place_name": "Matterhorn", "country": "Switzerland"},
    "expect_name": "matterhorn",
    "expect_near": (45.9763, 7.6586, 10),
  },
  {
    "label": "Stonehenge UK",
    "mention": {"place_name": "Stonehenge", "country": "United Kingdom"},
    "expect_name": "stonehenge",
    "expect_near": (51.1789, -1.8262, 5),
  },
  {
    "label": "Acropolis Athens",
    "mention": {"place_name": "Acropolis", "city": "Athens", "country": "Greece"},
    "expect_name": "acropolis",
    "expect_near": (37.9715, 23.7267, 3),
  },
  {
    "label": "Mount Fuji Japan",
    "mention": {"place_name": "Mount Fuji", "country": "Japan"},
    "expect_name": "fuji",
    "expect_near": (35.3606, 138.7274, 20),
  },
  {
    "label": "Taj Mahal India",
    "mention": {"place_name": "Taj Mahal", "city": "Agra", "country": "India"},
    "expect_name": "taj",
    "expect_near": (27.1751, 78.0421, 5),
  },
  {
    "label": "Angkor Wat Cambodia",
    "mention": {"place_name": "Angkor Wat", "country": "Cambodia"},
    "expect_name": "angkor",
    "expect_near": (13.4125, 103.8670, 10),
  },
  {
    "label": "Sydney Opera House",
    "mention": {
      "place_name": "Sydney Opera House",
      "city": "Sydney",
      "country": "Australia",
    },
    "expect_name": "opera",
    "expect_near": (-33.8568, 151.2153, 2),
  },
  {
    "label": "Uluru Australia",
    "mention": {"place_name": "Uluru", "country": "Australia"},
    "expect_name": "uluru",
    "expect_near": (-25.3444, 131.0369, 15),
  },
  {
    "label": "Machu Picchu Peru",
    "mention": {"place_name": "Machu Picchu", "country": "Peru"},
    "expect_name": "machu",
    "expect_near": (-13.1631, -72.5450, 10),
  },
  {
    "label": "Christ the Redeemer Brazil",
    "mention": {
      "place_name": "Christ the Redeemer",
      "city": "Rio de Janeiro",
      "country": "Brazil",
    },
    "expect_name": "christ",
    "expect_near": (-22.9519, -43.2105, 5),
  },
  {
    "label": "Table Mountain Cape Town",
    "mention": {
      "place_name": "Table Mountain",
      "city": "Cape Town",
      "country": "South Africa",
    },
    "expect_name": "table mountain",
    "expect_near": (-33.9628, 18.4098, 10),
  },
  {
    "label": "Pyramids of Giza",
    "mention": {"place_name": "Great Pyramid of Giza", "country": "Egypt"},
    "expect_name": "pyramid",
    "expect_near": (29.9792, 31.1342, 5),
  },
  {
    "label": "Petra Jordan",
    "mention": {"place_name": "Petra", "country": "Jordan"},
    "expect_name": "petra",
    "expect_near": (30.3285, 35.4444, 20),
  },
  {
    "label": "Torres del Paine Chile",
    "mention": {"place_name": "Torres del Paine", "country": "Chile"},
    "expect_name": "torres",
    "expect_near": (-50.9423, -73.4068, 80),
  },
  {
    "label": "Cannon Beach OR",
    "mention": {
      "place_name": "Cannon Beach",
      "state_province": "Oregon",
      "country": "USA",
    },
    "expect_name": "cannon beach",
    "expect_near": (45.89, -123.96, 10),
  },
]

HARD_COMPARE_LABELS = {
  "Misery Ridge @ Smith Rock",
  "Angel's Landing @ Zion",
  "Old Faithful @ Yellowstone",
  "Smith Rock + coords",
  "Banff Canada",
  "Sydney Opera House",
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
  earth_km = 6371.0
  phi1, phi2 = math.radians(lat1), math.radians(lat2)
  d_phi = math.radians(lat2 - lat1)
  d_lambda = math.radians(lon2 - lon1)
  a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
  return 2 * earth_km * math.asin(math.sqrt(a))


def run_unit() -> int:
  import subprocess

  return subprocess.call(
    [sys.executable, "-m", "pytest", "tests/test_places_locate.py", "tests/test_places_resolve.py", "-q"],
    cwd=ROOT,
  )


def run_live() -> int:
  from travelplanner import settings
  from travelplanner.place_hints import PlaceMention
  from travelplanner.places.locate import locate_mention_debug

  print(f"OPENAI configured: {bool(settings.openai_api_key())}")
  print(f"model: {settings.openai_model()}")

  results: list[dict] = []
  pass_n = fail_n = llm_used = 0

  for index, case in enumerate(CASES, 1):
    label = case["label"]
    mention = PlaceMention(**case["mention"])
    print(f"\n[{index}/{len(CASES)}] {label}", flush=True)
    started = time.time()
    try:
      debug = locate_mention_debug(mention)
    except Exception as exc:
      print(f"  ERROR {exc}", flush=True)
      results.append({"label": label, "verdict": "ERROR", "error": str(exc)})
      fail_n += 1
      continue

    elapsed = time.time() - started
    location = debug.location
    name = location.display_name if location else None
    used_llm = any("llm" in note.lower() for note in debug.notes)
    if used_llm:
      llm_used += 1

    lat_lon = "-"
    if location and location.latitude is not None and location.longitude is not None:
      lat_lon = f"{location.latitude:.4f},{location.longitude:.4f}"
    conf = debug.match_confidence
    conf_s = f"{conf:.2f}" if conf is not None else "-"
    print(
      f"  {debug.status:14} {name or '-'} @{lat_lon} conf={conf_s} "
      f"cat={debug.category} llm={used_llm} ({elapsed:.1f}s)",
      flush=True,
    )

    verdict = "PASS"
    reasons: list[str] = []
    if debug.status == "unresolved" or location is None:
      verdict = "FAIL"
      reasons.append("unresolved / no pin")
    else:
      reject = case.get("reject_name")
      if reject and reject in (name or "").lower():
        verdict = "FAIL"
        reasons.append(f"rejected token '{reject}'")
      expect_near = case.get("expect_near")
      if expect_near and location.latitude is not None and location.longitude is not None:
        expected_lat, expected_lon, max_km = expect_near
        distance_km = _haversine_km(
          expected_lat, expected_lon, location.latitude, location.longitude
        )
        reasons.append(f"dist={distance_km:.1f}km")
        if distance_km > max_km:
          verdict = "FAIL"
          reasons.append(f"too far (>{max_km}km)")

    if verdict == "PASS":
      pass_n += 1
    else:
      fail_n += 1
    print(f"  → {verdict}  {'; '.join(reasons)}", flush=True)

    results.append(
      {
        "label": label,
        "country": mention.country,
        "status": debug.status,
        "name": name,
        "lat": location.latitude if location else None,
        "lon": location.longitude if location else None,
        "confidence": conf,
        "category": debug.category,
        "llm_used": used_llm,
        "llm_notes": [note for note in debug.notes if "llm" in note.lower()][:3],
        "verdict": verdict,
        "reasons": reasons,
        "elapsed_s": round(elapsed, 1),
      }
    )

  print("\n" + "=" * 60)
  print(f"SUMMARY: {len(CASES)} cases — PASS={pass_n} FAIL={fail_n}  LLM invoked on {llm_used}")
  print("=" * 60)
  OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
  OUT_PATH.write_text(json.dumps(results, indent=2), encoding="utf-8")
  print(f"Wrote {OUT_PATH}")
  return 0 if fail_n == 0 else 1


def run_compare() -> int:
  print("\n--- Compare skipped: single locate pipeline (legacy/v2 removed) ---")
  return 0


def main() -> int:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--unit-only", action="store_true", help="Run pytest only")
  parser.add_argument(
    "--compare",
    action="store_true",
    help="Deprecated no-op (multi-pipeline compare removed)",
  )
  parser.add_argument("--skip-unit", action="store_true", help="Skip pytest before live run")
  args = parser.parse_args()

  if args.unit_only:
    return run_unit()

  if not args.skip_unit:
    unit_code = run_unit()
    if unit_code != 0:
      return unit_code

  live_code = run_live()
  if args.compare:
    compare_code = run_compare()
    return live_code or compare_code
  return live_code


if __name__ == "__main__":
  raise SystemExit(main())
