/**
 * Wanderfile Native Design Tokens — matching docs/ui_modernization.md
 */
import { Appearance, Platform, type TextStyle, type ViewStyle } from "react-native";

export const lightColors = {
  bg: "#FAFAF9",
  surface: "#FFFFFF",
  surface2: "#F3F3F1",
  surfaceAlt: "#F3F3F1",
  ink: "#16181B",
  ink2: "#5E636B",
  text: "#16181B",
  muted: "#5E636B",
  textMuted: "#5E636B",
  faint: "#A2A7AE",
  bodyTinted: "#5E636B",
  line: "#E7E6E3",
  border: "#E7E6E3",
  borderSubtle: "#E7E6E3",
  borderDashed: "#E7E6E3",
  accent: "#FF5A4E",
  accentInk: "#FFFFFF",
  onFill: "#FFFFFF",
  onPrimary: "#FFFFFF",
  brand: "#FF5A4E",
  primary: "#FF5A4E",
  brandSoft: "rgba(255, 90, 78, 0.12)",
  accentSoft: "rgba(255, 90, 78, 0.12)",
  success: "#1F9D6B",
  successSoft: "rgba(31, 157, 107, 0.12)",
  warn: "#E59A1A",
  danger: "#D93A3A",
  dangerSoft: "rgba(217, 58, 58, 0.12)",
  running: "#E59A1A",

  // Category hues (8 canonical categories per spec)
  catFood: "#F2994A",
  catCafe: "#A0703E",
  catSight: "#2F80ED",
  catNature: "#27AE60",
  catStay: "#9B51E0",
  catNightlife: "#EB5757",
  catShopping: "#D6A100",
  catOther: "#6B7280",

  // 12% category tints
  catFoodTint: "rgba(242, 153, 74, 0.12)",
  catCafeTint: "rgba(160, 112, 62, 0.12)",
  catSightTint: "rgba(47, 128, 237, 0.12)",
  catNatureTint: "rgba(39, 174, 96, 0.12)",
  catStayTint: "rgba(155, 81, 224, 0.12)",
  catNightlifeTint: "rgba(235, 87, 87, 0.12)",
  catShoppingTint: "rgba(214, 161, 0, 0.12)",
  catOtherTint: "rgba(107, 114, 128, 0.12)",

  // Legacy aliases
  catPlace: "#2F80ED",
  travelTint: "rgba(47, 128, 237, 0.12)",
  travelInk: "#2F80ED",
  foodTint: "rgba(242, 153, 74, 0.12)",
  foodInk: "#F2994A",
  movieTint: "rgba(155, 81, 224, 0.12)",
  movieInk: "#9B51E0",
  routineTint: "rgba(39, 174, 96, 0.12)",
  routineInk: "#27AE60",
  otherTint: "rgba(107, 114, 128, 0.12)",
  otherInk: "#6B7280",
};

export const darkColors = {
  bg: "#0E0F11",
  surface: "#17191C",
  surface2: "#1F2226",
  surfaceAlt: "#1F2226",
  ink: "#F2F2F0",
  ink2: "#A2A7AE",
  text: "#F2F2F0",
  muted: "#A2A7AE",
  textMuted: "#A2A7AE",
  faint: "#5E636B",
  bodyTinted: "#A2A7AE",
  line: "#2A2D32",
  border: "#2A2D32",
  borderSubtle: "#2A2D32",
  borderDashed: "#2A2D32",
  accent: "#FF6B5F",
  accentInk: "#16181B",
  onFill: "#16181B",
  onPrimary: "#16181B",
  brand: "#FF6B5F",
  primary: "#FF6B5F",
  brandSoft: "rgba(255, 107, 95, 0.15)",
  accentSoft: "rgba(255, 107, 95, 0.15)",
  success: "#34C38A",
  successSoft: "rgba(52, 195, 138, 0.15)",
  warn: "#F2B544",
  danger: "#F0605D",
  dangerSoft: "rgba(240, 96, 93, 0.15)",
  running: "#F2B544",

  catFood: "#F2994A",
  catCafe: "#A0703E",
  catSight: "#2F80ED",
  catNature: "#27AE60",
  catStay: "#9B51E0",
  catNightlife: "#EB5757",
  catShopping: "#D6A100",
  catOther: "#6B7280",

  catFoodTint: "rgba(242, 153, 74, 0.15)",
  catCafeTint: "rgba(160, 112, 62, 0.15)",
  catSightTint: "rgba(47, 128, 237, 0.15)",
  catNatureTint: "rgba(39, 174, 96, 0.15)",
  catStayTint: "rgba(155, 81, 224, 0.15)",
  catNightlifeTint: "rgba(235, 87, 87, 0.15)",
  catShoppingTint: "rgba(214, 161, 0, 0.15)",
  catOtherTint: "rgba(107, 114, 128, 0.15)",

  catPlace: "#2F80ED",
  travelTint: "rgba(47, 128, 237, 0.15)",
  travelInk: "#2F80ED",
  foodTint: "rgba(242, 153, 74, 0.15)",
  foodInk: "#F2994A",
  movieTint: "rgba(155, 81, 224, 0.15)",
  movieInk: "#9B51E0",
  routineTint: "rgba(52, 195, 138, 0.15)",
  routineInk: "#34C38A",
  otherTint: "rgba(107, 114, 128, 0.15)",
  otherInk: "#A2A7AE",
};

// Dynamic export adapts to active Appearance color scheme
export const colors: typeof lightColors = new Proxy(lightColors, {
  get(target, prop: string | symbol) {
    const scheme = Appearance.getColorScheme();
    const active = scheme === "dark" ? darkColors : lightColors;
    return (active as any)[prop] ?? (target as any)[prop];
  },
});

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  gutter: 16,
  desktopGutter: 32,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  card: 20,
  lg: 20,
  xl: 28,
  sheet: 28,
  pill: 999,
};

/** Cross-platform elevation helper */
export const shadow: {
  (level?: 1 | 2 | 3): ViewStyle;
  sm: ViewStyle;
  card: ViewStyle;
  md: ViewStyle;
  lg: ViewStyle;
} = Object.assign(
  function shadow(level: 1 | 2 | 3 = 1): ViewStyle {
    const isDark = Appearance.getColorScheme() === "dark";
    if (isDark) {
      return {
        borderWidth: 1,
        borderColor: darkColors.line,
      };
    }

    const config = {
      1: { height: 1, radius: 2, opacity: 0.06, elevation: 1 },
      2: { height: 4, radius: 12, opacity: 0.08, elevation: 3 },
      3: { height: 16, radius: 40, opacity: 0.14, elevation: 6 },
    }[level];

    return Platform.select({
      ios: {
        shadowColor: "#101828",
        shadowOffset: { width: 0, height: config.height },
        shadowOpacity: config.opacity,
        shadowRadius: config.radius,
      },
      android: { elevation: config.elevation },
      default: {},
    }) as ViewStyle;
  },
  {
    get sm() {
      return shadow(1);
    },
    get card() {
      return shadow(1);
    },
    get md() {
      return shadow(2);
    },
    get lg() {
      return shadow(3);
    },
  }
);

export const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: "700", letterSpacing: -0.64 } as TextStyle,
  title1: { fontSize: 24, lineHeight: 30, fontWeight: "700" } as TextStyle,
  title2: { fontSize: 20, lineHeight: 26, fontWeight: "600" } as TextStyle,
  headline: { fontSize: 17, lineHeight: 22, fontWeight: "600" } as TextStyle,
  body: { fontSize: 15, lineHeight: 22, fontWeight: "400" } as TextStyle,
  callout: { fontSize: 14, lineHeight: 20, fontWeight: "500" } as TextStyle,
  caption: { fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.12 } as TextStyle,
  overline: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.66,
  } as TextStyle,

  // Backwards compatible aliases
  h1: { fontSize: 24, lineHeight: 30, fontWeight: "700" } as TextStyle,
  h2: { fontSize: 20, lineHeight: 26, fontWeight: "600" } as TextStyle,
  screenTitle: { fontSize: 32, lineHeight: 38, fontWeight: "700", letterSpacing: -0.64 } as TextStyle,
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: "600" } as TextStyle,
  cardTitle: { fontSize: 17, lineHeight: 22, fontWeight: "600" } as TextStyle,
  meta: { fontSize: 14, lineHeight: 20 } as TextStyle,
};

export const fonts = {
  regular: "Inter_400Regular",
  body: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  heavy: "Inter_800ExtraBold",
};
