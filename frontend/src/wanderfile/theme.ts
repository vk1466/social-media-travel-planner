export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "wf_theme";

export function getStoredTheme(): ThemeMode {
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val === "light" || val === "dark" || val === "system") {
      return val;
    }
  } catch {
    // ignore
  }
  return "system";
}

export function setStoredTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  applyTheme(mode);
}

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "system") return getSystemTheme();
  return mode;
}

export function applyTheme(mode: ThemeMode = getStoredTheme()) {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(mode);
  document.documentElement.setAttribute("data-theme", resolved);

  const root = document.documentElement;
  if (resolved === "dark") {
    root.style.removeProperty("--wf-bg");
    root.style.removeProperty("--wf-surface");
    root.style.removeProperty("--wf-surface-2");
    root.style.removeProperty("--wf-text");
    root.style.removeProperty("--wf-ink");
    root.style.removeProperty("--wf-text-muted");
    root.style.removeProperty("--wf-muted");
    root.style.removeProperty("--wf-border");
    root.style.removeProperty("--wf-border-subtle");
    root.style.colorScheme = "dark";
    document.body.style.backgroundColor = "#0E0F11";
    document.body.style.color = "#F2F2F0";
  } else {
    root.style.colorScheme = "light";
    document.body.style.backgroundColor = "";
    document.body.style.color = "";
  }
}

// Auto-initialize theme listener on module load
if (typeof window !== "undefined") {
  applyTheme();
  try {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", () => {
      if (getStoredTheme() === "system") {
        applyTheme("system");
      }
    });
  } catch {
    // older browser fallback
  }
}
