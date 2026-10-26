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

export function toFriendlyErrorMessage(err: unknown, url?: string): string {
  if (url) {
    const loweredUrl = url.toLowerCase();
    if (
      loweredUrl.includes("tiktok.com") ||
      loweredUrl.includes("youtube.com") ||
      loweredUrl.includes("youtu.be")
    ) {
      return "TikTok and YouTube aren't supported yet - only Instagram reels are currently supported";
    }
  }
  const msg = err instanceof Error ? err.message : String(err || "");
  const lowered = msg.toLowerCase();
  if (lowered.includes("tiktok") || lowered.includes("youtube")) {
    return "TikTok and YouTube aren't supported yet - only Instagram reels are currently supported";
  }
  if (lowered.includes("429") || lowered.includes("rate limit") || lowered.includes("too many requests")) {
    return "Rate limited, please retry in a minute";
  }
  if (
    lowered.includes("404") ||
    lowered.includes("private") ||
    lowered.includes("deleted") ||
    lowered.includes("not found") ||
    lowered.includes("does not exist") ||
    lowered.includes("empty data") ||
    lowered.includes("returned no post")
  ) {
    return "Private or deleted post";
  }
  if (lowered.includes("unsupported") || lowered.includes("no fetcher")) {
    return "Unsupported platform";
  }
  if (lowered.includes("timeout") || lowered.includes("timed out")) {
    return "Request timed out, please retry in a moment";
  }
  if (lowered.includes("network") || lowered.includes("connection") || lowered.includes("dns") || lowered.includes("blocked")) {
    return "Network error, please retry";
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
    const lowered = normalized.toLowerCase();
    const isTikTok = lowered.includes("tiktok.com");
    const isYouTube = lowered.includes("youtube.com") || lowered.includes("youtu.be");
    if (isTikTok || isYouTube) {
      invalid.push(trimmed);
      validationError = "TikTok and YouTube aren't supported yet - only Instagram reels are currently supported";
      continue;
    }
    if (!isSupportedShareDomain(normalized)) {
      invalid.push(trimmed);
      validationError = "Only Instagram reels are currently supported (restaurants, recipes, travel, movies).";
      continue;
    }
    valid.push(normalized);
  }
  return { valid, invalid, validationError };
}
