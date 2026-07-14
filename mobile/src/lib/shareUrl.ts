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

export function isLikelyUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseLinkLines(text: string): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    if (isLikelyUrl(trimmed)) {
      valid.push(trimmed);
    } else {
      invalid.push(trimmed);
    }
  }
  return { valid, invalid };
}
