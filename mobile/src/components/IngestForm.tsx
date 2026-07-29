import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import type { JobLink } from "../api";
import { parseLinkLines } from "../lib/shareUrl";
import { colors, radius, shadow, spacing } from "../theme";
import { Button, ErrorBanner } from "./ui";

type IconName = keyof typeof Ionicons.glyphMap;

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
      <View style={styles.titleRow}>
        <Ionicons name="link" size={18} color={colors.brand} />
        <Text style={styles.title}>Paste travel links</Text>
      </View>
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
        icon="sparkles"
        disabled={disabled || parsed.valid.length === 0}
        onPress={() => onSubmit(parsed.valid, refresh)}
      />
    </View>
  );
}

function statusIcon(status: JobLink["status"]): { name: IconName; color: string } {
  switch (status) {
    case "pending":
      return { name: "ellipse-outline", color: colors.faint };
    case "fetching":
      return { name: "sync", color: colors.running };
    case "saved":
    case "linked":
      return { name: "checkmark-circle", color: colors.success };
    case "skipped":
      return { name: "checkmark-done", color: colors.brand };
    case "unsupported":
      return { name: "help-circle-outline", color: colors.faint };
    case "error":
      return { name: "close-circle", color: colors.danger };
    default:
      return { name: "ellipse-outline", color: colors.faint };
  }
}

interface IngestProgressProps {
  links: JobLink[];
  running: boolean;
  title?: string;
  subtitle?: string;
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

export function IngestProgress({
  links,
  running,
  title = "Progress",
  subtitle,
  onOpenPost,
}: IngestProgressProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <View style={styles.panel}>
      <View style={styles.progressHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {running ? (
          <View style={styles.runningBadge}>
            <ActivityIndicator size="small" color={colors.running} />
            <Text style={styles.runningText}>Running</Text>
          </View>
        ) : null}
      </View>
      {links.map((link) => {
        const platform = platformFromUrl(link.post_url);
        const canOpen =
          (link.status === "saved" || link.status === "linked" || link.status === "skipped") &&
          link.post_id &&
          platform &&
          onOpenPost;
        const icon = statusIcon(link.status);
        return (
          <View key={link.post_url} style={styles.progressItem}>
            <Ionicons name={icon.name} size={20} color={icon.color} style={styles.statusIcon} />
            <View style={styles.progressCopy}>
              <Text style={styles.progressUrl}>{shortenUrl(link.post_url)}</Text>
              <Text style={styles.progressStatus}>{statusLabel(link)}</Text>
              {canOpen ? (
                <Pressable onPress={() => onOpenPost(platform, link.post_id!)} style={styles.openRow}>
                  <Text style={styles.openLink}>View saved post</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.brand} />
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
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow(1),
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
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
    borderRadius: radius.md,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef6ec",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  runningText: {
    color: colors.running,
    fontWeight: "700",
    fontSize: 12,
  },
  progressItem: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusIcon: {
    marginTop: 1,
  },
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
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  openLink: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 13,
  },
});
