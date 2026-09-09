"""Clean and normalize ingredient names for food database lookups."""

from __future__ import annotations

import re

_PARENS_RE = re.compile(r"\([^)]*\)")
_PUNCT_RE = re.compile(r"[/\\,;:.!\*\?\"'#&+\-_~|]")
_WHITESPACE_RE = re.compile(r"\s+")

# Culinary preparation, temperature, cut, and modifier words to strip.
_PREP_WORDS = {
  "fresh", "freshly", "raw", "cooked", "baked", "roasted", "grilled", "fried",
  "steamed", "boiled", "simmered", "chopped", "diced", "minced", "sliced",
  "shredded", "grated", "melted", "crushed", "divided", "ground", "dried",
  "boneless", "skinless", "large", "medium", "small", "cold",
  "warm", "softened", "room", "temperature", "optional", "drained", "rinsed",
  "thawed", "peeled", "seeded", "packed", "finely", "coarsely", "thinly",
  "roughly", "halved", "quartered", "trimmed", "washed", "stemmed",
  "canned", "unsalted", "salted", "organic", "ripe", "pure", "natural",
  "homemade", "garnish", "taste", "at", "into", "about",
}

# Culinary units/shapes that are not the food itself
_UNIT_WORDS = {"clove", "piece", "pinch", "dash", "cup", "spoon", "slice", "bunch", "head", "can"}

# Stop phrases that are completely irrelevant for whole food identification.
_STOP_PHRASES = [
  re.compile(r"\bto taste\b", re.IGNORECASE),
  re.compile(r"\bfor garnish\b", re.IGNORECASE),
  re.compile(r"\bcut into bite-sized pieces\b", re.IGNORECASE),
  re.compile(r"\bcut into pieces\b", re.IGNORECASE),
  re.compile(r"\bat room temperature\b", re.IGNORECASE),
  re.compile(r"\bas needed\b", re.IGNORECASE),
  re.compile(r"\bif desired\b", re.IGNORECASE),
  re.compile(r"\bplus more\b", re.IGNORECASE),
]

_COMMON_PLURALS: dict[str, str] = {
  "onions": "onion",
  "cloves": "clove",
  "eggs": "egg",
  "carrots": "carrot",
  "tomatoes": "tomato",
  "potatoes": "potato",
  "shallots": "shallot",
  "scallions": "scallion",
  "mushrooms": "mushroom",
  "apples": "apple",
  "lemons": "lemon",
  "limes": "lime",
  "bananas": "banana",
  "avocados": "avocado",
  "breasts": "breast",
  "thighs": "thigh",
  "leaves": "leaf",
  "peppers": "pepper",
  "tortillas": "tortilla",
  "strawberries": "strawberry",
  "blueberries": "blueberry",
  "raspberries": "raspberry",
  "cucumbers": "cucumber",
  "zucchinis": "zucchini",
  "sausages": "sausage",
  "cups": "cup",
  "tablespoons": "tablespoon",
  "teaspoons": "teaspoon",
  "slices": "slice",
  "bunches": "bunch",
  "heads": "head",
  "cans": "can",
  "pinches": "pinch",
}


def clean_ingredient_query(raw_name: str | None) -> str:
  """Normalize an ingredient name to a concise whole-food search term."""
  if not raw_name or not raw_name.strip():
    return ""

  cleaned = _PARENS_RE.sub(" ", raw_name)
  for phrase in _STOP_PHRASES:
    cleaned = phrase.sub(" ", cleaned)

  cleaned = _PUNCT_RE.sub(" ", cleaned)
  tokens = _WHITESPACE_RE.split(cleaned.strip().casefold())

  retained: list[str] = []
  for token in tokens:
    if not token or token.isdigit():
      continue
    singular = _COMMON_PLURALS.get(token, token)
    if singular in _PREP_WORDS:
      continue
    retained.append(singular)

  # If we have multiple words and one is a unit word (e.g. 'garlic clove'), drop the unit word
  if len(retained) > 1:
    meaningful = [w for w in retained if w not in _UNIT_WORDS]
    if meaningful:
      retained = meaningful

  result = " ".join(retained).strip()
  # Fallback to the original raw name if cleaning stripped everything
  return result if result else raw_name.strip().casefold()
