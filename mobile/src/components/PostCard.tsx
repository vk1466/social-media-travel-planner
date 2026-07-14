import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { SavedPost } from "../api";
import { nativePostId } from "../api";
import { formatPostDate, getPlatformLabel, getPostTitle, proxiedMediaUrl } from "../postDisplayUtils";
import { colors, spacing } from "../theme";
import { TagChip } from "./ui";

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
        <Image source={{ uri: thumb }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbLetter}>{getPlatformLabel(post).slice(0, 1)}</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.meta}>
          {getPlatformLabel(post)}
          {date ? ` · ${date}` : ""}
          {post.author_handle ? ` · @${post.author_handle}` : ""}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {getPostTitle(post)}
        </Text>
        {placeCount > 0 ? (
          <Text style={styles.places}>
            {placeCount} place{placeCount === 1 ? "" : "s"}
          </Text>
        ) : null}
        <View style={styles.tags}>
          {post.hashtags.slice(0, 3).map((tag) => (
            <TagChip key={tag} label={tag.replace(/^#/, "")} />
          ))}
        </View>
        <Pressable
          onPress={onDelete}
          hitSlop={8}
          style={styles.deleteBtn}
        >
          <Text style={styles.deleteText}>Remove</Text>
        </Pressable>
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.md,
    flexDirection: "row",
  },
  pressed: {
    opacity: 0.92,
  },
  thumb: {
    width: 96,
    minHeight: 120,
    backgroundColor: colors.brandSoft,
  },
  thumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  thumbLetter: {
    color: colors.brand,
    fontSize: 28,
    fontWeight: "700",
  },
  body: {
    flex: 1,
    padding: spacing.md,
  },
  meta: {
    color: colors.muted,
    fontSize: 12,
    marginBottom: 4,
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  places: {
    marginTop: 6,
    color: colors.brand,
    fontSize: 12,
    fontWeight: "500",
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  deleteBtn: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
  },
  deleteText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "500",
  },
});
