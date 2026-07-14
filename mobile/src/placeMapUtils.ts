import type { Place } from "./api";

export function mappablePlaces(places: Place[]): Place[] {
  return places.filter(
    (place) => place.location.latitude != null && place.location.longitude != null,
  );
}
