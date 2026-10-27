import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { SavedPost } from "../api";
import { nativePostId } from "../api";
import { proxiedMediaUrl } from "../postDisplayUtils";
import { colors, radius, shadow } from "../theme";

interface PostCardProps {
  post: SavedPost;
  onPress: () => void;
  dateMode?: "saved" | "posted";
  height?: number;
}

export const PostCard = memo(function PostCard({
  post,
  onPress,
  height = 180,
}: PostCardProps) {
  const [imgError, setImgError] = useState(false);
  const handle = post.author_handle || "instagram";
  const authorLine = handle.startsWith("@") ? handle : `@${handle}`;
  const spotCount = (post.place_ids?.length || 0) + (post.extracted_places?.length || 0);
  const imageUrl = proxiedMediaUrl(post.thumbnail_url);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open reel by ${authorLine}`}
      style={({ pressed }) => [styles.tileContainer, pressed && styles.pressed]}
    >
      <View style={[styles.imageWrap, { height }]}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="film-outline" size={28} color={colors.muted} />
          </View>
        )}

        {/* IG Glyph Badge */}
        <View style={styles.igBadge}>
          <Ionicons name="logo-instagram" size={13} color="#FFFFFF" />
        </View>

        {/* Spot Count Badge */}
        {spotCount > 0 && (
          <View style={styles.spotCountBadge}>
            <Text style={styles.spotCountText}>
              {spotCount} {spotCount === 1 ? "place" : "places"}
            </Text>
          </View>
        )}

        {/* Bottom Scrim for Creator & Engagement */}
        <View style={styles.creatorScrim}>
          <Text style={styles.creatorText} numberOfLines={1}>
            {authorLine}
          </Text>
          {post.like_count != null && post.like_count > 0 ? (
            <Text style={styles.likesText} numberOfLines={1}>
              ♥ {post.like_count >= 1000 ? `${(post.like_count / 1000).toFixed(1)}k` : post.like_count}
            </Text>
          ) : null}
        </View>
      </View>

      <Text style={styles.caption} numberOfLines={2}>
        {post.caption || post.title || "Saved reel"}
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
    gap: 8,
    marginBottom: 16,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  imageWrap: {
    width: "100%",
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.surface2,
    ...shadow.sm,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  igBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  spotCountBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  spotCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  creatorScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  creatorText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  likesText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 6,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.ink,
    paddingHorizontal: 2,
  },
});
