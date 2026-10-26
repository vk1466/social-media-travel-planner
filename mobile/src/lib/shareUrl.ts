/** Match Instagram shortcodes the same way travelplanner/links.py does. */
const INSTAGRAM_URL_PATTERN =
  /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reels?|tv)\/[A-Za-z0-9_-]+\/?(?:\?[^\s]*)?/gi;

const ANY_URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;

export function extractShareUrls(text: string | null | undefined): string[] {
  const raw = text?.trim() ?? "";
  if (!raw) {
    return [];
  }

  const instagram = Array.from(raw.matchAll(INSTAGRAM_URL_PATTERN)).map((match) =>
    match[0].replace(/[.,;:!?)]+$/, ""),
  );
  if (instagram.length > 0) {
    return Array.from(new Set(instagram));
  }

  const urls = Array.from(raw.matchAll(ANY_URL_PATTERN)).map((match) =>
    match[0].replace(/[.,;:!?)]+$/, ""),
  );
  return Array.from(new Set(urls));
}

export function normalizeShareUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function isSupportedShareDomain(urlStr: string): boolean {
  try {
    const url = new URL(normalizeShareUrl(urlStr));
    const host = url.hostname.toLowerCase();
    return (
      host === "instagram.com" ||
      host.endsWith(".instagram.com") ||
      host === "tiktok.com" ||
      host.endsWith(".tiktok.com") ||
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host === "reddit.com" ||
      host.endsWith(".reddit.com")
    );
  } catch {
    return false;
  }
}

export function toFriendlyErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err || "");
  const lowered = msg.toLowerCase();
  if (lowered.includes("429") || lowered.includes("rate limit") || lowered.includes("too many requests")) {
    return "Rate limited. Please retry in a minute.";
  }
  if (lowered.includes("404") || lowered.includes("private") || lowered.includes("deleted") || lowered.includes("not found")) {
    return "This post is private or was deleted.";
  }
  if (lowered.includes("unsupported") || lowered.includes("no fetcher")) {
    return "Unsupported link. Please paste an Instagram, TikTok, or YouTube link.";
  }
  if (lowered.includes("timeout") || lowered.includes("timed out")) {
    return "Request timed out. Please try again.";
  }
  return msg || "Failed to process link. Please try again.";
}

export function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(normalizeShareUrl(value));
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname.includes("."));
  } catch {
    return false;
  }
}

export function parseLinkLines(text: string): {
  valid: string[];
  invalid: string[];
  validationError?: string;
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  let validationError: string | undefined;

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    const normalized = normalizeShareUrl(trimmed);
    if (!isLikelyUrl(normalized)) {
      invalid.push(trimmed);
      validationError = "Please enter a valid web link (e.g. https://...)";
      continue;
    }
    if (!isSupportedShareDomain(normalized)) {
      invalid.push(trimmed);
      validationError = "Unsupported domain. We support Instagram, TikTok, and YouTube.";
      continue;
    }
    valid.push(normalized);
  }
  return { valid, invalid, validationError };
}
