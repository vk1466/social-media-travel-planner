import { API_BASE_URL, type Place, type SavedPost } from "./api";

const CATEGORIES = ["travel", "movies", "fashion", "hairstyle", "food", "other"] as const;
export type ContentCategory = (typeof CATEGORIES)[number];

export function effectiveContentCategory(post: SavedPost): ContentCategory {
  const stored = post.content_category?.trim().toLowerCase();
  if (stored && (CATEGORIES as readonly string[]).includes(stored)) {
    return stored as ContentCategory;
  }
  if (post.place_ids.length > 0) {
    return "travel";
  }
  return "other";
}

export function postsOfCategory(posts: SavedPost[], category: ContentCategory): SavedPost[] {
  return posts.filter((post) => effectiveContentCategory(post) === category);
}

export function postTitle(post: SavedPost): string {
  const caption = post.caption?.trim() ?? "";
  if (!caption) {
    return post.author_handle ? `@${post.author_handle}` : "Untitled post";
  }
  const firstLine = caption.split("\n")[0]?.trim() ?? "";
  if (firstLine.length > 0 && firstLine.length <= 80) {
    return firstLine;
  }
  return caption.length > 80 ? `${caption.slice(0, 77)}…` : caption;
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
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 33 + name.charCodeAt(index)) % 360;
  }
  const hue = 120 + (hash % 120);
  return `linear-gradient(155deg, hsl(${hue} 30% 32%), hsl(${(hue + 45) % 360} 24% 14%))`;
}

export function proxiedMediaUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    const needsProxy =
      host === "instagram.com" ||
      host.endsWith(".instagram.com") ||
      host === "cdninstagram.com" ||
      host.endsWith(".cdninstagram.com") ||
      host === "fbcdn.net" ||
      host.endsWith(".fbcdn.net");
    if (!needsProxy) return trimmed;
  } catch {
    return trimmed;
  }
  return `${API_BASE_URL}/api/media/proxy?url=${encodeURIComponent(trimmed)}`;
}

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
