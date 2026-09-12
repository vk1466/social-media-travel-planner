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
  outdoors: { bg: "#204848", text: "#a7c5b7", border: "#2c5a56" },
  water: { bg: "#1c4654", text: "#9fc4d4", border: "#2a5c68" },
  place: { bg: "#34453e", text: "#d2c4a8", border: "#4a5c52" },
  culture: { bg: "#2c3c52", text: "#c7b3d8", border: "#3e4e64" },
  food: { bg: "#3a3f42", text: "#e0b4a4", border: "#4e5254" },
  market: { bg: "#363e4a", text: "#d8a8b8", border: "#4a5260" },
  stay: { bg: "#1e4254", text: "#a8c0d4", border: "#2c5668" },
  muted: { bg: "#1f3d48", text: "#b2cbd0", border: "#2a5260" },
};
