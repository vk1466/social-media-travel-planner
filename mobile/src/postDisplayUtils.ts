import type { SavedPost } from "./api";
import { API_BASE_URL } from "./api";

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

export function getPlatformLabel(post: SavedPost): string {
  if (post.platform === "instagram") {
    return "Instagram";
  }
  if (post.platform === "web") {
    return "Web";
  }
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
