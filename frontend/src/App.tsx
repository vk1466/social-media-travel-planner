import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";

import {
  fetchAdminMe,
  fetchPlaces,
  fetchPosts,
  getViewAsUserId,
  setViewAsUserId,
  type Place,
  type SavedPost,
} from "./api";
import { FlipCollapsedVariations } from "./components/FlipCollapsedVariations";
import { FlipDetailCardDemos } from "./components/FlipDetailCardDemos";
import { TravelViewToggleDemos } from "./components/TravelViewToggleDemos";
import { TravelFilterDesignDemos } from "./components/TravelFilterDesignDemos";
import { MobileLibraryDesignDemos } from "./components/MobileLibraryDesignDemos";
import { MobileSaveDesignDemos } from "./components/MobileSaveDesignDemos";
import { clerkEnabled } from "./authMode";
import { WanderfileApp } from "./wanderfile/WanderfileApp";

function AppRoutes({ authReady }: { authReady: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const refresh = useCallback(async () => {
    setLoadingPosts(true);
    try {
      const [postsResult, placesResult] = await Promise.allSettled([
        fetchPosts(),
        fetchPlaces(),
      ]);
      if (postsResult.status === "fulfilled") setPosts(postsResult.value);
      if (placesResult.status === "fulfilled") setPlaces(placesResult.value);

      const failures: { name: string; reason: unknown }[] = [];
      if (postsResult.status === "rejected") failures.push({ name: "posts", reason: postsResult.reason });
      if (placesResult.status === "rejected") failures.push({ name: "places", reason: placesResult.reason });
      if (failures.length > 0) {
        const reason = failures[0].reason;
        const detail = reason instanceof Error ? reason.message : "Unknown error";
        console.error("Failed to fetch library data:", failures);
        setLoadError(`Couldn't load ${failures.map(({ name }) => name).join(", ")}. ${detail}`);
      } else {
        setLoadError(null);
      }
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
        setIsAdmin(Boolean(me.is_admin));
        setIsSuperAdmin(Boolean(me.is_super_admin));
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
      navigate("/library");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [location.pathname, navigate]);

  return (
    <Routes>
      <Route path="/travel" element={<Navigate to="/map" replace />} />
      <Route path="/travel/:placeId" element={<Navigate to="/map" replace />} />
      <Route path="/dev/flip-cards/collapsed" element={<FlipCollapsedVariations />} />
      <Route path="/dev/flip-cards" element={<FlipDetailCardDemos />} />
      <Route path="/dev/travel-view-toggle" element={<TravelViewToggleDemos />} />
      <Route path="/dev/travel-filter-designs" element={<TravelFilterDesignDemos />} />
      <Route path="/dev/mobile-library-designs" element={<MobileLibraryDesignDemos />} />
      <Route path="/dev/mobile-save-designs" element={<MobileSaveDesignDemos />} />
      <Route
        path="/*"
        element={
          <WanderfileApp
            posts={posts}
            places={places}
            loading={loadingPosts}
            loadError={loadError}
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
