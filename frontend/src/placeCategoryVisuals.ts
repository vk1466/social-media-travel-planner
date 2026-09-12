import { categoryTone } from "./categoryLabels";

const ICON_START =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
const ICON_END = "</svg>";

export const ALL_FILTER_ICON = "✦";

export const TONE_VISUALS: Record<string, { icon: string; color: string }> = {
  food: {
    icon: `${ICON_START}<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3c3 3 3 8 0 11v7M16 3v11h4"/>${ICON_END}`,
    color: "var(--tone-food)",
  },
  culture: {
    icon: `${ICON_START}<path d="m12 3 9 5H3l9-5ZM5 10v7M9 10v7M15 10v7M19 10v7M3 21h18M4 17h16"/>${ICON_END}`,
    color: "var(--tone-culture)",
  },
  outdoors: {
    icon: `${ICON_START}<path d="m3 20 6-10 4 6 2-3 6 7H3ZM15 7l2-4 2 4"/>${ICON_END}`,
    color: "var(--tone-outdoors)",
  },
  water: {
    icon: `${ICON_START}<path d="M2 8c3-2 5 2 8 0s5 2 8 0 4 0 4 0M2 13c3-2 5 2 8 0s5 2 8 0 4 0 4 0M2 18c3-2 5 2 8 0s5 2 8 0 4 0 4 0"/>${ICON_END}`,
    color: "var(--tone-water)",
  },
  place: {
    icon: `${ICON_START}<path d="M4 21V8l5-3v16M9 21V3l7 3v15M16 21v-9l4-2v11M2 21h20M12 8h1M12 12h1M12 16h1"/>${ICON_END}`,
    color: "var(--tone-place)",
  },
  market: {
    icon: `${ICON_START}<path d="M3 9h18l-2-5H5L3 9ZM5 9v11h14V9M9 20v-6h6v6M4 9c0 2 3 2 4 0 1 2 3 2 4 0 1 2 3 2 4 0 1 2 4 2 4 0"/>${ICON_END}`,
    color: "var(--tone-market)",
  },
  stay: {
    icon: `${ICON_START}<path d="M3 19V9M21 19v-7H8a5 5 0 0 0-5 5v2M3 15h18M7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>${ICON_END}`,
    color: "var(--tone-stay)",
  },
  muted: {
    icon: `${ICON_START}<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>${ICON_END}`,
    color: "var(--tone-muted)",
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  restaurant: TONE_VISUALS.food.icon,
  cafe: `${ICON_START}<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8ZM17 10h2a2 2 0 0 1 0 4h-2M7 3v2M11 3v2M15 3v2"/>${ICON_END}`,
  bar: `${ICON_START}<path d="M5 3h14l-7 8v8M8 21h8M7 6h10"/>${ICON_END}`,
  attraction: `${ICON_START}<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>${ICON_END}`,
  landmark: `${ICON_START}<path d="M6 21h12M8 21V10h8v11M6 10h12l-2-4H8l-2 4ZM10 14h4M10 17h4"/>${ICON_END}`,
  museum: TONE_VISUALS.culture.icon,
  city: TONE_VISUALS.place.icon,
  neighborhood: `${ICON_START}<path d="m3 12 5-4 5 4v8H3v-8Zm10 1 4-3 4 3v7h-8M6 15h3M16 16h2"/>${ICON_END}`,
  hike: TONE_VISUALS.outdoors.icon,
  viewpoint: `${ICON_START}<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${ICON_END}`,
  park: `${ICON_START}<path d="m12 3-5 8h3l-4 6h12l-4-6h3l-5-8ZM12 17v4"/>${ICON_END}`,
  waterfall: `${ICON_START}<path d="M6 3h12M8 3v8c0 4 2 7 4 10M12 3v8c0 3 2 5 4 7M16 3v7"/>${ICON_END}`,
  lake: TONE_VISUALS.water.icon,
  beach: `${ICON_START}<path d="M3 18c4-2 6 2 10 0s6 0 8 0M12 4a5 5 0 0 1 5 5H7a5 5 0 0 1 5-5ZM12 9v9"/>${ICON_END}`,
  market: TONE_VISUALS.market.icon,
  hotel: TONE_VISUALS.stay.icon,
};

const KEY_COLORS: Record<string, string> = {
  dinner: "var(--meal-dinner)",
  lunch: "var(--meal-lunch)",
  breakfast: "var(--meal-breakfast)",
  dessert: "var(--meal-dessert)",
  snack: "var(--meal-snack)",
  cocktail: "var(--meal-cocktail)",
  movie: "var(--watch-movie)",
  tv: "var(--watch-tv)",
};

export function visualForCategory(
  category: string | null | undefined,
  tone = categoryTone(category),
): { color: string; icon: string } {
  const toneVisual = TONE_VISUALS[tone] ?? TONE_VISUALS.muted;
  const key = category === "other" || category === "uncategorized" ? null : category;
  return { color: toneVisual.color, icon: CATEGORY_ICONS[key ?? ""] ?? toneVisual.icon };
}

export function hashSwatch(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  }
  return `hsl(${hash % 360} 32% 42%)`;
}

export function visualForFilterKey(key: string): { color: string; icon: string | null } {
  if (key === "all") {
    return { color: "var(--dark)", icon: null };
  }
  if (CATEGORY_ICONS[key] || key === "other" || key === "uncategorized") {
    return visualForCategory(key === "uncategorized" ? null : key);
  }
  const tone = categoryTone(key);
  if (tone !== "muted" && TONE_VISUALS[tone]) {
    return visualForCategory(key, tone);
  }
  return { color: KEY_COLORS[key] ?? hashSwatch(key), icon: null };
}
