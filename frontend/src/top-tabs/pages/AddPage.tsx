import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { fetchActiveJob, fetchJob, fetchJobs, fetchPosts, parsePostId, removePendingJobLink, startIngest, type Job, type JobLink, type SavedPost } from "../../api";
import { useLabTheme } from "../theme";
import "../../add-page.css";
import "../../quiet-save-workspace.css";

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function safeHost(value?: string | null): string {
  if (!value) return "Saved link";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "Saved link";
  }
}

const LINK_STATUS_LABELS: Record<JobLink["status"], string> = {
  pending: "Waiting", fetching: "Organizing", saved: "Ready", linked: "Ready",
  skipped: "Already saved", unsupported: "Needs attention", error: "Needs attention",
};

export function AddPage({
  authReady,
  onComplete,
}: {
  authReady: boolean;
  onComplete: () => void;
}) {
  const navigate = useNavigate();
  const { basePath } = useLabTheme();
  const [text, setText] = useState("");
  const [refresh, setRefresh] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [starting, setStarting] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [recentPosts, setRecentPosts] = useState<SavedPost[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const parsed = useMemo(() => {
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (isUrl(trimmed)) valid.push(trimmed);
      else invalid.push(trimmed);
    }
    return { valid, invalid };
  }, [text]);
  const runningJobs = jobs.filter((job) => job.status === "running");
  const historicJobs = jobs.filter((job) => job.status === "done");
  const runningJobIds = runningJobs.map((job) => job.job_id).join(",");
  const queuedPending = runningJobs
    .filter((job) => (job.kind ?? "link_ingest") === "link_ingest")
    .reduce((total, job) => total + (job.counts.pending ?? 0), 0);
  const organizingCount = runningJobs.reduce((total, job) => total + (job.counts.fetching ?? 0), 0);
  const latestLinkStatuses = new Map<string, JobLink["status"]>();
  for (const job of [...jobs].reverse()) {
    for (const link of job.links) latestLinkStatuses.set(link.post_url, link.status);
  }
  const needsAttention = [...latestLinkStatuses.values()].filter((status) => status === "error" || status === "unsupported").length;
  const activeCount = queuedPending + organizingCount;
  const queueLinks: { job: Job; link: JobLink }[] = [];
  const seenQueueUrls = new Set<string>();
  for (const job of jobs) {
    if (job.kind && job.kind !== "link_ingest") continue;
    for (const link of job.links) {
      if (seenQueueUrls.has(link.post_url)) continue;
      seenQueueUrls.add(link.post_url);
      queueLinks.push({ job, link });
      if (queueLinks.length >= 8) break;
    }
    if (queueLinks.length >= 8) break;
  }

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    void fetchPosts().then((posts) => {
      if (!cancelled) setRecentPosts([...posts].sort((a, b) => (b.fetched_at ?? "").localeCompare(a.fetched_at ?? "")).slice(0, 3));
    }).catch(() => { /* The queue remains usable if the library cannot load. */ });
    return () => { cancelled = true; };
  }, [authReady, libraryVersion]);

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    setLoadingJobs(true);
    void fetchJobs()
      .then((nextJobs) => {
        if (!cancelled) {
          setJobs(nextJobs);
          setJobsError(null);
        }
      })
      .catch(async (err) => {
        try {
          const active = await fetchActiveJob();
          if (cancelled) return;
          setJobs(active ? [active] : []);
          setJobsError(null);
        } catch {
          if (!cancelled) {
            setJobsError(err instanceof Error ? err.message : "Failed to load processing history");
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingJobs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  useEffect(() => {
    if (!authReady || !runningJobIds) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    const jobIds = runningJobIds.split(",");

    const poll = async () => {
      try {
        const updates = await Promise.all(jobIds.map((jobId) => fetchJob(jobId)));
        if (cancelled) return;
        const updatesById = new Map(updates.map((job) => [job.job_id, job]));
        setJobs((current) =>
          current.map((job) => updatesById.get(job.job_id) ?? job),
        );
        if (updates.some((job) => job.status === "done")) {
          onComplete();
          setLibraryVersion((version) => version + 1);
        } else {
          timeoutId = window.setTimeout(() => void poll(), 1500);
        }
      } catch (err) {
        if (!cancelled) {
          setJobsError(err instanceof Error ? err.message : "Failed to update processing jobs");
          timeoutId = window.setTimeout(() => void poll(), 1500);
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [authReady, onComplete, runningJobIds]);

  function upsertJob(nextJob: Job): void {
    setJobs((current) => [nextJob, ...current.filter((job) => job.job_id !== nextJob.job_id)]);
  }

  async function addToQueue(): Promise<void> {
    if (parsed.valid.length === 0) return;
    setStarting(true);
    setStartError(null);
    try {
      const jobId = await startIngest(parsed.valid, refresh);
      const nextJob = await fetchJob(jobId);
      upsertJob(nextJob);
      setText(parsed.invalid.join("\n"));
      setNotice(`${parsed.valid.length} ${parsed.valid.length === 1 ? "link was" : "links were"} received. Keep browsing while we organize ${parsed.valid.length === 1 ? "it" : "them"}.`);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to queue links");
    } finally {
      setStarting(false);
    }
  }

  async function retryLink(postUrl: string): Promise<void> {
    setStartError(null);
    try {
      const jobId = await startIngest([postUrl], true);
      upsertJob(await fetchJob(jobId));
      setNotice("Retry added to the queue.");
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to retry link");
    }
  }

  async function removePending(jobId: string, postUrl: string): Promise<void> {
    setStartError(null);
    try {
      await removePendingJobLink(jobId, postUrl);
      upsertJob(await fetchJob(jobId));
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to remove link");
    }
  }

  return (
    <div className="top-add-page">
      <header className="save-workspace-topbar">
        <Link className="save-workspace-wordmark" to={basePath || "/"}>Wanderfile<span aria-hidden="true">✳</span></Link>
        <span className="save-workspace-nav-label">Your library</span>
        <span className="save-workspace-header-note">Saved ideas, all in one place</span>
      </header>
      <div className="processing-layout">
        <section className="queue-panel draft-panel">
          <span className="save-workspace-eyebrow">Save something new</span>
          <h2>Keep the link. <br />Find it later.</h2>
          <p>Paste one or more links. Wanderfile accepts them first, then organizes them while you browse.</p>
          <label className="save-workspace-label" htmlFor="save-workspace-links">Links to save</label>
          <textarea
            id="save-workspace-links"
            className="links-input"
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && parsed.valid.length > 0 && !starting) void addToQueue();
            }}
            placeholder={"https://www.instagram.com/reel/...\nhttps://blog.example.com/tokyo-guide"}
          />
          {parsed.invalid.length > 0 ? (
            <p className="inline-errors" role="alert">Check {parsed.invalid.length} invalid {parsed.invalid.length === 1 ? "line" : "lines"}. Valid links can still be saved.</p>
          ) : null}
          <details className="advanced-options" open={advancedOpen} onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}>
            <summary>Advanced options</summary>
            <label className="refresh-row">
              <input type="checkbox" checked={refresh} onChange={(event) => setRefresh(event.target.checked)} />
              Re-fetch if already saved
            </label>
          </details>
          <div className="queue-actions">
            <button
              type="button"
              className="primary"
              disabled={parsed.valid.length === 0 || starting}
              onClick={() => void addToQueue()}
            >
              {starting
                ? "Adding…"
                : `Save ${parsed.valid.length || ""} link${parsed.valid.length === 1 ? "" : "s"}`}
            </button>
          </div>
          <small className="save-workspace-hint">⌘ / Ctrl + Enter to save · One link per line</small>
        </section>

        <div className="processing-jobs">
          <section className="queue-panel save-workspace-library">
            <div className="save-workspace-heading"><div><span className="save-workspace-eyebrow">Your library</span><h2>Ideas worth keeping.</h2></div><Link to={`${basePath}/posts`}>Browse while saving →</Link></div>
            <div className={`save-workspace-status${needsAttention ? " has-issue" : ""}`} role="status" aria-live="polite">
              <span className="save-workspace-status-icon" aria-hidden="true">{needsAttention ? "!" : activeCount ? "↻" : "✓"}</span>
              <div><strong>{needsAttention ? `${needsAttention} ${needsAttention === 1 ? "link needs" : "links need"} attention` : activeCount ? "Organizing your saves" : queueLinks.length ? "All links processed" : "Ready when you are"}</strong><span>{activeCount ? `${queuedPending} waiting · You can keep browsing` : queueLinks.length ? "Your queue is up to date" : "Paste a link to start saving"}</span></div>
            </div>
            {notice ? <p className="save-workspace-notice" role="status">{notice}</p> : null}
            {startError ? <p className="inline-errors" role="alert">{startError}</p> : null}
            {jobsError ? <p className="inline-errors" role="alert">{jobsError}</p> : null}
            <h3 className="save-workspace-section-title">Save queue <span>{queueLinks.length} {queueLinks.length === 1 ? "link" : "links"}</span></h3>
            {loadingJobs ? <p className="empty-copy">Loading jobs…</p> : null}
            {!loadingJobs && queueLinks.length === 0 ? (
              <p className="empty-copy">Your saved links will appear here.</p>
            ) : null}
            <div className="save-workspace-queue-list">
              {queueLinks.map(({ job, link }) => (
                <div className="save-workspace-queue-row" key={link.post_url}>
                  <span className={`save-workspace-row-dot is-${link.status}`} aria-hidden="true" />
                  <div className="save-workspace-row-main"><strong>{safeHost(link.post_url)}</strong><small title={link.post_url}>{link.error_message || link.post_url}</small></div>
                  <span className={`save-workspace-row-status is-${link.status}`}>{LINK_STATUS_LABELS[link.status]}</span>
                  {link.status === "pending" ? <button type="button" onClick={() => void removePending(job.job_id, link.post_url)}>Remove</button> : null}
                  {link.status === "error" ? <button type="button" onClick={() => void retryLink(link.post_url)}>Retry</button> : null}
                  {link.post_id ? <button type="button" onClick={() => {
                    const { platform, nativeId } = parsePostId(link.post_id!);
                    navigate(`${basePath}/posts/${platform}/${nativeId}`);
                  }}>Open</button> : null}
                </div>
              ))}
            </div>
            <div className="save-workspace-recent">
              <div className="save-workspace-heading"><h3 className="save-workspace-section-title">Recently saved</h3><Link to={`${basePath}/posts`}>Explore your library →</Link></div>
              {recentPosts.length ? <div className="save-workspace-recent-grid">{recentPosts.map((post) => {
                const { platform, nativeId } = parsePostId(post.post_id);
                return <Link key={post.post_id} to={`${basePath}/posts/${platform}/${nativeId}`} className="save-workspace-recent-card">
                  {post.thumbnail_url ? <img src={post.thumbnail_url} alt="" loading="lazy" /> : <span className="save-workspace-recent-placeholder" aria-hidden="true" />}
                  <strong>{post.caption?.trim().slice(0, 80) || safeHost(post.post_url)}</strong>
                  <small>{post.content_category || post.platform}</small>
                </Link>;
              })}</div> : <p className="empty-copy">Your saved ideas will appear here.</p>}
            </div>
          </section>

          <details className="queue-panel completed-history">
            <summary className="queue-section-heading">
              <h2>History</h2>
              <span>Last 7 days</span>
            </summary>
            {!loadingJobs && historicJobs.length === 0 ? (
              <p className="empty-copy">No recent processing.</p>
            ) : null}
            {historicJobs.map((job) => (
              <JobCard
                key={job.job_id}
                job={job}
                onOpen={(postId) => {
                  if (postId) {
                    const { platform, nativeId } = parsePostId(postId);
                    navigate(`${basePath}/posts/${platform}/${nativeId}`);
                  } else {
                    navigate(`${basePath}/posts`);
                  }
                }}
                onRetry={(postUrl) => void retryLink(postUrl)}
              />
            ))}
          </details>
        </div>
      </div>
    </div>
  );
}

function JobCard({
  job,
  onOpen,
  onRemovePending,
  onRetry,
}: {
  job: Job;
  onOpen: (postId?: string | null) => void;
  onRemovePending?: (postUrl: string) => void;
  onRetry: (postUrl: string) => void;
}) {
  const summary = [
    `${job.counts.saved} saved`,
    `${job.counts.linked} linked`,
    `${job.counts.error} errors`,
  ].join(" · ");
  const processed = job.links.filter((link) => link.status !== "pending" && link.status !== "fetching").length;
  const total = job.links.length;

  return (
    <article className="job-card">
      <header>
        <div>
          <b>{job.status === "running" ? "Processing" : "Complete"}</b>
          <span>{summary}</span>
          <span className="job-progress-label">{processed} of {total} processed</span>
          <progress aria-label={`${processed} of ${total} links processed`} max={Math.max(total, 1)} value={processed} />
        </div>
        {job.created_at ? <time dateTime={job.created_at}>{formatJobDate(job.created_at)}</time> : null}
      </header>
      <div className="job-list">
        {job.links.map((link) => (
          <JobLinkRow
            key={link.post_url}
            link={link}
            onOpen={onOpen}
            onRemovePending={onRemovePending}
            onRetry={onRetry}
          />
        ))}
      </div>
    </article>
  );
}

function JobLinkRow({
  link,
  onOpen,
  onRemovePending,
  onRetry,
}: {
  link: JobLink;
  onOpen: (postId?: string | null) => void;
  onRemovePending?: (postUrl: string) => void;
  onRetry: (postUrl: string) => void;
}) {
  return (
    <article>
      <b>{LINK_STATUS_LABELS[link.status]}</b>
      <span title={link.post_url}>{link.post_url}</span>
      {link.error_message ? <small>{link.error_message}</small> : null}
      {link.status === "pending" && onRemovePending ? (
        <button type="button" aria-label={`Remove ${link.post_url}`} onClick={() => onRemovePending(link.post_url)}>
          Remove
        </button>
      ) : null}
      {link.status === "error" ? (
        <button type="button" onClick={() => onRetry(link.post_url)}>Retry</button>
      ) : null}
      {link.post_id ? (
        <button type="button" onClick={() => onOpen(link.post_id)}>
          Open
        </button>
      ) : null}
    </article>
  );
}

function formatJobDate(createdAt: string): string {
  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) return createdAt;
  return parsedDate.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
