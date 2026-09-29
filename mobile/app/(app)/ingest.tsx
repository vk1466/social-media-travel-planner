import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  const [progressOpen, setProgressOpen] = useState(false);
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
  const processedLinks = job?.links.filter((link) => link.status !== "pending" && link.status !== "fetching").length ?? 0;
  const failedLinks = job?.links.filter((link) => link.status === "error" || link.status === "unsupported").length ?? 0;
  const savedOrLinked = (job?.counts.saved ?? 0) + (job?.counts.linked ?? 0);
  const statusTitle = submitError
    ? "Save needs attention"
    : job?.status === "running"
      ? "Organizing your saves"
      : job?.status === "done"
        ? failedLinks > 0
          ? `${failedLinks} ${failedLinks === 1 ? "link needs" : "links need"} attention`
          : savedOrLinked === 0 && job.counts.skipped > 0
            ? "Already in your library"
            : "Your saves are ready"
        : pendingUrls.length > 0
          ? "Waiting to send"
          : "Your library is ready";
  const statusDetail = submitError
    ? "The link stays on this device. Retry when you’re ready."
    : job?.status === "running"
      ? `${processedLinks} of ${job.links.length} processed · you can browse while we finish`
      : job?.status === "done"
        ? failedLinks > 0
          ? `${job.counts.saved} saved · ${job.counts.linked} added · ${failedLinks} with issues`
          : `${job.counts.saved} saved · ${job.counts.linked} added · ${job.counts.skipped} already saved`
        : pendingUrls.length > 0
          ? `${pendingUrls.length} shared link${pendingUrls.length === 1 ? "" : "s"} will submit automatically`
          : "Save a link or browse your saved items.";
  const hasStatus = Boolean(job || submitError || pendingUrls.length > 0);

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
          <Text style={styles.lede}>Paste a link to save it. You can keep browsing while Wanderfile organizes it.</Text>
        ) : null}

        {sharedEntry ? (
          <View accessibilityLiveRegion="polite" style={styles.receipt}>
            <View style={styles.receiptHeader}>
              <View style={[styles.receiptBadge, (submitError || failedLinks > 0) ? styles.receiptBadgeError : job?.status === "done" ? styles.receiptBadgeDone : styles.receiptBadgeRunning]}>
                {submitError || failedLinks > 0 ? (
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                ) : job?.status === "done" ? (
                  <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
                ) : (
                  <ActivityIndicator size="small" color={colors.brand} />
                )}
                <Text style={[styles.receiptEyebrow, (submitError || failedLinks > 0) && styles.receiptEyebrowError]}>
                  {submitError || failedLinks > 0
                    ? "NEEDS ATTENTION"
                    : job?.status === "done"
                      ? savedOrLinked > 0 ? "READY TO OPEN" : "ALREADY SAVED"
                      : "LINK RECEIVED"}
                </Text>
              </View>
            </View>

            <Text style={styles.receiptTitle}>
              {submitError
                ? "This link is still on your device"
                : job?.status === "running" || !job
                  ? "Organizing your save"
                  : job.status === "done"
                    ? failedLinks > 0
                      ? "Finished with an issue"
                      : savedOrLinked > 0
                        ? "Your save is ready"
                        : "Already in your library"
                    : "Link received"}
            </Text>

            <View style={styles.receiptPreview}>
              <View style={styles.receiptPreviewIcon}>
                <Ionicons
                  name={
                    (pendingUrls[0] ?? job?.links[0]?.post_url ?? "").includes("instagram.com")
                      ? "logo-instagram"
                      : (pendingUrls[0] ?? job?.links[0]?.post_url ?? "").includes("tiktok.com")
                        ? "videocam"
                        : "link"
                  }
                  size={20}
                  color={colors.brand}
                />
              </View>
              <View style={styles.receiptPreviewCopy}>
                <Text style={styles.receiptPreviewUrl} numberOfLines={1}>
                  {pendingUrls[0] ?? job?.links[0]?.post_url ?? "Shared link"}
                </Text>
                <Text style={styles.receiptPreviewSub} numberOfLines={1}>
                  {job?.status === "running" || !job
                    ? "Wanderfile is organizing places and details in the background."
                    : job.status === "done" && savedOrLinked > 0
                      ? `${savedOrLinked} ${savedOrLinked === 1 ? "place/item added" : "places/items added"} to your atlas`
                      : "Saved on this device · Tap below to continue"}
                </Text>
              </View>
            </View>

            <Text style={styles.receiptSubtitle}>
              {submitError
                ? "The request was not accepted. Your link is safely stored on this device."
                : job?.status === "running" || !job
                  ? "You can leave this screen now. Wanderfile organizes in the background while you browse."
                  : job?.status === "done"
                    ? `${job.counts.saved} saved · ${job.counts.linked} added · ${job.counts.skipped} already saved`
                    : "The job was accepted by Wanderfile."}
            </Text>
          </View>
        ) : null}

        {submitError ? <ErrorBanner message={submitError} /> : null}
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {jobError ? <ErrorBanner message={jobError} /> : null}
        {!sharedEntry && hasStatus ? (
          <View style={[styles.statusCard, failedLinks > 0 && styles.statusFailed]} accessibilityLiveRegion="polite">
            <View style={[styles.statusIcon, failedLinks > 0 && styles.statusIconFailed]}>
              {submitError || failedLinks > 0
                ? <Ionicons name="alert-circle" size={19} color={colors.danger} />
                : job?.status === "running" || !job
                  ? <ActivityIndicator size="small" color={colors.brand} />
                  : <Ionicons name="checkmark" size={19} color={colors.brand} />}
            </View>
            <View style={styles.statusCopy}>
              <Text style={styles.statusEyebrow}>{failedLinks > 0 || submitError ? "NEEDS ATTENTION" : job?.status === "running" ? "IN PROGRESS" : job?.status === "done" ? "READY" : "ON THIS DEVICE"}</Text>
              <Text style={styles.statusTitle}>{statusTitle}</Text>
              <Text style={styles.statusDetail}>{statusDetail}</Text>
            </View>
            {job?.links.some((link) => link.status === "error") ? (
              <Pressable accessibilityRole="button" disabled={submitting} onPress={() => void handleSubmit(job.links.filter((link) => link.status === "error").map((link) => link.post_url), false)} style={styles.statusRetry}>
                <Text style={styles.statusRetryText}>{submitting ? "Retrying…" : "Retry"}</Text>
              </Pressable>
            ) : null}
            {job?.links.length ? (
              <Pressable accessibilityRole="button" accessibilityLabel={progressOpen ? "Hide save progress" : "View save progress"} onPress={() => setProgressOpen((open) => !open)} hitSlop={8} style={styles.statusToggle}>
                <Ionicons name={progressOpen ? "chevron-up" : "chevron-forward"} size={20} color={colors.brand} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
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
          (() => {
            const finishedPost = job?.links.find((l) => l.post_id && (l.status === "saved" || l.status === "linked"));
            if (job?.status === "done" && finishedPost?.post_id) {
              return (
                <View style={styles.sharedActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openPost("instagram", finishedPost.post_id!)}
                    style={({ pressed }) => [styles.viewLibrary, pressed && { opacity: 0.75 }]}
                  >
                    <Text style={styles.viewLibraryText}>Open save</Text>
                    <Ionicons name="arrow-forward" size={17} color={colors.onFill} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.replace(appHref("/(app)/(tabs)/posts"))}
                    style={({ pressed }) => [styles.browseButton, pressed && { opacity: 0.75 }]}
                  >
                    <Text style={styles.browseButtonText}>Browse library</Text>
                  </Pressable>
                </View>
              );
            }
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.replace(appHref("/(app)/(tabs)/posts"))}
                style={({ pressed }) => [styles.viewLibrary, pressed && { opacity: 0.75 }]}
              >
                <Text style={styles.viewLibraryText}>Keep browsing</Text>
                <Ionicons name="arrow-forward" size={17} color={colors.onFill} />
              </Pressable>
            );
          })()
        ) : null}
        {!sharedEntry ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace(appHref("/(app)/(tabs)/posts"))}
            style={({ pressed }) => [styles.browseButton, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.browseButtonText}>Browse your library</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.brand} />
          </Pressable>
        ) : null}
        {(sharedEntry || progressOpen) ? <IngestProgress
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
        /> : null}
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
  receiptHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
  receiptBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  receiptBadgeRunning: { backgroundColor: colors.brandSoft },
  receiptBadgeDone: { backgroundColor: colors.brandSoft },
  receiptBadgeError: { backgroundColor: colors.dangerSoft },
  receiptEyebrow: { color: colors.brand, fontWeight: "800", fontSize: 10, letterSpacing: 0.8 },
  receiptEyebrowError: { color: colors.danger },
  receiptTitle: { color: colors.ink, fontWeight: "800", fontSize: 18, marginTop: 4, marginBottom: 8 },
  receiptSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 8 },
  receiptPreview: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, marginVertical: 4 },
  receiptPreviewIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  receiptPreviewCopy: { flex: 1 },
  receiptPreviewUrl: { color: colors.ink, fontWeight: "700", fontSize: 13 },
  receiptPreviewSub: { color: colors.muted, fontSize: 11, marginTop: 1 },
  sharedActions: { gap: spacing.xs, marginBottom: spacing.md },
  statusCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brandSoft, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  statusFailed: { borderColor: colors.danger },
  statusIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: "center", justifyContent: "center" },
  statusIconFailed: { backgroundColor: colors.dangerSoft },
  statusCopy: { flex: 1 },
  statusEyebrow: { color: colors.brand, fontWeight: "800", fontSize: 10, letterSpacing: 0.7 },
  statusTitle: { color: colors.ink, fontWeight: "800", fontSize: 15, marginTop: 2 },
  statusDetail: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  statusToggle: { minWidth: 36, minHeight: 44, alignItems: "center", justifyContent: "center" },
  statusRetry: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, minHeight: 40, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  statusRetryText: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  browseButton: { minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md, paddingHorizontal: spacing.md, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  browseButtonText: { color: colors.brand, fontWeight: "800", fontSize: 14 },
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
