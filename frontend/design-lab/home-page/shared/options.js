/**
 * The ten Volume home skins, shared by the index, the review bar, and _generate.mjs.
 *
 * Every skin keeps the Volume home UX exactly as it ships: bento hero with rotating
 * profile photos and two stat tiles, Places/Posts shelf cards, and the shared filter
 * panel that opens underneath. Only palette, type, and surface treatment change.
 *
 * Order is presentation order: closest to today's site first, most opinionated last.
 */
export const OPTIONS = [
  {
    id: "01",
    slug: "paper-coral",
    title: "Paper coral",
    blurb:
      "Today's Volume, quieted: one-hue coral instead of the three-stop gradient, hairline tile borders, and a slightly airier grid.",
    note: "Smallest change from the current site",
    tags: ["warm", "paper", "baseline"],
    swatches: ["#faf8f4", "#ff5733", "#1f3a2c", "#1a1612"],
  },
  {
    id: "02",
    slug: "forest-ledger",
    title: "Forest ledger",
    blurb:
      "Forest green takes the lead and coral drops to a small accent, so the hero reads like a field ledger rather than a launch banner.",
    note: "Calmest palette of the ten",
    tags: ["forest", "calm", "editorial"],
    swatches: ["#f3f6f1", "#1f6f4f", "#0f1c16", "#d9e4dc"],
  },
  {
    id: "03",
    slug: "midnight-reel",
    title: "Midnight reel",
    blurb:
      "The same bento inverted onto near-black with amber numerals, so saved reel photography carries the whole page.",
    note: "Only dark option",
    tags: ["dark", "cinematic", "amber"],
    swatches: ["#0e1013", "#ffb648", "#171a1f", "#f2f3f5"],
  },
  {
    id: "04",
    slug: "sand-clay",
    title: "Sand & clay",
    blurb:
      "Flat matte surfaces on sand paper — no gradients, no shadows, wider corner radius, clay for every accent.",
    note: "No gradients anywhere",
    tags: ["matte", "desert", "flat"],
    swatches: ["#f3ece2", "#c1613c", "#2a211a", "#e0d2be"],
  },
  {
    id: "05",
    slug: "nordic-light",
    title: "Nordic light",
    blurb:
      "Cool grey ground, 12px corners, blue accent and a sans display face — the bento as a tidy product surface.",
    note: "Sans-only, no serif italics",
    tags: ["cool", "product", "tight"],
    swatches: ["#f6f7f9", "#2f6bff", "#14181d", "#e6eaf0"],
  },
  {
    id: "06",
    slug: "aurora-mint",
    title: "Aurora mint",
    blurb:
      "A soft mint and teal mesh sits behind frosted tiles, picking up the brand's Aurora Mint palette without any new imagery.",
    note: "Brand mesh + frosted glass",
    tags: ["mint", "glass", "gradient"],
    swatches: ["#eef7f2", "#3ecfa1", "#0b6b52", "#0f2a22"],
  },
  {
    id: "07",
    slug: "mono-press",
    title: "Mono press",
    blurb:
      "Newsprint greyscale with 6px corners, hairline rules, mono labels and upright serif headings. Red ink appears only on counts.",
    note: "Quietest, most typographic",
    tags: ["greyscale", "press", "mono"],
    swatches: ["#f2f1ee", "#111111", "#a8321e", "#d8d6d0"],
  },
  {
    id: "08",
    slug: "kraft-zine",
    title: "Kraft zine",
    blurb:
      "Kraft paper ground with hard black outlines and offset shadows, Space Grotesk headings, and a zine-poster hero tile.",
    note: "Most graphic silhouette",
    tags: ["kraft", "outlined", "bold"],
    swatches: ["#efe6d6", "#e2571f", "#191614", "#1f5c46"],
  },
  {
    id: "09",
    slug: "slate-product",
    title: "Slate product",
    blurb:
      "Near-white slate, violet accent, crisp 1px borders and a lift on hover — the dashboard reading of the same bento.",
    note: "Closest to a SaaS dashboard",
    tags: ["slate", "violet", "dashboard"],
    swatches: ["#fbfbfc", "#6d5efc", "#10131a", "#e8eaef"],
  },
  {
    id: "10",
    slug: "dusk-gradient",
    title: "Dusk gradient",
    blurb:
      "Plum-to-magenta dusk gradients on warm off-white, with indigo stat tiles — the most saturated take on the hero.",
    note: "Most saturated",
    tags: ["dusk", "plum", "gradient"],
    swatches: ["#fbf7f6", "#d9528f", "#3b2a5e", "#1a1220"],
  },
];
