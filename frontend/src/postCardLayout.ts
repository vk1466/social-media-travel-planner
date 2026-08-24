/** Lab layouts for the post detail card — horizontal snap rail + live map. */

export const POST_CARD_LAYOUTS = [
  {
    id: "sheets",
    number: "01",
    name: "Place sheets",
    summary: "Swipeable cards under a live map.",
  },
  {
    id: "guide",
    number: "02",
    name: "Field guide",
    summary: "Editorial type on each snapped stop.",
  },
  {
    id: "route",
    number: "03",
    name: "Route board",
    summary: "Taller map, numbered stops in a rail.",
  },
  {
    id: "notes",
    number: "04",
    name: "Field notes",
    summary: "Compact notebook slides, smaller map.",
  },
  {
    id: "index",
    number: "05",
    name: "Stop index",
    summary: "Narrower cards; denser peek of the next stop.",
  },
  {
    id: "gmaps",
    number: "06",
    name: "Maps card",
    summary: "Large map, directions pill, Google-style sheet.",
  },
  {
    id: "timeline",
    number: "07",
    name: "Trail timeline",
    summary: "Numbered stops as a horizontal sequence.",
  },
  {
    id: "brief",
    number: "08",
    name: "Trip brief",
    summary: "Pager + map + full detail on each slide.",
  },
  {
    id: "split",
    number: "09",
    name: "Locator split",
    summary: "Wider slides so more copy sits beside the map.",
  },
  {
    id: "atlas",
    number: "10",
    name: "Scroll atlas",
    summary: "Tall map, compact dossier cards.",
  },
] as const;

export type PostCardLayoutId = (typeof POST_CARD_LAYOUTS)[number]["id"];

const STORAGE_KEY = "wf-post-card-layout";

function isLayoutId(value: string | null): value is PostCardLayoutId {
  return POST_CARD_LAYOUTS.some((layout) => layout.id === value);
}

export function readPostCardLayout(): PostCardLayoutId {
  if (typeof window === "undefined") {
    return "gmaps";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return isLayoutId(stored) ? stored : "gmaps";
}

export function storePostCardLayout(id: PostCardLayoutId): PostCardLayoutId {
  window.localStorage.setItem(STORAGE_KEY, id);
  return id;
}
