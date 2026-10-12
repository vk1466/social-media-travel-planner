/**
 * Wanderfile Native Design Tokens — matching SPEC.md and design boards.
 */
import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const colors = {
  bg: "#F6F5F1",
  surface: "#FFFFFF",
  surfaceAlt: "#FBFAF7",
  ink: "#1B1D1F",
  muted: "#6B6F73",
  faint: "#8A8E92",
  bodyTinted: "#4A4E52",
  border: "#E6E3DC",
  borderSubtle: "#EFEDE7",
  borderDashed: "#C9C5BA",
  brand: "#1B1D1F",
  brandSoft: "#ECECEA",
  accent: "#1B1D1F",
  accentSoft: "#E6E3DC",
  onFill: "#FFFFFF",
  danger: "#8A2B57",
  dangerSoft: "#FBE6EE",
  success: "#25623A",
  successSoft: "#E4F2E7",
  running: "#d97706",

  // Category tints
  travelTint: "#E3F0F4",
  travelInk: "#1B5E78",
  foodTint: "#FBEBDD",
  foodInk: "#9A4513",
  movieTint: "#ECE8F7",
  movieInk: "#4B3C8C",
  routineTint: "#E4F2E7",
  routineInk: "#25623A",
  otherTint: "#ECECEA",
  otherInk: "#4A4E52",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
};

/** Cross-platform elevation helper */
export function shadow(level: 1 | 2 | 3 = 1): ViewStyle {
  const config = {
    1: { height: 1, radius: 3, opacity: 0.05, elevation: 1 },
    2: { height: 4, radius: 10, opacity: 0.08, elevation: 3 },
    3: { height: 10, radius: 20, opacity: 0.12, elevation: 6 },
  }[level];
  return Platform.select({
    ios: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: config.height },
      shadowOpacity: config.opacity,
      shadowRadius: config.radius,
    },
    android: { elevation: config.elevation },
    default: {},
  }) as ViewStyle;
}

export const typography = {
  screenTitle: { fontSize: 30, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 } as TextStyle,
  sectionTitle: { fontSize: 19, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 } as TextStyle,
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink } as TextStyle,
  body: { fontSize: 14, color: colors.bodyTinted, lineHeight: 20 } as TextStyle,
  meta: { fontSize: 13, color: colors.muted } as TextStyle,
  overline: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  } as TextStyle,
};

export const fonts = {
  regular: "Figtree_400Regular",
  body: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semiBold: "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
  heavy: "Figtree_800ExtraBold",
};
