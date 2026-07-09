import type { CanonicalPlace } from "./api";

export function mappablePlaces(places: CanonicalPlace[]): CanonicalPlace[] {
  return places.filter(
    (place) => place.location.latitude != null && place.location.longitude != null,
  );
}
