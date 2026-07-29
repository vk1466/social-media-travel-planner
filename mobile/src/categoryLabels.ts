/** Display labels and tone keys for Place.category — keep in sync with frontend. */

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

export const CATEGORY_TONE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  outdoors: { bg: "#e7f3ec", text: "#1f5c3d", border: "#c5e0d0" },
  water: { bg: "#e6f2f7", text: "#2a5f78", border: "#c5dce8" },
  place: { bg: "#eef1f3", text: "#3d4f5c", border: "#d5dde3" },
  culture: { bg: "#f5efe8", text: "#7a5538", border: "#e4d5c4" },
  food: { bg: "#f7efe6", text: "#8a5a2b", border: "#ead7c0" },
  market: { bg: "#f3ece6", text: "#6e4f3a", border: "#e0d0c2" },
  stay: { bg: "#e8eef2", text: "#3a5568", border: "#c9d7e0" },
  muted: { bg: "#f0f2f0", text: "#7a8680", border: "#e8ece9" },
};
