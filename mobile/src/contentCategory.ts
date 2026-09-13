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

export function contentCategoryTabs(posts: ContentCategoryPost[]): { key: ContentCategory; label: string; count: number }[] {
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
      count: counts.get(category) ?? 0,
    }));
}

export function postsOfCategory<T extends ContentCategoryPost>(posts: T[], category: ContentCategory): T[] {
  return posts.filter((post) => effectiveContentCategory(post) === category);
}
