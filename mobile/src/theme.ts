import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const colors = {
  bg: "#f4f7f5",
  surface: "#ffffff",
  surfaceAlt: "#eef3f0",
  ink: "#14201b",
  muted: "#5c6f66",
  faint: "#8a998f",
  border: "#d5e0da",
  brand: "#1a3a2f",
  brandSoft: "#e8f0ec",
  accent: "#c45c26",
  accentSoft: "#fbeade",
  danger: "#b42318",
  dangerSoft: "#fef3f2",
  success: "#1f7a4d",
  successSoft: "#ecfdf3",
  running: "#b45309",
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
      shadowColor: "#0d1f18",
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
