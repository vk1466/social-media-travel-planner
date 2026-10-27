export type CanonicalCategory =
  | "Food"
  | "Cafe"
  | "Sight"
  | "Nature"
  | "Stay"
  | "Nightlife"
  | "Shopping"
  | "Other";

export interface CategoryVisual {
  name: CanonicalCategory;
  hue: string;
  tint: string;
  glyph: string;
}

export const CATEGORY_MAP: Record<CanonicalCategory, CategoryVisual> = {
  Food: { name: "Food", hue: "#F2994A", tint: "rgba(242, 153, 74, 0.12)", glyph: "🍴" },
  Cafe: { name: "Cafe", hue: "#A0703E", tint: "rgba(160, 112, 62, 0.12)", glyph: "☕" },
  Sight: { name: "Sight", hue: "#2F80ED", tint: "rgba(47, 128, 237, 0.12)", glyph: "🏛️" },
  Nature: { name: "Nature", hue: "#27AE60", tint: "rgba(39, 174, 96, 0.12)", glyph: "🌲" },
  Stay: { name: "Stay", hue: "#9B51E0", tint: "rgba(155, 81, 224, 0.12)", glyph: "🛏️" },
  Nightlife: { name: "Nightlife", hue: "#EB5757", tint: "rgba(235, 87, 87, 0.12)", glyph: "🍸" },
  Shopping: { name: "Shopping", hue: "#D6A100", tint: "rgba(214, 161, 0, 0.12)", glyph: "🛍️" },
  Other: { name: "Other", hue: "#6B7280", tint: "rgba(107, 114, 128, 0.12)", glyph: "📍" },
};

export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  "Food",
  "Cafe",
  "Sight",
  "Nature",
  "Stay",
  "Nightlife",
  "Shopping",
  "Other",
];

export function getCategoryVisual(category?: string | null): CategoryVisual {
  if (!category) return CATEGORY_MAP.Other;
  const c = category.toLowerCase().trim();
  if (["food", "restaurant", "bakery", "eats", "dining"].includes(c)) return CATEGORY_MAP.Food;
  if (["cafe", "café", "coffee", "tea", "breakfast"].includes(c)) return CATEGORY_MAP.Cafe;
  if (["sight", "landmark", "attraction", "museum", "culture", "city", "neighborhood", "architecture"].includes(c)) return CATEGORY_MAP.Sight;
  if (["nature", "hike", "viewpoint", "park", "waterfall", "lake", "beach", "outdoors", "mountain"].includes(c)) return CATEGORY_MAP.Nature;
  if (["stay", "hotel", "hostel", "resort", "lodge", "accommodation"].includes(c)) return CATEGORY_MAP.Stay;
  if (["nightlife", "bar", "club", "pub", "lounge", "cocktail"].includes(c)) return CATEGORY_MAP.Nightlife;
  if (["shopping", "market", "store", "boutique", "vintage"].includes(c)) return CATEGORY_MAP.Shopping;
  return CATEGORY_MAP.Other;
}
