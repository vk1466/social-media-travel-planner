import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchActiveJob, fetchJob, startIngest, type Job } from "../../api";
import { PageHeading } from "../components/Shell";
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
  const [refresh, setRefresh] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    void fetchActiveJob()
      .then((active) => {
        if (!cancelled && active?.status === "running") {
          setJobId(active.job_id);
          setJob(active);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [authReady]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const poll = async () => {
      const next = await fetchJob(jobId);
      if (cancelled) return;
      setJob(next);
      if (next.status === "done") onComplete();
      else window.setTimeout(() => void poll(), 1500);
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [jobId, onComplete]);

  return (
    <>
      <PageHeading
        kicker="Add to Wanderfile"
        title="Bring your inspiration together"
        lede="Paste links from Instagram, TikTok, YouTube, or the web. Use one link per line."
      />
      <textarea
        className="links-input"
        rows={6}
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
      <div className="sheet-actions">
        <button
          type="button"
          className="primary"
          disabled={parsed.valid.length === 0}
          onClick={async () => {
            setError(null);
            try {
              const nextJobId = await startIngest(parsed.valid, refresh);
              setText("");
              setJobId(nextJobId);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to start ingest");
            }
          }}
        >
          Save {parsed.valid.length} link{parsed.valid.length === 1 ? "" : "s"}
        </button>
      </div>
      {error ? <p className="inline-errors">{error}</p> : null}
      {job ? (
        <section className="job-list">
          <h3 className="sheet-section">{job.status === "running" ? "Saving…" : "Done"}</h3>
          {job.links.map((link) => (
            <article key={link.post_url}>
              <b>{link.status}</b>
              <span>{link.post_url}</span>
              {link.post_id ? (
                <button type="button" onClick={() => navigate(`${basePath}/posts`)}>
                  Open
                </button>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}
