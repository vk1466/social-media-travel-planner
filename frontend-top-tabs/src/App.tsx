import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { SignInButton, SignUpButton, useAuth } from "@clerk/react";

import { fetchPlaces, fetchPosts, fetchVisitedPlaceIds, fetchVisits, type Place, type SavedPost, type VisitDetail } from "./api";
import { clerkEnabled } from "./auth";
import { postsOfCategory } from "./display";
import { Shell } from "./components/Shell";
import { AddPage } from "./pages/AddPage";
import { FoodPage } from "./pages/FoodPage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { MoviesPage } from "./pages/MoviesPage";
import { PostsPage } from "./pages/PostsPage";
import { SearchPage } from "./pages/SearchPage";
import { TravelPage } from "./pages/TravelPage";

export default function App() {
  if (clerkEnabled) {
    return <AppWithClerk />;
  }
  return <Library authReady />;
}

function AppWithClerk() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setAuthReady(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      await getToken();
      if (!cancelled) setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, isSignedIn]);

  if (!isLoaded) {
    return <p className="empty-copy">Loading…</p>;
  }
  if (!isSignedIn) {
    return <SignedOut />;
  }
  return <Library authReady={authReady} />;
}

function SignedOut() {
  return (
    <div className="signed-out">
      <p className="eyebrow">Wanderfile</p>
      <h1>Everything you saved, ready when you are.</h1>
      <p>Sign in to open your library against the same production API.</p>
      <div className="sheet-actions">
        <SignInButton mode="modal" forceRedirectUrl="/">
          <button type="button" className="primary">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal" forceRedirectUrl="/">
          <button type="button">Sign up</button>
        </SignUpButton>
      </div>
    </div>
  );
}

function Library({ authReady }: { authReady: boolean }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [visits, setVisits] = useState<VisitDetail[]>([]);
  const [visitedIds, setVisitedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPosts, nextPlaces, nextVisits, nextVisited] = await Promise.all([
        fetchPosts(),
        fetchPlaces(),
        fetchVisits(),
        fetchVisitedPlaceIds(),
      ]);
      setPosts(nextPosts);
      setPlaces(nextPlaces);
      setVisits(nextVisits);
      setVisitedIds(nextVisited);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    void refresh();
  }, [authReady, refresh]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      navigate("/search");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

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

  const handlePostUpdated = (updated: SavedPost) => {
    setPosts((current) => current.map((post) => (post.post_id === updated.post_id ? updated : post)));
  };

  return (
    <Shell counts={counts}>
      {error ? (
        <p className="inline-errors" role="alert">
          {error}
        </p>
      ) : null}
      {loading && posts.length === 0 && !error ? <p className="empty-copy">Loading your library…</p> : null}
      <Routes>
        <Route path="/" element={<HomePage posts={posts} places={places} visits={visits} />} />
        <Route path="/posts" element={<PostsPage posts={posts} places={places} onDeleted={() => void refresh()} />} />
        <Route path="/travel" element={<TravelPage places={places} posts={posts} visitedIds={visitedIds} onVisitedChange={() => void refresh()} />} />
        <Route path="/travel/:placeId" element={<TravelPage places={places} posts={posts} visitedIds={visitedIds} onVisitedChange={() => void refresh()} />} />
        <Route
          path="/food"
          element={<FoodPage posts={postsOfCategory(posts, "food")} onPostUpdated={handlePostUpdated} />}
        />
        <Route
          path="/movies"
          element={<MoviesPage posts={postsOfCategory(posts, "movies")} />}
        />
        <Route
          path="/history"
          element={<HistoryPage visits={visits} places={places} onChanged={() => void refresh()} />}
        />
        <Route path="/add" element={<AddPage authReady={authReady} onComplete={() => void refresh()} />} />
        <Route path="/search" element={<SearchPage posts={posts} places={places} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
