import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { fetchActiveJob, postRouteParts, startIngest } from "@/src/api";
import { IngestProgress, LinkSubmitForm } from "@/src/components/IngestForm";
import { ErrorBanner } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { usePendingShare } from "@/src/context/PendingShareContext";
import { useJob } from "@/src/hooks/useJob";
import { colors, spacing } from "@/src/theme";

export default function IngestScreen() {
  const router = useRouter();
  const { shared } = useLocalSearchParams<{ shared?: string }>();
  const { bumpRefresh } = useLibrary();
  const { pendingUrls, clearPendingUrls } = usePendingShare();
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { job, error: jobError } = useJob(jobId);
  const autoStarted = useRef(false);
  const navigated = useRef(false);

  const initialText = pendingUrls.join("\n");

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
    if (jobId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const active = await fetchActiveJob();
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
    if (autoStarted.current || pendingUrls.length === 0 || shared !== "1") {
      return;
    }
    autoStarted.current = true;
    void handleSubmit(pendingUrls, false).then((ok) => {
      if (!ok) {
        autoStarted.current = false;
      }
    });
  }, [pendingUrls, shared, handleSubmit]);

  useEffect(() => {
    if (job?.status !== "done" || navigated.current) {
      return;
    }
    bumpRefresh();
    if ((job.counts.saved > 0 || (job.counts.linked ?? 0) > 0) && !navigated.current) {
      navigated.current = true;
      router.replace("/(app)/(tabs)/places");
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
      {submitError ? <ErrorBanner message={submitError} /> : null}
      {jobError ? <ErrorBanner message={jobError} /> : null}
      <LinkSubmitForm
        disabled={submitting || job?.status === "running"}
        initialText={initialText}
        onSubmit={(links, refresh) => void handleSubmit(links, refresh)}
      />
      <IngestProgress
        links={job?.links ?? []}
        running={job?.status === "running"}
        title={progressTitle}
        subtitle={progressSubtitle}
        onOpenPost={openPost}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
