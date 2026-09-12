/**
 * Native palette — keep in sync with frontend/src/wf-tokens.css (--theme-*).
 */
import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const colors = {
  bg: "#112a35",
  surface: "#173a47",
  surfaceAlt: "#2a5260",
  ink: "#f3fafc",
  muted: "#b2cbd0",
  faint: "#b2cbd0",
  border: "#2a5260",
  brand: "#4fe8f6",
  brandSoft: "#2a5260",
  accent: "#4fe8f6",
  accentSoft: "#2a5260",
  onFill: "#112a35",
  danger: "#c45c5c",
  dangerSoft: "#3a2a2e",
  success: "#2e7d52",
  successSoft: "#1c3d34",
  running: "#d97706",
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
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

/** Cross-platform elevation helper: soft iOS shadow + Android elevation. */
export function shadow(level: 1 | 2 | 3 = 1): ViewStyle {
  const config = {
    1: { height: 1, radius: 3, opacity: 0.06, elevation: 1 },
    2: { height: 4, radius: 10, opacity: 0.08, elevation: 3 },
    3: { height: 10, radius: 24, opacity: 0.12, elevation: 8 },
  }[level];
  return Platform.select({
    ios: {
      shadowColor: "#08171e",
      shadowOffset: { width: 0, height: config.height },
      shadowOpacity: config.opacity,
      shadowRadius: config.radius,
    },
    android: { elevation: config.elevation },
    default: {},
  }) as ViewStyle;
}

export const typography = {
  screenTitle: { fontSize: 26, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 } as TextStyle,
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.ink } as TextStyle,
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink } as TextStyle,
  body: { fontSize: 14, color: colors.ink } as TextStyle,
  meta: { fontSize: 12, color: colors.muted } as TextStyle,
  overline: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.faint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  } as TextStyle,
};
