import { useEffect, useState, type JSX } from "react";
import { SignInButton } from "@clerk/react";

import type { Place, SavedPost } from "../api";
import {
  DEFAULT_PLACES_FILTERS,
  DEFAULT_POSTS_FILTERS,
  EMPTY_LIBRARY_META,
  LIBRARY_SHELL_COPY,
  PILL_PREVIEW_COUNT,
  type LibraryMode,
  type LibraryShellMeta,
  type LibraryShellPill,
  type PlacesShellFilters,
  type PostsShellFilters,
} from "../libraryShellModel";
import { BROWSE_PLATFORMS } from "../postBrowseModel";
import { contentCategoryTabs } from "../contentCategory";
import { clerkEnabled } from "../authMode";
import { PlaceLibrary } from "./PlaceLibrary";
import { PostLibrary } from "./PostLibrary";

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
}

function visiblePills(
  pills: LibraryShellPill[],
  selectedKeys: string[],
  expanded: boolean,
): LibraryShellPill[] {
  if (expanded || pills.length <= PILL_PREVIEW_COUNT) {
    return pills;
  }
  const top = pills.slice(0, PILL_PREVIEW_COUNT);
  const topKeys = new Set(top.map((pill) => pill.key));
  const selectedExtra = pills.filter(
    (pill) => selectedKeys.includes(pill.key) && !topKeys.has(pill.key),
  );
  return [...top, ...selectedExtra];
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

  const placePills = meta.pills;
  const placeSelected = travelPostFilters ? postsFilters.placeTypes : placesFilters.typeFilter;
  const postLead = meta.pills.filter((pill) => pill.key === "all");
  const postRest = meta.pills.filter((pill) => pill.key !== "all");
  const postVisibleRest = visiblePills(
    postRest,
    postsFilters.ringKey !== "all" ? [postsFilters.ringKey] : [],
    pillsExpanded,
  );
  const placeVisible = visiblePills(placePills, placeSelected, pillsExpanded);

  function setSearch(value: string) {
    if (mode === "places") {
      setPlacesFilters((current) => ({ ...current, query: value }));
    } else {
      setPostsFilters((current) => ({ ...current, query: value }));
    }
  }

  return (
    <div className="lib-shell" data-mode={mode}>
      <div className="lib-shell-masthead">
        <div>
          <p className="lib-shell-eyebrow">{copy.eyebrow}</p>
          <h3>{copy.title}</h3>
          <p className="lib-shell-lede">{copy.lede}</p>
        </div>
        <div className="lib-shell-aside">
          <div className="wf-seg wf-seg--view" role="group" aria-label="View mode">
            {mode === "places" ? (
              <>
                <button
                  type="button"
                  className={placesFilters.viewMode === "covers" ? "is-active" : ""}
                  onClick={() =>
                    setPlacesFilters((current) => ({ ...current, viewMode: "covers" }))
                  }
                >
                  Covers
                </button>
                <button
                  type="button"
                  className={placesFilters.viewMode === "map" ? "is-active" : ""}
                  onClick={() =>
                    setPlacesFilters((current) => ({ ...current, viewMode: "map" }))
                  }
                >
                  Map
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={postsFilters.deckMode === "deck" ? "is-active" : ""}
                  onClick={() =>
                    setPostsFilters((current) => ({ ...current, deckMode: "deck" }))
                  }
                >
                  Deck
                </button>
                <button
                  type="button"
                  className={postsFilters.deckMode === "grid" ? "is-active" : ""}
                  onClick={() =>
                    setPostsFilters((current) => ({ ...current, deckMode: "grid" }))
                  }
                >
                  Grid
                </button>
              </>
            )}
          </div>
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

      <div className="lib-shell-facets">
        <div className="lib-shell-toolbar">
          <label className="lib-shell-search">
            <input
              type="search"
              value={searchValue}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchLabel}
            />
          </label>

          {mode === "places" ? (
            <>
              <div
                className="wf-seg wf-seg--soft"
                role="group"
                aria-label="Status filter"
              >
                {(["all", "visited", "inspiration"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={placesFilters.statusFilter === key ? "is-active" : ""}
                    onClick={() =>
                      setPlacesFilters((current) => ({ ...current, statusFilter: key }))
                    }
                  >
                    {key === "all" ? "Everything" : key === "visited" ? "Visited" : "Inspiration"}
                  </button>
                ))}
              </div>
              <div
                className="wf-seg wf-seg--soft"
                role="group"
                aria-label="Grouping"
              >
                <button
                  type="button"
                  className={placesFilters.grouping === "region" ? "is-active" : ""}
                  onClick={() =>
                    setPlacesFilters((current) => ({ ...current, grouping: "region" }))
                  }
                >
                  Region
                </button>
                <button
                  type="button"
                  className={placesFilters.grouping === "type" ? "is-active" : ""}
                  onClick={() =>
                    setPlacesFilters((current) => ({ ...current, grouping: "type" }))
                  }
                >
                  Type
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className="wf-seg wf-seg--soft"
                role="group"
                aria-label="Category filter"
              >
                <button
                  type="button"
                  className={postsFilters.contentCategory === "all" ? "is-active" : ""}
                  onClick={() =>
                    setPostsFilters((current) => ({
                      ...current,
                      contentCategory: "all",
                      ringKey: "all",
                      placeStatus: "all",
                      placeTypes: [],
                    }))
                  }
                >
                  All
                </button>
                {topicTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={postsFilters.contentCategory === tab.key ? "is-active" : ""}
                    onClick={() =>
                      setPostsFilters((current) => ({
                        ...current,
                        contentCategory: tab.key,
                        ringKey: "all",
                        placeStatus: "all",
                        placeTypes: [],
                      }))
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div
                className="wf-seg wf-seg--soft"
                role="group"
                aria-label="Platform filter"
              >
                {BROWSE_PLATFORMS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={postsFilters.platform === key ? "is-active" : ""}
                    onClick={() =>
                      setPostsFilters((current) => ({ ...current, platform: key }))
                    }
                  >
                    {key === "all" ? "Everything" : key}
                  </button>
                ))}
              </div>
              <div
                className="wf-seg wf-seg--soft"
                role="group"
                aria-label="Timeline"
              >
                <button
                  type="button"
                  className={postsFilters.dateMode === "saved" ? "is-active" : ""}
                  onClick={() =>
                    setPostsFilters((current) => ({ ...current, dateMode: "saved" }))
                  }
                >
                  Saved
                </button>
                <button
                  type="button"
                  className={postsFilters.dateMode === "posted" ? "is-active" : ""}
                  onClick={() =>
                    setPostsFilters((current) => ({ ...current, dateMode: "posted" }))
                  }
                >
                  Posted
                </button>
              </div>
              {travelPostFilters ? (
                <div
                  className="wf-seg wf-seg--soft"
                  role="group"
                  aria-label="Place status"
                >
                  {(["all", "visited", "inspiration"] as const).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={postsFilters.placeStatus === key ? "is-active" : ""}
                      onClick={() =>
                        setPostsFilters((current) => ({ ...current, placeStatus: key }))
                      }
                    >
                      {key === "all" ? "Everything" : key === "visited" ? "Visited" : "Inspiration"}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div className="lib-shell-pills" role="group" aria-label="Library filters">
          {mode === "places" ? (
            <>
              <button
                type="button"
                className={`lib-shell-pill ${
                  placesFilters.typeFilter.length === 0 ? "is-active is-soft" : ""
                }`}
                onClick={() =>
                  setPlacesFilters((current) => ({ ...current, typeFilter: [] }))
                }
              >
                {copy.pillAll}
              </button>
              {placeVisible.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  className={`lib-shell-pill ${
                    placesFilters.typeFilter.includes(pill.key) ? "is-active" : ""
                  }`}
                  onClick={() =>
                    setPlacesFilters((current) => ({
                      ...current,
                      typeFilter: current.typeFilter.includes(pill.key)
                        ? current.typeFilter.filter((entry) => entry !== pill.key)
                        : [...current.typeFilter, pill.key],
                    }))
                  }
                >
                  {pill.label}
                  {pill.count != null ? <span className="count">{pill.count}</span> : null}
                </button>
              ))}
              {placePills.length > PILL_PREVIEW_COUNT ? (
                <button
                  type="button"
                  className="lib-shell-pill lib-shell-pill-more"
                  onClick={() => setPillsExpanded((value) => !value)}
                >
                  {pillsExpanded
                    ? "Show less"
                    : `+${Math.max(placePills.length - placeVisible.length, 0)} more`}
                </button>
              ) : null}
            </>
          ) : travelPostFilters ? (
            <>
              <button
                type="button"
                className={`lib-shell-pill ${
                  postsFilters.placeTypes.length === 0 ? "is-active is-soft" : ""
                }`}
                onClick={() =>
                  setPostsFilters((current) => ({ ...current, placeTypes: [] }))
                }
              >
                All types
              </button>
              {placeVisible.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  className={`lib-shell-pill ${
                    postsFilters.placeTypes.includes(pill.key) ? "is-active" : ""
                  }`}
                  onClick={() =>
                    setPostsFilters((current) => ({
                      ...current,
                      placeTypes: current.placeTypes.includes(pill.key)
                        ? current.placeTypes.filter((entry) => entry !== pill.key)
                        : [...current.placeTypes, pill.key],
                    }))
                  }
                >
                  {pill.label}
                  {pill.count != null ? <span className="count">{pill.count}</span> : null}
                </button>
              ))}
              {placePills.length > PILL_PREVIEW_COUNT ? (
                <button
                  type="button"
                  className="lib-shell-pill lib-shell-pill-more"
                  onClick={() => setPillsExpanded((value) => !value)}
                >
                  {pillsExpanded
                    ? "Show less"
                    : `+${Math.max(placePills.length - placeVisible.length, 0)} more`}
                </button>
              ) : null}
            </>
          ) : (
            <>
              {postLead.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  className={`lib-shell-pill is-soft ${
                    postsFilters.ringKey === pill.key ? "is-active" : ""
                  }`}
                  onClick={() =>
                    setPostsFilters((current) => ({ ...current, ringKey: pill.key }))
                  }
                >
                  {pill.label}
                  {pill.count != null ? <span className="count">{pill.count}</span> : null}
                </button>
              ))}
              {postVisibleRest.map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  className={`lib-shell-pill ${
                    postsFilters.ringKey === pill.key ? "is-active" : ""
                  }`}
                  onClick={() =>
                    setPostsFilters((current) => ({ ...current, ringKey: pill.key }))
                  }
                >
                  {pill.label}
                  {pill.count != null ? <span className="count">{pill.count}</span> : null}
                </button>
              ))}
              {postRest.length > PILL_PREVIEW_COUNT ? (
                <button
                  type="button"
                  className="lib-shell-pill lib-shell-pill-more"
                  onClick={() => setPillsExpanded((value) => !value)}
                >
                  {pillsExpanded
                    ? "Show less"
                    : `+${Math.max(postRest.length - postVisibleRest.length, 0)} more`}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>

      <div className="lib-shell-core">
        {mode === "places" ? (
          <PlaceLibrary
            authReady={authReady}
            omitChrome
            filters={placesFilters}
            onMeta={handleMeta}
            onNavigateToPost={onNavigateToPost}
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
