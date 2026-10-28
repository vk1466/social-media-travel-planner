import type { Place, SavedPost } from "./api";
import { API_BASE_URL } from "./api";

export function getPostDomain(postUrl: string): string {
  try {
    return new URL(postUrl).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export function truncateAtWordBoundary(text: string, maxLength: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  const sub = trimmed.slice(0, maxLength - 1);
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > maxLength * 0.4) {
    return `${sub.slice(0, lastSpace).trim()}…`;
  }
  return `${sub.trim()}…`;
}

export function getPostTitle(post: SavedPost): string {
  if (post.title && post.title.trim()) {
    return post.title.trim();
  }
  const caption = post.caption?.trim() ?? "";
  if (!caption) {
    return post.author_handle ? `@${post.author_handle}` : "Untitled post";
  }
  const firstLine = caption.split("\n")[0]?.trim() ?? "";
  if (firstLine.length > 0 && firstLine.length <= 80) {
    return firstLine;
  }
  return truncateAtWordBoundary(firstLine || caption, 80);
}

export function getPostDescription(post: SavedPost): string {
  const caption = post.caption?.trim() ?? "";
  if (!caption) {
    return "No description available.";
  }
  const lines = caption.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length <= 1) {
    return caption.length > 160 ? `${caption.slice(0, 157)}…` : caption;
  }
  const body = lines.slice(1).join(" ");
  return body.length > 160 ? `${body.slice(0, 157)}…` : body;
}

export function getPlatformLabel(post: SavedPost): string {
  const platform = post.platform.toUpperCase();
  if (post.platform === "instagram") {
    return "INSTAGRAM";
  }
  if (post.platform === "web") {
    return "WEB · travel";
  }
  return platform;
}

export function getPostTags(post: SavedPost): string[] {
  const fromHashtags = post.hashtags.map((tag) => tag.replace(/^#/, "").toLowerCase());
  const fromPlaces = post.extracted_places.flatMap((place) => {
    const labels = [...(place.attributes ?? [])];
    if (place.category) {
      labels.unshift(place.category);
    }
    return labels;
  });
  const combined = [...fromHashtags, ...fromPlaces.map((tag) => tag.toLowerCase())];
  return Array.from(new Set(combined.filter(Boolean))).slice(0, 6);
}

export function formatPostDate(post: SavedPost): string | null {
  const raw = post.posted_at ?? post.fetched_at;
  if (!raw) {
    return null;
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString();
}

export function getCaptionExcerpt(
  caption: string,
  maxLength = 160,
): { text: string; truncated: boolean } {
  const trimmed = caption.trim();
  if (!trimmed) {
    return { text: "", truncated: false };
  }
  if (trimmed.length <= maxLength) {
    return { text: trimmed, truncated: false };
  }
  return { text: `${trimmed.slice(0, maxLength - 1).trimEnd()}…`, truncated: true };
}

export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

/** Route Instagram CDN images through our API to avoid CORP blocking in the browser. */
export function proxiedMediaUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const host = new URL(trimmed).hostname.toLowerCase();
    const needsProxy =
      host === "instagram.com" ||
      host.endsWith(".instagram.com") ||
      host === "cdninstagram.com" ||
      host.endsWith(".cdninstagram.com") ||
      host === "fbcdn.net" ||
      host.endsWith(".fbcdn.net");
    if (!needsProxy) {
      return trimmed;
    }
  } catch {
    return trimmed;
  }
  return `${API_BASE_URL}/api/media/proxy?url=${encodeURIComponent(trimmed)}`;
}

const LOWERCASE_ARTICLES = new Set([
  "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "from", "by", "with", "in", "of",
  "de", "del", "della", "delle", "degli", "dei", "dello", "di", "da", "la", "le", "il", "lo", "el", "los", "las", "du", "des", "van", "von",
  "agli", "alle", "ai", "al", "dalla", "dalle", "dai", "dal"
]);

export function capitalizePlaceName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/);
  return words
    .map((word, i) => {
      const lower = word.toLowerCase();
      const hasInternalCaps = /[a-z][A-Z]/.test(word);
      if (hasInternalCaps) return word;
      if (i > 0 && LOWERCASE_ARTICLES.has(lower)) {
        return lower;
      }
      if (word.length > 0 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function getEffectiveAddress(place: {
  display_name?: string | null;
  location?: {
    display_name?: string | null;
    city?: string | null;
    state_province?: string | null;
    country?: string | null;
  } | null;
}): string | null {
  const rawLoc = place.location?.display_name?.trim() || "";
  const displayName = (place.display_name || "").trim().toLowerCase();

  if (rawLoc) {
    const rawLower = rawLoc.toLowerCase();
    if (rawLower !== displayName) {
      if (rawLower.startsWith(displayName + ",") || rawLower.startsWith(displayName + " -")) {
        const stripped = rawLoc.slice(displayName.length + 1).trim().replace(/^[,\s-]+/, "");
        if (stripped) return stripped;
      }
      return rawLoc;
    }
  }

  const parts = [
    place.location?.city,
    place.location?.state_province,
    place.location?.country,
  ].filter(Boolean);

  if (parts.length > 0) {
    const regionStr = parts.join(", ");
    if (regionStr.toLowerCase() !== displayName) {
      return regionStr;
    }
  }

  return null;
}

/**
 * Select the best image URL for a place card or thumbnail.
 * Prioritizes:
 * 1. place.image_url (per-place photo)
 * 2. Dedicated single-place reel thumbnail
 * 3. Specific slide/frame in a carousel
 * Secondary stops in multi-place posts NEVER steal the reel thumbnail (returning null to fall back to designed gradient + glyph).
 */
export function getPlaceBestImageUrl(place: Place, posts: SavedPost[] = []): string | null {
  if (place.image_url) {
    return place.image_url;
  }
  if (!place.source_post_ids || place.source_post_ids.length === 0) {
    return null;
  }

  const matchingPosts = posts.filter((p) => place.source_post_ids?.includes(p.post_id));
  if (matchingPosts.length === 0) {
    return null;
  }

  // 1. Check for single-place (dedicated) posts first
  const dedicated = matchingPosts.find(
    (p) => (p.place_ids?.length === 1 && p.place_ids[0] === place.place_id) && (p.thumbnail_url || (p.slide_media_urls && p.slide_media_urls[0]))
  );
  if (dedicated) {
    return dedicated.thumbnail_url || (dedicated.slide_media_urls && dedicated.slide_media_urls[0]) || null;
  }

  // 2. Find most specific post (fewest places)
  const postsWithThumb = matchingPosts.filter((p) => p.thumbnail_url || (p.slide_media_urls && p.slide_media_urls.length > 0));
  if (postsWithThumb.length === 0) {
    return null;
  }

  postsWithThumb.sort((a, b) => (a.place_ids?.length || 999) - (b.place_ids?.length || 999));
  const mostSpecific = postsWithThumb[0];

  // If this place corresponds to a specific slide/frame, use it
  const placeIdx = mostSpecific.place_ids?.indexOf(place.place_id) ?? -1;
  if (placeIdx >= 0 && mostSpecific.slide_media_urls && mostSpecific.slide_media_urls[placeIdx]) {
    return mostSpecific.slide_media_urls[placeIdx];
  }

  // Secondary stops in multi-place reels must not steal the reel thumbnail
  if (placeIdx > 0 || (mostSpecific.place_ids && mostSpecific.place_ids.length > 1)) {
    return null;
  }

  return mostSpecific.thumbnail_url || (mostSpecific.slide_media_urls && mostSpecific.slide_media_urls[0]) || null;
}

