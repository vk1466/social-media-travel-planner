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
import { BROWSE_PLATFORMS } from "../postBrowseModel";
import { contentCategoryTabs } from "../contentCategory";
import { clerkEnabled } from "../authMode";
import { PlaceLibrary } from "./PlaceLibrary";
import { PostLibrary } from "./PostLibrary";
import {
  FilterBar,
  FilterChrome,
  FilterPills,
  PILL_PREVIEW_COUNT,
  SegmentGroup,
  previewPills,
} from "./library";

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
  const [pillsExpanded, setPillsExpanded] = useState(false);

  useEffect(() => {
    setPillsExpanded(false);
    setMeta(EMPTY_LIBRARY_META);
  }, [mode, postsFilters.contentCategory]);

  const handleMeta = (next: LibraryShellMeta) => {
    setMeta((prev) => (metaEqual(prev, next) ? prev : next));
  };

  const copy = LIBRARY_SHELL_COPY[mode];
  const searchValue = mode === "places" ? placesFilters.query : postsFilters.query;
  const topicTabs = contentCategoryTabs(posts);
  const travelPostFilters = mode === "posts" && postsFilters.contentCategory === "travel";

  const placePills = meta.pills.filter((pill) => pill.key !== "all");
  const placeSelected = travelPostFilters ? postsFilters.placeTypes : placesFilters.typeFilter;
  const postRest = meta.pills.filter((pill) => pill.key !== "all");
  const postVisibleRest = previewPills(
    postRest,
    postsFilters.ringKey !== "all" ? [postsFilters.ringKey] : [],
    pillsExpanded,
  );
  const placeVisible = previewPills(placePills, placeSelected, pillsExpanded);
  const typePills = mode === "places" || travelPostFilters ? placeVisible : postVisibleRest;
  const typePool = mode === "places" || travelPostFilters ? placePills : postRest;
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
        { value: "inspiration", label: "Inspiration" },
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
      ariaLabel: "Platform filter",
      selected: postsFilters.platform,
      onSelect: (value: string) => setPostsFilters((current) => ({ ...current, platform: value })),
      options: BROWSE_PLATFORMS.map((key) => ({
        value: key,
        label: key === "all" ? "Everything" : key,
      })),
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
              { value: "inspiration", label: "Inspiration" },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="lib-shell" data-mode={mode}>
      <div className="lib-shell-masthead">
        <div>
          <p className="lib-shell-eyebrow">{copy.eyebrow}</p>
          <h3>{copy.title}</h3>
          <p className="lib-shell-lede">{copy.lede}</p>
        </div>
        <div className="lib-shell-aside">
          {mode === "places" ? (
            <SegmentGroup
              ariaLabel="View mode"
              selected={placesFilters.viewMode}
              onSelect={(value) =>
                setPlacesFilters((current) => ({
                  ...current,
                  viewMode: value as PlacesShellFilters["viewMode"],
                }))
              }
              options={[
                { value: "covers", label: "Covers" },
                { value: "map", label: "Map" },
              ]}
            />
          ) : (
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
          )}
          <div className="lib-shell-count">
            <span className="lib-shell-count-value">{meta.count || "—"}</span>
            <span className="lib-shell-count-label">{meta.countLabel}</span>
          </div>
        </div>
      </div>

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
        />
        <FilterPills
          allLabel={
            mode === "places" ? copy.pillAll : travelPostFilters ? "All types" : "All saves"
          }
          pills={typePills}
          selectedKeys={selectedFacetKeys}
          multi={mode === "places" || travelPostFilters}
          ariaLabel="Library filters"
          moreLabel={
            typePool.length > PILL_PREVIEW_COUNT
              ? pillsExpanded
                ? "Show less"
                : `+${Math.max(typePool.length - typePills.length, 0)} more`
              : undefined
          }
          onMore={() => setPillsExpanded((value) => !value)}
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
      </FilterChrome>

      <div className="lib-shell-core">
        {mode === "places" ? (
          <PlaceLibrary
            authReady={authReady}
            omitChrome
            filters={placesFilters}
            onMeta={handleMeta}
            onNavigateToPost={onNavigateToPost}
            placeBasePath={placeBasePath}
            listPath={placeListPath}
          />
        ) : loadingPosts ? (
          <p className="loading-copy" style={{ padding: "1rem 24px" }}>
            Loading saved posts…
          </p>
        ) : (
          <PostLibrary
            posts={posts}
            places={places}
            omitChrome
            filters={postsFilters}
            onMeta={handleMeta}
            onDeleted={onDeleted}
            onNavigateToPlace={onNavigateToPlace}
          />
        )}
      </div>
    </div>
  );
}
