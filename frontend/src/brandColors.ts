/**
 * Common Wanderfile brand colors — JS mirror of `wf-tokens.css`.
 *
 * Prefer CSS: `var(--wf-forest)`, `rgb(var(--wf-forest-rgb) / 0.2)`.
 * Use this module when you need hex (Leaflet, canvas) or CSS-var strings
 * for inline styles / demo swatches. Hex values stay in sync with the
 * color picker via `applyBrandPalette` / `resetBrandPalette`.
 */

export const DEFAULT_BRAND_HEX = {
  forest: "#ffb648",
  forestMid: "#ffc56a",
  forestDeep: "#0e1013",
  forestHover: "#f0a02a",
  sage: "#f0a02a",
  mint: "#ffd79a",
  cream: "#f2f3f5",
  soft: "#1d2128",
  bg: "#0e1013",
  surface: "#171a1f",
  surfaceMuted: "#14171c",
  fog: "#1d2128",
  border: "#2a2e35",
  ink: "#20180a",
  quiet: "#5c564e",
  subtle: "#5c564e",
  sand: "#c4a882",
  clay: "#9a7358",
  slate: "#3d6b8a",
  plum: "#6f5f8a",
  coral: "#ffb648",
  coralSoft: "#ffd79a",
  coralDeep: "#f0a02a",
  white: "#ffffff",
} as const;

export type BrandHexKey = keyof typeof DEFAULT_BRAND_HEX;

/** Live hex values (updated when the brand color picker changes). */
export const BrandHex: Record<BrandHexKey, string> = { ...DEFAULT_BRAND_HEX };

/** CSS custom-property references — auto-follow `:root` token changes. */
export const BrandCss = {
  forest: "var(--wf-forest)",
  forestMid: "var(--wf-forest-mid)",
  forestDeep: "var(--wf-forest-deep)",
  forestHover: "var(--wf-forest-hover)",
  sage: "var(--wf-sage)",
  mint: "var(--wf-mint)",
  cream: "var(--wf-cream)",
  soft: "var(--wf-soft)",
  bg: "var(--wf-bg)",
  surface: "var(--wf-surface)",
  surfaceMuted: "var(--wf-surface-muted)",
  fog: "var(--wf-fog)",
  border: "var(--wf-border)",
  ink: "var(--wf-ink)",
  quiet: "var(--wf-quiet)",
  subtle: "var(--wf-subtle)",
  sand: "var(--wf-sand)",
  clay: "var(--wf-clay)",
  slate: "var(--wf-slate)",
  plum: "var(--wf-plum)",
  coral: "var(--wf-coral)",
  coralSoft: "var(--wf-coral-soft)",
  coralDeep: "var(--wf-coral-deep)",
  white: "var(--wf-surface)",
  forestRgb: (alpha: number) => `rgb(var(--wf-forest-rgb) / ${alpha})`,
  forestMidRgb: (alpha: number) => `rgb(var(--wf-forest-mid-rgb) / ${alpha})`,
  forestDeepRgb: (alpha: number) => `rgb(var(--wf-forest-deep-rgb) / ${alpha})`,
  forestHoverRgb: (alpha: number) => `rgb(var(--wf-forest-hover-rgb) / ${alpha})`,
  sageRgb: (alpha: number) => `rgb(var(--wf-sage-rgb) / ${alpha})`,
  mintRgb: (alpha: number) => `rgb(var(--wf-mint-rgb) / ${alpha})`,
  creamRgb: (alpha: number) => `rgb(var(--wf-cream-rgb) / ${alpha})`,
  inkRgb: (alpha: number) => `rgb(var(--wf-ink-rgb) / ${alpha})`,
  sandRgb: (alpha: number) => `rgb(var(--wf-sand-rgb) / ${alpha})`,
  clayRgb: (alpha: number) => `rgb(var(--wf-clay-rgb) / ${alpha})`,
  coralRgb: (alpha: number) => `rgb(var(--wf-coral-rgb) / ${alpha})`,
} as const;

/** Alias used by demos (swatches should use BrandCss so they track the picker). */
export const P = BrandCss;

const TOKEN_TO_HEX_KEY: Record<string, BrandHexKey> = {
  "--wf-forest": "forest",
  "--wf-forest-mid": "forestMid",
  "--wf-forest-deep": "forestDeep",
  "--wf-forest-hover": "forestHover",
  "--wf-sage": "sage",
  "--wf-mint": "mint",
  "--wf-cream": "cream",
  "--wf-soft": "soft",
  "--wf-bg": "bg",
  "--wf-surface": "surface",
  "--wf-surface-muted": "surfaceMuted",
  "--wf-fog": "fog",
  "--wf-border": "border",
  "--wf-ink": "ink",
  "--wf-quiet": "quiet",
  "--wf-subtle": "subtle",
  "--wf-sand": "sand",
  "--wf-clay": "clay",
  "--wf-slate": "slate",
  "--wf-plum": "plum",
  "--wf-coral": "coral",
  "--wf-coral-soft": "coralSoft",
  "--wf-coral-deep": "coralDeep",
};

export function syncBrandHexFromTokens(tokens: Record<string, string>): void {
  for (const [token, value] of Object.entries(tokens)) {
    const key = TOKEN_TO_HEX_KEY[token];
    if (key && value.startsWith("#")) {
      BrandHex[key] = value;
    }
  }
  BrandHex.white = BrandHex.surface;
}

export function resetBrandHex(): void {
  Object.assign(BrandHex, DEFAULT_BRAND_HEX);
}

/** Resolve a color value that may be `var(--wf-*)` or a raw css color for Leaflet/canvas. */
export function resolveColor(value: string): string {
  const trimmed = value.trim();
  const varMatch = trimmed.match(/^var\(\s*(--[\w-]+)\s*(?:,[^)]+)?\)$/);
  if (varMatch) {
    const token = varMatch[1];
    const fromHex = TOKEN_TO_HEX_KEY[token];
    if (fromHex) {
      return BrandHex[fromHex];
    }
    if (typeof document !== "undefined") {
      const live = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
      if (live) {
        return live;
      }
    }
  }
  return trimmed;
}
