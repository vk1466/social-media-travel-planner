/**
 * The ten signed-out gate options, shared by the index and the review bar.
 *
 * Order is presentation order: calmest edit first, most opinionated last.
 */
export const OPTIONS = [
  {
    id: "01",
    slug: "paper-card",
    title: "Paper card",
    blurb:
      "Today's layout lifted into a white card with a wordmark tile, so the gate reads as a deliberate surface instead of loose text on gray.",
    note: "Smallest change from production",
  },
  {
    id: "02",
    slug: "split-atlas",
    title: "Split atlas",
    blurb:
      "Copy and buttons hold the left column; a photo mosaic of saved places fills the right. Stacks to card-over-photo on mobile.",
    note: "Shows the payoff beside the ask",
  },
  {
    id: "03",
    slug: "photo-bleed",
    title: "Photo bleed",
    blurb:
      "One full-bleed travel photo behind a dark scrim, with the wordmark and buttons centered on top.",
    note: "Most emotional, least product",
  },
  {
    id: "04",
    slug: "aurora-glass",
    title: "Aurora glass",
    blurb:
      "Soft mint and forest mesh gradient under a frosted glass card — the brand's Aurora Mint palette doing the work.",
    note: "Brand-forward, no photography",
  },
  {
    id: "05",
    slug: "forest-night",
    title: "Forest night",
    blurb:
      "Dark forest ground with mint hairlines and a low glow. Inverts the gate while the signed-in app stays light.",
    note: "Matches the dark site footer",
  },
  {
    id: "06",
    slug: "editorial-masthead",
    title: "Editorial masthead",
    blurb:
      "Left-aligned magazine masthead: coral eyebrow, oversized Fraunces, hairline rules, and a small meta row under the buttons.",
    note: "Leans on existing Fraunces voice",
  },
  {
    id: "07",
    slug: "postcard",
    title: "Postcard",
    blurb:
      "The gate as a postcard — dashed deckle border, a stamp block, and a postmark ring over the corner.",
    note: "Playful, travel-native metaphor",
  },
  {
    id: "08",
    slug: "contour-map",
    title: "Contour map",
    blurb:
      "Faint topographic contour lines and a pinned coordinate marker behind a plain panel. Quiet texture, no images to load.",
    note: "Cheapest texture upgrade",
  },
  {
    id: "09",
    slug: "reel-stack",
    title: "Reel stack",
    blurb:
      "Three tilted reel cards fan out behind the gate so a first-time visitor sees what a saved post actually looks like.",
    note: "Best at explaining the product",
  },
  {
    id: "10",
    slug: "boarding-pass",
    title: "Boarding pass",
    blurb:
      "A perforated ticket with a vertical Wanderfile stub, dotted tear line, and the buttons sitting where a gate number would.",
    note: "Most distinctive silhouette",
  },
];
