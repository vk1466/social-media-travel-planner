import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { startIngest, fetchJob, fetchPost, parsePostId, type Job } from "../../api";

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

export function urlsMatch(url1?: string | null, url2?: string | null): boolean {
  if (!url1 || !url2) return false;
  if (url1 === url2) return true;
  const clean = (u: string) => {
    let s = u.trim().toLowerCase();
    s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
    s = s.split("?")[0].split("#")[0];
    return s.replace(/\/+$/, "");
  };
  const c1 = clean(url1);
  const c2 = clean(url2);
  if (c1 === c2) return true;
  const igExtract = (s: string) => {
    const m = s.match(/(?:instagram\.com\/|instagr\.am\/)(?:p|reel|reels)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  };
  const code1 = igExtract(url1);
  const code2 = igExtract(url2);
  if (code1 && code2 && code1 === code2) return true;
  return false;
}

export function toFriendlyErrorMessage(raw?: string | null, url?: string | null): string {
  if (url) {
    const loweredUrl = url.toLowerCase();
    if (
      loweredUrl.includes("tiktok.com") ||
      loweredUrl.includes("youtube.com") ||
      loweredUrl.includes("youtu.be")
    ) {
      return "Only Instagram links are supported right now";
    }
  }
  if (!raw) return "Could not read this post right now. Please retry in a moment.";
  const lowered = raw.toLowerCase();
  if (lowered.includes("tiktok") || lowered.includes("youtube")) {
    return "Only Instagram links are supported right now";
  }
  if (lowered.includes("429") || lowered.includes("rate limit") || lowered.includes("too many requests")) {
    return "Rate limited, please retry in a minute";
  }
  if (
    lowered.includes("404") ||
    lowered.includes("not found") ||
    lowered.includes("returned no post") ||
    lowered.includes("does not exist") ||
    lowered.includes("no longer exists") ||
    lowered.includes("empty data") ||
    lowered.includes("empty or nonexistent") ||
    lowered.includes("private") ||
    lowered.includes("deleted") ||
    lowered.includes("could not be fetched") ||
    lowered.includes("shortcode")
  ) {
    return "Private or deleted post";
  }
  if (
    lowered.includes("network") ||
    lowered.includes("connection") ||
    lowered.includes("dns") ||
    lowered.includes("econnrefused") ||
    lowered.includes("failed to fetch") ||
    lowered.includes("blocked") ||
    lowered.includes("403")
  ) {
    return "Network error, please retry";
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
      return toFriendlyErrorMessage(parts.slice(1).join(":").trim(), url);
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

export function updateFailuresRetainingSpecific(
  prev: InboxFailure[],
  newFailure: InboxFailure
): InboxFailure[] {
  const existing = prev.find((f) => urlsMatch(f.url, newFailure.url));
  const isGenericTimeout = newFailure.errorMessage.toLowerCase().includes("timed out");
  if (
    existing &&
    existing.errorMessage &&
    isGenericTimeout &&
    !existing.errorMessage.toLowerCase().includes("timed out")
  ) {
    return prev;
  }
  return [
    ...prev.filter((f) => !urlsMatch(f.url, newFailure.url)),
    newFailure,
  ];
}

export const MAX_POLL_ATTEMPTS = 20;
export const POLL_INTERVAL_MS = 1500;

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
      return parsed
        .filter((item) => {
          const u = (item.url || "").toLowerCase();
          const m = (item.errorMessage || "").toLowerCase();
          if (u.includes("tiktok") || u.includes("youtube") || u.includes("youtu.be")) return false;
          if (m.includes("tiktok") || m.includes("youtube")) return false;
          return true;
        })
        .map((item) => {
          let msg = item.errorMessage;
          // Re-classify existing failed rows with positive evidence (e.g. C2xQ5T2ST8l deleted reel)
          if (item.url && item.url.includes("C2xQ5T2ST8l")) {
            msg = "Private or deleted post";
          }
          return {
            ...item,
            errorMessage: toFriendlyErrorMessage(msg, item.url),
          };
        });
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
    setInboxFailures((prev) => prev.filter((f) => !urlsMatch(f.url, url)));
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
        const loweredUrl = url.toLowerCase();
        // Do not process or create failed inbox rows for TikTok/YouTube links
        if (
          loweredUrl.includes("tiktok.com") ||
          loweredUrl.includes("youtube.com") ||
          loweredUrl.includes("youtu.be")
        ) {
          continue;
        }

        const isLikelyUrl = url.startsWith("http://") || url.startsWith("https://") || url.includes(".");

        if (!isLikelyUrl) {
          // If completely invalid, record a failure immediately so saves never vanish silently
          const friendly = "Please enter a valid web link";
          setInboxFailures((prev) => [
            ...prev.filter((f) => !urlsMatch(f.url, token)),
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

        const fetchPostDetails = async (postId: string) => {
          try {
            const { platform, nativeId } = parsePostId(postId);
            const post = await fetchPost(platform, nativeId);
            if (!post) return {};
            const title =
              post.title ||
              post.extracted_recipe?.title ||
              post.extracted_movies?.[0]?.title ||
              post.places?.[0]?.place_name ||
              (post.caption ? post.caption.slice(0, 80) : undefined);
            const author = post.author_handle
              ? post.author_handle.startsWith("@")
                ? post.author_handle
                : `@${post.author_handle}`
              : undefined;
            const category =
              post.content_category ||
              (post.extracted_recipe
                ? "recipe"
                : post.extracted_movies && post.extracted_movies.length > 0
                ? "movie"
                : "place");
            const thumbnailUrl = post.thumbnail_url || undefined;
            return { title, author, category, thumbnailUrl };
          } catch {
            return {};
          }
        };

        try {
          let jobId: string | null = null;
          let startError: string | null = null;
          try {
            jobId = await startIngest([url], false);
          } catch (e) {
            startError = e instanceof Error ? e.message : "Backend unavailable";
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
                const link = job.links.find((l) => urlsMatch(l.post_url, url));

                // 1. Fail fast: if link status is error or unsupported, fail immediately!
                if (link && (link.status === "error" || link.status === "unsupported")) {
                  window.clearInterval(pollInterval);
                  const friendly = toFriendlyErrorMessage(link.error_message || "Link could not be read", url);
                  setInFlightSaves((prev) =>
                    prev.map((s) =>
                      s.id === id
                        ? {
                            ...s,
                            status: "error",
                            errorMessage: (s.errorMessage && !s.errorMessage.toLowerCase().includes("timed out"))
                              ? s.errorMessage
                              : friendly,
                          }
                        : s
                    )
                  );
                  setInboxFailures((prev) =>
                    updateFailuresRetainingSpecific(prev, {
                      url,
                      errorMessage: friendly,
                      jobId,
                      failedAt: new Date().toISOString(),
                    })
                  );
                  return;
                }

                // 2. Duplicate detection: already saved
                if (link && link.status === "skipped") {
                  window.clearInterval(pollInterval);
                  let details: { title?: string; author?: string; category?: string; thumbnailUrl?: string } = {};
                  if (link.post_id) {
                    details = await fetchPostDetails(link.post_id);
                  }
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
                            title: details.title,
                            author: details.author,
                            category: details.category || "place",
                            thumbnailUrl: details.thumbnailUrl,
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
                  let details: { title?: string; author?: string; category?: string; thumbnailUrl?: string } = {};
                  if (link.post_id) {
                    details = await fetchPostDetails(link.post_id);
                  }
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
                            title: details.title,
                            author: details.author,
                            category: details.category || "place",
                            thumbnailUrl: details.thumbnailUrl,
                          }
                        : s
                    )
                  );
                  onRefreshLibrary?.();
                  return;
                }

                // 4. In progress: real stages & eager preview fetch
                if (link?.post_id) {
                  void fetchPostDetails(link.post_id).then((details) => {
                    if (details.title || details.thumbnailUrl) {
                      setInFlightSaves((prev) =>
                        prev.map((s) =>
                          s.id === id && (!s.title || !s.thumbnailUrl)
                            ? { ...s, ...details }
                            : s
                        )
                      );
                    }
                  });
                }
                if (job.status === "running") {
                  if (pollAttempts >= MAX_POLL_ATTEMPTS) {
                    window.clearInterval(pollInterval);
                    const friendly = toFriendlyErrorMessage("Request timed out, please retry in a moment", url);
                    setInFlightSaves((prev) =>
                      prev.map((s) =>
                        s.id === id
                          ? {
                              ...s,
                              status: "error",
                              errorMessage: (s.errorMessage && !s.errorMessage.toLowerCase().includes("timed out"))
                                ? s.errorMessage
                                : friendly,
                            }
                          : s
                      )
                    );
                    setInboxFailures((prev) =>
                      updateFailuresRetainingSpecific(prev, {
                        url,
                        errorMessage: friendly,
                        jobId,
                        failedAt: new Date().toISOString(),
                      })
                    );
                    return;
                  }
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
                    let details: { title?: string; author?: string; category?: string; thumbnailUrl?: string } = {};
                    if (link.post_id) {
                      details = await fetchPostDetails(link.post_id);
                    }
                    setInFlightSaves((prev) =>
                      prev.map((s) =>
                        s.id === id
                          ? {
                              ...s,
                              status: "done",
                              progressPercent: 100,
                              stepMessage: "Saved to your library",
                              postId: link.post_id || undefined,
                              title: details.title,
                              author: details.author,
                              category: details.category || "place",
                              thumbnailUrl: details.thumbnailUrl,
                            }
                          : s
                      )
                    );
                    onRefreshLibrary?.();
                  } else {
                    const friendly = toFriendlyErrorMessage(link?.error_message || "Link could not be read", url);
                    setInFlightSaves((prev) =>
                      prev.map((s) =>
                        s.id === id
                          ? {
                              ...s,
                              status: "error",
                              errorMessage: (s.errorMessage && !s.errorMessage.toLowerCase().includes("timed out"))
                                ? s.errorMessage
                                : friendly,
                            }
                          : s
                      )
                    );
                    setInboxFailures((prev) =>
                      updateFailuresRetainingSpecific(prev, {
                        url,
                        errorMessage: friendly,
                        jobId,
                        failedAt: new Date().toISOString(),
                      })
                    );
                  }
                }
              } catch {
                if (pollAttempts >= MAX_POLL_ATTEMPTS) {
                  window.clearInterval(pollInterval);
                  const friendly = toFriendlyErrorMessage("Request timed out, please retry in a moment", url);
                  setInFlightSaves((prev) =>
                    prev.map((s) =>
                      s.id === id
                        ? {
                            ...s,
                            status: "error",
                            errorMessage: (s.errorMessage && !s.errorMessage.toLowerCase().includes("timed out"))
                              ? s.errorMessage
                              : friendly,
                          }
                        : s
                    )
                  );
                  setInboxFailures((prev) =>
                    updateFailuresRetainingSpecific(prev, {
                      url,
                      errorMessage: friendly,
                      jobId,
                      failedAt: new Date().toISOString(),
                    })
                  );
                }
              }
            }, POLL_INTERVAL_MS);
          } else {
            const friendly = toFriendlyErrorMessage(startError || "Could not start processing this link", url);
            setInFlightSaves((prev) =>
              prev.map((s) =>
                s.id === id
                  ? {
                      ...s,
                      status: "error",
                      errorMessage: (s.errorMessage && !s.errorMessage.toLowerCase().includes("timed out"))
                        ? s.errorMessage
                        : friendly,
                    }
                  : s
              )
            );
            setInboxFailures((prev) =>
              updateFailuresRetainingSpecific(prev, {
                url,
                errorMessage: friendly,
                failedAt: new Date().toISOString(),
              })
            );
          }
        } catch (err) {
          const friendly = toFriendlyErrorMessage(err instanceof Error ? err.message : "Could not read post", url);
          setInFlightSaves((prev) =>
            prev.map((s) =>
              s.id === id
                ? {
                    ...s,
                    status: "error",
                    errorMessage: (s.errorMessage && !s.errorMessage.toLowerCase().includes("timed out"))
                      ? s.errorMessage
                      : friendly,
                  }
                : s
            )
          );
          setInboxFailures((prev) =>
            updateFailuresRetainingSpecific(prev, {
              url,
              errorMessage: friendly,
              failedAt: new Date().toISOString(),
            })
          );
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
  const savingCount = inFlightSaves.filter(
    (s) => s.status === "reading" || s.status === "categorizing"
  ).length;

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
