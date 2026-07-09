from __future__ import annotations

import json
import math
import re
import unicodedata
from dataclasses import asdict, replace
from pathlib import Path
from typing import Any

from travelplanner.clients import geocoder
from travelplanner.models import (
  CanonicalPlace,
  ExtractedPlace,
  Place,
  PlaceLocation,
  PlaceMention,
  Platform,
  SavedPost,
)
from travelplanner.store import DEFAULT_DATA_DIR, delete_all_posts, load_all_posts, save_post

DEFAULT_PLACES_DIR = Path("data/places")

# Near-duplicate coordinates within this radius are treated as the same place
# even when they don't share an identity key (guards against name/spelling
# differences that the geocoder resolves slightly differently).
NEAR_DUPLICATE_METERS = 50

# Static ISO 3166-1 alpha-2 country code -> continent map. Geocoders rarely
# return continent directly, and it never changes, so it's cheaper and more
# reliable to look it up here than to depend on a provider for it.
COUNTRY_CODE_TO_CONTINENT: dict[str, str] = {
  "AD": "Europe",
  "AE": "Asia",
  "AF": "Asia",
  "AG": "North America",
  "AI": "North America",
  "AL": "Europe",
  "AM": "Asia",
  "AO": "Africa",
  "AQ": "Antarctica",
  "AR": "South America",
  "AS": "Oceania",
  "AT": "Europe",
  "AU": "Oceania",
  "AW": "North America",
  "AX": "Europe",
  "AZ": "Asia",
  "BA": "Europe",
  "BB": "North America",
  "BD": "Asia",
  "BE": "Europe",
  "BF": "Africa",
  "BG": "Europe",
  "BH": "Asia",
  "BI": "Africa",
  "BJ": "Africa",
  "BL": "North America",
  "BM": "North America",
  "BN": "Asia",
  "BO": "South America",
  "BQ": "North America",
  "BR": "South America",
  "BS": "North America",
  "BT": "Asia",
  "BV": "Antarctica",
  "BW": "Africa",
  "BY": "Europe",
  "BZ": "North America",
  "CA": "North America",
  "CC": "Asia",
  "CD": "Africa",
  "CF": "Africa",
  "CG": "Africa",
  "CH": "Europe",
  "CI": "Africa",
  "CK": "Oceania",
  "CL": "South America",
  "CM": "Africa",
  "CN": "Asia",
  "CO": "South America",
  "CR": "North America",
  "CU": "North America",
  "CV": "Africa",
  "CW": "North America",
  "CX": "Asia",
  "CY": "Asia",
  "CZ": "Europe",
  "DE": "Europe",
  "DJ": "Africa",
  "DK": "Europe",
  "DM": "North America",
  "DO": "North America",
  "DZ": "Africa",
  "EC": "South America",
  "EE": "Europe",
  "EG": "Africa",
  "EH": "Africa",
  "ER": "Africa",
  "ES": "Europe",
  "ET": "Africa",
  "FI": "Europe",
  "FJ": "Oceania",
  "FK": "South America",
  "FM": "Oceania",
  "FO": "Europe",
  "FR": "Europe",
  "GA": "Africa",
  "GB": "Europe",
  "GD": "North America",
  "GE": "Asia",
  "GF": "South America",
  "GG": "Europe",
  "GH": "Africa",
  "GI": "Europe",
  "GL": "North America",
  "GM": "Africa",
  "GN": "Africa",
  "GP": "North America",
  "GQ": "Africa",
  "GR": "Europe",
  "GS": "Antarctica",
  "GT": "North America",
  "GU": "Oceania",
  "GW": "Africa",
  "GY": "South America",
  "HK": "Asia",
  "HM": "Antarctica",
  "HN": "North America",
  "HR": "Europe",
  "HT": "North America",
  "HU": "Europe",
  "ID": "Asia",
  "IE": "Europe",
  "IL": "Asia",
  "IM": "Europe",
  "IN": "Asia",
  "IO": "Asia",
  "IQ": "Asia",
  "IR": "Asia",
  "IS": "Europe",
  "IT": "Europe",
  "JE": "Europe",
  "JM": "North America",
  "JO": "Asia",
  "JP": "Asia",
  "KE": "Africa",
  "KG": "Asia",
  "KH": "Asia",
  "KI": "Oceania",
  "KM": "Africa",
  "KN": "North America",
  "KP": "Asia",
  "KR": "Asia",
  "KW": "Asia",
  "KY": "North America",
  "KZ": "Asia",
  "LA": "Asia",
  "LB": "Asia",
  "LC": "North America",
  "LI": "Europe",
  "LK": "Asia",
  "LR": "Africa",
  "LS": "Africa",
  "LT": "Europe",
  "LU": "Europe",
  "LV": "Europe",
  "LY": "Africa",
  "MA": "Africa",
  "MC": "Europe",
  "MD": "Europe",
  "ME": "Europe",
  "MF": "North America",
  "MG": "Africa",
  "MH": "Oceania",
  "MK": "Europe",
  "ML": "Africa",
  "MM": "Asia",
  "MN": "Asia",
  "MO": "Asia",
  "MP": "Oceania",
  "MQ": "North America",
  "MR": "Africa",
  "MS": "North America",
  "MT": "Europe",
  "MU": "Africa",
  "MV": "Asia",
  "MW": "Africa",
  "MX": "North America",
  "MY": "Asia",
  "MZ": "Africa",
  "NA": "Africa",
  "NC": "Oceania",
  "NE": "Africa",
  "NF": "Oceania",
  "NG": "Africa",
  "NI": "North America",
  "NL": "Europe",
  "NO": "Europe",
  "NP": "Asia",
  "NR": "Oceania",
  "NU": "Oceania",
  "NZ": "Oceania",
  "OM": "Asia",
  "PA": "North America",
  "PE": "South America",
  "PF": "Oceania",
  "PG": "Oceania",
  "PH": "Asia",
  "PK": "Asia",
  "PL": "Europe",
  "PM": "North America",
  "PN": "Oceania",
  "PR": "North America",
  "PS": "Asia",
  "PT": "Europe",
  "PW": "Oceania",
  "PY": "South America",
  "QA": "Asia",
  "RE": "Africa",
  "RO": "Europe",
  "RS": "Europe",
  "RU": "Europe",
  "RW": "Africa",
  "SA": "Asia",
  "SB": "Oceania",
  "SC": "Africa",
  "SD": "Africa",
  "SE": "Europe",
  "SG": "Asia",
  "SH": "Africa",
  "SI": "Europe",
  "SJ": "Europe",
  "SK": "Europe",
  "SL": "Africa",
  "SM": "Europe",
  "SN": "Africa",
  "SO": "Africa",
  "SR": "South America",
  "SS": "Africa",
  "ST": "Africa",
  "SV": "North America",
  "SX": "North America",
  "SY": "Asia",
  "SZ": "Africa",
  "TC": "North America",
  "TD": "Africa",
  "TF": "Antarctica",
  "TG": "Africa",
  "TH": "Asia",
  "TJ": "Asia",
  "TK": "Oceania",
  "TL": "Asia",
  "TM": "Asia",
  "TN": "Africa",
  "TO": "Oceania",
  "TR": "Asia",
  "TT": "North America",
  "TV": "Oceania",
  "TW": "Asia",
  "TZ": "Africa",
  "UA": "Europe",
  "UG": "Africa",
  "UM": "Oceania",
  "US": "North America",
  "UY": "South America",
  "UZ": "Asia",
  "VA": "Europe",
  "VC": "North America",
  "VE": "South America",
  "VG": "North America",
  "VI": "North America",
  "VN": "Asia",
  "VU": "Oceania",
  "WF": "Oceania",
  "WS": "Oceania",
  "YE": "Asia",
  "YT": "Africa",
  "ZA": "Africa",
  "ZM": "Africa",
  "ZW": "Africa",
}


# --- Step 1: normalize ------------------------------------------------------


def _mention_from_place(place: Place) -> PlaceMention:
  return PlaceMention(
    place_name=place.place_name,
    city=place.city,
    country=place.country,
    latitude=place.latitude,
    longitude=place.longitude,
  )


def _mention_from_extracted_place(extracted: ExtractedPlace) -> PlaceMention:
  return PlaceMention(
    place_name=extracted.place_name,
    city=extracted.city,
    country=extracted.country,
    state_province=extracted.state_province,
    details=extracted.details,
    tips=extracted.tips,
    tags=extracted.tags,
  )


def _parent_mention_from_extracted(extracted: ExtractedPlace) -> PlaceMention | None:
  if not extracted.parent_place_name:
    return None
  return PlaceMention(
    place_name=extracted.parent_place_name,
    state_province=extracted.state_province,
    country=extracted.country,
  )


def mentions_from_post(post: SavedPost) -> tuple[PlaceMention, ...]:
  mentions = [_mention_from_place(place) for place in post.places]
  mentions.extend(_mention_from_extracted_place(extracted) for extracted in post.extracted_places)

  existing_names = {mention.place_name.strip().lower() for mention in mentions}
  parent_names_seen: set[str] = set()
  for extracted in post.extracted_places:
    parent_mention = _parent_mention_from_extracted(extracted)
    if parent_mention is None:
      continue
    parent_key = parent_mention.place_name.strip().lower()
    if parent_key in existing_names or parent_key in parent_names_seen:
      continue
    parent_names_seen.add(parent_key)
    mentions.append(parent_mention)

  return tuple(mentions)


# --- Step 2: locate ----------------------------------------------------------


def _geocode_queries(mention: PlaceMention) -> tuple[str, ...]:
  """Progressively simpler queries when city or other hints confuse the geocoder."""
  queries: list[str] = []
  seen: set[str] = set()

  def add(*parts: str | None) -> None:
    query = ", ".join(part for part in parts if part)
    if query and query not in seen:
      seen.add(query)
      queries.append(query)

  add(mention.place_name, mention.city, mention.state_province, mention.country)
  add(mention.place_name, mention.state_province, mention.country)
  add(mention.place_name, mention.country)
  return tuple(queries)


def _extract_display_name(raw: dict[str, Any], fallback: str) -> str:
  name = raw.get("name")
  if name:
    return str(name)
  display_name = raw.get("display_name")
  if display_name:
    return str(display_name).split(",")[0].strip()
  return fallback


def _location_from_raw(latitude: float, longitude: float, raw: dict[str, Any], fallback_name: str) -> PlaceLocation:
  address = raw.get("address", {}) if isinstance(raw.get("address"), dict) else {}
  country_code = address.get("country_code")
  country_code = str(country_code).upper() if country_code else None

  city = (
    address.get("city")
    or address.get("town")
    or address.get("village")
    or address.get("municipality")
    or address.get("county")
  )
  state_province = address.get("state") or address.get("state_district") or address.get("province")
  provider_place_id = raw.get("place_id") or raw.get("osm_id")

  return PlaceLocation(
    display_name=_extract_display_name(raw, fallback_name),
    continent=COUNTRY_CODE_TO_CONTINENT.get(country_code) if country_code else None,
    country=address.get("country"),
    country_code=country_code,
    state_province=str(state_province) if state_province else None,
    city=str(city) if city else None,
    latitude=latitude,
    longitude=longitude,
    provider_place_id=str(provider_place_id) if provider_place_id is not None else None,
    osm_class=str(raw.get("class")) if raw.get("class") else None,
    osm_type=str(raw.get("type")) if raw.get("type") else None,
  )


def locate_mention(mention: PlaceMention) -> PlaceLocation | None:
  """Geocode (or reverse-geocode, if coordinates are already known) a mention
  into a canonical `PlaceLocation`. Returns None if the geocoder can't
  resolve it — the mention is then skipped rather than failing ingest."""
  if mention.latitude is not None and mention.longitude is not None:
    try:
      result = geocoder.reverse_geocode(mention.latitude, mention.longitude)
    except Exception:
      return None
    if result is None:
      return None
    location = _location_from_raw(
      result.latitude, result.longitude, result.raw, mention.place_name
    )
    return location if is_visitable_place(location) else None

  for query in _geocode_queries(mention):
    try:
      result = geocoder.geocode(query)
    except Exception:
      continue
    if result is None:
      continue
    location = _location_from_raw(
      result.latitude, result.longitude, result.raw, mention.place_name
    )
    if is_visitable_place(location):
      return location
  return None


_ADMIN_OSM_TYPES = frozenset({"state", "region", "country", "continent"})

_NON_TRAVEL_OFFICE_TYPES = frozenset({
  "estate_agent",
  "company",
  "insurance",
  "lawyer",
  "accountant",
  "employment_agency",
  "financial",
  "it",
  "advertising_agency",
  "architect",
  "consulting",
  "tax_advisor",
})


def is_visitable_place(location: PlaceLocation) -> bool:
  """Return False for administrative regions and non-travel commercial matches."""
  if location.osm_class == "boundary" and location.osm_type == "administrative":
    return False
  if location.osm_type in _ADMIN_OSM_TYPES:
    return False
  if location.osm_class == "office" and location.osm_type in _NON_TRAVEL_OFFICE_TYPES:
    return False
  display = location.display_name.strip().lower() if location.display_name else ""
  if location.state_province and display == location.state_province.strip().lower():
    return False
  if location.country and display == location.country.strip().lower():
    return False
  return True


# --- Step 3: resolve & save ---------------------------------------------------


_SLUG_INVALID = re.compile(r"[^a-z0-9]+")


def slugify(value: str | None) -> str:
  if not value:
    return ""
  normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
  return _SLUG_INVALID.sub("-", normalized.lower()).strip("-")


def place_key(location: PlaceLocation) -> str:
  parts = [location.country_code, location.state_province, location.city, location.display_name]
  slug_parts = [slugify(part) for part in parts if part]
  return "-".join(part for part in slug_parts if part)


def _place_path(place_id: str, data_dir: Path) -> Path:
  return data_dir / f"{place_id}.json"


def place_to_dict(place: CanonicalPlace) -> dict:
  return asdict(place)


def _place_from_dict(data: dict) -> CanonicalPlace:
  location_data = data.get("location", {})
  location = PlaceLocation(
    display_name=location_data["display_name"],
    continent=location_data.get("continent"),
    country=location_data.get("country"),
    country_code=location_data.get("country_code"),
    state_province=location_data.get("state_province"),
    city=location_data.get("city"),
    latitude=location_data.get("latitude"),
    longitude=location_data.get("longitude"),
    provider_place_id=location_data.get("provider_place_id"),
    osm_class=location_data.get("osm_class"),
    osm_type=location_data.get("osm_type"),
  )
  return CanonicalPlace(
    place_id=data["place_id"],
    display_name=data["display_name"],
    location=location,
    aliases=tuple(data.get("aliases", [])),
    tags=tuple(data.get("tags", [])),
    details=tuple(data.get("details", [])),
    tips=tuple(data.get("tips", [])),
    source_post_ids=tuple(data.get("source_post_ids", [])),
    parent_place_id=data.get("parent_place_id"),
  )


def save_place(place: CanonicalPlace, data_dir: Path = DEFAULT_PLACES_DIR) -> Path:
  path = _place_path(place.place_id, data_dir)
  path.parent.mkdir(parents=True, exist_ok=True)
  with path.open("w", encoding="utf-8") as handle:
    json.dump(place_to_dict(place), handle, indent=2, ensure_ascii=False)
    handle.write("\n")
  return path


def load_place(place_id: str, data_dir: Path = DEFAULT_PLACES_DIR) -> CanonicalPlace | None:
  path = _place_path(place_id, data_dir)
  if not path.exists():
    return None
  with path.open(encoding="utf-8") as handle:
    return _place_from_dict(json.load(handle))


def load_all_places(data_dir: Path = DEFAULT_PLACES_DIR) -> list[CanonicalPlace]:
  if not data_dir.exists():
    return []
  places = []
  for path in sorted(data_dir.glob("*.json")):
    with path.open(encoding="utf-8") as handle:
      places.append(_place_from_dict(json.load(handle)))
  return places


def delete_all_places(data_dir: Path = DEFAULT_PLACES_DIR) -> int:
  """Remove every canonical place JSON file. Returns the number deleted."""
  if not data_dir.exists():
    return 0

  deleted = 0
  for path in data_dir.glob("*.json"):
    path.unlink()
    deleted += 1
  return deleted


def cleanup_all_data(
  *,
  posts_data_dir: Path = DEFAULT_DATA_DIR,
  places_data_dir: Path = DEFAULT_PLACES_DIR,
) -> tuple[int, int]:
  """Delete all saved posts and canonical places."""
  posts_deleted = delete_all_posts(data_dir=posts_data_dir)
  places_deleted = delete_all_places(data_dir=places_data_dir)
  return posts_deleted, places_deleted


def _matches_ci(value: str | None, query: str) -> bool:
  return value is not None and value.strip().lower() == query.strip().lower()


def list_places(
  *,
  continent: str | None = None,
  country: str | None = None,
  state_province: str | None = None,
  city: str | None = None,
  tag: str | None = None,
  roots_only: bool = False,
  parent_place_id: str | None = None,
  data_dir: Path = DEFAULT_PLACES_DIR,
) -> list[CanonicalPlace]:
  places = load_all_places(data_dir=data_dir)
  if roots_only:
    places = [place for place in places if place.parent_place_id is None]
  if parent_place_id is not None:
    places = [place for place in places if place.parent_place_id == parent_place_id]
  if continent:
    places = [place for place in places if _matches_ci(place.location.continent, continent)]
  if country:
    places = [
      place
      for place in places
      if _matches_ci(place.location.country, country) or _matches_ci(place.location.country_code, country)
    ]
  if state_province:
    places = [place for place in places if _matches_ci(place.location.state_province, state_province)]
  if city:
    places = [place for place in places if _matches_ci(place.location.city, city)]
  if tag:
    places = [place for place in places if tag in place.tags]
  return sorted(places, key=lambda place: place.display_name)


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
  earth_radius_meters = 6_371_000
  phi1, phi2 = math.radians(lat1), math.radians(lat2)
  delta_phi = math.radians(lat2 - lat1)
  delta_lambda = math.radians(lon2 - lon1)
  a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
  return 2 * earth_radius_meters * math.asin(math.sqrt(a))


def _find_near_duplicate(location: PlaceLocation, data_dir: Path) -> CanonicalPlace | None:
  if location.latitude is None or location.longitude is None:
    return None
  for place in load_all_places(data_dir=data_dir):
    place_location = place.location
    if place_location.latitude is None or place_location.longitude is None:
      continue
    distance = _haversine_meters(
      location.latitude, location.longitude, place_location.latitude, place_location.longitude
    )
    if distance <= NEAR_DUPLICATE_METERS:
      return place
  return None


def _find_existing_place(key: str, location: PlaceLocation, data_dir: Path) -> CanonicalPlace | None:
  existing = load_place(key, data_dir=data_dir)
  if existing is not None:
    return existing
  return _find_near_duplicate(location, data_dir)


def _merge_place(existing: CanonicalPlace, mention: PlaceMention, source_post_id: str) -> CanonicalPlace:
  aliases = list(existing.aliases)
  if mention.place_name != existing.display_name and mention.place_name not in aliases:
    aliases.append(mention.place_name)

  details = list(existing.details)
  if mention.details and mention.details not in details:
    details.append(mention.details)

  tips = list(existing.tips)
  for tip in mention.tips:
    if tip not in tips:
      tips.append(tip)

  tags = tuple(sorted(set(existing.tags) | set(mention.tags)))

  source_post_ids = existing.source_post_ids
  if source_post_id not in source_post_ids:
    source_post_ids = (*source_post_ids, source_post_id)

  return replace(
    existing,
    aliases=tuple(aliases),
    details=tuple(details),
    tips=tuple(tips),
    tags=tags,
    source_post_ids=source_post_ids,
  )


def _new_place(place_id: str, mention: PlaceMention, location: PlaceLocation, source_post_id: str) -> CanonicalPlace:
  aliases = () if mention.place_name == location.display_name else (mention.place_name,)
  return CanonicalPlace(
    place_id=place_id,
    display_name=location.display_name,
    location=location,
    aliases=aliases,
    tags=tuple(sorted(set(mention.tags))),
    details=(mention.details,) if mention.details else (),
    tips=tuple(dict.fromkeys(mention.tips)),
    source_post_ids=(source_post_id,),
  )


def upsert_place(
  mention: PlaceMention,
  location: PlaceLocation,
  source_post_id: str,
  data_dir: Path = DEFAULT_PLACES_DIR,
) -> str:
  key = place_key(location)
  existing = _find_existing_place(key, location, data_dir)
  place = (
    _merge_place(existing, mention, source_post_id)
    if existing is not None
    else _new_place(key, mention, location, source_post_id)
  )
  save_place(place, data_dir)
  return place.place_id


# --- Orchestration -----------------------------------------------------------


def process_post_places(
  post: SavedPost,
  *,
  places_data_dir: Path = DEFAULT_PLACES_DIR,
) -> tuple[str, ...]:
  """Normalize -> locate -> resolve/upsert every place mention on a post.
  Never raises: a mention that fails to geocode is skipped, not fatal."""
  source_post_id = f"{post.platform.value}:{post.post_id}"
  place_ids: list[str] = []

  for mention in mentions_from_post(post):
    try:
      location = locate_mention(mention)
    except Exception:
      continue
    if location is None:
      continue
    if not is_visitable_place(location):
      continue

    place_id = upsert_place(mention, location, source_post_id, data_dir=places_data_dir)
    if place_id not in place_ids:
      place_ids.append(place_id)

  return tuple(place_ids)


def reprocess_all_places(
  platform: Platform | None = None,
  *,
  posts_data_dir: Path = DEFAULT_DATA_DIR,
  places_data_dir: Path = DEFAULT_PLACES_DIR,
) -> None:
  """Batch backfill: re-run place processing on saved posts without
  re-fetching links. A full run (no platform filter) clears the place
  library first and rebuilds it, so post <-> place drift self-heals."""
  if platform is None and places_data_dir.exists():
    for path in places_data_dir.glob("*.json"):
      path.unlink()

  for post in load_all_posts(platform=platform, data_dir=posts_data_dir):
    place_ids = process_post_places(post, places_data_dir=places_data_dir)
    if place_ids != post.place_ids:
      save_post(replace(post, place_ids=place_ids), data_dir=posts_data_dir)

  try:
    from travelplanner.hierarchy import link_places

    link_places(posts_data_dir=posts_data_dir, places_data_dir=places_data_dir)
  except Exception:
    pass
