import { useEffect, useMemo, useRef, type JSX } from "react";
import { useSearchParams } from "react-router-dom";

import { type Place, type SavedPost } from "../api";
import {
  CATEGORY_NATIVE_VIEWS,
  CONTENT_CATEGORY_KICKERS,
  CONTENT_CATEGORY_LABELS,
  contentCategoryTabs,
  effectiveContentCategory,
  type ContentCategory,
  type ContentCategoryTab,
} from "../contentCategory";
import { LibraryShell } from "./LibraryShell";
import { HomeBento } from "./HomeBento";

import "../home-page.css";

export interface SavedPageProps {
  posts: SavedPost[];
  places: Place[];
  visitCount: number;
  authReady: boolean;
  loadingPosts: boolean;
  onDeleted: () => void;
  onNavigateToPlace: (placeId: string) => void;
  onNavigateToPost: (platform: string, postId: string) => void;
}

type SavedTabKey = "posts" | ContentCategory;

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function hasNativeView(key: SavedTabKey): key is ContentCategory {
  return key !== "posts" && CATEGORY_NATIVE_VIEWS.has(key);
}

function withTravelIfPlaces(
  tabs: ContentCategoryTab[],
  placeCount: number,
): ContentCategoryTab[] {
  if (placeCount === 0 || tabs.some((tab) => tab.key === "travel")) {
    return tabs;
  }
  return [
    ...tabs,
    {
      key: "travel",
      label: CONTENT_CATEGORY_LABELS.travel,
      kicker: CONTENT_CATEGORY_KICKERS.travel,
      count: 0,
    },
  ];
}

export function SavedPage({
  posts,
  places,
  visitCount,
  authReady,
  loadingPosts,
  onDeleted,
  onNavigateToPlace,
  onNavigateToPost,
}: SavedPageProps): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);
  const categoryTabs = useMemo(
    () => withTravelIfPlaces(contentCategoryTabs(posts), places.length),
    [posts, places.length],
  );
  const openParam = searchParams.get("open") === "places" ? "travel" : searchParams.get("open");
  const showParam = searchParams.get("show");
  const validKeys = useMemo(() => {
    const keys = new Set<SavedTabKey>(["posts"]);
    for (const tab of categoryTabs) keys.add(tab.key);
    return keys;
  }, [categoryTabs]);
  const selected: SavedTabKey =
    openParam && validKeys.has(openParam as SavedTabKey)
      ? (openParam as SavedTabKey)
      : "posts";
  const showRelatedPosts = hasNativeView(selected) && showParam === "posts";
  const libraryMode = selected === "posts" || showRelatedPosts || !hasNativeView(selected)
    ? "posts"
    : "places";

  useEffect(() => {
    if (!authReady) return;
    if (openParam && validKeys.has(openParam as SavedTabKey)) return;
    setSearchParams({ open: "posts" }, { replace: true });
  }, [authReady, validKeys, openParam, setSearchParams]);

  const selectedRef = useRef<string | null>(null);
  const selectionKey = `${selected}:${showRelatedPosts ? "posts" : "native"}`;

  useEffect(() => {
    if (!panelRef.current) return;
    if (selectedRef.current === null) {
      selectedRef.current = selectionKey;
      return;
    }
    if (selectedRef.current === selectionKey) return;
    selectedRef.current = selectionKey;
    panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectionKey]);

  const categoryPosts = useMemo(() => {
    if (selected === "posts") return posts;
    return posts.filter((post) => effectiveContentCategory(post) === selected);
  }, [posts, selected]);

  function openTab(key: SavedTabKey) {
    setSearchParams({ open: key }, { replace: true });
  }

  function setCategoryShow(showPosts: boolean) {
    if (selected === "posts") return;
    if (showPosts) {
      setSearchParams({ open: selected, show: "posts" }, { replace: true });
    } else {
      setSearchParams({ open: selected }, { replace: true });
    }
  }

  const postsOn = selected === "posts";
  const postsMeta = authReady
    ? `${posts.length} ${pluralize(posts.length, "save", "saves")}`
    : "Sign in to open your saves";

  return (
    <div className="home">
      <HomeBento
        posts={posts}
        visitCount={visitCount}
        authReady={authReady}
        savedCount={posts.length}
      />

      <section className="home-library" aria-labelledby="home-library-title">
        <div className="home-library-head">
          <p className="home-library-eyebrow">Your library</p>
          <h2 id="home-library-title">Open a shelf</h2>
          <p>All saves first, then shelves by topic — busiest category leads.</p>
        </div>

        <div className="home-tabs home-tabs--saved" role="tablist" aria-label="Saved shelves">
          <button
            type="button"
            role="tab"
            id="tab-saved-posts"
            className={`home-tab home-tab--posts${postsOn ? " is-on" : ""}`}
            aria-selected={postsOn}
            aria-controls="panel-library"
            onClick={() => openTab("posts")}
          >
            <span className="home-tab-kicker">Lantern</span>
            <span className="home-tab-title">Posts</span>
            <span className="home-tab-meta">{postsMeta}</span>
            <span className="home-tab-cta">{postsOn ? "Showing saves ↓" : "Show saves ↓"}</span>
          </button>
          {categoryTabs.map((tab, index) => {
            const isOn = selected === tab.key;
            const native = hasNativeView(tab.key);
            const tone = native || index % 2 === 1 ? "places" : "posts";
            const showingNative = isOn && native && !showRelatedPosts;
            const meta = native
              ? authReady
                ? `${places.length} ${pluralize(places.length, "place", "places")} · ${tab.count} ${pluralize(tab.count, "save", "saves")}`
                : "Sign in to open this shelf"
              : authReady
                ? `${tab.count} ${pluralize(tab.count, "save", "saves")}`
                : "Sign in to open your saves";
            const cta = native
              ? showingNative
                ? "Showing atlas ↓"
                : isOn
                  ? "Showing saves ↓"
                  : "Show atlas ↓"
              : isOn
                ? "Showing saves ↓"
                : "Show saves ↓";
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                id={`tab-saved-${tab.key}`}
                className={`home-tab home-tab--${tone}${isOn ? " is-on" : ""}`}
                aria-selected={isOn}
                aria-controls="panel-library"
                onClick={() => openTab(tab.key)}
              >
                <span className="home-tab-kicker">{tab.kicker}</span>
                <span className="home-tab-title">{tab.label}</span>
                <span className="home-tab-meta">{meta}</span>
                <span className="home-tab-cta">{cta}</span>
              </button>
            );
          })}
        </div>

        {hasNativeView(selected) ? (
          <div className="saved-view-toggle lib-shell-seg" role="group" aria-label="Category view">
            <button
              type="button"
              className={!showRelatedPosts ? "is-active" : ""}
              onClick={() => setCategoryShow(false)}
            >
              Places
            </button>
            <button
              type="button"
              className={showRelatedPosts ? "is-active" : ""}
              onClick={() => setCategoryShow(true)}
            >
              Related posts
            </button>
          </div>
        ) : null}

        <div
          ref={panelRef}
          className="home-panel"
          id="panel-library"
          role="tabpanel"
          aria-labelledby={`tab-saved-${selected}`}
        >
          <LibraryShell
            mode={libraryMode}
            authReady={authReady}
            posts={categoryPosts}
            places={places}
            loadingPosts={loadingPosts}
            onDeleted={onDeleted}
            onNavigateToPlace={onNavigateToPlace}
            onNavigateToPost={onNavigateToPost}
          />
        </div>
      </section>
    </div>
  );
}
