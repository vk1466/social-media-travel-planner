"""Franchise / chain detection for Timeline places.

Chain outlets dominate everyday movement and carry no travel meaning, yet OSM
tags them exactly like independent venues (`amenity=restaurant`), so category
filters cannot separate them. The name can: a franchise is, by definition, the
same name everywhere.

Matching is deliberately anchored to the start of the name so "Starbucks
Reserve" is caught while "Sunset Cafe by the Subway Bridge" is not. Unbranded
`amenity=fast_food` pins are left alone here — a one-off falafel window is a
real travel memory, and the review queue already covers that case.
"""

from __future__ import annotations

import re
import unicodedata

# Global fast food, coffee and casual-dining franchises.
_FOOD_CHAINS: frozenset[str] = frozenset(
  {
    "mcdonalds",
    "burger king",
    "kfc",
    "subway",
    "starbucks",
    "dunkin",
    "dunkin donuts",
    "taco bell",
    "wendys",
    "chipotle",
    "chipotle mexican grill",
    "dominos",
    "dominos pizza",
    "pizza hut",
    "papa johns",
    "little caesars",
    "five guys",
    "popeyes",
    "arbys",
    "sonic drive in",
    "jack in the box",
    "whataburger",
    "in n out burger",
    "dairy queen",
    "jersey mikes",
    "panda express",
    "panera",
    "panera bread",
    "chick fil a",
    "shake shack",
    "culvers",
    "hardees",
    "carls jr",
    "del taco",
    "raising canes",
    "zaxbys",
    "bojangles",
    "white castle",
    "firehouse subs",
    "quiznos",
    "wingstop",
    "krispy kreme",
    "baskin robbins",
    "cinnabon",
    "auntie annes",
    "tim hortons",
    "second cup",
    "peets coffee",
    "caribou coffee",
    "dutch bros",
    "costa coffee",
    "pret a manger",
    "greggs",
    "nandos",
    "pizza express",
    "wagamama",
    "jollibee",
    "lotteria",
    "mos burger",
    "yoshinoya",
    "hesburger",
    "telepizza",
    "vapiano",
    "autogrill",
    "mixue",
    "luckin coffee",
    "gong cha",
    "chatime",
    "dennys",
    "ihop",
    "applebees",
    "chilis",
    "olive garden",
    "red robin",
    "buffalo wild wings",
    "cracker barrel",
    "waffle house",
    "outback steakhouse",
    "texas roadhouse",
    "tgi fridays",
  }
)

# Big-box, grocery and pharmacy chains. Most are already dropped as errand
# shops, but Timeline pins sometimes resolve them as generic buildings.
_RETAIL_CHAINS: frozenset[str] = frozenset(
  {
    "walmart",
    "target",
    "costco",
    "sams club",
    "safeway",
    "kroger",
    "albertsons",
    "publix",
    "trader joes",
    "whole foods market",
    "aldi",
    "lidl",
    "tesco",
    "sainsburys",
    "asda",
    "carrefour",
    "7 eleven",
    "circle k",
    "cvs",
    "cvs pharmacy",
    "walgreens",
    "rite aid",
    "home depot",
    "lowes",
    "best buy",
    "dollar general",
    "dollar tree",
    "autozone",
  }
)

CHAIN_BRANDS: frozenset[str] = _FOOD_CHAINS | _RETAIL_CHAINS

_NON_ALNUM = re.compile(r"[^a-z0-9]+")
# Dropped rather than spaced, so "McDonald's" reads as one word.
_APOSTROPHES = re.compile(r"['\u2019\u02bc]")


def normalize_brand_name(value: str | None) -> str:
  """Lowercase ASCII with punctuation collapsed to single spaces."""
  if not value:
    return ""
  folded = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
  return _NON_ALNUM.sub(" ", _APOSTROPHES.sub("", folded.lower())).strip()


def chain_brand(place_name: str | None) -> str | None:
  """Return the franchise brand this name belongs to, if any."""
  normalized = normalize_brand_name(place_name)
  if not normalized:
    return None
  # Longest brand first so "dunkin donuts" wins over "dunkin".
  for brand in sorted(CHAIN_BRANDS, key=len, reverse=True):
    if normalized == brand or normalized.startswith(f"{brand} "):
      return brand
  return None


def is_chain_place(place_name: str | None) -> bool:
  return chain_brand(place_name) is not None
