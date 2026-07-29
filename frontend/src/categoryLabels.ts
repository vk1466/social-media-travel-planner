/** Display labels and CSS tone keys for Place.category values. */

export const CATEGORY_LABELS: Record<string, string> = {
  hike: "Hike",
  viewpoint: "Viewpoint",
  waterfall: "Waterfall",
  lake: "Lake",
  beach: "Beach",
  park: "Park",
  city: "City",
  landmark: "Landmark",
  museum: "Museum",
  market: "Market",
  restaurant: "Restaurant",
  cafe: "Café",
  bar: "Bar",
  hotel: "Hotel",
  neighborhood: "Neighborhood",
};

/** Stable tone key for CSS / mobile styles (groups related categories). */
export const CATEGORY_TONES: Record<string, string> = {
  hike: "outdoors",
  viewpoint: "outdoors",
  waterfall: "water",
  lake: "water",
  beach: "water",
  park: "outdoors",
  city: "place",
  neighborhood: "place",
  landmark: "culture",
  museum: "culture",
  market: "market",
  restaurant: "food",
  cafe: "food",
  bar: "food",
  hotel: "stay",
};

export function categoryLabel(category: string | null | undefined): string {
  if (!category) {
    return "Uncategorized";
  }
  return CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

export function categoryTone(category: string | null | undefined): string {
  if (!category) {
    return "muted";
  }
  return CATEGORY_TONES[category] ?? "muted";
}

export function categoryChipClass(category: string | null | undefined): string {
  return `category-chip category-chip--${categoryTone(category)}`;
}
