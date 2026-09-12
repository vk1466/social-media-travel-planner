import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@clerk/react";

import {
  fetchAdminMe,
  fetchPlaces,
  fetchPosts,
  fetchVisits,
  getViewAsUserId,
  setViewAsUserId,
  type Place,
  type SavedPost,
  type VisitDetail,
} from "./api";
import { FlipCollapsedVariations } from "./components/FlipCollapsedVariations";
import { FlipDetailCardDemos } from "./components/FlipDetailCardDemos";
import { TravelViewToggleDemos } from "./components/TravelViewToggleDemos";
import { TravelFilterDesignDemos } from "./components/TravelFilterDesignDemos";
import { MobileLibraryDesignDemos } from "./components/MobileLibraryDesignDemos";
import { clerkEnabled } from "./authMode";
import { TopTabsApp } from "./top-tabs/TopTabsApp";

function RedirectMapPlaceToTravel() {
  const { placeId } = useParams<{ placeId: string }>();
  return <Navigate to={placeId ? `/travel/${placeId}` : "/travel"} replace />;
}

function RedirectSplatToRoot() {
  const { "*": rest } = useParams();
  return <Navigate to={rest ? `/${rest}` : "/"} replace />;
}

function AppRoutes({ authReady }: { authReady: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [visits, setVisits] = useState<VisitDetail[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

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
      setVisits(nextVisits);
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const handleLibraryChanged = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleViewAsChange = useCallback(
    (_userId: string | null) => {
      void refresh();
    },
    [refresh],
  );

  useEffect(() => {
    if (!authReady) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchAdminMe();
        if (cancelled) {
          return;
        }
        setIsAdmin(me.is_admin);
        setIsSuperAdmin(me.is_super_admin);
        if (!me.is_super_admin && getViewAsUserId()) {
          setViewAsUserId(null);
        }
      } catch {
        if (cancelled) {
          return;
        }
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setViewAsUserId(null);
      }
      if (!cancelled) {
        await refresh();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, refresh]);

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
  }, [location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/map" element={<Navigate to="/travel" replace />} />
      <Route path="/map/:placeId" element={<RedirectMapPlaceToTravel />} />
      <Route path="/places" element={<Navigate to="/travel" replace />} />
      <Route path="/places/:placeId" element={<RedirectMapPlaceToTravel />} />
      <Route path="/saved" element={<Navigate to="/" replace />} />
      <Route path="/themes/*" element={<Navigate to="/" replace />} />
      <Route path="/top-tabs" element={<Navigate to="/" replace />} />
      <Route path="/top-tabs/*" element={<RedirectSplatToRoot />} />
      <Route path="/floating-dock" element={<Navigate to="/" replace />} />
      <Route path="/floating-dock/*" element={<RedirectSplatToRoot />} />
      <Route path="/shelf-first" element={<Navigate to="/" replace />} />
      <Route path="/shelf-first/*" element={<RedirectSplatToRoot />} />
      <Route path="/category-bento" element={<Navigate to="/" replace />} />
      <Route path="/category-bento/*" element={<RedirectSplatToRoot />} />
      <Route path="/places/demos" element={<Navigate to="/travel" replace />} />
      <Route path="/places/demos/:demoId" element={<Navigate to="/travel" replace />} />
      <Route path="/places/demos-v2" element={<Navigate to="/travel" replace />} />
      <Route path="/places/demos-v2/:demoId" element={<Navigate to="/travel" replace />} />
      <Route path="/places/demos-v3" element={<Navigate to="/travel" replace />} />
      <Route path="/places/demos-v3/:demoId" element={<Navigate to="/travel" replace />} />
      <Route path="/posts/demos" element={<Navigate to="/posts" replace />} />
      <Route path="/posts/demos/:demoId" element={<Navigate to="/posts" replace />} />
      <Route path="/posts/demos-v2" element={<Navigate to="/posts" replace />} />
      <Route path="/posts/demos-v2/:demoId" element={<Navigate to="/posts" replace />} />
      <Route path="/map/demos" element={<Navigate to="/travel" replace />} />
      <Route path="/map/demos/:themeId" element={<Navigate to="/travel" replace />} />
      <Route path="/map/demos/:themeId/:placeId" element={<RedirectMapPlaceToTravel />} />
      <Route path="/site/demos" element={<Navigate to="/" replace />} />
      <Route path="/site/demos/:demoId" element={<Navigate to="/" replace />} />
      <Route path="/dev/flip-cards/collapsed" element={<FlipCollapsedVariations />} />
      <Route path="/dev/flip-cards" element={<FlipDetailCardDemos />} />
      <Route path="/dev/travel-view-toggle" element={<TravelViewToggleDemos />} />
      <Route path="/dev/travel-filter-designs" element={<TravelFilterDesignDemos />} />
      <Route path="/dev/mobile-library-designs" element={<MobileLibraryDesignDemos />} />
      <Route
        path="/*"
        element={
          <TopTabsApp
            authReady={authReady}
            loading={loadingPosts}
            posts={posts}
            places={places}
            visits={visits}
            onRefresh={handleLibraryChanged}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            onViewAsChange={handleViewAsChange}
          />
        }
      />
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
