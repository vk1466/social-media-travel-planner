import type { AtlasGrouping } from "./placeAtlasModel";

export type LibraryMode = "places" | "posts";

export type PlacesStatusFilter = "all" | "visited" | "inspiration";
export type PlacesViewMode = "covers" | "map";
export type PostsDeckMode = "deck" | "grid";
export type PostsDateMode = "saved" | "posted";

export interface PlacesShellFilters {
  statusFilter: PlacesStatusFilter;
  grouping: AtlasGrouping;
  typeFilter: string[];
  query: string;
  viewMode: PlacesViewMode;
}

export interface PostsShellFilters {
  platform: string;
  ringKey: string;
  query: string;
  deckMode: PostsDeckMode;
  dateMode: PostsDateMode;
  contentCategory: string;
  placeStatus: PlacesStatusFilter;
  placeTypes: string[];
}

export interface LibraryShellPill {
  key: string;
  label: string;
  count?: number;
}

export interface LibraryShellMeta {
  count: number;
  countLabel: string;
  context: string;
  pills: LibraryShellPill[];
}

export const DEFAULT_PLACES_FILTERS: PlacesShellFilters = {
  statusFilter: "all",
  grouping: "region",
  typeFilter: [],
  query: "",
  viewMode: "covers",
};

export const DEFAULT_POSTS_FILTERS: PostsShellFilters = {
  platform: "all",
  ringKey: "all",
  query: "",
  deckMode: "deck",
  dateMode: "saved",
  contentCategory: "all",
  placeStatus: "all",
  placeTypes: [],
};

export const EMPTY_LIBRARY_META: LibraryShellMeta = {
  count: 0,
  countLabel: "",
  context: "",
  pills: [],
};

export const LIBRARY_SHELL_COPY = {
  places: {
    eyebrow: "Your atlas",
    title: "Places",
    lede: "Everywhere your saves point to — filters stay put, only the atlas body changes.",
    searchPlaceholder: "Find a place…",
    searchLabel: "Search places",
    pillAll: "All types",
    viewA: { key: "covers" as const, label: "Covers" },
    viewB: { key: "map" as const, label: "Map" },
  },
  posts: {
    eyebrow: "Your library",
    title: "Posts",
    lede: "Every reel and save — group by the month you saved it, or when it originally posted.",
    searchPlaceholder: "Title, place, tag…",
    searchLabel: "Search saves",
    pillAll: "All saves",
    viewA: { key: "deck" as const, label: "Deck" },
    viewB: { key: "grid" as const, label: "Grid" },
  },
} as const;

export const PILL_PREVIEW_COUNT = 5;
