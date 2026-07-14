import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { postRouteParts, startIngest } from "@/src/api";
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
        onOpenPost={openPost}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
