/** Post-level content topics — orthogonal to Place.category. */

export const CONTENT_CATEGORIES = [
  "travel",
  "movies",
  "fashion",
  "hairstyle",
  "food",
  "other",
] as const;

export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

export const CONTENT_CATEGORY_LABELS: Record<ContentCategory, string> = {
  travel: "Travel",
  movies: "Movies & TV",
  fashion: "Fashion",
  hairstyle: "Hairstyle",
  food: "Food",
  other: "Other",
};

export const CONTENT_CATEGORY_KICKERS: Record<ContentCategory, string> = {
  travel: "Atlas",
  movies: "Reel",
  fashion: "Look",
  hairstyle: "Cut",
  food: "Table",
  other: "Shelf",
};

/** Categories that have a native browse surface (atlas, etc.), not only posts. */
export const CATEGORY_NATIVE_VIEWS: ReadonlySet<ContentCategory> = new Set(["travel"]);

export interface ContentCategoryPost {
  content_category?: string | null;
  place_ids: string[];
}

export function isContentCategory(value: string): value is ContentCategory {
  return (CONTENT_CATEGORIES as readonly string[]).includes(value);
}

export function effectiveContentCategory(post: ContentCategoryPost): ContentCategory {
  if (post.content_category && isContentCategory(post.content_category)) {
    return post.content_category;
  }
  if (post.place_ids.length > 0) {
    return "travel";
  }
  return "other";
}

export function contentCategoryLabel(category: string): string {
  if (isContentCategory(category)) {
    return CONTENT_CATEGORY_LABELS[category];
  }
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export interface ContentCategoryTab {
  key: ContentCategory;
  label: string;
  kicker: string;
  count: number;
}

export function contentCategoryTabs(posts: ContentCategoryPost[]): ContentCategoryTab[] {
  const counts = new Map<ContentCategory, number>();
  for (const post of posts) {
    const category = effectiveContentCategory(post);
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return CONTENT_CATEGORIES.filter((category) => (counts.get(category) ?? 0) > 0)
    .sort((left, right) => {
      const byCount = (counts.get(right) ?? 0) - (counts.get(left) ?? 0);
      if (byCount !== 0) return byCount;
      return CONTENT_CATEGORIES.indexOf(left) - CONTENT_CATEGORIES.indexOf(right);
    })
    .map((category) => ({
      key: category,
      label: CONTENT_CATEGORY_LABELS[category],
      kicker: CONTENT_CATEGORY_KICKERS[category],
      count: counts.get(category) ?? 0,
    }));
}
