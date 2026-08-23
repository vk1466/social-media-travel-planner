import { useEffect, useRef, type JSX } from "react";
import { useSearchParams } from "react-router-dom";

import { type Place, type SavedPost } from "../api";
import type { LibraryMode } from "../libraryShellModel";
import { HomeBento } from "./HomeBento";
import { LibraryShell } from "./LibraryShell";

import "../home-page.css";

export interface HomePageProps {
  posts: SavedPost[];
  places: Place[];
  visitCount: number;
  authReady: boolean;
  loadingPosts: boolean;
  onDeleted: () => void;
  onNavigateToPlace: (placeId: string) => void;
  onNavigateToPost: (platform: string, postId: string) => void;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

export function HomePage({
  posts,
  places,
  visitCount,
  authReady,
  loadingPosts,
  onDeleted,
  onNavigateToPlace,
  onNavigateToPost,
}: HomePageProps): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const panelRef = useRef<HTMLDivElement>(null);

  const openParam = searchParams.get("open");
  const libraryMode: LibraryMode | null =
    openParam === "places" || openParam === "posts" ? openParam : null;

  useEffect(() => {
    if (!libraryMode || !panelRef.current) return;
    panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [libraryMode]);

  const placesMeta = authReady
    ? `${places.length} ${pluralize(places.length, "place", "places")} · ${visitCount} visited`
    : "Sign in to open your atlas";
  const postsMeta = authReady
    ? `${posts.length} ${pluralize(posts.length, "save", "saves")}`
    : "Sign in to open your saves";

  function openLibrary(mode: LibraryMode) {
    setSearchParams({ open: mode }, { replace: true });
  }

  return (
    <div className="home">
      <HomeBento
        posts={posts}
        visitCount={visitCount}
        authReady={authReady}
        savedCount={places.length}
      />

      <section className="home-library" aria-labelledby="home-library-title">
        <div className="home-library-head">
          <p className="home-library-eyebrow">Your library</p>
          <h2 id="home-library-title">Open a shelf</h2>
          <p>
            One shared filter chrome for Places and Posts — only the core atlas or lantern body
            swaps.
          </p>
        </div>

        <div className="home-tabs" role="tablist" aria-label="Library">
          <button
            type="button"
            role="tab"
            id="tab-places"
            className={`home-tab home-tab--places${libraryMode === "places" ? " is-on" : ""}`}
            aria-selected={libraryMode === "places"}
            aria-controls="panel-library"
            onClick={() => openLibrary("places")}
          >
            <span className="home-tab-kicker">Atlas</span>
            <span className="home-tab-title">Places</span>
            <span className="home-tab-meta">{placesMeta}</span>
            <span className="home-tab-cta">
              {libraryMode === "places" ? "Showing atlas ↓" : "Show atlas ↓"}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-posts"
            className={`home-tab home-tab--posts${libraryMode === "posts" ? " is-on" : ""}`}
            aria-selected={libraryMode === "posts"}
            aria-controls="panel-library"
            onClick={() => openLibrary("posts")}
          >
            <span className="home-tab-kicker">Lantern</span>
            <span className="home-tab-title">Posts</span>
            <span className="home-tab-meta">{postsMeta}</span>
            <span className="home-tab-cta">
              {libraryMode === "posts" ? "Showing saves ↓" : "Show saves ↓"}
            </span>
          </button>
        </div>

        {libraryMode ? (
          <div
            ref={panelRef}
            className="home-panel"
            id="panel-library"
            role="tabpanel"
            aria-labelledby={libraryMode === "places" ? "tab-places" : "tab-posts"}
          >
            <LibraryShell
              mode={libraryMode}
              authReady={authReady}
              posts={posts}
              places={places}
              loadingPosts={loadingPosts}
              onDeleted={onDeleted}
              onNavigateToPlace={onNavigateToPlace}
              onNavigateToPost={onNavigateToPost}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
