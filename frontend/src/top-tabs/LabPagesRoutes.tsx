import { Route, Routes, Navigate, useNavigate } from "react-router-dom";

import { type Place, type SavedPost, type VisitDetail } from "../api";
import { AdminPage } from "../components/AdminPage";
import { PostLibrary } from "../components/PostLibrary";
import { postsOfCategory } from "./display";
import { AddPage } from "./pages/AddPage";
import { FoodPage } from "./pages/FoodPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { MoviesPage } from "./pages/MoviesPage";
import { PostsPage } from "./pages/PostsPage";
import { SearchPage } from "./pages/SearchPage";
import { TravelPage } from "./pages/TravelPage";

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
  const navigate = useNavigate();

  return (
    <>
      {loading && posts.length === 0 ? <p className="empty-copy">Loading your library…</p> : null}
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
              <PostLibrary
                posts={posts}
                places={places}
                onDeleted={onRefresh}
                onNavigateToPlace={(placeId) => navigate(`/travel/${placeId}`)}
              />
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
          path="history"
          element={<HistoryPage visits={visits} places={places} onChanged={onRefresh} />}
        />
        <Route path="add" element={<AddPage authReady={authReady} onComplete={onRefresh} />} />
        <Route path="search" element={<SearchPage posts={posts} places={places} />} />
        <Route path="admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
        <Route
          path="*"
          element={<p className="empty-copy">That page doesn’t exist.</p>}
        />
      </Routes>
    </>
  );
}
