import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { colors, spacing } from "../theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  style,
}: ButtonProps) {
  const busy = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        busy && styles.disabled,
        pressed && !busy && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.brand : "#fff"} />
      ) : (
        <Text
          style={[
            styles.label,
            variant === "secondary" && styles.secondaryLabel,
            variant === "danger" && styles.dangerLabel,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <View style={styles.successBanner}>
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

export function TagChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  primary: {
    backgroundColor: colors.brand,
  },
  secondary: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: "#fef3f2",
    borderWidth: 1,
    borderColor: "#fecdca",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryLabel: {
    color: colors.brand,
  },
  dangerLabel: {
    color: colors.danger,
  },
  empty: {
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.ink,
    textAlign: "center",
  },
  emptyBody: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: "#fef3f2",
    borderColor: "#fecdca",
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
  },
  successBanner: {
    backgroundColor: "#ecfdf3",
    borderColor: "#abefc6",
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    color: colors.success,
    fontSize: 14,
  },
  chip: {
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "500",
  },
});
