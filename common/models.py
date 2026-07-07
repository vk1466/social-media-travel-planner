from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum


class SocialPlatform(str, Enum):
  INSTAGRAM = "instagram"
  TIKTOK = "tiktok"
  PINTEREST = "pinterest"
  YOUTUBE = "youtube"
  OTHER = "other"


@dataclass(frozen=True)
class Place:
  place_name: str
  city: str | None = None
  country: str | None = None
  latitude: float | None = None
  longitude: float | None = None

  @property
  def formatted_location(self) -> str:
    parts = [self.place_name]
    if self.city:
      parts.append(self.city)
    if self.country:
      parts.append(self.country)
    return ", ".join(parts)


@dataclass(frozen=True)
class TravelPost:
  post_url: str
  platform: SocialPlatform
  caption: str
  places: tuple[Place, ...] = ()
  hashtags: tuple[str, ...] = ()
  author_handle: str | None = None

  @property
  def primary_place(self) -> Place | None:
    return self.places[0] if self.places else None


@dataclass(frozen=True)
class ItineraryDay:
  day_number: int
  title: str
  places: tuple[Place, ...]
  source_post_urls: tuple[str, ...] = ()


@dataclass
class Itinerary:
  trip_name: str
  destination: str
  start_date: date | None = None
  days: list[ItineraryDay] = field(default_factory=list)

  def add_day(self, itinerary_day: ItineraryDay) -> None:
    self.days.append(itinerary_day)

  @property
  def place_count(self) -> int:
    return sum(len(day.places) for day in self.days)
