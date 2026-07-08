import { useCallback, useEffect, useState } from "react";

import { fetchPosts, startIngest } from "./api";
import { IngestProgress } from "./components/IngestProgress";
import { LinkSubmitForm } from "./components/LinkSubmitForm";
import { PlaceLibrary } from "./components/PlaceLibrary";
import { PostLibrary } from "./components/PostLibrary";
import { useJob } from "./hooks/useJob";
import type { SavedPost } from "./api";

type ViewTab = "posts" | "places";

export default function App() {
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>("posts");
  const { job, error: jobError } = useJob(jobId);

  const refreshPosts = useCallback(async () => {
    setLoadingPosts(true);
    try {
      setPosts(await fetchPosts());
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
    }
  }, [job?.status, refreshPosts]);

  const handleSubmit = async (links: string[], refresh: boolean) => {
    setSubmitError(null);
    try {
      const nextJobId = await startIngest(links, refresh);
      setJobId(nextJobId);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to start ingest");
    }
  };

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Travel Post Ingest</h1>
        <p className="app-subtitle">
          Paste Instagram links, watch them ingest, then browse saved posts or the place library.
        </p>
      </header>

      <LinkSubmitForm disabled={job?.status === "running"} onSubmit={handleSubmit} />

      {submitError && <p className="banner-error">{submitError}</p>}
      {jobError && <p className="banner-error">{jobError}</p>}

      {job && <IngestProgress links={job.links} running={job.status === "running"} />}

      <nav className="view-tabs" role="tablist" aria-label="Library view">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "posts"}
          className={`view-tab ${activeTab === "posts" ? "view-tab-active" : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          Posts
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "places"}
          className={`view-tab ${activeTab === "places" ? "view-tab-active" : ""}`}
          onClick={() => setActiveTab("places")}
        >
          Places
        </button>
      </nav>

      {activeTab === "posts" ? (
        loadingPosts ? (
          <p className="loading-copy">Loading saved posts…</p>
        ) : (
          <PostLibrary posts={posts} onDeleted={refreshPosts} />
        )
      ) : (
        <PlaceLibrary />
      )}
    </main>
  );
}
