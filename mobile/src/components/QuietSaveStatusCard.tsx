import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { postRouteParts, type Job } from "@/src/api";
import { appHref } from "@/src/nav";
import { colors, radius, shadow, spacing } from "@/src/theme";

interface QuietSaveStatusCardProps {
  pendingUrls?: string[];
  activeJob?: Job | null;
  attentionJob?: Job | null;
  onDismissAttention?: () => void;
}

export function QuietSaveStatusCard({
  pendingUrls = [],
  activeJob,
  attentionJob,
  onDismissAttention,
}: QuietSaveStatusCardProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const hasPending = pendingUrls.length > 0;
  const isRunning = Boolean(activeJob && activeJob.status === "running");
  const hasAttention = Boolean(attentionJob);

  if (!hasPending && !isRunning && !hasAttention) {
    return null;
  }

  let eyebrow = "IN PROGRESS";
  let title = "Organizing your save";
  let detail = "You can keep browsing while we finish.";
  let isError = false;
  let isDone = false;
  let onPress = () => {
    router.push({ pathname: "/(app)/ingest", params: activeJob ? { jobId: activeJob.job_id } : undefined });
  };

  if (hasPending) {
    eyebrow = "SAVED ON THIS DEVICE";
    title = `${pendingUrls.length} shared ${pendingUrls.length === 1 ? "link" : "links"} waiting`;
    detail = "Will submit automatically when reconnected.";
    onPress = () => {
      router.push({ pathname: "/(app)/ingest", params: { shared: "1" } });
    };
  } else if (isRunning && activeJob) {
    const processed = activeJob.links.filter((l) => l.status !== "pending" && l.status !== "fetching").length;
    eyebrow = "ORGANIZING YOUR SAVE";
    title = "Organizing your save";
    detail = activeJob.links.length > 1
      ? `${processed} of ${activeJob.links.length} processed · You can keep browsing`
      : "Extracting details & places · You can keep browsing";
    onPress = () => {
      router.push({ pathname: "/(app)/ingest", params: { jobId: activeJob.job_id } });
    };
  } else if (attentionJob) {
    const errorCount = (attentionJob.counts.error ?? 0) + (attentionJob.counts.unsupported ?? 0);
    const savedCount = (attentionJob.counts.saved ?? 0) + (attentionJob.counts.linked ?? 0);

    if (errorCount > 0) {
      isError = true;
      eyebrow = "NEEDS ATTENTION";
      title = "Save needs attention";
      detail = `${errorCount} ${errorCount === 1 ? "link couldn't be saved" : "links couldn't be saved"}. Tap to retry.`;
      onPress = () => {
        router.push({ pathname: "/(app)/ingest", params: { jobId: attentionJob.job_id } });
      };
    } else {
      isDone = true;
      eyebrow = "READY TO OPEN";
      title = "Your save is ready";
      detail = savedCount > 0
        ? `${savedCount} ${savedCount === 1 ? "idea added" : "ideas added"} to your library.`
        : "Already in your library.";

      const finishedWithPost = attentionJob.links.find((l) => l.post_id && (l.status === "saved" || l.status === "linked"));
      if (finishedWithPost && finishedWithPost.post_id) {
        onPress = () => {
          const parts = postRouteParts("instagram", finishedWithPost.post_id!);
          router.push(`/posts/${parts.platform}/${parts.nativeId}`);
        };
      } else {
        onPress = () => {
          router.push(appHref("/(app)/(tabs)/posts"));
        };
      }
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${eyebrow}: ${title}. ${detail}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isError && styles.cardError,
        isDone && styles.cardDone,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconWrap, isError && styles.iconWrapError, isDone && styles.iconWrapDone]}>
        {isError ? (
          <Ionicons name="alert-circle" size={20} color={colors.danger} />
        ) : isDone ? (
          <Ionicons name="checkmark-circle" size={20} color={colors.brand} />
        ) : (
          <ActivityIndicator size="small" color={colors.brand} />
        )}
      </View>

      <View style={styles.content}>
        <Text style={[styles.eyebrow, isError && styles.eyebrowError, isDone && styles.eyebrowDone]}>
          {eyebrow}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {detail}
        </Text>
      </View>

      {isDone ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss save alert"
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            setDismissed(true);
            onDismissAttention?.();
          }}
          style={styles.dismissBtn}
        >
          <Ionicons name="close" size={17} color={colors.muted} />
        </Pressable>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={isError ? colors.danger : colors.brand} style={styles.chevron} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brandSoft,
    gap: 12,
    ...shadow(1),
  },
  cardError: {
    borderColor: colors.danger,
    backgroundColor: colors.surfaceAlt,
  },
  cardDone: {
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.85,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapError: {
    backgroundColor: colors.dangerSoft,
  },
  iconWrapDone: {
    backgroundColor: colors.brandSoft,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  eyebrowError: {
    color: colors.danger,
  },
  eyebrowDone: {
    color: colors.brand,
  },
  title: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 1,
  },
  detail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 4,
  },
  dismissBtn: {
    minWidth: 32,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
  },
});
