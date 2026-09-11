import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchJob, startIngest, type Job } from "../../api";
import { DetailSheet } from "./DetailSheet";

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function AddLinkSheet({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [refresh, setRefresh] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);

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
    inputRef.current?.focus();
  }, []);

  const runningJobId = job?.status === "running" ? job.job_id : null;

  useEffect(() => {
    if (!runningJobId) return;
    let cancelled = false;
    let timeoutId: number | undefined;
    const poll = async () => {
      try {
        const next = await fetchJob(runningJobId);
        if (cancelled) return;
        setJob(next);
        if (next.status === "done") onComplete();
        else timeoutId = window.setTimeout(() => void poll(), 1500);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to update processing");
        }
      }
    };
    timeoutId = window.setTimeout(() => void poll(), 1500);
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [onComplete, runningJobId]);

  return (
    <DetailSheet title="Add a link" onClose={onClose}>
      <p className="eyebrow">Quick add</p>
      <h2 className="sheet-title">Paste a link</h2>
      <p className="sheet-copy">Instagram, TikTok, YouTube, or the web. One URL per line.</p>
      <textarea
        ref={inputRef}
        className="links-input"
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="https://www.instagram.com/reel/..."
        disabled={starting || job?.status === "running"}
      />
      {parsed.invalid.length > 0 ? (
        <p className="inline-errors">Not a valid URL: {parsed.invalid.join(", ")}</p>
      ) : null}
      <label className="refresh-row">
        <input
          type="checkbox"
          checked={refresh}
          onChange={(event) => setRefresh(event.target.checked)}
          disabled={starting || job?.status === "running"}
        />
        Re-fetch if already saved
      </label>
      <div className="sheet-actions">
        <button
          type="button"
          className="primary"
          disabled={parsed.valid.length === 0 || starting || job?.status === "running"}
          onClick={async () => {
            setError(null);
            setStarting(true);
            try {
              const jobId = await startIngest(parsed.valid, refresh);
              setText("");
              setJob({
                job_id: jobId,
                status: "running",
                refresh,
                counts: {
                  pending: parsed.valid.length,
                  fetching: 0,
                  saved: 0,
                  linked: 0,
                  skipped: 0,
                  unsupported: 0,
                  error: 0,
                },
                links: parsed.valid.map((postUrl) => ({ post_url: postUrl, status: "pending" })),
              });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to start processing");
            } finally {
              setStarting(false);
            }
          }}
        >
          {starting
            ? "Starting…"
            : `Add ${parsed.valid.length} link${parsed.valid.length === 1 ? "" : "s"}`}
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            navigate("/add");
          }}
        >
          Open processing
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
            </article>
          ))}
        </section>
      ) : null}
    </DetailSheet>
  );
}
