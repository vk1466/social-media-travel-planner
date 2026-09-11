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
  platforms: string[];
}

export interface PostsShellFilters {
  platforms: string[];
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
  platforms: [],
};

export const DEFAULT_POSTS_FILTERS: PostsShellFilters = {
  platforms: [],
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
    eyebrow: "Places from your saves",
    title: "Places to go",
    lede: "Browse every place we found, mark where you’ve been, and turn the rest into a trip.",
    searchPlaceholder: "Search places",
    searchLabel: "Search places",
    pillAll: "All types",
    viewA: { key: "covers" as const, label: "Covers" },
    viewB: { key: "map" as const, label: "Map" },
  },
  posts: {
    eyebrow: "Saved inspiration",
    title: "All saves",
    lede: "Everything you saved from social and the web, in one searchable library.",
    searchPlaceholder: "Search saves",
    searchLabel: "Search saves",
    pillAll: "All saves",
    viewA: { key: "deck" as const, label: "Deck" },
    viewB: { key: "grid" as const, label: "Grid" },
  },
} as const;

export const PILL_PREVIEW_COUNT = 5;
