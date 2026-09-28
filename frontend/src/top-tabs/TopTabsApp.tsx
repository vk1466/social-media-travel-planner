import { useMemo } from "react";

import { type Place, type SavedPost, type VisitDetail } from "../api";
import { postsOfCategory } from "./display";
import { LabPagesRoutes } from "./LabPagesRoutes";
import { Shell } from "./components/Shell";
import { TOP_TABS_BASE } from "./paths";
import { LibraryPlatformProvider } from "../libraryPlatform";
import { LabThemeProvider } from "./theme";
import "./top-tabs.css";
import "./dashboard-chrome.css";
import "./internal-editorial.css";

export function TopTabsApp({
  authReady,
  loading,
  posts,
  places,
  visits,
  onRefresh,
  isAdmin,
  isSuperAdmin,
  onViewAsChange,
  loadError,
  libraryUnavailable,
  onRetry,
}: {
  authReady: boolean;
  loading: boolean;
  posts: SavedPost[];
  places: Place[];
  visits: VisitDetail[];
  onRefresh: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onViewAsChange: (userId: string | null) => void;
  loadError: string | null;
  libraryUnavailable: boolean;
  onRetry: () => void;
}) {
  const counts = useMemo(
    () => ({
      home: posts.length,
      posts: posts.length,
      travel: places.length,
      food: postsOfCategory(posts, "food").length,
      movies: postsOfCategory(posts, "movies").length,
      history: visits.length,
    }),
    [posts, places.length, visits.length],
  );

  return (
    <LabThemeProvider basePath={TOP_TABS_BASE}>
      <LibraryPlatformProvider>
        <Shell
          counts={counts}
          loading={loading}
          isAdmin={isAdmin}
          isSuperAdmin={isSuperAdmin}
          onViewAsChange={onViewAsChange}
          onIngestComplete={onRefresh}
        >
          {loadError ? (
            <div className="library-load-error" role="alert">
              <div><strong>Your library couldn’t load.</strong><span>{loadError}</span></div>
              <button type="button" onClick={onRetry}>Try again</button>
            </div>
          ) : null}
          {!libraryUnavailable ? <LabPagesRoutes
            authReady={authReady}
            loading={loading}
            posts={posts}
            places={places}
            visits={visits}
            onRefresh={onRefresh}
            isAdmin={isAdmin}
          /> : null}
        </Shell>
      </LibraryPlatformProvider>
    </LabThemeProvider>
  );
}
