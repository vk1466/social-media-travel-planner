import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { coverFallbackColor } from "../coverArt";
import { libraryPlatformIcon } from "../libraryPlatform";
import { colors, shadow } from "../theme";

const ROW_THUMB = 124; // 7.75rem at 16px

export interface CoverCardProps {
  title: string;
  category?: string;
  platform?: string;
  kicker?: string;
  location?: string;
  meta?: string;
  action?: string;
  imageUrl?: string | null;
  badge?: ReactNode;
  variant?: "portrait" | "row";
  onPress: () => void;
  accessibilityLabel?: string;
}

export function CoverCard({
  title,
  category,
  platform,
  kicker,
  location,
  meta,
  action = "View ↗",
  imageUrl,
  badge,
  variant = "portrait",
  onPress,
  accessibilityLabel,
}: CoverCardProps) {
  const isRow = variant === "row";
  const fallbackColor = coverFallbackColor(title);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `Open ${title}`}
      style={({ pressed }) => [
        styles.card,
        isRow ? styles.cardRow : styles.cardPortrait,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.media, isRow && styles.mediaRow]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, { backgroundColor: fallbackColor }]} />
        )}
        {!isRow && kicker ? (
          <View pointerEvents="none" style={styles.gradient}>
            <View style={styles.gradientFade} />
            <View style={styles.gradientSolid} />
          </View>
        ) : null}
        {category || platform ? (
          <View style={[styles.categoryChip, isRow && styles.categoryChipRow]}>
            {platform ? (
              <Ionicons
                name={libraryPlatformIcon(platform)}
                size={isRow ? 11 : 13}
                color={colors.ink}
              />
            ) : null}
            {category ? (
              <Text style={[styles.categoryText, isRow && styles.categoryTextRow]} numberOfLines={1}>
                {category}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.mark, isRow && styles.markRow]} pointerEvents="box-none">
          {badge ?? (
            <Ionicons name="bookmark-outline" size={isRow ? 13 : 17} color={colors.ink} />
          )}
        </View>
        {!isRow && kicker ? (
          <Text style={styles.kicker} numberOfLines={1}>
            {kicker}
          </Text>
        ) : null}
      </View>
      <View style={[styles.copy, isRow && styles.copyRow]}>
        {location ? (
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
        ) : null}
        <Text style={[styles.title, isRow && styles.titleRow]} numberOfLines={2}>
          {title}
        </Text>
        <View style={[styles.footer, isRow && styles.footerRow]}>
          {meta ? (
            <Text style={styles.meta} numberOfLines={1}>
              {meta}
            </Text>
          ) : (
            <View style={styles.metaSpacer} />
          )}
          <Text style={styles.action}>{action}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...shadow(2),
  },
  cardPortrait: {
    aspectRatio: 2 / 3.05,
    borderRadius: 0,
  },
  cardRow: {
    flexDirection: "row",
    minHeight: ROW_THUMB,
    borderRadius: 16,
  },
  pressed: {
    opacity: 0.92,
  },
  media: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  mediaRow: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: ROW_THUMB,
    width: ROW_THUMB,
    minHeight: ROW_THUMB,
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 88,
    justifyContent: "flex-end",
  },
  gradientFade: {
    flex: 1,
    backgroundColor: "rgba(17, 42, 53, 0.12)",
  },
  gradientSolid: {
    height: 40,
    backgroundColor: "rgba(17, 42, 53, 0.38)",
  },
  categoryChip: {
    position: "absolute",
    top: 14,
    left: 14,
    maxWidth: "72%",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 2,
    backgroundColor: colors.surface,
  },
  categoryChipRow: {
    top: 7,
    left: 7,
    maxWidth: "78%",
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryText: {
    color: colors.ink,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  categoryTextRow: {
    fontSize: 8,
    letterSpacing: 0.4,
  },
  mark: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  markRow: {
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  kicker: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
    color: colors.onFill,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 7,
  },
  copy: {
    minHeight: 128,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 15,
    backgroundColor: colors.surface,
  },
  copyRow: {
    flex: 1,
    minHeight: 0,
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  location: {
    color: colors.muted,
    fontSize: 11,
  },
  title: {
    marginTop: 10,
    color: colors.ink,
    fontSize: 20,
    fontWeight: "500",
    lineHeight: 22,
  },
  titleRow: {
    marginTop: 3,
    fontSize: 18,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: "auto",
    paddingTop: 14,
  },
  footerRow: {
    paddingTop: 6,
  },
  meta: {
    flex: 1,
    color: colors.muted,
    fontSize: 11,
  },
  metaSpacer: {
    flex: 1,
  },
  action: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
  },
});
