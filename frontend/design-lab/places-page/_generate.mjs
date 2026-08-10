#!/usr/bin/env node
/**
 * Generate 20 Almanac places-page structure demos — modern 2025-2026 web design.
 * Filters + place atlas module stay identical; only the page shell changes.
 * Each shell aggressively uses imagery, motion, glass, mesh, dashboards, etc.
 * Where useful, each shell overrides atlas card CSS variables so the covers
 * visually blend into the surrounding theme.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const demosDir = resolve(__dirname, "demos");
mkdirSync(demosDir, { recursive: true });

// -----------------------------------------------------------------------
// Photo library (Unsplash CDN — proven-permanent editorial IDs)
// -----------------------------------------------------------------------

const U = (id, w = 1600, h = 1000) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

const P = {
  balloons:    U("photo-1523592121529-f6dde35f079e", 2000, 1200),
  balloonsP:   U("photo-1523592121529-f6dde35f079e", 1000, 1400),
  sunrise:     U("photo-1520939817895-060bdaf4fe1b", 1600, 1000),
  positano:    U("photo-1533106497176-45ae19e68ba2", 1200, 1600),
  positanoW:   U("photo-1533106497176-45ae19e68ba2", 1600, 1000),
  kyoto:       U("photo-1528360983277-13d401cdc186", 1600, 1000),
  kyotoP:      U("photo-1528360983277-13d401cdc186", 1000, 1400),
  santorini:   U("photo-1533105079780-92b9be482077", 1200, 1600),
  santoriniW:  U("photo-1533105079780-92b9be482077", 1800, 1100),
  fjord:       U("photo-1506905925346-21bda4d32df4", 2000, 1200),
  bamboo:      U("photo-1528164344705-47542687000d", 1200, 1600),
  cliffs:      U("photo-1523906834658-6e24ef2386f9", 1200, 1600),
  desert:      U("photo-1509316785289-025f5b846b35", 2000, 1200),
  patagonia:   U("photo-1520962880247-cfaf541c8724", 2000, 1200),
  iceland:     U("photo-1476514525535-07fb3b4ae5f1", 2000, 1200),
  marrakech:   U("photo-1489749798305-4fea3ae63d43", 1200, 1600),
  aurora:      U("photo-1483347756197-71ef80e95f73", 2000, 1200),
  tokyo:       U("photo-1540959733332-eab4deabeeaf", 1600, 1000),
  paris:       U("photo-1502602898657-3e91760cbb34", 1200, 1600),
  ny:          U("photo-1496442226666-8d4d0e62e6e9", 2000, 1200),
  tent:        U("photo-1504280390367-361c6d9f38f4", 1600, 1000),
  cyclist:     U("photo-1441974231531-c6227db76b6e", 1200, 1600),
};

// -----------------------------------------------------------------------
// Demos
// -----------------------------------------------------------------------

const DEMOS = [
  { id: "01", slug: "bento-hero",       title: "Bento hero",         blurb: "A 6-tile bento with photos, metrics, and brand; atlas continues below.",             axis: "Modern · bento · product" },
  { id: "02", slug: "cinema-poster",    title: "Cinema poster",      blurb: "Full-viewport photo poster à la MUBI; atlas snaps up under the mark.",              axis: "Cinematic · immersive · dark" },
  { id: "03", slug: "photo-split",      title: "Photo split",        blurb: "Sticky 40% photo column; atlas lives on the right — Airbnb Icons split.",           axis: "Modern · split · imagery" },
  { id: "04", slug: "marquee-ribbon",   title: "Marquee ribbon",     blurb: "Auto-scrolling photo ribbon of destinations across the top; atlas below.",           axis: "Kinetic · motion · imagery" },
  { id: "05", slug: "glass-mesh",       title: "Glass on mesh",      blurb: "Animated conic-gradient mesh; the atlas floats in a frosted glass card.",           axis: "Modern · glass · gradient" },
  { id: "06", slug: "dashboard",        title: "Product dashboard",  blurb: "Linear-style dark shell — KPI cards, sidebar, atlas as a live widget.",              axis: "Product · dark · dashboard" },
  { id: "07", slug: "diagonal-split",   title: "Diagonal split",     blurb: "Clip-path diagonal separates a full photo panel from the atlas region.",              axis: "Modern · geometric · bold" },
  { id: "08", slug: "mesh-type",        title: "Mesh + type",        blurb: "Stripe-style gradient mesh behind an oversized type block; atlas grounded below.",   axis: "Modern · gradient · type" },
  { id: "09", slug: "category-rail",    title: "Category rail",      blurb: "Airbnb Icons rail — round photo tiles across the top; atlas below.",                axis: "Product · category · imagery" },
  { id: "10", slug: "spotlight-sticky", title: "Spotlight sticky",   blurb: "Sticky spotlight photo card on the left; atlas scrolls on the right.",              axis: "Modern · spotlight · split" },
  { id: "11", slug: "aurora",           title: "Aurora ambient",     blurb: "Slow aurora gradient wash behind a translucent glass atlas frame.",                  axis: "Ambient · atmospheric · glass" },
  { id: "12", slug: "mosaic-hero",      title: "Photo mosaic hero",  blurb: "A 4-tile photo mosaic hero with the mark laid across; atlas below.",                axis: "Modern · mosaic · imagery" },
  { id: "13", slug: "cinematic-bleed",  title: "Cinematic bleed",    blurb: "Full-bleed cinematic hero with layered typography lockup; dark atlas.",              axis: "Cinematic · dark · bold" },
  { id: "14", slug: "kpi-hero",         title: "KPI hero",           blurb: "Framer-style oversized metric cards as a hero; atlas grounded below.",              axis: "Product · data · metrics" },
  { id: "15", slug: "marketing-bold",   title: "Marketing bold",     blurb: "Framer-style bold marketing shell with gradient headline and pill CTA.",             axis: "Modern · marketing · bold" },
  { id: "16", slug: "card-stack",       title: "Card stack",         blurb: "Rotated stack of photo cards behind the atlas — physical depth, modern.",           axis: "Modern · depth · imagery" },
  { id: "17", slug: "rich-editorial",   title: "Rich editorial",     blurb: "Modern editorial with an oversized photograph and precise typography.",              axis: "Editorial · modern · imagery" },
  { id: "18", slug: "vercel-dark",      title: "Vercel dark",        blurb: "Pure black + vibrant magenta/cyan glow, mono type, dark atlas.",                     axis: "Product · dark · vivid" },
  { id: "19", slug: "poster-wall",      title: "Poster wall",        blurb: "Full-viewport 6-poster grid as backdrop; atlas floats over on scroll.",             axis: "Immersive · imagery · maximal" },
  { id: "20", slug: "story-mobile",     title: "Story mobile",       blurb: "Instagram-story vertical shell with a full-height photo hero and dock.",             axis: "Mobile · vertical · stories" },
];

// -----------------------------------------------------------------------
// Shell (top pager + bottom pager + arrow-key nav)
// -----------------------------------------------------------------------

function shellHtml(demo, body, extraCss, neighbors) {
  const { prevHref, nextHref, prevTitle, nextTitle } = neighbors;
  const prevAttr = prevHref
    ? `href="${prevHref}"`
    : `href="#" aria-disabled="true" tabindex="-1"`;
  const nextAttr = nextHref
    ? `href="${nextHref}"`
    : `href="#" aria-disabled="true" tabindex="-1"`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${demo.id} · ${demo.title} — Places Page Lab</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../sites/shared/places-browse.css" />
  <link rel="stylesheet" href="../shared/shell.css" />
  <style>
${extraCss}
  </style>
</head>
<body>
  <header class="lab-top">
    <a href="../index.html">← Places Page Lab</a>
    <nav class="lab-top-nav" aria-label="Structure pager">
      <a ${prevAttr}>← Back</a>
      <span class="pattern">Structure ${demo.id} / ${String(DEMOS.length).padStart(2, "0")}</span>
      <a ${nextAttr}>Next →</a>
    </nav>
    <a href="../../index.html">Design Lab</a>
  </header>
${body}
  <nav class="lab-bottom-nav" aria-label="Structure pager">
    <a ${prevAttr}>${prevHref ? `← ${prevTitle}` : "← Back"}</a>
    <span class="hint">← → keys</span>
    <a ${nextAttr}>${nextHref ? `${nextTitle} →` : "Next →"}</a>
  </nav>
  <script>window.WF_SITE = { id: "02-almanac", title: "Almanac", page: "places-structure" };</script>
  <script src="../../sites/shared/mock.js"></script>
  <script type="module" src="../shared/mount.js"></script>
  <script type="module">
    const prev = ${JSON.stringify(prevHref)};
    const next = ${JSON.stringify(nextHref)};
    window.addEventListener("keydown", (event) => {
      if (event.defaultPrevented) return;
      const tag = (event.target && event.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || event.target?.isContentEditable) return;
      if (event.key === "ArrowLeft" && prev) location.href = prev;
      if (event.key === "ArrowRight" && next) location.href = next;
    });
  </script>
</body>
</html>
`;
}

// Shared atoms
const atlasSlot = (extraClass = "") =>
  `<div id="wf-places-root" class="wf-places wf-places--almanac wf-places--embedded${extraClass ? " " + extraClass : ""}"><div class="wf-places-loading">Loading atlas…</div></div>`;

const navPill = ({ dark = false } = {}) => `
  <nav class="modern-nav" aria-label="Primary">
    <a href="../../sites/02-almanac/index.html">Discover</a>
    <a href="../../sites/02-almanac/posts.html">Posts</a>
    <a class="is-on" href="#">Places</a>
    <a href="../../sites/02-almanac/history.html">Journal</a>
    <a href="../../sites/02-almanac/add.html">Add</a>
  </nav>`;

// -----------------------------------------------------------------------
// LAYOUTS
// -----------------------------------------------------------------------

const LAYOUTS = {

  // 01 · Bento hero — Rauno/Arc style 6-tile grid, atlas continues below
  "bento-hero": {
    css: `
body { background: #f5f2ec; color: #1a1612; font-family: "Inter", var(--a-sans); }
.bt-topbar {
  max-width: 1400px; margin: 0 auto; padding: 1.25rem 24px 1rem;
  display: flex; justify-content: space-between; align-items: center;
}
.bt-topbar .brand {
  display: flex; align-items: center; gap: 8px;
  font-family: "Inter", sans-serif; font-weight: 700; font-size: 1rem; letter-spacing: -0.01em;
}
.bt-topbar .brand .dot {
  width: 22px; height: 22px; border-radius: 8px;
  background: linear-gradient(135deg, #ff6b3d, #d94a1f);
  display: grid; place-items: center; color: white; font-family: var(--a-serif); font-style: italic; font-size: 0.9rem;
}
.modern-nav {
  display: flex; align-items: center; gap: 4px;
  padding: 4px; background: rgba(255,255,255,0.7); backdrop-filter: blur(20px);
  border: 1px solid rgba(26,22,18,0.08); border-radius: 999px;
}
.modern-nav a {
  padding: 8px 14px; font-size: 0.82rem; font-weight: 500;
  color: #4a413a; text-decoration: none; border-radius: 999px;
}
.modern-nav a.is-on { background: #1a1612; color: white; }
.bt-grid {
  max-width: 1400px; margin: 0 auto; padding: 0 24px 1.5rem;
  display: grid; grid-template-columns: repeat(4, 1fr); grid-auto-rows: 200px; gap: 12px;
}
.bt-tile {
  border-radius: 20px; overflow: hidden; position: relative;
  background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  transition: transform 0.2s ease;
}
.bt-tile:hover { transform: translateY(-2px); }
.bt-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.bt-tile.wide { grid-column: span 2; }
.bt-tile.tall { grid-row: span 2; }
.bt-tile.data {
  background: #1a1612; color: #fff;
  padding: 24px; display: flex; flex-direction: column; justify-content: space-between;
}
.bt-tile.data .val {
  font-family: var(--a-serif); font-style: italic; font-weight: 400;
  font-size: 4rem; line-height: 0.9; letter-spacing: -0.03em;
}
.bt-tile.data .val em { color: #ff6b3d; }
.bt-tile.data .lbl {
  font-size: 0.68rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.6); font-weight: 600;
}
.bt-tile.title {
  background: linear-gradient(135deg, #ff8b4d 0%, #ff6b3d 50%, #d94a1f 100%);
  color: #fff; padding: 28px;
  display: flex; flex-direction: column; justify-content: space-between;
}
.bt-tile.title h1 {
  margin: 0; font-family: var(--a-serif); font-style: italic; font-weight: 400;
  font-size: clamp(2.4rem, 4vw, 3.4rem); line-height: 0.95; letter-spacing: -0.03em;
}
.bt-tile.title .k { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; opacity: 0.85; }
.bt-tile .caption {
  position: absolute; left: 14px; bottom: 14px;
  background: rgba(0,0,0,0.55); backdrop-filter: blur(10px);
  color: #fff; font-size: 0.72rem; font-weight: 600; padding: 5px 10px; border-radius: 8px;
  letter-spacing: 0.02em;
}
.wf-places--embedded {
  --pb-panel: #ffffff; --pb-border: rgba(26,22,18,0.08);
}
@media (max-width: 900px) { .bt-grid { grid-template-columns: repeat(2, 1fr); } .bt-tile.wide { grid-column: span 2; } }
`,
    body: `
  <div class="bt-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="dot">A</span>Almanac</a>
    ${navPill()}
  </div>
  <div class="bt-grid">
    <div class="bt-tile title wide tall">
      <span class="k">Volume · IV</span>
      <h1>Places<br/>you keep<br/><em>coming back to.</em></h1>
    </div>
    <div class="bt-tile"><img src="${P.balloons}" alt=""/><span class="caption">Cappadocia</span></div>
    <div class="bt-tile"><img src="${P.positano}" alt=""/><span class="caption">Positano</span></div>
    <div class="bt-tile data">
      <span class="lbl">Saved</span>
      <span class="val">248</span>
    </div>
    <div class="bt-tile"><img src="${P.kyoto}" alt=""/><span class="caption">Kyoto</span></div>
    <div class="bt-tile"><img src="${P.santoriniW}" alt=""/><span class="caption">Santorini</span></div>
    <div class="bt-tile data">
      <span class="lbl">Visited so far</span>
      <span class="val"><em>62</em></span>
    </div>
    <div class="bt-tile wide"><img src="${P.fjord}" alt=""/><span class="caption">Nærøyfjord</span></div>
  </div>
  ${atlasSlot()}`,
  },

  // 02 · Cinema poster — MUBI-style 100vh photo poster
  "cinema-poster": {
    css: `
body { background: #060606; color: #fff; font-family: "Inter", var(--a-sans); }
.cp-hero {
  position: relative; height: 100vh; min-height: 620px; overflow: hidden;
  background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 25%, transparent 55%, rgba(0,0,0,0.95) 100%), url("${P.balloons}") center/cover;
}
.cp-topbar {
  position: absolute; top: 0; left: 0; right: 0; z-index: 3;
  padding: 20px 24px; display: flex; justify-content: space-between; align-items: center;
  background: linear-gradient(180deg, rgba(0,0,0,0.4), transparent);
}
.cp-topbar .brand {
  display: flex; align-items: center; gap: 10px;
  font-family: "Inter", sans-serif; font-weight: 700; font-size: 0.85rem;
  letter-spacing: 0.08em; text-transform: uppercase;
}
.cp-topbar .brand .mark {
  width: 22px; height: 22px; border-radius: 6px;
  background: #ff5533; display: grid; place-items: center;
  font-family: var(--a-serif); font-style: italic; font-size: 0.9rem; color: white; letter-spacing: 0;
}
.cp-topbar nav { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); border-radius: 999px; }
.cp-topbar nav a {
  padding: 7px 13px; font-size: 0.78rem; font-weight: 500;
  color: rgba(255,255,255,0.7); text-decoration: none; border-radius: 999px;
}
.cp-topbar nav a.is-on { background: rgba(255,255,255,0.15); color: #fff; }
.cp-poster {
  position: absolute; left: 0; right: 0; bottom: 0; padding: 40px 24px 32px;
  max-width: 1400px; margin: 0 auto; z-index: 2;
}
.cp-tag {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.12);
  backdrop-filter: blur(10px);
  font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600;
}
.cp-tag::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #ff5533; }
.cp-poster h1 {
  margin: 20px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3.5rem, 9vw, 7.5rem); line-height: 0.92; letter-spacing: -0.04em;
  max-width: 14ch;
}
.cp-poster .meta {
  margin-top: 24px; display: flex; gap: 20px; flex-wrap: wrap;
  font-size: 0.82rem; color: rgba(255,255,255,0.75);
}
.cp-poster .meta span { display: flex; align-items: center; gap: 8px; }
.cp-poster .meta span::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: 0.5; }
.cp-poster .meta span:first-child::before { display: none; }
.cp-atlas-band {
  background: #0a0a0a; padding: 1rem 0 2rem;
}
.wf-places--embedded {
  --pb-bg: transparent; --pb-ink: #f5f5f5; --pb-muted: rgba(255,255,255,0.55);
  --pb-panel: rgba(255,255,255,0.04); --pb-border: rgba(255,255,255,0.08);
  --pb-accent: #ff5533; --pb-accent-ink: #fff;
}
.wf-places--almanac.wf-places--embedded .wf-places-bar { background: color-mix(in srgb, #0a0a0a 90%, transparent); }
`,
    body: `
  <section class="cp-hero">
    <div class="cp-topbar">
      <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
      ${navPill()}
    </div>
    <div class="cp-poster">
      <span class="cp-tag">Volume IV · Places</span>
      <h1>Where the atlas keeps pointing.</h1>
      <div class="meta">
        <span>Curated by you</span>
        <span>248 saved</span>
        <span>62 visited</span>
        <span>Updated today</span>
      </div>
    </div>
  </section>
  <div class="cp-atlas-band">${atlasSlot()}</div>`,
  },

  // 03 · Photo split — sticky 40% photo left, atlas on right
  "photo-split": {
    css: `
body { background: #f5f2ec; color: #1a1612; font-family: "Inter", var(--a-sans); }
.ps-shell { display: grid; grid-template-columns: 42% 1fr; min-height: calc(100vh - 100px); }
.ps-photo {
  position: sticky; top: 48px; align-self: start; height: calc(100vh - 48px);
  background: url("${P.positano}") center/cover; position: sticky;
  overflow: hidden;
}
.ps-photo::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.55) 100%);
}
.ps-photo-content {
  position: absolute; inset: 0; padding: 32px; display: flex; flex-direction: column; justify-content: space-between; color: #fff; z-index: 2;
}
.ps-photo-content .brand {
  font-family: "Inter", sans-serif; font-weight: 700; font-size: 0.85rem; letter-spacing: 0.08em; text-transform: uppercase;
  display: inline-flex; align-items: center; gap: 10px;
}
.ps-photo-content .brand .mark {
  width: 22px; height: 22px; border-radius: 6px; background: #fff; color: #ff5533;
  display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.9rem; letter-spacing: 0;
}
.ps-photo-content h1 {
  margin: 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 5vw, 4.5rem); line-height: 0.95; letter-spacing: -0.03em; max-width: 12ch;
}
.ps-photo-content .cap {
  display: flex; justify-content: space-between; align-items: end; gap: 1rem; font-size: 0.78rem;
}
.ps-photo-content .cap .tag {
  padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
  font-weight: 600; letter-spacing: 0.05em;
}
.ps-content { min-width: 0; padding: 32px 32px 0; background: #f5f2ec; }
.ps-content-top {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
}
.ps-content-top .kicker {
  font-size: 0.68rem; letter-spacing: 0.2em; text-transform: uppercase; color: #8a7d6f; font-weight: 700;
}
@media (max-width: 900px) {
  .ps-shell { grid-template-columns: 1fr; }
  .ps-photo { position: relative; top: 0; height: 50vh; }
}
`,
    body: `
  <div class="ps-shell">
    <aside class="ps-photo">
      <div class="ps-photo-content">
        <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
        <h1>The atlas, on the other side.</h1>
        <div class="cap">
          <span>Costa Amalfitana · 40.6°N 14.6°E</span>
          <span class="tag">Now saved · 248</span>
        </div>
      </div>
    </aside>
    <div class="ps-content">
      <div class="ps-content-top">
        <span class="kicker">Places · atlas</span>
        ${navPill()}
      </div>
      ${atlasSlot()}
    </div>
  </div>`,
  },

  // 04 · Marquee ribbon — auto-scrolling photo ribbon at top
  "marquee-ribbon": {
    css: `
body { background: #0f0d0b; color: #fff; font-family: "Inter", var(--a-sans); }
.mr-topbar {
  padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.mr-topbar .brand {
  display: flex; align-items: center; gap: 10px;
  font-weight: 700; font-size: 0.9rem; letter-spacing: -0.01em;
}
.mr-topbar .brand .mark {
  width: 24px; height: 24px; border-radius: 8px; background: #ff5533;
  display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.95rem;
}
.mr-topbar nav { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.05); border-radius: 999px; }
.mr-topbar nav a { padding: 7px 13px; font-size: 0.78rem; color: rgba(255,255,255,0.65); text-decoration: none; border-radius: 999px; font-weight: 500; }
.mr-topbar nav a.is-on { background: rgba(255,255,255,0.12); color: #fff; }
.mr-hero {
  padding: 60px 24px 40px; max-width: 1400px; margin: 0 auto; text-align: center;
}
.mr-hero .k { font-size: 0.72rem; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.55); font-weight: 700; }
.mr-hero h1 {
  margin: 16px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 8vw, 6.5rem); line-height: 0.95; letter-spacing: -0.03em;
  background: linear-gradient(180deg, #fff 0%, #ff9060 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
}
.mr-hero p { margin: 20px auto 0; max-width: 44ch; color: rgba(255,255,255,0.65); font-size: 1.05rem; line-height: 1.55; }
.mr-marquee {
  position: relative; overflow: hidden; margin: 40px 0 0;
  mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, black 8%, black 92%, transparent);
}
.mr-track {
  display: flex; gap: 16px; animation: mr-scroll 45s linear infinite;
  width: max-content;
}
@keyframes mr-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.mr-card {
  width: 260px; height: 340px; border-radius: 20px; overflow: hidden;
  flex-shrink: 0; position: relative; background: #1a1612;
}
.mr-card img { width: 100%; height: 100%; object-fit: cover; }
.mr-card .cap {
  position: absolute; left: 14px; bottom: 12px; right: 14px;
  color: #fff; font-family: var(--a-serif); font-style: italic; font-size: 1.25rem; font-weight: 400; letter-spacing: -0.01em;
}
.mr-card .cap small {
  display: block; font-family: "Inter", sans-serif; font-style: normal; font-size: 0.68rem;
  letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.7); font-weight: 600; margin-bottom: 4px;
}
.mr-atlas-band { padding: 40px 0 20px; background: #0f0d0b; }
.wf-places--embedded {
  --pb-bg: transparent; --pb-ink: #f5f5f5; --pb-muted: rgba(255,255,255,0.5);
  --pb-panel: rgba(255,255,255,0.04); --pb-border: rgba(255,255,255,0.08);
  --pb-accent: #ff6b3d; --pb-accent-ink: #fff;
}
.wf-places--almanac.wf-places--embedded .wf-places-bar { background: color-mix(in srgb, #0f0d0b 90%, transparent); }
`,
    body: `
  <div class="mr-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    ${navPill()}
  </div>
  <section class="mr-hero">
    <span class="k">Almanac · Places</span>
    <h1>Everywhere your<br/>saves point.</h1>
    <p>A living atlas of every destination you've collected — filtered, mapped, and marked off as you go.</p>
  </section>
  <div class="mr-marquee">
    <div class="mr-track">
      ${[
        ["Cappadocia", "Türkiye", P.balloons],
        ["Positano", "Italy", P.positano],
        ["Kyoto", "Japan", P.kyoto],
        ["Santorini", "Greece", P.santorini],
        ["Nærøyfjord", "Norway", P.fjord],
        ["Marrakech", "Morocco", P.marrakech],
        ["Patagonia", "Chile", P.patagonia],
        ["Reykjavík", "Iceland", P.iceland],
        ["Cappadocia", "Türkiye", P.balloons],
        ["Positano", "Italy", P.positano],
        ["Kyoto", "Japan", P.kyoto],
        ["Santorini", "Greece", P.santorini],
        ["Nærøyfjord", "Norway", P.fjord],
        ["Marrakech", "Morocco", P.marrakech],
        ["Patagonia", "Chile", P.patagonia],
        ["Reykjavík", "Iceland", P.iceland],
      ].map(([n, c, i]) => `<div class="mr-card"><img src="${i}" alt=""/><div class="cap"><small>${c}</small>${n}</div></div>`).join("")}
    </div>
  </div>
  <div class="mr-atlas-band">${atlasSlot()}</div>`,
  },

  // 05 · Glass on mesh — animated conic-gradient mesh + glass atlas panel
  "glass-mesh": {
    css: `
body {
  color: #1a1612; font-family: "Inter", var(--a-sans);
  background: #f0eae0;
  min-height: 100vh; overflow-x: hidden;
}
body::before {
  content: ""; position: fixed; inset: -20%; z-index: 0; pointer-events: none;
  background:
    radial-gradient(circle at 20% 30%, #ff9060 0%, transparent 30%),
    radial-gradient(circle at 80% 20%, #f7d066 0%, transparent 35%),
    radial-gradient(circle at 70% 80%, #d94a1f 0%, transparent 35%),
    radial-gradient(circle at 30% 90%, #5d6b8a 0%, transparent 30%),
    radial-gradient(circle at 50% 50%, #ffb388 0%, transparent 40%);
  filter: blur(80px) saturate(1.2);
  animation: gm-drift 24s ease-in-out infinite alternate;
}
@keyframes gm-drift {
  0%   { transform: translate(0, 0) rotate(0); }
  50%  { transform: translate(-4%, 3%) rotate(3deg); }
  100% { transform: translate(3%, -2%) rotate(-2deg); }
}
.gm-content { position: relative; z-index: 1; }
.gm-topbar {
  max-width: 1400px; margin: 0 auto; padding: 24px 28px; display: flex; justify-content: space-between; align-items: center;
}
.gm-topbar .brand {
  display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.9rem;
  padding: 8px 14px; background: rgba(255,255,255,0.55); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.6); border-radius: 999px;
}
.gm-topbar .brand .mark {
  width: 20px; height: 20px; border-radius: 6px; background: #d94a1f; color: white;
  display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.85rem;
}
.gm-topbar nav { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.55); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.6); border-radius: 999px; }
.gm-topbar nav a { padding: 7px 14px; font-size: 0.78rem; color: #4a413a; text-decoration: none; border-radius: 999px; font-weight: 500; }
.gm-topbar nav a.is-on { background: #1a1612; color: white; }
.gm-hero {
  max-width: 1400px; margin: 40px auto 24px; padding: 0 28px; text-align: center;
}
.gm-hero .k {
  display: inline-block; padding: 6px 14px; background: rgba(255,255,255,0.55); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.6); border-radius: 999px;
  font-size: 0.68rem; letter-spacing: 0.2em; text-transform: uppercase; color: #4a413a; font-weight: 700;
}
.gm-hero h1 {
  margin: 20px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 8vw, 6rem); line-height: 0.95; letter-spacing: -0.03em; color: #1a1612;
}
.gm-hero p { margin: 20px auto 0; max-width: 42ch; color: #4a413a; font-size: 1.02rem; line-height: 1.55; }
.gm-glass {
  max-width: 1300px; margin: 40px auto 60px; padding: 20px;
  background: rgba(255,255,255,0.6); backdrop-filter: blur(28px) saturate(1.2);
  border: 1px solid rgba(255,255,255,0.7); border-radius: 28px;
  box-shadow: 0 30px 80px -20px rgba(150,80,40,0.25), inset 0 1px 0 rgba(255,255,255,0.8);
}
.wf-places--embedded {
  --pb-bg: transparent;
  --pb-panel: rgba(255,255,255,0.75); --pb-border: rgba(255,255,255,0.55);
}
.wf-places--almanac.wf-places--embedded .wf-places-bar { background: color-mix(in srgb, #fff9f2 65%, transparent); backdrop-filter: blur(20px); }
`,
    body: `
  <div class="gm-content">
    <div class="gm-topbar">
      <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
      ${navPill()}
    </div>
    <section class="gm-hero">
      <span class="k">Places · atlas</span>
      <h1>The atlas, floating in warmth.</h1>
      <p>Filter, group, and browse everywhere your library has ever pointed — the panel below is fully live.</p>
    </section>
    <div class="gm-glass">${atlasSlot()}</div>
  </div>`,
  },

  // 06 · Product dashboard — Linear dark shell with sidebar + KPI + atlas widget
  "dashboard": {
    css: `
body { background: #0b0d10; color: #e8ebf0; font-family: "Inter", var(--a-sans); }
.db-shell { display: grid; grid-template-columns: 240px 1fr; min-height: calc(100vh - 100px); }
.db-side {
  padding: 20px 16px; border-right: 1px solid rgba(255,255,255,0.06);
  display: flex; flex-direction: column; gap: 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
}
.db-brand {
  display: flex; align-items: center; gap: 10px;
  font-weight: 700; font-size: 0.92rem; letter-spacing: -0.01em; color: #fff;
  padding: 0 6px;
}
.db-brand .mark {
  width: 26px; height: 26px; border-radius: 8px;
  background: linear-gradient(135deg, #7a5cff, #4a2ce8);
  display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 1rem; color: white;
}
.db-group { display: flex; flex-direction: column; gap: 2px; }
.db-group .lbl {
  padding: 0 8px 8px; font-size: 0.62rem; letter-spacing: 0.18em; text-transform: uppercase;
  color: rgba(255,255,255,0.35); font-weight: 700;
}
.db-group a {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 7px 10px; border-radius: 8px;
  color: rgba(255,255,255,0.7); text-decoration: none; font-size: 0.86rem; font-weight: 500;
}
.db-group a:hover { background: rgba(255,255,255,0.05); color: white; }
.db-group a.is-on { background: rgba(122,92,255,0.15); color: #b8a5ff; }
.db-group a .n {
  font-family: "JetBrains Mono", monospace; font-size: 0.7rem;
  padding: 2px 7px; background: rgba(255,255,255,0.06); border-radius: 5px;
  color: rgba(255,255,255,0.55);
}
.db-group a.is-on .n { background: rgba(122,92,255,0.2); color: #b8a5ff; }
.db-main { min-width: 0; padding: 20px 28px 40px; }
.db-topbar {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
}
.db-topbar h1 { margin: 0; font-family: "Inter"; font-weight: 700; font-size: 1.4rem; letter-spacing: -0.02em; color: #fff; }
.db-topbar h1 span { color: rgba(255,255,255,0.45); font-weight: 500; }
.db-topbar .pill {
  display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px;
  background: rgba(122,92,255,0.15); color: #b8a5ff; border-radius: 999px;
  font-size: 0.72rem; font-weight: 600;
}
.db-topbar .pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #b8a5ff; }
.db-kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
.db-kpi .card {
  padding: 16px 18px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
}
.db-kpi .card .lbl { font-size: 0.66rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.45); font-weight: 700; }
.db-kpi .card .val {
  margin-top: 8px; font-family: "Inter"; font-weight: 700; font-size: 2rem; letter-spacing: -0.03em; color: #fff;
}
.db-kpi .card .val small { font-size: 0.9rem; font-weight: 500; color: rgba(255,255,255,0.45); margin-left: 4px; letter-spacing: 0; }
.db-kpi .card .delta { margin-top: 4px; font-size: 0.75rem; color: #6ee7b7; font-weight: 600; }
.db-widget {
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px; overflow: hidden;
}
.db-widget-top {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.db-widget-top h2 { margin: 0; font-family: "Inter"; font-weight: 600; font-size: 0.95rem; letter-spacing: -0.01em; color: #fff; }
.db-widget-top .keys { font-family: "JetBrains Mono", monospace; font-size: 0.7rem; color: rgba(255,255,255,0.45); }
.db-widget-top .keys kbd {
  padding: 2px 6px; margin: 0 2px; border: 1px solid rgba(255,255,255,0.15);
  border-radius: 4px; background: rgba(255,255,255,0.03);
}
.wf-places--embedded {
  --pb-bg: transparent; --pb-ink: #e8ebf0; --pb-muted: rgba(255,255,255,0.5);
  --pb-panel: rgba(255,255,255,0.03); --pb-border: rgba(255,255,255,0.08);
  --pb-accent: #7a5cff; --pb-accent-ink: #fff;
}
.wf-places--almanac.wf-places--embedded .wf-places-bar { background: color-mix(in srgb, #0b0d10 90%, transparent); }
@media (max-width: 900px) {
  .db-shell { grid-template-columns: 1fr; }
  .db-side { border-right: 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
  .db-kpi { grid-template-columns: repeat(2, 1fr); }
}
`,
    body: `
  <div class="db-shell">
    <aside class="db-side">
      <div class="db-brand"><span class="mark">A</span>Almanac</div>
      <div class="db-group">
        <span class="lbl">Workspace</span>
        <a href="../../sites/02-almanac/index.html">Discover <span class="n">·</span></a>
        <a href="../../sites/02-almanac/posts.html">Posts <span class="n">86</span></a>
        <a class="is-on" href="#">Places <span class="n">248</span></a>
        <a href="../../sites/02-almanac/history.html">Journal <span class="n">62</span></a>
      </div>
      <div class="db-group">
        <span class="lbl">Views</span>
        <a href="#">All places <span class="n">248</span></a>
        <a href="#">Visited <span class="n">62</span></a>
        <a href="#">Dreamt of <span class="n">186</span></a>
        <a href="#">Routed <span class="n">14</span></a>
      </div>
      <div class="db-group">
        <span class="lbl">Actions</span>
        <a href="../../sites/02-almanac/add.html">Add a link</a>
      </div>
    </aside>
    <div class="db-main">
      <div class="db-topbar">
        <h1>Places <span>· atlas</span></h1>
        <span class="pill">Live · synced 2m ago</span>
      </div>
      <div class="db-kpi">
        <div class="card"><div class="lbl">Total saved</div><div class="val">248</div><div class="delta">+12 this week</div></div>
        <div class="card"><div class="lbl">Visited</div><div class="val">62 <small>/ 248</small></div><div class="delta">+3 this month</div></div>
        <div class="card"><div class="lbl">Continents</div><div class="val">6 <small>/ 7</small></div><div class="delta">Antarctica pending</div></div>
        <div class="card"><div class="lbl">On the route</div><div class="val">14</div><div class="delta" style="color:#f8b4b4">2 conflicts</div></div>
      </div>
      <div class="db-widget">
        <div class="db-widget-top">
          <h2>Atlas · everywhere</h2>
          <span class="keys">Filter · <kbd>F</kbd> · Jump <kbd>⌘</kbd><kbd>K</kbd></span>
        </div>
        ${atlasSlot()}
      </div>
    </div>
  </div>`,
  },

  // 07 · Diagonal split — clip-path diagonal photo panel
  "diagonal-split": {
    css: `
body { background: #f5f2ec; color: #1a1612; font-family: "Inter", var(--a-sans); }
.ds-hero {
  position: relative; height: 78vh; min-height: 560px; overflow: hidden;
  background: #1a1612;
}
.ds-photo {
  position: absolute; inset: 0;
  background: url("${P.fjord}") center/cover;
  clip-path: polygon(0 0, 62% 0, 42% 100%, 0 100%);
}
.ds-photo::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55));
}
.ds-topbar {
  position: relative; z-index: 3;
  max-width: 1400px; margin: 0 auto; padding: 24px 28px;
  display: flex; justify-content: space-between; align-items: center; color: white;
}
.ds-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.92rem; }
.ds-topbar .brand .mark { width: 22px; height: 22px; border-radius: 6px; background: #ff5533; display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.9rem; }
.ds-topbar nav { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); border-radius: 999px; }
.ds-topbar nav a { padding: 7px 13px; font-size: 0.78rem; color: rgba(255,255,255,0.75); text-decoration: none; border-radius: 999px; font-weight: 500; }
.ds-topbar nav a.is-on { background: rgba(255,255,255,0.15); color: white; }
.ds-copy {
  position: absolute; right: 0; top: 0; bottom: 0; width: 55%; z-index: 2;
  display: flex; flex-direction: column; justify-content: center; padding: 0 40px 0 6vw; color: white;
}
.ds-copy .k { font-size: 0.7rem; letter-spacing: 0.22em; text-transform: uppercase; color: #ff8b6b; font-weight: 700; }
.ds-copy h1 {
  margin: 16px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 7vw, 5.5rem); line-height: 0.95; letter-spacing: -0.03em; color: white;
}
.ds-copy p { margin: 24px 0 0; max-width: 42ch; color: rgba(255,255,255,0.75); font-size: 1.05rem; line-height: 1.55; }
.ds-copy .cta { margin-top: 32px; display: flex; gap: 12px; align-items: center; font-size: 0.85rem; color: rgba(255,255,255,0.7); }
.ds-copy .cta .btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px; background: #ff5533; color: white; border-radius: 999px;
  text-decoration: none; font-weight: 600;
}
.ds-atlas-band { padding: 32px 0 20px; background: #f5f2ec; }
@media (max-width: 900px) {
  .ds-photo { clip-path: none; }
  .ds-copy { position: relative; width: 100%; padding: 40px 24px; }
}
`,
    body: `
  <section class="ds-hero">
    <div class="ds-photo"></div>
    <div class="ds-topbar">
      <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
      ${navPill()}
    </div>
    <div class="ds-copy">
      <span class="k">Volume IV · Places</span>
      <h1>Two panes.<br/>One atlas.</h1>
      <p>A photo of somewhere you've saved on the left. Everywhere else, on the right.</p>
      <div class="cta">
        <a class="btn" href="#atlas">Open atlas ↓</a>
        <span>248 places · 62 visited</span>
      </div>
    </div>
  </section>
  <div class="ds-atlas-band" id="atlas">${atlasSlot()}</div>`,
  },

  // 08 · Mesh + type — Stripe-style gradient mesh + huge type
  "mesh-type": {
    css: `
body { background: #050507; color: #fff; font-family: "Space Grotesk", "Inter", sans-serif; overflow-x: hidden; }
.mt-hero {
  position: relative; min-height: 82vh; overflow: hidden;
  background: linear-gradient(180deg, #0a0810 0%, #150925 45%, #200a30 100%);
}
.mt-hero::before {
  content: ""; position: absolute; inset: -20%;
  background:
    radial-gradient(circle at 20% 20%, #ff3d9a 0%, transparent 25%),
    radial-gradient(circle at 80% 30%, #3d8bff 0%, transparent 30%),
    radial-gradient(circle at 50% 70%, #7a3dff 0%, transparent 35%),
    radial-gradient(circle at 15% 90%, #ff6b3d 0%, transparent 25%);
  filter: blur(60px); opacity: 0.85;
  animation: mt-slow 22s ease-in-out infinite alternate;
}
@keyframes mt-slow {
  0% { transform: translate(0, 0) rotate(0); }
  100% { transform: translate(-3%, 3%) rotate(6deg); }
}
.mt-hero::after {
  content: ""; position: absolute; inset: 0;
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.08 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  mix-blend-mode: overlay; opacity: 0.7;
}
.mt-topbar {
  position: relative; z-index: 3;
  max-width: 1400px; margin: 0 auto; padding: 24px 28px;
  display: flex; justify-content: space-between; align-items: center;
}
.mt-topbar .brand {
  display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.9rem;
  padding: 8px 14px; background: rgba(255,255,255,0.08); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.12); border-radius: 999px;
}
.mt-topbar .brand .mark {
  width: 20px; height: 20px; border-radius: 6px; background: white; color: #7a3dff;
  display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.85rem;
}
.mt-topbar nav { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.08); backdrop-filter: blur(20px); border-radius: 999px; }
.mt-topbar nav a { padding: 7px 13px; font-size: 0.78rem; color: rgba(255,255,255,0.75); text-decoration: none; border-radius: 999px; font-weight: 500; }
.mt-topbar nav a.is-on { background: rgba(255,255,255,0.15); color: white; }
.mt-copy {
  position: relative; z-index: 2;
  max-width: 1400px; margin: 60px auto 0; padding: 0 28px;
  text-align: center;
}
.mt-copy .k {
  display: inline-block; padding: 6px 14px;
  background: rgba(255,255,255,0.08); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.15); border-radius: 999px;
  font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.85); font-weight: 700;
}
.mt-copy h1 {
  margin: 24px auto 0; font-family: "Space Grotesk", sans-serif; font-weight: 500;
  font-size: clamp(3.5rem, 10vw, 8.5rem); line-height: 0.95; letter-spacing: -0.055em; color: white;
  max-width: 16ch;
}
.mt-copy h1 em {
  font-style: italic; font-family: var(--a-serif); font-weight: 300;
  background: linear-gradient(135deg, #ff9060, #ff3d9a 45%, #7a3dff);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.mt-copy p { margin: 28px auto 0; max-width: 44ch; color: rgba(255,255,255,0.75); font-size: 1.05rem; line-height: 1.55; }
.mt-atlas-band { padding: 40px 0 20px; background: #050507; }
.wf-places--embedded {
  --pb-bg: transparent; --pb-ink: #f5f5f5; --pb-muted: rgba(255,255,255,0.5);
  --pb-panel: rgba(255,255,255,0.04); --pb-border: rgba(255,255,255,0.08);
  --pb-accent: #ff3d9a; --pb-accent-ink: #fff;
}
.wf-places--almanac.wf-places--embedded .wf-places-bar { background: color-mix(in srgb, #050507 90%, transparent); }
`,
    body: `
  <section class="mt-hero">
    <div class="mt-topbar">
      <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
      ${navPill()}
    </div>
    <div class="mt-copy">
      <span class="k">Places · Volume IV</span>
      <h1>The atlas, in <em>vivid.</em></h1>
      <p>Everywhere your library points, arranged in one soft-lit register. Filters, search, and covers below — completely live.</p>
    </div>
  </section>
  <div class="mt-atlas-band">${atlasSlot()}</div>`,
  },

  // 09 · Category rail — Airbnb Icons style horizontal photo chips
  "category-rail": {
    css: `
body { background: #fff; color: #1a1612; font-family: "Inter", var(--a-sans); }
.cr-topbar {
  padding: 18px 24px; display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid #eee;
}
.cr-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.95rem; }
.cr-topbar .brand .mark {
  width: 24px; height: 24px; border-radius: 8px;
  background: linear-gradient(135deg, #ff5a5f, #d94a1f);
  display: grid; place-items: center; color: white; font-family: var(--a-serif); font-style: italic; font-size: 0.9rem;
}
.cr-topbar .search {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 18px; background: white; border: 1px solid #ddd; border-radius: 999px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  font-size: 0.85rem; color: #666; font-weight: 500;
  cursor: pointer;
}
.cr-topbar .search strong { color: #1a1612; font-weight: 600; }
.cr-topbar .search .sep { width: 1px; height: 20px; background: #ddd; }
.cr-topbar .search .btn {
  display: inline-grid; place-items: center;
  width: 28px; height: 28px; border-radius: 50%; background: #ff5a5f; color: white; margin: -4px -8px -4px 0;
}
.cr-topbar nav { display: flex; gap: 20px; font-size: 0.9rem; }
.cr-topbar nav a { color: #1a1612; text-decoration: none; font-weight: 500; padding-bottom: 4px; }
.cr-topbar nav a.is-on { border-bottom: 2px solid #1a1612; font-weight: 600; }
.cr-rail-wrap {
  border-bottom: 1px solid #eee;
}
.cr-rail {
  max-width: 1400px; margin: 0 auto; padding: 20px 24px;
  display: flex; gap: 24px; overflow-x: auto; scrollbar-width: none;
}
.cr-rail::-webkit-scrollbar { display: none; }
.cr-chip {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 8px;
  cursor: pointer; opacity: 0.65; transition: opacity 0.15s ease;
  padding-bottom: 8px; border-bottom: 2px solid transparent;
  min-width: 68px;
}
.cr-chip:hover { opacity: 1; }
.cr-chip.is-on { opacity: 1; border-bottom-color: #1a1612; }
.cr-chip .photo {
  width: 60px; height: 60px; border-radius: 14px; overflow: hidden;
  background: #eee;
}
.cr-chip .photo img { width: 100%; height: 100%; object-fit: cover; }
.cr-chip .label { font-size: 0.72rem; font-weight: 600; color: #4a413a; text-align: center; white-space: nowrap; }
.cr-atlas-wrap {
  max-width: 1400px; margin: 0 auto; padding: 12px 24px 0;
}
.wf-places--embedded {
  --pb-panel: #fff; --pb-border: #eee; --pb-accent: #ff5a5f;
}
@media (max-width: 720px) {
  .cr-topbar .search { display: none; }
}
`,
    body: `
  <div class="cr-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    <div class="search">
      <strong>Everywhere</strong>
      <span class="sep"></span>
      <span>Any type</span>
      <span class="sep"></span>
      <span>Any status</span>
      <span class="btn">🔍</span>
    </div>
    ${navPill()}
  </div>
  <div class="cr-rail-wrap">
    <div class="cr-rail">
      ${[
        ["All", P.balloons, true],
        ["Coastal", P.positano],
        ["Alpine", P.fjord],
        ["Desert", P.desert],
        ["Ancient", P.marrakech],
        ["Cities", P.tokyo],
        ["Islands", P.santoriniW],
        ["Villages", P.kyoto],
        ["Cliffs", P.cliffs],
        ["Bamboo", P.bamboo],
        ["Aurora", P.aurora],
        ["Camp", P.tent],
        ["Ride", P.cyclist],
        ["Paris", P.paris],
        ["NYC", P.ny],
      ].map(([n, i, on]) => `
        <div class="cr-chip${on ? " is-on" : ""}">
          <div class="photo"><img src="${i}" alt=""/></div>
          <span class="label">${n}</span>
        </div>`).join("")}
    </div>
  </div>
  <div class="cr-atlas-wrap">${atlasSlot()}</div>`,
  },

  // 10 · Spotlight sticky — sticky hero card left, atlas scrolls right
  "spotlight-sticky": {
    css: `
body { background: #f7f4ee; color: #1a1612; font-family: "Inter", var(--a-sans); }
.sl-topbar {
  max-width: 1400px; margin: 0 auto; padding: 20px 28px;
  display: flex; justify-content: space-between; align-items: center;
}
.sl-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.92rem; }
.sl-topbar .brand .mark {
  width: 24px; height: 24px; border-radius: 8px;
  background: linear-gradient(135deg, #ff8b4d, #d94a1f);
  display: grid; place-items: center; color: white; font-family: var(--a-serif); font-style: italic; font-size: 0.9rem;
}
.sl-shell {
  max-width: 1400px; margin: 0 auto; padding: 0 28px 40px;
  display: grid; grid-template-columns: 44% 1fr; gap: 32px;
}
.sl-photo {
  position: sticky; top: 68px; align-self: start; height: calc(100vh - 100px); max-height: 720px;
  border-radius: 24px; overflow: hidden; background: #1a1612;
  box-shadow: 0 30px 80px -30px rgba(0,0,0,0.35);
}
.sl-photo img { width: 100%; height: 100%; object-fit: cover; }
.sl-photo-overlay {
  position: absolute; inset: 0; z-index: 2;
  background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.75) 100%);
  padding: 28px; color: white;
  display: flex; flex-direction: column; justify-content: space-between;
}
.sl-photo-overlay .k {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 999px; background: rgba(255,255,255,0.15); backdrop-filter: blur(10px);
  font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700;
  align-self: flex-start;
}
.sl-photo-overlay .k::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #ffb96b; }
.sl-photo-overlay h1 {
  margin: 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(2.4rem, 4vw, 3.6rem); line-height: 0.95; letter-spacing: -0.03em;
}
.sl-photo-overlay .meta { font-size: 0.85rem; color: rgba(255,255,255,0.85); }
.sl-photo-overlay .meta strong { display: block; font-family: var(--a-serif); font-weight: 400; font-style: italic; font-size: 1.35rem; margin-bottom: 2px; }
.sl-photo-overlay .stats { display: flex; gap: 24px; margin-top: 20px; }
.sl-photo-overlay .stats > div .n { font-family: "Inter"; font-weight: 700; font-size: 1.6rem; letter-spacing: -0.02em; }
.sl-photo-overlay .stats > div .l { font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.65); font-weight: 600; margin-top: 2px; }
.sl-atlas {
  min-width: 0; background: white; border-radius: 24px;
  box-shadow: 0 20px 60px -30px rgba(0,0,0,0.2); overflow: hidden;
}
.sl-atlas-head {
  padding: 18px 22px; border-bottom: 1px solid #eee;
  display: flex; justify-content: space-between; align-items: center;
}
.sl-atlas-head h2 { margin: 0; font-family: "Inter"; font-weight: 700; font-size: 1.1rem; letter-spacing: -0.01em; }
.sl-atlas-head .keys { font-family: "JetBrains Mono", monospace; font-size: 0.72rem; color: #888; }
.wf-places--embedded { --pb-panel: #fff; --pb-border: #eee; }
@media (max-width: 900px) {
  .sl-shell { grid-template-columns: 1fr; }
  .sl-photo { position: relative; top: 0; height: 60vh; }
}
`,
    body: `
  <div class="sl-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    ${navPill()}
  </div>
  <div class="sl-shell">
    <aside class="sl-photo">
      <img src="${P.balloons}" alt=""/>
      <div class="sl-photo-overlay">
        <span class="k">Spotlight · this week</span>
        <div>
          <h1>Cappadocia, at first balloon.</h1>
          <p class="meta"><strong>Göreme</strong>38.6°N · 34.8°E · Türkiye</p>
          <div class="stats">
            <div><div class="n">17</div><div class="l">Places saved</div></div>
            <div><div class="n">4</div><div class="l">Visited</div></div>
            <div><div class="n">3</div><div class="l">On the route</div></div>
          </div>
        </div>
      </div>
    </aside>
    <div class="sl-atlas">
      <div class="sl-atlas-head">
        <h2>Places · atlas</h2>
        <span class="keys">248 places · Live</span>
      </div>
      ${atlasSlot()}
    </div>
  </div>`,
  },

  // 11 · Aurora ambient — slow aurora gradient wash + glass frame
  "aurora": {
    css: `
body {
  color: #f2f4f2; font-family: "Inter", var(--a-sans);
  background: #050810; min-height: 100vh; overflow-x: hidden;
}
body::before {
  content: ""; position: fixed; inset: -30%; z-index: 0;
  background:
    radial-gradient(ellipse 60% 40% at 20% 10%, #4dffb3 0%, transparent 55%),
    radial-gradient(ellipse 70% 40% at 80% 30%, #5da8ff 0%, transparent 55%),
    radial-gradient(ellipse 60% 40% at 40% 80%, #a55dff 0%, transparent 55%);
  filter: blur(100px) saturate(1.3); opacity: 0.6;
  animation: ar-drift 30s ease-in-out infinite alternate;
}
@keyframes ar-drift {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(4%, -3%) scale(1.1); }
}
.ar-content { position: relative; z-index: 1; }
.ar-topbar {
  max-width: 1400px; margin: 0 auto; padding: 24px 28px;
  display: flex; justify-content: space-between; align-items: center;
}
.ar-topbar .brand {
  display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.9rem;
  padding: 8px 14px; background: rgba(255,255,255,0.06); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 999px;
}
.ar-topbar .brand .mark {
  width: 20px; height: 20px; border-radius: 6px;
  background: linear-gradient(135deg, #4dffb3, #5da8ff);
  display: grid; place-items: center; color: #05080f; font-family: var(--a-serif); font-style: italic; font-size: 0.85rem;
}
.ar-topbar nav { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.06); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 999px; }
.ar-topbar nav a { padding: 7px 13px; font-size: 0.78rem; color: rgba(255,255,255,0.7); text-decoration: none; border-radius: 999px; font-weight: 500; }
.ar-topbar nav a.is-on { background: rgba(255,255,255,0.12); color: white; }
.ar-hero {
  max-width: 1400px; margin: 60px auto 32px; padding: 0 28px; text-align: center;
}
.ar-hero .k {
  display: inline-block; padding: 6px 14px;
  background: rgba(255,255,255,0.06); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 999px;
  font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.8); font-weight: 700;
}
.ar-hero h1 {
  margin: 22px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 8vw, 6.5rem); line-height: 0.95; letter-spacing: -0.03em;
  background: linear-gradient(135deg, #fff 0%, #a5d4ff 60%, #4dffb3 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.ar-hero p { margin: 22px auto 0; max-width: 44ch; color: rgba(255,255,255,0.7); font-size: 1.02rem; line-height: 1.55; }
.ar-frame {
  max-width: 1300px; margin: 40px auto 60px; padding: 20px;
  background: rgba(10,15,25,0.55); backdrop-filter: blur(24px) saturate(1.3);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 24px;
  box-shadow: 0 40px 100px -30px rgba(0,0,0,0.6);
}
.wf-places--embedded {
  --pb-bg: transparent; --pb-ink: #f2f4f2; --pb-muted: rgba(255,255,255,0.55);
  --pb-panel: rgba(255,255,255,0.04); --pb-border: rgba(255,255,255,0.08);
  --pb-accent: #4dffb3; --pb-accent-ink: #05080f;
}
.wf-places--almanac.wf-places--embedded .wf-places-bar { background: rgba(10,15,25,0.7); backdrop-filter: blur(20px); }
`,
    body: `
  <div class="ar-content">
    <div class="ar-topbar">
      <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
      ${navPill()}
    </div>
    <section class="ar-hero">
      <span class="k">Ambient · Places</span>
      <h1>The atlas, breathing.</h1>
      <p>Live filters and covers set on a slow aurora wash. The panel below is real — click any cover.</p>
    </section>
    <div class="ar-frame">${atlasSlot()}</div>
  </div>`,
  },

  // 12 · Photo mosaic hero
  "mosaic-hero": {
    css: `
body { background: #0f0d0b; color: #fff; font-family: "Inter", var(--a-sans); }
.mh-topbar {
  position: absolute; top: 100px; left: 0; right: 0; z-index: 3;
  max-width: 1400px; margin: 0 auto; padding: 20px 24px;
  display: flex; justify-content: space-between; align-items: center;
}
.mh-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.9rem; color: white; }
.mh-topbar .brand .mark { width: 22px; height: 22px; border-radius: 6px; background: white; color: #d94a1f; display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.9rem; }
.mh-topbar nav { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 999px; }
.mh-topbar nav a { padding: 7px 13px; font-size: 0.78rem; color: rgba(255,255,255,0.8); text-decoration: none; border-radius: 999px; font-weight: 500; }
.mh-topbar nav a.is-on { background: rgba(255,255,255,0.2); color: white; }
.mh-mosaic {
  position: relative; height: 76vh; min-height: 560px;
  display: grid; grid-template-columns: 2fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; padding: 8px;
  background: #0f0d0b;
}
.mh-tile { position: relative; overflow: hidden; border-radius: 16px; }
.mh-tile:nth-child(1) { grid-row: span 2; }
.mh-tile:nth-child(2) { grid-column: 2 / span 2; }
.mh-tile img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.6s ease; }
.mh-tile:hover img { transform: scale(1.05); }
.mh-tile .cap {
  position: absolute; left: 14px; bottom: 12px; right: 14px; color: white; z-index: 2;
  font-family: var(--a-serif); font-style: italic; font-weight: 400; font-size: 1.35rem; letter-spacing: -0.01em;
  text-shadow: 0 2px 20px rgba(0,0,0,0.5);
}
.mh-tile .cap small {
  display: block; font-family: "Inter"; font-style: normal; font-weight: 700;
  font-size: 0.66rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.85); margin-bottom: 4px;
}
.mh-tile::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%);
}
.mh-title-plate {
  position: absolute; z-index: 4; left: 50%; top: 40%; transform: translate(-50%, -50%);
  padding: 20px 40px; text-align: center; color: white;
  background: rgba(0,0,0,0.35); backdrop-filter: blur(20px) saturate(1.2);
  border: 1px solid rgba(255,255,255,0.15); border-radius: 24px;
  max-width: 90vw;
}
.mh-title-plate .k { font-size: 0.7rem; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(255,255,255,0.75); font-weight: 700; }
.mh-title-plate h1 {
  margin: 12px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(2.4rem, 6vw, 4.5rem); line-height: 0.95; letter-spacing: -0.03em;
}
.mh-atlas-band { padding: 32px 0 20px; background: #0f0d0b; }
.wf-places--embedded {
  --pb-bg: transparent; --pb-ink: #f5f5f5; --pb-muted: rgba(255,255,255,0.5);
  --pb-panel: rgba(255,255,255,0.04); --pb-border: rgba(255,255,255,0.08);
  --pb-accent: #ff6b3d; --pb-accent-ink: #fff;
}
.wf-places--almanac.wf-places--embedded .wf-places-bar { background: color-mix(in srgb, #0f0d0b 90%, transparent); }
`,
    body: `
  <div class="mh-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    ${navPill()}
  </div>
  <section class="mh-mosaic">
    <div class="mh-tile"><img src="${P.balloons}" alt=""/><div class="cap"><small>Cappadocia</small>Balloons at dawn</div></div>
    <div class="mh-tile"><img src="${P.fjord}" alt=""/><div class="cap"><small>Nærøyfjord</small>Blue silence</div></div>
    <div class="mh-tile"><img src="${P.positano}" alt=""/><div class="cap"><small>Positano</small>Cliff colors</div></div>
    <div class="mh-tile"><img src="${P.kyoto}" alt=""/><div class="cap"><small>Kyoto</small>Torii row</div></div>
    <div class="mh-tile"><img src="${P.santoriniW}" alt=""/><div class="cap"><small>Santorini</small>White + blue</div></div>
    <div class="mh-title-plate">
      <span class="k">Volume IV · Places</span>
      <h1>The atlas, in fragments.</h1>
    </div>
  </section>
  <div class="mh-atlas-band">${atlasSlot()}</div>`,
  },

  // 13 · Cinematic bleed — 100vh photo with layered lockup, dark atlas
  "cinematic-bleed": {
    css: `
body { background: #050505; color: #fff; font-family: "Inter", var(--a-sans); }
.cb-hero {
  position: relative; height: 100vh; min-height: 640px; overflow: hidden;
  background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 60%, rgba(5,5,5,0.98) 100%), url("${P.desert}") center/cover;
}
.cb-topbar {
  position: absolute; top: 0; left: 0; right: 0; z-index: 3;
  padding: 24px 28px; display: flex; justify-content: space-between; align-items: center;
}
.cb-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.9rem; color: white; }
.cb-topbar .brand .mark { width: 22px; height: 22px; border-radius: 6px; background: white; color: #d94a1f; display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.9rem; }
.cb-topbar nav { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.1); backdrop-filter: blur(20px); border-radius: 999px; }
.cb-topbar nav a { padding: 7px 13px; font-size: 0.78rem; color: rgba(255,255,255,0.75); text-decoration: none; border-radius: 999px; font-weight: 500; }
.cb-topbar nav a.is-on { background: rgba(255,255,255,0.2); color: white; }
.cb-lockup {
  position: absolute; z-index: 2; left: 0; right: 0; top: 50%; transform: translateY(-50%);
  max-width: 1400px; margin: 0 auto; padding: 0 28px;
}
.cb-lockup .k {
  display: inline-block; padding: 6px 14px;
  border: 1px solid rgba(255,255,255,0.3); border-radius: 999px;
  font-size: 0.68rem; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 700; color: white;
  backdrop-filter: blur(10px); background: rgba(255,255,255,0.06);
}
.cb-lockup h1 {
  margin: 22px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(4rem, 12vw, 10rem); line-height: 0.88; letter-spacing: -0.045em;
  max-width: 10ch; color: white;
}
.cb-lockup .bar {
  margin-top: 32px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap;
  font-size: 0.82rem; color: rgba(255,255,255,0.75);
}
.cb-lockup .bar .pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 999px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.15); font-weight: 600; color: white;
}
.cb-lockup .bar .pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #ff8b4d; }
.cb-scroll {
  position: absolute; z-index: 2; left: 50%; bottom: 40px; transform: translateX(-50%);
  font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.6); font-weight: 700;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  animation: cb-bounce 2.4s ease-in-out infinite;
}
@keyframes cb-bounce {
  0%,100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, 6px); }
}
.cb-scroll .line { width: 1px; height: 32px; background: rgba(255,255,255,0.5); }
.cb-atlas-band { padding: 40px 0 20px; background: #050505; }
.wf-places--embedded {
  --pb-bg: transparent; --pb-ink: #f5f5f5; --pb-muted: rgba(255,255,255,0.5);
  --pb-panel: rgba(255,255,255,0.03); --pb-border: rgba(255,255,255,0.08);
  --pb-accent: #ff8b4d; --pb-accent-ink: #fff;
}
.wf-places--almanac.wf-places--embedded .wf-places-bar { background: color-mix(in srgb, #050505 90%, transparent); }
`,
    body: `
  <section class="cb-hero">
    <div class="cb-topbar">
      <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
      ${navPill()}
    </div>
    <div class="cb-lockup">
      <span class="k">Volume IV · Places</span>
      <h1>Wander, filed.</h1>
      <div class="bar">
        <span class="pill">248 places saved</span>
        <span class="pill">62 visited</span>
        <span>Updated · today</span>
      </div>
    </div>
    <div class="cb-scroll">Scroll<span class="line"></span></div>
  </section>
  <div class="cb-atlas-band">${atlasSlot()}</div>`,
  },

  // 14 · KPI hero — Framer-style oversized metric cards
  "kpi-hero": {
    css: `
body { background: #f5f2ec; color: #1a1612; font-family: "Inter", var(--a-sans); }
.kh-topbar {
  max-width: 1400px; margin: 0 auto; padding: 20px 28px;
  display: flex; justify-content: space-between; align-items: center;
}
.kh-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.92rem; }
.kh-topbar .brand .mark { width: 24px; height: 24px; border-radius: 8px; background: #1a1612; color: white; display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.95rem; }
.kh-hero {
  max-width: 1400px; margin: 20px auto 24px; padding: 0 28px;
}
.kh-hero-top {
  display: grid; grid-template-columns: 1.4fr 1fr; gap: 32px; align-items: end; margin-bottom: 32px;
}
.kh-hero-top .k { font-size: 0.7rem; letter-spacing: 0.22em; text-transform: uppercase; color: #8a7d6f; font-weight: 700; }
.kh-hero-top h1 {
  margin: 12px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 7vw, 5.5rem); line-height: 0.95; letter-spacing: -0.03em;
}
.kh-hero-top p { margin: 0; color: #4a413a; font-size: 1.02rem; line-height: 1.55; max-width: 42ch; }
.kh-kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.kh-kpi .card {
  padding: 22px; background: white; border-radius: 20px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  position: relative; overflow: hidden;
  transition: transform 0.2s ease;
}
.kh-kpi .card:hover { transform: translateY(-2px); }
.kh-kpi .card .lbl { font-size: 0.66rem; letter-spacing: 0.16em; text-transform: uppercase; color: #8a7d6f; font-weight: 700; }
.kh-kpi .card .val {
  margin-top: 8px; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: 3.6rem; line-height: 0.9; letter-spacing: -0.03em; color: #1a1612;
}
.kh-kpi .card .val small { font-family: "Inter"; font-style: normal; font-weight: 500; font-size: 1rem; color: #8a7d6f; letter-spacing: 0; }
.kh-kpi .card .foot { margin-top: 14px; display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; color: #4a413a; }
.kh-kpi .card .foot .delta { color: #16a34a; font-weight: 600; }
.kh-kpi .card .foot .delta.warn { color: #d94a1f; }
.kh-kpi .card.hero {
  background: linear-gradient(135deg, #ff8b4d 0%, #d94a1f 100%);
  color: white; grid-column: span 2;
  padding: 22px 26px;
}
.kh-kpi .card.hero .lbl, .kh-kpi .card.hero .foot { color: rgba(255,255,255,0.75); }
.kh-kpi .card.hero .val { color: white; }
.kh-kpi .card.hero .val small { color: rgba(255,255,255,0.75); }
.kh-kpi .card.hero .foot .delta { color: white; }
.kh-kpi .card .spark {
  position: absolute; right: -10px; bottom: -10px; width: 120px; height: 60px; opacity: 0.3;
}
.kh-atlas {
  max-width: 1400px; margin: 32px auto 0; padding: 0 28px 20px;
}
.kh-atlas .frame {
  background: white; border-radius: 20px; overflow: hidden;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
}
.wf-places--embedded { --pb-panel: #fff; --pb-border: #eee; }
@media (max-width: 900px) {
  .kh-hero-top { grid-template-columns: 1fr; }
  .kh-kpi { grid-template-columns: repeat(2, 1fr); }
  .kh-kpi .card.hero { grid-column: span 2; }
}
`,
    body: `
  <div class="kh-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    ${navPill()}
  </div>
  <div class="kh-hero">
    <div class="kh-hero-top">
      <div>
        <span class="k">Places · atlas</span>
        <h1>Your library, by the numbers.</h1>
      </div>
      <p>Every save totalled, every visit tracked, every continent charted. Filter the full atlas below.</p>
    </div>
    <div class="kh-kpi">
      <div class="card hero">
        <div class="lbl">Places saved</div>
        <div class="val">248</div>
        <div class="foot"><span>All time</span><span class="delta">+12 this week</span></div>
      </div>
      <div class="card">
        <div class="lbl">Visited</div>
        <div class="val">62<small> / 248</small></div>
        <div class="foot"><span>25%</span><span class="delta">+3 mo</span></div>
      </div>
      <div class="card">
        <div class="lbl">Continents</div>
        <div class="val">6<small> / 7</small></div>
        <div class="foot"><span>Antarctica pending</span><span class="delta warn">—</span></div>
      </div>
      <div class="card">
        <div class="lbl">On the route</div>
        <div class="val">14</div>
        <div class="foot"><span>Next: Kyoto</span><span class="delta">May</span></div>
      </div>
      <div class="card">
        <div class="lbl">Saves this month</div>
        <div class="val">18</div>
        <div class="foot"><span>vs 12 last</span><span class="delta">+50%</span></div>
      </div>
      <div class="card">
        <div class="lbl">Most-saved city</div>
        <div class="val" style="font-size: 2rem">Kyoto</div>
        <div class="foot"><span>17 places</span><span class="delta">4 visited</span></div>
      </div>
    </div>
  </div>
  <div class="kh-atlas"><div class="frame">${atlasSlot()}</div></div>`,
  },

  // 15 · Marketing bold — Framer-style bold marketing page
  "marketing-bold": {
    css: `
body { background: #fefaf5; color: #1a1612; font-family: "Inter", var(--a-sans); overflow-x: hidden; }
.mb-topbar {
  max-width: 1400px; margin: 0 auto; padding: 20px 28px;
  display: flex; justify-content: space-between; align-items: center;
}
.mb-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 1rem; letter-spacing: -0.02em; }
.mb-topbar .brand .mark { width: 26px; height: 26px; border-radius: 8px; background: #1a1612; color: white; display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 1rem; }
.mb-hero {
  position: relative; max-width: 1400px; margin: 40px auto 32px; padding: 0 28px;
  text-align: center; overflow: hidden;
}
.mb-hero .badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 8px 6px 14px; border-radius: 999px; background: #1a1612; color: white;
  font-size: 0.78rem; font-weight: 600;
}
.mb-hero .badge .pill {
  background: #ff5533; color: white; padding: 3px 10px; border-radius: 999px;
  font-size: 0.66rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
}
.mb-hero h1 {
  margin: 24px auto 0; font-family: "Inter", sans-serif; font-weight: 800;
  font-size: clamp(3rem, 10vw, 8rem); line-height: 0.92; letter-spacing: -0.055em;
  max-width: 14ch;
}
.mb-hero h1 em {
  font-family: var(--a-serif); font-weight: 400; font-style: italic;
  background: linear-gradient(135deg, #ff8b4d 0%, #ff3d9a 60%, #7a3dff 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.mb-hero p { margin: 26px auto 0; max-width: 46ch; color: #4a413a; font-size: 1.1rem; line-height: 1.55; }
.mb-hero .ctas { margin-top: 30px; display: inline-flex; gap: 10px; }
.mb-hero .ctas a {
  padding: 12px 24px; border-radius: 999px; font-weight: 600; text-decoration: none; font-size: 0.9rem;
}
.mb-hero .ctas .primary { background: #1a1612; color: white; }
.mb-hero .ctas .ghost { background: rgba(26,22,18,0.06); color: #1a1612; }
.mb-hero .float {
  position: absolute; width: 160px; height: 160px; border-radius: 24px; overflow: hidden;
  box-shadow: 0 20px 60px -20px rgba(0,0,0,0.25);
  animation: mb-float 6s ease-in-out infinite alternate;
}
.mb-hero .float img { width: 100%; height: 100%; object-fit: cover; }
.mb-hero .float.f1 { left: -20px; top: 40px; transform: rotate(-8deg); }
.mb-hero .float.f2 { right: -20px; top: 80px; transform: rotate(6deg); animation-delay: 1s; }
.mb-hero .float.f3 { left: 10%; bottom: -60px; transform: rotate(4deg); animation-delay: 2s; }
.mb-hero .float.f4 { right: 12%; bottom: -40px; transform: rotate(-5deg); animation-delay: 3s; }
@keyframes mb-float {
  0% { transform: translateY(0) rotate(var(--r, 0deg)); }
  100% { transform: translateY(-12px) rotate(var(--r, 0deg)); }
}
.mb-atlas {
  max-width: 1400px; margin: 32px auto 0; padding: 0 28px 20px;
}
.mb-atlas .frame {
  background: white; border-radius: 24px; overflow: hidden;
  box-shadow: 0 20px 60px -30px rgba(0,0,0,0.15);
}
.wf-places--embedded { --pb-panel: #fff; --pb-border: #eee; }
@media (max-width: 720px) { .mb-hero .float { display: none; } }
`,
    body: `
  <div class="mb-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    ${navPill()}
  </div>
  <section class="mb-hero">
    <div class="float f1" style="--r:-8deg"><img src="${P.balloons}" alt=""/></div>
    <div class="float f2" style="--r:6deg"><img src="${P.positano}" alt=""/></div>
    <div class="float f3" style="--r:4deg"><img src="${P.kyoto}" alt=""/></div>
    <div class="float f4" style="--r:-5deg"><img src="${P.fjord}" alt=""/></div>
    <div class="badge"><span>Almanac · new</span><span class="pill">Places</span></div>
    <h1>Save it once.<br/><em>Find it forever.</em></h1>
    <p>Paste any travel link. We turn saves into a live atlas — every place tagged, mapped, and one filter away.</p>
    <div class="ctas">
      <a class="primary" href="../../sites/02-almanac/add.html">Add a link →</a>
      <a class="ghost" href="#atlas">Explore atlas</a>
    </div>
  </section>
  <div class="mb-atlas" id="atlas"><div class="frame">${atlasSlot()}</div></div>`,
  },

  // 16 · Card stack — rotated stack of photo cards
  "card-stack": {
    css: `
body { background: #f4f1eb; color: #1a1612; font-family: "Inter", var(--a-sans); overflow-x: hidden; }
.cs-topbar {
  max-width: 1400px; margin: 0 auto; padding: 20px 28px;
  display: flex; justify-content: space-between; align-items: center;
}
.cs-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.92rem; }
.cs-topbar .brand .mark { width: 24px; height: 24px; border-radius: 8px; background: #ff5533; color: white; display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.95rem; }
.cs-shell {
  max-width: 1400px; margin: 24px auto 0; padding: 0 28px;
  display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 40px; align-items: center;
  min-height: 70vh;
}
.cs-copy .k { font-size: 0.7rem; letter-spacing: 0.22em; text-transform: uppercase; color: #8a7d6f; font-weight: 700; }
.cs-copy h1 {
  margin: 16px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 6vw, 5rem); line-height: 0.95; letter-spacing: -0.03em;
}
.cs-copy p { margin: 24px 0 0; max-width: 44ch; color: #4a413a; font-size: 1.05rem; line-height: 1.55; }
.cs-copy .cta {
  margin-top: 32px; display: inline-flex; align-items: center; gap: 10px;
  padding: 12px 22px; background: #1a1612; color: white; border-radius: 999px;
  text-decoration: none; font-weight: 600; font-size: 0.9rem;
}
.cs-stack {
  position: relative; height: 500px;
}
.cs-card {
  position: absolute; width: 260px; height: 340px; border-radius: 22px; overflow: hidden;
  box-shadow: 0 30px 60px -20px rgba(0,0,0,0.35);
  transition: transform 0.3s ease;
}
.cs-card img { width: 100%; height: 100%; object-fit: cover; }
.cs-card .cap {
  position: absolute; left: 14px; bottom: 12px; right: 14px; color: white;
  font-family: var(--a-serif); font-style: italic; font-size: 1.2rem;
  text-shadow: 0 2px 12px rgba(0,0,0,0.5);
}
.cs-card .cap small {
  display: block; font-family: "Inter"; font-style: normal; font-weight: 700;
  font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; color: rgba(255,255,255,0.8); margin-bottom: 4px;
}
.cs-card::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.6) 100%);
}
.cs-card.c1 { left: 0; top: 40px; transform: rotate(-8deg); z-index: 1; }
.cs-card.c2 { left: 120px; top: 20px; transform: rotate(4deg); z-index: 2; }
.cs-card.c3 { left: 240px; top: 80px; transform: rotate(-3deg); z-index: 3; }
.cs-card.c4 { right: 40px; top: 0; transform: rotate(9deg); z-index: 4; }
.cs-stack:hover .cs-card.c1 { transform: rotate(-12deg) translate(-10px, -5px); }
.cs-stack:hover .cs-card.c2 { transform: rotate(2deg) translate(-5px, -10px); }
.cs-stack:hover .cs-card.c3 { transform: rotate(-1deg) translate(5px, -5px); }
.cs-stack:hover .cs-card.c4 { transform: rotate(12deg) translate(10px, -8px); }
.cs-atlas {
  max-width: 1400px; margin: 40px auto 0; padding: 0 28px 20px;
}
.cs-atlas .frame {
  background: white; border-radius: 20px; overflow: hidden;
  box-shadow: 0 20px 60px -30px rgba(0,0,0,0.15);
}
.wf-places--embedded { --pb-panel: #fff; --pb-border: #eee; }
@media (max-width: 900px) {
  .cs-shell { grid-template-columns: 1fr; }
  .cs-stack { height: 400px; }
  .cs-card { width: 200px; height: 260px; }
}
`,
    body: `
  <div class="cs-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    ${navPill()}
  </div>
  <div class="cs-shell">
    <div class="cs-copy">
      <span class="k">Places · atlas</span>
      <h1>Every save, in one deck.</h1>
      <p>Your reels and links become a stack of places worth returning to. Fan them out below.</p>
      <a class="cta" href="#atlas">Fan the stack ↓</a>
    </div>
    <div class="cs-stack">
      <div class="cs-card c1"><img src="${P.marrakech}" alt=""/><div class="cap"><small>Marrakech</small>Riad row</div></div>
      <div class="cs-card c2"><img src="${P.cliffs}" alt=""/><div class="cap"><small>Amalfi</small>Coast cliffs</div></div>
      <div class="cs-card c3"><img src="${P.bamboo}" alt=""/><div class="cap"><small>Arashiyama</small>Bamboo</div></div>
      <div class="cs-card c4"><img src="${P.balloonsP}" alt=""/><div class="cap"><small>Göreme</small>Balloons</div></div>
    </div>
  </div>
  <div class="cs-atlas" id="atlas"><div class="frame">${atlasSlot()}</div></div>`,
  },

  // 17 · Rich editorial — modern editorial with big imagery + precise type
  "rich-editorial": {
    css: `
body { background: #faf7f1; color: #1a1612; font-family: "Inter", var(--a-sans); }
.re-topbar {
  max-width: 1400px; margin: 0 auto; padding: 20px 28px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(26,22,18,0.08);
}
.re-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.95rem; }
.re-topbar .brand .mark { width: 24px; height: 24px; border-radius: 6px; background: #1a1612; color: white; display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.95rem; }
.re-hero {
  max-width: 1400px; margin: 40px auto 32px; padding: 0 28px;
  display: grid; grid-template-columns: 1fr 1.3fr; gap: 48px; align-items: end;
}
.re-copy .k { font-size: 0.68rem; letter-spacing: 0.24em; text-transform: uppercase; color: #ff5533; font-weight: 700; }
.re-copy h1 {
  margin: 16px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 5.5vw, 4.6rem); line-height: 0.95; letter-spacing: -0.03em;
}
.re-copy .byline {
  margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(26,22,18,0.15);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.78rem; color: #4a413a; font-weight: 500;
}
.re-copy .byline strong { color: #1a1612; font-weight: 600; }
.re-photo {
  position: relative; border-radius: 20px; overflow: hidden; aspect-ratio: 4 / 3;
  box-shadow: 0 30px 80px -30px rgba(0,0,0,0.35);
}
.re-photo img { width: 100%; height: 100%; object-fit: cover; }
.re-photo .cap {
  position: absolute; left: 16px; bottom: 14px;
  padding: 6px 12px; background: rgba(0,0,0,0.55); backdrop-filter: blur(10px);
  color: white; border-radius: 8px; font-size: 0.72rem; font-weight: 600;
}
.re-deck {
  max-width: 1400px; margin: 0 auto; padding: 24px 28px;
  border-block: 1px solid rgba(26,22,18,0.08);
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 32px;
}
.re-deck p { margin: 0; font-family: var(--a-serif); font-size: 1.05rem; line-height: 1.65; color: #2a2118; }
.re-deck p:first-child::first-letter {
  float: left; font-family: var(--a-serif); font-weight: 400; font-style: italic;
  font-size: 4rem; line-height: 0.85; margin: 4px 10px 0 0; color: #ff5533;
}
.re-atlas {
  max-width: 1400px; margin: 32px auto 0; padding: 0 28px 20px;
}
.re-atlas .frame {
  background: white; border-radius: 20px; overflow: hidden;
  box-shadow: 0 20px 60px -30px rgba(0,0,0,0.12);
}
.wf-places--embedded { --pb-panel: #fff; --pb-border: #eee; }
@media (max-width: 900px) {
  .re-hero { grid-template-columns: 1fr; }
  .re-deck { grid-template-columns: 1fr; }
}
`,
    body: `
  <div class="re-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    ${navPill()}
  </div>
  <section class="re-hero">
    <div class="re-copy">
      <span class="k">Volume IV · Places</span>
      <h1>An atlas of everywhere you've saved for later.</h1>
      <div class="byline"><span>By <strong>your library</strong></span><span>248 places · 62 visited</span></div>
    </div>
    <figure class="re-photo">
      <img src="${P.balloons}" alt=""/>
      <span class="cap">Cappadocia · Türkiye · 04:52</span>
    </figure>
  </section>
  <section class="re-deck">
    <p>Every reel you save leaves a pin behind. This is where they gather — filed by region, marked when you've been, kept when you haven't.</p>
    <p>The atlas is intentionally flat. Continents, cities, and single cafés share the same visual weight. Distance doesn't decide importance; you do.</p>
    <p>Filter by mood, by season, by whether you've been. The panel below is live — pick any cover to open the place.</p>
  </section>
  <div class="re-atlas"><div class="frame">${atlasSlot()}</div></div>`,
  },

  // 18 · Vercel dark — pure black + vibrant gradient glow, mono type
  "vercel-dark": {
    css: `
body {
  background: #000; color: #fafafa; font-family: "Inter", var(--a-sans); overflow-x: hidden;
}
.vd-glow {
  position: absolute; top: 0; left: 0; right: 0; height: 700px; pointer-events: none; overflow: hidden;
}
.vd-glow::before {
  content: ""; position: absolute; top: -300px; left: 50%; transform: translateX(-50%);
  width: 900px; height: 900px; border-radius: 50%;
  background: radial-gradient(circle, #a855f7 0%, transparent 70%);
  filter: blur(80px); opacity: 0.45;
}
.vd-glow::after {
  content: ""; position: absolute; top: -100px; right: -100px;
  width: 500px; height: 500px; border-radius: 50%;
  background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
  filter: blur(70px); opacity: 0.4;
}
.vd-topbar {
  position: relative; z-index: 3;
  max-width: 1400px; margin: 0 auto; padding: 20px 28px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.vd-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.9rem; letter-spacing: -0.01em; }
.vd-topbar .brand .mark {
  width: 22px; height: 22px; border-radius: 6px;
  background: linear-gradient(135deg, #a855f7, #06b6d4);
  display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.9rem; color: white;
}
.vd-topbar nav { display: flex; gap: 4px; padding: 3px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; }
.vd-topbar nav a { padding: 6px 12px; font-size: 0.78rem; color: rgba(255,255,255,0.6); text-decoration: none; border-radius: 999px; font-weight: 500; }
.vd-topbar nav a.is-on { background: rgba(255,255,255,0.1); color: #fff; }
.vd-hero {
  position: relative; z-index: 2;
  max-width: 1200px; margin: 80px auto 40px; padding: 0 28px; text-align: center;
}
.vd-hero .badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 5px 12px 5px 5px; border-radius: 999px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  font-size: 0.76rem; color: rgba(255,255,255,0.75); font-weight: 500;
}
.vd-hero .badge .pill {
  background: linear-gradient(135deg, #a855f7, #06b6d4); color: white;
  padding: 3px 10px; border-radius: 999px; font-size: 0.68rem; font-weight: 700;
}
.vd-hero h1 {
  margin: 24px auto 0; font-family: "Inter"; font-weight: 700;
  font-size: clamp(3rem, 8vw, 6rem); line-height: 1.02; letter-spacing: -0.045em;
  background: linear-gradient(180deg, #fff 30%, rgba(255,255,255,0.55) 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  max-width: 16ch;
}
.vd-hero p { margin: 24px auto 0; max-width: 46ch; color: rgba(255,255,255,0.55); font-size: 1.02rem; line-height: 1.55; }
.vd-hero .ctas { margin-top: 30px; display: inline-flex; gap: 10px; }
.vd-hero .ctas a {
  padding: 10px 20px; border-radius: 999px; font-size: 0.85rem; font-weight: 600; text-decoration: none;
}
.vd-hero .ctas .primary {
  background: white; color: #000;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.1);
}
.vd-hero .ctas .ghost { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.85); border: 1px solid rgba(255,255,255,0.1); }
.vd-frame {
  position: relative; z-index: 2;
  max-width: 1400px; margin: 40px auto 40px; padding: 0 28px;
}
.vd-frame .inner {
  background: rgba(10,10,12,0.6); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden;
  box-shadow: 0 40px 100px -20px rgba(168,85,247,0.15);
}
.wf-places--embedded {
  --pb-bg: transparent; --pb-ink: #fafafa; --pb-muted: rgba(255,255,255,0.55);
  --pb-panel: rgba(255,255,255,0.04); --pb-border: rgba(255,255,255,0.1);
  --pb-accent: #a855f7; --pb-accent-ink: #fff;
}
.wf-places--almanac.wf-places--embedded .wf-places-bar { background: color-mix(in srgb, #000 88%, transparent); }
`,
    body: `
  <div class="vd-glow"></div>
  <div class="vd-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    ${navPill()}
  </div>
  <section class="vd-hero">
    <div class="badge"><span class="pill">Live</span><span>248 places · synced from your library</span></div>
    <h1>The travel atlas, engineered.</h1>
    <p>A precise, filterable index of every destination you've saved. Fast, dark, and one keystroke away.</p>
    <div class="ctas">
      <a class="primary" href="#atlas">Open atlas →</a>
      <a class="ghost" href="../../sites/02-almanac/add.html">Add a link</a>
    </div>
  </section>
  <div class="vd-frame" id="atlas"><div class="inner">${atlasSlot()}</div></div>`,
  },

  // 19 · Poster wall — full-viewport photo grid backdrop
  "poster-wall": {
    css: `
body { background: #060606; color: #fff; font-family: "Inter", var(--a-sans); }
.pw-wall {
  position: fixed; inset: 100px 0 0; z-index: 0;
  display: grid; grid-template-columns: repeat(6, 1fr); grid-template-rows: repeat(3, 1fr);
  gap: 4px; padding: 4px;
}
.pw-wall .tile { position: relative; overflow: hidden; }
.pw-wall .tile img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(30%) brightness(0.75); transition: filter 0.4s ease; }
.pw-wall .tile:hover img { filter: none; }
.pw-wall::after {
  content: ""; position: absolute; inset: 0;
  background:
    linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 30%, transparent 55%, rgba(0,0,0,0.95) 100%);
  pointer-events: none;
}
.pw-topbar {
  position: relative; z-index: 5;
  padding: 20px 28px; display: flex; justify-content: space-between; align-items: center;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.pw-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.9rem; }
.pw-topbar .brand .mark { width: 22px; height: 22px; border-radius: 6px; background: #ff5533; color: white; display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.9rem; }
.pw-topbar nav { display: flex; gap: 4px; padding: 4px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; }
.pw-topbar nav a { padding: 7px 13px; font-size: 0.78rem; color: rgba(255,255,255,0.7); text-decoration: none; border-radius: 999px; font-weight: 500; }
.pw-topbar nav a.is-on { background: rgba(255,255,255,0.15); color: white; }
.pw-hero {
  position: relative; z-index: 2;
  max-width: 1400px; margin: 0 auto; padding: 60px 28px 40px;
  text-align: center;
}
.pw-hero .k {
  display: inline-block; padding: 6px 14px;
  background: rgba(255,255,255,0.08); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.15); border-radius: 999px;
  font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255,255,255,0.85); font-weight: 700;
}
.pw-hero h1 {
  margin: 20px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 9vw, 7rem); line-height: 0.95; letter-spacing: -0.04em;
}
.pw-atlas-band {
  position: relative; z-index: 2;
  max-width: 1400px; margin: 20px auto 40px; padding: 0 28px;
}
.pw-atlas-band .inner {
  background: rgba(10,10,10,0.75); backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 20px; overflow: hidden;
}
.wf-places--embedded {
  --pb-bg: transparent; --pb-ink: #f5f5f5; --pb-muted: rgba(255,255,255,0.55);
  --pb-panel: rgba(255,255,255,0.04); --pb-border: rgba(255,255,255,0.08);
  --pb-accent: #ff5533; --pb-accent-ink: #fff;
}
.wf-places--almanac.wf-places--embedded .wf-places-bar { background: rgba(10,10,10,0.85); backdrop-filter: blur(20px); }
`,
    body: `
  <div class="pw-wall" aria-hidden="true">
    <div class="tile"><img src="${P.balloons}" alt=""/></div>
    <div class="tile"><img src="${P.positano}" alt=""/></div>
    <div class="tile"><img src="${P.fjord}" alt=""/></div>
    <div class="tile"><img src="${P.kyoto}" alt=""/></div>
    <div class="tile"><img src="${P.santoriniW}" alt=""/></div>
    <div class="tile"><img src="${P.desert}" alt=""/></div>
    <div class="tile"><img src="${P.marrakech}" alt=""/></div>
    <div class="tile"><img src="${P.bamboo}" alt=""/></div>
    <div class="tile"><img src="${P.iceland}" alt=""/></div>
    <div class="tile"><img src="${P.patagonia}" alt=""/></div>
    <div class="tile"><img src="${P.aurora}" alt=""/></div>
    <div class="tile"><img src="${P.tokyo}" alt=""/></div>
    <div class="tile"><img src="${P.paris}" alt=""/></div>
    <div class="tile"><img src="${P.ny}" alt=""/></div>
    <div class="tile"><img src="${P.cliffs}" alt=""/></div>
    <div class="tile"><img src="${P.tent}" alt=""/></div>
    <div class="tile"><img src="${P.cyclist}" alt=""/></div>
    <div class="tile"><img src="${P.sunrise}" alt=""/></div>
  </div>
  <div class="pw-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    ${navPill()}
  </div>
  <section class="pw-hero">
    <span class="k">Places · atlas</span>
    <h1>Every save, on the wall.</h1>
  </section>
  <div class="pw-atlas-band"><div class="inner">${atlasSlot()}</div></div>`,
  },

  // 20 · Story mobile — Instagram story-style vertical layout with dock
  "story-mobile": {
    css: `
body {
  background: #f3f0ea; color: #1a1612; font-family: "Inter", var(--a-sans);
  padding-bottom: 88px;
}
.sm-topbar {
  max-width: 1400px; margin: 0 auto; padding: 16px 24px;
  display: flex; justify-content: space-between; align-items: center;
}
.sm-topbar .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 0.9rem; }
.sm-topbar .brand .mark { width: 22px; height: 22px; border-radius: 8px; background: linear-gradient(135deg, #ff8b4d, #d94a1f); color: white; display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.85rem; }
.sm-frame {
  max-width: 480px; margin: 0 auto; padding: 0 16px;
}
.sm-hero {
  position: relative; border-radius: 28px; overflow: hidden; aspect-ratio: 9 / 14;
  background: #1a1612;
  box-shadow: 0 30px 80px -30px rgba(0,0,0,0.35);
}
.sm-hero img { width: 100%; height: 100%; object-fit: cover; }
.sm-hero .rings {
  position: absolute; top: 14px; left: 14px; right: 14px;
  display: flex; gap: 4px;
}
.sm-hero .rings i {
  flex: 1; height: 3px; border-radius: 999px; background: rgba(255,255,255,0.3);
}
.sm-hero .rings i.on { background: white; }
.sm-hero .rings i.partial { background: linear-gradient(90deg, white 40%, rgba(255,255,255,0.3) 40%); }
.sm-hero .who {
  position: absolute; top: 28px; left: 14px; right: 14px;
  display: flex; align-items: center; gap: 10px; color: white; font-size: 0.82rem; font-weight: 600;
}
.sm-hero .who .avatar {
  width: 32px; height: 32px; border-radius: 50%; border: 2px solid white;
  background: linear-gradient(135deg, #ff8b4d, #d94a1f);
  display: grid; place-items: center; font-family: var(--a-serif); font-style: italic; font-size: 0.85rem;
}
.sm-hero .who .time { margin-left: auto; opacity: 0.7; font-weight: 500; font-size: 0.78rem; }
.sm-hero .cap {
  position: absolute; left: 20px; right: 20px; bottom: 24px; color: white; z-index: 2;
}
.sm-hero .cap .k { font-size: 0.7rem; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 700; opacity: 0.9; }
.sm-hero .cap h1 {
  margin: 12px 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: 2.4rem; line-height: 0.95; letter-spacing: -0.02em;
}
.sm-hero .cap .stats { margin-top: 16px; display: flex; gap: 20px; font-size: 0.75rem; }
.sm-hero .cap .stats > div { display: flex; flex-direction: column; gap: 2px; }
.sm-hero .cap .stats > div .n { font-family: "Inter"; font-weight: 700; font-size: 1.15rem; }
.sm-hero .cap .stats > div .l { opacity: 0.75; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.6rem; font-weight: 600; }
.sm-hero::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 25%, transparent 50%, rgba(0,0,0,0.75) 100%);
}
.sm-atlas {
  margin-top: 20px;
  background: white; border-radius: 24px; overflow: hidden;
  box-shadow: 0 20px 60px -30px rgba(0,0,0,0.15);
}
.sm-dock {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 100;
  display: flex; gap: 4px; padding: 6px;
  background: rgba(26,22,18,0.92); backdrop-filter: blur(16px);
  border-radius: 999px;
  box-shadow: 0 16px 40px -12px rgba(0,0,0,0.3);
}
.sm-dock a {
  color: rgba(255,255,255,0.7); text-decoration: none; font-size: 0.8rem; font-weight: 500;
  padding: 9px 14px; border-radius: 999px;
}
.sm-dock a.is-on {
  background: linear-gradient(135deg, #ff8b4d, #d94a1f); color: white; font-weight: 600;
  box-shadow: 0 4px 12px -2px rgba(217,74,31,0.5);
}
.wf-places--embedded { --pb-panel: #fff; --pb-border: #eee; }
`,
    body: `
  <div class="sm-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html"><span class="mark">A</span>Almanac</a>
    <span style="font-size:0.72rem;letter-spacing:0.18em;text-transform:uppercase;color:#8a7d6f;font-weight:700">Vertical</span>
  </div>
  <div class="sm-frame">
    <section class="sm-hero">
      <img src="${P.balloonsP}" alt=""/>
      <div class="rings">
        <i class="on"></i><i class="on"></i><i class="partial"></i><i></i><i></i>
      </div>
      <div class="who">
        <span class="avatar">A</span>
        <span>almanac_atlas</span>
        <span class="time">now</span>
      </div>
      <div class="cap">
        <span class="k">Places · story</span>
        <h1>Your atlas,<br/>on a phone.</h1>
        <div class="stats">
          <div><span class="n">248</span><span class="l">Saved</span></div>
          <div><span class="n">62</span><span class="l">Visited</span></div>
          <div><span class="n">6</span><span class="l">Continents</span></div>
        </div>
      </div>
    </section>
    <div class="sm-atlas">${atlasSlot()}</div>
  </div>
  <nav class="sm-dock">
    <a href="../../sites/02-almanac/index.html">Home</a>
    <a href="../../sites/02-almanac/posts.html">Posts</a>
    <a class="is-on" href="#">Places</a>
    <a href="../../sites/02-almanac/history.html">Journal</a>
    <a href="../../sites/02-almanac/add.html">Add</a>
  </nav>`,
  },
};

// -----------------------------------------------------------------------
// Write demo files
// -----------------------------------------------------------------------

for (const demo of DEMOS) {
  const layout = LAYOUTS[demo.slug];
  if (!layout) {
    console.warn("Missing layout for", demo.slug);
    continue;
  }
  const idx = DEMOS.findIndex((d) => d.id === demo.id);
  const prev = idx > 0 ? DEMOS[idx - 1] : null;
  const next = idx < DEMOS.length - 1 ? DEMOS[idx + 1] : null;
  const neighbors = {
    prevHref: prev ? `${prev.id}-${prev.slug}.html` : null,
    nextHref: next ? `${next.id}-${next.slug}.html` : null,
    prevTitle: prev ? prev.title : null,
    nextTitle: next ? next.title : null,
  };
  const html = shellHtml(demo, layout.body, layout.css, neighbors);
  const path = resolve(demosDir, `${demo.id}-${demo.slug}.html`);
  writeFileSync(path, html);
  console.log("wrote", path);
}

// -----------------------------------------------------------------------
// Index (gallery)
// -----------------------------------------------------------------------

const indexPath = resolve(__dirname, "index.html");
writeFileSync(
  indexPath,
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Places Page Lab — 20 modern structures</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      body {
        font-family: "Inter", system-ui, sans-serif;
        background: #050508; color: #f5f5f7;
        -webkit-font-smoothing: antialiased;
      }
      .wrap { max-width: 1200px; margin: 0 auto; padding: 48px 24px 88px; position: relative; }
      .wrap::before {
        content: ""; position: absolute; top: -100px; left: 50%; transform: translateX(-50%);
        width: 800px; height: 500px; border-radius: 50%;
        background: radial-gradient(circle, rgba(168,85,247,0.25) 0%, transparent 65%);
        filter: blur(80px); pointer-events: none;
      }
      .back { color: rgba(255,255,255,0.55); text-decoration: none; font-size: 0.85rem; font-weight: 500; position: relative; z-index: 1; }
      .back:hover { color: white; }
      .kicker {
        font-family: "JetBrains Mono", monospace;
        font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
        color: rgba(255,255,255,0.5); margin: 20px 0 14px;
        position: relative; z-index: 1;
      }
      h1 {
        font-family: "Instrument Serif", Georgia, serif;
        font-size: clamp(2.4rem, 6vw, 4rem);
        font-weight: 400; font-style: italic; line-height: 1;
        margin: 0 0 14px; letter-spacing: -0.03em;
        position: relative; z-index: 1;
        background: linear-gradient(180deg, #fff 30%, rgba(255,255,255,0.6));
        -webkit-background-clip: text; background-clip: text; color: transparent;
      }
      .lede {
        margin: 0; color: rgba(255,255,255,0.6); font-size: 1.05rem; line-height: 1.55; max-width: 620px;
        position: relative; z-index: 1;
      }
      .meta {
        display: flex; flex-wrap: wrap; gap: 12px 20px; margin: 20px 0 36px;
        font-size: 0.85rem; color: rgba(255,255,255,0.5);
        position: relative; z-index: 1;
      }
      .ref {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 8px 14px; border-radius: 999px;
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
        color: rgba(255,255,255,0.85); text-decoration: none; font-size: 0.85rem; font-weight: 500;
        margin-top: 4px;
        position: relative; z-index: 1;
      }
      .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; position: relative; z-index: 1; margin-top: 32px; }
      @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
      .card {
        display: flex; flex-direction: column; gap: 10px;
        padding: 20px; border: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.03); backdrop-filter: blur(20px);
        color: inherit; text-decoration: none; border-radius: 18px;
        transition: all 0.2s ease;
      }
      .card:hover {
        border-color: rgba(168,85,247,0.5); background: rgba(168,85,247,0.06);
        transform: translateY(-2px);
      }
      .num { font-family: "JetBrains Mono", monospace; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: rgba(168,85,247,0.85); font-weight: 600; }
      .card h2 { margin: 0; font-size: 1.1rem; font-weight: 600; letter-spacing: -0.01em; color: white; }
      .card p { margin: 0; flex: 1; color: rgba(255,255,255,0.55); font-size: 0.88rem; line-height: 1.5; }
      .axis { font-family: "JetBrains Mono", monospace; font-size: 10px; color: rgba(255,255,255,0.4); letter-spacing: 0.14em; text-transform: uppercase; }
      .cta { font-size: 13px; color: #c4b5fd; font-weight: 500; margin-top: 4px; }
      .card:hover .cta { color: #ddd6fe; }
      .note {
        margin-top: 36px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.5); font-size: 0.9rem; line-height: 1.5; max-width: 640px;
        position: relative; z-index: 1;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <a class="back" href="../index.html">← Design Lab</a>
      <p class="kicker">Places Page Lab · Almanac · v2</p>
      <h1>Twenty modern shells<br/>around one atlas.</h1>
      <p class="lede">
        Same filters and place covers — reframed twenty ways with contemporary web design:
        bento grids, cinematic posters, glass on mesh, product dashboards, marquee ribbons,
        aurora ambient, photo mosaics, KPI heroes, vertical stories.
        Page through with ← / → arrow keys.
      </p>
      <div class="meta">
        <span>20 structure demos</span>
        <span>Photography-first · dark modes · glass · gradient</span>
        <span>Atlas cards themed per shell</span>
      </div>
      <a class="ref" href="../sites/02-almanac/places.html">Open current Almanac places →</a>

      <div class="grid" id="grid"></div>

      <p class="note">
        Each demo mounts the real Almanac places browse (filters + covers) with the masthead
        omitted, and overrides the atlas card CSS variables so cards match the shell theme.
      </p>
    </div>
    <script type="module">
      const demos = ${JSON.stringify(
        DEMOS.map((d) => [d.id, d.slug, d.title, d.blurb, d.axis]),
        null,
        2,
      )};
      document.getElementById("grid").innerHTML = demos.map(([id, slug, title, blurb, axis]) => \`
        <a class="card" href="demos/\${id}-\${slug}.html">
          <span class="num">Structure \${id}</span>
          <h2>\${title}</h2>
          <p>\${blurb}</p>
          <span class="axis">\${axis}</span>
          <span class="cta">Open structure →</span>
        </a>
      \`).join("");
    </script>
  </body>
</html>
`,
);

console.log("wrote", indexPath);
console.log("done", DEMOS.length, "demos");
