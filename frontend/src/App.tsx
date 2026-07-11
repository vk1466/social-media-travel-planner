import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { UserButton, useUser } from "@clerk/react";

import { fetchPlaces, fetchPosts, fetchVisits, startIngest, postRouteParts, type Place } from "./api";
import { DataMaintenance } from "./components/DataMaintenance";
import { IngestProgress } from "./components/IngestProgress";
import { LinkSubmitForm } from "./components/LinkSubmitForm";
import { PlaceLibrary } from "./components/PlaceLibrary";
import { PostLibrary } from "./components/PostLibrary";
import { TravelHistory } from "./components/TravelHistory";
import { useJob } from "./hooks/useJob";

const clerkEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

function BrandMark() {
  return (
    <svg className="brand-mark-svg" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="14" fill="currentColor" />
      <path
        d="M14 7.5 16.8 16.8 14 14 11.2 16.8 14 7.5Z"
        fill="#f8f9f8"
      />
      <circle cx="14" cy="14" r="1.1" fill="#f8f9f8" />
    </svg>
  );
}

function ClerkUserChip() {
  const { user } = useUser();
  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed in";

  return (
    <div className="user-chip">
      <UserButton />
      <span className="user-name">{displayName}</span>
    </div>
  );
}

function LocalUserChip() {
  return (
    <div className="user-chip">
      <span className="user-avatar" aria-hidden="true">
        LO
      </span>
      <span className="user-name">Local user</span>
    </div>
  );
}

function UserChip() {
  return clerkEnabled ? <ClerkUserChip /> : <LocalUserChip />;
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof fetchPosts>>>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [formResetKey, setFormResetKey] = useState(0);
  const switchedAfterIngest = useRef(false);
  const { job, error: jobError } = useJob(jobId);

  const activeTab = location.pathname.startsWith("/places")
    ? "places"
    : location.pathname.startsWith("/history")
      ? "history"
      : "posts";

  const refreshPosts = useCallback(async () => {
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

  useEffect(() => {
    void refreshPosts();
  }, [refreshPosts]);

  useEffect(() => {
    if (job?.status === "done") {
      void refreshPosts();
      setLibraryVersion((version) => version + 1);
      if (!switchedAfterIngest.current && (job.counts.saved > 0 || (job.counts.linked ?? 0) > 0)) {
        switchedAfterIngest.current = true;
        navigate("/places");
      }
    }
    if (job?.status === "running") {
      switchedAfterIngest.current = false;
    }
  }, [job?.status, job?.counts.saved, job?.counts.linked, refreshPosts, navigate]);

  const handleSubmit = async (links: string[], refresh: boolean) => {
    setSubmitError(null);
    try {
      const nextJobId = await startIngest(links, refresh);
      setJobId(nextJobId);
      setFormResetKey((key) => key + 1);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to start ingest");
    }
  };

  const handleMaintenanceComplete = () => {
    void refreshPosts();
    setLibraryVersion((version) => version + 1);
  };

  const navigateToPlace = (placeId: string) => {
    navigate(`/places/${placeId}`);
  };

  const navigateToPost = (platform: string, postId: string) => {
    const { platform: routePlatform, nativeId } = postRouteParts(platform, postId);
    navigate(`/posts/${routePlatform}/${nativeId}`);
  };

  const openPostFromProgress = (platform: string, postId: string) => {
    const { platform: routePlatform, nativeId } = postRouteParts(platform, postId);
    navigate(`/posts/${routePlatform}/${nativeId}`);
  };

  return (
    <div className="app-page">
      <header className="top-bar">
        <div className="brand">
          <BrandMark />
          <span className="brand-name">Wanderfile</span>
        </div>
        <UserChip />
      </header>

      <main className="app-shell">
        <section className="hero-row">
          <div className="hero-card">
            <p className="hero-eyebrow"># TRAVEL INSPIRATION</p>
            <h1 className="hero-title">Turn scattered links into a curated travel atlas.</h1>
            <p className="hero-subtitle">
              Paste Instagram reels, blogs, city guides. We read them, extract named places and
              tags — you get a searchable map of your dreams.
            </p>
          </div>
          <div className="stats-stack">
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    d="M7.5 10.5 3 6m0 0 4.5-4.5M3 6h8.5a4 4 0 0 1 0 8H11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="stat-value">{posts.length}</span>
              <span className="stat-label">Links saved</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    d="M9 2.5C6.5 2.5 4.5 4.5 4.5 7c0 4 4.5 8 4.5 8s4.5-4 4.5-8c0-2.5-2-4.5-4.5-4.5Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                  />
                  <circle cx="9" cy="7" r="1.5" fill="currentColor" />
                </svg>
              </span>
              <span className="stat-value">{places.length}</span>
              <span className="stat-label">Places extracted</span>
            </div>
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path
                    d="M3.5 9h11M9 3.5v11"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span className="stat-value">{visitCount}</span>
              <span className="stat-label">Trips logged</span>
            </div>
          </div>
        </section>

        <LinkSubmitForm
          key={formResetKey}
          disabled={job?.status === "running"}
          onSubmit={handleSubmit}
        />

        {submitError && <p className="banner-error">{submitError}</p>}
        {jobError && <p className="banner-error">{jobError}</p>}

        {job && (
          <IngestProgress
            links={job.links}
            running={job.status === "running"}
            onOpenPost={openPostFromProgress}
          />
        )}

        <DataMaintenance
          disabled={job?.status === "running"}
          onComplete={handleMaintenanceComplete}
        />

        <nav className="view-tabs" role="tablist" aria-label="Library view">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "posts"}
            className={`view-tab ${activeTab === "posts" ? "view-tab-active" : ""}`}
            onClick={() => navigate("/posts")}
          >
            Saved posts ({posts.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "places"}
            className={`view-tab ${activeTab === "places" ? "view-tab-active" : ""}`}
            onClick={() => navigate("/places")}
          >
            Places ({places.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "history"}
            className={`view-tab ${activeTab === "history" ? "view-tab-active" : ""}`}
            onClick={() => navigate("/history")}
          >
            Travel history ({visitCount})
          </button>
        </nav>

        <Routes>
          <Route path="/" element={<Navigate to="/posts" replace />} />
          <Route
            path="/posts"
            element={
              loadingPosts ? (
                <p className="loading-copy">Loading saved posts…</p>
              ) : (
                <PostLibrary
                  posts={posts}
                  places={places}
                  onDeleted={refreshPosts}
                  onNavigateToPlace={navigateToPlace}
                />
              )
            }
          />
          <Route
            path="/posts/:platform/:postId"
            element={
              loadingPosts ? (
                <p className="loading-copy">Loading saved posts…</p>
              ) : (
                <PostLibrary
                  posts={posts}
                  places={places}
                  onDeleted={refreshPosts}
                  onNavigateToPlace={navigateToPlace}
                />
              )
            }
          />
          <Route
            path="/places"
            element={
              <PlaceLibrary
                refreshToken={libraryVersion}
                onNavigateToPost={navigateToPost}
              />
            }
          />
          <Route
            path="/places/:placeId"
            element={
              <PlaceLibrary
                refreshToken={libraryVersion}
                onNavigateToPost={navigateToPost}
              />
            }
          />
          <Route
            path="/history"
            element={
              <TravelHistory
                refreshToken={libraryVersion}
                onChanged={handleMaintenanceComplete}
                onNavigateToPlace={navigateToPlace}
              />
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return <AppShell />;
}
