import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchActiveJob, fetchJobs, postRouteParts, removePendingJobLink, startIngest, type Job } from "@/src/api";
import { IngestProgress, LinkSubmitForm } from "@/src/components/IngestForm";
import { ErrorBanner } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { usePendingShare } from "@/src/context/PendingShareContext";
import { useJob } from "@/src/hooks/useJob";
import { colors, radius, spacing } from "@/src/theme";

export default function IngestScreen() {
  const router = useRouter();
  const { shared } = useLocalSearchParams<{ shared?: string }>();
  const { bumpRefresh } = useLibrary();
  const { pendingUrls, autoSubmit, clearPendingUrls } = usePendingShare();
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { job, error: jobError } = useJob(jobId);
  const [jobs, setJobs] = useState<Job[]>([]);
  const autoStarted = useRef(false);
  const navigated = useRef(false);

  const initialText = pendingUrls.join("\n");
  const shouldAutoStart = autoSubmit || shared === "1";

  const handleSubmit = useCallback(
    async (links: string[], refresh: boolean): Promise<boolean> => {
      setSubmitError(null);
      setSubmitting(true);
      navigated.current = false;
      try {
        const nextJobId = await startIngest(links, refresh);
        setJobId(nextJobId);
        clearPendingUrls();
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
      if (jobId) return;
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
  }, [jobId]);

  useEffect(() => {
    if (autoStarted.current || pendingUrls.length === 0 || !shouldAutoStart || submitting) {
      return;
    }
    autoStarted.current = true;
    void handleSubmit(pendingUrls, false).then((ok) => {
      if (!ok) {
        autoStarted.current = false;
      }
    });
  }, [pendingUrls, shouldAutoStart, handleSubmit, submitting]);

  useEffect(() => {
    if (job?.status !== "done" || navigated.current) {
      return;
    }
    bumpRefresh();
    if ((job.counts.saved > 0 || (job.counts.linked ?? 0) > 0) && !navigated.current) {
      navigated.current = true;
      router.replace("/(app)/(tabs)/posts");
    }
  }, [job, bumpRefresh, router]);

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>Wanderfile queue</Text>
      <Text style={styles.title}>Processing</Text>
      <Text style={styles.lede}>
        Paste links anytime. They join your queue and stay there on every device you sign in with.
      </Text>
      {submitError ? <ErrorBanner message={submitError} /> : null}
      {jobError ? <ErrorBanner message={jobError} /> : null}
      <LinkSubmitForm
        disabled={submitting}
        initialText={initialText}
        onSubmit={(links, refresh) => void handleSubmit(links, refresh)}
      />
      <IngestProgress
        links={job?.links ?? []}
        running={job?.status === "running"}
        title={progressTitle}
        subtitle={progressSubtitle}
        onOpenPost={openPost}
        onRemovePending={
          job && job.status === "running"
            ? async (postUrl) => {
                try {
                  await removePendingJobLink(job.job_id, postUrl);
                } catch (err) {
                  setSubmitError(err instanceof Error ? err.message : "Failed to remove link");
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
              <View key={item.job_id} style={styles.jobRow}>
                <Text style={styles.jobStatus}>{item.status === "running" ? "Processing" : "Complete"}</Text>
                <Text style={styles.jobMeta}>
                  {item.counts.saved} saved · {item.counts.linked} linked · {item.counts.error} errors
                </Text>
              </View>
            ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
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
