import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/react";

import { BrandCss } from "./brandColors";
import type { BrandMode } from "./themeColor";

type Appearance = NonNullable<
  ComponentProps<typeof ClerkProvider>["appearance"]
>;

/**
 * Clerk appearance for modals we still open (e.g. Manage account).
 * Profile menu itself is custom and does not use Clerk UI.
 */
export function wanderfileClerkAppearance(mode: BrandMode = "dark"): Appearance {
  const dark = mode !== "light";

  return {
    options: {
      unsafe_disableDevelopmentModeWarnings: true,
    },
    variables: {
      colorPrimary: BrandCss.forest,
      colorPrimaryForeground: BrandCss.cream,
      colorForeground: dark ? "var(--wf-on-brand)" : BrandCss.ink,
      colorMutedForeground: BrandCss.quiet,
      colorMuted: dark ? "rgb(255 255 255 / 0.07)" : BrandCss.surfaceMuted,
      colorBackground: dark ? BrandCss.forestDeep : BrandCss.surface,
      colorInput: dark ? "rgb(255 255 255 / 0.08)" : BrandCss.bg,
      colorInputForeground: dark ? "var(--wf-on-brand)" : BrandCss.ink,
      colorNeutral: dark ? "var(--wf-on-brand)" : BrandCss.ink,
      colorBorder: dark ? "rgb(var(--wf-mint-rgb) / 0.22)" : BrandCss.border,
      colorRing: BrandCss.mint,
      colorShadow: dark ? "#000000" : BrandCss.ink,
      colorDanger: "var(--wf-danger)",
      colorSuccess: BrandCss.sage,
      colorModalBackdrop: "rgb(var(--wf-forest-deep-rgb) / 0.55)",
      borderRadius: "0.75rem",
      fontFamily: 'var(--wf-font-body, "DM Sans Variable", system-ui, sans-serif)',
      fontFamilyButtons: 'var(--wf-font-body, "DM Sans Variable", system-ui, sans-serif)',
      fontSize: "0.875rem",
    },
    elements: {
      // Hide Clerk marketing / "Secured by" chrome in account modal.
      footer: { display: "none" },
      footerAction: { display: "none" },
      badge: { display: "none" },
      modalContent: {
        background: dark ? "var(--wf-forest-deep)" : "var(--wf-surface)",
      },
      cardBox: {
        boxShadow: dark ? "var(--wf-shadow-dark)" : "var(--wf-shadow-lg)",
      },
      navbar: {
        background: dark
          ? "color-mix(in srgb, var(--wf-forest-deep) 92%, var(--wf-mint))"
          : "var(--wf-surface-muted)",
      },
      scrollBox: {
        background: dark ? "var(--wf-forest-deep)" : "var(--wf-surface)",
      },
    },
  };
}
