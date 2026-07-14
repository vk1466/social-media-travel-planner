import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import type { JobLink } from "../api";
import { parseLinkLines } from "../lib/shareUrl";
import { colors, spacing } from "../theme";
import { Button, ErrorBanner } from "./ui";

interface LinkSubmitFormProps {
  disabled?: boolean;
  initialText?: string;
  onSubmit: (links: string[], refresh: boolean) => void;
}

export function LinkSubmitForm({
  disabled = false,
  initialText = "",
  onSubmit,
}: LinkSubmitFormProps) {
  const [text, setText] = useState(initialText);
  const [refresh, setRefresh] = useState(false);
  const parsed = useMemo(() => parseLinkLines(text), [text]);

  useEffect(() => {
    if (initialText) {
      setText(initialText);
    }
  }, [initialText]);

  return (
    <View style={styles.panel}>
      <Text style={styles.title}>Paste travel links</Text>
      <Text style={styles.subtitle}>
        One per line. Instagram reels work best — or share a reel to this app.
      </Text>
      <TextInput
        style={styles.input}
        multiline
        value={text}
        onChangeText={setText}
        editable={!disabled}
        placeholder={"https://www.instagram.com/reel/..."}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        textAlignVertical="top"
      />
      {parsed.invalid.length > 0 ? (
        <ErrorBanner message={`Not a valid URL: ${parsed.invalid.join(", ")}`} />
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.count}>
          {parsed.valid.length} URL{parsed.valid.length === 1 ? "" : "s"}
        </Text>
        <View style={styles.refreshRow}>
          <Text style={styles.refreshLabel}>Re-fetch saved</Text>
          <Switch
            value={refresh}
            onValueChange={setRefresh}
            disabled={disabled}
            trackColor={{ true: colors.brand }}
          />
        </View>
      </View>
      <Button
        label="Analyze links"
        disabled={disabled || parsed.valid.length === 0}
        onPress={() => onSubmit(parsed.valid, refresh)}
      />
    </View>
  );
}

interface IngestProgressProps {
  links: JobLink[];
  running: boolean;
  onOpenPost?: (platform: string, postId: string) => void;
}

function statusLabel(link: JobLink): string {
  switch (link.status) {
    case "pending":
      return "Waiting to start";
    case "fetching":
      return "Fetching post details…";
    case "saved":
      return "Saved";
    case "linked":
      return "Added to your library";
    case "skipped":
      return "Already in your library";
    case "unsupported":
      return "We don't support this site yet";
    case "error":
      return link.error_message || "Failed to ingest";
    default:
      return link.status;
  }
}

function shortenUrl(postUrl: string): string {
  try {
    const url = new URL(postUrl);
    return `${url.hostname}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return postUrl;
  }
}

function platformFromUrl(postUrl: string): string | null {
  try {
    const host = new URL(postUrl).hostname.replace(/^www\./, "");
    if (host.includes("instagram.com")) return "instagram";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("tiktok.com")) return "tiktok";
    return null;
  } catch {
    return null;
  }
}

export function IngestProgress({ links, running, onOpenPost }: IngestProgressProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <View style={styles.panel}>
      <View style={styles.progressHeader}>
        <Text style={styles.title}>Progress</Text>
        {running ? <Text style={styles.runningBadge}>Running</Text> : null}
      </View>
      {links.map((link) => {
        const platform = platformFromUrl(link.post_url);
        const canOpen =
          (link.status === "saved" || link.status === "linked" || link.status === "skipped") &&
          link.post_id &&
          platform &&
          onOpenPost;
        return (
          <View key={link.post_url} style={styles.progressItem}>
            <View style={[styles.dot, styles[`dot_${link.status}` as keyof typeof styles] as object]} />
            <View style={styles.progressCopy}>
              <Text style={styles.progressUrl}>{shortenUrl(link.post_url)}</Text>
              <Text style={styles.progressStatus}>{statusLabel(link)}</Text>
              {canOpen ? (
                <Pressable onPress={() => onOpenPost(platform, link.post_id!)}>
                  <Text style={styles.openLink}>View saved post</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    marginTop: 4,
    marginBottom: spacing.md,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.bg,
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  count: {
    color: colors.muted,
    fontSize: 13,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshLabel: {
    color: colors.ink,
    fontSize: 13,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  runningBadge: {
    color: colors.running,
    fontWeight: "600",
    fontSize: 12,
  },
  progressItem: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
    backgroundColor: colors.muted,
  },
  dot_pending: { backgroundColor: colors.muted },
  dot_fetching: { backgroundColor: colors.running },
  dot_saved: { backgroundColor: colors.success },
  dot_linked: { backgroundColor: colors.success },
  dot_skipped: { backgroundColor: colors.brand },
  dot_unsupported: { backgroundColor: colors.muted },
  dot_error: { backgroundColor: colors.danger },
  progressCopy: {
    flex: 1,
  },
  progressUrl: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: "500",
  },
  progressStatus: {
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  openLink: {
    marginTop: 6,
    color: colors.brand,
    fontWeight: "600",
    fontSize: 13,
  },
});
