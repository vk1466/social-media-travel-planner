import type { Place, SavedPost } from "./api";
import { getPostTitle } from "./postDisplayUtils";

export function postTitle(post: SavedPost): string {
  return getPostTitle(post);
}

export function formatDate(raw?: string | null): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function locationLine(place: Place): string {
  const { city, state_province: state, country } = place.location;
  return [city, state, country].filter(Boolean).join(", ") || "Location unknown";
}
