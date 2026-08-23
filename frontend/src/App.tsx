import { useCallback, useEffect, useState } from "react";
import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAuth } from "@clerk/react";

import {
  fetchAdminMe,
  fetchPlaces,
  fetchPosts,
  fetchVisits,
  postRouteParts,
  type Place,
  type SavedPost,
} from "./api";
import { AddLinksPage } from "./components/AddLinksPage";
import { AdminPage } from "./components/AdminPage";
import { PageHeader } from "./components/PageHeader";
import { PlaceLibrary } from "./components/PlaceLibrary";
import { PostLibrary } from "./components/PostLibrary";
import { SavedPage } from "./components/SavedPage";
import { SearchPage } from "./components/SearchPage";
import { SiteLayout } from "./components/SiteLayout";
import { TravelHistory } from "./components/TravelHistory";
import { clerkEnabled } from "./authMode";

function RedirectMapPlaceToPlaces() {
  const { placeId } = useParams<{ placeId: string }>();
  return <Navigate to={placeId ? `/places/${placeId}` : "/places"} replace />;
}

function RedirectToDashboard() {
  const location = useLocation();
  return <Navigate to={{ pathname: "/", search: location.search }} replace />;
}

function PlacesRoutes({ authReady }: { authReady: boolean }) {
  const navigate = useNavigate();
  return (
    <PlaceLibrary
      authReady={authReady}
      onNavigateToPost={(platform, postId) => {
        const { platform: routePlatform, nativeId } = postRouteParts(platform, postId);
        navigate(`/posts/${routePlatform}/${nativeId}`);
      }}
    />
  );
}

function NotFoundPage() {
  return (
    <div className="wf-container wf-page-pad">
      <PageHeader
        eyebrow="404"
        title="Page not found"
        lede={
          <>
            That route doesn’t exist. <Link to="/">Back to home</Link>
          </>
        }
      />
    </div>
  );
}

interface ChromeOutletProps {
  isAdmin: boolean;
  postCount: number;
  placeCount: number;
}

function ChromeOutlet({
  isAdmin,
  postCount,
  placeCount,
}: ChromeOutletProps) {
  return (
    <SiteLayout
      isAdmin={isAdmin}
      postCount={postCount}
      placeCount={placeCount}
    >
      <Outlet />
    </SiteLayout>
  );
}

function PostsRoute({
  loadingPosts,
  posts,
  places,
  onDeleted,
  onNavigateToPlace,
}: {
  loadingPosts: boolean;
  posts: SavedPost[];
  places: Place[];
  onDeleted: () => void;
  onNavigateToPlace: (placeId: string) => void;
}) {
  if (loadingPosts) {
    return <p className="loading-copy">Loading saved posts…</p>;
  }
  return (
    <PostLibrary
      posts={posts}
      places={places}
      onDeleted={onDeleted}
      onNavigateToPlace={onNavigateToPlace}
    />
  );
}

function AppRoutes({ authReady }: { authReady: boolean }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  const refresh = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const [nextPosts, nextPlaces, nextVisits] = await Promise.all([
        fetchPosts(),
        fetchPlaces(),
        fetchVisits(),
      ]);
      setPosts(nextPosts);
      setPlaces(nextPlaces);
      setVisitCount(nextVisits.length);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const handleLibraryChanged = useCallback(() => {
    void refresh();
    setLibraryVersion((version) => version + 1);
  }, [refresh]);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    void refresh();
  }, [authReady, refresh]);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchAdminMe();
        if (!cancelled) {
          setIsAdmin(me.is_admin);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "k") {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      navigate("/search");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const navigateToPlace = (placeId: string) => {
    navigate(`/places/${placeId}`);
  };

  const chromeShared = {
    isAdmin,
    postCount: posts.length,
    placeCount: places.length,
  };

  return (
    <Routes>
      <Route path="/map" element={<Navigate to="/places" replace />} />
      <Route path="/map/:placeId" element={<RedirectMapPlaceToPlaces />} />
      <Route path="/places/demos" element={<Navigate to="/places" replace />} />
      <Route path="/places/demos/:demoId" element={<Navigate to="/places" replace />} />
      <Route path="/places/demos-v2" element={<Navigate to="/places" replace />} />
      <Route path="/places/demos-v2/:demoId" element={<Navigate to="/places" replace />} />
      <Route path="/places/demos-v3" element={<Navigate to="/places" replace />} />
      <Route path="/places/demos-v3/:demoId" element={<Navigate to="/places" replace />} />
      <Route path="/posts/demos" element={<Navigate to="/posts" replace />} />
      <Route path="/posts/demos/:demoId" element={<Navigate to="/posts" replace />} />
      <Route path="/posts/demos-v2" element={<Navigate to="/posts" replace />} />
      <Route path="/posts/demos-v2/:demoId" element={<Navigate to="/posts" replace />} />
      <Route path="/map/demos" element={<Navigate to="/places" replace />} />
      <Route path="/map/demos/:themeId" element={<Navigate to="/places" replace />} />
      <Route path="/map/demos/:themeId/:placeId" element={<Navigate to="/places" replace />} />
      <Route path="/site/demos" element={<Navigate to="/" replace />} />
      <Route path="/site/demos/:demoId" element={<Navigate to="/" replace />} />

      <Route element={<ChromeOutlet {...chromeShared} />}>
        <Route
          path="/"
          element={
            <SavedPage
              posts={posts}
              places={places}
              visitCount={visitCount}
              authReady={authReady}
              loadingPosts={loadingPosts}
              onDeleted={refresh}
              onNavigateToPlace={navigateToPlace}
              onNavigateToPost={(platform, postId) => {
                const { platform: routePlatform, nativeId } = postRouteParts(platform, postId);
                navigate(`/posts/${routePlatform}/${nativeId}`);
              }}
            />
          }
        />
        <Route path="/saved" element={<RedirectToDashboard />} />
        <Route path="/posts" element={<Navigate to="/?open=posts" replace />} />
        <Route
          path="/posts/:platform/:postId"
          element={
            <PostsRoute
              loadingPosts={loadingPosts}
              posts={posts}
              places={places}
              onDeleted={refresh}
              onNavigateToPlace={navigateToPlace}
            />
          }
        />
        <Route path="/places" element={<Navigate to="/?open=places" replace />} />
        <Route path="/places/:placeId" element={<PlacesRoutes authReady={authReady} />} />
        <Route path="/search" element={<SearchPage posts={posts} places={places} />} />
        <Route
          path="/add"
          element={
            <AddLinksPage authReady={authReady} onIngestComplete={handleLibraryChanged} />
          }
        />
        <Route
          path="/history"
          element={
            <TravelHistory
              refreshToken={libraryVersion}
              jobRunning={false}
              onChanged={handleLibraryChanged}
              onNavigateToPlace={navigateToPlace}
              onImportStarted={(nextJobId) => {
                navigate("/add", { state: { resumeJobId: nextJobId } });
              }}
            />
          }
        />
        <Route
          path="/admin"
          element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  if (clerkEnabled) {
    return <AppWithClerkAuth />;
  }
  return <AppRoutes authReady />;
}

function AppWithClerkAuth() {
  const { isLoaded, isSignedIn } = useAuth();
  // Wait until Clerk has a session so api.ts can attach a bearer token.
  // AuthTokenBridge also sets the getter in an effect; give it one tick after load.
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setAuthReady(false);
      return;
    }
    const timer = window.setTimeout(() => setAuthReady(true), 0);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn]);

  return <AppRoutes authReady={authReady} />;
}
