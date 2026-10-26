/**
 * Wanderfile Native Design Tokens — matching docs/ux_spec.md
 */
import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const lightColors = {
  bg: "#FAFAF7",
  surface: "#FFFFFF",
  surface2: "#F2F2EE",
  surfaceAlt: "#F2F2EE",
  text: "#14161A",
  ink: "#14161A",
  muted: "#5B616B",
  textMuted: "#5B616B",
  faint: "#8A8E92",
  bodyTinted: "#4A4E52",
  border: "#E4E4DF",
  borderSubtle: "#EFEDE7",
  borderDashed: "#D1D1CB",
  primary: "#0F766E",
  onPrimary: "#FFFFFF",
  onFill: "#FFFFFF",
  brand: "#0F766E",
  brandSoft: "#E3F0F4",
  accent: "#0F766E",
  accentSoft: "#E3F0F4",
  danger: "#B42318",
  dangerSoft: "#FBE6EE",
  success: "#067647",
  successSoft: "#E4F2E7",
  running: "#D97706",

  // Category accents (used on chip dots & pins)
  catPlace: "#0F766E",
  catFood: "#C2410C",
  catWatch: "#6D28D9",
  catFashion: "#BE185D",
  catHair: "#A16207",

  // Category tints & inks
  travelTint: "#E3F0F4",
  travelInk: "#1B5E78",
  foodTint: "#FBEBDD",
  foodInk: "#9A4513",
  movieTint: "#ECE8F7",
  movieInk: "#4B3C8C",
  routineTint: "#E4F2E7",
  routineInk: "#25623A",
  otherTint: "#F2F2EE",
  otherInk: "#5B616B",
};

export const darkColors = {
  bg: "#0E0F11",
  surface: "#17191C",
  surface2: "#202328",
  surfaceAlt: "#202328",
  text: "#F2F2F0",
  ink: "#F2F2F0",
  muted: "#A3A9B3",
  textMuted: "#A3A9B3",
  faint: "#717680",
  bodyTinted: "#C9CED6",
  border: "#2A2E34",
  borderSubtle: "#202328",
  borderDashed: "#363B43",
  primary: "#2DD4BF",
  onPrimary: "#04201D",
  onFill: "#FFFFFF",
  brand: "#2DD4BF",
  brandSoft: "rgba(45, 212, 191, 0.15)",
  accent: "#2DD4BF",
  accentSoft: "rgba(45, 212, 191, 0.15)",
  danger: "#F97066",
  dangerSoft: "rgba(249, 112, 102, 0.15)",
  success: "#47CD89",
  successSoft: "rgba(71, 205, 137, 0.15)",
  running: "#FBBF24",

  catPlace: "#2DD4BF",
  catFood: "#FB923C",
  catWatch: "#A78BFA",
  catFashion: "#F472B6",
  catHair: "#FACC15",

  travelTint: "rgba(45, 212, 191, 0.15)",
  travelInk: "#2DD4BF",
  foodTint: "rgba(251, 146, 60, 0.15)",
  foodInk: "#FB923C",
  movieTint: "rgba(167, 139, 250, 0.15)",
  movieInk: "#A78BFA",
  routineTint: "rgba(71, 205, 137, 0.15)",
  routineInk: "#47CD89",
  otherTint: "#202328",
  otherInk: "#A3A9B3",
};

// Default export uses light colors for backwards compatibility
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12, // inputs and buttons = 12 per spec
  card: 16, // cards = 16 per spec
  lg: 16,
  sheet: 24, // sheets and modals = 24 per spec
  xl: 24,
  pill: 9999, // chips = full pill per spec
};

/** Cross-platform elevation helper */
export function shadow(level: 1 | 2 | 3 = 1): ViewStyle {
  const config = {
    1: { height: 2, radius: 4, opacity: 0.06, elevation: 2 },
    2: { height: 6, radius: 12, opacity: 0.08, elevation: 4 },
    3: { height: 12, radius: 24, opacity: 0.12, elevation: 8 },
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
  display: { fontSize: 32, lineHeight: 38, fontWeight: "600", color: colors.ink } as TextStyle,
  h1: { fontSize: 24, lineHeight: 30, fontWeight: "600", color: colors.ink } as TextStyle,
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "600", color: colors.ink } as TextStyle,
  body: { fontSize: 16, lineHeight: 24, color: colors.bodyTinted } as TextStyle, // never < 16 on mobile
  callout: { fontSize: 14, lineHeight: 20, color: colors.bodyTinted } as TextStyle,
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500", color: colors.muted } as TextStyle,

  // Backwards compatible aliases
  screenTitle: { fontSize: 32, lineHeight: 38, fontWeight: "600", color: colors.ink } as TextStyle,
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: "600", color: colors.ink } as TextStyle,
  cardTitle: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.ink } as TextStyle,
  meta: { fontSize: 14, lineHeight: 20, color: colors.muted } as TextStyle,
  overline: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  } as TextStyle,
};

export const fonts = {
  regular: "Inter_400Regular",
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  heavy: "Inter_800ExtraBold",
};
