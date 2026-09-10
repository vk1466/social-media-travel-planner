export const DASHBOARD_DEMOS = [
  {
    id: "01",
    slug: "shelf-first",
    title: "Shelf first",
    blurb: "Four stable shelves put every content type one click away, with the active shelf expanded below.",
    axis: "Recommended · clear · scalable",
    accent: "#e96245",
  },
  {
    id: "02",
    slug: "today-library",
    title: "Today + library",
    blurb: "A compact returning-user summary leads with recent saves and the next useful action.",
    axis: "Personal · calm · action-led",
    accent: "#246a55",
  },
  {
    id: "03",
    slug: "adaptive-rail",
    title: "Adaptive rail",
    blurb: "A desktop sidebar makes peer libraries obvious, then becomes a bottom dock on small screens.",
    axis: "Desktop · adaptive · familiar",
    accent: "#5367d8",
  },
  {
    id: "04",
    slug: "category-bento",
    title: "Category bento",
    blurb: "A visual overview balances collection totals, recent content, and shortcuts without a large hero.",
    axis: "Visual · modular · friendly",
    accent: "#ec6c48",
  },
  {
    id: "05",
    slug: "search-first",
    title: "Search first",
    blurb: "One universal search field spans posts, places, recipes, and movies; scopes stay explicit.",
    axis: "Fast · focused · command-led",
    accent: "#287b68",
  },
  {
    id: "06",
    slug: "activity-stream",
    title: "Activity stream",
    blurb: "A chronological feed mixes saves, visits, recipes, and movies with clear type markers.",
    axis: "Temporal · human · continuous",
    accent: "#b2533c",
  },
  {
    id: "07",
    slug: "split-workspace",
    title: "Split workspace",
    blurb: "A persistent preview pane keeps context visible while the left list switches between libraries.",
    axis: "Productive · contextual · spatial",
    accent: "#3974c8",
  },
  {
    id: "08",
    slug: "horizontal-shelves",
    title: "Horizontal shelves",
    blurb: "Streaming-style rows make mixed visual collections easy to skim with almost no controls.",
    axis: "Browse · relaxed · photo-led",
    accent: "#dd7251",
  },
  {
    id: "09",
    slug: "compact-index",
    title: "Compact index",
    blurb: "A dense, sortable resource list serves large libraries and keyboard-first workflows.",
    axis: "Dense · precise · efficient",
    accent: "#6558c7",
  },
  {
    id: "10",
    slug: "mobile-dock",
    title: "Mobile dock",
    blurb: "A thumb-friendly home keeps four destinations and one primary add action always reachable.",
    axis: "Mobile · direct · lightweight",
    accent: "#ec5f43",
  },
];

export function dashboardDemoFromDocument() {
  const id = document.body.dataset.demo || "01";
  return DASHBOARD_DEMOS.find((demo) => demo.id === id) || DASHBOARD_DEMOS[0];
}
