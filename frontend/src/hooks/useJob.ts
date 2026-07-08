import { useEffect, useState } from "react";

import { fetchJob, type Job } from "../api";

const POLL_INTERVAL_MS = 1500;

export function useJob(jobId: string | null) {
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setError(null);
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const poll = async () => {
      try {
        const nextJob = await fetchJob(jobId);
        if (cancelled) {
          return;
        }
        setJob(nextJob);
        setError(null);
        if (nextJob.status === "running") {
          timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (pollError) {
        if (!cancelled) {
          setError(pollError instanceof Error ? pollError.message : "Failed to load job");
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [jobId]);

  return { job, error };
}
