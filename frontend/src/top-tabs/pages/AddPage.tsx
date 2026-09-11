import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchActiveJob, fetchJob, fetchJobs, startIngest, type Job, type JobLink } from "../../api";
import { PageHeading } from "../../components/PageHeading";
import { useLabTheme } from "../theme";

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
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
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

  function addToDraft(): void {
    setPendingUrls((current) => {
      const seen = new Set(current);
      const additions = parsed.valid.filter((url) => {
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });
      return [...current, ...additions];
    });
    setText(parsed.invalid.join("\n"));
  }

  async function startProcessing(): Promise<void> {
    const submittedUrls = [...pendingUrls];
    if (submittedUrls.length === 0) return;
    setStarting(true);
    setStartError(null);
    try {
      const jobId = await startIngest(submittedUrls, refresh);
      setPendingUrls((current) => current.filter((url) => !submittedUrls.includes(url)));
      const pendingJob: Job = {
        job_id: jobId,
        status: "running",
        refresh,
        counts: {
          pending: submittedUrls.length,
          fetching: 0,
          saved: 0,
          linked: 0,
          skipped: 0,
          unsupported: 0,
          error: 0,
        },
        links: submittedUrls.map((postUrl) => ({ post_url: postUrl, status: "pending" })),
      };
      setJobs((current) => [pendingJob, ...current.filter((job) => job.job_id !== jobId)]);
    } catch (err) {
      setStartError(err instanceof Error ? err.message : "Failed to start processing");
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      <PageHeading
        kicker="Wanderfile queue"
        title="Processing"
        lede="Build a draft, start processing, and follow recent link activity."
        count={{ value: pendingUrls.length, label: "pending" }}
        platformFilter={false}
      />
      <div className="processing-layout">
        <section className="queue-panel draft-panel">
          <h2>Add links</h2>
          <p>Paste one URL per line, then review the draft before processing.</p>
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
          <div className="queue-actions">
            <button
              type="button"
              disabled={parsed.valid.length === 0}
              onClick={addToDraft}
            >
              Add to list
            </button>
          </div>

          <h3 className="sheet-section">Pending draft</h3>
          {pendingUrls.length === 0 ? (
            <p className="empty-copy">No links waiting.</p>
          ) : (
            <div className="draft-list">
              {pendingUrls.map((url) => (
                <article key={url}>
                  <span>{url}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${url}`}
                    onClick={() => setPendingUrls((current) => current.filter((item) => item !== url))}
                  >
                    Remove
                  </button>
                </article>
              ))}
            </div>
          )}
          <label className="refresh-row">
            <input type="checkbox" checked={refresh} onChange={(event) => setRefresh(event.target.checked)} />
            Re-fetch if already saved
          </label>
          <div className="queue-actions">
            <button
              type="button"
              className="primary"
              disabled={pendingUrls.length === 0 || starting}
              onClick={() => void startProcessing()}
            >
              {starting
                ? "Starting…"
                : `Start processing ${pendingUrls.length} link${pendingUrls.length === 1 ? "" : "s"}`}
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
    </>
  );
}

function JobCard({ job, onOpen }: { job: Job; onOpen: () => void }) {
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
          <JobLinkRow key={link.post_url} link={link} onOpen={onOpen} />
        ))}
      </div>
    </article>
  );
}

function JobLinkRow({ link, onOpen }: { link: JobLink; onOpen: () => void }) {
  return (
    <article>
      <b>{link.status}</b>
      <span title={link.post_url}>{link.post_url}</span>
      {link.error_message ? <small>{link.error_message}</small> : null}
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
