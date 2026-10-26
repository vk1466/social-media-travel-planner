import type { SavedPost } from "./api";
import { API_BASE_URL } from "./api";

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
  return caption.length > 80 ? `${caption.slice(0, 77)}…` : caption;
}

export function getPlatformLabel(post: SavedPost): string {
  if (post.platform === "instagram") return "Instagram";
  if (post.platform === "tiktok") return "TikTok";
  if (post.platform === "youtube") return "YouTube";
  if (post.platform === "web") return "Web";
  return post.platform;
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
  "de", "del", "della", "delle", "di", "da", "la", "le", "il", "lo", "el", "los", "las", "du", "des", "van", "von"
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
      if (word.length > 0 && word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
        return word;
      }
      if (i > 0 && LOWERCASE_ARTICLES.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

