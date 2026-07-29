import Ionicons from "@expo/vector-icons/Ionicons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { SavedPost } from "../api";
import { nativePostId } from "../api";
import { formatPostDate, getPlatformLabel, getPostTitle, proxiedMediaUrl } from "../postDisplayUtils";
import { colors, radius, shadow, spacing } from "../theme";
import { IconButton, TagChip } from "./ui";

interface PostCardProps {
  post: SavedPost;
  onPress: () => void;
  onDelete: () => void;
}

export function PostCard({ post, onPress, onDelete }: PostCardProps) {
  const thumb = proxiedMediaUrl(post.thumbnail_url);
  const date = formatPostDate(post);
  const placeCount = post.place_ids.length || post.extracted_places.length;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {thumb ? (
        <View style={styles.thumbWrap}>
          <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
          <View style={styles.playBadge}>
            <Ionicons name="play" size={12} color="#fff" />
          </View>
        </View>
      ) : (
        <View style={styles.thumbPlaceholder}>
          <Ionicons name="logo-instagram" size={30} color={colors.brand} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={styles.meta} numberOfLines={1}>
            {getPlatformLabel(post)}
            {date ? ` · ${date}` : ""}
            {post.author_handle ? ` · @${post.author_handle}` : ""}
          </Text>
          <IconButton
            icon="trash-outline"
            onPress={onDelete}
            color={colors.faint}
            size={16}
            accessibilityLabel="Remove post"
          />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {getPostTitle(post)}
        </Text>
        {placeCount > 0 ? (
          <View style={styles.places}>
            <Ionicons name="location" size={13} color={colors.brand} />
            <Text style={styles.placesText}>
              {placeCount} place{placeCount === 1 ? "" : "s"}
            </Text>
          </View>
        ) : null}
        {post.hashtags.length > 0 ? (
          <View style={styles.tags}>
            {post.hashtags.slice(0, 3).map((tag) => (
              <TagChip key={tag} label={tag.replace(/^#/, "")} />
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function postKey(post: SavedPost): string {
  return `${post.platform}:${nativePostId(post)}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md,
    flexDirection: "row",
    ...shadow(1),
  },
  pressed: {
    opacity: 0.92,
  },
  thumbWrap: {
    width: 104,
    alignSelf: "stretch",
    minHeight: 128,
  },
  thumb: {
    flex: 1,
    width: 104,
    minHeight: 128,
    backgroundColor: colors.brandSoft,
  },
  thumbPlaceholder: {
    width: 104,
    minHeight: 128,
    alignSelf: "stretch",
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  playBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    height: 24,
    width: 24,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,32,27,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 4,
  },
  meta: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  places: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  placesText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "600",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
});
