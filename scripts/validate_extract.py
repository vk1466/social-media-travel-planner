#!/usr/bin/env python3
"""Live validation of place extraction against real stored posts.

Uses caption + existing reel_summary (+ hashtags) as extract inputs — the
signals we already have without re-fetching Instagram.

Checks (generic, no per-reel expectations):
  - grounded: extracted place names appear in caption/hashtags/location evidence
  - pin recall: 📍 caption markers are covered by extracted names
  - detail/tip richness vs previously stored extraction
  - category coverage
  - repeatability: same post extracted N times yields the same names/categories

Usage:
  source .venv/bin/activate
  set -a && source .env && set +a
  DYNAMODB_REGION=us-west-2 python3 scripts/validate_extract.py
  DYNAMODB_REGION=us-west-2 python3 scripts/validate_extract.py --repeat 2

Writes docs/extract-validation.json
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = ROOT / "docs" / "extract-validation.json"

_PIN_RE = re.compile(
  r"(?:📍|📌)\s*([^\n📍📌]+?)(?=\s*(?:\n|📍|📌|$))",
)
_HASHTAG_RE = re.compile(r"#([A-Za-z0-9_]+)")


def _norm(text: str) -> str:
  cleaned = unicodedata.normalize("NFKC", text)
  cleaned = cleaned.replace("’", "'").replace("‘", "'").replace("`", "'")
  cleaned = re.sub(r"[^a-z0-9\s]+", " ", cleaned.lower())
  return re.sub(r"\s+", " ", cleaned).strip()


def _name_in_evidence(place_name: str, evidence_norm: str) -> bool:
  needle = _norm(place_name)
  if not needle:
    return False
  if needle in evidence_norm:
    return True
  # Allow short/long partials for "Sand Harbor" vs "Sand Harbor State Park".
  tokens = needle.split()
  if len(tokens) >= 2 and all(token in evidence_norm for token in tokens):
    return True
  return False


def _caption_pins(caption: str) -> list[str]:
  pins: list[str] = []
  for match in _PIN_RE.finditer(caption or ""):
    raw = match.group(1).strip()
    # Keep the leading place chunk before em-dash / pipe / fee markers.
    chunk = re.split(r"\s*[—\-–|💰🚗🥾]\s*", raw, maxsplit=1)[0].strip()
    chunk = chunk.strip(" .,:;")
    if chunk:
      pins.append(chunk)
  return pins


def _evidence_text(post) -> str:
  parts = [post.caption or ""]
  if post.reel_summary:
    # Summary is context only for the model; still include for reporting,
    # but groundedness uses name_evidence below (excludes summary).
    pass
  parts.extend(f"#{tag}" for tag in (post.hashtags or ()))
  for place in post.places or ():
    parts.append(place.place_name)
    if place.city:
      parts.append(place.city)
    if place.country:
      parts.append(place.country)
  return "\n".join(parts)


def _name_evidence(post) -> str:
  """Text that may legitimately introduce place names (not video summary)."""
  parts = [post.caption or ""]
  parts.extend(f"#{tag}" for tag in (post.hashtags or ()))
  for place in post.places or ():
    parts.append(place.place_name)
  # CamelCase hashtags often encode place names.
  for tag in post.hashtags or ():
    spaced = re.sub(r"([a-z])([A-Z])", r"\1 \2", tag)
    parts.append(spaced)
  return _norm("\n".join(parts))


def _pin_covered(pin: str, extracted_names: list[str]) -> bool:
  pin_n = _norm(pin)
  if not pin_n:
    return True
  for name in extracted_names:
    name_n = _norm(name)
    if pin_n in name_n or name_n in pin_n:
      return True
    pin_tokens = pin_n.split()
    name_tokens = name_n.split()
    if pin_tokens and name_tokens and pin_tokens[0] == name_tokens[0]:
      # Same leading proper name (handles "La Push Beach, Forks WA..." pins).
      if len(set(pin_tokens) & set(name_tokens)) >= min(2, len(name_tokens)):
        return True
  return False


def _tip_grounded(tip: str, source_norm: str) -> bool:
  tip_n = _norm(tip)
  if not tip_n:
    return True
  # Numeric / money facts are strong grounding signals.
  if re.search(r"\d", tip) and any(token in source_norm for token in tip_n.split() if token.isdigit() or "$" in tip):
    return True
  tokens = [t for t in tip_n.split() if len(t) > 2]
  if not tokens:
    return True
  overlap = sum(1 for t in tokens if t in source_norm)
  return overlap / len(tokens) >= 0.4


def _signature(extraction) -> list[tuple[str, str | None]]:
  """Stable comparison key for repeatability: sorted (name, category) pairs."""
  return sorted((place.place_name, place.category) for place in extraction.places)


JUDGE_PROMPT = (
  "You audit a travel-place extractor. You are given a reel CAPTION (plus an "
  "optional VIDEO SUMMARY and HASHTAGS) and the extractor's OUTPUT.\n\n"
  "Report three things, judging only from the given text:\n"
  "1. missed — pin-able travel places clearly named in the caption/hashtags that "
  "the extractor omitted. A pin-able place is somewhere a traveler visits: park, "
  "trail, lake, waterfall, beach, viewpoint, landmark, museum, market, "
  "restaurant, cafe, bar, hotel, city, neighborhood. Do NOT report vague regions "
  "(a coast, state, province, country), lodging-only bases, or campgrounds that "
  "are not the featured destination.\n"
  "2. wrong_category — extracted entries whose category is wrong. Give the "
  "correct category from the allowed list. Judge by what the place fundamentally "
  "IS: a named lake is a lake, named falls are a waterfall, a named trail is a "
  "hike, a named beach is a beach, a national/state park is a park.\n"
  "3. spurious — extracted names not supported anywhere in the given text.\n\n"
  "Be strict but fair. Only report a wrong_category when it is clearly wrong, not "
  "merely debatable.\n\n"
  "Allowed categories: {categories}"
)

def _judge_schema(categories: tuple[str, ...]) -> dict:
  """Force `expected` into the real enum so the judge can't invent categories."""
  return {
    "type": "object",
    "properties": {
      "missed": {"type": "array", "items": {"type": "string"}},
      "wrong_category": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "place_name": {"type": "string"},
            "assigned": {"type": ["string", "null"]},
            "expected": {"type": "string", "enum": list(categories)},
            "reason": {"type": "string"},
          },
          "required": ["place_name", "assigned", "expected", "reason"],
          "additionalProperties": False,
        },
      },
      "spurious": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["missed", "wrong_category", "spurious"],
    "additionalProperties": False,
  }


def _judge_post(post, extraction) -> dict:
  """Independent LLM audit of recall + category correctness for one post."""
  import os

  from travelplanner.categories import CATEGORIES
  from travelplanner.clients.openai import get_client

  client = get_client()
  output_lines = [
    f"- {place.place_name} [{place.category}]" for place in extraction.places
  ] or ["(none)"]
  sections = [f"CAPTION:\n{post.caption or ''}"]
  if post.reel_summary:
    sections.append(f"VIDEO SUMMARY:\n{post.reel_summary}")
  if post.hashtags:
    sections.append("HASHTAGS: " + " ".join(f"#{tag}" for tag in post.hashtags))
  sections.append("EXTRACTOR OUTPUT:\n" + "\n".join(output_lines))

  response = client.chat.completions.create(
    model=os.getenv("OPENAI_JUDGE_MODEL", "gpt-4o"),
    messages=[
      {"role": "system", "content": JUDGE_PROMPT.format(categories=", ".join(CATEGORIES))},
      {"role": "user", "content": "\n\n".join(sections)},
    ],
    response_format={
      "type": "json_schema",
      "json_schema": {
        "name": "extract_audit",
        "strict": True,
        "schema": _judge_schema(CATEGORIES),
      },
    },
    temperature=0,
  )
  audit = json.loads(response.choices[0].message.content)
  # The judge sometimes echoes a place with expected == assigned; that is agreement.
  audit["wrong_category"] = [
    item for item in audit["wrong_category"] if item["expected"] != item["assigned"]
  ]
  return audit


def run(repeat: int = 1, judge: bool = False) -> int:
  import os

  os.environ.setdefault("DYNAMODB_REGION", os.getenv("DYNAMODB_REGION", "us-west-2"))

  from travelplanner import settings
  from travelplanner.extract import ReelBundle, fetch_places_from_reel
  from travelplanner.store import load_all_posts

  if not settings.openai_api_key():
    print("ERROR: OPENAI_API_KEY required", file=sys.stderr)
    return 2

  posts = [p for p in load_all_posts() if (p.caption or "").strip()]
  print(f"model: {settings.openai_model()} temperature: {settings.openai_temperature()}")
  print(f"posts with captions: {len(posts)} (repeat={repeat})")

  rows: list[dict] = []
  totals = {
    "posts": 0,
    "extracted_places": 0,
    "stored_places": 0,
    "ungrounded_places": 0,
    "pins_total": 0,
    "pins_covered": 0,
    "with_category": 0,
    "with_details": 0,
    "with_tips": 0,
    "ungrounded_tips": 0,
    "tips_total": 0,
    "repeat_checked": 0,
    "repeat_stable": 0,
    "judge_missed": 0,
    "judge_wrong_category": 0,
    "judge_spurious": 0,
  }

  for index, post in enumerate(posts, 1):
    print(f"\n[{index}/{len(posts)}] {post.post_id}", flush=True)
    bundle = ReelBundle(
      caption=post.caption or "",
      hashtags=tuple(post.hashtags or ()),
      top_comments=tuple(post.top_comments or ()),
      location_tag=post.places[0] if post.places else None,
      video_summary=post.reel_summary,
    )
    started = time.time()
    extraction = fetch_places_from_reel(bundle)
    elapsed = time.time() - started

    drift: list[list[str]] = []
    for _ in range(max(0, repeat - 1)):
      rerun = fetch_places_from_reel(bundle)
      totals["repeat_checked"] += 1
      if _signature(rerun) == _signature(extraction):
        totals["repeat_stable"] += 1
      else:
        drift.append([f"{name} [{category}]" for name, category in _signature(rerun)])

    evidence = _name_evidence(post)
    source_norm = _norm(_evidence_text(post) + "\n" + (post.reel_summary or ""))
    pins = _caption_pins(post.caption or "")
    extracted_names = [place.place_name for place in extraction.places]

    ungrounded = [
      place.place_name
      for place in extraction.places
      if not _name_in_evidence(place.place_name, evidence)
    ]
    pins_hit = [pin for pin in pins if _pin_covered(pin, extracted_names)]
    pins_miss = [pin for pin in pins if not _pin_covered(pin, extracted_names)]

    tip_rows = []
    for place in extraction.places:
      for tip in place.tips:
        totals["tips_total"] += 1
        grounded = _tip_grounded(tip, source_norm)
        if not grounded:
          totals["ungrounded_tips"] += 1
        tip_rows.append({"place": place.place_name, "tip": tip, "grounded": grounded})

    audit: dict | None = None
    if judge:
      try:
        audit = _judge_post(post, extraction)
        totals["judge_missed"] += len(audit["missed"])
        totals["judge_wrong_category"] += len(audit["wrong_category"])
        totals["judge_spurious"] += len(audit["spurious"])
      except Exception as exc:  # judging is best-effort reporting, not a gate
        print(f"  judge failed: {exc}", file=sys.stderr)

    with_category = sum(1 for place in extraction.places if place.category)
    with_details = sum(1 for place in extraction.places if place.details)
    with_tips = sum(1 for place in extraction.places if place.tips)

    totals["posts"] += 1
    totals["extracted_places"] += len(extraction.places)
    totals["stored_places"] += len(post.extracted_places)
    totals["ungrounded_places"] += len(ungrounded)
    totals["pins_total"] += len(pins)
    totals["pins_covered"] += len(pins_hit)
    totals["with_category"] += with_category
    totals["with_details"] += with_details
    totals["with_tips"] += with_tips

    row = {
      "post_id": post.post_id,
      "elapsed_s": round(elapsed, 2),
      "stored_place_count": len(post.extracted_places),
      "extracted_place_count": len(extraction.places),
      "delta_vs_stored": len(extraction.places) - len(post.extracted_places),
      "pins": pins,
      "pins_covered": pins_hit,
      "pins_missed": pins_miss,
      "ungrounded_places": ungrounded,
      "repeat_drift": drift,
      "judge": audit,
      "reel_summary": extraction.reel_summary,
      "places": [
        {
          "place_name": place.place_name,
          "category": place.category,
          "attributes": list(place.attributes),
          "parent_place_name": place.parent_place_name,
          "parent_category": place.parent_category,
          "city": place.city,
          "state_province": place.state_province,
          "country": place.country,
          "details": place.details,
          "tips": list(place.tips),
          "grounded": place.place_name not in ungrounded,
        }
        for place in extraction.places
      ],
      "tip_grounding": tip_rows,
    }
    rows.append(row)

    judge_note = ""
    if audit is not None:
      judge_note = (
        f" judge_missed={audit['missed']}"
        f" judge_wrong={[(w['place_name'], w['assigned'], w['expected']) for w in audit['wrong_category']]}"
      )
    print(
      f"  places={len(extraction.places)} (stored={len(post.extracted_places)}) "
      f"pins={len(pins_hit)}/{len(pins)} ungrounded={ungrounded}{judge_note}",
      flush=True,
    )
    for place in extraction.places:
      print(
        f"    - {place.place_name!r} [{place.category}] "
        f"details={bool(place.details)} tips={len(place.tips)}",
        flush=True,
      )

  summary = {
    **totals,
    "pin_recall": (
      round(totals["pins_covered"] / totals["pins_total"], 3)
      if totals["pins_total"]
      else None
    ),
    "grounded_place_rate": (
      round(
        (totals["extracted_places"] - totals["ungrounded_places"])
        / totals["extracted_places"],
        3,
      )
      if totals["extracted_places"]
      else None
    ),
    "category_rate": (
      round(totals["with_category"] / totals["extracted_places"], 3)
      if totals["extracted_places"]
      else None
    ),
    "details_rate": (
      round(totals["with_details"] / totals["extracted_places"], 3)
      if totals["extracted_places"]
      else None
    ),
    "tips_rate": (
      round(totals["with_tips"] / totals["extracted_places"], 3)
      if totals["extracted_places"]
      else None
    ),
    "tip_grounded_rate": (
      round(
        (totals["tips_total"] - totals["ungrounded_tips"]) / totals["tips_total"],
        3,
      )
      if totals["tips_total"]
      else None
    ),
    "repeat_stable_rate": (
      round(totals["repeat_stable"] / totals["repeat_checked"], 3)
      if totals["repeat_checked"]
      else None
    ),
    "judge_recall": (
      round(
        totals["extracted_places"]
        / (totals["extracted_places"] + totals["judge_missed"]),
        3,
      )
      if judge and totals["extracted_places"]
      else None
    ),
    "judge_category_accuracy": (
      round(
        (totals["extracted_places"] - totals["judge_wrong_category"])
        / totals["extracted_places"],
        3,
      )
      if judge and totals["extracted_places"]
      else None
    ),
  }

  payload = {"summary": summary, "posts": rows}
  OUT_PATH.write_text(json.dumps(payload, indent=2) + "\n")
  print("\n=== summary ===")
  print(json.dumps(summary, indent=2))
  print(f"\nwrote {OUT_PATH}")
  return 0


if __name__ == "__main__":
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument(
    "--repeat",
    type=int,
    default=1,
    help="Extract each post this many times and report category/name drift",
  )
  parser.add_argument(
    "--judge",
    action="store_true",
    help="Audit recall + category correctness with an independent model",
  )
  args = parser.parse_args()
  raise SystemExit(run(repeat=args.repeat, judge=args.judge))
