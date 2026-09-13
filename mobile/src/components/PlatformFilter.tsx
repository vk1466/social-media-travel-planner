import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import {
  LIBRARY_PLATFORMS,
  LIBRARY_PLATFORM_COLOR,
  libraryPlatformIcon,
  libraryPlatformLabel,
  orderedLibraryPlatforms,
  useLibraryPlatform,
} from "../libraryPlatform";
import { colors, radius, shadow, spacing } from "../theme";

function PlatformGlyph({ platform, size = 11 }: { platform: string; size?: number }) {
  return <Ionicons name={libraryPlatformIcon(platform)} size={size} color={colors.onFill} />;
}

export function PlatformMenu() {
  const { platforms, togglePlatform, setPlatforms } = useLibraryPlatform();
  const [open, setOpen] = useState(false);
  const allActive = platforms.length === 0;
  const shown = allActive ? [...LIBRARY_PLATFORMS] : orderedLibraryPlatforms(platforms);
  const stacked = [...shown].reverse();
  const summary = allActive ? "All apps" : shown.map(libraryPlatformLabel).join(", ");

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, !allActive && styles.triggerOn]}
        accessibilityRole="button"
        accessibilityLabel={`Filter by platform: ${summary}`}
      >
        <View style={styles.stack}>
          {stacked.map((platform, index) => (
            <View
              key={platform}
              style={[
                styles.logo,
                index > 0 && styles.logoOverlap,
                { backgroundColor: LIBRARY_PLATFORM_COLOR[platform] ?? colors.brand },
              ]}
            >
              <PlatformGlyph platform={platform} />
            </View>
          ))}
        </View>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={() => undefined}>
            <Text style={styles.panelKicker}>Show posts from</Text>
            <Pressable
              style={[styles.option, allActive && styles.optionOn]}
              onPress={() => {
                setPlatforms([]);
                setOpen(false);
              }}
            >
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>Everything</Text>
                <Text style={styles.optionHint}>All connected apps</Text>
              </View>
            </Pressable>
            {LIBRARY_PLATFORMS.map((platform) => {
              const checked = platforms.includes(platform);
              return (
                <Pressable
                  key={platform}
                  style={[styles.option, checked && styles.optionOn]}
                  onPress={() => togglePlatform(platform)}
                >
                  <View
                    style={[
                      styles.optionMark,
                      { backgroundColor: LIBRARY_PLATFORM_COLOR[platform] ?? colors.brand },
                    ]}
                  >
                    <PlatformGlyph platform={platform} size={12} />
                  </View>
                  <Text style={styles.optionTitle}>{libraryPlatformLabel(platform)}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/** @deprecated Use PlatformMenu — kept so existing imports keep working. */
export function PlatformFilter() {
  return <PlatformMenu />;
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: 34,
    minHeight: 34,
    height: 34,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  triggerOn: {
    borderColor: colors.ink,
  },
  stack: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  logoOverlap: {
    marginLeft: -10,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 23, 30, 0.45)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 88,
    paddingHorizontal: spacing.md,
  },
  panel: {
    minWidth: 220,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    ...shadow(3),
  },
  panelKicker: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  optionOn: {
    backgroundColor: colors.surfaceAlt,
  },
  optionMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  optionCopy: { flex: 1 },
  optionTitle: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  optionHint: {
    color: colors.muted,
    fontSize: 11,
  },
});
