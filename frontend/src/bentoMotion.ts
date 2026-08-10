/**
 * Home bento photo-rotation motion presets.
 * Persisted like the brand color lab — pick one and try it live.
 */

export type BentoMotionId =
  | "crossfade"
  | "slide-up"
  | "slide-left"
  | "zoom-soft"
  | "blur-dissolve"
  | "wipe"
  | "flip"
  | "card-shuffle";

export type BentoMotionPreset = {
  id: BentoMotionId;
  label: string;
  note: string;
  /** Hint swatch for the picker chip. */
  swatch: string;
};

export const BENTO_MOTION_PRESETS: BentoMotionPreset[] = [
  {
    id: "crossfade",
    label: "Crossfade",
    note: "Gentle opacity blend.",
    swatch: "linear-gradient(135deg, #1a1612 0%, #ff8b4d 100%)",
  },
  {
    id: "slide-up",
    label: "Slide up",
    note: "Next frame rises from below.",
    swatch: "linear-gradient(180deg, #ff8b4d 0%, #1f3a2c 100%)",
  },
  {
    id: "slide-left",
    label: "Slide left",
    note: "Horizontal push, carousel feel.",
    swatch: "linear-gradient(90deg, #1f3a2c 0%, #ff5733 100%)",
  },
  {
    id: "zoom-soft",
    label: "Zoom soft",
    note: "Slight scale-in as the new photo arrives.",
    swatch: "radial-gradient(circle at 40% 40%, #ff8b4d, #0d1510)",
  },
  {
    id: "blur-dissolve",
    label: "Blur dissolve",
    note: "Soft focus out, then settle sharp.",
    swatch: "linear-gradient(135deg, #9eb0a6 0%, #1a1612 100%)",
  },
  {
    id: "wipe",
    label: "Wipe",
    note: "Diagonal clip reveal.",
    swatch: "linear-gradient(135deg, #ff5733 45%, #1a1612 55%)",
  },
  {
    id: "flip",
    label: "Flip",
    note: "Quick card flip on the Y axis — default.",
    swatch: "linear-gradient(90deg, #1a1612 50%, #ff8b4d 50%)",
  },
  {
    id: "card-shuffle",
    label: "Shuffle",
    note: "Tiny tilt and lift — like restacking prints.",
    swatch: "linear-gradient(160deg, #ff8b4d 0%, #d94a1f 40%, #1f3a2c 100%)",
  },
];

export const DEFAULT_BENTO_MOTION: BentoMotionId = "flip";

const STORAGE_KEY = "wf-bento-motion";

export function isBentoMotionId(value: string): value is BentoMotionId {
  return BENTO_MOTION_PRESETS.some((preset) => preset.id === value);
}

export function readBentoMotion(): BentoMotionId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && isBentoMotionId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_BENTO_MOTION;
}

export function applyBentoMotion(id: BentoMotionId): BentoMotionId {
  const next = isBentoMotionId(id) ? id : DEFAULT_BENTO_MOTION;
  document.documentElement.dataset.bentoMotion = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

export function initBentoMotion(): BentoMotionId {
  return applyBentoMotion(readBentoMotion());
}

export function bentoMotionLabel(id: BentoMotionId): string {
  return BENTO_MOTION_PRESETS.find((preset) => preset.id === id)?.label ?? id;
}
