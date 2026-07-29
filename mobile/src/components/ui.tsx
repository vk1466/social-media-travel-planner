import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { categoryLabel, categoryTone, CATEGORY_TONE_COLORS } from "../categoryLabels";
import { colors, radius, shadow, spacing } from "../theme";

type IconName = keyof typeof Ionicons.glyphMap;

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  icon,
  style,
}: ButtonProps) {
  const busy = disabled || loading;
  const fg =
    variant === "primary" ? "#fff" : variant === "danger" ? colors.danger : colors.brand;
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
        <ActivityIndicator color={variant === "primary" ? "#fff" : colors.brand} />
      ) : (
        <View style={styles.btnContent}>
          {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
          <Text
            style={[
              styles.label,
              variant === "secondary" && styles.secondaryLabel,
              variant === "danger" && styles.dangerLabel,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/** Compact circular icon-only button (delete, actions, etc.). */
export function IconButton({
  icon,
  onPress,
  color = colors.muted,
  tint,
  size = 18,
  accessibilityLabel,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  tint?: string;
  size?: number;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.iconButton,
        tint ? { backgroundColor: tint } : null,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

/** Standard elevated surface card. */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function EmptyState({
  title,
  body,
  icon = "compass-outline",
}: {
  title: string;
  body?: string;
  icon?: IconName;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.brand} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <View style={styles.successBanner}>
      <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      <Text style={styles.successText}>{message}</Text>
    </View>
  );
}

export function TagChip({
  label,
  category,
}: {
  label?: string;
  /** When set, uses stable category tone + display label. */
  category?: string | null;
}) {
  if (category !== undefined) {
    const tone = categoryTone(category);
    const palette = CATEGORY_TONE_COLORS[tone] ?? CATEGORY_TONE_COLORS.muted;
    return (
      <View
        style={[
          styles.chip,
          { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: 1 },
        ]}
      >
        <Text style={[styles.chipText, { color: palette.text }]}>{categoryLabel(category)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    marginTop: spacing.sm,
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
    backgroundColor: colors.dangerSoft,
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
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryLabel: {
    color: colors.brand,
  },
  dangerLabel: {
    color: colors.danger,
  },
  iconButton: {
    height: 36,
    width: 36,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow(1),
  },
  empty: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  emptyIcon: {
    height: 64,
    width: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.dangerSoft,
    borderColor: "#fecdca",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "500",
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successSoft,
    borderColor: "#abefc6",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    flex: 1,
    color: colors.success,
    fontSize: 14,
    fontWeight: "500",
  },
  chip: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "600",
  },
});
