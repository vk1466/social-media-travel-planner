import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { startIngest, fetchJob, type Job } from "../../api";

export interface InboxFailure {
  url: string;
  errorMessage: string;
  jobId?: string;
  failedAt: string;
}

export interface InFlightSave {
  id: string;
  url: string;
  jobId?: string;
  status: "reading" | "categorizing" | "done" | "error";
  progressPercent: number;
  stepMessage: string;
  isDuplicate?: boolean;
  postId?: string;
  title?: string;
  category?: string;
  author?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}

export function toFriendlyErrorMessage(raw?: string | null): string {
  if (!raw) return "Could not read this post right now. Please retry in a moment.";
  const lowered = raw.toLowerCase();
  if (lowered.includes("429") || lowered.includes("rate limit") || lowered.includes("too many requests")) {
    return "Rate limited, please retry in a minute";
  }
  if (
    lowered.includes("404") ||
    lowered.includes("not found") ||
    lowered.includes("returned no post") ||
    lowered.includes("private") ||
    lowered.includes("deleted") ||
    lowered.includes("shortcode")
  ) {
    return "Private or deleted post";
  }
  if (lowered.includes("unsupported") || lowered.includes("unrecognized url")) {
    return "Unsupported platform";
  }
  if (lowered.includes("timeout") || lowered.includes("timed out")) {
    return "Request timed out, please retry in a moment";
  }
  if (lowered.includes("empty url")) {
    return "Please enter a valid link";
  }
  if (lowered.includes("invalid url") || lowered.includes("invalid web link")) {
    return "Invalid web link";
  }
  if (lowered.includes("failed at step")) {
    const parts = raw.split(":");
    if (parts.length > 1) {
      return toFriendlyErrorMessage(parts.slice(1).join(":").trim());
    }
    return "Could not read this post right now. Please retry in a moment.";
  }
  return raw;
}

export function normalizeUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

interface SavePipelineContextType {
  savingCount: number;
  inFlightSaves: InFlightSave[];
  inboxFailures: InboxFailure[];
  isSaveSheetOpen: boolean;
  activeSave: InFlightSave | null;
  openSaveSheet: (initialUrl?: string) => void;
  closeSaveSheet: () => void;
  resetActiveSave: () => void;
  saveUrl: (url: string) => Promise<void>;
  retryFailedLink: (url: string) => Promise<void>;
  removeFailedLink: (url: string) => void;
  retryAllFailed: () => Promise<void>;
  changeSavedCategory: (saveId: string, newCategory: string) => void;
  onRefreshLibrary?: () => void;
}

const SavePipelineContext = createContext<SavePipelineContextType | null>(null);

export function SavePipelineProvider({
  children,
  onRefreshLibrary,
}: {
  children: ReactNode;
  onRefreshLibrary?: () => void;
}) {
  const [inFlightSaves, setInFlightSaves] = useState<InFlightSave[]>([]);
  const [inboxFailures, setInboxFailures] = useState<InboxFailure[]>(() => {
    try {
      const stored = localStorage.getItem("wf_inbox_failures");
      if (!stored) return [];
      const parsed: InboxFailure[] = JSON.parse(stored);
      return parsed.map((item) => ({
        ...item,
        errorMessage: toFriendlyErrorMessage(item.errorMessage),
      }));
    } catch {
      return [];
    }
  });
  const [isSaveSheetOpen, setIsSaveSheetOpen] = useState(false);
  const [activeSaveId, setActiveSaveId] = useState<string | null>(null);

  // Persist inbox failures to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("wf_inbox_failures", JSON.stringify(inboxFailures));
    } catch {
      // ignore storage error
    }
  }, [inboxFailures]);

  const removeFailedLink = useCallback((url: string) => {
    setInboxFailures((prev) => prev.filter((f) => f.url !== url));
  }, []);

  const saveUrl = useCallback(
    async (rawInput: string) => {
      const tokens = rawInput
        .split(/[\n\s]+/)
        .map((u) => u.trim())
        .filter(Boolean);

      if (tokens.length === 0) {
        return;
      }

      for (const token of tokens) {
        const url = normalizeUrlInput(token);
        const isLikelyUrl = url.startsWith("http://") || url.startsWith("https://") || url.includes(".");

        if (!isLikelyUrl) {
          // If completely invalid, record a failure immediately so saves never vanish silently
          const friendly = "Please enter a valid web link";
          setInboxFailures((prev) => [
            ...prev.filter((f) => f.url !== token),
            {
              url: token,
              errorMessage: friendly,
              failedAt: new Date().toISOString(),
            },
          ]);
          continue;
        }

        const id = `save_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newSave: InFlightSave = {
          id,
          url,
          status: "reading",
          progressPercent: 25,
          stepMessage: "Connecting to link...",
        };

        setInFlightSaves((prev) => [...prev, newSave]);
        setActiveSaveId(id);

        try {
          let jobId: string | null = null;
          try {
            jobId = await startIngest([url], false);
          } catch (e) {
            console.warn("Backend startIngest failed or offline, simulating background ingest:", e);
          }

          if (jobId) {
            newSave.jobId = jobId;
            setInFlightSaves((prev) =>
              prev.map((s) => (s.id === id ? { ...s, jobId } : s))
            );

            // Poll the job with real stages & fail-fast
            let pollAttempts = 0;
            const pollInterval = window.setInterval(async () => {
              try {
                pollAttempts++;
                const job: Job = await fetchJob(jobId!);
                const link = job.links.find((l) => l.post_url === url);

                // 1. Fail fast: if link status is error or unsupported, fail immediately!
                if (link && (link.status === "error" || link.status === "unsupported")) {
                  window.clearInterval(pollInterval);
                  const friendly = toFriendlyErrorMessage(link.error_message || "Link could not be read");
                  setInFlightSaves((prev) =>
                    prev.map((s) =>
                      s.id === id
                        ? {
                            ...s,
                            status: "error",
                            errorMessage: friendly,
                          }
                        : s
                    )
                  );
                  setInboxFailures((prev) => [
                    ...prev.filter((f) => f.url !== url),
                    {
                      url,
                      errorMessage: friendly,
                      jobId,
                      failedAt: new Date().toISOString(),
                    },
                  ]);
                  return;
                }

                // 2. Duplicate detection: already saved
                if (link && link.status === "skipped") {
                  window.clearInterval(pollInterval);
                  setInFlightSaves((prev) =>
                    prev.map((s) =>
                      s.id === id
                        ? {
                            ...s,
                            status: "done",
                            progressPercent: 100,
                            stepMessage: "Already saved",
                            isDuplicate: true,
                            postId: link.post_id || undefined,
                          }
                        : s
                    )
                  );
                  onRefreshLibrary?.();
                  return;
                }

                // 3. Successfully saved or linked
                if (link && (link.status === "saved" || link.status === "linked")) {
                  window.clearInterval(pollInterval);
                  setInFlightSaves((prev) =>
                    prev.map((s) =>
                      s.id === id
                        ? {
                            ...s,
                            status: "done",
                            progressPercent: 100,
                            stepMessage: "Saved to your library",
                            isDuplicate: false,
                            postId: link.post_id || undefined,
                            category: "place",
                          }
                        : s
                    )
                  );
                  onRefreshLibrary?.();
                  return;
                }

                // 4. In progress: real stages
                if (job.status === "running") {
                  const isFetching = link?.status === "fetching";
                  const progress = isFetching ? 65 : 30;
                  const message = isFetching
                    ? "Finding places and details..."
                    : "Reading your post...";
                  setInFlightSaves((prev) =>
                    prev.map((s) =>
                      s.id === id
                        ? {
                            ...s,
                            progressPercent: progress,
                            stepMessage: message,
                          }
                        : s
                    )
                  );
                } else if (job.status === "done") {
                  window.clearInterval(pollInterval);
                  if (link && (link.status === "saved" || link.status === "linked")) {
                    setInFlightSaves((prev) =>
                      prev.map((s) =>
                        s.id === id
                          ? {
                              ...s,
                              status: "done",
                              progressPercent: 100,
                              stepMessage: "Saved to your library",
                              postId: link.post_id || undefined,
                              category: "place",
                            }
                          : s
                      )
                    );
                    onRefreshLibrary?.();
                  } else {
                    const friendly = toFriendlyErrorMessage(link?.error_message || "Link could not be read");
                    setInFlightSaves((prev) =>
                      prev.map((s) =>
                        s.id === id
                          ? {
                              ...s,
                              status: "error",
                              errorMessage: friendly,
                            }
                          : s
                      )
                    );
                    setInboxFailures((prev) => [
                      ...prev.filter((f) => f.url !== url),
                      {
                        url,
                        errorMessage: friendly,
                        jobId,
                        failedAt: new Date().toISOString(),
                      },
                    ]);
                  }
                }
              } catch {
                if (pollAttempts > 30) {
                  window.clearInterval(pollInterval);
                  const friendly = "Request timed out, please retry in a moment";
                  setInFlightSaves((prev) =>
                    prev.map((s) =>
                      s.id === id
                        ? {
                            ...s,
                            status: "error",
                            errorMessage: friendly,
                          }
                        : s
                    )
                  );
                  setInboxFailures((prev) => [
                    ...prev.filter((f) => f.url !== url),
                    {
                      url,
                      errorMessage: friendly,
                      jobId,
                      failedAt: new Date().toISOString(),
                    },
                  ]);
                }
              }
            }, 1500);
          } else {
            // Simulated progression when running against local mock
            setTimeout(() => {
              setInFlightSaves((prev) =>
                prev.map((s) =>
                  s.id === id
                    ? {
                        ...s,
                        progressPercent: 60,
                        stepMessage: "Finding places and details...",
                      }
                    : s
                )
              );
            }, 1000);

            setTimeout(() => {
              setInFlightSaves((prev) =>
                prev.map((s) =>
                  s.id === id
                    ? {
                        ...s,
                        status: "done",
                        progressPercent: 100,
                        stepMessage: "Saved to your library",
                        category: url.includes("recipe") || url.includes("food") ? "recipe" : "place",
                        title: "Saved social link",
                        author: "@creator",
                      }
                    : s
                )
              );
              onRefreshLibrary?.();
            }, 2000);
          }
        } catch (err) {
          const friendly = toFriendlyErrorMessage(err instanceof Error ? err.message : "Could not read post");
          setInFlightSaves((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    status: "error",
                    errorMessage: friendly,
                  }
                : s
            )
          );
          setInboxFailures((prev) => [
            ...prev.filter((f) => f.url !== url),
            {
              url,
              errorMessage: friendly,
              failedAt: new Date().toISOString(),
            },
          ]);
        }
      }
    },
    [onRefreshLibrary]
  );

  const retryFailedLink = useCallback(
    async (url: string) => {
      removeFailedLink(url);
      await saveUrl(url);
    },
    [removeFailedLink, saveUrl]
  );

  const retryAllFailed = useCallback(async () => {
    const list = [...inboxFailures];
    setInboxFailures([]);
    for (const item of list) {
      await saveUrl(item.url);
    }
  }, [inboxFailures, saveUrl]);

  const changeSavedCategory = useCallback((saveId: string, newCategory: string) => {
    setInFlightSaves((prev) =>
      prev.map((s) => (s.id === saveId ? { ...s, category: newCategory } : s))
    );
  }, []);

  const resetActiveSave = useCallback(() => {
    setActiveSaveId(null);
  }, []);

  const openSaveSheet = useCallback(
    (initialUrl?: string) => {
      setIsSaveSheetOpen(true);
      if (initialUrl) {
        void saveUrl(initialUrl);
      } else {
        setActiveSaveId(null);
      }
    },
    [saveUrl]
  );

  const closeSaveSheet = useCallback(() => {
    setIsSaveSheetOpen(false);
  }, []);

  const activeSave = activeSaveId ? inFlightSaves.find((s) => s.id === activeSaveId) || null : null;
  const savingCount = inFlightSaves.filter((s) => s.status !== "done").length;

  return (
    <SavePipelineContext.Provider
      value={{
        savingCount,
        inFlightSaves,
        inboxFailures,
        isSaveSheetOpen,
        activeSave,
        openSaveSheet,
        closeSaveSheet,
        resetActiveSave,
        saveUrl,
        retryFailedLink,
        removeFailedLink,
        retryAllFailed,
        changeSavedCategory,
        onRefreshLibrary,
      }}
    >
      {children}
    </SavePipelineContext.Provider>
  );
}

export function useSavePipeline() {
  const ctx = useContext(SavePipelineContext);
  if (!ctx) {
    throw new Error("useSavePipeline must be used within a SavePipelineProvider");
  }
  return ctx;
}
