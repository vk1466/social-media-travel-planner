/**
 * Living Map demos — 20 iterations of Hybrid Glaze (r2-11).
 * Constant: sage country glaze, cream ocean, Voyager underlay (hybrid).
 * Varies: pins, map labels, chrome text, glass, accents, light layout framing.
 */

export type LivingMapThemeMode = "light" | "dark";
export type LivingMapLayout =
  | "overlay"
  | "framed"
  | "ribbon"
  | "rail"
  | "aperture"
  | "billboard"
  | "dock";
export type LivingMapLandMode = "tiles" | "countries" | "hybrid";

export interface LivingMapTheme {
  id: string;
  name: string;
  thesis: string;
  mode: LivingMapThemeMode;
  layout: LivingMapLayout;
  land: LivingMapLandMode;
  pageBackground: string;
  ocean: string;
  mapLabel: string;
  text: string;
  textMuted: string;
  brand: string;
  glass: string;
  glassBorder: string;
  accent: string;
  accentText: string;
  pinVisited: string;
  pinDream: string;
  pinDotVisited: string;
  pinDotDream: string;
  pinRing: string;
  sheetBg: string;
  sheetInk: string;
  countryFill: string;
  countryStroke: string;
  tiles: {
    url: string;
    attribution: string;
    subdomains?: string;
    filter?: string;
    opacity?: number;
  };
  wash: string;
  vignette: string;
  swatches: [string, string, string];
}

const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

const VOYAGER = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

const P = {
  forest: "#1f3d31",
  forestMid: "#2a4f40",
  forestDeep: "#173026",
  sage: "#2f6b52",
  soft: "#e8f0ec",
  clay: "#9a7358",
  sand: "#c4a882",
  slate: "#3d6b8a",
  plum: "#6f5f8a",
  bg: "#f4f6f4",
  muted: "#f0f2f0",
  fog: "#e8ece9",
  border: "#dde3de",
  ink: "#1c2420",
  quiet: "#5a6560",
  cream: "#f4f7f5",
  white: "#ffffff",
  mint: "#8fd4b0",
} as const;

/** Shared Hybrid Glaze land / ocean / tiles — locked across all iterations. */
const GLAZE = {
  land: "hybrid" as const,
  ocean: P.cream,
  countryFill: P.sage,
  countryStroke: P.forest,
  tiles: {
    url: VOYAGER,
    attribution: CARTO_ATTR,
    subdomains: "abcd",
    opacity: 0.75,
  },
  sheetBg: P.bg,
  sheetInk: P.ink,
};

function glaze(
  partial: Omit<
    LivingMapTheme,
    | "land"
    | "ocean"
    | "countryFill"
    | "countryStroke"
    | "tiles"
    | "sheetBg"
    | "sheetInk"
    | "wash"
    | "vignette"
  > &
    Partial<Pick<LivingMapTheme, "wash" | "vignette">>,
): LivingMapTheme {
  return {
    ...GLAZE,
    wash: "transparent",
    vignette: "transparent",
    ...partial,
  };
}

export const LIVING_MAP_THEMES: LivingMapTheme[] = [
  glaze({
    id: "hg-14-mono-forest",
    name: "Mono Forest · Quiet Pins",
    thesis: "Chosen combo — Mono Forest chrome with Quiet Chrome sand/slate pins.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.bg,
    mapLabel: P.forestMid,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 255 255 / 0.92)",
    glassBorder: "rgb(31 61 49 / 0.25)",
    accent: P.forestMid,
    accentText: P.cream,
    pinVisited: P.sand,
    pinDream: P.slate,
    pinDotVisited: P.forest,
    pinDotDream: P.cream,
    pinRing: P.white,
    swatches: [P.sage, P.sand, P.slate],
  }),
  glaze({
    id: "hg-01-classic",
    name: "Classic Glaze",
    thesis: "Original Hybrid Glaze — forest/clay pins, white labels.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.bg,
    mapLabel: P.white,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 255 255 / 0.92)",
    glassBorder: P.border,
    accent: P.sage,
    accentText: P.cream,
    pinVisited: P.forestDeep,
    pinDream: P.clay,
    pinDotVisited: P.mint,
    pinDotDream: P.white,
    pinRing: P.white,
    swatches: [P.sage, P.cream, P.clay],
  }),
  glaze({
    id: "hg-02-mint-sand",
    name: "Mint & Sand",
    thesis: "Bright mint visited pins, sand dream pins, cream labels.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.bg,
    mapLabel: P.cream,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 255 255 / 0.92)",
    glassBorder: P.border,
    accent: P.mint,
    accentText: P.forestDeep,
    pinVisited: P.mint,
    pinDream: P.sand,
    pinDotVisited: P.forestDeep,
    pinDotDream: P.forest,
    pinRing: P.white,
    swatches: [P.sage, P.mint, P.sand],
  }),
  glaze({
    id: "hg-03-ink-labels",
    name: "Ink Labels",
    thesis: "Dark forest continent labels on the glaze; slate dream pins.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.bg,
    mapLabel: P.forestDeep,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 255 255 / 0.94)",
    glassBorder: P.border,
    accent: P.forest,
    accentText: P.cream,
    pinVisited: P.white,
    pinDream: P.slate,
    pinDotVisited: P.sage,
    pinDotDream: P.cream,
    pinRing: P.forestDeep,
    swatches: [P.sage, P.forestDeep, P.slate],
  }),
  glaze({
    id: "hg-04-plum-pins",
    name: "Plum Pins",
    thesis: "Plum inspiration pins with mint visited — soft glass chrome.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.soft,
    mapLabel: P.white,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 255 255 / 0.9)",
    glassBorder: "rgb(111 95 138 / 0.28)",
    accent: P.plum,
    accentText: P.cream,
    pinVisited: P.mint,
    pinDream: P.plum,
    pinDotVisited: P.forest,
    pinDotDream: P.cream,
    pinRing: P.white,
    swatches: [P.sage, P.plum, P.mint],
  }),
  glaze({
    id: "hg-05-framed-cream",
    name: "Framed Cream",
    thesis: "Same glaze in a cream frame; sand ring pins, sage chrome.",
    mode: "light",
    layout: "framed",
    pageBackground: P.cream,
    mapLabel: P.cream,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 255 255 / 0.94)",
    glassBorder: P.border,
    accent: P.sage,
    accentText: P.cream,
    pinVisited: P.forest,
    pinDream: P.sand,
    pinDotVisited: P.mint,
    pinDotDream: P.forestDeep,
    pinRing: P.sand,
    swatches: [P.sage, P.cream, P.sand],
  }),
  glaze({
    id: "hg-06-forest-chrome",
    name: "Forest Chrome",
    thesis: "Dark forest glass HUD on the glaze — mint accent CTAs.",
    mode: "dark",
    layout: "overlay",
    pageBackground: P.bg,
    mapLabel: P.mint,
    text: P.cream,
    textMuted: "rgb(244 247 245 / 0.75)",
    brand: P.white,
    glass: "rgb(31 61 49 / 0.9)",
    glassBorder: "rgb(143 212 176 / 0.35)",
    accent: P.mint,
    accentText: P.forestDeep,
    pinVisited: P.mint,
    pinDream: P.white,
    pinDotVisited: P.forestDeep,
    pinDotDream: P.sage,
    pinRing: P.forestDeep,
    swatches: [P.sage, P.forest, P.mint],
  }),
  glaze({
    id: "hg-07-clay-dreams",
    name: "Clay Dreams",
    thesis: "Clay-forward dream pins; soft labels; warm glass border.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.bg,
    mapLabel: P.soft,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 253 250 / 0.94)",
    glassBorder: "rgb(154 115 88 / 0.35)",
    accent: P.clay,
    accentText: P.cream,
    pinVisited: P.forestDeep,
    pinDream: P.clay,
    pinDotVisited: P.sand,
    pinDotDream: P.white,
    pinRing: P.white,
    swatches: [P.sage, P.clay, P.sand],
  }),
  glaze({
    id: "hg-08-slate-signal",
    name: "Slate Signal",
    thesis: "Slate dream pins + slate accent; white visited pins for punch.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.bg,
    mapLabel: P.white,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 255 255 / 0.92)",
    glassBorder: "rgb(61 107 138 / 0.3)",
    accent: P.slate,
    accentText: P.cream,
    pinVisited: P.white,
    pinDream: P.slate,
    pinDotVisited: P.slate,
    pinDotDream: P.cream,
    pinRing: P.forest,
    swatches: [P.sage, P.slate, P.white],
  }),
  glaze({
    id: "hg-09-ribbon-sage",
    name: "Ribbon Sage",
    thesis: "Sage top ribbon chrome; cream labels; forest/sand pins.",
    mode: "light",
    layout: "ribbon",
    pageBackground: `linear-gradient(180deg, ${P.sage} 0 72px, ${P.bg} 72px)`,
    mapLabel: P.cream,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.white,
    glass: "rgb(255 255 255 / 0.94)",
    glassBorder: "rgb(47 107 82 / 0.28)",
    accent: P.forest,
    accentText: P.cream,
    pinVisited: P.forestDeep,
    pinDream: P.sand,
    pinDotVisited: P.mint,
    pinDotDream: P.forest,
    pinRing: P.white,
    swatches: [P.sage, P.bg, P.sand],
  }),
  glaze({
    id: "hg-10-high-contrast",
    name: "High Contrast",
    thesis: "Maximum pin pop — deep forest vs bright sand, dark labels.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.bg,
    mapLabel: P.forestDeep,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forestDeep,
    glass: "rgb(255 255 255 / 0.95)",
    glassBorder: P.forest,
    accent: P.forestDeep,
    accentText: P.cream,
    pinVisited: P.forestDeep,
    pinDream: P.sand,
    pinDotVisited: P.mint,
    pinDotDream: P.forestDeep,
    pinRing: P.white,
    swatches: [P.sage, P.forestDeep, P.sand],
  }),
  glaze({
    id: "hg-11-soft-labels",
    name: "Soft Labels",
    thesis: "Quiet soft-green continent labels; plum + mint pins.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.muted,
    mapLabel: P.soft,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 255 255 / 0.9)",
    glassBorder: P.border,
    accent: P.sage,
    accentText: P.cream,
    pinVisited: P.mint,
    pinDream: P.plum,
    pinDotVisited: P.forest,
    pinDotDream: P.cream,
    pinRing: P.white,
    swatches: [P.sage, P.soft, P.plum],
  }),
  glaze({
    id: "hg-12-dock-ingest",
    name: "Dock Ingest",
    thesis: "Same glaze with forest dock chrome; mint/white pins.",
    mode: "light",
    layout: "dock",
    pageBackground: `linear-gradient(180deg, ${P.bg} 0%, ${P.bg} 62%, ${P.forest} 62%)`,
    mapLabel: P.white,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(31 61 49 / 0.94)",
    glassBorder: "rgb(143 212 176 / 0.3)",
    accent: P.mint,
    accentText: P.forestDeep,
    pinVisited: P.mint,
    pinDream: P.white,
    pinDotVisited: P.forestDeep,
    pinDotDream: P.sage,
    pinRing: P.forest,
    swatches: [P.sage, P.forest, P.mint],
  }),
  glaze({
    id: "hg-13-aperture",
    name: "Glaze Aperture",
    thesis: "Forest vignette spotlight; cream labels; clay/slate pins.",
    mode: "dark",
    layout: "aperture",
    pageBackground: P.forest,
    mapLabel: P.cream,
    text: P.cream,
    textMuted: "rgb(244 247 245 / 0.75)",
    brand: P.white,
    glass: "rgb(23 48 38 / 0.9)",
    glassBorder: "rgb(143 212 176 / 0.3)",
    accent: P.mint,
    accentText: P.forestDeep,
    pinVisited: P.clay,
    pinDream: P.slate,
    pinDotVisited: P.cream,
    pinDotDream: P.cream,
    pinRing: P.white,
    vignette:
      "radial-gradient(circle at center, transparent 38%, rgb(31 61 49 / 0.15) 52%, rgb(31 61 49 / 0.9) 78%, #1f3d31 100%)",
    swatches: [P.sage, P.forest, P.clay],
  }),
  glaze({
    id: "hg-15-sand-ring",
    name: "Sand Ring",
    thesis: "Sand pin rings; white visited / clay dream; ink labels.",
    mode: "light",
    layout: "framed",
    pageBackground: P.soft,
    mapLabel: P.ink,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 255 255 / 0.94)",
    glassBorder: "rgb(196 168 130 / 0.45)",
    accent: P.sand,
    accentText: P.forest,
    pinVisited: P.white,
    pinDream: P.clay,
    pinDotVisited: P.sage,
    pinDotDream: P.cream,
    pinRing: P.sand,
    swatches: [P.sage, P.sand, P.clay],
  }),
  glaze({
    id: "hg-16-billboard",
    name: "Glaze Billboard",
    thesis: "Forest billboard header; white labels; mint/plum pins.",
    mode: "light",
    layout: "billboard",
    pageBackground: `linear-gradient(180deg, ${P.forest} 0%, ${P.forestMid} 24%, ${P.bg} 24%)`,
    mapLabel: P.white,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.white,
    glass: "rgb(255 255 255 / 0.92)",
    glassBorder: P.border,
    accent: P.sage,
    accentText: P.cream,
    pinVisited: P.mint,
    pinDream: P.plum,
    pinDotVisited: P.forestDeep,
    pinDotDream: P.cream,
    pinRing: P.white,
    swatches: [P.sage, P.forest, P.plum],
  }),
  glaze({
    id: "hg-17-quiet-chrome",
    name: "Quiet Chrome",
    thesis: "Muted fog glass; soft brand; sand visited + slate dream.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.fog,
    mapLabel: P.quiet,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.quiet,
    glass: "rgb(244 246 244 / 0.92)",
    glassBorder: P.border,
    accent: P.sage,
    accentText: P.cream,
    pinVisited: P.sand,
    pinDream: P.slate,
    pinDotVisited: P.forest,
    pinDotDream: P.cream,
    pinRing: P.white,
    swatches: [P.sage, P.fog, P.slate],
  }),
  glaze({
    id: "hg-18-rail-label",
    name: "Rail Label",
    thesis: "Sage museum rail; cream labels; forest/clay pins.",
    mode: "light",
    layout: "rail",
    pageBackground: `linear-gradient(90deg, ${P.sage} 0 240px, ${P.bg} 240px)`,
    mapLabel: P.cream,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(47 107 82 / 0.95)",
    glassBorder: "rgb(232 240 236 / 0.4)",
    accent: P.soft,
    accentText: P.sage,
    pinVisited: P.forestDeep,
    pinDream: P.clay,
    pinDotVisited: P.mint,
    pinDotDream: P.white,
    pinRing: P.white,
    swatches: [P.sage, P.bg, P.clay],
  }),
  glaze({
    id: "hg-19-glow-mint",
    name: "Glow Mint",
    thesis: "Mint labels + mint visited pins; sand dreams; soft wash.",
    mode: "light",
    layout: "overlay",
    pageBackground: P.bg,
    mapLabel: P.mint,
    text: P.ink,
    textMuted: P.quiet,
    brand: P.forest,
    glass: "rgb(255 255 255 / 0.92)",
    glassBorder: "rgb(143 212 176 / 0.45)",
    accent: P.mint,
    accentText: P.forestDeep,
    pinVisited: P.mint,
    pinDream: P.sand,
    pinDotVisited: P.forestDeep,
    pinDotDream: P.forest,
    pinRing: P.forestMid,
    wash: "radial-gradient(circle at 30% 20%, rgb(143 212 176 / 0.18), transparent 40%)",
    swatches: [P.sage, P.mint, P.sand],
  }),
  glaze({
    id: "hg-20-night-glass",
    name: "Night Glass",
    thesis: "Dark plum-tinted glass over the same glaze; cream/sand pins.",
    mode: "dark",
    layout: "overlay",
    pageBackground: P.bg,
    mapLabel: P.cream,
    text: P.cream,
    textMuted: "rgb(244 247 245 / 0.72)",
    brand: P.white,
    glass: "rgb(42 36 55 / 0.88)",
    glassBorder: "rgb(111 95 138 / 0.4)",
    accent: "#b8a8d4",
    accentText: "#241c30",
    pinVisited: P.cream,
    pinDream: P.sand,
    pinDotVisited: P.plum,
    pinDotDream: P.forest,
    pinRing: P.forestDeep,
    wash: "linear-gradient(160deg, rgb(111 95 138 / 0.08), transparent 45%)",
    swatches: [P.sage, P.plum, P.sand],
  }),
];

export const DEFAULT_LIVING_MAP_THEME_ID = "hg-14-mono-forest";

export function getLivingMapTheme(themeId?: string | null): LivingMapTheme {
  return LIVING_MAP_THEMES.find((theme) => theme.id === themeId) ?? LIVING_MAP_THEMES[0];
}

export function getLivingMapThemeIndex(themeId?: string | null): number {
  const index = LIVING_MAP_THEMES.findIndex((theme) => theme.id === themeId);
  return index >= 0 ? index : 0;
}

export function getAdjacentLivingMapTheme(
  themeId: string | null | undefined,
  direction: -1 | 1,
): LivingMapTheme {
  const index = getLivingMapThemeIndex(themeId);
  const next = (index + direction + LIVING_MAP_THEMES.length) % LIVING_MAP_THEMES.length;
  return LIVING_MAP_THEMES[next];
}

export function livingMapThemeVars(theme: LivingMapTheme): Record<string, string> {
  return {
    "--lm-page-bg": theme.pageBackground,
    "--lm-ocean": theme.ocean,
    "--lm-map-label": theme.mapLabel,
    "--lm-text": theme.text,
    "--lm-text-muted": theme.textMuted,
    "--lm-brand": theme.brand,
    "--lm-glass": theme.glass,
    "--lm-glass-border": theme.glassBorder,
    "--lm-accent": theme.accent,
    "--lm-accent-text": theme.accentText,
    "--lm-pin-visited": theme.pinVisited,
    "--lm-pin-dream": theme.pinDream,
    "--lm-pin-dot-visited": theme.pinDotVisited,
    "--lm-pin-dot-dream": theme.pinDotDream,
    "--lm-pin-ring": theme.pinRing,
    "--lm-sheet": theme.sheetBg,
    "--lm-ink": theme.sheetInk,
    "--lm-wash": theme.wash,
    "--lm-vignette": theme.vignette,
    "--lm-country-fill": theme.countryFill,
    "--lm-country-stroke": theme.countryStroke,
  };
}
