import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

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
  const parsed = useMemo(() => parseLinkLines(text), [text]);

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
          {validCount > 0 ? (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={13} color="#1F7A4D" />
            </View>
          ) : null}
          <Text style={styles.counterText}>
            {validCount} URLs · Instagram reels
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

      {/* S4: Full-width pill, 52px high, enabled ink, disabled #E6E3DC */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        disabled={validCount === 0 || disabled}
        onPress={submit}
        style={[
          styles.saveButton,
          validCount === 0 && styles.saveButtonDisabled,
        ]}
      >
        <Text
          style={[
            styles.saveButtonText,
            validCount === 0 && styles.saveButtonTextDisabled,
          ]}
        >
          {buttonLabel}
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
});
