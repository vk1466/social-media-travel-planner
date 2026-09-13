/** Deterministic cover fallback from a title — matches frontend coverArt.ts. */

function hashHue(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33 + value.charCodeAt(index)) % 360;
  }
  return hash;
}

export const COVER_TONES = [
  "forest",
  "coral",
  "sand",
  "slate",
  "moss",
  "peach",
  "lilac",
  "sky",
  "blush",
  "ochre",
] as const;

export type CoverTone = (typeof COVER_TONES)[number];

export function coverTone(name: string): CoverTone {
  return COVER_TONES[hashHue(name) % COVER_TONES.length];
}

/** Solid fallback when no thumbnail is available. */
export function coverFallbackColor(name: string): string {
  const hue = 120 + (hashHue(name) % 120);
  return `hsl(${hue}, 30%, 32%)`;
}
