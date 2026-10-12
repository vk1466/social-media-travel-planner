import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fetchActiveJob, fetchJobs, postRouteParts, startIngest, type Job, type SavedPost } from "@/src/api";
import { LinkSubmitForm } from "@/src/components/IngestForm";
import { ErrorBanner } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { usePendingShare } from "@/src/context/PendingShareContext";
import { useJob } from "@/src/hooks/useJob";
import { appHref } from "@/src/nav";
import { proxiedMediaUrl } from "@/src/postDisplayUtils";
import { colors, radius, shadow } from "@/src/theme";

export default function IngestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { shared, jobId: routeJobId, link: paramLink } = useLocalSearchParams<{
    shared?: string;
    jobId?: string;
    link?: string;
  }>();
  const { bumpRefresh, posts } = useLibrary();
  const { pendingUrls, autoSubmit, hydrated, clearPendingUrls } = usePendingShare();
  const [jobId, setJobId] = useState<string | null>(() => (typeof routeJobId === "string" ? routeJobId : null));
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { job, error: jobError } = useJob(jobId);
  const [jobs, setJobs] = useState<Job[]>([]);

  const autoStarted = useRef(false);
  const failedAutoUrls = useRef(new Set<string>());
  const lastAppState = useRef(AppState.currentState);

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
    if (paramLink && !jobId) {
      void handleSubmit([paramLink], false);
    }
  }, [paramLink, jobId, handleSubmit]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const history = await fetchJobs();
        if (!cancelled) setJobs(history);
      } catch {
        // ignore
      }
      if (jobId || routeJobId || pendingUrls.length > 0) return;
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
  }, [jobId, routeJobId, pendingUrls.length]);

  useEffect(() => {
    if (job?.status === "done" && job.job_id === jobId) bumpRefresh();
  }, [job, jobId, bumpRefresh]);

  const finishedPostId = job?.links.find((l) => l.post_id && (l.status === "saved" || l.status === "linked"))?.post_id;
  const finishedPost = finishedPostId ? posts.find((p) => p.post_id === finishedPostId) : null;
  const isDone = Boolean(job?.status === "done" && finishedPost);

  return (
    <View style={styles.backdrop}>
      <Stack.Screen options={{ headerShown: false, animation: "fade" }} />

      {/* Dimmed backdrop area with tap to dismiss */}
      <Pressable style={styles.scrim} onPress={handleClose} />

      {/* S1: Bottom sheet over current screen */}
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {isDone && finishedPost ? (
          /* S6: Mobile-Saved View */
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.savedHeaderRow}>
              <View style={styles.savedHeaderLeft}>
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={14} color="#1F7A4D" />
                </View>
                <Text style={styles.savedTitle}>Saved to your library</Text>
              </View>
              <Pressable hitSlop={8} onPress={handleClose}>
                <Text style={styles.undoText}>Undo</Text>
              </Pressable>
            </View>

            {/* Saved Card Preview */}
            <View style={styles.previewCard}>
              {finishedPost.thumbnail_url ? (
                <Image
                  source={{ uri: proxiedMediaUrl(finishedPost.thumbnail_url) ?? finishedPost.thumbnail_url }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.previewImage, { backgroundColor: colors.brandSoft }]} />
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewCaption} numberOfLines={2}>
                  {finishedPost.caption || "Saved idea"}
                </Text>
                <Text style={styles.previewAuthor}>
                  {finishedPost.author_handle ? `@${finishedPost.author_handle}` : "Instagram"}
                </Text>
              </View>
            </View>

            {/* Filed as chips */}
            <View style={styles.filedAsSection}>
              <Text style={styles.filedAsLabel}>Filed as</Text>
              <View style={styles.categoryChipsRow}>
                {["Travel", "Food", "Movies", "Other"].map((cat) => (
                  <View
                    key={cat}
                    style={[
                      styles.categoryChip,
                      finishedPost.content_category?.toLowerCase() === cat.toLowerCase() &&
                        styles.categoryChipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        finishedPost.content_category?.toLowerCase() === cat.toLowerCase() &&
                          styles.categoryChipTextSelected,
                      ]}
                    >
                      {cat}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Actions: Save another & View in Library */}
            <View style={styles.savedActionRow}>
              <Pressable
                onPress={() => {
                  setJobId(null);
                }}
                style={styles.saveAnotherBtn}
              >
                <Text style={styles.saveAnotherBtnText}>Save another</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  handleClose();
                }}
                style={styles.viewLibraryBtn}
              >
                <Text style={styles.viewLibraryBtnText}>View in Library</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          /* S1-S5: Mobile-Save View */
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Save links</Text>
            <Text style={styles.helpText}>
              One link per line. Instagram reels work best, or share a reel to this app.
            </Text>

            {submitError ? <ErrorBanner message={submitError} /> : null}

            {/* S2-S4: Textarea, Counter & Save Button */}
            <LinkSubmitForm disabled={submitting} onSubmit={handleSubmit} />

            {/* S5: Recent list in the sheet */}
            <View style={styles.recentSection}>
              <Text style={styles.recentKicker}>RECENT</Text>
              <View style={styles.recentList}>
                {posts.slice(0, 3).map((item) => (
                  <View key={item.post_id} style={styles.recentItemRow}>
                    <View style={styles.recentThumbWrap}>
                      {item.thumbnail_url ? (
                        <Image
                          source={{ uri: proxiedMediaUrl(item.thumbnail_url) ?? item.thumbnail_url }}
                          style={styles.recentThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.recentThumb, { backgroundColor: colors.brandSoft }]} />
                      )}
                    </View>
                    <View style={styles.recentCopy}>
                      <Text style={styles.recentTitle} numberOfLines={1}>
                        {item.caption || "instagram.com/reel/…"}
                      </Text>
                      <Text style={styles.recentStatus} numberOfLines={1}>
                        {item.content_category
                          ? `Filed as ${item.content_category.charAt(0).toUpperCase() + item.content_category.slice(1)}`
                          : "Finding places"}
                      </Text>
                    </View>
                    <View style={styles.checkPill}>
                      <Ionicons name="checkmark" size={13} color="#1F7A4D" />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  scrim: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: "90%",
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: "#D9D5CB",
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.ink,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    marginTop: 6,
  },
  recentSection: {
    marginTop: 24,
  },
  recentKicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.muted,
  },
  recentList: {
    marginTop: 6,
  },
  recentItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  recentThumbWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    overflow: "hidden",
  },
  recentThumb: {
    width: "100%",
    height: "100%",
  },
  recentCopy: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  recentStatus: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  checkPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E3F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  savedHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  savedHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#E3F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  savedTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },
  undoText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.muted,
  },
  previewCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    marginBottom: 18,
  },
  previewImage: {
    width: 60,
    height: 76,
    borderRadius: 10,
  },
  previewInfo: {
    flex: 1,
    justifyContent: "center",
  },
  previewCaption: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  previewAuthor: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
  filedAsSection: {
    marginBottom: 20,
  },
  filedAsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    marginBottom: 8,
  },
  categoryChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
  },
  categoryChipTextSelected: {
    color: "#FFFFFF",
  },
  savedActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  saveAnotherBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  saveAnotherBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  viewLibraryBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  viewLibraryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
