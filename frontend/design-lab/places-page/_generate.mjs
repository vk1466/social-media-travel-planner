#!/usr/bin/env node
/**
 * Generate 20 Almanac places-page structure demos.
 * Filters + place atlas stay identical; only page framing / shell changes.
 * Each demo should feel visually distinct when paged through with ← / →.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const demosDir = resolve(__dirname, "demos");
mkdirSync(demosDir, { recursive: true });

const UNSPLASH = (id, w = 1800, h = 1100) =>
  `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;

const PHOTO = {
  balloons: UNSPLASH("photo-1523592121529-f6dde35f079e", 2000, 1200),
  sunrise: UNSPLASH("photo-1520939817895-060bdaf4fe1b", 1600, 1200),
  positano: UNSPLASH("photo-1533106497176-45ae19e68ba2", 1600, 2000),
  kyoto: UNSPLASH("photo-1528360983277-13d401cdc186", 1600, 2000),
  santorini: UNSPLASH("photo-1533105079780-92b9be482077", 1600, 2000),
  fjord: UNSPLASH("photo-1506905925346-21bda4d32df4", 2000, 1200),
  bamboo: UNSPLASH("photo-1528164344705-47542687000d", 1600, 2000),
  cliffs: UNSPLASH("photo-1523906834658-6e24ef2386f9", 1600, 2000),
  desert: UNSPLASH("photo-1509316785289-025f5b846b35", 2000, 1200),
  patagonia: UNSPLASH("photo-1520962880247-cfaf541c8724", 2000, 1200),
};

const DEMOS = [
  {
    id: "01",
    slug: "bare-ledger",
    title: "Bare ledger",
    blurb: "Wordmark, hairline, whitespace, atlas. Nothing else earns a pixel.",
    axis: "Minimal · quiet · utility",
  },
  {
    id: "02",
    slug: "quiet-strip",
    title: "Editorial masthead",
    blurb: "Oversized italic title, deck, hairline, folio meta — magazine front matter.",
    axis: "Editorial · quiet · chapter",
  },
  {
    id: "03",
    slug: "editorial-chapter",
    title: "Broadsheet columns",
    blurb: "Ruled columns, running folio, a drop-cap deck. The atlas is the article body.",
    axis: "Editorial · print · ruled",
  },
  {
    id: "04",
    slug: "bleed-hero",
    title: "Bleed horizon",
    blurb: "One full-bleed sunrise sets the weather; the atlas paper panel rises over it.",
    axis: "Atmospheric · photographic · immersive",
  },
  {
    id: "05",
    slug: "floating-folio",
    title: "Floating folio",
    blurb: "Cream sheet with brass grommets on a linen desk. Atlas as a physical object.",
    axis: "Tactile · object · warm",
  },
  {
    id: "06",
    slug: "split-atrium",
    title: "Museum atrium",
    blurb: "Sticky interpretive rail on the left, exhibition hall on the right.",
    axis: "Museum · split · institutional",
  },
  {
    id: "07",
    slug: "spine-shelf",
    title: "Book spine",
    blurb: "Terracotta hardcover spine with vertical type; the atlas is the interior page.",
    axis: "Tactile · book · metaphor",
  },
  {
    id: "08",
    slug: "swiss-modular",
    title: "Swiss modular",
    blurb: "Visible 12-column grid, wall-label typography, one accent square. No ornament.",
    axis: "Modern · modular · gallery",
  },
  {
    id: "09",
    slug: "sticky-rail",
    title: "Product index rail",
    blurb: "Sticky left index with manifesto and secondary nav — Linear-warmth precision.",
    axis: "Modern · product · index",
  },
  {
    id: "10",
    slug: "letterbox",
    title: "Letterbox cinema",
    blurb: "Two black film-strip bars frame a cream projection screen. Feature presentation.",
    axis: "Dark · luxury · cinematic",
  },
  {
    id: "11",
    slug: "notebook-margin",
    title: "Field notes margin",
    blurb: "Ruled left margin with FIG. labels and a dispatch strip. Expedition log energy.",
    axis: "Tactile · field-guide · annotated",
  },
  {
    id: "12",
    slug: "horizon-band",
    title: "Horizon band",
    blurb: "A cream-to-dusk gradient horizon with a compass rose. Atlas sits on the plain.",
    axis: "Atmospheric · travel · soft",
  },
  {
    id: "13",
    slug: "library-carrel",
    title: "Card catalog",
    blurb: "Dewey call numbers, tabular type, oppressive calm. Archival not aspirational.",
    axis: "Archival · dense · institutional",
  },
  {
    id: "14",
    slug: "passport-folio",
    title: "Passport bifolio",
    blurb: "Perforated edge, authority block, cluster of dashed stamps. Travel document.",
    axis: "Tactile · document · playful",
  },
  {
    id: "15",
    slug: "constellation",
    title: "Constellation veil",
    blurb: "Warm night sky with drawn constellations; frosted cream panel holds the atlas.",
    axis: "Unexpected · atmospheric · wild",
  },
  {
    id: "16",
    slug: "dock-bottom",
    title: "Bottom dock",
    blurb: "Atlas fills the viewport; a floating pill dock carries navigation at the bottom.",
    axis: "Mobile-native · modern · docked",
  },
  {
    id: "17",
    slug: "veil-overlay",
    title: "Night reading room",
    blurb: "Deep espresso field, cognac display type, one lamp-lit cream island of atlas.",
    axis: "Dark · luxury · editorial",
  },
  {
    id: "18",
    slug: "story-drawer",
    title: "Curator drawer",
    blurb: "Utility frame with a right-edge tab that pulls out museum wall text on demand.",
    axis: "Modern · product · layered",
  },
  {
    id: "19",
    slug: "type-monument",
    title: "Type monument",
    blurb: "Giant italic 'Places' cropped by the viewport becomes the frame; atlas nests below.",
    axis: "Expressive · maximal · type",
  },
  {
    id: "20",
    slug: "weather-bulletin",
    title: "Weather bulletin",
    blurb: "Teletype advisory strip with severity pip and scan animation. Municipal drama.",
    axis: "Unexpected · utilitarian · expressive",
  },
];

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
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=DM+Mono:wght@400;500&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400;1,9..144,500;1,9..144,600&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
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

// -----------------------------------------------------------------------
// Shared UI atoms (nav links reused by many shells)
// -----------------------------------------------------------------------

const NAV_ITEMS = [
  ["Discover", "../../sites/02-almanac/index.html", false],
  ["Posts", "../../sites/02-almanac/posts.html", false],
  ["Places", "#", true],
  ["Journal", "../../sites/02-almanac/history.html", false],
  ["Add", "../../sites/02-almanac/add.html", false],
];

const navHtml = (cls = "") =>
  NAV_ITEMS.map(
    ([label, href, active]) =>
      `<a class="${cls}${active ? " is-on" : ""}" href="${href}">${label}</a>`,
  ).join("");

const atlasSlot = () =>
  `<div id="wf-places-root" class="wf-places wf-places--almanac wf-places--embedded"><div class="wf-places-loading">Loading atlas…</div></div>`;

// -----------------------------------------------------------------------
// LAYOUTS — one shell per slug. Each is self-contained CSS + body.
// -----------------------------------------------------------------------

const LAYOUTS = {
  //
  // 01 · Bare ledger — extreme minimalism
  //
  "bare-ledger": {
    css: `
body { background: #f7f1e8; color: var(--a-ink); font-family: var(--a-sans); }
.bl-brand {
  max-width: 1180px; margin: 0 auto; padding: 14vh 24px 0.9rem;
  display: flex; align-items: baseline; justify-content: space-between;
  border-bottom: 1px solid #d9c9b3;
}
.bl-brand .mark {
  font-family: var(--a-serif); font-style: italic; font-weight: 400; font-size: 1.4rem;
  letter-spacing: -0.01em;
}
.bl-brand .mark small {
  display: block; font-family: var(--a-sans); font-style: normal;
  font-size: 0.62rem; letter-spacing: 0.28em; text-transform: uppercase;
  color: #a48a72; font-weight: 600; margin-bottom: 4px;
}
.bl-brand .meta {
  font-size: 0.7rem; letter-spacing: 0.18em; text-transform: uppercase; color: #a48a72; font-weight: 600;
}
.bl-brand nav { display: flex; gap: 1.2rem; font-size: 0.78rem; color: #7a6250; }
.bl-brand nav a { color: inherit; text-decoration: none; }
.bl-brand nav a.is-on { color: var(--a-ink); text-decoration: underline; text-underline-offset: 4px; }
.wf-places { padding-top: 1rem; }
`,
    body: `
  <div class="bl-brand">
    <a class="mark" href="../../sites/02-almanac/index.html"><small>Wanderfile</small>Almanac</a>
    <nav>${navHtml()}</nav>
    <span class="meta">Places</span>
  </div>
  ${atlasSlot()}`,
  },

  //
  // 02 · Editorial masthead — magazine chapter front matter
  //
  "quiet-strip": {
    css: `
body { background: #f8f2eb; color: var(--a-ink); font-family: var(--a-sans); }
.qs-top {
  max-width: 1240px; margin: 0 auto; padding: 1.1rem 24px 0.75rem;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.78rem; color: var(--a-muted);
}
.qs-top .logo { font-family: var(--a-serif); font-style: italic; font-size: 1.1rem; color: var(--a-ink); }
.qs-top nav a { color: inherit; text-decoration: none; margin-left: 1.1rem; }
.qs-masthead {
  max-width: 1240px; margin: 0 auto; padding: 3.5rem 24px 2rem;
  display: grid; grid-template-columns: 1fr auto; gap: 3rem; align-items: end;
  border-bottom: 1px solid #d9c9b3;
}
.qs-masthead h1 {
  margin: 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 8vw, 6.5rem); line-height: 0.95; letter-spacing: -0.035em;
  color: var(--a-ink);
}
.qs-masthead .deck {
  margin: 1rem 0 0; max-width: 40ch; color: var(--a-ink-soft, #6b5346);
  font-size: 1.05rem; line-height: 1.5; font-family: var(--a-serif); font-style: italic; font-weight: 400;
}
.qs-folio {
  text-align: right; font-family: "DM Mono", monospace; font-size: 0.72rem;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--a-muted); line-height: 1.9;
}
.qs-folio strong { color: var(--a-accent); font-weight: 600; }
.qs-rule {
  height: 3px; background: var(--a-accent); width: 72px; margin: -2px auto 0;
  max-width: 1240px; padding-left: 24px; box-sizing: content-box;
}
@media (max-width: 720px) { .qs-masthead { grid-template-columns: 1fr; } .qs-folio { text-align: left; } }
`,
    body: `
  <div class="qs-top">
    <a class="logo" href="../../sites/02-almanac/index.html">Almanac</a>
    <nav>
      <a href="../../sites/02-almanac/posts.html">Posts</a>
      <a href="../../sites/02-almanac/history.html">Journal</a>
      <a href="../../sites/02-almanac/add.html">Add a link</a>
    </nav>
  </div>
  <header class="qs-masthead">
    <div>
      <h1>Places</h1>
      <p class="deck">Every destination your saves have ever named — filed, mapped, and marked off.</p>
    </div>
    <div class="qs-folio">
      Vol. II · No. 04<br/>
      Spring MMXXVI<br/>
      <strong>Updated · today</strong>
    </div>
  </header>
  <div style="max-width:1240px;margin:0 auto;padding:0 24px"><div style="height:3px;width:72px;background:var(--a-accent);margin-top:-2px"></div></div>
  ${atlasSlot()}`,
  },

  //
  // 03 · Broadsheet columns — real print
  //
  "editorial-chapter": {
    css: `
body {
  background:
    linear-gradient(90deg, transparent 0, transparent calc(50% - 1px), rgb(155 120 90 / 0.06) calc(50% - 1px), rgb(155 120 90 / 0.06) 50%, transparent 50%),
    #f8f2eb;
  color: var(--a-ink); font-family: var(--a-sans);
}
.bs-folio {
  border-top: 2px solid var(--a-ink); border-bottom: 1px solid var(--a-ink);
  padding: 0.55rem 0;
}
.bs-folio-inner {
  max-width: 1240px; margin: 0 auto; padding: 0 24px;
  display: flex; justify-content: space-between; align-items: center;
  font-family: "DM Mono", monospace; font-size: 0.68rem;
  letter-spacing: 0.22em; text-transform: uppercase; color: var(--a-ink);
}
.bs-folio-inner strong { font-weight: 500; }
.bs-folio-inner .dot { color: var(--a-accent); }
.bs-open {
  max-width: 1240px; margin: 0 auto; padding: 3rem 24px 2rem;
  display: grid; grid-template-columns: 1fr 1fr; column-gap: 2.5rem;
}
.bs-open .head {
  grid-column: 1 / -1; text-align: center; padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--a-ink);
}
.bs-open .kicker {
  margin: 0; font-family: "DM Mono", monospace; font-size: 0.7rem;
  letter-spacing: 0.32em; text-transform: uppercase; color: var(--a-accent);
}
.bs-open h1 {
  margin: 0.6rem 0 0; font-family: var(--a-serif); font-weight: 400;
  font-size: clamp(3.2rem, 7.5vw, 5.8rem); line-height: 0.95; letter-spacing: -0.03em;
}
.bs-open h1 em { font-style: italic; }
.bs-open .byline {
  margin: 0.9rem 0 0; font-family: "DM Mono", monospace; font-size: 0.72rem;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--a-muted);
}
.bs-open .deck {
  margin: 2rem 0 0; font-family: var(--a-serif); font-size: 1.05rem; line-height: 1.65; color: var(--a-ink);
  column-count: 2; column-gap: 2.5rem; column-rule: 1px solid #d9c9b3;
  grid-column: 1 / -1;
}
.bs-open .deck::first-letter {
  float: left; font-family: var(--a-serif); font-weight: 500; font-style: italic;
  font-size: 5rem; line-height: 0.85; margin: 4px 10px 0 0; color: var(--a-accent);
}
@media (max-width: 720px) { .bs-open .deck { column-count: 1; } }
`,
    body: `
  <div class="bs-folio">
    <div class="bs-folio-inner">
      <span><strong>Almanac</strong> <span class="dot">·</span> Volume II <span class="dot">·</span> No. 04</span>
      <span>Spring MMXXVI</span>
      <span>Places <span class="dot">·</span> Atlas Edition</span>
    </div>
  </div>
  <div class="bs-open">
    <div class="head">
      <p class="kicker">Section IV — The Atlas</p>
      <h1><em>Places</em> worth the ink.</h1>
      <p class="byline">Filed by you · Updated today</p>
    </div>
    <p class="deck">Every destination your saves have ever named — filed by region, marked by visit, and set in a single running index. The atlas below is the whole of the archive: continents down to the single café, with cover art assembled from the reels, essays, and notes you keep coming back to. Filter by mood, by season, by whether you've already been. Nothing is thrown away.</p>
  </div>
  ${atlasSlot()}`,
  },

  //
  // 04 · Bleed horizon — full-bleed photo with rising paper panel
  //
  "bleed-hero": {
    css: `
body { background: #1a120e; color: var(--a-ink); font-family: var(--a-sans); }
.bh-hero {
  position: relative; min-height: 92vh; overflow: hidden;
  background:
    linear-gradient(180deg, rgb(26 18 14 / 0.35) 0%, transparent 30%, transparent 55%, rgb(26 18 14 / 0.85) 100%),
    url("${PHOTO.balloons}") center/cover;
  color: #fffaf5;
}
.bh-topbar {
  position: absolute; top: 0; left: 0; right: 0; z-index: 2;
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 24px; max-width: 1400px; margin: 0 auto;
}
.bh-topbar .brand {
  font-family: var(--a-serif); font-style: italic; font-size: 1.35rem;
  border-bottom: 1px solid rgb(255 250 245 / 0.5); padding-bottom: 3px; line-height: 1;
}
.bh-topbar nav a { color: #fffaf5; text-decoration: none; margin-left: 1.2rem; font-size: 0.82rem; opacity: 0.9; }
.bh-topbar nav a.is-on { opacity: 1; font-weight: 600; text-decoration: underline; text-underline-offset: 5px; }
.bh-copy {
  position: absolute; left: 0; right: 0; bottom: 12vh; z-index: 2;
  max-width: 1400px; margin: 0 auto; padding: 0 24px;
}
.bh-copy .eye {
  margin: 0; font-family: "DM Mono", monospace; font-size: 0.72rem;
  letter-spacing: 0.28em; text-transform: uppercase; opacity: 0.8;
}
.bh-copy h1 {
  margin: 0.85rem 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3.5rem, 9vw, 7rem); line-height: 0.95; letter-spacing: -0.035em; max-width: 12ch;
}
.bh-copy .scroll {
  position: absolute; right: 24px; bottom: 0; font-size: 0.72rem;
  letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.7;
}
.bh-scroll-line { display: block; width: 1px; height: 32px; background: #fffaf5; margin: 8px auto 0; opacity: 0.55; }
.bh-panel {
  position: relative; margin-top: -7vh; z-index: 3;
  background: #f8f2eb;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -30px 60px -20px rgb(0 0 0 / 0.45);
  padding-top: 1rem;
}
.bh-panel::before {
  content: ""; display: block; width: 44px; height: 4px; background: #d9c9b3;
  border-radius: 999px; margin: 0.85rem auto 0;
}
`,
    body: `
  <section class="bh-hero">
    <div class="bh-topbar">
      <a class="brand" href="../../sites/02-almanac/index.html">Almanac</a>
      <nav>${navHtml()}</nav>
    </div>
    <div class="bh-copy">
      <p class="eye">Volume II · The Atlas</p>
      <h1>Where the saves <br/>keep pointing.</h1>
    </div>
    <div class="bh-copy" style="left:auto;right:0;bottom:2.5vh;text-align:right;pointer-events:none">
      <span class="scroll">Scroll to atlas<span class="bh-scroll-line"></span></span>
    </div>
  </section>
  <div class="bh-panel">${atlasSlot()}</div>`,
  },

  //
  // 05 · Floating folio — cream sheet on linen desk with brass grommets
  //
  "floating-folio": {
    css: `
body {
  color: var(--a-ink); font-family: var(--a-sans);
  background-color: #b6754a;
  background-image:
    radial-gradient(ellipse 60% 40% at 20% 10%, #d18e5f 0, transparent 55%),
    radial-gradient(ellipse 50% 40% at 100% 30%, #a55a2f 0, transparent 55%),
    radial-gradient(ellipse 70% 50% at 60% 100%, #8a4a2a 0, transparent 55%),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' seed='4'/><feColorMatrix values='0 0 0 0 0.05  0 0 0 0 0.03  0 0 0 0 0.02  0 0 0 0.08 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  min-height: 100vh;
}
.ff-topbar {
  max-width: 1120px; margin: 0 auto; padding: 1.2rem 24px 0.85rem;
  display: flex; justify-content: space-between; align-items: center; color: #fce9d4;
}
.ff-topbar .logo { font-family: var(--a-serif); font-style: italic; font-size: 1.35rem; }
.ff-topbar nav a { color: rgb(255 250 245 / 0.85); text-decoration: none; margin-left: 1.1rem; font-size: 0.85rem; }
.ff-topbar nav a.is-on { color: #fffaf5; font-weight: 600; }
.ff-sheet {
  position: relative; max-width: 1120px; margin: 1rem auto 3rem; background: #fffaf5;
  border-radius: 4px;
  box-shadow:
    0 2px 0 #d0b596,
    0 8px 0 #b89a76,
    0 40px 90px -25px rgb(30 15 5 / 0.55);
  overflow: hidden;
}
.ff-sheet::before, .ff-sheet::after {
  content: ""; position: absolute; top: 14px; width: 14px; height: 14px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #f0d089 0%, #b78940 55%, #6f4a1e 100%);
  box-shadow: inset 0 -1px 2px rgb(0 0 0 / 0.4);
}
.ff-sheet::before { left: 14px; }
.ff-sheet::after { right: 14px; }
.ff-sheet-head {
  padding: 2.5rem 2rem 1.25rem; display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;
  border-bottom: 1px solid #ead9c8;
}
.ff-sheet-head h1 {
  margin: 0; font-family: var(--a-serif); font-weight: 400; font-style: italic;
  font-size: clamp(2rem, 4vw, 2.8rem); letter-spacing: -0.02em;
}
.ff-sheet-head .meta {
  font-family: "DM Mono", monospace; font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--a-muted);
}
`,
    body: `
  <div class="ff-topbar">
    <a class="logo" href="../../sites/02-almanac/index.html">Almanac</a>
    <nav>${navHtml()}</nav>
  </div>
  <div class="ff-sheet">
    <div class="ff-sheet-head">
      <h1>Places · a folio</h1>
      <span class="meta">Sheet 04 · Bearer's copy</span>
    </div>
    ${atlasSlot()}
  </div>`,
  },

  //
  // 06 · Museum atrium — sticky wall-text rail, exhibition hall right
  //
  "split-atrium": {
    css: `
body { background: #f8f2eb; color: var(--a-ink); font-family: var(--a-sans); }
.at-shell { display: grid; grid-template-columns: 340px 1fr; min-height: calc(100vh - 100px); }
.at-rail {
  position: sticky; top: 48px; align-self: start; height: calc(100vh - 48px);
  background: #efe6dc;
  padding: 2.75rem 1.75rem 2rem;
  display: flex; flex-direction: column; gap: 1.5rem; border-right: 1px solid #d9c9b3;
}
.at-rail .brand {
  font-family: "DM Mono", monospace; font-size: 0.68rem;
  letter-spacing: 0.28em; text-transform: uppercase; color: var(--a-muted); font-weight: 600;
}
.at-rail h1 {
  margin: 0; font-family: var(--a-serif); font-weight: 400; font-style: italic;
  font-size: clamp(3rem, 4.5vw, 4.5rem); line-height: 0.9; letter-spacing: -0.03em;
}
.at-rail h1::after { content: "."; color: var(--a-accent); }
.at-rail .wall {
  font-family: var(--a-serif); font-size: 0.98rem; line-height: 1.6; color: var(--a-ink-soft, #5a4234);
  max-width: 30ch;
}
.at-rail .wall strong { color: var(--a-ink); font-weight: 500; }
.at-rail .meta {
  margin-top: auto; padding-top: 1.5rem; border-top: 1px solid #d9c9b3;
  font-family: "DM Mono", monospace; font-size: 0.7rem; color: var(--a-muted); line-height: 1.9;
  letter-spacing: 0.1em; text-transform: uppercase;
}
.at-rail nav { display: flex; flex-direction: column; gap: 0.35rem; }
.at-rail nav a {
  color: var(--a-ink); text-decoration: none; font-size: 0.88rem; padding: 3px 0;
  border-bottom: 1px solid transparent;
}
.at-rail nav a.is-on { border-bottom-color: var(--a-accent); color: var(--a-accent); font-weight: 600; }
.at-hall { min-width: 0; background: #f8f2eb; }
@media (max-width: 900px) {
  .at-shell { grid-template-columns: 1fr; }
  .at-rail { position: relative; top: 0; height: auto; }
}
`,
    body: `
  <div class="at-shell">
    <aside class="at-rail">
      <span class="brand">Almanac · Wing IV</span>
      <h1>Places</h1>
      <p class="wall">
        <strong>The atlas</strong> is a working document. Every destination your saves have
        ever named — from continents down to the single café — filed here in one running
        register. Marked when you've been. Kept when you haven't.
      </p>
      <nav>${navHtml()}</nav>
      <div class="meta">
        Curator · you<br/>
        Updated · today<br/>
        Filters unchanged
      </div>
    </aside>
    <div class="at-hall">${atlasSlot()}</div>
  </div>`,
  },

  //
  // 07 · Book spine — hardcover binding on left
  //
  "spine-shelf": {
    css: `
body { background: #efe6dc; color: var(--a-ink); font-family: var(--a-sans); }
.sp-shell { display: grid; grid-template-columns: 72px 1fr; min-height: calc(100vh - 100px); }
.sp-spine {
  background: linear-gradient(90deg, #a34a24 0%, #c85c34 25%, #a34a24 100%);
  color: #fbe6d4;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: 1.25rem 0;
  box-shadow: inset -2px 0 0 rgb(0 0 0 / 0.15), inset 2px 0 0 rgb(255 255 255 / 0.08);
  position: relative;
}
.sp-spine::before, .sp-spine::after {
  content: ""; position: absolute; left: 6px; right: 6px; height: 3px; background: #d2a675;
  box-shadow: 0 1px 0 rgb(0 0 0 / 0.25);
}
.sp-spine::before { top: 44px; }
.sp-spine::after { bottom: 44px; }
.sp-emblem {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1.5px solid #fbe6d4; display: grid; place-items: center;
  font-family: var(--a-serif); font-style: italic; font-weight: 500; font-size: 1rem;
}
.sp-title {
  writing-mode: vertical-rl; transform: rotate(180deg);
  font-family: var(--a-serif); font-style: italic; font-size: 1.15rem; letter-spacing: 0.08em;
}
.sp-title span {
  font-family: var(--a-sans); font-style: normal; font-size: 0.68rem;
  letter-spacing: 0.32em; text-transform: uppercase; margin-right: 1rem; opacity: 0.85;
}
.sp-year {
  font-family: "DM Mono", monospace; font-size: 0.68rem;
  letter-spacing: 0.16em; writing-mode: vertical-rl; transform: rotate(180deg); opacity: 0.85;
}
.sp-main { background: #f8f2eb; min-width: 0; }
.sp-topbar {
  display: flex; justify-content: space-between; align-items: baseline;
  padding: 1.75rem 2rem 1.25rem;
  border-bottom: 1px solid #d9c9b3;
}
.sp-topbar h1 {
  margin: 0; font-family: var(--a-serif); font-weight: 400; font-style: italic;
  font-size: 2rem; letter-spacing: -0.02em;
}
.sp-topbar nav a { color: var(--a-muted); text-decoration: none; margin-left: 1rem; font-size: 0.85rem; }
.sp-topbar nav a.is-on { color: var(--a-accent); font-weight: 600; }
@media (max-width: 600px) {
  .sp-shell { grid-template-columns: 44px 1fr; }
  .sp-emblem { width: 24px; height: 24px; font-size: 0.75rem; }
}
`,
    body: `
  <div class="sp-shell">
    <aside class="sp-spine" aria-label="Book spine">
      <span class="sp-emblem">A</span>
      <span class="sp-title"><span>Wanderfile</span>Almanac · Places</span>
      <span class="sp-year">MMXXVI</span>
    </aside>
    <div class="sp-main">
      <div class="sp-topbar">
        <h1>Interior page — the atlas</h1>
        <nav>${navHtml()}</nav>
      </div>
      ${atlasSlot()}
    </div>
  </div>`,
  },

  //
  // 08 · Swiss modular — visible 12-col grid, wall-label typography
  //
  "swiss-modular": {
    css: `
body {
  background: #f2ede4; color: #14100c; font-family: "Space Grotesk", var(--a-sans);
}
.sw-frame {
  max-width: 1240px; margin: 0 auto; padding: 0.5rem 24px 3rem; position: relative;
}
.sw-frame::before {
  content: ""; position: absolute; inset: 0 24px;
  background-image: repeating-linear-gradient(90deg, transparent 0, transparent calc(8.3333% - 1px), rgb(20 16 12 / 0.06) calc(8.3333% - 1px), rgb(20 16 12 / 0.06) 8.3333%);
  pointer-events: none;
}
.sw-cols {
  display: grid; grid-template-columns: repeat(12, 1fr); font-family: "DM Mono", monospace;
  font-size: 0.6rem; letter-spacing: 0.14em; color: rgb(20 16 12 / 0.4); padding: 0.4rem 0 0.75rem;
}
.sw-cols span { text-align: center; }
.sw-head {
  display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px;
  padding: 1.5rem 0 2rem; border-top: 2px solid #14100c; border-bottom: 1px solid #14100c;
  position: relative;
}
.sw-head .kicker {
  grid-column: 1 / span 4; margin: 0; font-family: "DM Mono", monospace;
  font-size: 0.72rem; letter-spacing: 0.24em; text-transform: uppercase;
}
.sw-head h1 {
  grid-column: 1 / span 8; margin: 1rem 0 0;
  font-family: var(--a-serif); font-weight: 500; font-style: italic;
  font-size: clamp(3rem, 8vw, 6rem); line-height: 0.9; letter-spacing: -0.035em;
}
.sw-head .accent {
  grid-column: 12 / span 1; align-self: end; justify-self: end;
  width: 44px; height: 44px; background: var(--a-accent);
}
.sw-head .deck {
  grid-column: 9 / span 4; align-self: end; margin: 0;
  font-size: 0.9rem; line-height: 1.55; color: rgb(20 16 12 / 0.7);
}
.sw-meta {
  display: grid; grid-template-columns: repeat(12, 1fr); gap: 24px;
  padding: 0.85rem 0; font-family: "DM Mono", monospace; font-size: 0.72rem;
  letter-spacing: 0.14em; text-transform: uppercase; color: rgb(20 16 12 / 0.7);
  border-bottom: 1px solid rgb(20 16 12 / 0.15);
}
.sw-meta span:nth-child(1) { grid-column: 1 / span 3; }
.sw-meta span:nth-child(2) { grid-column: 4 / span 3; }
.sw-meta span:nth-child(3) { grid-column: 7 / span 3; }
.sw-meta span:nth-child(4) { grid-column: 10 / span 3; text-align: right; }
.sw-meta strong { color: #14100c; font-weight: 500; }
`,
    body: `
  <div class="sw-frame">
    <div class="sw-cols">${Array.from({ length: 12 }, (_, i) => `<span>${String(i + 1).padStart(2, "0")}</span>`).join("")}</div>
    <header class="sw-head">
      <p class="kicker">Section IV / Places</p>
      <h1><em>Places</em></h1>
      <div class="accent"></div>
      <p class="deck">A modular index of every destination in your library — filed, filtered, and cross-referenced against your visits.</p>
    </header>
    <div class="sw-meta">
      <span>Curator <strong>YOU</strong></span>
      <span>Updated <strong>Today</strong></span>
      <span>System <strong>12-col</strong></span>
      <span>Filters <strong>Unchanged</strong></span>
    </div>
    ${atlasSlot()}
  </div>`,
  },

  //
  // 09 · Product index rail — sticky manifesto + secondary nav
  //
  "sticky-rail": {
    css: `
body { background: #f8f2eb; color: var(--a-ink); font-family: var(--a-sans); }
.pr-shell { display: grid; grid-template-columns: 260px 1fr; min-height: calc(100vh - 100px); }
.pr-rail {
  position: sticky; top: 48px; align-self: start; height: calc(100vh - 48px);
  padding: 1.75rem 1.5rem; border-right: 1px solid #ead9c8;
  display: flex; flex-direction: column; gap: 1.5rem;
  background: rgb(255 250 245 / 0.5);
}
.pr-rail .brand {
  display: flex; align-items: center; gap: 0.55rem;
  font-family: var(--a-serif); font-style: italic; font-size: 1.15rem;
}
.pr-rail .brand .dot { width: 8px; height: 8px; background: var(--a-accent); border-radius: 50%; }
.pr-rail .manifesto {
  font-size: 0.88rem; line-height: 1.55; color: var(--a-ink-soft, #6b5346);
  padding-bottom: 1.2rem; border-bottom: 1px solid #ead9c8;
}
.pr-rail .group { display: flex; flex-direction: column; gap: 2px; }
.pr-rail .group .label {
  font-family: "DM Mono", monospace; font-size: 0.62rem;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--a-muted); font-weight: 600;
  margin-bottom: 6px;
}
.pr-rail .group a {
  color: var(--a-ink); text-decoration: none; font-size: 0.88rem; font-weight: 500;
  padding: 6px 10px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;
}
.pr-rail .group a:hover { background: rgb(200 92 52 / 0.08); }
.pr-rail .group a.is-on { background: var(--a-accent); color: #fffaf5; }
.pr-rail .group a .num {
  font-family: "DM Mono", monospace; font-size: 0.72rem; color: var(--a-muted); font-weight: 500;
}
.pr-rail .group a.is-on .num { color: rgb(255 250 245 / 0.85); }
.pr-rail .footer {
  margin-top: auto; font-family: "DM Mono", monospace; font-size: 0.68rem;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--a-muted); line-height: 1.8;
}
.pr-main { min-width: 0; }
.pr-strip {
  position: sticky; top: 48px; z-index: 4;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.75rem 1.5rem; border-bottom: 1px solid #ead9c8;
  background: rgb(248 242 235 / 0.94); backdrop-filter: blur(10px);
  font-size: 0.82rem;
}
.pr-strip h1 {
  margin: 0; font-family: var(--a-serif); font-style: italic; font-weight: 500; font-size: 1.1rem;
}
.pr-strip .kbd {
  font-family: "DM Mono", monospace; font-size: 0.7rem;
  border: 1px solid #d9c9b3; padding: 2px 6px; border-radius: 4px; color: var(--a-muted);
}
@media (max-width: 900px) {
  .pr-shell { grid-template-columns: 1fr; }
  .pr-rail { position: relative; top: 0; height: auto; border-right: 0; border-bottom: 1px solid #ead9c8; }
}
`,
    body: `
  <div class="pr-shell">
    <aside class="pr-rail">
      <div class="brand"><span class="dot"></span>Almanac</div>
      <p class="manifesto">A working index of your saved places. Filter by region, mood, or whether you've been. The atlas is always live.</p>
      <div class="group">
        <span class="label">Views</span>
        <a class="is-on" href="#">All places <span class="num">248</span></a>
        <a href="#">Visited <span class="num">62</span></a>
        <a href="#">Dreamt of <span class="num">186</span></a>
        <a href="#">Routed <span class="num">14</span></a>
      </div>
      <div class="group">
        <span class="label">Sections</span>
        <a href="../../sites/02-almanac/index.html">Discover</a>
        <a href="../../sites/02-almanac/posts.html">Posts</a>
        <a href="../../sites/02-almanac/history.html">Journal</a>
        <a href="../../sites/02-almanac/add.html">Add a link</a>
      </div>
      <div class="footer">Wanderfile<br/>Almanac · v2.4</div>
    </aside>
    <div class="pr-main">
      <div class="pr-strip">
        <h1>Places · All</h1>
        <span><span class="kbd">⌘</span> <span class="kbd">K</span> to jump</span>
      </div>
      ${atlasSlot()}
    </div>
  </div>`,
  },

  //
  // 10 · Letterbox cinema — film strip bars
  //
  "letterbox": {
    css: `
body { background: #0a0806; color: var(--a-ink); font-family: var(--a-sans); }
.lb-bar {
  height: 88px; background: #0a0806; color: #e8dcc4; position: relative;
  display: flex; align-items: center; justify-content: center;
  border-bottom: 1px solid rgb(255 250 245 / 0.08);
}
.lb-bar.bottom { border-top: 1px solid rgb(255 250 245 / 0.08); border-bottom: 0; }
.lb-bar::before, .lb-bar::after {
  content: ""; position: absolute; left: 0; right: 0; height: 18px;
  background-image: radial-gradient(circle, #1c1712 0 5px, transparent 5.5px);
  background-size: 32px 18px;
}
.lb-bar::before { top: 8px; }
.lb-bar::after { bottom: 8px; }
.lb-bar-inner {
  z-index: 1; display: flex; align-items: center; gap: 1.5rem;
  font-family: "DM Mono", monospace; font-size: 0.68rem;
  letter-spacing: 0.28em; text-transform: uppercase; color: #d4b78a;
}
.lb-bar-inner strong { color: #f0d89a; font-weight: 500; letter-spacing: 0.14em; font-family: var(--a-serif); font-style: italic; font-size: 1rem; text-transform: none; }
.lb-bar-inner .reel { color: #a08558; }
.lb-stage {
  min-height: 65vh; background: #f8f2eb; color: var(--a-ink); position: relative;
}
.lb-title {
  padding: 3rem 24px 1.75rem; text-align: center; border-bottom: 1px solid #ead9c8;
}
.lb-title .kicker {
  margin: 0; font-family: "DM Mono", monospace; font-size: 0.7rem;
  letter-spacing: 0.28em; text-transform: uppercase; color: var(--a-accent);
}
.lb-title h1 {
  margin: 0.75rem 0 0; font-family: var(--a-serif); font-weight: 400; font-style: italic;
  font-size: clamp(2.4rem, 5vw, 3.6rem); letter-spacing: -0.02em;
}
.lb-title nav {
  margin-top: 1rem; display: flex; justify-content: center; gap: 1.25rem;
  font-size: 0.85rem; color: var(--a-muted);
}
.lb-title nav a { color: inherit; text-decoration: none; }
.lb-title nav a.is-on { color: var(--a-accent); font-weight: 600; }
`,
    body: `
  <div class="lb-bar">
    <div class="lb-bar-inner">
      <span class="reel">Reel 04</span>
      <strong>Almanac · Places</strong>
      <span class="reel">Presented in 1.85 : 1</span>
    </div>
  </div>
  <div class="lb-stage">
    <div class="lb-title">
      <p class="kicker">Feature presentation</p>
      <h1>The atlas</h1>
      <nav>${navHtml()}</nav>
    </div>
    ${atlasSlot()}
  </div>
  <div class="lb-bar bottom">
    <div class="lb-bar-inner">
      <span class="reel">Fin.</span>
      <strong>Wanderfile · MMXXVI</strong>
      <span class="reel">A quiet feature</span>
    </div>
  </div>`,
  },

  //
  // 11 · Field notes margin — ruled left margin with FIG. labels
  //
  "notebook-margin": {
    css: `
body { background: #f2ebde; color: var(--a-ink); font-family: var(--a-sans); }
.fn-shell {
  display: grid; grid-template-columns: minmax(200px, 28%) 1fr;
  max-width: 1340px; margin: 0 auto; min-height: calc(100vh - 100px);
}
.fn-margin {
  padding: 2rem 1.5rem 2rem 1.75rem;
  background:
    repeating-linear-gradient(#e6dcc8 0 1px, transparent 1px 28px),
    #ede4d4;
  background-position: 0 22px;
  border-right: 2px solid #d4a68a;
  position: relative;
  color: var(--a-ink-soft, #5a4234);
}
.fn-margin::after {
  content: ""; position: absolute; top: 0; bottom: 0; right: -6px; width: 2px;
  background: repeating-linear-gradient(180deg, #c85c34 0 6px, transparent 6px 12px);
  opacity: 0.6;
}
.fn-margin .brand {
  font-family: var(--a-serif); font-style: italic; font-size: 1.35rem; color: var(--a-ink);
}
.fn-margin .brand small {
  display: block; font-family: "DM Mono", monospace; font-style: normal;
  font-size: 0.62rem; letter-spacing: 0.24em; text-transform: uppercase; color: var(--a-muted);
  margin-bottom: 6px; font-weight: 600;
}
.fn-fig {
  margin: 1.75rem 0 0.35rem; font-family: "DM Mono", monospace;
  font-size: 0.65rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--a-accent); font-weight: 600;
}
.fn-note {
  font-family: var(--a-serif); font-size: 0.98rem; line-height: 1.5; font-style: italic; color: var(--a-ink-soft, #5a4234);
}
.fn-dispatch {
  margin-top: 1.5rem; padding: 0.75rem; background: #fffaf5; border: 1px solid #d9c9b3;
  font-family: "DM Mono", monospace; font-size: 0.72rem; color: var(--a-ink);
}
.fn-dispatch strong { color: var(--a-accent); font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; display: block; margin-bottom: 4px; }
.fn-margin nav {
  margin-top: 2rem; display: flex; flex-direction: column; gap: 0.35rem;
  padding-top: 1rem; border-top: 1px dashed #c8b499;
}
.fn-margin nav a {
  color: var(--a-ink); text-decoration: none; font-size: 0.88rem;
  font-family: var(--a-serif); font-style: italic;
}
.fn-margin nav a.is-on { color: var(--a-accent); font-weight: 600; }
.fn-pages { background: #f8f2eb; min-width: 0; }
@media (max-width: 720px) {
  .fn-shell { grid-template-columns: 1fr; }
  .fn-margin { border-right: 0; border-bottom: 2px solid #d4a68a; }
}
`,
    body: `
  <div class="fn-shell">
    <aside class="fn-margin">
      <div class="brand"><small>Field guide</small>Almanac</div>
      <p class="fn-fig">Fig. 01 — the atlas</p>
      <p class="fn-note">A working register of everywhere your saves have named. Filed by region. Marked when visited.</p>
      <p class="fn-fig">Fig. 02 — how to read</p>
      <p class="fn-note">Search, group, and status live to the right. Covers on. Filters unchanged.</p>
      <div class="fn-dispatch">
        <strong>Dispatch · Today</strong>
        Warm south · light winds · 3 new saves filed since Tuesday.
      </div>
      <nav>${navHtml()}</nav>
    </aside>
    <div class="fn-pages">${atlasSlot()}</div>
  </div>`,
  },

  //
  // 12 · Horizon band — sky-to-plain gradient with compass rose
  //
  "horizon-band": {
    css: `
body { background: #f7f1e8; color: var(--a-ink); font-family: var(--a-sans); }
.hz-sky {
  position: relative; height: 46vh; min-height: 300px; overflow: hidden;
  background:
    radial-gradient(ellipse 60% 40% at 20% 30%, rgb(255 220 170 / 0.55) 0%, transparent 55%),
    linear-gradient(180deg, #f6d9a8 0%, #eba572 32%, #c85c34 62%, #7a3821 90%, #3d2b21 100%);
}
.hz-sun {
  position: absolute; left: 62%; top: 40%; width: 180px; height: 180px; border-radius: 50%;
  background: radial-gradient(circle, #ffe6b8 0%, #f9c079 50%, transparent 72%);
  filter: blur(2px);
}
.hz-topbar {
  position: relative; z-index: 2; max-width: 1240px; margin: 0 auto;
  display: flex; justify-content: space-between; align-items: center;
  padding: 1.25rem 24px; color: #fffaf5;
}
.hz-topbar .brand { font-family: var(--a-serif); font-style: italic; font-size: 1.3rem; }
.hz-topbar nav a { color: rgb(255 250 245 / 0.9); text-decoration: none; margin-left: 1.1rem; font-size: 0.85rem; }
.hz-titleblock {
  position: absolute; z-index: 2; left: 0; right: 0; bottom: 2.5rem;
  max-width: 1240px; margin: 0 auto; padding: 0 24px;
  display: flex; justify-content: space-between; align-items: flex-end; color: #fffaf5;
}
.hz-titleblock h1 {
  margin: 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(2.8rem, 6vw, 4.6rem); letter-spacing: -0.03em; line-height: 1;
}
.hz-titleblock .coords {
  font-family: "DM Mono", monospace; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase;
  text-align: right; line-height: 1.9; opacity: 0.9;
}
.hz-compass {
  position: absolute; top: 92px; right: 24px; z-index: 2; width: 56px; height: 56px; opacity: 0.9;
}
@media (max-width: 720px) { .hz-compass { display: none; } }
.hz-plain {
  position: relative; z-index: 3; margin-top: -32px; background: #f7f1e8;
  border-radius: 32px 32px 0 0; padding-top: 0.75rem;
  box-shadow: 0 -10px 30px -12px rgb(61 43 33 / 0.35);
}
`,
    body: `
  <section class="hz-sky">
    <div class="hz-sun"></div>
    <svg class="hz-compass" viewBox="0 0 56 56" fill="none" stroke="#fffaf5" stroke-width="1.2">
      <circle cx="28" cy="28" r="26"/>
      <circle cx="28" cy="28" r="20"/>
      <path d="M28 4v48M4 28h48"/>
      <path d="M28 4l6 24-6-4-6 4z" fill="#fffaf5"/>
      <text x="28" y="12" text-anchor="middle" font-family="DM Mono" font-size="6" fill="#fffaf5">N</text>
    </svg>
    <div class="hz-topbar">
      <a class="brand" href="../../sites/02-almanac/index.html">Almanac</a>
      <nav>${navHtml()}</nav>
    </div>
    <div class="hz-titleblock">
      <h1>Places, plotted.</h1>
      <div class="coords">
        LAT · everywhere<br/>
        LON · you've saved<br/>
        Updated · today
      </div>
    </div>
  </section>
  <div class="hz-plain">${atlasSlot()}</div>`,
  },

  //
  // 13 · Card catalog — Dewey call numbers, archival calm
  //
  "library-carrel": {
    css: `
body { background: #f0e8d8; color: #2a1f18; font-family: var(--a-sans); font-size: 14px; }
.cc-shell {
  display: grid; grid-template-columns: 1fr 220px; max-width: 1320px; margin: 0 auto;
  gap: 0; padding: 0 24px 2rem;
}
.cc-top {
  grid-column: 1 / -1; padding: 1.5rem 0 1rem; margin-bottom: 1rem;
  border-bottom: 2px double #6b5346;
  display: flex; justify-content: space-between; align-items: baseline; gap: 1rem;
}
.cc-top .brand {
  font-family: "DM Mono", monospace; font-size: 0.7rem;
  letter-spacing: 0.32em; text-transform: uppercase; color: #6b5346; font-weight: 600;
}
.cc-top h1 {
  margin: 0; font-family: var(--a-serif); font-weight: 500; font-size: 1.6rem; letter-spacing: -0.01em;
}
.cc-top nav a { color: #6b5346; text-decoration: none; margin-left: 1rem; font-size: 0.82rem; }
.cc-top nav a.is-on { color: var(--a-accent); font-weight: 600; }
.cc-catalog {
  min-width: 0; border-right: 1px solid #d0c2a8; padding-right: 1.5rem;
}
.cc-callnos {
  padding: 1.25rem 0 1.25rem 1.5rem;
  font-family: "DM Mono", monospace; font-size: 0.75rem; color: #4a3728; line-height: 1.9;
}
.cc-callnos h4 {
  margin: 0 0 0.75rem; font-family: var(--a-sans); font-size: 0.66rem;
  letter-spacing: 0.24em; text-transform: uppercase; color: #6b5346; font-weight: 700;
}
.cc-callnos ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.cc-callnos li {
  display: grid; grid-template-columns: 62px 1fr; gap: 8px; align-items: baseline;
  padding: 4px 0; border-bottom: 1px dotted #c8b898;
}
.cc-callnos li strong { color: var(--a-accent); font-weight: 500; letter-spacing: 0.08em; }
.cc-card {
  background: #fffaf5; border: 1px solid #c8b898; margin-bottom: 1rem;
  box-shadow: 2px 2px 0 #d9c9b3;
  padding: 0.75rem 1rem;
  display: grid; grid-template-columns: 1fr auto; gap: 1rem;
  font-family: "DM Mono", monospace; font-size: 0.7rem; color: #6b5346;
  letter-spacing: 0.1em; text-transform: uppercase;
}
.cc-card strong { color: #2a1f18; font-weight: 600; }
@media (max-width: 820px) {
  .cc-shell { grid-template-columns: 1fr; }
  .cc-catalog { border-right: 0; padding-right: 0; }
  .cc-callnos { padding-left: 0; }
}
`,
    body: `
  <div class="cc-shell">
    <div class="cc-top">
      <span class="brand">Almanac Library · Catalog</span>
      <h1>913 · Places</h1>
      <nav>${navHtml()}</nav>
    </div>
    <div class="cc-catalog">
      <div class="cc-card">
        <span>Class <strong>913.PLA</strong> · Entries <strong>248</strong> · Circ. <strong>62</strong> · Rev. <strong>Today</strong></span>
        <span>Bearer <strong>YOU</strong></span>
      </div>
      ${atlasSlot()}
    </div>
    <aside class="cc-callnos">
      <h4>Call numbers</h4>
      <ul>
        <li><strong>910.G</strong>General atlas</li>
        <li><strong>911.H</strong>Historical</li>
        <li><strong>912.M</strong>Maps &amp; charts</li>
        <li><strong>913.A</strong>Ancient world</li>
        <li><strong>914.E</strong>Europe</li>
        <li><strong>915.A</strong>Asia</li>
        <li><strong>916.F</strong>Africa</li>
        <li><strong>917.N</strong>North America</li>
        <li><strong>918.S</strong>South America</li>
        <li><strong>919.O</strong>Oceania</li>
      </ul>
    </aside>
  </div>`,
  },

  //
  // 14 · Passport bifolio — perforations, authority block, dashed stamps
  //
  "passport-folio": {
    css: `
body {
  background: #6d5340;
  background-image:
    radial-gradient(circle at 20% 20%, #7d604b 0 40%, transparent 60%),
    radial-gradient(circle at 90% 10%, #5a4232 0 40%, transparent 60%),
    linear-gradient(180deg, #6d5340 0%, #4a3626 100%);
  color: var(--a-ink); font-family: var(--a-sans); min-height: 100vh;
}
.pp-frame {
  max-width: 1120px; margin: 0 auto; padding: 1.5rem 16px 3rem; color: #f0e0c8;
}
.pp-topbar {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;
}
.pp-topbar .brand { font-family: var(--a-serif); font-style: italic; font-size: 1.35rem; }
.pp-topbar nav a { color: rgb(240 224 200 / 0.85); text-decoration: none; margin-left: 1.1rem; font-size: 0.85rem; }
.pp-book {
  background: #f0e2ce; color: var(--a-ink); position: relative;
  padding: 2rem 2.25rem 1rem;
  border-radius: 4px;
  box-shadow: 0 30px 70px -20px rgb(0 0 0 / 0.55);
  background-image:
    radial-gradient(circle at 50% 50%, transparent 0 4px, rgb(107 83 70 / 0.4) 4.5px, transparent 5px);
  background-size: 14px 100%;
  background-repeat: repeat-y;
  background-position: 50% 0;
}
.pp-book::before {
  content: ""; position: absolute; left: 0; right: 0; top: 0; height: 14px;
  background-image: radial-gradient(circle, #6d5340 0 4px, transparent 4.5px);
  background-size: 22px 14px;
}
.pp-book::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 14px;
  background-image: radial-gradient(circle, #6d5340 0 4px, transparent 4.5px);
  background-size: 22px 14px;
}
.pp-authority {
  display: grid; grid-template-columns: 72px 1fr; gap: 1.25rem; align-items: center;
  padding: 1.5rem 260px 1rem 0; border-bottom: 2px solid var(--a-ink); position: relative;
}
.pp-authority .meta {
  grid-column: 1 / -1; padding-top: 0.75rem; margin-top: 0.5rem;
  border-top: 1px dashed #c8b499;
  display: flex; gap: 1.75rem; flex-wrap: wrap;
}
.pp-authority .meta span { display: inline-block; }
.pp-crest {
  width: 72px; height: 72px; border: 2px solid var(--a-ink); border-radius: 50%;
  display: grid; place-items: center;
  font-family: var(--a-serif); font-style: italic; font-weight: 500; font-size: 2rem; color: var(--a-accent);
  background:
    radial-gradient(circle at 50% 50%, transparent 20px, rgb(200 92 52 / 0.08) 21px 22px, transparent 23px),
    #fffaf5;
}
.pp-authority h1 {
  margin: 0; font-family: var(--a-serif); font-weight: 500; font-size: 1.6rem; letter-spacing: -0.01em;
}
.pp-authority h1 small {
  display: block; font-family: "DM Mono", monospace; font-style: normal; font-weight: 500;
  font-size: 0.62rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--a-accent); margin-bottom: 4px;
}
.pp-authority .pp-meta {
  font-family: "DM Mono", monospace; font-size: 0.7rem; letter-spacing: 0.14em;
  text-transform: uppercase; color: var(--a-muted); line-height: 1.7;
}
.pp-stamps {
  position: absolute; top: 26px; right: 28px;
  display: flex; gap: 0.4rem; z-index: 2;
}
.pp-stamp {
  width: 74px; height: 74px; border: 2px dashed var(--a-accent); border-radius: 50%;
  display: grid; place-items: center; text-align: center;
  font-family: "DM Mono", monospace; font-size: 0.58rem; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--a-accent); font-weight: 700; transform: rotate(-8deg); opacity: 0.85;
  line-height: 1.15;
}
.pp-stamp:nth-child(2) {
  transform: rotate(7deg); border-color: #5c3a5e; color: #5c3a5e;
}
.pp-stamp:nth-child(3) {
  transform: rotate(-3deg) translateY(6px); border-color: #7a5a2a; color: #7a5a2a;
}
@media (max-width: 640px) {
  .pp-stamps { position: static; margin: 1rem 0; }
  .pp-authority { grid-template-columns: 56px 1fr; padding-right: 0; }
}
`,
    body: `
  <div class="pp-frame">
    <div class="pp-topbar">
      <a class="brand" href="../../sites/02-almanac/index.html">Almanac</a>
      <nav>${navHtml()}</nav>
    </div>
    <div class="pp-book">
      <div class="pp-authority">
        <div class="pp-crest">A</div>
        <div>
          <h1><small>Wanderfile / Authority</small>Almanac Passport — Places</h1>
        </div>
        <div class="meta pp-meta">
          <span>Bearer <strong>You</strong></span>
          <span>Issued <strong>MMXXVI</strong></span>
          <span>Valid <strong>Everywhere</strong></span>
        </div>
      </div>
      <div class="pp-stamps" aria-hidden="true">
        <div class="pp-stamp">Visited<br/>62</div>
        <div class="pp-stamp">Atlas<br/>MMXXVI</div>
        <div class="pp-stamp">Fair<br/>weather</div>
      </div>
      ${atlasSlot()}
    </div>
  </div>`,
  },

  //
  // 15 · Constellation veil — night sky with drawn constellations, frosted island
  //
  "constellation": {
    css: `
body {
  color: #f0e0c8; font-family: var(--a-sans);
  background: #0d1128;
  background-image:
    radial-gradient(1.5px 1.5px at 8% 12%, #ffe0a8 0, transparent 100%),
    radial-gradient(1px 1px at 18% 34%, #cde 0, transparent 100%),
    radial-gradient(2px 2px at 27% 22%, #fff 0, transparent 100%),
    radial-gradient(1px 1px at 34% 58%, #fce 0, transparent 100%),
    radial-gradient(1.5px 1.5px at 44% 18%, #fff 0, transparent 100%),
    radial-gradient(1px 1px at 52% 44%, #ffe0a8 0, transparent 100%),
    radial-gradient(2px 2px at 63% 28%, #fff 0, transparent 100%),
    radial-gradient(1px 1px at 71% 66%, #cde 0, transparent 100%),
    radial-gradient(1.5px 1.5px at 78% 14%, #fff 0, transparent 100%),
    radial-gradient(1px 1px at 88% 46%, #ffe0a8 0, transparent 100%),
    radial-gradient(2px 2px at 92% 22%, #fff 0, transparent 100%),
    radial-gradient(ellipse 60% 40% at 50% 0%, #2a2a5a 0%, transparent 55%),
    radial-gradient(ellipse 80% 50% at 50% 100%, #1a1533 0%, transparent 60%),
    #0d1128;
}
.cn-topbar {
  max-width: 1280px; margin: 0 auto; padding: 1.5rem 24px 0;
  display: flex; justify-content: space-between; align-items: center;
}
.cn-topbar .brand {
  font-family: var(--a-serif); font-style: italic; font-size: 1.35rem; color: #f4d99a;
}
.cn-topbar nav a { color: rgb(240 224 200 / 0.75); text-decoration: none; margin-left: 1.1rem; font-size: 0.85rem; }
.cn-header {
  position: relative; max-width: 1280px; margin: 3rem auto 1.5rem; padding: 0 24px; text-align: center;
}
.cn-header .kicker {
  margin: 0; font-family: "DM Mono", monospace; font-size: 0.7rem;
  letter-spacing: 0.28em; text-transform: uppercase; color: #b7a7d4;
}
.cn-header h1 {
  margin: 0.75rem 0 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(3rem, 7vw, 5rem); letter-spacing: -0.02em; color: #f4d99a;
  text-shadow: 0 0 30px rgb(244 217 154 / 0.25);
}
.cn-header p { margin: 0.8rem auto 0; max-width: 44ch; color: #c8bad8; font-size: 0.98rem; line-height: 1.55; }
.cn-lines {
  position: absolute; top: 0; left: 0; right: 0; height: 260px; pointer-events: none; opacity: 0.5;
}
.cn-island {
  max-width: 1240px; margin: 0 auto 3rem; padding: 0.5rem 0 1rem;
  background: rgb(248 242 235 / 0.97); color: var(--a-ink);
  border-radius: 24px; overflow: hidden;
  box-shadow: 0 0 80px rgb(170 200 255 / 0.15), 0 20px 60px -20px rgb(0 0 0 / 0.55);
  backdrop-filter: blur(20px);
}
`,
    body: `
  <div class="cn-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html">Almanac</a>
    <nav>${navHtml()}</nav>
  </div>
  <header class="cn-header">
    <svg class="cn-lines" viewBox="0 0 1280 260" preserveAspectRatio="none">
      <g stroke="#f4d99a" stroke-width="0.6" fill="none" opacity="0.7">
        <path d="M120 60 L280 90 L380 40 L470 120 L560 80"/>
        <path d="M700 40 L820 100 L920 60 L1020 130 L1160 70"/>
        <path d="M180 190 L320 220 L440 170 L540 230"/>
      </g>
      <g fill="#f4d99a">
        <circle cx="120" cy="60" r="2"/><circle cx="280" cy="90" r="2"/><circle cx="380" cy="40" r="2"/>
        <circle cx="470" cy="120" r="2"/><circle cx="560" cy="80" r="2"/>
        <circle cx="700" cy="40" r="2"/><circle cx="820" cy="100" r="2"/><circle cx="920" cy="60" r="2"/>
        <circle cx="1020" cy="130" r="2"/><circle cx="1160" cy="70" r="2"/>
        <circle cx="180" cy="190" r="2"/><circle cx="320" cy="220" r="2"/><circle cx="440" cy="170" r="2"/>
        <circle cx="540" cy="230" r="2"/>
      </g>
    </svg>
    <p class="kicker">Almanac · Night edition</p>
    <h1>A constellation of places.</h1>
    <p>Every save connected — the atlas below reads like a star chart. Same filters, warmer sky.</p>
  </header>
  <div class="cn-island">${atlasSlot()}</div>`,
  },

  //
  // 16 · Bottom dock — mobile-native, atlas takes viewport
  //
  "dock-bottom": {
    css: `
body { background: #f8f2eb; color: var(--a-ink); font-family: var(--a-sans); padding-bottom: 96px; }
.db-corner {
  position: fixed; top: 60px; left: 20px; z-index: 90;
  width: 34px; height: 34px; border-radius: 50%;
  background: var(--a-ink); color: #f0e0c8;
  display: grid; place-items: center;
  font-family: var(--a-serif); font-style: italic; font-size: 1.05rem;
  box-shadow: 0 6px 20px -6px rgb(0 0 0 / 0.4);
}
.db-tag {
  position: fixed; top: 68px; right: 24px; z-index: 90;
  font-family: "DM Mono", monospace; font-size: 0.7rem;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--a-muted);
}
.db-tag strong { color: var(--a-accent); font-weight: 600; }
.db-dock {
  position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 100;
  display: flex; gap: 4px; padding: 6px;
  background: rgb(61 43 33 / 0.92); backdrop-filter: blur(16px);
  border-radius: 999px;
  box-shadow: 0 16px 48px -12px rgb(61 43 33 / 0.45), 0 0 0 1px rgb(255 250 245 / 0.06);
}
.db-dock a {
  color: #f0e0c8; text-decoration: none; font-size: 0.8rem; font-weight: 500;
  padding: 0.65rem 1.15rem; border-radius: 999px; display: flex; align-items: center; gap: 6px;
  transition: background 0.15s ease;
}
.db-dock a:hover { background: rgb(255 250 245 / 0.08); }
.db-dock a.is-on { background: var(--a-accent); color: #fffaf5; font-weight: 600; box-shadow: 0 4px 12px -2px rgb(200 92 52 / 0.5); }
.db-dock .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.7; }
`,
    body: `
  <div class="db-corner">A</div>
  <div class="db-tag">Almanac · <strong>Places</strong></div>
  ${atlasSlot()}
  <nav class="db-dock" aria-label="Primary">
    <a href="../../sites/02-almanac/index.html">Discover</a>
    <a href="../../sites/02-almanac/posts.html">Posts</a>
    <a class="is-on" href="#"><span class="dot"></span>Places</a>
    <a href="../../sites/02-almanac/history.html">Journal</a>
    <a href="../../sites/02-almanac/add.html">Add</a>
  </nav>`,
  },

  //
  // 17 · Night reading room — espresso field, cognac type, cream island
  //
  "veil-overlay": {
    css: `
body {
  color: #f0d9a8; font-family: var(--a-sans);
  background:
    radial-gradient(ellipse 50% 40% at 50% 15%, rgb(180 130 60 / 0.18) 0%, transparent 55%),
    radial-gradient(ellipse 70% 50% at 50% 100%, rgb(200 92 52 / 0.15) 0%, transparent 55%),
    #17110c;
}
.vo-topbar {
  max-width: 1280px; margin: 0 auto; padding: 1.5rem 24px 0;
  display: flex; justify-content: space-between; align-items: center;
}
.vo-topbar .brand { font-family: var(--a-serif); font-style: italic; font-size: 1.35rem; color: #e8c37a; }
.vo-topbar nav a { color: rgb(232 195 122 / 0.65); text-decoration: none; margin-left: 1.1rem; font-size: 0.85rem; }
.vo-topbar nav a.is-on { color: #f0d9a8; font-weight: 600; }
.vo-head {
  max-width: 1280px; margin: 4.5rem auto 2rem; padding: 0 24px;
  display: grid; grid-template-columns: 1fr auto; gap: 3rem; align-items: end;
}
.vo-head h1 {
  margin: 0; font-family: var(--a-serif); font-weight: 300; font-style: italic;
  font-size: clamp(4rem, 12vw, 9rem); line-height: 0.9; letter-spacing: -0.04em; color: #e8c37a;
}
.vo-head .lamp {
  text-align: right; font-family: "DM Mono", monospace; font-size: 0.72rem;
  letter-spacing: 0.16em; text-transform: uppercase; color: #a8896a; line-height: 1.9;
}
.vo-head .lamp strong { color: #f0d9a8; font-weight: 500; }
.vo-head .lamp::before {
  content: ""; display: block; width: 40px; height: 40px; margin-left: auto; margin-bottom: 12px;
  border-radius: 50%; background: radial-gradient(circle, #f4d99a 0%, #c8985a 60%, transparent 75%);
  filter: blur(2px); opacity: 0.9;
}
.vo-island {
  max-width: 1240px; margin: 0 auto 3rem; padding: 0.5rem 0 1rem;
  background: #f8f2eb; color: var(--a-ink);
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 30px 80px -20px rgb(0 0 0 / 0.6), 0 0 0 1px rgb(232 195 122 / 0.15);
}
`,
    body: `
  <div class="vo-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html">Almanac</a>
    <nav>${navHtml()}</nav>
  </div>
  <header class="vo-head">
    <h1><em>Places</em></h1>
    <div class="lamp">
      Reading room · Almanac<br/>
      <strong>Lamp on</strong><br/>
      Filters unchanged
    </div>
  </header>
  <div class="vo-island">${atlasSlot()}</div>`,
  },

  //
  // 18 · Curator drawer — utility frame with pull-out wall text
  //
  "story-drawer": {
    css: `
body { background: #f8f2eb; color: var(--a-ink); font-family: var(--a-sans); }
.cd-top {
  max-width: 1240px; margin: 0 auto; padding: 1.2rem 24px 1rem;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid #ead9c8;
}
.cd-top .brand { display: flex; align-items: baseline; gap: 0.65rem; font-family: var(--a-serif); font-style: italic; font-size: 1.2rem; }
.cd-top .brand small { font-family: var(--a-sans); font-style: normal; font-size: 0.7rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--a-muted); font-weight: 600; }
.cd-top nav a { color: var(--a-muted); text-decoration: none; margin-left: 1.1rem; font-size: 0.85rem; }
.cd-top nav a.is-on { color: var(--a-accent); font-weight: 600; }
.cd-tab {
  position: fixed; top: 40%; right: 0; z-index: 90;
  background: var(--a-accent); color: #fffaf5;
  padding: 0.85rem 0.65rem;
  writing-mode: vertical-rl; transform: rotate(180deg);
  font-size: 0.75rem; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;
  border-radius: 6px 0 0 6px; cursor: pointer; border: 0;
  box-shadow: -6px 0 16px -6px rgb(200 92 52 / 0.5);
}
.cd-tab:hover { background: #b04a24; }
.cd-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: min(440px, 92vw); z-index: 200;
  background: #fffaf5; color: var(--a-ink);
  padding: 2rem 2rem 2.5rem;
  transform: translateX(100%); transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -30px 0 60px -20px rgb(0 0 0 / 0.4);
  overflow-y: auto;
  border-left: 1px solid #d9c9b3;
}
.cd-drawer.is-open { transform: translateX(0); }
.cd-drawer .close {
  position: absolute; top: 14px; right: 16px;
  border: 0; background: transparent; color: var(--a-muted);
  font-size: 1.5rem; line-height: 1; cursor: pointer;
}
.cd-drawer .kicker {
  margin: 0; font-family: "DM Mono", monospace; font-size: 0.68rem;
  letter-spacing: 0.24em; text-transform: uppercase; color: var(--a-accent); font-weight: 600;
}
.cd-drawer h2 {
  margin: 0.55rem 0 1.2rem; font-family: var(--a-serif); font-style: italic; font-weight: 400;
  font-size: 2rem; letter-spacing: -0.02em;
}
.cd-drawer p {
  margin: 0 0 1rem; font-family: var(--a-serif); font-size: 1rem; line-height: 1.65; color: var(--a-ink-soft, #5a4234);
}
.cd-scrim {
  position: fixed; inset: 0; z-index: 150;
  background: rgb(26 18 14 / 0.35); backdrop-filter: blur(2px);
  opacity: 0; pointer-events: none; transition: opacity 0.28s ease;
}
.cd-scrim.is-open { opacity: 1; pointer-events: auto; }
`,
    body: `
  <div class="cd-top">
    <div class="brand"><small>Wanderfile</small>Almanac · Places</div>
    <nav>${navHtml()}</nav>
  </div>
  ${atlasSlot()}
  <button class="cd-tab" id="cd-open" aria-controls="cd-drawer">Curator's notes ▸</button>
  <div class="cd-scrim" id="cd-scrim"></div>
  <aside class="cd-drawer" id="cd-drawer" aria-hidden="true">
    <button class="close" id="cd-close" aria-label="Close">×</button>
    <p class="kicker">Wall text · Spring MMXXVI</p>
    <h2>On keeping an atlas.</h2>
    <p>Every reel you save leaves a pin behind. This page collects them into one running document — filed by region, marked when you've been, kept when you haven't.</p>
    <p>The atlas is intentionally flat. Continents, cities, and single cafés share the same visual weight. What matters is that they exist in your library, not how far away they are.</p>
    <p>Filters, search, and grouping stay to the right. Nothing here changes them.</p>
  </aside>
  <script>
    const open = document.getElementById("cd-open");
    const close = document.getElementById("cd-close");
    const scrim = document.getElementById("cd-scrim");
    const drawer = document.getElementById("cd-drawer");
    const toggle = (on) => {
      drawer.classList.toggle("is-open", on);
      scrim.classList.toggle("is-open", on);
      drawer.setAttribute("aria-hidden", String(!on));
    };
    open.addEventListener("click", () => toggle(true));
    close.addEventListener("click", () => toggle(false));
    scrim.addEventListener("click", () => toggle(false));
  </script>`,
  },

  //
  // 19 · Type monument — giant italic Places cropped by viewport
  //
  "type-monument": {
    css: `
body { background: #f5ebe0; color: var(--a-ink); font-family: var(--a-sans); overflow-x: hidden; }
.tm-topbar {
  position: relative; z-index: 2;
  max-width: 1440px; margin: 0 auto; padding: 1.25rem 24px 0;
  display: flex; justify-content: space-between; align-items: center;
}
.tm-topbar .brand { font-family: var(--a-serif); font-style: italic; font-size: 1.2rem; }
.tm-topbar nav a { color: var(--a-muted); text-decoration: none; margin-left: 1.1rem; font-size: 0.85rem; }
.tm-topbar nav a.is-on { color: var(--a-accent); font-weight: 600; }
.tm-monolith {
  position: relative;
  padding: 2vw 0 0;
  max-width: 100vw;
  overflow: hidden;
}
.tm-monolith h1 {
  margin: 0; padding: 0 3vw;
  font-family: var(--a-serif); font-weight: 400; font-style: italic;
  font-size: clamp(6rem, 26vw, 24rem);
  line-height: 0.82; letter-spacing: -0.06em; color: var(--a-accent);
  white-space: nowrap;
  transform: translateX(-2vw);
}
.tm-monolith .baseline {
  position: absolute; left: 24px; right: 24px; bottom: 3vw;
  display: flex; justify-content: space-between; align-items: end; gap: 2rem;
  pointer-events: none;
}
.tm-monolith .baseline .stack {
  font-family: "DM Mono", monospace; font-size: 0.72rem;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--a-ink);
  line-height: 1.9; pointer-events: auto;
}
.tm-monolith .baseline .stack strong { color: var(--a-accent); font-weight: 600; }
.tm-monolith .baseline .deck {
  max-width: 32ch; margin: 0; font-family: var(--a-serif); font-style: italic;
  font-size: 1rem; color: var(--a-ink); text-align: right;
}
.tm-atlas {
  padding-top: 1rem;
  border-top: 3px solid var(--a-ink);
  margin-top: -3px;
}
@media (max-width: 720px) {
  .tm-monolith .baseline { flex-direction: column; align-items: flex-start; }
  .tm-monolith .baseline .deck { text-align: left; }
}
`,
    body: `
  <div class="tm-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html">Almanac</a>
    <nav>${navHtml()}</nav>
  </div>
  <div class="tm-monolith">
    <h1>Places</h1>
    <div class="baseline">
      <div class="stack">
        <strong>Almanac</strong> · Vol. II<br/>
        Section 04 · Atlas edition<br/>
        Updated · today
      </div>
      <p class="deck">Typography as architecture. The atlas nests where the type stops.</p>
    </div>
  </div>
  <div class="tm-atlas">${atlasSlot()}</div>`,
  },

  //
  // 20 · Weather bulletin — teletype advisory with scan animation
  //
  "weather-bulletin": {
    css: `
body { background: #f8f2eb; color: var(--a-ink); font-family: var(--a-sans); }
.wb-bar {
  background: #1a1410; color: #f4d99a;
  border-bottom: 3px double #c85c34;
  overflow: hidden; position: relative;
}
.wb-bar::before {
  content: ""; position: absolute; left: 0; right: 0; top: 0; height: 2px;
  background: linear-gradient(90deg, transparent, #c85c34 45%, #f4d99a 50%, #c85c34 55%, transparent);
  animation: wb-scan 3.2s linear infinite;
}
@keyframes wb-scan {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
.wb-bar-inner {
  max-width: 1440px; margin: 0 auto; padding: 0.7rem 24px;
  display: flex; align-items: center; gap: 1.25rem; flex-wrap: wrap;
  font-family: "DM Mono", monospace; font-size: 0.78rem; letter-spacing: 0.14em; text-transform: uppercase;
}
.wb-pip {
  width: 10px; height: 10px; border-radius: 50%; background: #c85c34;
  box-shadow: 0 0 0 3px rgb(200 92 52 / 0.28); flex-shrink: 0;
  animation: wb-pulse 1.4s ease-in-out infinite;
}
@keyframes wb-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.82); }
}
.wb-bar-inner strong { color: #ffffff; font-weight: 500; letter-spacing: 0.28em; }
.wb-bar-inner .sep { opacity: 0.5; }
.wb-bar-inner .status { color: #7fd6a4; letter-spacing: 0.22em; font-weight: 500; }
.wb-topbar {
  max-width: 1440px; margin: 0 auto; padding: 1.1rem 24px 0.75rem;
  display: flex; justify-content: space-between; align-items: center;
}
.wb-topbar .brand { font-family: var(--a-serif); font-style: italic; font-size: 1.35rem; }
.wb-topbar nav a { color: var(--a-muted); text-decoration: none; margin-left: 1.1rem; font-size: 0.85rem; }
.wb-topbar nav a.is-on { color: var(--a-accent); font-weight: 600; }
.wb-conditions {
  max-width: 1440px; margin: 0 auto; padding: 1.5rem 24px 1rem;
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;
  border-bottom: 1px solid #ead9c8;
}
.wb-condition {
  background: #fffaf5; border: 1px solid #ead9c8; border-radius: 4px;
  padding: 1rem 1.15rem; position: relative;
}
.wb-condition .label {
  font-family: "DM Mono", monospace; font-size: 0.62rem;
  letter-spacing: 0.22em; text-transform: uppercase; color: var(--a-muted); font-weight: 600;
  margin: 0 0 6px;
}
.wb-condition .value {
  font-family: var(--a-serif); font-style: italic; font-weight: 400;
  font-size: 1.7rem; line-height: 1; letter-spacing: -0.02em;
}
.wb-condition .num {
  font-family: "DM Mono", monospace; font-weight: 500;
}
.wb-condition.accent { background: var(--a-accent); color: #fffaf5; border-color: var(--a-accent); }
.wb-condition.accent .label { color: rgb(255 250 245 / 0.75); }
@media (max-width: 720px) { .wb-conditions { grid-template-columns: repeat(2, 1fr); } }
`,
    body: `
  <div class="wb-bar">
    <div class="wb-bar-inner">
      <span class="wb-pip"></span>
      <span><strong>Almanac Advisory</strong></span>
      <span class="sep">·</span>
      <span>Section: Places</span>
      <span class="sep">·</span>
      <span class="status">◆ Fair · Clear browsing</span>
      <span class="sep">·</span>
      <span>Updated Sun 22:59</span>
      <span class="sep">·</span>
      <span>Next tick 23:04</span>
    </div>
  </div>
  <div class="wb-topbar">
    <a class="brand" href="../../sites/02-almanac/index.html">Almanac</a>
    <nav>${navHtml()}</nav>
  </div>
  <div class="wb-conditions">
    <div class="wb-condition">
      <p class="label">Section</p>
      <div class="value">Places</div>
    </div>
    <div class="wb-condition">
      <p class="label">Conditions</p>
      <div class="value">Fair · scattered</div>
    </div>
    <div class="wb-condition">
      <p class="label">Register</p>
      <div class="value"><span class="num">248</span> saved</div>
    </div>
    <div class="wb-condition accent">
      <p class="label">Visited so far</p>
      <div class="value"><span class="num">62</span> marked</div>
    </div>
  </div>
  ${atlasSlot()}`,
  },
};

// -----------------------------------------------------------------------
// Write files
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
    <title>Places Page Lab — 20 structures</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      body {
        font-family: "DM Sans", system-ui, sans-serif;
        background: #0c0f0e; color: #f2f4f2;
        -webkit-font-smoothing: antialiased;
      }
      .wrap { max-width: 1100px; margin: 0 auto; padding: 48px 24px 88px; }
      .back { color: #8fa399; text-decoration: none; font-size: 0.85rem; }
      .back:hover { color: #d0e6dc; }
      .kicker {
        font-family: "DM Mono", monospace;
        font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
        color: #8fa399; margin: 18px 0 14px;
      }
      h1 {
        font-family: "Instrument Serif", Georgia, serif;
        font-size: clamp(2.2rem, 5vw, 3.3rem);
        font-weight: 400; font-style: italic; line-height: 1.05;
        margin: 0 0 14px; letter-spacing: -0.02em;
      }
      .lede {
        margin: 0; color: #b7c2bc; font-size: 1.02rem; line-height: 1.55; max-width: 640px;
      }
      .meta {
        display: flex; flex-wrap: wrap; gap: 12px 20px; margin: 20px 0 36px;
        font-size: 0.85rem; color: #8fa399;
      }
      .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
      @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
      .card {
        display: flex; flex-direction: column; gap: 8px;
        padding: 18px 18px 16px; border: 1px solid #2a3330; background: #141917;
        color: inherit; text-decoration: none; border-radius: 16px;
        transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
      }
      .card:hover {
        border-color: #4a6358; background: #1a211e; transform: translateY(-2px);
      }
      .num { font-family: "DM Mono", monospace; font-size: 10px; letter-spacing: 0.24em; text-transform: uppercase; color: #6f8579; }
      .card h2 { margin: 0; font-size: 1.05rem; font-weight: 600; letter-spacing: -0.01em; }
      .card p { margin: 0; flex: 1; color: #9aaba2; font-size: 0.88rem; line-height: 1.45; }
      .axis { font-family: "DM Mono", monospace; font-size: 10px; color: #a8c4b6; letter-spacing: 0.16em; text-transform: uppercase; }
      .cta { font-size: 13px; color: #a8c4b6; font-weight: 500; margin-top: 4px; }
      .card:hover .cta { color: #d0e6dc; }
      .note {
        margin-top: 36px; padding-top: 22px; border-top: 1px solid #2a3330;
        color: #8fa399; font-size: 0.9rem; line-height: 1.5; max-width: 640px;
      }
      .ref {
        display: inline-block; margin-top: 10px; color: #a8c4b6; font-size: 0.85rem;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <a class="back" href="../index.html">← Design Lab</a>
      <p class="kicker">Places Page Lab · Almanac</p>
      <h1>Twenty ways to frame the atlas.</h1>
      <p class="lede">
        Same Almanac filters and place covers — restructured twenty times, from bare ledger and
        editorial masthead through museum atrium, letterbox cinema, passport bifolio,
        constellation veil, night reading room, type monument, and weather bulletin.
        Page through with ← / → arrow keys.
      </p>
      <div class="meta">
        <span>20 structure demos</span>
        <span>Minimal · editorial · modern · dark · tactile · expressive</span>
        <span>Live atlas when signed in</span>
      </div>
      <a class="ref" href="../sites/02-almanac/places.html">Open current Almanac places →</a>

      <div class="grid" id="grid" style="margin-top:28px"></div>

      <p class="note">
        Each demo mounts the real Almanac places browse (filters + covers) with the masthead
        omitted so the page shell owns branding and hierarchy. The atlas module never changes.
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
