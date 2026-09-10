export const PAGE_DEMOS = [
  { id: "01", slug: "top-tabs", title: "Top tabs", blurb: "A quiet global header with five stable category pages.", axis: "Recommended · familiar · balanced", accent: "#e76548" },
  { id: "02", slug: "library-sidebar", title: "Library sidebar", blurb: "A persistent labeled sidebar for fast switching on desktop.", axis: "Scalable · explicit · desktop", accent: "#2a705c" },
  { id: "03", slug: "icon-rail", title: "Icon rail", blurb: "Compact navigation leaves more room for visual collections.", axis: "Compact · spatial · adaptive", accent: "#5269d8" },
  { id: "04", slug: "category-portals", title: "Category portals", blurb: "A home hub introduces each collection before opening its page.", axis: "Guided · visual · friendly", accent: "#e56f4f" },
  { id: "05", slug: "editorial-sections", title: "Editorial sections", blurb: "Distinct page mastheads give each collection an expressive identity.", axis: "Editorial · warm · memorable", accent: "#b4583f" },
  { id: "06", slug: "command-navigation", title: "Command navigation", blurb: "Universal search and a compact switcher minimize permanent chrome.", axis: "Fast · minimal · keyboard-led", accent: "#247b68" },
  { id: "07", slug: "workspace-bar", title: "Workspace bar", blurb: "A product-style sidebar and contextual toolbar support heavier use.", axis: "Productive · dense · systematic", accent: "#3975c9" },
  { id: "08", slug: "floating-dock", title: "Floating dock", blurb: "Content leads while a floating dock keeps every page within reach.", axis: "Immersive · visual · modern", accent: "#eb7655" },
  { id: "09", slug: "breadcrumb-library", title: "Library breadcrumb", blurb: "A compact hierarchy emphasizes where each category sits in the library.", axis: "Structured · calm · precise", accent: "#6759c6" },
  { id: "10", slug: "mobile-tabs", title: "Mobile tabs", blurb: "Bottom navigation gives every category a stable, thumb-friendly page.", axis: "Mobile · direct · persistent", accent: "#ec6045" },
];

export const PAGE_CATEGORIES = [
  { key: "home", label: "Home", icon: "⌂", count: "" },
  { key: "posts", label: "Posts", icon: "▦", count: "126" },
  { key: "travel", label: "Travel", icon: "⌖", count: "48" },
  { key: "food", label: "Food", icon: "◒", count: "31" },
  { key: "movies", label: "Movies", icon: "▶", count: "17" },
  { key: "history", label: "History", icon: "◷", count: "24" },
];

export function activePageDemo() {
  return PAGE_DEMOS.find((item) => item.id === document.body.dataset.demo) || PAGE_DEMOS[0];
}

export function activePageCategory() {
  return PAGE_CATEGORIES.find((item) => item.key === document.body.dataset.category) || PAGE_CATEGORIES[0];
}
