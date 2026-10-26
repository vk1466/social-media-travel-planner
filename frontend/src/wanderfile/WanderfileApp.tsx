import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { SavePipelineProvider } from "./state/SavePipelineContext";
import { HomePage } from "./pages/HomePage";
import { LibraryPage } from "./pages/LibraryPage";
import { MapPage } from "./pages/MapPage";
import { CollectionsPage } from "./pages/CollectionsPage";
import { CollectionDetailPage } from "./pages/CollectionDetailPage";
import { PostDetailPage } from "./pages/PostDetailPage";
import { PlaceDetailPage } from "./pages/PlaceDetailPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ComingSoonPage } from "./comingSoon/ComingSoonPage";
import { KitsPage } from "./pages/KitsPage";
import { AdminPage } from "../components/AdminPage";
import type { SavedPost, Place } from "../api";
import "./tokens.css";

interface WanderfileAppProps {
  posts: SavedPost[];
  places: Place[];
  loading: boolean;
  loadError?: string | null;
  onRefresh?: () => void;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  onViewAsChange?: (userId: string | null) => void;
}

export function WanderfileApp({
  posts,
  places,
  loading,
  loadError,
  onRefresh,
  isAdmin = false,
  isSuperAdmin = false,
  onViewAsChange,
}: WanderfileAppProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Check first-login onboarding condition
  useEffect(() => {
    try {
      const completed = localStorage.getItem("wf_onboarding_completed");
      if (!completed && location.pathname === "/" && !loading && posts.length === 0) {
        navigate("/welcome", { replace: true });
      }
    } catch {
      // ignore storage access error
    }
  }, [location.pathname, loading, posts.length, navigate]);

  return (
    <SavePipelineProvider onRefreshLibrary={onRefresh}>
      <Routes>
        <Route path="/welcome" element={<OnboardingPage />} />
        <Route
          path="/*"
          element={
            <AppShell
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}
              onViewAsChange={onViewAsChange}
            >
              <Routes>
                <Route path="/" element={<HomePage posts={posts} places={places} loading={loading} loadError={loadError} onRefresh={onRefresh} />} />
                <Route path="/library" element={<LibraryPage posts={posts} loading={loading} onRefresh={onRefresh} />} />
                <Route path="/map" element={<MapPage places={places} loading={loading} />} />
                <Route path="/map/:placeId" element={<MapPage places={places} loading={loading} />} />
                <Route path="/places" element={<Navigate to="/map" replace />} />
                <Route path="/places/:placeId" element={<Navigate to="/map" replace />} />
                <Route path="/collections" element={<CollectionsPage posts={posts} places={places} />} />
                <Route path="/collections/:id" element={<CollectionDetailPage posts={posts} />} />
                <Route path="/post/:id" element={<PostDetailPage posts={posts} onRefresh={onRefresh} />} />
                <Route path="/place/:id" element={<PlaceDetailPage places={places} posts={posts} />} />
                <Route path="/admin" element={isAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
                <Route path="/coming-soon/:feature" element={<ComingSoonPage />} />
                <Route path="/kits" element={<KitsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          }
        />
      </Routes>
    </SavePipelineProvider>
  );
}
