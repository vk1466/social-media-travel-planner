import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "@/src/theme";

type DetailSheetChromeProps = {
  onClose?: () => void;
  children: ReactNode;
  style?: ViewStyle;
};

export function DetailSheetChrome({ onClose, children, style }: DetailSheetChromeProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const handleClose = onClose ?? (() => router.back());

  return (
    <View style={[styles.root, style]}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <View style={styles.handle} accessibilityElementsHidden importantForAccessibility="no" />
        <Pressable
          style={styles.close}
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topBar: {
    position: "relative",
    alignItems: "center",
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  close: {
    position: "absolute",
    top: 8,
    right: spacing.md,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  closeText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
});
