import type { Place, SavedPost } from "../api";
import { effectiveContentCategory, type ContentCategory } from "../contentCategory";
import { coverArt as placeCoverArt } from "../coverArt";
import { getPostTitle, proxiedMediaUrl } from "../postDisplayUtils";

export function postsOfCategory(posts: SavedPost[], category: ContentCategory): SavedPost[] {
  return posts.filter((post) => effectiveContentCategory(post) === category);
}

export function postTitle(post: SavedPost): string {
  return getPostTitle(post);
}

export function platformLabel(platform: string): string {
  if (platform === "instagram") return "Instagram";
  if (platform === "tiktok") return "TikTok";
  if (platform === "youtube") return "YouTube";
  if (platform === "web") return "Web";
  return platform;
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

export function mapsUrl(place: Place): string | null {
  if (place.google_maps_url) return place.google_maps_url;
  const { latitude, longitude, display_name } = place.location;
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  if (display_name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(display_name)}`;
  }
  return null;
}

export function coverArt(name: string): string {
  return placeCoverArt(name);
}

export { proxiedMediaUrl };

export function groupPlaces(places: Place[]): { place: Place; children: Place[] }[] {
  const ids = new Set(places.map((place) => place.place_id));
  const childrenByParent = new Map<string, Place[]>();
  const roots: Place[] = [];

  for (const place of places) {
    const parentId = place.parent_place_id;
    if (parentId && ids.has(parentId)) {
      const list = childrenByParent.get(parentId) ?? [];
      list.push(place);
      childrenByParent.set(parentId, list);
    } else {
      roots.push(place);
    }
  }

  return roots.map((place) => ({
    place,
    children: childrenByParent.get(place.place_id) ?? [],
  }));
}
