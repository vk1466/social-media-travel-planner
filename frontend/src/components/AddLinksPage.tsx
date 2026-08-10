import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { fetchActiveJob, postRouteParts, startIngest } from "../api";
import "../add-page.css";
import { useJob } from "../hooks/useJob";
import { DataMaintenance } from "./DataMaintenance";
import { IngestProgress } from "./IngestProgress";
import { LinkSubmitForm } from "./LinkSubmitForm";
import { PageHeader } from "./PageHeader";

export interface AddLinksPageProps {
  authReady: boolean;
  onIngestComplete: () => void;
}

type AddLocationState = {
  prefill?: string;
  resumeJobId?: string;
};

export function AddLinksPage({ authReady, onIngestComplete }: AddLinksPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [prefill] = useState(
    () => ((location.state as AddLocationState | null) ?? null)?.prefill ?? "",
  );
  const [jobId, setJobId] = useState<string | null>(
    () => ((location.state as AddLocationState | null) ?? null)?.resumeJobId ?? null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [formResetKey, setFormResetKey] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const completedJobId = useRef<string | null>(null);
  const { job, error: jobError } = useJob(jobId);

  useEffect(() => {
    if (!authReady || jobId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const active = await fetchActiveJob();
        if (!cancelled && active?.status === "running") {
          setJobId(active.job_id);
        }
      } catch {
        // ignore — no active job to resume
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, jobId]);

  useEffect(() => {
    if (job?.status === "done" && jobId && completedJobId.current !== jobId) {
      completedJobId.current = jobId;
      onIngestComplete();
      setShowSuccess(true);
    }
    if (job?.status === "running") {
      setShowSuccess(false);
    }
  }, [job?.status, jobId, onIngestComplete]);

  const handleSubmit = async (links: string[], refresh: boolean) => {
    setSubmitError(null);
    setShowSuccess(false);
    try {
      const nextJobId = await startIngest(links, refresh);
      setJobId(nextJobId);
      setFormResetKey((key) => key + 1);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to start ingest");
    }
  };

  const openPostFromProgress = (platform: string, postId: string) => {
    const { platform: routePlatform, nativeId } = postRouteParts(platform, postId);
    navigate(`/posts/${routePlatform}/${nativeId}`);
  };

  return (
    <div className="wf-container wf-page-pad add-page">
      <PageHeader
        eyebrow="Add to your library"
        title="Paste a link. We'll do the rest."
        lede="Drop in Instagram reels, TikToks, and YouTube links. We read each one for the places it mentions and add them to your saves and atlas."
      />

      <div className="add-page-form-card">
        <LinkSubmitForm
          key={formResetKey}
          initialValue={formResetKey === 0 ? prefill : ""}
          disabled={job?.status === "running"}
          onSubmit={handleSubmit}
        />
      </div>

      {submitError && <p className="banner-error">{submitError}</p>}
      {jobError && <p className="banner-error">{jobError}</p>}

      {job && (
        <div className="add-page-progress">
          <IngestProgress
            links={job.links}
            running={job.status === "running"}
            title={
              job.kind === "instagram_profile_import"
                ? "Importing Instagram visits"
                : job.kind === "timeline_import"
                  ? "Importing Google Maps Timeline"
                  : "Progress"
            }
            subtitle={
              job.kind === "instagram_profile_import" && job.username
                ? `@${job.username} · places will be marked visited automatically`
                : job.kind === "timeline_import"
                  ? "Resolving places via OpenStreetMap · progress survives refresh"
                  : null
            }
            onOpenPost={openPostFromProgress}
          />
        </div>
      )}

      {showSuccess && (
        <div className="add-page-success" role="status">
          <h2 className="add-page-success-title">You're all set</h2>
          <p className="add-page-success-copy">
            Links are in your library. Open your saves to browse posts, or jump to the atlas to see
            places on the map.
          </p>
          <div className="add-page-success-actions">
            <Link to="/posts" className="add-page-success-link add-page-success-link-primary">
              View your saves
            </Link>
            <Link to="/places" className="add-page-success-link add-page-success-link-secondary">
              Open the atlas
            </Link>
          </div>
        </div>
      )}

      <aside className="add-page-aside">
        <h2 className="add-page-aside-heading">Library tools</h2>
        <DataMaintenance
          disabled={job?.status === "running"}
          onComplete={onIngestComplete}
        />
      </aside>
    </div>
  );
}
