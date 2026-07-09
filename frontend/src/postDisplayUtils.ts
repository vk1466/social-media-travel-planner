import type { SavedPost } from "./api";

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
  const fromPlaces = post.extracted_places.flatMap((place) => place.tags);
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

export function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}
