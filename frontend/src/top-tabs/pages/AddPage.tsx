import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchActiveJob, fetchJob, fetchJobs, removePendingJobLink, startIngest, type Job, type JobLink } from "../../api";
import { PageHeading } from "../../components/PageHeading";
import { useLabTheme } from "../theme";
import "../../add-page.css";

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [starting, setStarting] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
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
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to queue links");
    } finally {
      setStarting(false);
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
      <PageHeading
        kicker="Wanderfile queue"
        title="Processing"
        lede="Add links anytime. They join your queue and stay there on every device you sign in with."
        count={{ value: queuedPending, label: "pending" }}
        platformFilter={false}
      />
      <div className="processing-layout">
        <section className="queue-panel draft-panel">
          <h2>Add links</h2>
          <p>Paste one URL per line. You can keep adding while others are processing.</p>
          <textarea
            className="links-input"
            rows={5}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"https://www.instagram.com/reel/...\nhttps://blog.example.com/tokyo-guide"}
          />
          {parsed.invalid.length > 0 ? (
            <p className="inline-errors">Not a valid URL: {parsed.invalid.join(", ")}</p>
          ) : null}
          <label className="refresh-row">
            <input type="checkbox" checked={refresh} onChange={(event) => setRefresh(event.target.checked)} />
            Re-fetch if already saved
          </label>
          <div className="queue-actions">
            <button
              type="button"
              className="primary"
              disabled={parsed.valid.length === 0 || starting}
              onClick={() => void addToQueue()}
            >
              {starting
                ? "Adding…"
                : `Add ${parsed.valid.length} link${parsed.valid.length === 1 ? "" : "s"} to queue`}
            </button>
          </div>
          {startError ? <p className="inline-errors">{startError}</p> : null}
        </section>

        <div className="processing-jobs">
          <section className="queue-panel">
            <h2>Ongoing</h2>
            {loadingJobs ? <p className="empty-copy">Loading jobs…</p> : null}
            {!loadingJobs && runningJobs.length === 0 ? (
              <p className="empty-copy">Nothing is processing right now.</p>
            ) : null}
            {runningJobs.map((job) => (
              <JobCard
                key={job.job_id}
                job={job}
                onOpen={() => navigate(`${basePath}/posts`)}
                onRemovePending={
                  (job.kind ?? "link_ingest") === "link_ingest"
                    ? (postUrl) => void removePending(job.job_id, postUrl)
                    : undefined
                }
              />
            ))}
          </section>

          <section className="queue-panel">
            <div className="queue-section-heading">
              <h2>History</h2>
              <span>Last 7 days</span>
            </div>
            {!loadingJobs && historicJobs.length === 0 ? (
              <p className="empty-copy">No recent processing.</p>
            ) : null}
            {historicJobs.map((job) => (
              <JobCard
                key={job.job_id}
                job={job}
                onOpen={() => navigate(`${basePath}/posts`)}
              />
            ))}
          </section>
          {jobsError ? <p className="inline-errors">{jobsError}</p> : null}
        </div>
      </div>
    </div>
  );
}

function JobCard({
  job,
  onOpen,
  onRemovePending,
}: {
  job: Job;
  onOpen: () => void;
  onRemovePending?: (postUrl: string) => void;
}) {
  const summary = [
    `${job.counts.saved} saved`,
    `${job.counts.linked} linked`,
    `${job.counts.error} errors`,
  ].join(" · ");

  return (
    <article className="job-card">
      <header>
        <div>
          <b>{job.status === "running" ? "Processing" : "Complete"}</b>
          <span>{summary}</span>
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
}: {
  link: JobLink;
  onOpen: () => void;
  onRemovePending?: (postUrl: string) => void;
}) {
  return (
    <article>
      <b>{link.status}</b>
      <span title={link.post_url}>{link.post_url}</span>
      {link.error_message ? <small>{link.error_message}</small> : null}
      {link.status === "pending" && onRemovePending ? (
        <button type="button" aria-label={`Remove ${link.post_url}`} onClick={() => onRemovePending(link.post_url)}>
          Remove
        </button>
      ) : null}
      {link.post_id ? (
        <button type="button" onClick={onOpen}>
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
