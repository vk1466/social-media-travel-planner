import { useEffect, useState, type JSX } from "react";
import { SignInButton } from "@clerk/react";

import type { Place, SavedPost } from "../api";
import {
  DEFAULT_PLACES_FILTERS,
  DEFAULT_POSTS_FILTERS,
  EMPTY_LIBRARY_META,
  LIBRARY_SHELL_COPY,
  type LibraryMode,
  type LibraryShellMeta,
  type PlacesShellFilters,
  type PostsShellFilters,
} from "../libraryShellModel";
import { contentCategoryTabs } from "../contentCategory";
import { clerkEnabled } from "../authMode";
import { PlaceLibrary } from "./PlaceLibrary";
import { PostLibrary } from "./PostLibrary";
import { PageHeading } from "./PageHeading";
import { FilterBar, FilterChrome, FilterPills, SegmentGroup } from "./library";
import { useLibraryPlatform } from "../libraryPlatform";

import "../library-shell.css";

export interface LibraryShellProps {
  mode: LibraryMode;
  authReady: boolean;
  posts: SavedPost[];
  places: Place[];
  loadingPosts: boolean;
  onDeleted: () => void;
  onNavigateToPlace: (placeId: string) => void;
  onNavigateToPost: (platform: string, postId: string) => void;
  placeBasePath?: string;
  placeListPath?: string;
}

function metaEqual(a: LibraryShellMeta, b: LibraryShellMeta): boolean {
  if (
    a.count !== b.count ||
    a.countLabel !== b.countLabel ||
    a.context !== b.context ||
    a.pills.length !== b.pills.length
  ) {
    return false;
  }
  return a.pills.every(
    (pill, index) =>
      pill.key === b.pills[index]?.key &&
      pill.label === b.pills[index]?.label &&
      pill.count === b.pills[index]?.count,
  );
}

function MapViewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

function CoversViewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="6" height="14" rx="1.5" />
      <rect x="12" y="5" width="8" height="6" rx="1.5" />
      <rect x="12" y="13" width="8" height="6" rx="1.5" />
    </svg>
  );
}

/** Shared Places/Posts chrome — only the atlas/lantern core swaps. */
export function LibraryShell({
  mode,
  authReady,
  posts,
  places,
  loadingPosts,
  onDeleted,
  onNavigateToPlace,
  onNavigateToPost,
  placeBasePath,
  placeListPath,
}: LibraryShellProps): JSX.Element {
  const [placesFilters, setPlacesFilters] = useState<PlacesShellFilters>(DEFAULT_PLACES_FILTERS);
  const [postsFilters, setPostsFilters] = useState<PostsShellFilters>(DEFAULT_POSTS_FILTERS);
  const [meta, setMeta] = useState<LibraryShellMeta>(EMPTY_LIBRARY_META);
  const { platforms } = useLibraryPlatform();

  useEffect(() => {
    setMeta(EMPTY_LIBRARY_META);
  }, [mode, postsFilters.contentCategory]);

  const handleMeta = (next: LibraryShellMeta) => {
    setMeta((prev) => (metaEqual(prev, next) ? prev : next));
  };

  const copy = LIBRARY_SHELL_COPY[mode];
  const searchValue = mode === "places" ? placesFilters.query : postsFilters.query;
  const topicTabs = contentCategoryTabs(posts);
  const travelPostFilters = mode === "posts" && postsFilters.contentCategory === "travel";

  const typePills = meta.pills.filter((pill) => pill.key !== "all");
  const placeSelected = travelPostFilters ? postsFilters.placeTypes : placesFilters.typeFilter;
  const selectedFacetKeys =
    mode === "places" || travelPostFilters ? placeSelected : [postsFilters.ringKey];

  function setSearch(value: string) {
    if (mode === "places") {
      setPlacesFilters((current) => ({ ...current, query: value }));
    } else {
      setPostsFilters((current) => ({ ...current, query: value }));
    }
  }

  const placeGroups = [
    {
      ariaLabel: "Status filter",
      selected: placesFilters.statusFilter,
      onSelect: (value: string) =>
        setPlacesFilters((current) => ({
          ...current,
          statusFilter: value as PlacesShellFilters["statusFilter"],
        })),
      options: [
        { value: "all", label: "Everything" },
        { value: "visited", label: "Visited" },
        { value: "inspiration", label: "Want to go" },
      ],
    },
    {
      ariaLabel: "Grouping",
      selected: placesFilters.grouping,
      onSelect: (value: string) =>
        setPlacesFilters((current) => ({
          ...current,
          grouping: value as PlacesShellFilters["grouping"],
        })),
      options: [
        { value: "region", label: "Region" },
        { value: "type", label: "Type" },
      ],
    },
  ];

  const postGroups = [
    {
      ariaLabel: "Category filter",
      selected: postsFilters.contentCategory,
      onSelect: (value: string) =>
        setPostsFilters((current) => ({
          ...current,
          contentCategory: value,
          ringKey: "all",
          placeStatus: "all" as const,
          placeTypes: [],
        })),
      options: [
        { value: "all", label: "All" },
        ...topicTabs.map((tab) => ({ value: tab.key, label: tab.label })),
      ],
    },
    {
      ariaLabel: "Timeline",
      selected: postsFilters.dateMode,
      onSelect: (value: string) =>
        setPostsFilters((current) => ({
          ...current,
          dateMode: value as PostsShellFilters["dateMode"],
        })),
      options: [
        { value: "saved", label: "Saved" },
        { value: "posted", label: "Posted" },
      ],
    },
    ...(travelPostFilters
      ? [
          {
            ariaLabel: "Place status",
            selected: postsFilters.placeStatus,
            onSelect: (value: string) =>
              setPostsFilters((current) => ({
                ...current,
                placeStatus: value as PostsShellFilters["placeStatus"],
              })),
            options: [
              { value: "all", label: "Everything" },
              { value: "visited", label: "Visited" },
              { value: "inspiration", label: "Want to go" },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="lib-shell" data-mode={mode}>
      <PageHeading
        kicker={copy.eyebrow}
        title={copy.title}
        lede={copy.lede}
        count={{ value: meta.count || "—", label: meta.countLabel }}
        aside={
          mode === "posts" ? (
            <SegmentGroup
              ariaLabel="View mode"
              selected={postsFilters.deckMode}
              onSelect={(value) =>
                setPostsFilters((current) => ({
                  ...current,
                  deckMode: value as PostsShellFilters["deckMode"],
                }))
              }
              options={[
                { value: "deck", label: "Deck" },
                { value: "grid", label: "Grid" },
              ]}
            />
          ) : null
        }
      />

      {!authReady ? (
        <div className="lib-shell-banner">
          <span>
            <strong>Sign in</strong> · Load your atlas and saves with the same Clerk account.
          </span>
          {clerkEnabled ? (
            <SignInButton mode="modal">
              <button type="button">Sign in</button>
            </SignInButton>
          ) : null}
        </div>
      ) : null}

      <FilterChrome>
        <FilterBar
          placeholder={copy.searchPlaceholder}
          query={searchValue}
          onQuery={setSearch}
          groups={mode === "places" ? placeGroups : postGroups}
          trailing={
            <FilterPills
              allLabel={
                mode === "places" ? copy.pillAll : travelPostFilters ? "All types" : "All saves"
              }
              allCount={meta.count}
              pills={typePills}
              selectedKeys={selectedFacetKeys}
              multi={mode === "places" || travelPostFilters}
              ariaLabel="Library filters"
              onSelect={(key) => {
                if (mode === "places") {
                  if (key === "all") {
                    setPlacesFilters((current) => ({ ...current, typeFilter: [] }));
                    return;
                  }
                  setPlacesFilters((current) => ({
                    ...current,
                    typeFilter: current.typeFilter.includes(key)
                      ? current.typeFilter.filter((entry) => entry !== key)
                      : [...current.typeFilter, key],
                  }));
                  return;
                }
                if (travelPostFilters) {
                  if (key === "all") {
                    setPostsFilters((current) => ({ ...current, placeTypes: [] }));
                    return;
                  }
                  setPostsFilters((current) => ({
                    ...current,
                    placeTypes: current.placeTypes.includes(key)
                      ? current.placeTypes.filter((entry) => entry !== key)
                      : [...current.placeTypes, key],
                  }));
                  return;
                }
                setPostsFilters((current) => ({ ...current, ringKey: key }));
              }}
            />
          }
        />
      </FilterChrome>

      <div className="lib-shell-core">
        {mode === "places" ? (
          <>
            <button
              type="button"
              className="lib-shell-map-peek"
              onClick={() =>
                setPlacesFilters((current) => ({
                  ...current,
                  query: "",
                  viewMode: current.viewMode === "covers" ? "map" : "covers",
                }))
              }
            >
              {placesFilters.viewMode === "covers" ? <MapViewIcon /> : <CoversViewIcon />}
              <span>{placesFilters.viewMode === "covers" ? "View map" : "View covers"}</span>
            </button>
            <PlaceLibrary
              authReady={authReady}
              omitChrome
              filters={{ ...placesFilters, platforms }}
              onMeta={handleMeta}
              onNavigateToPost={onNavigateToPost}
              placeBasePath={placeBasePath}
              listPath={placeListPath}
            />
          </>
        ) : loadingPosts ? (
          <p className="loading-copy" style={{ padding: "1rem 24px" }}>
            Loading saved posts…
          </p>
        ) : (
          <PostLibrary
            posts={posts}
            places={places}
            omitChrome
            filters={{ ...postsFilters, platforms }}
            onMeta={handleMeta}
            onDeleted={onDeleted}
            onNavigateToPlace={onNavigateToPlace}
          />
        )}
      </div>
    </div>
  );
}
