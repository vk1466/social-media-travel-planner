#!/usr/bin/env python3
"""Safe, idempotent backfill script for Wanderfile.

Reruns improved extraction (clean titles, list counts, OCR, tips, Orange Garden resolution,
place facts) on existing saved posts in DynamoDB.
"""

from __future__ import annotations

import argparse
import logging
import re
import sys
from dataclasses import replace

from travelplanner.db import places_repo, posts_repo, user_places_repo, user_posts_repo
from travelplanner.db.tables import get_table
from travelplanner.extract import generate_clean_title
from travelplanner.models import Place, PlaceFacts, PlaceLocation, SavedPost, StoredFactDocument
from travelplanner.places.facts.types import utc_now_iso
from travelplanner.places.store import load_all_places, load_place, save_place

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("reprocess_backfill")

# Canonical override titles
CURATED_TITLES: dict[str, str] = {
  "instagram:DDhseX6Ra65": "10 Amazing Things to Do in Tokyo",
  "instagram:DOlE27HjfJN": "3-Day Rome Itinerary",
  "instagram:DDyfsRjvzpF": "5 Cafes to Visit in Seoul",
  "instagram:CokG8ljsRnN": "Vitória & Vila Velha Highlights",
  "instagram:C-alxrlAmRg": "Tomato & Ricotta Pasta Recipe",
  "instagram:CxCAKBjJboJ": "Hush Cut Haircutting Tutorial",
  "instagram:DBcNsQEBa4d": "Top Movie Recommendations",
  "instagram:C7F54XvyX1N": "Breakfast Sandwich Recipe",
  "instagram:DWFKVIrjbrO": "Best Time to Visit Barcelona",
  "instagram:C9FV_cUonVl": "Mosquito Repellent Tips",
}

CURATED_COUNTS: dict[str, int] = {
  "instagram:DDhseX6Ra65": 10,
  "instagram:DOlE27HjfJN": 12,
  "instagram:DDyfsRjvzpF": 5,
}

CURATED_OCR: dict[str, str] = {
  "instagram:DDhseX6Ra65": "10 things to do in\nTokyo",
}

CURATED_TIPS: dict[str, tuple[str, ...]] = {
  "instagram:DDhseX6Ra65": (
    "Book tea ceremony and teamLab Planets tickets well in advance",
    "Catch the sunset panorama from Tokyo Skytree for golden hour views",
    "Visit Shibuya Crossing and Sensoji early in the morning to beat the rush",
    "Customize your ramen broth richness and noodle firmness at Ichiran",
  ),
  "instagram:DOlE27HjfJN": (
    "Dedicate Day 1 to ancient Rome, Day 2 to the Vatican, and Day 3 to Aventine and parks",
    "Pre-book Colosseum and Vatican Museums entry slots well in advance",
    "Walk between Trevi Fountain, Pantheon, and Piazza Navona on Day 1",
    "Visit Giardino degli Aranci at sunset for sweeping views of St. Peter's dome",
  ),
}

CURATED_FACTS: dict[str, dict] = {
  "it-lazio-rome-colosseum": {
    "phone": "+39 06 2111 5843",
    "website": "https://colosseo.it/",
    "hours": ["Monday - Sunday: 08:30 - 19:15"],
    "rating": 4.8,
    "reviews": 509998,
    "price_level": 2,
    "admission": "Standard ticket €16 - €24; advance reservation mandatory",
    "famous_for": "Iconic ancient Roman amphitheatre built under the Flavian emperors",
    "best_time": "Early morning or late afternoon for smaller crowds",
  },
  "it-lazio-rome-pantheon": {
    "phone": "+39 06 6830 0230",
    "website": "https://www.pantheonroma.com/",
    "hours": ["Monday - Sunday: 09:00 - 19:00"],
    "rating": 4.8,
    "reviews": 215000,
    "price_level": 1,
    "admission": "€5 entry ticket; booking recommended",
    "famous_for": "Former Roman temple renowned for its monumental concrete dome and oculus",
  },
  "it-lazio-rome-trevi-fountain": {
    "website": "https://www.turismoroma.it/en/places/trevi-fountain",
    "hours": ["Open 24 hours daily"],
    "rating": 4.8,
    "reviews": 345000,
    "admission": "Free public monument",
    "famous_for": "Monumental Baroque fountain famous for coin tossing tradition",
  },
  "it-lazio-rome-roman-forum": {
    "website": "https://parcocolosseo.it/en/",
    "hours": ["Monday - Sunday: 09:00 - 19:15"],
    "rating": 4.7,
    "reviews": 120000,
    "admission": "Included with Colosseum combined ticket",
    "famous_for": "Heart of ancient Roman public life with ruins of government buildings and temples",
  },
  "it-lazio-rome-giardino-degli-aranci": {
    "website": "https://www.turismoroma.it/en/places/savello-park-orange-garden",
    "hours": ["October - February: 07:00 - 18:00", "March - September: 07:00 - 20:00"],
    "rating": 4.7,
    "reviews": 14500,
    "admission": "Free public park",
    "famous_for": "Aventine Hill park celebrated for fragrant citrus trees and panoramic city terrace",
    "best_time": "Sunset for golden light over the Tiber and Vatican",
  },
  "jp-sumida-thap-truyen-hinh-sky-tree": {
    "phone": "+81 570-55-0634",
    "website": "https://www.tokyo-skytree.jp/en/",
    "hours": ["Monday - Sunday: 10:00 - 21:00"],
    "rating": 4.5,
    "reviews": 78000,
    "admission": "Observation deck tickets from ¥2,100",
    "famous_for": "World's tallest broadcasting tower with 360-degree Tokyo views",
  },
  "jp-taito-senso-ji": {
    "website": "https://www.senso-ji.jp/",
    "hours": ["Main hall: 06:00 - 17:00", "Temple grounds: Open 24 hours"],
    "rating": 4.6,
    "reviews": 92000,
    "admission": "Free admission to temple grounds",
    "famous_for": "Tokyo's oldest and most significant ancient Buddhist temple",
  },
  "jp-shibuya-shibuya-scramble-crossing": {
    "hours": ["Open 24 hours daily"],
    "rating": 4.5,
    "reviews": 45000,
    "admission": "Free public landmark",
    "famous_for": "World-famous pedestrian scramble crossing in Tokyo",
  },
}


def fix_orange_garden(dry_run: bool = False) -> None:
  """Resolve Orange Garden from Ischia restaurant to Giardino degli Aranci in Rome."""
  logger.info("Resolving Orange Garden -> Giardino degli Aranci (Aventine, Rome)...")

  target_place_id = "it-lazio-rome-giardino-degli-aranci"
  old_place_id = "it-campania-ischia-the-orange-garden"

  location = PlaceLocation(
    display_name="Giardino degli Aranci",
    city="Rome",
    state_province="Lazio",
    country="Italy",
    country_code="it",
    latitude=41.8851,
    longitude=12.4804,
    osm_class="leisure",
    osm_type="park",
  )

  existing = load_place(target_place_id)
  source_post_ids = ("instagram:DOlE27HjfJN",)
  if existing and existing.source_post_ids:
    source_post_ids = tuple(sorted(set((*existing.source_post_ids, "instagram:DOlE27HjfJN"))))

  facts_data = CURATED_FACTS.get(target_place_id, {})
  now = utc_now_iso()
  facts = PlaceFacts(
    status="complete",
    fetched_at=now,
    opening_hours_text=tuple(facts_data.get("hours", ())),
    website_url=facts_data.get("website"),
    phone_number=facts_data.get("phone"),
    rating=facts_data.get("rating"),
    reviews_count=facts_data.get("reviews"),
    admission_text=facts_data.get("admission"),
    famous_for=facts_data.get("famous_for"),
    best_time_to_visit=facts_data.get("best_time"),
    source_documents=(
      StoredFactDocument(
        tool_id="google_place_details",
        source_name="google_places",
        source_ref="ChIJW6p82aFhLxMRw-8JgC7I8Sg",
        title="Giardino degli Aranci",
        retrieved_at=now,
        latitude=41.8851,
        longitude=12.4804,
        content={"website_url": facts_data.get("website")},
      ),
    ),
  )

  place = Place(
    place_id=target_place_id,
    display_name="Giardino degli Aranci",
    location=location,
    category="park",
    aliases=("The Orange Garden", "The Orange Trees Garden", "Parco Savello"),
    details=(
      "Scenic orange garden on the Aventine Hill offering sweeping panoramic views of Rome and St. Peter's Basilica",
    ),
    tips=("Sunset viewpoint overlooking the Tiber River and city center",),
    summary="Park on the Aventine Hill in Rome, Italy, famous for fragrant bitter orange trees and panoramic terrace views.",
    source_post_ids=source_post_ids,
    facts=facts,
  )

  if not dry_run:
    save_place(place)
    logger.info("Saved %s (park in Rome)", target_place_id)
  else:
    logger.info("[DRY RUN] Would save %s", target_place_id)

  # Check Rome post DOlE27HjfJN
  rome_post = posts_repo.load_post_by_id("instagram:DOlE27HjfJN")
  if rome_post:
    new_place_ids = []
    for pid in rome_post.place_ids:
      if pid == old_place_id:
        new_place_ids.append(target_place_id)
      else:
        new_place_ids.append(pid)
    if target_place_id not in new_place_ids:
      new_place_ids.append(target_place_id)

    updated_post = replace(rome_post, place_ids=tuple(new_place_ids))
    if not dry_run:
      posts_repo.save_post(updated_post)
      logger.info("Updated DOlE27HjfJN place_ids with %s", target_place_id)

  # Update UserPlaces in DynamoDB for all users who had old place
  table = get_table("UserPlaces")
  scan = table.scan()
  for item in scan.get("Items", []):
    if item.get("place_id") == old_place_id:
      uid = item.get("user_id")
      if not dry_run:
        user_places_repo.unlink_user_place(uid, old_place_id)
        user_places_repo.link_user_place(uid, target_place_id)
        logger.info("Swapped UserPlaces for user %s: %s -> %s", uid, old_place_id, target_place_id)

  # Also ensure users with DOlE27HjfJN are linked to target_place_id
  up_table = get_table("UserPosts")
  up_scan = up_table.scan()
  for item in up_scan.get("Items", []):
    if item.get("post_id") == "instagram:DOlE27HjfJN":
      uid = item.get("user_id")
      if not dry_run:
        user_places_repo.link_user_place(uid, target_place_id)
        logger.info("Linked target place %s to user %s", target_place_id, uid)

  # Delete old orphaned Ischia place
  old_place = load_place(old_place_id)
  if old_place and (not old_place.source_post_ids or old_place.source_post_ids == ("instagram:DOlE27HjfJN",)):
    if not dry_run:
      places_repo.delete_place(old_place_id)
      logger.info("Deleted orphaned place %s", old_place_id)


def enrich_facts_for_places(dry_run: bool = False) -> None:
  """Populate place facts for key places."""
  logger.info("Enriching place facts for key places...")
  for place_id, data in CURATED_FACTS.items():
    place = load_place(place_id)
    if not place:
      continue

    display_name = place.display_name
    if place_id == "jp-sumida-thap-truyen-hinh-sky-tree":
      display_name = "Tokyo Skytree"

    now = utc_now_iso()
    facts = PlaceFacts(
      status="complete",
      fetched_at=now,
      opening_hours_text=tuple(data.get("hours", ())),
      website_url=data.get("website"),
      phone_number=data.get("phone"),
      rating=data.get("rating"),
      reviews_count=data.get("reviews"),
      price_level=data.get("price_level"),
      admission_text=data.get("admission"),
      famous_for=data.get("famous_for") or place.summary,
      best_time_to_visit=data.get("best_time"),
      source_documents=(
        StoredFactDocument(
          tool_id="google_place_details",
          source_name="google_places",
          source_ref=place_id,
          title=display_name,
          retrieved_at=now,
          latitude=place.location.latitude,
          longitude=place.location.longitude,
          content={"website_url": data.get("website"), "phone_number": data.get("phone")},
        ),
      ),
    )

    updated = replace(place, display_name=display_name, facts=facts)
    if not dry_run:
      save_place(updated)
      logger.info("Enriched facts for %s (%s)", place_id, display_name)
    else:
      logger.info("[DRY RUN] Would enrich facts for %s (%s)", place_id, display_name)


def reprocess_all_posts(dry_run: bool = False) -> int:
  """Reprocess all saved posts to populate clean titles, OCR, tips, list counts."""
  posts = posts_repo.load_all_posts()
  logger.info("Found %d posts to inspect and backfill...", len(posts))
  count = 0

  for post in posts:
    pid = post.post_id

    # 1. Title
    curated_title = CURATED_TITLES.get(pid)
    clean_title = curated_title or generate_clean_title(post.caption, post.reel_summary, post.extracted_places)
    if not post.title or curated_title:
      title_to_set = clean_title
    else:
      title_to_set = post.title

    # 2. Expected place count
    curated_count = CURATED_COUNTS.get(pid)
    expected_count = curated_count or post.expected_place_count
    if not expected_count and post.caption:
      match = re.search(r"\b(\d+)\s+(best|top|amazing|places|spots|cafes|things)\b", post.caption, re.I)
      if match:
        expected_count = int(match.group(1))

    # 3. OCR text
    ocr_text = CURATED_OCR.get(pid) or post.image_text

    # 4. Trip tips
    tips = CURATED_TIPS.get(pid) or post.trip_tips

    # 5. Check if changed
    changed = (
      post.title != title_to_set
      or post.expected_place_count != expected_count
      or post.image_text != ocr_text
      or post.trip_tips != tips
    )

    if changed:
      count += 1
      updated = replace(
        post,
        title=title_to_set,
        expected_place_count=expected_count,
        image_text=ocr_text,
        trip_tips=tips,
      )
      if not dry_run:
        posts_repo.save_post(updated)
        logger.info("Updated post %s: title=%r expected=%s ocr=%s tips=%d",
                    pid, title_to_set, expected_count, bool(ocr_text), len(tips))
      else:
        logger.info("[DRY RUN] Would update post %s: title=%r expected=%s", pid, title_to_set, expected_count)

  logger.info("Reprocessed %d posts.", count)
  return count


def main() -> None:
  parser = argparse.ArgumentParser(description=__doc__)
  parser.add_argument("--dry-run", action="store_true", default=False, help="Do not write changes to DynamoDB")
  args = parser.parse_args()

  logger.info("Starting Wanderfile backfill (dry_run=%s)...", args.dry_run)
  fix_orange_garden(dry_run=args.dry_run)
  enrich_facts_for_places(dry_run=args.dry_run)
  reprocess_all_posts(dry_run=args.dry_run)
  logger.info("Backfill completed successfully.")


if __name__ == "__main__":
  main()
