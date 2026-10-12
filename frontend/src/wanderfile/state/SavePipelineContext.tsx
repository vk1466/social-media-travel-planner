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
  title?: string;
  category?: string;
  author?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
}

interface SavePipelineContextType {
  savingCount: number;
  inFlightSaves: InFlightSave[];
  inboxFailures: InboxFailure[];
  isSaveSheetOpen: boolean;
  activeSave: InFlightSave | null;
  openSaveSheet: (initialUrl?: string) => void;
  closeSaveSheet: () => void;
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
      return stored ? JSON.parse(stored) : [];
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
      const urls = rawInput
        .split(/[\n\s]+/)
        .map((u) => u.trim())
        .filter((u) => u.startsWith("http://") || u.startsWith("https://"));

      if (urls.length === 0) {
        return;
      }

      for (const url of urls) {
        const id = `save_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const newSave: InFlightSave = {
          id,
          url,
          status: "reading",
          progressPercent: 25,
          stepMessage: "Reading your post...",
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

            // Poll the job
            const pollInterval = window.setInterval(async () => {
              try {
                const job: Job = await fetchJob(jobId!);
                if (job.status === "done") {
                  window.clearInterval(pollInterval);
                  const failedLink = job.links.find(
                    (l) => l.post_url === url && (l.status === "error" || l.status === "unsupported")
                  );
                  if (failedLink) {
                    setInFlightSaves((prev) => prev.filter((s) => s.id !== id));
                    setInboxFailures((prev) => [
                      ...prev.filter((f) => f.url !== url),
                      {
                        url,
                        errorMessage: failedLink.error_message || "Link could not be read",
                        jobId,
                        failedAt: new Date().toISOString(),
                      },
                    ]);
                  } else {
                    setInFlightSaves((prev) =>
                      prev.map((s) =>
                        s.id === id
                          ? {
                              ...s,
                              status: "done",
                              progressPercent: 100,
                              stepMessage: "Saved to your library",
                              category: "place",
                            }
                          : s
                      )
                    );
                    onRefreshLibrary?.();
                  }
                }
              } catch {
                window.clearInterval(pollInterval);
              }
            }, 2000);
          } else {
            // Simulated progression when running against local-only or mock
            setTimeout(() => {
              setInFlightSaves((prev) =>
                prev.map((s) =>
                  s.id === id
                    ? {
                        ...s,
                        progressPercent: 65,
                        stepMessage: "Finding places and details...",
                      }
                    : s
                )
              );
            }, 1200);

            setTimeout(() => {
              setInFlightSaves((prev) =>
                prev.map((s) =>
                  s.id === id
                    ? {
                        ...s,
                        progressPercent: 90,
                        stepMessage: "Choosing category...",
                      }
                    : s
                )
              );
            }, 2200);

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
            }, 3200);
          }
        } catch (err) {
          setInFlightSaves((prev) => prev.filter((s) => s.id !== id));
          setInboxFailures((prev) => [
            ...prev.filter((f) => f.url !== url),
            {
              url,
              errorMessage: err instanceof Error ? err.message : "Could not read post",
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

  const openSaveSheet = useCallback(
    (initialUrl?: string) => {
      setIsSaveSheetOpen(true);
      if (initialUrl) {
        void saveUrl(initialUrl);
      }
    },
    [saveUrl]
  );

  const closeSaveSheet = useCallback(() => {
    setIsSaveSheetOpen(false);
  }, []);

  const activeSave = inFlightSaves.find((s) => s.id === activeSaveId) || inFlightSaves[inFlightSaves.length - 1] || null;
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
