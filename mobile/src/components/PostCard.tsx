import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { SavedPost } from "../api";
import { nativePostId } from "../api";
import { formatDate, postTitle } from "../display";
import { proxiedMediaUrl } from "../postDisplayUtils";
import { colors, radius, shadow } from "../theme";

interface PostCardProps {
  post: SavedPost;
  onPress: () => void;
  dateMode?: "saved" | "posted";
  height?: number;
}

const CATEGORY_STYLES: Record<string, { label: string; bg: string; ink: string }> = {
  travel: { label: "Travel", bg: "#E3F0F4", ink: "#1B5E78" },
  food: { label: "Food", bg: "#FBEBDD", ink: "#9A4513" },
  movies: { label: "Movies", bg: "#ECE8F7", ink: "#4B3C8C" },
  fashion: { label: "Fashion", bg: "#ECECEA", ink: "#4A4E52" },
  hairstyle: { label: "Hairstyle", bg: "#ECECEA", ink: "#4A4E52" },
  routine: { label: "Other", bg: "#E4F2E7", ink: "#25623A" },
  other: { label: "Other", bg: "#ECECEA", ink: "#4A4E52" },
};

export const PostCard = memo(function PostCard({
  post,
  onPress,
  dateMode = "saved",
  height = 180,
}: PostCardProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const handle = post.author_handle?.trim();
  const dateRaw = dateMode === "posted" ? post.posted_at : post.fetched_at ?? post.posted_at;
  const dateStr = formatDate(dateRaw) ?? "Recently";
  const authorLine = handle ? (handle.startsWith("@") ? handle : `@${handle}`) : "";
  const metaLine = [authorLine, dateStr].filter(Boolean).join(" · ");

  const category = (post.content_category || "other").toLowerCase();
  const catStyle = CATEGORY_STYLES[category] || CATEGORY_STYLES.other;
  const imageUrl = proxiedMediaUrl(post.thumbnail_url);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open post ${postTitle(post)}`}
      style={({ pressed }) => [styles.tileContainer, pressed && styles.pressed]}
    >
      <View style={[styles.imageWrap, { height }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.imageFallback]} />
        )}

        {/* Category tag chip */}
        <View style={[styles.tagPill, { backgroundColor: catStyle.bg }]}>
          <Text style={[styles.tagText, { color: catStyle.ink }]}>{catStyle.label}</Text>
        </View>

        {/* 32px Bookmark circle */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            setBookmarked((prev) => !prev);
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? "Remove favorite" : "Favorite"}
          style={[styles.bookmarkButton, shadow(1)]}
        >
          <Ionicons
            name={bookmarked ? "bookmark" : "bookmark-outline"}
            size={16}
            color={colors.ink}
          />
        </Pressable>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {postTitle(post)}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {metaLine}
      </Text>
    </Pressable>
  );
});

export function postKey(post: SavedPost): string {
  return `${post.platform}:${nativePostId(post)}`;
}

const styles = StyleSheet.create({
  tileContainer: {
    width: "100%",
    marginBottom: 16,
  },
  pressed: {
    opacity: 0.9,
  },
  imageWrap: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#ECECEA",
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
  imageFallback: {
    backgroundColor: "#8CC3D6",
  },
  tagPill: {
    position: "absolute",
    left: 8,
    top: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  bookmarkButton: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    color: colors.ink,
  },
  meta: {
    marginTop: 3,
    fontSize: 12,
    color: colors.muted,
  },
});
