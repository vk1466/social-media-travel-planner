from __future__ import annotations

import ssl

import certifi
from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim
from geopy.location import Location

USER_AGENT = "social-media-travel-planner (place enrichment)"
MIN_DELAY_SECONDS = 1

# Some Python installs (notably python.org's macOS builds) don't ship a
# working system CA bundle, which breaks HTTPS geocoding requests with an
# SSL_CERT_VERIFY_FAILED error. Using certifi's bundle explicitly sidesteps
# that regardless of how the interpreter was installed.
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

_geolocator = Nominatim(user_agent=USER_AGENT, timeout=10, ssl_context=_SSL_CONTEXT)
_rate_limited_geocode = RateLimiter(
  _geolocator.geocode,
  min_delay_seconds=MIN_DELAY_SECONDS,
  swallow_exceptions=False,
)
_rate_limited_reverse = RateLimiter(
  _geolocator.reverse,
  min_delay_seconds=MIN_DELAY_SECONDS,
  swallow_exceptions=False,
)


def get_client() -> Nominatim:
  return _geolocator


def geocode(query: str) -> Location | None:
  """Forward-geocode a free-text query (e.g. "Multnomah Falls, Portland, USA")
  into a canonical location. Nominatim (OSM); rate-limited to 1 req/sec."""
  return _rate_limited_geocode(query, addressdetails=True, language="en")


def reverse_geocode(latitude: float, longitude: float) -> Location | None:
  """Reverse-geocode coordinates (e.g. from an Instagram location tag) into a
  canonical location and address hierarchy."""
  return _rate_limited_reverse((latitude, longitude), addressdetails=True, language="en")
