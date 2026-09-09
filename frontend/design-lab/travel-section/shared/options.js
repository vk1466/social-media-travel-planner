export const TRAVEL_DEMOS = [
  {
    id: "01",
    slug: "atlas-split",
    title: "Atlas split",
    blurb: "A calm map-and-library workspace with the next useful action always visible.",
    axis: "Map first · balanced · spatial",
    accent: "#276859",
  },
  {
    id: "02",
    slug: "bento-planner",
    title: "Bento planner",
    blurb: "Places, saves, visits, and imports become a compact set of task-oriented tiles.",
    axis: "Bento · modular · friendly",
    accent: "#f05a3c",
  },
  {
    id: "03",
    slug: "travel-journal",
    title: "Travel journal",
    blurb: "Editorial hierarchy gives memories and inspiration equal weight without adding clutter.",
    axis: "Editorial · warm · reflective",
    accent: "#b65335",
  },
  {
    id: "04",
    slug: "map-canvas",
    title: "Map canvas",
    blurb: "The atlas fills the stage while filters and library switching float above it.",
    axis: "Immersive · map-first · direct",
    accent: "#2367d1",
  },
  {
    id: "05",
    slug: "pocket-itinerary",
    title: "Pocket itinerary",
    blurb: "A mobile-minded stack with thumb-friendly controls and a persistent action dock.",
    axis: "Mobile first · compact · tactile",
    accent: "#ff6b46",
  },
  {
    id: "06",
    slug: "command-center",
    title: "Command center",
    blurb: "A precise sidebar workspace for larger libraries and frequent filtering.",
    axis: "Productivity · dense · systematic",
    accent: "#6d5ce7",
  },
  {
    id: "07",
    slug: "journey-line",
    title: "Journey line",
    blurb: "A route-like vertical rhythm connects inspiration, planning, and past visits.",
    axis: "Timeline · narrative · clear",
    accent: "#137c68",
  },
  {
    id: "08",
    slug: "postcard-stack",
    title: "Postcard stack",
    blurb: "A playful photo-led library that still keeps filters and status legible.",
    axis: "Visual · human · collectible",
    accent: "#e4472d",
  },
  {
    id: "09",
    slug: "nordic-utility",
    title: "Nordic utility",
    blurb: "Near-monochrome surfaces, disciplined spacing, and one cool blue signal color.",
    axis: "Minimal · quiet · efficient",
    accent: "#3267d6",
  },
  {
    id: "10",
    slug: "night-flight",
    title: "Night flight",
    blurb: "Dark, cinematic navigation with bright status signals and subdued imagery.",
    axis: "Dark · focused · atmospheric",
    accent: "#edb95b",
  },
];

export function demoFromDocument() {
  const id = document.body.dataset.demo || "01";
  return TRAVEL_DEMOS.find((demo) => demo.id === id) || TRAVEL_DEMOS[0];
}
