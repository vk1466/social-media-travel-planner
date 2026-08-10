/** Live DOM highlight for color-lab tips — outlines elements using a given hex. */

const HIT_CLASS = "wf-lab-hit";
const MODE_CLASS = "wf-lab-highlighting";

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function rgbChannelsToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((channel) => clampByte(channel).toString(16).padStart(2, "0")).join("")}`;
}

/** Normalize CSS color strings to #rrggbb, or null if transparent / unusable. */
export function cssColorToHex(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!raw || raw === "transparent" || raw === "none") {
    return null;
  }
  if (raw.startsWith("#")) {
    if (/^#[0-9a-f]{6}$/.test(raw)) {
      return raw;
    }
    if (/^#[0-9a-f]{3}$/.test(raw)) {
      const [, r, g, b] = raw;
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return null;
  }

  const match = raw.match(
    /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/,
  );
  if (!match) {
    return null;
  }
  const alphaRaw = match[4];
  if (alphaRaw !== undefined) {
    const alpha = alphaRaw.endsWith("%")
      ? Number.parseFloat(alphaRaw) / 100
      : Number.parseFloat(alphaRaw);
    if (alpha <= 0.08) {
      return null;
    }
  }
  return rgbChannelsToHex(
    Number.parseFloat(match[1]),
    Number.parseFloat(match[2]),
    Number.parseFloat(match[3]),
  );
}

const STYLE_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "fill",
  "stroke",
] as const;

function elementUsesHex(el: Element, targetHex: string): boolean {
  const style = getComputedStyle(el);
  for (const prop of STYLE_PROPS) {
    const hex = cssColorToHex(style.getPropertyValue(prop));
    if (hex === targetHex) {
      // Ignore hairline / invisible borders that still report a color.
      if (prop.startsWith("border") && Number.parseFloat(style.getPropertyValue("border-width")) < 0.5) {
        continue;
      }
      if (prop === "outlineColor" && style.outlineStyle === "none") {
        continue;
      }
      if ((prop === "fill" || prop === "stroke") && style.getPropertyValue(prop) === "none") {
        continue;
      }
      return true;
    }
  }
  return false;
}

let activeHits: Element[] = [];

export function clearBrandUsageHighlight(): void {
  for (const el of activeHits) {
    el.classList.remove(HIT_CLASS);
  }
  activeHits = [];
  document.documentElement.classList.remove(MODE_CLASS);
}

/** Outline elements on the page that currently paint with this hex. */
export function highlightBrandUsage(hex: string): void {
  clearBrandUsageHighlight();
  const target = cssColorToHex(hex);
  if (!target || typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.add(MODE_CLASS);
  const hits: Element[] = [];
  const nodes = document.body.querySelectorAll("*:not(.wf-theme-picker):not(.wf-theme-picker *)");

  for (const el of nodes) {
    if (hits.length >= 120) {
      break;
    }
    if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) {
      continue;
    }
    if (el.closest(".wf-theme-picker")) {
      continue;
    }
    try {
      if (elementUsesHex(el, target)) {
        el.classList.add(HIT_CLASS);
        hits.push(el);
      }
    } catch {
      // ignore detached / cross-origin style reads
    }
  }

  activeHits = hits;
}
