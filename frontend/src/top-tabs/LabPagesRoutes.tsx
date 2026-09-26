import { Route, Routes, Navigate, useLocation, Link } from "react-router-dom";

import { type Place, type SavedPost, type VisitDetail } from "../api";
import { AdminPage } from "../components/AdminPage";
import { MasonrySkeletonGrid } from "../components/MasonryGrid";
import { postsOfCategory } from "./display";
import { AddPage } from "./pages/AddPage";
import { FoodPage } from "./pages/FoodPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { MoviesPage } from "./pages/MoviesPage";
import { PostsPage } from "./pages/PostsPage";
import { SearchPage } from "./pages/SearchPage";
import { TravelPage } from "./pages/TravelPage";
import { InvisibleFeedPage } from "./pages/InvisibleFeedPage";

export function LabPagesRoutes({
  authReady,
  loading,
  posts,
  places,
  visits,
  onRefresh,
  isAdmin,
}: {
  authReady: boolean;
  loading: boolean;
  posts: SavedPost[];
  places: Place[];
  visits: VisitDetail[];
  onRefresh: () => void;
  isAdmin: boolean;
}) {
  const location = useLocation();
  const isInvisibleFeed = location.pathname.replace(/\/+$/, "").endsWith("/invisible-feed");
  return (
    <>
      {loading && posts.length === 0 && !isInvisibleFeed ? <MasonrySkeletonGrid count={8} /> : null}
      <Routes>
        <Route
          index
          element={
            <HomePage posts={posts} places={places} visits={visits} onDeleted={onRefresh} />
          }
        />
        <Route path="posts" element={<PostsPage posts={posts} places={places} onDeleted={onRefresh} />} />
        <Route
          path="posts/:platform/:postId"
          element={
            loading ? (
              <p className="empty-copy">Loading saved posts…</p>
            ) : (
              <PostsPage posts={posts} places={places} onDeleted={onRefresh} />
            )
          }
        />
        <Route
          path="travel"
          element={
            <TravelPage
              authReady={authReady}
              posts={posts}
              places={places}
              loadingPosts={loading}
              onDeleted={onRefresh}
            />
          }
        />
        <Route
          path="travel/:placeId"
          element={
            <TravelPage
              authReady={authReady}
              posts={posts}
              places={places}
              loadingPosts={loading}
              onDeleted={onRefresh}
            />
          }
        />
        <Route
          path="food"
          element={
            <FoodPage
              posts={postsOfCategory(posts, "food")}
              onPostUpdated={() => onRefresh()}
            />
          }
        />
        <Route
          path="movies"
          element={<MoviesPage posts={postsOfCategory(posts, "movies")} />}
        />
        <Route
          path="invisible-feed"
          element={
            <InvisibleFeedPage
              posts={posts}
              places={places}
              loading={loading}
              onRefresh={onRefresh}
            />
          }
        />
        <Route
          path="feed"
          element={<Navigate to="invisible-feed" replace />}
        />
        <Route
          path="history"
          element={<HistoryPage visits={visits} places={places} onChanged={onRefresh} />}
        />
        <Route path="add" element={<AddPage authReady={authReady} onComplete={onRefresh} />} />
        <Route path="search" element={<SearchPage posts={posts} places={places} />} />
        <Route path="admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
        <Route
          path="*"
          element={
            <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
              <p className="empty-copy">That page doesn’t exist.</p>
              <Link to="/" className="classic-link" style={{ display: "inline-block", marginTop: "1rem" }}>
                ← Back to Home view
              </Link>
            </div>
          }
        />
      </Routes>
    </>
  );
}
