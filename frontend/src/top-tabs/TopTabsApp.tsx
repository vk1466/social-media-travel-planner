import { useMemo } from "react";

import { type Place, type SavedPost, type VisitDetail } from "../api";
import { postsOfCategory } from "./display";
import { LabPagesRoutes } from "./LabPagesRoutes";
import { Shell } from "./components/Shell";
import { TOP_TABS_BASE } from "./paths";
import { LabThemeProvider } from "./theme";
import "./top-tabs.css";
import "./dashboard-chrome.css";

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
}) {
  const counts = useMemo(
    () => ({
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
      <Shell
        counts={counts}
        isAdmin={isAdmin}
        isSuperAdmin={isSuperAdmin}
        onViewAsChange={onViewAsChange}
      >
        <LabPagesRoutes
          authReady={authReady}
          loading={loading}
          posts={posts}
          places={places}
          visits={visits}
          onRefresh={onRefresh}
          isAdmin={isAdmin}
        />
      </Shell>
    </LabThemeProvider>
  );
}
