import {
  resetBrandHex,
  syncBrandHexFromTokens,
} from "./brandColors";

/** Default Wanderfile brand — Aurora Mint from the color picker. */
export const DEFAULT_BRAND_COLOR = "#1f9c72";

export const DEFAULT_BRAND_SHIFT = 1.1;

export const BRAND_COLOR_STORAGE_KEY = "wf-brand-color";
export const BRAND_LAB_STORAGE_KEY = "wf-brand-lab";
export const BRAND_SAVED_STORAGE_KEY = "wf-brand-saved";

/** Individual faces a text role can pick. */
export const TEXT_FACE_OPTIONS = [
  {
    id: "dm-sans",
    label: "DM Sans",
    stack: '"DM Sans Variable", system-ui, sans-serif',
  },
  {
    id: "source-sans",
    label: "Source Sans",
    stack: '"Source Sans 3 Variable", system-ui, sans-serif',
  },
  {
    id: "system-sans",
    label: "System sans",
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
  {
    id: "instrument",
    label: "Instrument",
    stack: '"Instrument Serif", Georgia, "Times New Roman", serif',
  },
  {
    id: "literata",
    label: "Literata",
    stack: '"Literata Variable", Georgia, "Times New Roman", serif',
  },
  {
    id: "newsreader",
    label: "Newsreader",
    stack: '"Newsreader Variable", Georgia, "Times New Roman", serif',
  },
  {
    id: "system-serif",
    label: "System serif",
    stack: 'Georgia, "Times New Roman", serif',
  },
] as const;

export type TextFaceId = (typeof TEXT_FACE_OPTIONS)[number]["id"];

/** Rem sizes for body / muted / on-brand copy. */
export const TEXT_SIZE_OPTIONS = [
  { id: "xs", label: "XS", rem: "0.8125rem" },
  { id: "sm", label: "S", rem: "0.875rem" },
  { id: "md", label: "M", rem: "1rem" },
  { id: "lg", label: "L", rem: "1.125rem" },
  { id: "xl", label: "XL", rem: "1.25rem" },
] as const;

export type TextSizeId = (typeof TEXT_SIZE_OPTIONS)[number]["id"];

/** Multipliers for display headlines (applied on top of existing clamps). */
export const HEADLINE_SIZE_OPTIONS = [
  { id: "sm", label: "S", scale: "0.9" },
  { id: "md", label: "M", scale: "1" },
  { id: "lg", label: "L", scale: "1.12" },
  { id: "xl", label: "XL", scale: "1.24" },
] as const;

export type HeadlineSizeId = (typeof HEADLINE_SIZE_OPTIONS)[number]["id"];

export type TextRoleId = "body" | "muted" | "headline" | "onBrand";

export type TextRoleStyle = {
  face: TextFaceId;
  size: TextSizeId | HeadlineSizeId;
};

export type TextRoleStyles = Record<TextRoleId, TextRoleStyle>;

/** Copy roles for the dark site — body/muted colors are on-brand + on-dark. */
export const TEXT_ROLES = [
  {
    id: "body" as const,
    label: "Body text",
    tip: "Primary page copy on the dark ground — paragraphs, nav, and list titles.",
    colorKey: "onBrand" as const,
    ownColor: true,
    sample: "Trail notes and place cards",
    sizeKind: "text" as const,
    sampleTone: "ground" as const,
  },
  {
    id: "muted" as const,
    label: "Muted text",
    tip: "Captions, metadata, placeholders, and secondary lines on dark pages.",
    colorKey: "quiet" as const,
    ownColor: true,
    sample: "Saved · 12 places",
    sizeKind: "text" as const,
    sampleTone: "ground" as const,
  },
  {
    id: "headline" as const,
    label: "Headline",
    tip: "Page titles and display headings. Color follows Body text.",
    colorKey: "onBrand" as const,
    ownColor: false,
    sample: "Wanderfile",
    sizeKind: "headline" as const,
    sampleTone: "ground" as const,
  },
  {
    id: "onBrand" as const,
    label: "Buttons",
    tip: "CTA and button labels on brand fills. Color follows Body text.",
    colorKey: "onBrand" as const,
    ownColor: false,
    sample: "Add links",
    sizeKind: "text" as const,
    sampleTone: "fill" as const,
  },
] as const;

export const DEFAULT_TEXT_STYLES: TextRoleStyles = {
  body: { face: "dm-sans", size: "md" },
  muted: { face: "dm-sans", size: "sm" },
  headline: { face: "newsreader", size: "md" },
  onBrand: { face: "dm-sans", size: "sm" },
};

/** Base brand directions — travel-named seeds for the palette. */
export const BRAND_COLOR_PRESETS = [
  { label: "Trail pine", hex: "#1f3d31" },
  { label: "Harbor dusk", hex: "#1a3a4a" },
  { label: "Night atlas", hex: "#1c2430" },
  { label: "Canyon clay", hex: "#5c3a28" },
  { label: "Orchard plum", hex: "#3a2a48" },
  { label: "Cedar teal", hex: "#154540" },
] as const;

/**
 * Role swatches the picker exposes. Mid/hover brand tones stay derived from
 * Brand fill + Contrast — not hand-edited.
 */
export const EDITABLE_BRAND_SWATCHES = [
  {
    key: "forest",
    token: "--wf-forest",
    rgbToken: "--wf-forest-rgb",
    label: "Brand fill",
    tip: "Primary buttons, links, and brand chrome.",
    group: "brand",
  },
  {
    key: "forestDeep",
    token: "--wf-forest-deep",
    rgbToken: "--wf-forest-deep-rgb",
    label: "Dark ground",
    tip: "Dark page backgrounds, sticky headers, and deep heroes.",
    group: "brand",
  },
  {
    key: "sage",
    token: "--wf-sage",
    rgbToken: "--wf-sage-rgb",
    label: "Accent",
    tip: "Chips, visited states, focus rings, and success-tinted UI.",
    group: "brand",
  },
  {
    key: "mint",
    token: "--wf-mint",
    rgbToken: "--wf-mint-rgb",
    label: "Highlight",
    tip: "Light accents on dark surfaces — nav underlines, borders, sparks.",
    group: "brand",
  },
  {
    key: "ink",
    token: "--wf-ink",
    rgbToken: "--wf-ink-rgb",
    label: "Contrast ink",
    tip: "Reserved dark ink for chips and light insets — not page copy.",
    group: "internal",
  },
  {
    key: "quiet",
    token: "--wf-on-dark",
    rgbToken: null,
    label: "Muted text",
    tip: "Captions, metadata, and secondary copy on dark pages (--wf-on-dark).",
    group: "text",
  },
  {
    key: "onBrand",
    token: "--wf-on-brand",
    rgbToken: null,
    label: "Body text",
    tip: "Primary page copy and labels on the dark ground.",
    group: "text",
  },
] as const;

export type EditableBrandKey = (typeof EDITABLE_BRAND_SWATCHES)[number]["key"];
export type EditableSwatchGroup = (typeof EDITABLE_BRAND_SWATCHES)[number]["group"];

/** Hand-tuned swatches — Aurora Mint on light paper (Volume default). */
export const DEFAULT_BRAND_OVERRIDES: Partial<Record<EditableBrandKey, string>> = {
  forestDeep: "#0b241d",
  sage: "#3fc79a",
  mint: "#a2f0d0",
  /* Muted-on-dark only — light-paper muted lives in --wf-quiet (derived). */
  quiet: "#a8b4af",
  onBrand: "#ecfaf4",
};

export type BrandMode = "dark" | "light";

export const BRAND_MODES: readonly BrandMode[] = ["dark", "light"] as const;

export type BrandLabState = {
  base: string;
  /** 0 = flat family, 1 = default spread, 2 = strong dark/light separation */
  shift: number;
  overrides: Partial<Record<EditableBrandKey, string>>;
  /** Per-role typeface + size for body, muted, headline, on-brand */
  textStyles: TextRoleStyles;
  /** Light or dark chrome — routes through .wf-site[data-tone]. */
  mode: BrandMode;
};

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function textFaceById(id: string | undefined): (typeof TEXT_FACE_OPTIONS)[number] {
  return TEXT_FACE_OPTIONS.find((item) => item.id === id) ?? TEXT_FACE_OPTIONS[0];
}

function textSizeById(id: string | undefined): (typeof TEXT_SIZE_OPTIONS)[number] {
  return TEXT_SIZE_OPTIONS.find((item) => item.id === id) ?? TEXT_SIZE_OPTIONS[2];
}

function headlineSizeById(id: string | undefined): (typeof HEADLINE_SIZE_OPTIONS)[number] {
  return HEADLINE_SIZE_OPTIONS.find((item) => item.id === id) ?? HEADLINE_SIZE_OPTIONS[1];
}

function normalizeTextStyles(raw: Partial<TextRoleStyles> | undefined): TextRoleStyles {
  const next: TextRoleStyles = { ...DEFAULT_TEXT_STYLES };
  if (!raw || typeof raw !== "object") {
    return next;
  }
  for (const role of TEXT_ROLES) {
    const entry = raw[role.id];
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const face = textFaceById(entry.face).id;
    const size =
      role.sizeKind === "headline"
        ? headlineSizeById(entry.size).id
        : textSizeById(entry.size).id;
    next[role.id] = { face, size };
  }
  return next;
}

/** Map legacy global typeface/scale prefs into per-role styles. */
function migrateLegacyType(raw: Record<string, unknown>): TextRoleStyles {
  const textStyles = raw.textStyles;
  if (textStyles && typeof textStyles === "object") {
    return normalizeTextStyles(textStyles as Partial<TextRoleStyles>);
  }
  const styles: TextRoleStyles = {
    body: { ...DEFAULT_TEXT_STYLES.body },
    muted: { ...DEFAULT_TEXT_STYLES.muted },
    headline: { ...DEFAULT_TEXT_STYLES.headline },
    onBrand: { ...DEFAULT_TEXT_STYLES.onBrand },
  };
  const pairing = typeof raw.typeface === "string" ? raw.typeface : undefined;
  if (pairing === "field-notes") {
    styles.body = { face: "source-sans", size: "md" };
    styles.muted = { face: "source-sans", size: "sm" };
    styles.headline = { face: "literata", size: "md" };
    styles.onBrand = { face: "source-sans", size: "sm" };
  } else if (pairing === "broadsheet") {
    styles.body = { face: "source-sans", size: "md" };
    styles.muted = { face: "source-sans", size: "sm" };
    styles.headline = { face: "newsreader", size: "md" };
    styles.onBrand = { face: "source-sans", size: "sm" };
  } else if (pairing === "system") {
    styles.body = { face: "system-sans", size: "md" };
    styles.muted = { face: "system-sans", size: "sm" };
    styles.headline = { face: "system-serif", size: "md" };
    styles.onBrand = { face: "system-sans", size: "sm" };
  }
  if (typeof raw.typeScale === "number") {
    const scale = raw.typeScale;
    const sizeId: TextSizeId =
      scale < 0.95 ? "sm" : scale > 1.12 ? "xl" : scale > 1.04 ? "lg" : "md";
    const mutedId: TextSizeId =
      sizeId === "sm" ? "xs" : sizeId === "lg" || sizeId === "xl" ? "md" : "sm";
    const headlineId: HeadlineSizeId = scale < 0.95 ? "sm" : scale > 1.12 ? "lg" : "md";
    styles.body = { ...styles.body, size: sizeId };
    styles.muted = { ...styles.muted, size: mutedId };
    styles.headline = { ...styles.headline, size: headlineId };
    styles.onBrand = { ...styles.onBrand, size: mutedId };
  }
  return styles;
}

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = raw
      .split("")
      .map((ch) => `${ch}${ch}`)
      .join("");
    return `#${expanded.toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toLowerCase()}`;
  }
  return null;
}

function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex) ?? DEFAULT_BRAND_COLOR;
  const value = normalized.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rn = 0;
  let gn = 0;
  let bn = 0;
  if (h < 60) {
    rn = c;
    gn = x;
  } else if (h < 120) {
    rn = x;
    gn = c;
  } else if (h < 180) {
    gn = c;
    bn = x;
  } else if (h < 240) {
    gn = x;
    bn = c;
  } else if (h < 300) {
    rn = x;
    bn = c;
  } else {
    rn = c;
    bn = x;
  }
  return {
    r: (rn + m) * 255,
    g: (gn + m) * 255,
    b: (bn + m) * 255,
  };
}

function fromHsl(h: number, s: number, l: number): Rgb {
  return hslToRgb({ h, s: clamp(s, 0, 1), l: clamp(l, 0, 1) });
}

function rgbChannels(rgb: Rgb): string {
  return `${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)}`;
}

let brandVersion = 0;
const brandListeners = new Set<() => void>();

export function getBrandVersion(): number {
  return brandVersion;
}

export function subscribeBrandVersion(listener: () => void): () => void {
  brandListeners.add(listener);
  return () => {
    brandListeners.delete(listener);
  };
}

function bumpBrandVersion(): void {
  brandVersion += 1;
  for (const listener of brandListeners) {
    listener();
  }
}

export type BrandPalette = Record<string, string>;

export type BrandSwatchMap = Record<EditableBrandKey, string>;

const SWATCH_TOKEN: Record<EditableBrandKey, string> = {
  forest: "--wf-forest",
  forestDeep: "--wf-forest-deep",
  sage: "--wf-sage",
  mint: "--wf-mint",
  ink: "--wf-ink",
  quiet: "--wf-on-dark",
  onBrand: "--wf-on-brand",
};

const DEFAULT_SWATCH_HEX: BrandSwatchMap = {
  forest: DEFAULT_BRAND_COLOR,
  forestDeep: "#0b241d",
  sage: "#3fc79a",
  mint: "#a2f0d0",
  ink: "#1c2623",
  quiet: "#a8b4af",
  onBrand: "#ecfaf4",
};

/** Derive the Wanderfile token set from a brand hex + shift amount. */
export function deriveBrandPalette(
  brandHex: string,
  shift: number = DEFAULT_BRAND_SHIFT,
): BrandPalette {
  const forest = hexToRgb(brandHex);
  const { h, s, l } = rgbToHsl(forest);
  const spread = clamp(shift, 0, 2);

  const forestMid = fromHsl(h, s * 0.94, clamp(l + 0.06 * spread, 0.04, 0.94));
  const forestDeep = fromHsl(h, Math.min(1, s * 1.04), clamp(l - 0.05 * spread, 0.03, 0.9));
  const forestHover = fromHsl(h, Math.min(1, s * 1.04), clamp(l - 0.04 * spread, 0.03, 0.92));
  const sage = fromHsl(h, Math.min(1, s * 1.12), clamp(l + 0.1 * spread, 0.08, 0.72));
  const mintLift = l < 0.5 ? 0.35 * spread : 0.08 * spread;
  const mint = fromHsl(
    h,
    Math.min(1, s * 1.15),
    clamp(Math.max(l, 0.62) + mintLift, 0.55, 0.86),
  );
  const soft = fromHsl(h, Math.min(0.22, s * 0.55), clamp(Math.max(l, 0.88), 0.9, 0.96));
  const cream = fromHsl(h, Math.min(0.16, s * 0.4), 0.965);
  const bg = fromHsl(h, Math.min(0.12, s * 0.3), 0.96);
  const surfaceMuted = fromHsl(h, Math.min(0.1, s * 0.25), 0.945);
  const fog = fromHsl(h, Math.min(0.12, s * 0.3), 0.92);
  const border = fromHsl(h, Math.min(0.12, s * 0.28), 0.88);
  const ink = fromHsl(h, Math.min(0.16, s * 0.4), 0.13);
  const onBrand = l > 0.55 ? ink : cream;
  // Quiet = muted on light paper (dark gray-green). Never use this on dark grounds.
  const quiet = fromHsl(
    h,
    Math.min(0.14, s * 0.35),
    clamp(rgbToHsl(ink).l + 0.22 * Math.max(spread, 0.6), 0.28, 0.42),
  );
  // On-dark = muted on dark grounds (light gray-green).
  const onDark = fromHsl(
    h,
    Math.min(0.14, s * 0.32),
    clamp(rgbToHsl(onBrand).l - 0.22 * Math.max(spread, 0.6), 0.55, 0.78),
  );
  const inkHex = rgbToHex(ink);
  const quietHex = rgbToHex(quiet);
  const onBrandHex = rgbToHex(onBrand);
  const onDarkHex = rgbToHex(onDark);

  return {
    "--wf-forest": rgbToHex(forest),
    "--wf-forest-mid": rgbToHex(forestMid),
    "--wf-forest-deep": rgbToHex(forestDeep),
    "--wf-forest-hover": rgbToHex(forestHover),
    "--wf-sage": rgbToHex(sage),
    "--wf-mint": rgbToHex(mint),
    "--wf-cream": rgbToHex(cream),
    "--wf-soft": rgbToHex(soft),
    "--wf-bg": rgbToHex(bg),
    "--wf-surface-muted": rgbToHex(surfaceMuted),
    "--wf-fog": rgbToHex(fog),
    "--wf-border": rgbToHex(border),
    "--wf-border-subtle": rgbToHex(fog),
    "--wf-ink": inkHex,
    "--wf-quiet": quietHex,
    "--wf-subtle": quietHex,
    "--wf-text": onBrandHex,
    "--wf-text-muted": quietHex,
    "--wf-success": rgbToHex(sage),
    "--wf-on-brand": onBrandHex,
    "--wf-text-on-brand": onBrandHex,
    "--wf-on-dark": onDarkHex,
    "--wf-on-dark-strong": `color-mix(in srgb, ${onBrandHex} 92%, ${onDarkHex})`,
    "--wf-forest-rgb": rgbChannels(forest),
    "--wf-forest-mid-rgb": rgbChannels(forestMid),
    "--wf-forest-deep-rgb": rgbChannels(forestDeep),
    "--wf-forest-hover-rgb": rgbChannels(forestHover),
    "--wf-sage-rgb": rgbChannels(sage),
    "--wf-cream-rgb": rgbChannels(cream),
    "--wf-mint-rgb": rgbChannels(mint),
    "--wf-ink-rgb": rgbChannels(ink),
  };
}

export function swatchesFromPalette(palette: BrandPalette): BrandSwatchMap {
  return {
    forest: palette["--wf-forest"] ?? DEFAULT_SWATCH_HEX.forest,
    forestDeep: palette["--wf-forest-deep"] ?? DEFAULT_SWATCH_HEX.forestDeep,
    sage: palette["--wf-sage"] ?? DEFAULT_SWATCH_HEX.sage,
    mint: palette["--wf-mint"] ?? DEFAULT_SWATCH_HEX.mint,
    ink: palette["--wf-ink"] ?? DEFAULT_SWATCH_HEX.ink,
    // Picker “quiet” edits muted-on-dark.
    quiet: palette["--wf-on-dark"] ?? DEFAULT_SWATCH_HEX.quiet,
    onBrand: palette["--wf-on-brand"] ?? DEFAULT_SWATCH_HEX.onBrand,
  };
}

export function readLiveSwatches(): BrandSwatchMap {
  const root = getComputedStyle(document.documentElement);
  const read = (token: string, fallback: string) => root.getPropertyValue(token).trim() || fallback;
  return {
    forest: read("--wf-forest", DEFAULT_SWATCH_HEX.forest),
    forestDeep: read("--wf-forest-deep", DEFAULT_SWATCH_HEX.forestDeep),
    sage: read("--wf-sage", DEFAULT_SWATCH_HEX.sage),
    mint: read("--wf-mint", DEFAULT_SWATCH_HEX.mint),
    ink: read("--wf-ink", DEFAULT_SWATCH_HEX.ink),
    quiet: read("--wf-on-dark", DEFAULT_SWATCH_HEX.quiet),
    onBrand: read("--wf-on-brand", DEFAULT_SWATCH_HEX.onBrand),
  };
}

function applyPaletteToDom(palette: BrandPalette): void {
  const root = document.documentElement;
  for (const [token, value] of Object.entries(palette)) {
    root.style.setProperty(token, value);
  }
  root.style.setProperty("--forest-ring", `rgb(var(--wf-forest-rgb) / 0.18)`);
  syncBrandHexFromTokens(palette);
  bumpBrandVersion();
}

function applyOverridesToDom(overrides: BrandLabState["overrides"]): void {
  const root = document.documentElement;
  for (const swatch of EDITABLE_BRAND_SWATCHES) {
    const hex = overrides[swatch.key];
    if (!hex) {
      continue;
    }
    root.style.setProperty(swatch.token, hex);
    if (swatch.rgbToken) {
      root.style.setProperty(swatch.rgbToken, rgbChannels(hexToRgb(hex)));
    }
    syncBrandHexFromTokens({ [swatch.token]: hex });
  }

  if (overrides.sage) {
    root.style.setProperty("--wf-success", overrides.sage);
  }

  if (overrides.ink) {
    root.style.setProperty("--wf-text", overrides.onBrand ?? overrides.ink);
  }
  if (overrides.quiet) {
    // “quiet” swatch = muted-on-dark only. Light-paper muted stays --wf-quiet.
    root.style.setProperty("--wf-on-dark", overrides.quiet);
    const onBrandLive =
      overrides.onBrand ??
      (getComputedStyle(root).getPropertyValue("--wf-on-brand").trim() ||
        DEFAULT_SWATCH_HEX.onBrand);
    root.style.setProperty(
      "--wf-on-dark-strong",
      `color-mix(in srgb, ${onBrandLive} 92%, ${overrides.quiet})`,
    );
  }

  // Keep on-brand / on-dark coherent unless the user overrode them.
  if (!overrides.onBrand) {
    const forest =
      overrides.forest ??
      getComputedStyle(root).getPropertyValue("--wf-forest").trim() ??
      DEFAULT_BRAND_COLOR;
    const { l } = rgbToHsl(hexToRgb(forest));
    const cream = hexToRgb(
      getComputedStyle(root).getPropertyValue("--wf-cream").trim() || "#f4f7f5",
    );
    const ink = hexToRgb(
      overrides.ink ??
        (getComputedStyle(root).getPropertyValue("--wf-ink").trim() || "#1c2420"),
    );
    const onBrand = l > 0.55 ? ink : cream;
    const onBrandHex = rgbToHex(onBrand);
    root.style.setProperty("--wf-on-brand", onBrandHex);
    root.style.setProperty("--wf-text-on-brand", onBrandHex);
    root.style.setProperty("--wf-text", onBrandHex);
    if (!overrides.quiet) {
      const onDark = fromHsl(
        rgbToHsl(onBrand).h,
        Math.min(0.14, rgbToHsl(onBrand).s * 0.32),
        clamp(rgbToHsl(onBrand).l - 0.22, 0.55, 0.78),
      );
      const onDarkHex = rgbToHex(onDark);
      root.style.setProperty("--wf-on-dark", onDarkHex);
      root.style.setProperty(
        "--wf-on-dark-strong",
        `color-mix(in srgb, ${onBrandHex} 92%, ${onDarkHex})`,
      );
    }
  } else {
    const onBrand = hexToRgb(overrides.onBrand);
    const onBrandL = rgbToHsl(onBrand).l;
    root.style.setProperty("--wf-text-on-brand", overrides.onBrand);
    // Light on-brand is button/label-on-fill; page copy stays ink.
    const pageText =
      onBrandL > 0.55
        ? getComputedStyle(root).getPropertyValue("--wf-ink").trim() || "#1c2623"
        : overrides.onBrand;
    root.style.setProperty("--wf-text", pageText);
    if (!overrides.quiet) {
      const onDark = fromHsl(
        rgbToHsl(onBrand).h,
        Math.min(0.14, rgbToHsl(onBrand).s * 0.32),
        clamp(rgbToHsl(onBrand).l - 0.22, 0.55, 0.78),
      );
      const onDarkHex = rgbToHex(onDark);
      root.style.setProperty("--wf-on-dark", onDarkHex);
      root.style.setProperty(
        "--wf-on-dark-strong",
        `color-mix(in srgb, ${overrides.onBrand} 92%, ${onDarkHex})`,
      );
    } else {
      root.style.setProperty(
        "--wf-on-dark-strong",
        `color-mix(in srgb, ${overrides.onBrand} 92%, ${overrides.quiet})`,
      );
    }
  }
  bumpBrandVersion();
}

function applyTextStylesToDom(styles: TextRoleStyles): void {
  const root = document.documentElement;
  const bodyFace = textFaceById(styles.body.face).stack;
  const mutedFace = textFaceById(styles.muted.face).stack;
  const headlineFace = textFaceById(styles.headline.face).stack;
  const onBrandFace = textFaceById(styles.onBrand.face).stack;
  const bodySize = textSizeById(styles.body.size).rem;
  const mutedSize = textSizeById(styles.muted.size).rem;
  const onBrandSize = textSizeById(styles.onBrand.size).rem;
  const headlineScale = headlineSizeById(styles.headline.size).scale;

  root.style.setProperty("--wf-font-body", bodyFace);
  root.style.setProperty("--wf-font-muted", mutedFace);
  root.style.setProperty("--wf-font-headline", headlineFace);
  root.style.setProperty("--wf-font-on-brand", onBrandFace);
  root.style.setProperty("--wf-size-body", bodySize);
  root.style.setProperty("--wf-size-muted", mutedSize);
  root.style.setProperty("--wf-size-on-brand", onBrandSize);
  root.style.setProperty("--wf-size-headline", headlineScale);
  // Back-compat aliases used across existing CSS
  root.style.setProperty("--wf-font-sans", bodyFace);
  root.style.setProperty("--wf-font-serif", headlineFace);
}

export const DEFAULT_BRAND_MODE: BrandMode = "light";

export function defaultBrandLabState(): BrandLabState {
  return {
    base: DEFAULT_BRAND_COLOR,
    shift: DEFAULT_BRAND_SHIFT,
    overrides: { ...DEFAULT_BRAND_OVERRIDES },
    textStyles: {
      body: { ...DEFAULT_TEXT_STYLES.body },
      muted: { ...DEFAULT_TEXT_STYLES.muted },
      headline: { ...DEFAULT_TEXT_STYLES.headline },
      onBrand: { ...DEFAULT_TEXT_STYLES.onBrand },
    },
    mode: DEFAULT_BRAND_MODE,
  };
}

/** Resolve the swatches a lab state would show, without touching the DOM. */
export function swatchesFromLab(state: BrandLabState): BrandSwatchMap {
  const base = normalizeHex(state.base) ?? DEFAULT_BRAND_COLOR;
  const palette = deriveBrandPalette(base, clamp(state.shift, 0, 2));
  return {
    ...swatchesFromPalette(palette),
    ...Object.fromEntries(
      Object.entries(state.overrides).filter(([, hex]) => Boolean(hex)),
    ),
  } as BrandSwatchMap;
}

function applyModeToDom(mode: BrandMode): void {
  const root = document.documentElement;
  root.dataset.wfMode = mode;
  for (const el of document.querySelectorAll<HTMLElement>(
    ".wf-site, .wf-header",
  )) {
    el.dataset.tone = mode;
  }
}

export function applyBrandLab(state: BrandLabState): BrandSwatchMap {
  const base = normalizeHex(state.base) ?? DEFAULT_BRAND_COLOR;
  const shift = clamp(state.shift, 0, 2);
  const textStyles = normalizeTextStyles(state.textStyles);
  const mode: BrandMode = state.mode === "light" ? "light" : "dark";
  const palette = deriveBrandPalette(base, shift);
  applyPaletteToDom(palette);
  applyOverridesToDom(state.overrides);
  applyTextStylesToDom(textStyles);
  applyModeToDom(mode);
  return swatchesFromLab({ ...state, base, shift, mode });
}

/** Current mode from storage (used by SiteLayout / SiteHeader). */
export function readBrandMode(): BrandMode {
  return readBrandLabState().mode;
}

/** @deprecated Prefer applyBrandLab — kept for simple one-shot base applies. */
export function applyBrandPalette(
  brandHex: string,
  shift: number = DEFAULT_BRAND_SHIFT,
): string {
  const hex = normalizeHex(brandHex) ?? DEFAULT_BRAND_COLOR;
  applyBrandLab({ ...defaultBrandLabState(), base: hex, shift });
  return hex;
}

export function resetBrandPalette(): string {
  const root = document.documentElement;
  const palette = deriveBrandPalette(DEFAULT_BRAND_COLOR, DEFAULT_BRAND_SHIFT);
  for (const token of Object.keys(palette)) {
    root.style.removeProperty(token);
  }
  root.style.removeProperty("--forest-ring");
  for (const token of [
    "--wf-font-body",
    "--wf-font-muted",
    "--wf-font-headline",
    "--wf-font-on-brand",
    "--wf-size-body",
    "--wf-size-muted",
    "--wf-size-on-brand",
    "--wf-size-headline",
    "--wf-font-sans",
    "--wf-font-serif",
    "--wf-type-scale",
  ]) {
    root.style.removeProperty(token);
  }
  applyModeToDom(DEFAULT_BRAND_MODE);
  resetBrandHex();
  bumpBrandVersion();
  return DEFAULT_BRAND_COLOR;
}

export function readBrandLabState(): BrandLabState {
  try {
    const raw = localStorage.getItem(BRAND_LAB_STORAGE_KEY);
    if (raw) {
      return normalizeLabState(JSON.parse(raw) as Partial<BrandLabState>);
    }
    const legacy = localStorage.getItem(BRAND_COLOR_STORAGE_KEY);
    const base = normalizeHex(legacy ?? "") ?? DEFAULT_BRAND_COLOR;
    return { ...defaultBrandLabState(), base };
  } catch {
    return defaultBrandLabState();
  }
}

export function storeBrandLabState(state: BrandLabState): void {
  try {
    localStorage.setItem(BRAND_LAB_STORAGE_KEY, JSON.stringify(normalizeLabState(state)));
    localStorage.setItem(BRAND_COLOR_STORAGE_KEY, state.base);
  } catch {
    // ignore quota / private mode
  }
}

export function readStoredBrandColor(): string {
  return readBrandLabState().base;
}

export function storeBrandColor(hex: string): void {
  const current = readBrandLabState();
  storeBrandLabState({ ...current, base: hex });
}

export function isDefaultBrandLab(state: BrandLabState): boolean {
  const styles = normalizeTextStyles(state.textStyles);
  const defaults = DEFAULT_TEXT_STYLES;
  const stylesMatch = TEXT_ROLES.every(
    (role) =>
      styles[role.id].face === defaults[role.id].face &&
      styles[role.id].size === defaults[role.id].size,
  );
  const defaultOverrides = DEFAULT_BRAND_OVERRIDES;
  const overrideKeys = new Set([
    ...Object.keys(state.overrides),
    ...Object.keys(defaultOverrides),
  ]);
  const overridesMatch = [...overrideKeys].every(
    (key) =>
      state.overrides[key as EditableBrandKey] ===
      defaultOverrides[key as EditableBrandKey],
  );
  return (
    state.base === DEFAULT_BRAND_COLOR &&
    state.shift === DEFAULT_BRAND_SHIFT &&
    overridesMatch &&
    stylesMatch &&
    state.mode === DEFAULT_BRAND_MODE
  );
}

export type SavedBrandPalette = {
  id: string;
  name: string;
  /** One-line description of where the palette fits. Shipped themes only. */
  note?: string;
  savedAt: number;
  lab: BrandLabState;
  preview: Pick<BrandSwatchMap, "forest" | "sage" | "mint" | "ink" | "onBrand">;
};

function normalizeLabState(raw: Partial<BrandLabState> | undefined): BrandLabState {
  const base = normalizeHex(raw?.base ?? "") ?? DEFAULT_BRAND_COLOR;
  const shift = typeof raw?.shift === "number" ? clamp(raw.shift, 0, 2) : DEFAULT_BRAND_SHIFT;
  const mode: BrandMode = raw?.mode === "light" ? "light" : "dark";
  const overrides: BrandLabState["overrides"] = {};
  if (raw?.overrides && typeof raw.overrides === "object") {
    for (const swatch of EDITABLE_BRAND_SWATCHES) {
      const hex = normalizeHex(raw.overrides[swatch.key] ?? "");
      if (!hex) {
        continue;
      }
      // “quiet” maps to --wf-on-dark. Drop legacy light-paper muted (too dark).
      if (swatch.key === "quiet" && rgbToHsl(hexToRgb(hex)).l < 0.45) {
        continue;
      }
      if (swatch.key === "ink") {
        continue;
      }
      overrides[swatch.key] = hex;
    }
    // Old “body text” edits wrote ink; map a light ink leftover to onBrand if needed.
    const legacyInk = normalizeHex(raw.overrides.ink ?? "");
    if (legacyInk && !overrides.onBrand && rgbToHsl(hexToRgb(legacyInk)).l > 0.55) {
      overrides.onBrand = legacyInk;
    }
  }
  const textStyles = migrateLegacyType((raw ?? {}) as Record<string, unknown>);
  return { base, shift, overrides, textStyles, mode };
}

export function readSavedBrandPalettes(): SavedBrandPalette[] {
  try {
    const raw = localStorage.getItem(BRAND_SAVED_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") {
          return null;
        }
        const item = entry as Partial<SavedBrandPalette>;
        const name = typeof item.name === "string" ? item.name.trim() : "";
        const id = typeof item.id === "string" ? item.id : "";
        if (!name || !id) {
          return null;
        }
        const lab = normalizeLabState(item.lab);
        const previewForest = normalizeHex(item.preview?.forest ?? "") ?? lab.base;
        const note = typeof item.note === "string" ? item.note.trim() : "";
        return {
          id,
          name,
          ...(note ? { note } : {}),
          savedAt: typeof item.savedAt === "number" ? item.savedAt : Date.now(),
          lab,
          preview: {
            forest: previewForest,
            sage: normalizeHex(item.preview?.sage ?? "") ?? previewForest,
            mint: normalizeHex(item.preview?.mint ?? "") ?? previewForest,
            ink: normalizeHex(item.preview?.ink ?? "") ?? "#1c2420",
            onBrand:
              normalizeHex(item.preview?.onBrand ?? "") ??
              normalizeHex((item.preview as { cream?: string } | undefined)?.cream ?? "") ??
              "#f4f7f5",
          },
        } satisfies SavedBrandPalette;
      })
      .filter((entry): entry is SavedBrandPalette => entry !== null)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function writeSavedBrandPalettes(entries: SavedBrandPalette[]): void {
  try {
    localStorage.setItem(BRAND_SAVED_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota / private mode
  }
}

export function saveBrandPalette(
  name: string,
  lab: BrandLabState,
  swatches: BrandSwatchMap,
): SavedBrandPalette[] {
  const trimmed = name.trim();
  if (!trimmed) {
    return readSavedBrandPalettes();
  }
  const normalizedLab = normalizeLabState(lab);
  const entry: SavedBrandPalette = {
    id: `saved-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    savedAt: Date.now(),
    lab: normalizedLab,
    preview: {
      forest: swatches.forest,
      sage: swatches.sage,
      mint: swatches.mint,
      ink: swatches.ink,
      onBrand: swatches.onBrand,
    },
  };
  const existing = readSavedBrandPalettes().filter(
    (item) => item.name.toLowerCase() !== trimmed.toLowerCase(),
  );
  const next = [entry, ...existing];
  writeSavedBrandPalettes(next);
  return next;
}

export function deleteSavedBrandPalette(id: string): SavedBrandPalette[] {
  const next = readSavedBrandPalettes().filter((item) => item.id !== id);
  writeSavedBrandPalettes(next);
  return next;
}

export const BRAND_THEME_SEED_KEY = "wf-brand-theme-seed";

/** Bump to re-seed shipped themes after editing the list below. */
const BRAND_THEME_SEED_VERSION = "themes-v6";

/** Fixed savedAt base so shipped themes keep their order under user saves. */
const BRAND_THEME_SEED_EPOCH = Date.UTC(2026, 0, 1);

type BrandThemeSpec = {
  id: string;
  name: string;
  note: string;
  /** Brand fill; the derived family (mid, hover, tints) rebuilds from here. */
  base: string;
  shift: number;
  overrides: Partial<Record<EditableBrandKey, string>>;
  textStyles: TextRoleStyles;
  /** Chrome mode when applying the theme. Defaults to dark. */
  mode?: BrandMode;
};

function typeSet(spec: {
  headlineFace: TextFaceId;
  headlineSize: HeadlineSizeId;
  copyFace: TextFaceId;
  bodySize: TextSizeId;
  mutedSize: TextSizeId;
  buttonSize: TextSizeId;
}): TextRoleStyles {
  return {
    body: { face: spec.copyFace, size: spec.bodySize },
    muted: { face: spec.copyFace, size: spec.mutedSize },
    headline: { face: spec.headlineFace, size: spec.headlineSize },
    onBrand: { face: spec.copyFace, size: spec.buttonSize },
  };
}

/**
 * Ten shipped directions for the dark site — color plus its type pairing.
 * Body copy clears 4.5:1 on both the dark ground and the brand fill, and the
 * set spans travel today plus the food, film, and fashion reels coming later.
 */
const BRAND_THEME_SPECS: BrandThemeSpec[] = [
  {
    id: "theme-trail-pine",
    name: "Trail Pine",
    note: "Deep forest green — hiking, outdoors, classic trail voice.",
    base: "#1f3d31",
    shift: 1,
    overrides: {
      forestDeep: "#0f221b",
      sage: "#3f8b68",
      mint: "#8fd4b0",
      quiet: "#9db3a8",
      onBrand: "#f2f7f4",
    },
    textStyles: typeSet({
      headlineFace: "instrument",
      headlineSize: "md",
      copyFace: "dm-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-harbor-dusk",
    name: "Harbor Dusk",
    note: "Deep sea blue with newsprint headlines — coastal trips and long reads.",
    base: "#1c4a63",
    shift: 1,
    overrides: {
      forestDeep: "#0d1f2b",
      sage: "#2f7f9c",
      mint: "#86cfe4",
      quiet: "#9ab3c1",
      onBrand: "#eef6fa",
    },
    textStyles: typeSet({
      headlineFace: "newsreader",
      headlineSize: "md",
      copyFace: "source-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-canyon-clay",
    name: "Canyon Clay",
    note: "Terracotta and sand — desert routes, road trips, warm photography.",
    base: "#8a4a2f",
    shift: 1,
    overrides: {
      forestDeep: "#241310",
      sage: "#b9683f",
      mint: "#f0b48a",
      quiet: "#c2a294",
      onBrand: "#faf1ea",
    },
    textStyles: typeSet({
      headlineFace: "literata",
      headlineSize: "md",
      copyFace: "dm-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-midnight-atlas",
    name: "Midnight Atlas",
    note: "Indigo night sky with a big serif — built for the planner surfaces.",
    base: "#2b3a80",
    shift: 1.2,
    overrides: {
      forestDeep: "#10131f",
      sage: "#4f61b5",
      mint: "#a3b0f5",
      quiet: "#a1a7c2",
      onBrand: "#f0f1fa",
    },
    textStyles: typeSet({
      headlineFace: "instrument",
      headlineSize: "lg",
      copyFace: "dm-sans",
      bodySize: "sm",
      mutedSize: "xs",
      buttonSize: "xs",
    }),
  },
  {
    id: "theme-saffron-market",
    name: "Saffron Market",
    note: "Gold on roasted brown — food reels, markets, street eats.",
    base: "#8f6220",
    shift: 1.1,
    overrides: {
      forestDeep: "#201709",
      sage: "#d19a3c",
      mint: "#f5d08a",
      quiet: "#c9b490",
      onBrand: "#fdf6e8",
    },
    textStyles: typeSet({
      headlineFace: "literata",
      headlineSize: "lg",
      copyFace: "source-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-coastal-salt",
    name: "Coastal Salt",
    note: "Airy teal with roomy body copy — islands, beaches, slow itineraries.",
    base: "#17635c",
    shift: 0.9,
    overrides: {
      forestDeep: "#0a2320",
      sage: "#2f8f83",
      mint: "#93e0d1",
      quiet: "#97b8b1",
      onBrand: "#eefaf6",
    },
    textStyles: typeSet({
      headlineFace: "newsreader",
      headlineSize: "md",
      copyFace: "dm-sans",
      bodySize: "lg",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-alpine-frost",
    name: "Alpine Frost",
    note: "Cold slate and ice — mountains, winter trips, dense data views.",
    base: "#2e4f63",
    shift: 1,
    overrides: {
      forestDeep: "#121c24",
      sage: "#4c7f9c",
      mint: "#b9dcec",
      quiet: "#a5b8c4",
      onBrand: "#f2f8fb",
    },
    textStyles: typeSet({
      headlineFace: "literata",
      headlineSize: "md",
      copyFace: "source-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-violet-transit",
    name: "Violet Transit",
    note: "Nightlife plum and neon pink — city reels after dark.",
    base: "#6a2f6b",
    shift: 1.2,
    overrides: {
      forestDeep: "#1c1020",
      sage: "#9a4a92",
      mint: "#f2a8d8",
      quiet: "#bda1bd",
      onBrand: "#f9f0f8",
    },
    textStyles: typeSet({
      headlineFace: "newsreader",
      headlineSize: "lg",
      copyFace: "dm-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-film-noir",
    name: "Film Noir",
    note: "Neutral charcoal with amber marquee accents — the movie vertical.",
    base: "#3a3a3c",
    shift: 1.3,
    overrides: {
      forestDeep: "#131315",
      sage: "#6b6b70",
      mint: "#e8c07d",
      quiet: "#a8a8ae",
      onBrand: "#f4f4f5",
    },
    textStyles: typeSet({
      headlineFace: "instrument",
      headlineSize: "xl",
      copyFace: "source-sans",
      bodySize: "sm",
      mutedSize: "xs",
      buttonSize: "xs",
    }),
  },
  {
    id: "theme-runway-ink",
    name: "Runway Ink",
    note: "Near-black with blush — the fashion vertical and lookbook layouts.",
    base: "#4a2b3a",
    shift: 1.2,
    overrides: {
      forestDeep: "#161014",
      sage: "#8c4f6b",
      mint: "#f0a8c0",
      quiet: "#c0a3b1",
      onBrand: "#faf2f6",
    },
    textStyles: typeSet({
      headlineFace: "instrument",
      headlineSize: "lg",
      copyFace: "dm-sans",
      bodySize: "sm",
      mutedSize: "xs",
      buttonSize: "sm",
    }),
  },

  // === v2: brighter directions across the color wheel ==========================
  {
    id: "theme-sunset-coral",
    name: "Sunset Coral",
    note: "Warm coral fill with a peach highlight — golden-hour travel reels.",
    base: "#c25236",
    shift: 1.1,
    overrides: {
      forestDeep: "#2e1811",
      sage: "#e07a55",
      mint: "#ffb08a",
      quiet: "#d8b4a3",
      onBrand: "#fef1e8",
    },
    textStyles: typeSet({
      headlineFace: "instrument",
      headlineSize: "lg",
      copyFace: "dm-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-electric-cyan",
    name: "Electric Cyan",
    note: "Vibrant cyan on deep teal — techy, watery, agentic dashboards.",
    base: "#0f8fa8",
    shift: 1.1,
    overrides: {
      forestDeep: "#0a2028",
      sage: "#2fc1d8",
      mint: "#8fecf7",
      quiet: "#8ec1cc",
      onBrand: "#eaf9fc",
    },
    textStyles: typeSet({
      headlineFace: "instrument",
      headlineSize: "md",
      copyFace: "dm-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-chartreuse-lift",
    name: "Chartreuse Lift",
    note: "Lime-yellow on olive — high-energy fitness, sports, hype reels.",
    base: "#6d8422",
    shift: 1.1,
    overrides: {
      forestDeep: "#1f2210",
      sage: "#9fbb2a",
      mint: "#dff260",
      quiet: "#bcc59e",
      onBrand: "#f7fae2",
    },
    textStyles: typeSet({
      headlineFace: "instrument",
      headlineSize: "lg",
      copyFace: "dm-sans",
      bodySize: "sm",
      mutedSize: "xs",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-neon-rose",
    name: "Neon Rose",
    note: "Hot magenta with candy highlight — night markets, nightlife, love.",
    base: "#c43371",
    shift: 1.2,
    overrides: {
      forestDeep: "#26101c",
      sage: "#e0508f",
      mint: "#ff9bc4",
      quiet: "#d2a7b6",
      onBrand: "#fbeef4",
    },
    textStyles: typeSet({
      headlineFace: "newsreader",
      headlineSize: "lg",
      copyFace: "dm-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-golden-hour",
    name: "Golden Hour",
    note: "Warm amber on tobacco — magazine spreads, cafés, wine bars.",
    base: "#b88320",
    shift: 1.1,
    overrides: {
      forestDeep: "#241608",
      sage: "#dcae3c",
      mint: "#ffd977",
      quiet: "#d4c19b",
      onBrand: "#fcf3df",
    },
    textStyles: typeSet({
      headlineFace: "literata",
      headlineSize: "lg",
      copyFace: "source-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-aurora-mint",
    name: "Aurora Mint",
    note: "Jewel green with icy mint — snorkeling, jungles, spa retreats.",
    base: "#1f9c72",
    shift: 1.1,
    mode: "light",
    overrides: {
      forestDeep: "#0b241d",
      sage: "#3fc79a",
      mint: "#a2f0d0",
      quiet: "#a8b4af",
      onBrand: "#ecfaf4",
    },
    textStyles: typeSet({
      headlineFace: "newsreader",
      headlineSize: "md",
      copyFace: "dm-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-cherry-blossom",
    name: "Cherry Blossom",
    note: "Dusty rose on plum — spring trips, cafés, gentle lookbooks.",
    base: "#a04a68",
    shift: 1,
    overrides: {
      forestDeep: "#28131c",
      sage: "#c46e8a",
      mint: "#f5b8ca",
      quiet: "#cfaab4",
      onBrand: "#fbf0f3",
    },
    textStyles: typeSet({
      headlineFace: "instrument",
      headlineSize: "lg",
      copyFace: "source-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-solar-flare",
    name: "Solar Flare",
    note: "Bright orange-red with sunny highlight — desert, safari, adventure.",
    base: "#c94820",
    shift: 1.2,
    overrides: {
      forestDeep: "#26100a",
      sage: "#eb6f3a",
      mint: "#ffb26a",
      quiet: "#d8a999",
      onBrand: "#fdefe4",
    },
    textStyles: typeSet({
      headlineFace: "instrument",
      headlineSize: "xl",
      copyFace: "dm-sans",
      bodySize: "sm",
      mutedSize: "xs",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-sky-meridian",
    name: "Sky Meridian",
    note: "Bright sky blue on slate — aviation, road trips, clean dashboards.",
    base: "#2a72c4",
    shift: 1.1,
    overrides: {
      forestDeep: "#0f1c2e",
      sage: "#4c98e0",
      mint: "#a8d1ff",
      quiet: "#a5b8cc",
      onBrand: "#eef4fb",
    },
    textStyles: typeSet({
      headlineFace: "newsreader",
      headlineSize: "md",
      copyFace: "dm-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
  {
    id: "theme-emerald-rush",
    name: "Emerald Rush",
    note: "Vivid emerald with lime highlight — rainforests, festivals, energy.",
    base: "#12915a",
    shift: 1.1,
    overrides: {
      forestDeep: "#0a2013",
      sage: "#2ec07a",
      mint: "#8ef2b8",
      quiet: "#98c3ac",
      onBrand: "#ecfaf1",
    },
    textStyles: typeSet({
      headlineFace: "instrument",
      headlineSize: "lg",
      copyFace: "dm-sans",
      bodySize: "md",
      mutedSize: "sm",
      buttonSize: "sm",
    }),
  },
];

/** Shipped themes in saved-palette shape, ready to drop into the saved list. */
export const BRAND_THEMES: SavedBrandPalette[] = BRAND_THEME_SPECS.map((spec, index) => {
  const lab = normalizeLabState({ ...spec, mode: spec.mode ?? "dark" });
  const swatches = swatchesFromLab(lab);
  return {
    id: spec.id,
    name: spec.name,
    note: spec.note,
    savedAt: BRAND_THEME_SEED_EPOCH - index * 60_000,
    lab,
    preview: {
      forest: swatches.forest,
      sage: swatches.sage,
      mint: swatches.mint,
      ink: swatches.ink,
      onBrand: swatches.onBrand,
    },
  } satisfies SavedBrandPalette;
});

/**
 * Add / refresh shipped themes when the seed version bumps. Deletes stick —
 * removed ids are not re-added. Existing shipped ids get the latest spec.
 */
export function seedBrandThemes(): SavedBrandPalette[] {
  const existing = readSavedBrandPalettes();
  try {
    if (localStorage.getItem(BRAND_THEME_SEED_KEY) === BRAND_THEME_SEED_VERSION) {
      return existing;
    }
  } catch {
    return existing;
  }
  const shippedById = new Map(BRAND_THEMES.map((theme) => [theme.id, theme]));
  const existingIds = new Set(existing.map((entry) => entry.id));
  const takenNames = new Set(
    existing
      .filter((entry) => !shippedById.has(entry.id))
      .map((entry) => entry.name.toLowerCase()),
  );

  const next = existing.map((entry) => shippedById.get(entry.id) ?? entry);
  for (const theme of BRAND_THEMES) {
    if (existingIds.has(theme.id)) {
      continue;
    }
    if (takenNames.has(theme.name.toLowerCase())) {
      continue;
    }
    next.push(theme);
  }
  next.sort((a, b) => b.savedAt - a.savedAt);
  writeSavedBrandPalettes(next);
  try {
    localStorage.setItem(BRAND_THEME_SEED_KEY, BRAND_THEME_SEED_VERSION);
  } catch {
    // ignore quota / private mode
  }
  return next;
}

export { SWATCH_TOKEN };
