import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { fetchActiveJob, fetchJobs, parsePostId, type Job } from "../../api";
import { useLabTheme } from "../theme";
import "./quiet-save-banner.css";

export function QuietSaveBanner() {
  const location = useLocation();
  const { basePath } = useLabTheme();
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [attentionJob, setAttentionJob] = useState<Job | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isAddPage = location.pathname.replace(/\/+$/, "").endsWith("/add");

  useEffect(() => {
    let cancelled = false;
    let timerId: number | undefined;

    const checkJobs = async () => {
      try {
        const [active, history] = await Promise.all([
          fetchActiveJob("link_ingest").catch(() => null),
          fetchJobs().catch(() => []),
        ]);
        if (cancelled) return;

        const isRunning = active?.status === "running";
        setActiveJob(isRunning ? active : null);

        const recentCutoff = Date.now() - 4 * 60 * 60 * 1000;
        const recentAttention = history.find((job) => {
          if (job.kind !== "link_ingest" || !job.created_at) return false;
          const time = new Date(job.created_at).getTime();
          if (Number.isNaN(time) || time < recentCutoff) return false;
          const hasError = (job.counts.error ?? 0) + (job.counts.unsupported ?? 0) > 0;
          return hasError || job.status === "done";
        });
        setAttentionJob(recentAttention ?? null);

        if (isRunning) {
          timerId = window.setTimeout(() => void checkJobs(), 3500);
        } else {
          timerId = window.setTimeout(() => void checkJobs(), 10000);
        }
      } catch {
        if (!cancelled) {
          timerId = window.setTimeout(() => void checkJobs(), 10000);
        }
      }
    };

    void checkJobs();
    return () => {
      cancelled = true;
      if (timerId !== undefined) window.clearTimeout(timerId);
    };
  }, []);

  if (isAddPage || dismissed) {
    return null;
  }

  const isRunning = Boolean(activeJob && activeJob.status === "running");
  const hasAttention = Boolean(attentionJob);

  if (!isRunning && !hasAttention) {
    return null;
  }

  let eyebrow = "IN PROGRESS";
  let title = "Organizing your saves";
  let detail = "You can keep browsing while Wanderfile organizes places and details.";
  let isError = false;
  let isDone = false;
  let actionLabel = "View queue →";
  let actionTo = `${basePath}/add`;

  if (isRunning && activeJob) {
    const processed = activeJob.links.filter((l) => l.status !== "pending" && l.status !== "fetching").length;
    eyebrow = "ORGANIZING YOUR SAVES";
    title = "Organizing your saves";
    detail = activeJob.links.length > 1
      ? `${processed} of ${activeJob.links.length} links processed · You can keep browsing`
      : "Extracting details & places · You can keep browsing";
    actionLabel = "View queue →";
    actionTo = `${basePath}/add`;
  } else if (attentionJob) {
    const errorCount = (attentionJob.counts.error ?? 0) + (attentionJob.counts.unsupported ?? 0);
    const savedCount = (attentionJob.counts.saved ?? 0) + (attentionJob.counts.linked ?? 0);

    if (errorCount > 0) {
      isError = true;
      eyebrow = "NEEDS ATTENTION";
      title = "Save needs attention";
      detail = `${errorCount} ${errorCount === 1 ? "link couldn't be saved" : "links couldn't be saved"}. Check the queue to retry.`;
      actionLabel = "Review issue →";
      actionTo = `${basePath}/add`;
    } else {
      isDone = true;
      eyebrow = "READY TO OPEN";
      title = "Your save is ready";
      detail = savedCount > 0
        ? `${savedCount} ${savedCount === 1 ? "idea added" : "ideas added"} to your library.`
        : "All items in this save were already organized.";

      const finishedWithPost = attentionJob.links.find((l) => l.post_id && (l.status === "saved" || l.status === "linked"));
      if (finishedWithPost && finishedWithPost.post_id) {
        const { platform, nativeId } = parsePostId(finishedWithPost.post_id);
        actionLabel = "Open save →";
        actionTo = `${basePath}/posts/${platform}/${nativeId}`;
      } else {
        actionLabel = "Explore library →";
        actionTo = `${basePath}/posts`;
      }
    }
  }

  return (
    <aside className={`quiet-save-banner${isError ? " is-error" : isDone ? " is-done" : " is-running"}`} aria-label="Save status">
      <div className="qsb-icon-wrap" aria-hidden="true">
        {isError ? (
          <span className="qsb-icon error">!</span>
        ) : isDone ? (
          <span className="qsb-icon done">✓</span>
        ) : (
          <span className="qsb-icon spinner">↻</span>
        )}
      </div>

      <div className="qsb-content">
        <span className="qsb-eyebrow">{eyebrow}</span>
        <strong className="qsb-title">{title}</strong>
        <span className="qsb-detail">{detail}</span>
      </div>

      <div className="qsb-actions">
        <Link to={actionTo} className="qsb-action-btn">
          {actionLabel}
        </Link>
        {isDone ? (
          <button
            type="button"
            className="qsb-dismiss-btn"
            aria-label="Dismiss save notice"
            onClick={() => setDismissed(true)}
          >
            ✕
          </button>
        ) : null}
      </div>
    </aside>
  );
}
