import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { fetchLinkPreview, type LinkPreview } from "../api";
import { parseLinkLines } from "../lib/shareUrl";
import { colors, radius } from "../theme";

const MANUAL_DRAFT_KEY = "wanderfile.manual-link-draft.v1";

interface LinkSubmitFormProps {
  disabled?: boolean;
  onSubmit: (links: string[], refresh: boolean) => Promise<boolean>;
}

export function LinkSubmitForm({
  disabled = false,
  onSubmit,
}: LinkSubmitFormProps) {
  const [text, setText] = useState("");
  const latestText = useRef("");
  const draftWriteQueue = useRef(Promise.resolve());
  const editedBeforeHydration = useRef(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<LinkPreview | null>(null);
  const parsed = useMemo(() => parseLinkLines(text), [text]);

  useEffect(() => {
    if (parsed.valid.length !== 1) {
      setPreviewLoading(false);
      setPreviewData(null);
      return;
    }
    const singleUrl = parsed.valid[0];
    let cancelled = false;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await fetchLinkPreview(singleUrl);
        if (!cancelled) {
          setPreviewData(data);
          setPreviewLoading(false);
        }
      } catch {
        if (!cancelled) {
          setPreviewData({
            url: singleUrl,
            platform: "instagram",
            is_available: true,
            title: "Instagram Reel",
          });
          setPreviewLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [parsed.valid]);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(MANUAL_DRAFT_KEY).then((saved) => {
      if (!mounted) return;
      if (!editedBeforeHydration.current && saved !== null) {
        latestText.current = saved;
        setText(saved);
      }
      setDraftHydrated(true);
    }).catch(() => {
      if (mounted) setDraftHydrated(true);
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    const write = draftWriteQueue.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(MANUAL_DRAFT_KEY, text));
    draftWriteQueue.current = write.catch(() => undefined);
  }, [text, draftHydrated]);

  const updateText = (nextText: string) => {
    editedBeforeHydration.current = true;
    latestText.current = nextText;
    setText(nextText);
  };

  const submit = async () => {
    if (parsed.valid.length === 0 || disabled) return;
    const submittedText = latestText.current;
    const submittedValid = parseLinkLines(submittedText).valid;
    const accepted = await onSubmit(submittedValid, refresh);
    if (!accepted) return;
    const remainingAccepted = new Map<string, number>();
    for (const url of submittedValid) remainingAccepted.set(url, (remainingAccepted.get(url) ?? 0) + 1);
    const nextText = latestText.current.split("\n").filter((line) => {
      const trimmed = line.trim();
      const count = remainingAccepted.get(trimmed) ?? 0;
      if (count === 0) return true;
      remainingAccepted.set(trimmed, count - 1);
      return false;
    }).join("\n");
    latestText.current = nextText;
    setText(nextText);
  };

  const validCount = parsed.valid.length;
  const buttonLabel = validCount > 1 ? `Save ${validCount} links` : "Save";

  return (
    <View style={styles.container}>
      {/* S2: White background, 2px ink border, radius 16px, min 3 lines, 15px text */}
      <TextInput
        style={styles.input}
        multiline
        value={text}
        onChangeText={updateText}
        editable={!disabled}
        placeholder={"https://www.instagram.com/reel/…\nhttps://www.instagram.com/reel/…"}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        textAlignVertical="top"
      />

      {/* S3: Counter on left with green check; Advanced options on right with chevron */}
      <View style={styles.counterRow}>
        <View style={styles.counterLeft}>
          {previewLoading ? (
            <ActivityIndicator size="small" color={colors.muted} style={{ marginRight: 4 }} />
          ) : previewData && !previewData.is_available ? (
            <View style={[styles.checkBadge, { backgroundColor: "#FEE2E2" }]}>
              <Ionicons name="close" size={13} color="#DC2626" />
            </View>
          ) : validCount > 0 ? (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={13} color="#1F7A4D" />
            </View>
          ) : null}
          <Text style={styles.counterText}>
            {previewLoading
              ? "Checking Instagram reel…"
              : previewData && !previewData.is_available
              ? "Unavailable post"
              : `${validCount} URLs · Instagram reels`}
          </Text>
        </View>

        <Pressable
          onPress={() => setAdvancedOpen((open) => !open)}
          hitSlop={8}
          style={styles.advancedBtn}
        >
          <Text style={styles.advancedText}>Advanced options</Text>
          <Ionicons
            name={advancedOpen ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.ink}
          />
        </Pressable>
      </View>

      {/* Advanced options accordion */}
      {advancedOpen && (
        <View style={styles.advancedPanel}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Re-fetch if already saved</Text>
              <Text style={styles.switchSub}>Update places and details from social post</Text>
            </View>
            <Switch
              value={refresh}
              onValueChange={setRefresh}
              trackColor={{ false: colors.borderSubtle, true: colors.ink }}
            />
          </View>
        </View>
      )}

      {/* Inline validation warning */}
      {text.trim().length > 0 && parsed.validationError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={15} color="#DC2626" />
          <Text style={styles.errorText}>{parsed.validationError}</Text>
        </View>
      ) : null}

      {/* Link Preview Card */}
      {previewLoading && (
        <View style={styles.previewCard}>
          <View style={[styles.previewThumb, styles.previewSkeleton]} />
          <View style={{ flex: 1, gap: 6 }}>
            <View style={[styles.previewSkeletonLine, { width: "40%" }]} />
            <View style={[styles.previewSkeletonLine, { width: "80%" }]} />
          </View>
        </View>
      )}

      {!previewLoading && previewData && !previewData.is_available && (
        <View style={styles.previewErrorCard}>
          <Ionicons name="alert-circle" size={20} color="#DC2626" />
          <View style={{ flex: 1 }}>
            <Text style={styles.previewErrorTitle}>
              {previewData.error_message || "Private or deleted post"}
            </Text>
            <Text style={styles.previewErrorSub}>
              This post cannot be viewed or saved because it is private or has been removed.
            </Text>
          </View>
        </View>
      )}

      {!previewLoading && previewData && previewData.is_available && (
        <View style={styles.previewCard}>
          {previewData.thumbnail_url ? (
            <Image source={{ uri: previewData.thumbnail_url }} style={styles.previewThumb} />
          ) : (
            <View style={[styles.previewThumb, styles.previewThumbFallback]}>
              <Ionicons name="logo-instagram" size={24} color="#FFFFFF" />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <Text style={styles.previewBadge}>Instagram Reel</Text>
              {previewData.author ? (
                <Text style={styles.previewAuthor}>@{previewData.author.replace(/^@/, "")}</Text>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.previewTitle}>
              {previewData.title || previewData.caption || "Ready to save"}
            </Text>
          </View>
        </View>
      )}

      {/* S4: Full-width pill, 52px high, enabled ink, disabled #E6E3DC */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        disabled={
          validCount === 0 ||
          disabled ||
          previewLoading ||
          Boolean(previewData && !previewData.is_available)
        }
        onPress={submit}
        style={[
          styles.saveButton,
          (validCount === 0 || previewLoading || Boolean(previewData && !previewData.is_available)) &&
            styles.saveButtonDisabled,
        ]}
      >
        <Text
          style={[
            styles.saveButtonText,
            (validCount === 0 || previewLoading || Boolean(previewData && !previewData.is_available)) &&
              styles.saveButtonTextDisabled,
          ]}
        >
          {previewData && !previewData.is_available ? "Cannot save private reel" : buttonLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: 18,
  },
  input: {
    width: "100%",
    minHeight: 96,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },
  counterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E3F4EA",
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    fontSize: 13,
    color: colors.bodyTinted,
  },
  advancedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  advancedText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
  },
  advancedPanel: {
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 10,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  switchSub: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  saveButton: {
    width: "100%",
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  saveButtonTextDisabled: {
    color: colors.faint,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 10,
    marginBottom: 4,
  },
  previewThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  previewThumbFallback: {
    backgroundColor: "#C13584",
    alignItems: "center",
    justifyContent: "center",
  },
  previewSkeleton: {
    backgroundColor: colors.borderSubtle,
  },
  previewSkeletonLine: {
    height: 12,
    borderRadius: 4,
    backgroundColor: colors.borderSubtle,
  },
  previewBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#C13584",
    backgroundColor: "#FDF0F5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    textTransform: "uppercase",
  },
  previewAuthor: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.ink,
  },
  previewErrorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "#F8D7DA",
    marginTop: 10,
    marginBottom: 4,
  },
  previewErrorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  previewErrorSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
});
