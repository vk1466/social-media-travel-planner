import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, BackHandler, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { fetchActiveJob, fetchJobs, postRouteParts, removePendingJobLink, startIngest, type Job } from "@/src/api";
import { LinkSubmitForm } from "@/src/components/IngestForm";
import { ErrorBanner } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { usePendingShare } from "@/src/context/PendingShareContext";
import { useJob } from "@/src/hooks/useJob";
import { appHref } from "@/src/nav";
import { colors, radius, spacing } from "@/src/theme";

export default function IngestScreen() {
  const router = useRouter();
  const { shared, jobId: routeJobId } = useLocalSearchParams<{ shared?: string; jobId?: string }>();
  const { bumpRefresh, posts } = useLibrary();
  const { pendingUrls, autoSubmit, hydrated, clearPendingUrls } = usePendingShare();
  const [jobId, setJobId] = useState<string | null>(() => (typeof routeJobId === "string" ? routeJobId : null));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { job, error: jobError } = useJob(jobId);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

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
        setPasteOpen(false);
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

  const processedLinks = job?.links.filter((link) => link.status !== "pending" && link.status !== "fetching").length ?? 0;
  const failedLinks = job?.links.filter((link) => link.status === "error" || link.status === "unsupported").length ?? 0;
  const savedOrLinked = (job?.counts.saved ?? 0) + (job?.counts.linked ?? 0);
  const historicJobs = jobs.filter((item) => item.job_id !== job?.job_id && item.status === "done");

  const currentUrl = pendingUrls[0] ?? job?.links[0]?.post_url ?? "";
  const finishedPostId = job?.links.find((l) => l.post_id && (l.status === "saved" || l.status === "linked"))?.post_id;
  const finishedPost = finishedPostId ? posts.find((p) => p.post_id === finishedPostId) : null;
  const matchedPost = currentUrl ? posts.find((p) => p.post_url === currentUrl) : null;
  const previewPost = finishedPost ?? matchedPost;

  const hasActiveSave = Boolean(job || submitError || pendingUrls.length > 0 || sharedEntry);
  const isFailed = Boolean(submitError || failedLinks > 0);
  const isRunning = Boolean(job?.status === "running" || (!job && (pendingUrls.length > 0 || submitting)));
  const isDone = Boolean(job?.status === "done" && !isFailed);
  const isDuplicate = isDone && savedOrLinked === 0 && (job?.counts.skipped ?? 0) > 0;

  const receiptEyebrow = isFailed
    ? "NEEDS ATTENTION"
    : isDuplicate
      ? "ALREADY IN YOUR LIBRARY"
      : isDone
        ? "READY TO OPEN"
        : isRunning
          ? "ORGANIZING YOUR SAVE"
          : "LINK RECEIVED";

  const receiptTitle = isFailed
    ? submitError ? "This link is still on your device" : "Save needs attention"
    : isDuplicate
      ? "Already in your library"
      : isDone
        ? "Your save is ready"
        : isRunning
          ? job && job.links.length > 1 ? `${processedLinks} of ${job.links.length} processed` : "Organizing your save"
          : "Link received";

  const hasExtractedPlaces = Boolean(previewPost && previewPost.extracted_places && previewPost.extracted_places.length > 0);
  const hasExtractedRecipe = Boolean(previewPost && previewPost.extracted_recipe && (previewPost.extracted_recipe.title || (previewPost.extracted_recipe.ingredients && previewPost.extracted_recipe.ingredients.length > 0)));
  const hasExtractedMovies = Boolean(previewPost && previewPost.extracted_movies && previewPost.extracted_movies.length > 0);

  const receiptMessage = isFailed
    ? submitError ?? "The request was not accepted. Your link is safely stored on this device."
    : isDuplicate
      ? "This post was already in your library. Open to view your notes and places."
      : isDone
        ? hasExtractedPlaces
          ? `✓ ${previewPost!.extracted_places.length} ${previewPost!.extracted_places.length === 1 ? "place" : "places"} found · ${previewPost!.extracted_places.slice(0, 3).map((p) => p.place_name).join(", ")}`
          : hasExtractedRecipe
            ? `✓ Recipe saved · ${previewPost!.extracted_recipe?.title || "Ingredients and steps organized."}`
            : hasExtractedMovies
              ? `✓ ${previewPost!.extracted_movies!.length === 1 ? "Film" : "Films"} found · ${previewPost!.extracted_movies!.map((m) => m.title).join(", ")}`
              : savedOrLinked > 0
                ? `✓ ${savedOrLinked} ${savedOrLinked === 1 ? "item" : "items"} added to your library.`
                : "✓ Organized and ready to explore."
        : "Wanderfile is organizing places and details in the background. You can browse while we finish.";

  const cleanDisplayUrl = currentUrl.replace(/^https?:\/\/(www\.)?/, "");
  const platformName = currentUrl.includes("instagram.com")
    ? "Instagram"
    : currentUrl.includes("tiktok.com")
      ? "TikTok"
      : currentUrl.includes("youtube.com")
        ? "YouTube"
        : "Web";

  const previewTitle = previewPost?.caption || previewPost?.reel_summary || cleanDisplayUrl || "Saved discovery";
  const previewSubtitle = previewPost?.author_handle
    ? `${previewPost.author_handle} · ${platformName}`
    : `${platformName} ${platformName === "Web" ? "Article" : "Video"}`;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Save to Wanderfile",
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
        {actionError ? <ErrorBanner message={actionError} /> : null}
        {jobError ? <ErrorBanner message={jobError} /> : null}

        {hasActiveSave ? (
          <View accessibilityLiveRegion="polite" style={styles.sheetCard}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeadingRow}>
              <View style={styles.sheetTitleWrap}>
                <Text style={styles.sheetKicker}>WANDERFILE</Text>
                <Text style={styles.sheetTitle}>{receiptTitle}</Text>
              </View>
              <View style={[styles.statusBadge, isFailed && styles.statusBadgeError, isDone && styles.statusBadgeDone]}>
                {isFailed ? (
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                ) : isDone ? (
                  <Ionicons name="checkmark-circle" size={14} color={colors.brand} />
                ) : (
                  <ActivityIndicator size="small" color={colors.brand} />
                )}
                <Text style={[styles.statusBadgeText, isFailed && styles.statusBadgeTextError]}>
                  {receiptEyebrow}
                </Text>
              </View>
            </View>

            <View style={styles.previewBox}>
              {previewPost?.thumbnail_url ? (
                <Image source={{ uri: previewPost.thumbnail_url }} style={styles.previewThumb} />
              ) : (
                <View style={styles.previewArt}>
                  <Ionicons
                    name={platformName === "Instagram" ? "logo-instagram" : platformName === "TikTok" ? "videocam" : "play"}
                    size={22}
                    color="#fff"
                  />
                </View>
              )}
              <View style={styles.previewCopy}>
                <Text style={styles.previewHeading} numberOfLines={2}>{previewTitle}</Text>
                <Text style={styles.previewSub} numberOfLines={1}>{previewSubtitle}</Text>
              </View>
            </View>

            <Text style={[styles.sheetMessage, isDone && styles.sheetMessageDone]}>
              {receiptMessage}
            </Text>

            {isDone && previewPost && (hasExtractedPlaces || hasExtractedRecipe || hasExtractedMovies) ? (
              <View style={styles.chipRow}>
                {hasExtractedPlaces
                  ? previewPost.extracted_places.slice(0, 3).map((p) => (
                      <View key={p.place_name} style={styles.chip}>
                        <Ionicons name="location-sharp" size={11} color={colors.brand} />
                        <Text style={styles.chipText} numberOfLines={1}>
                          {p.place_name}
                        </Text>
                      </View>
                    ))
                  : null}
                {hasExtractedRecipe && previewPost.extracted_recipe?.title ? (
                  <View style={styles.chip}>
                    <Ionicons name="restaurant" size={11} color={colors.brand} />
                    <Text style={styles.chipText} numberOfLines={1}>
                      {previewPost.extracted_recipe.title}
                    </Text>
                  </View>
                ) : null}
                {hasExtractedMovies
                  ? previewPost.extracted_movies!.slice(0, 2).map((m) => (
                      <View key={m.title} style={styles.chip}>
                        <Ionicons name="film" size={11} color={colors.brand} />
                        <Text style={styles.chipText} numberOfLines={1}>
                          {m.title}
                        </Text>
                      </View>
                    ))
                  : null}
              </View>
            ) : null}

            {isRunning && job && job.links.length > 1 ? (
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.max(8, Math.round((processedLinks / job.links.length) * 100))}%` },
                  ]}
                />
              </View>
            ) : null}

            {job && job.links.length > 1 ? (
              <View style={styles.queueBox}>
                <Text style={styles.queueBoxTitle}>This save ({job.links.length} links)</Text>
                {job.links.map((link) => (
                  <View key={link.post_url} style={styles.queueRow}>
                    <Text style={[styles.queueDot, (link.status === "error" || link.status === "unsupported") && styles.queueDotError, (link.status === "saved" || link.status === "linked") && styles.queueDotDone]}>
                      {link.status === "error" || link.status === "unsupported" ? "!" : link.status === "saved" || link.status === "linked" ? "✓" : "↻"}
                    </Text>
                    <Text style={styles.queueUrl} numberOfLines={1}>
                      {link.post_url.replace(/^https?:\/\/(www\.)?/, "")}
                    </Text>
                    <Text style={styles.queueStatus}>
                      {link.status === "linked" ? "Already saved" : link.status === "saved" ? "Saved" : link.status === "fetching" ? "Saving" : link.status === "pending" ? "Waiting" : "Couldn’t save"}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.actionGroup}>
              {isFailed ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    disabled={submitting || (pendingUrls.length === 0 && failedLinks === 0)}
                    onPress={() => {
                      const retryUrls = pendingUrls.length > 0 ? pendingUrls : job?.links.filter((l) => l.status === "error").map((l) => l.post_url) ?? [];
                      void handleSubmit(retryUrls, false, true);
                    }}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>{submitting ? "Retrying…" : "Try again"}</Text>
                  </Pressable>
                </>
              ) : isDone && finishedPostId ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openPost(previewPost?.platform ?? "instagram", finishedPostId)}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Open save →</Text>
                  </Pressable>
                </>
              ) : isDuplicate && finishedPostId ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openPost(previewPost?.platform ?? "instagram", finishedPostId)}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryBtnText}>Open existing save →</Text>
                  </Pressable>
                </>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setPasteOpen((open) => !open)}
              style={styles.pasteToggle}
            >
              <Ionicons name={pasteOpen ? "chevron-up" : "add"} size={16} color={colors.brand} />
              <Text style={styles.pasteToggleText}>{pasteOpen ? "Hide link input" : "Paste another link"}</Text>
            </Pressable>

            {pasteOpen ? (
              <View style={styles.pasteSection}>
                <LinkSubmitForm
                  disabled={submitting}
                  onSubmit={(links, refresh) => handleSubmit(links, refresh)}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.manualEntryCard}>
            <Text style={styles.kicker}>Save something new</Text>
            <Text style={styles.title}>Keep the link.{"\n"}Find it later.</Text>
            <Text style={styles.lede}>
              Paste one or more links. Wanderfile accepts them first, then organizes them while you browse.
            </Text>
            <LinkSubmitForm
              disabled={submitting}
              onSubmit={(links, refresh) => handleSubmit(links, refresh)}
            />
          </View>
        )}

        <View style={styles.recentSection}>
          <View style={styles.recentHeading}>
            <Text style={styles.sectionTitle}>Recently saved</Text>
            <Pressable accessibilityRole="button" onPress={() => router.replace(appHref("/(app)/(tabs)/posts"))}>
              <Text style={styles.seeAll}>See all →</Text>
            </Pressable>
          </View>
          {posts.slice(0, 3).map((post) => (
            <Pressable
              key={post.post_id}
              accessibilityRole="button"
              onPress={() => openPost(post.platform, post.post_id)}
              style={styles.recentPost}
            >
              {post.thumbnail_url ? (
                <Image source={{ uri: post.thumbnail_url }} style={styles.recentThumb} />
              ) : (
                <View style={[styles.recentThumb, styles.recentThumbFallback]}>
                  <Ionicons name="bookmark" size={18} color={colors.brand} />
                </View>
              )}
              <View style={styles.recentCopy}>
                <Text style={styles.recentTitle} numberOfLines={2}>
                  {post.caption || post.reel_summary || post.author_handle || "Saved idea"}
                </Text>
                <Text style={styles.recentMeta} numberOfLines={1}>
                  {post.content_category || post.platform} · {post.extracted_places.length} {post.extracted_places.length === 1 ? "place" : "places"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={17} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {historicJobs.length > 0 ? (
          <View style={styles.historySection}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setHistoryOpen((open) => !open)}
              style={styles.historyToggle}
            >
              <Text style={styles.historyToggleText}>
                Processing history ({historicJobs.length} past {historicJobs.length === 1 ? "job" : "jobs"})
              </Text>
              <Ionicons name={historyOpen ? "chevron-up" : "chevron-forward"} size={16} color={colors.muted} />
            </Pressable>
            {historyOpen ? (
              <View style={styles.historyList}>
                {historicJobs.slice(0, 5).map((item) => (
                  <Pressable
                    key={item.job_id}
                    onPress={() => setJobId(item.job_id)}
                    accessibilityRole="button"
                    style={styles.jobRow}
                  >
                    <View style={styles.jobRowTop}>
                      <Text style={styles.jobStatus}>
                        {item.counts.error + item.counts.unsupported > 0 ? "Finished with issues" : "Finished"}
                      </Text>
                      <Text style={styles.jobDate}>{formatJobTime(item.created_at)}</Text>
                    </View>
                    <Text style={styles.jobMeta}>
                      {item.counts.saved} saved · {item.counts.linked} added · {item.counts.error} errors
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

function formatJobTime(createdAt?: string | null): string {
  if (!createdAt) return "";
  try {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: 4,
  },
  sheetCard: {
    backgroundColor: "#183b48",
    borderWidth: 1,
    borderColor: "#397284",
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#397284",
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  sheetHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sheetTitleWrap: {
    flex: 1,
    paddingRight: 6,
  },
  sheetKicker: {
    color: "#8edce5",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  sheetTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  statusBadgeDone: {
    backgroundColor: colors.brandSoft,
  },
  statusBadgeError: {
    backgroundColor: colors.dangerSoft,
  },
  statusBadgeText: {
    color: colors.brand,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  statusBadgeTextError: {
    color: colors.danger,
  },
  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: "#102d38",
    marginVertical: spacing.xs,
  },
  previewThumb: {
    width: 48,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: "#0d232c",
  },
  previewArt: {
    width: 48,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: "#225263",
    alignItems: "center",
    justifyContent: "center",
  },
  previewCopy: {
    flex: 1,
  },
  previewHeading: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  previewSub: {
    color: "#a9c5cf",
    fontSize: 11,
    marginTop: 3,
  },
  sheetMessage: {
    color: "#c5dce2",
    fontSize: 13,
    lineHeight: 18,
    marginVertical: spacing.xs,
  },
  sheetMessageDone: {
    color: "#86e7dc",
    fontWeight: "700",
  },
  queueBox: {
    backgroundColor: "#102d38",
    borderRadius: radius.sm,
    padding: 10,
    marginVertical: spacing.xs,
    gap: 6,
  },
  queueBoxTitle: {
    color: "#8edce5",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 2,
  },
  queueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  queueDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    textAlign: "center",
    lineHeight: 18,
    fontSize: 11,
    fontWeight: "800",
    color: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  queueDotDone: {
    color: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  queueDotError: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  queueUrl: {
    flex: 1,
    color: "#c5dce2",
    fontSize: 12,
  },
  queueStatus: {
    color: "#8edce5",
    fontSize: 11,
    fontWeight: "700",
  },
  actionGroup: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  primaryBtn: {
    minHeight: 46,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  primaryBtnText: {
    color: colors.onFill,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryBtn: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#397284",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "#c5dce2",
    fontSize: 13,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#102d38",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#225263",
    maxWidth: "100%",
  },
  chipText: {
    color: "#c5dce2",
    fontSize: 11,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#102d38",
    overflow: "hidden",
    marginTop: spacing.xs,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: colors.brand,
    borderRadius: 2,
  },
  pasteToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#255163",
  },
  pasteToggleText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
  pasteSection: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
  },
  manualEntryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  kicker: {
    color: colors.brand,
    fontWeight: "800",
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    lineHeight: 28,
  },
  lede: {
    marginTop: 6,
    marginBottom: spacing.md,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  recentSection: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  recentHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  seeAll: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 12,
  },
  recentPost: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  recentThumb: {
    width: 44,
    height: 52,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  recentThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  recentCopy: {
    flex: 1,
  },
  recentTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  recentMeta: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 3,
    textTransform: "capitalize",
  },
  historySection: {
    marginTop: spacing.xs,
  },
  historyToggle: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  historyToggleText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  historyList: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  jobRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  jobRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  jobStatus: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  jobDate: {
    color: colors.muted,
    fontSize: 11,
  },
  jobMeta: {
    color: colors.muted,
    marginTop: 3,
    fontSize: 11,
  },
});
