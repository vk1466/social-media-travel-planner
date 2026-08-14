#!/usr/bin/env node
/**
 * Generate 10 skins of the Volume home page.
 *
 * The markup, the rotating bento, the Places/Posts shelf cards and the shared
 * filter panel all come straight from sites/04-volume — every demo loads that
 * site's styles.css and app.js, then layers one skin on top. So the UX is not a
 * copy of the product home, it *is* the product home with a different surface.
 *
 * Skin metadata (title, blurb, swatches) lives in shared/options.js so the
 * index and the review bar stay in sync with what is generated here.
 *
 *   node frontend/design-lab/home-page/_generate.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { OPTIONS } from "./shared/options.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const demosDir = resolve(__dirname, "demos");
mkdirSync(demosDir, { recursive: true });

const GOOGLE = (families) =>
  `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;

const FRAUNCES = "Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700";
const INTER = "Inter:wght@400;500;600;700;800";

/**
 * Each skin owns:
 *   fonts   — Google families this skin needs
 *   tokens  — --vol-* overrides (palette, type, radius)
 *   pb      — --pb-* overrides for the Places/Posts cores inside the panel
 *   chip    — motion picker colours (the widget hard-codes charcoal by default)
 *   css     — the distinctive treatments: hero tile, shelf cards, textures
 */
const SKINS = {
  "paper-coral": {
    fonts: [FRAUNCES, INTER],
    tokens: {
      "--vol-bg": "#faf8f4",
      "--vol-ink": "#1a1612",
      "--vol-muted": "#5c564e",
      "--vol-accent": "#ff5733",
      "--vol-accent-deep": "#d8401f",
      "--vol-panel": "#ffffff",
      "--vol-charcoal": "#1a1612",
      "--vol-forest": "#22402f",
      "--vol-forest-deep": "#0f1a13",
      "--vol-border": "rgba(26, 22, 18, 0.1)",
      "--vol-radius": "20px",
    },
    pb: { "--pb-accent": "#ff5733", "--pb-cover-radius": "20px" },
    chip: { bg: "#1a1612", ink: "#faf8f4", sub: "#b9ada2", swatch: "linear-gradient(135deg, #1a1612, #ff5733)" },
    css: `
.vol-bento { gap: 14px; }
.vol-tile { border: 1px solid var(--vol-border); box-shadow: none; }
.vol-tile.title { background: var(--vol-accent); border-color: transparent; }
.vol-tab.is-posts { background: var(--vol-accent); }
.vol-tab.is-places { background: linear-gradient(170deg, var(--vol-forest), var(--vol-forest-deep)); }
.vol-tab:hover { box-shadow: 0 6px 18px rgba(26, 22, 18, 0.07); }
`,
  },

  "forest-ledger": {
    fonts: [FRAUNCES, INTER],
    tokens: {
      "--vol-bg": "#f3f6f1",
      "--vol-ink": "#132019",
      "--vol-muted": "#55635a",
      "--vol-accent": "#1f6f4f",
      "--vol-accent-deep": "#14523a",
      "--vol-panel": "#ffffff",
      "--vol-charcoal": "#132019",
      "--vol-forest": "#1c3a2b",
      "--vol-forest-deep": "#0b1610",
      "--vol-border": "rgba(19, 32, 25, 0.1)",
      "--vol-radius": "18px",
    },
    pb: {
      "--pb-ink": "#132019",
      "--pb-muted": "#55635a",
      "--pb-accent": "#1f6f4f",
      "--pb-visited": "#1f6f4f",
      "--pb-dream": "#132019",
      "--pb-pin": "#1f6f4f",
      "--pb-cover-radius": "18px",
    },
    chip: { bg: "#132019", ink: "#eef4ef", sub: "#93a89b", swatch: "linear-gradient(135deg, #132019, #57a37c)" },
    css: `
.vol-tile { box-shadow: none; border: 1px solid var(--vol-border); }
.vol-tile.title {
  background: linear-gradient(155deg, #2b5c42 0%, #1c3a2b 55%, #0d1a13 100%);
  border-color: transparent;
}
.vol-tile.title .k { color: #cfe3d6; }
.vol-tile.data { background: #ffffff; color: var(--vol-ink); border: 1px solid var(--vol-border); }
.vol-tile.data .lbl { color: var(--vol-muted); }
.vol-tile.data .val em { color: var(--vol-accent); }
.vol-tab.is-places .tab-cta { color: #8fd4b0; }
.vol-tab.is-posts { background: linear-gradient(150deg, #f0a24a 0%, #d97b2b 100%); }
.vol-tab.is-posts .tab-cta { color: #1f1408; }
.vol-library-head .eyebrow, .vol-shell-eyebrow { color: var(--vol-accent-deep); }
`,
  },

  "midnight-reel": {
    fonts: [FRAUNCES, INTER],
    tokens: {
      "--vol-bg": "#0e1013",
      "--vol-ink": "#f2f3f5",
      "--vol-muted": "#98a1ac",
      "--vol-accent": "#ffb648",
      "--vol-accent-deep": "#f0a02a",
      "--vol-panel": "#171a1f",
      "--vol-charcoal": "#f2f3f5",
      "--vol-forest": "#1d2128",
      "--vol-forest-deep": "#0f1216",
      "--vol-border": "rgba(255, 255, 255, 0.1)",
      "--vol-radius": "20px",
    },
    pb: {
      "--pb-ink": "#f2f3f5",
      "--pb-muted": "#98a1ac",
      "--pb-accent": "#ffb648",
      "--pb-accent-ink": "#20180a",
      "--pb-panel": "#171a1f",
      "--pb-border": "rgba(255, 255, 255, 0.12)",
      "--pb-visited": "#ffb648",
      "--pb-dream": "#e8eaee",
      "--pb-pin": "#ffb648",
      "--pb-veil": "rgb(8 10 12 / 0.86)",
    },
    chip: { bg: "#1d2128", ink: "#f2f3f5", sub: "#98a1ac", swatch: "linear-gradient(135deg, #0e1013, #ffb648)" },
    css: `
.vol-nav { background: rgba(255, 255, 255, 0.06); }
.vol-nav a.is-on, .vol-nav button.is-on { background: var(--vol-accent); color: #20180a; }
.vol-nav a:hover:not(.is-on), .vol-nav button:hover:not(.is-on) { color: #ffffff; }
.vol-tile { background: var(--vol-panel); border: 1px solid var(--vol-border); box-shadow: none; }
.vol-tile.title {
  background: linear-gradient(150deg, #2a2015 0%, #16181d 62%, #0e1013 100%);
  border-color: rgba(255, 182, 72, 0.28);
}
.vol-tile.title h1 { color: #fdf6e9; }
.vol-tile.title h1 em { color: var(--vol-accent); }
.vol-tile.title .k { color: var(--vol-accent); opacity: 1; }
.vol-tile.data { background: #14171c; border: 1px solid var(--vol-border); }
.vol-tab { background: var(--vol-panel); border-color: var(--vol-border); box-shadow: none; }
.vol-tab.is-places { background: #14171c; border-color: var(--vol-border); }
.vol-tab.is-places .tab-cta { color: var(--vol-accent); }
.vol-tab.is-posts {
  background: linear-gradient(140deg, #3a2a12 0%, #1b1d23 100%);
  border: 1px solid rgba(255, 182, 72, 0.3);
}
.vol-tab.is-posts .tab-title, .vol-tab.is-posts .tab-cta { color: #ffd79a; }
.vol-tab.is-on { box-shadow: 0 0 0 2px var(--vol-accent), 0 12px 30px rgba(0, 0, 0, 0.5); }
.vol-tab.is-posts.is-on { box-shadow: 0 0 0 2px var(--vol-accent), 0 12px 30px rgba(0, 0, 0, 0.5); }
.vol-shell-bar { background: color-mix(in srgb, var(--vol-bg) 84%, black); }
.vol-panel { background: #12151a; }
.wf-places--volume .wf-places-cover-chips button { background: var(--pb-panel); border-color: var(--pb-border); }
`,
  },

  "sand-clay": {
    fonts: [FRAUNCES, INTER],
    tokens: {
      "--vol-bg": "#f3ece2",
      "--vol-ink": "#2a211a",
      "--vol-muted": "#6d6055",
      "--vol-accent": "#c1613c",
      "--vol-accent-deep": "#a44b2a",
      "--vol-panel": "#fffaf3",
      "--vol-charcoal": "#2a211a",
      "--vol-forest": "#4a3729",
      "--vol-forest-deep": "#2a1e15",
      "--vol-border": "rgba(42, 33, 26, 0.14)",
      "--vol-radius": "26px",
    },
    pb: {
      "--pb-ink": "#2a211a",
      "--pb-muted": "#6d6055",
      "--pb-accent": "#c1613c",
      "--pb-panel": "#fffaf3",
      "--pb-border": "rgba(42, 33, 26, 0.14)",
      "--pb-visited": "#c1613c",
      "--pb-dream": "#2a211a",
      "--pb-pin": "#c1613c",
      "--pb-cover-radius": "26px",
    },
    chip: { bg: "#2a211a", ink: "#f8f1e8", sub: "#bda994", swatch: "linear-gradient(135deg, #2a211a, #c1613c)" },
    css: `
.vol-nav { background: var(--vol-panel); backdrop-filter: none; }
.vol-tile { box-shadow: none; border: 1px solid var(--vol-border); }
.vol-tile:hover { transform: none; }
.vol-tile.title { background: var(--vol-accent); border-color: transparent; }
.vol-tile.data { background: #4a3729; }
.vol-tile .caption { background: rgba(42, 33, 26, 0.72); backdrop-filter: none; border-radius: 999px; }
.vol-tab { box-shadow: none; }
.vol-tab:hover { transform: none; box-shadow: none; border-color: var(--vol-accent); }
.vol-tab.is-places { background: #4a3729; }
.vol-tab.is-places .tab-cta { color: #e8a87f; }
.vol-tab.is-posts { background: var(--vol-accent); }
.vol-panel { box-shadow: none; }
`,
  },

  "nordic-light": {
    fonts: ["Manrope:wght@400;500;600;700;800", INTER],
    tokens: {
      "--vol-bg": "#f6f7f9",
      "--vol-ink": "#14181d",
      "--vol-muted": "#626b76",
      "--vol-accent": "#2f6bff",
      "--vol-accent-deep": "#1f52d6",
      "--vol-panel": "#ffffff",
      "--vol-charcoal": "#14181d",
      "--vol-forest": "#1b2430",
      "--vol-forest-deep": "#0d1117",
      "--vol-border": "rgba(20, 24, 29, 0.09)",
      "--vol-serif": '"Manrope", system-ui, sans-serif',
      "--vol-radius": "12px",
    },
    pb: {
      "--pb-ink": "#14181d",
      "--pb-muted": "#626b76",
      "--pb-accent": "#2f6bff",
      "--pb-border": "rgba(20, 24, 29, 0.09)",
      "--pb-serif": '"Manrope", system-ui, sans-serif',
      "--pb-visited": "#2f6bff",
      "--pb-dream": "#14181d",
      "--pb-pin": "#2f6bff",
      "--pb-cover-radius": "12px",
    },
    chip: { bg: "#14181d", ink: "#f6f7f9", sub: "#9aa4b1", swatch: "linear-gradient(135deg, #14181d, #2f6bff)" },
    css: `
.vol-tile.title h1,
.vol-tile.data .val,
.vol-tab .tab-title,
.vol-library-head h2,
.vol-shell-masthead h3,
.vol-shell-count-value {
  font-style: normal;
  font-weight: 700;
  letter-spacing: -0.035em;
}
.vol-tile { border: 1px solid var(--vol-border); box-shadow: 0 1px 2px rgba(20, 24, 29, 0.05); }
.vol-tile.title { background: linear-gradient(160deg, #3d78ff 0%, #2f6bff 45%, #1f52d6 100%); border-color: transparent; }
.vol-tile.data { background: #1b2430; }
.vol-tile .caption { border-radius: 6px; background: rgba(13, 17, 23, 0.72); }
.vol-tab.is-places { background: #1b2430; }
.vol-tab.is-places .tab-cta { color: #8fb0ff; }
.vol-tab.is-posts { background: linear-gradient(160deg, #3d78ff 0%, #1f52d6 100%); }
.vol-panel { border-radius: 14px; }
`,
  },

  "aurora-mint": {
    fonts: [FRAUNCES, INTER],
    tokens: {
      "--vol-bg": "#eef7f2",
      "--vol-ink": "#0f2a22",
      "--vol-muted": "#4d6b60",
      "--vol-accent": "#0b8f6a",
      "--vol-accent-deep": "#0b6b52",
      "--vol-panel": "#ffffff",
      "--vol-charcoal": "#0f2a22",
      "--vol-forest": "#12503c",
      "--vol-forest-deep": "#08251c",
      "--vol-border": "rgba(15, 42, 34, 0.1)",
      "--vol-radius": "24px",
    },
    pb: {
      "--pb-ink": "#0f2a22",
      "--pb-muted": "#4d6b60",
      "--pb-accent": "#0b8f6a",
      "--pb-panel": "rgba(255, 255, 255, 0.78)",
      "--pb-border": "rgba(15, 42, 34, 0.1)",
      "--pb-visited": "#0b8f6a",
      "--pb-dream": "#0f2a22",
      "--pb-pin": "#0b8f6a",
      "--pb-cover-radius": "24px",
    },
    chip: { bg: "#0f2a22", ink: "#eaf7f1", sub: "#8fc4b0", swatch: "linear-gradient(135deg, #0f2a22, #3ecfa1)" },
    css: `
body {
  background:
    radial-gradient(58rem 38rem at 8% -12%, rgba(62, 207, 161, 0.55), transparent 62%),
    radial-gradient(52rem 36rem at 96% 2%, rgba(96, 199, 255, 0.5), transparent 64%),
    radial-gradient(44rem 32rem at 44% 96%, rgba(160, 231, 199, 0.5), transparent 66%),
    var(--vol-bg);
  background-attachment: fixed;
}
.vol-nav { background: rgba(255, 255, 255, 0.55); }
.vol-tile { background: rgba(255, 255, 255, 0.62); backdrop-filter: blur(18px); border: 1px solid rgba(255, 255, 255, 0.6); }
.vol-tile.title {
  background: linear-gradient(150deg, rgba(126, 232, 208, 0.96) 0%, rgba(58, 197, 189, 0.96) 48%, rgba(31, 150, 190, 0.96) 100%);
  border-color: rgba(255, 255, 255, 0.5);
  color: #04302c;
}
.vol-tile.title .k { opacity: 0.7; }
.vol-tile.data { background: linear-gradient(155deg, rgba(18, 80, 60, 0.94), rgba(8, 37, 28, 0.94)); }
.vol-tile.data .val em { color: #6fe3ba; }
.vol-tab { background: rgba(255, 255, 255, 0.66); backdrop-filter: blur(18px); border-color: rgba(255, 255, 255, 0.6); }
.vol-tab.is-places { background: linear-gradient(155deg, rgba(18, 80, 60, 0.94), rgba(8, 37, 28, 0.94)); }
.vol-tab.is-places .tab-cta { color: #6fe3ba; }
.vol-tab.is-posts {
  background: linear-gradient(150deg, rgba(126, 232, 208, 0.96), rgba(31, 150, 190, 0.96));
  color: #04302c;
}
.vol-tab.is-posts .tab-kicker, .vol-tab.is-posts .tab-meta { color: rgba(4, 48, 44, 0.7); }
.vol-tab.is-posts .tab-cta { color: #04302c; }
.vol-panel { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(20px); border-color: rgba(255, 255, 255, 0.6); }
.vol-shell-bar { background: rgba(255, 255, 255, 0.5); backdrop-filter: blur(14px); }
.vol-shell-facets, .vol-shell-banner { background: rgba(255, 255, 255, 0.72); }
`,
  },

  "mono-press": {
    fonts: ["Libre+Baskerville:ital,wght@0,400;0,700;1,400", "DM+Mono:wght@400;500", INTER],
    tokens: {
      "--vol-bg": "#f2f1ee",
      "--vol-ink": "#111111",
      "--vol-muted": "#5d5d5a",
      "--vol-accent": "#a8321e",
      "--vol-accent-deep": "#8b2716",
      "--vol-panel": "#fbfaf8",
      "--vol-charcoal": "#111111",
      "--vol-forest": "#1c1c1a",
      "--vol-forest-deep": "#0b0b0a",
      "--vol-border": "rgba(17, 17, 17, 0.16)",
      "--vol-serif": '"Libre Baskerville", Georgia, serif',
      "--vol-radius": "6px",
    },
    pb: {
      "--pb-ink": "#111111",
      "--pb-muted": "#5d5d5a",
      "--pb-accent": "#a8321e",
      "--pb-panel": "#fbfaf8",
      "--pb-border": "rgba(17, 17, 17, 0.16)",
      "--pb-serif": '"Libre Baskerville", Georgia, serif',
      "--pb-visited": "#a8321e",
      "--pb-dream": "#111111",
      "--pb-pin": "#a8321e",
      "--pb-cover-radius": "6px",
    },
    chip: { bg: "#111111", ink: "#f2f1ee", sub: "#a3a3a0", swatch: "linear-gradient(135deg, #111111, #a8321e)" },
    css: `
.vol-tile.title h1,
.vol-tile.data .val,
.vol-tab .tab-title,
.vol-library-head h2,
.vol-shell-masthead h3,
.vol-shell-count-value,
.vol-tile.data .val em {
  font-style: normal;
  letter-spacing: -0.02em;
}
.vol-tile.title h1 { font-size: clamp(2.1rem, 3.4vw, 2.9rem); }
.vol-tile.data .lbl,
.vol-tile.title .k,
.vol-tab .tab-kicker,
.vol-library-head .eyebrow,
.vol-shell-eyebrow,
.vol-shell-context,
.vol-shell-count-label {
  font-family: "DM Mono", ui-monospace, monospace;
  font-weight: 500;
}
.vol-nav { background: var(--vol-panel); backdrop-filter: none; border-radius: 6px; }
.vol-nav a, .vol-nav button { border-radius: 4px; }
.vol-tile { border: 1px solid var(--vol-border); box-shadow: none; }
.vol-tile:hover { transform: none; }
.vol-tile.title { background: #111111; border-color: #111111; }
.vol-tile.title h1 em { color: #ffffff; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 6px; }
.vol-tile.data { background: var(--vol-panel); color: var(--vol-ink); border: 1px solid var(--vol-border); }
.vol-tile.data .lbl { color: var(--vol-muted); }
.vol-tile.data .val em { color: var(--vol-accent); }
.vol-tile .caption { background: #111111; backdrop-filter: none; border-radius: 3px; font-weight: 500; }
.vol-tab { border-radius: 6px; box-shadow: none; }
.vol-tab:hover { transform: none; box-shadow: none; border-color: #111111; }
.vol-tab.is-places { background: #111111; }
.vol-tab.is-places .tab-cta { color: #ffffff; text-decoration: underline; text-underline-offset: 4px; }
.vol-tab.is-posts { background: var(--vol-panel); color: var(--vol-ink); border: 1px solid var(--vol-border); }
.vol-tab.is-posts .tab-kicker, .vol-tab.is-posts .tab-meta { color: var(--vol-muted); }
.vol-tab.is-posts .tab-cta { color: var(--vol-accent); }
.vol-tab.is-posts.is-on { box-shadow: 0 0 0 2px #111111; }
.vol-panel { border-radius: 8px; box-shadow: none; }
.vol-shell-facets { border-radius: 6px; }
`,
  },

  "kraft-zine": {
    fonts: ["Space+Grotesk:wght@400;500;600;700", INTER],
    tokens: {
      "--vol-bg": "#efe6d6",
      "--vol-ink": "#191614",
      "--vol-muted": "#5f564c",
      "--vol-accent": "#e2571f",
      "--vol-accent-deep": "#b93f10",
      "--vol-panel": "#fffdf7",
      "--vol-charcoal": "#191614",
      "--vol-forest": "#1f5c46",
      "--vol-forest-deep": "#0d2b21",
      "--vol-border": "#191614",
      "--vol-serif": '"Space Grotesk", system-ui, sans-serif',
      "--vol-radius": "14px",
    },
    pb: {
      "--pb-ink": "#191614",
      "--pb-muted": "#5f564c",
      "--pb-accent": "#e2571f",
      "--pb-panel": "#fffdf7",
      "--pb-border": "rgba(25, 22, 20, 0.35)",
      "--pb-serif": '"Space Grotesk", system-ui, sans-serif',
      "--pb-visited": "#e2571f",
      "--pb-dream": "#1f5c46",
      "--pb-pin": "#e2571f",
      "--pb-cover-radius": "14px",
    },
    chip: { bg: "#191614", ink: "#fff6e6", sub: "#bfae95", swatch: "linear-gradient(135deg, #191614, #e2571f)" },
    css: `
.vol-tile.title h1,
.vol-tile.data .val,
.vol-tab .tab-title,
.vol-library-head h2,
.vol-shell-masthead h3,
.vol-shell-count-value {
  font-style: normal;
  font-weight: 700;
  letter-spacing: -0.03em;
}
.vol-nav { background: var(--vol-panel); backdrop-filter: none; border: 1.5px solid var(--vol-ink); }
.vol-tile { border: 1.5px solid var(--vol-ink); box-shadow: 4px 4px 0 var(--vol-ink); }
.vol-tile:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--vol-ink); }
.vol-tile.title { background: var(--vol-accent); }
.vol-tile.title h1 em { color: #fffdf7; }
.vol-tile.data { background: var(--vol-forest); }
.vol-tile.data .val em { color: #ffc48a; }
.vol-tile .caption { background: var(--vol-ink); backdrop-filter: none; border-radius: 0; }
.vol-tab { border: 1.5px solid var(--vol-ink); box-shadow: 4px 4px 0 var(--vol-ink); }
.vol-tab:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--vol-ink); border-color: var(--vol-ink); }
.vol-tab.is-places { background: var(--vol-forest); border-color: var(--vol-ink); }
.vol-tab.is-places .tab-cta { color: #ffc48a; }
.vol-tab.is-posts { background: var(--vol-accent); border-color: var(--vol-ink); }
.vol-tab.is-on { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--vol-ink); }
.vol-tab.is-posts.is-on { box-shadow: 6px 6px 0 var(--vol-ink); }
.vol-panel { border: 1.5px solid var(--vol-ink); box-shadow: 4px 4px 0 var(--vol-ink); background: var(--vol-panel); }
.vol-shell-facets, .vol-shell-banner { border-color: rgba(25, 22, 20, 0.4); }
`,
  },

  "slate-product": {
    fonts: ["Sora:wght@400;500;600;700", INTER],
    tokens: {
      "--vol-bg": "#fbfbfc",
      "--vol-ink": "#0b0d10",
      "--vol-muted": "#5c6472",
      "--vol-accent": "#6d5efc",
      "--vol-accent-deep": "#5546e0",
      "--vol-panel": "#ffffff",
      "--vol-charcoal": "#0b0d10",
      "--vol-forest": "#181c25",
      "--vol-forest-deep": "#0b0d10",
      "--vol-border": "rgba(11, 13, 16, 0.1)",
      "--vol-serif": '"Sora", system-ui, sans-serif',
      "--vol-radius": "14px",
    },
    pb: {
      "--pb-ink": "#0b0d10",
      "--pb-muted": "#5c6472",
      "--pb-accent": "#6d5efc",
      "--pb-border": "rgba(11, 13, 16, 0.1)",
      "--pb-serif": '"Sora", system-ui, sans-serif',
      "--pb-visited": "#6d5efc",
      "--pb-dream": "#0b0d10",
      "--pb-pin": "#6d5efc",
      "--pb-cover-radius": "14px",
    },
    chip: { bg: "#0b0d10", ink: "#f7f7fa", sub: "#9aa1b1", swatch: "linear-gradient(135deg, #0b0d10, #6d5efc)" },
    css: `
.vol-tile.title h1,
.vol-tile.data .val,
.vol-tab .tab-title,
.vol-library-head h2,
.vol-shell-masthead h3,
.vol-shell-count-value {
  font-style: normal;
  font-weight: 600;
  letter-spacing: -0.03em;
}
.vol-bento { gap: 10px; }
.vol-tile { border: 1px solid var(--vol-border); box-shadow: 0 1px 2px rgba(11, 13, 16, 0.05); }
.vol-tile:hover { box-shadow: 0 10px 30px rgba(11, 13, 16, 0.08); }
.vol-tile.title { background: linear-gradient(155deg, #8b7bff 0%, #6d5efc 48%, #4a3bd6 100%); border-color: transparent; }
.vol-tile.data { background: linear-gradient(155deg, #232a36 0%, #0b0d10 100%); }
.vol-tile.data .val em { color: #a99bff; }
.vol-tile .caption { border-radius: 6px; background: rgba(11, 13, 16, 0.7); }
.vol-tab { border-radius: 14px; }
.vol-tab.is-places { background: linear-gradient(155deg, #232a36 0%, #0b0d10 100%); }
.vol-tab.is-places .tab-cta { color: #a99bff; }
.vol-tab.is-posts { background: linear-gradient(150deg, #8b7bff 0%, #5546e0 100%); }
.vol-panel { border-radius: 16px; }
.vol-shell-seg, .vol-shell-search, .vol-shell-pill { border-radius: 8px; }
.vol-shell-seg button { border-radius: 6px; }
`,
  },

  "dusk-gradient": {
    fonts: [FRAUNCES, INTER],
    tokens: {
      "--vol-bg": "#fbf7f6",
      "--vol-ink": "#1a1220",
      "--vol-muted": "#635a6c",
      "--vol-accent": "#c23c7c",
      "--vol-accent-deep": "#9c2a62",
      "--vol-panel": "#ffffff",
      "--vol-charcoal": "#1a1220",
      "--vol-forest": "#3b2a5e",
      "--vol-forest-deep": "#1a1130",
      "--vol-border": "rgba(26, 18, 32, 0.1)",
      "--vol-radius": "22px",
    },
    pb: {
      "--pb-ink": "#1a1220",
      "--pb-muted": "#635a6c",
      "--pb-accent": "#c23c7c",
      "--pb-border": "rgba(26, 18, 32, 0.1)",
      "--pb-visited": "#c23c7c",
      "--pb-dream": "#3b2a5e",
      "--pb-pin": "#c23c7c",
      "--pb-cover-radius": "22px",
    },
    chip: { bg: "#1a1130", ink: "#f7effa", sub: "#b09cc4", swatch: "linear-gradient(135deg, #3b2a5e, #d9528f)" },
    css: `
body {
  background:
    radial-gradient(52rem 32rem at 88% -6%, rgba(217, 82, 143, 0.16), transparent 62%),
    radial-gradient(46rem 30rem at 4% 4%, rgba(123, 63, 160, 0.14), transparent 60%),
    var(--vol-bg);
  background-attachment: fixed;
}
.vol-tile.title { background: linear-gradient(145deg, #d9528f 0%, #a3399c 52%, #5b2b8a 100%); }
.vol-tile.data { background: linear-gradient(155deg, #3b2a5e 0%, #1a1130 100%); }
.vol-tile.data .val em { color: #f490bb; }
.vol-tab.is-places { background: linear-gradient(155deg, #3b2a5e 0%, #1a1130 100%); }
.vol-tab.is-places .tab-cta { color: #f490bb; }
.vol-tab.is-posts { background: linear-gradient(140deg, #d9528f 0%, #a3399c 55%, #6f2f96 100%); }
.vol-tab.is-posts.is-on { box-shadow: 0 0 0 2px #fff, 0 10px 28px rgba(162, 57, 156, 0.35); }
.vol-brand .dot { background: linear-gradient(135deg, #d9528f, #6f2f96); }
`,
  },
};

const cssBlock = (selector, entries) => {
  const body = Object.entries(entries)
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join("\n");
  return `${selector} {\n${body}\n}`;
};

function skinCss(option, skin) {
  return [
    `/* Skin ${option.id} · ${option.title} — ${option.note} */`,
    cssBlock(":root", skin.tokens),
    cssBlock(".wf-places--volume,\n.wf-posts--volume", skin.pb),
    cssBlock(".vol-brand .dot", {
      background: `linear-gradient(135deg, var(--vol-accent), var(--vol-accent-deep))`,
    }),
    cssBlock(".vol-motion-toggle,\n.vol-motion-panel", {
      background: skin.chip.bg,
      color: skin.chip.ink,
    }),
    cssBlock(".vol-motion-sub,\n.vol-motion-preset-note", { color: skin.chip.sub }),
    cssBlock(".vol-motion-swatch", { background: skin.chip.swatch }),
    skin.css.trim(),
  ].join("\n\n");
}

function pageHtml(option, skin) {
  const self = `${option.id}-${option.slug}.html`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${option.id} · ${option.title} — Volume home skins</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${GOOGLE(skin.fonts)}" rel="stylesheet" />
  <link rel="stylesheet" href="../../sites/shared/places-browse.css" />
  <link rel="stylesheet" href="../../sites/shared/posts-browse.css" />
  <link rel="stylesheet" href="../../sites/04-volume/styles.css" />
  <link rel="stylesheet" href="../shared/lab.css" />
  <style>
${skinCss(option, skin)}
  </style>
</head>
<body>
  <div id="app">
    <header class="vol-topbar">
      <a class="vol-brand" href="${self}"><span class="dot">V</span>Volume</a>
      <nav class="vol-nav" aria-label="Primary">
        <a class="is-on" href="${self}" data-nav-discover>Discover</a>
        <button type="button" data-open="places">Places</button>
        <button type="button" data-open="posts">Posts</button>
        <a href="../../sites/04-volume/add.html">Add</a>
      </nav>
    </header>

    <section class="vol-bento" aria-label="Library highlight" id="vol-bento">
      <div class="vol-tile title wide tall">
        <span class="k">Volume · IV</span>
        <h1>Places<br />you keep<br /><em>coming back to.</em></h1>
      </div>
      <div class="vol-tile" data-slot="0">
        <div class="vol-tile-stack">
          <img class="vol-tile-layer vol-tile-layer--base" alt="" />
          <img class="vol-tile-layer vol-tile-layer--next" alt="" />
        </div>
        <span class="caption">—</span>
      </div>
      <div class="vol-tile" data-slot="1">
        <div class="vol-tile-stack">
          <img class="vol-tile-layer vol-tile-layer--base" alt="" />
          <img class="vol-tile-layer vol-tile-layer--next" alt="" />
        </div>
        <span class="caption">—</span>
      </div>
      <div class="vol-tile data">
        <span class="lbl">Saved</span>
        <span class="val" data-stat="saved">—</span>
      </div>
      <div class="vol-tile" data-slot="2">
        <div class="vol-tile-stack">
          <img class="vol-tile-layer vol-tile-layer--base" alt="" />
          <img class="vol-tile-layer vol-tile-layer--next" alt="" />
        </div>
        <span class="caption">—</span>
      </div>
      <div class="vol-tile" data-slot="3">
        <div class="vol-tile-stack">
          <img class="vol-tile-layer vol-tile-layer--base" alt="" />
          <img class="vol-tile-layer vol-tile-layer--next" alt="" />
        </div>
        <span class="caption">—</span>
      </div>
      <div class="vol-tile data">
        <span class="lbl">Visited so far</span>
        <span class="val"><em data-stat="visited">—</em></span>
      </div>
      <div class="vol-tile wide" data-slot="4">
        <div class="vol-tile-stack">
          <img class="vol-tile-layer vol-tile-layer--base" alt="" />
          <img class="vol-tile-layer vol-tile-layer--next" alt="" />
        </div>
        <span class="caption">—</span>
      </div>
    </section>

    <section class="vol-library" aria-labelledby="vol-library-title">
      <div class="vol-library-head">
        <div>
          <p class="eyebrow">Your library</p>
          <h2 id="vol-library-title">Open a shelf</h2>
          <p>One shared filter chrome for Places and Posts — only the core atlas or lantern body swaps.</p>
        </div>
      </div>
      <div class="vol-tabs" role="tablist" aria-label="Library">
        <button
          type="button"
          class="vol-tab is-places"
          role="tab"
          id="tab-places"
          data-open="places"
          aria-controls="panel-library"
          aria-selected="false"
        >
          <span class="tab-kicker">Atlas</span>
          <span class="tab-title">Places</span>
          <span class="tab-meta" data-tab-meta="places">Loading…</span>
          <span class="tab-cta">Show atlas ↓</span>
        </button>
        <button
          type="button"
          class="vol-tab is-posts"
          role="tab"
          id="tab-posts"
          data-open="posts"
          aria-controls="panel-library"
          aria-selected="false"
        >
          <span class="tab-kicker">Lantern</span>
          <span class="tab-title">Posts</span>
          <span class="tab-meta" data-tab-meta="posts">Loading…</span>
          <span class="tab-cta">Show saves ↓</span>
        </button>
      </div>

      <div
        class="vol-panel"
        id="panel-library"
        role="tabpanel"
        aria-labelledby="tab-places"
        hidden
      ></div>
    </section>

    <footer class="vol-footer">
      <span>© 2026 Wanderfile · Volume — ${option.title}</span>
      <a href="../../sites/04-volume/add.html">Paste a reel →</a>
    </footer>
  </div>

  <div class="vol-motion" data-motion-picker data-open="false">
    <button type="button" class="vol-motion-toggle" data-motion-toggle>
      <span class="vol-motion-swatch" data-motion-swatch aria-hidden="true"></span>
      <span>Motion</span>
    </button>
    <div class="vol-motion-panel" data-motion-panel hidden>
      <p class="vol-motion-title">Photo motion</p>
      <p class="vol-motion-sub">Rotate profile stills across the bento — one photo per tile.</p>
      <div class="vol-motion-list" data-motion-list></div>
    </div>
  </div>

  <script>
    window.WF_SITE = {
      id: "04-volume",
      title: "Volume",
      thesis: "Bento hero — shared filter shell, Places & Posts cores swap.",
      page: "home",
    };
    window.WF_SITE_BASE = "../../sites/04-volume/";
  </script>
  <script src="../../sites/shared/mock.js"></script>
  <script type="module" src="../../sites/04-volume/app.js"></script>
  <script type="module" src="../shared/lab-bar.js"></script>
</body>
</html>
`;
}

let written = 0;
for (const option of OPTIONS) {
  const skin = SKINS[option.slug];
  if (!skin) throw new Error(`No skin defined for ${option.id}-${option.slug}`);
  writeFileSync(resolve(demosDir, `${option.id}-${option.slug}.html`), pageHtml(option, skin));
  written += 1;
}

console.log(`Wrote ${written} home skins to ${demosDir}`);
