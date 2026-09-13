const MAX_DETAILS = 3;
const NEAR_DUP_JACCARD = 0.55;
const MIN_DISTINCTIVE = 2;
const WORD_RE = /[a-z0-9]+/g;
const VIDEO_META_RE =
  /\b(shown in|several shots?|in (?:the )?(?:reel|video|clip|footage)|filmed|captured on camera)\b/i;

const HYPE = new Set([
  "amazing",
  "beautiful",
  "breathtaking",
  "bucket",
  "famous",
  "iconic",
  "incredible",
  "landmark",
  "list",
  "must",
  "mustsee",
  "mustvisit",
  "see",
  "stunning",
  "symbol",
  "unmissable",
  "visit",
  "visiting",
  "worldfamous",
]);

const FILLER = new Set([
  "a",
  "an",
  "and",
  "at",
  "attraction",
  "both",
  "city",
  "destination",
  "during",
  "especially",
  "for",
  "from",
  "in",
  "is",
  "it",
  "its",
  "iron",
  "lady",
  "lattice",
  "monument",
  "of",
  "offering",
  "offers",
  "place",
  "shown",
  "shots",
  "spot",
  "the",
  "this",
  "that",
  "to",
  "tower",
  "view",
  "views",
  "with",
]);

function tokens(text: string): Set<string> {
  const normalized = text.toLowerCase().replaceAll("must-see", "mustsee").replaceAll("must-visit", "mustvisit");
  return new Set(normalized.match(WORD_RE) ?? []);
}

function distinctiveTokens(text: string, placeName: string): Set<string> {
  const result = tokens(text);
  for (const token of tokens(placeName)) result.delete(token);
  for (const token of FILLER) result.delete(token);
  for (const token of HYPE) result.delete(token);
  return result;
}

function specificity(text: string, placeName: string): number {
  if (VIDEO_META_RE.test(text)) return 0;
  return distinctiveTokens(text, placeName).size;
}

function tooSimilar(left: string, right: string, placeName: string): boolean {
  const a = distinctiveTokens(left, placeName);
  const b = distinctiveTokens(right, placeName);
  if (a.size === 0 || b.size === 0) return false;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / (a.size + b.size - overlap) >= NEAR_DUP_JACCARD;
}

/** Drop brochure/video blurbs and near-duplicates; keep a few specific claims. */
export function compactMentionDetails(details: string[], placeName = ""): string[] {
  const scored = details
    .map((raw, index) => {
      const text = raw.split(/\s+/).join(" ").trim();
      return { text, index, score: text ? specificity(text, placeName) : 0 };
    })
    .filter((item) => item.score >= MIN_DISTINCTIVE)
    .sort((left, right) => right.score - left.score || left.index - right.index);

  const kept: string[] = [];
  for (const item of scored) {
    if (kept.some((existing) => tooSimilar(item.text, existing, placeName))) continue;
    kept.push(item.text);
    if (kept.length >= MAX_DETAILS) break;
  }
  return kept;
}
