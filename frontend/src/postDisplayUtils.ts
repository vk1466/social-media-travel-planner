import type { SavedPost } from "./api";
import { API_BASE_URL } from "./api";

export function getPostDomain(postUrl: string): string {
  try {
    return new URL(postUrl).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export function getPostTitle(post: SavedPost): string {
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
