import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { fetchActiveJob, fetchJobs, postRouteParts, removePendingJobLink, startIngest, type Job } from "@/src/api";
import { IngestProgress, LinkSubmitForm } from "@/src/components/IngestForm";
import { ErrorBanner } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { usePendingShare } from "@/src/context/PendingShareContext";
import { useJob } from "@/src/hooks/useJob";
import { appHref } from "@/src/nav";
import { colors, radius, spacing } from "@/src/theme";

export default function IngestScreen() {
  const router = useRouter();
  const { shared, jobId: routeJobId } = useLocalSearchParams<{ shared?: string; jobId?: string }>();
  const { bumpRefresh } = useLibrary();
  const { pendingUrls, autoSubmit, hydrated, clearPendingUrls } = usePendingShare();
  const [jobId, setJobId] = useState<string | null>(() => typeof routeJobId === "string" ? routeJobId : null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { job, error: jobError } = useJob(jobId);
  const [jobs, setJobs] = useState<Job[]>([]);
  const autoStarted = useRef(false);
  const failedAutoUrls = useRef(new Set<string>());
  const lastAppState = useRef(AppState.currentState);
  const [autoAttempt, setAutoAttempt] = useState(0);
  const shouldAutoStart = autoSubmit || shared === "1";
  const sharedEntry = shared === "1";

  useEffect(() => {
    if (typeof routeJobId === "string" && routeJobId) setJobId(routeJobId);
  }, [routeJobId]);

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(appHref("/(app)/(tabs)/posts"));
    }
  }, [router]);

  useEffect(() => {
    const onBackPress = () => {
      handleClose();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleClose]);

  const handleSubmit = useCallback(
    async (links: string[], refresh: boolean, fromShare = false): Promise<boolean> => {
      setSubmitError(null);
      setSubmitting(true);
      try {
        const nextJobId = await startIngest(links, refresh);
        setJobId(nextJobId);
        if (fromShare) clearPendingUrls(links);
        return true;
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : "Failed to start ingest");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [clearPendingUrls],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const history = await fetchJobs();
        if (!cancelled) setJobs(history);
      } catch {
        // ignore
      }
      if (jobId || routeJobId || shouldAutoStart || pendingUrls.length > 0) return;
      try {
        const active = await fetchActiveJob("link_ingest");
        if (!cancelled && active?.status === "running") {
          setJobId(active.job_id);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, routeJobId, shouldAutoStart, pendingUrls.length]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const wasAway = lastAppState.current === "background" || lastAppState.current === "inactive";
      lastAppState.current = nextState;
      if (wasAway && nextState === "active" && failedAutoUrls.current.size > 0) {
        failedAutoUrls.current.clear();
        setAutoAttempt((attempt) => attempt + 1);
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const urlsToSubmit = pendingUrls.filter((url) => !failedAutoUrls.current.has(url));
    if (!hydrated || autoStarted.current || urlsToSubmit.length === 0 || !shouldAutoStart || submitting) {
      return;
    }
    autoStarted.current = true;
    void handleSubmit(urlsToSubmit, false, true).then((ok) => {
      if (!ok) {
        urlsToSubmit.forEach((url) => failedAutoUrls.current.add(url));
      }
      autoStarted.current = false;
      setAutoAttempt((attempt) => attempt + 1);
    });
  }, [pendingUrls, shouldAutoStart, handleSubmit, submitting, autoAttempt, hydrated]);

  useEffect(() => {
    if (job?.status === "done" && job.job_id === jobId) bumpRefresh();
  }, [job, jobId, bumpRefresh]);

  const openPost = (platform: string, postId: string) => {
    const parts = postRouteParts(platform, postId);
    router.push(`/posts/${parts.platform}/${parts.nativeId}`);
  };

  const progressTitle =
    job?.kind === "instagram_profile_import"
      ? "Importing Instagram visits"
      : job?.kind === "timeline_import"
        ? "Importing Google Maps Timeline"
        : "Progress";
  const progressSubtitle =
    job?.kind === "instagram_profile_import" && job.username
      ? `@${job.username} · places marked visited automatically`
      : job?.kind === "timeline_import"
        ? "Resolving places via OpenStreetMap · progress survives refresh"
        : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          title: sharedEntry ? "Save to Wanderfile" : "Save links",
          headerLeft: () => (
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.headerBtn}
            >
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.kicker}>{sharedEntry ? "Shared link" : "Add to Wanderfile"}</Text>
            <Text style={styles.title}>{sharedEntry ? "Save to Wanderfile" : "Save links"}</Text>
          </View>
        </View>

        {!sharedEntry ? (
          <Text style={styles.lede}>
            Add links anytime. Wanderfile reads and organizes them, and your queue stays available on every signed-in device.
          </Text>
        ) : null}

        {sharedEntry ? (
          <View accessibilityLiveRegion="polite" style={styles.receipt}>
            <Text style={styles.receiptTitle}>
              {submitError
                ? "This link is still on your device"
                : !jobId
                  ? !hydrated ? "Checking your shared link…" : pendingUrls.length > 0 ? "Share received on this device" : "Sending link to Wanderfile…"
                  : job?.status === "running"
                    ? "Accepted · processing"
                    : job?.status === "done"
                      ? job.counts.error > 0 || job.counts.unsupported > 0
                        ? "Processing finished with an issue"
                        : job.counts.saved + job.counts.linked === 0 && job.counts.skipped > 0
                          ? "Already in your library"
                          : job.counts.saved > 0
                            ? "Saved to your library"
                            : job.counts.linked > 0
                              ? "Added to your library"
                              : "Processing finished"
                      : "Accepted by Wanderfile"}
            </Text>
            <Text style={styles.receiptSubtitle}>
              {submitError
                ? "The request was not accepted. Retry when you’re ready."
                : !jobId
                  ? !hydrated
                    ? "Checking the saved share on this device."
                    : pendingUrls.length > 0
                      ? "Saved on this device. Wanderfile will submit it automatically; you can close this screen."
                      : "No local share is waiting here. Share the link again to retry."
                  : job?.status === "running"
                    ? "You can leave this screen; progress will remain in your library."
                    : job?.status === "done"
                      ? `${job.counts.saved} saved · ${job.counts.linked} added · ${job.counts.skipped} already in your library · ${job.counts.error + job.counts.unsupported} with issues`
                      : "The job was accepted. Waiting for its status."}
            </Text>
          </View>
        ) : null}

        {submitError ? <ErrorBanner message={submitError} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {jobError ? <ErrorBanner message={jobError} /> : null}
        {sharedEntry ? (
          submitError ? (
            <Pressable
              accessibilityRole="button"
              disabled={submitting || pendingUrls.length === 0}
              onPress={() => void handleSubmit(pendingUrls, false, true)}
              style={styles.retryButton}
            ><Text style={styles.retryText}>{submitting ? "Retrying…" : "Retry save"}</Text></Pressable>
          ) : null
        ) : (
          <LinkSubmitForm
            disabled={submitting}
            onSubmit={(links, refresh) => handleSubmit(links, refresh)}
          />
        )}
        {sharedEntry ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(appHref("/(app)/(tabs)/posts"))}
            style={({ pressed }) => [styles.viewLibrary, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.viewLibraryText}>View library</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.onFill} />
          </Pressable>
        ) : null}
        <IngestProgress
          links={job?.links ?? []}
          running={job?.status === "running"}
          title={progressTitle}
          subtitle={progressSubtitle}
          onOpenPost={openPost}
          onRetry={(postUrl) => void handleSubmit([postUrl], false)}
          onRemovePending={
            job && job.status === "running"
              ? async (postUrl) => {
                  try {
                    await removePendingJobLink(job.job_id, postUrl);
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : "Failed to remove link");
                  }
                }
              : undefined
          }
        />
        {jobs.filter((item) => item.job_id !== job?.job_id).length > 0 ? (
          <View>
            <Text style={styles.historyTitle}>Recent jobs</Text>
            {jobs
              .filter((item) => item.job_id !== job?.job_id)
              .slice(0, 8)
              .map((item) => (
              <Pressable key={item.job_id} onPress={() => setJobId(item.job_id)} accessibilityRole="button" accessibilityLabel={`Review job with ${item.counts.error} errors`} style={styles.jobRow}>
                  <Text style={styles.jobStatus}>{item.status === "running" ? "Processing" : item.counts.error + item.counts.unsupported > 0 ? "Finished with issues" : "Finished"}</Text>
                  <Text style={styles.jobMeta}>
                    {item.counts.saved} saved · {item.counts.linked} linked · {item.counts.error} errors
                  </Text>
                  <Text style={styles.jobMeta}>
                    {item.links.filter((link) => link.status !== "pending" && link.status !== "fetching").length} of {item.links.length} processed
                  </Text>
              </Pressable>
              ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  titleBlock: {
    flex: 1,
  },
  receipt: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brandSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  receiptTitle: { color: colors.ink, fontWeight: "800", fontSize: 15 },
  receiptSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  viewLibrary: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.brand, marginBottom: spacing.md, paddingHorizontal: spacing.md, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  viewLibraryText: { color: colors.onFill, fontWeight: "800", fontSize: 15 },
  retryButton: { minHeight: 46, alignItems: "center", justifyContent: "center", backgroundColor: colors.brand, borderRadius: radius.md, marginBottom: spacing.md },
  retryText: { color: colors.onFill, fontWeight: "800" },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 4,
  },
  kicker: {
    color: colors.faint,
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 12,
    marginBottom: 4,
  },
  title: { fontSize: 28, fontWeight: "800", color: colors.ink },
  lede: { marginTop: 6, marginBottom: spacing.md, color: colors.muted, fontSize: 15, lineHeight: 22 },
  historyTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: colors.faint,
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 12,
  },
  jobRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  jobStatus: { color: colors.ink, fontWeight: "700" },
  jobMeta: { color: colors.muted, marginTop: 4, fontSize: 13 },
});
