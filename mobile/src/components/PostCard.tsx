import { memo } from "react";
import type { SavedPost } from "../api";
import { nativePostId } from "../api";
import { formatDate, postTitle } from "../display";
import { getPlatformLabel, proxiedMediaUrl } from "../postDisplayUtils";
import { CoverCard } from "./CoverCard";

interface PostCardProps {
  post: SavedPost;
  onPress: () => void;
  dateMode?: "saved" | "posted";
}

export const PostCard = memo(function PostCard({ post, onPress, dateMode = "saved" }: PostCardProps) {
  const handle = post.author_handle?.trim();
  const dateRaw = dateMode === "posted" ? post.posted_at : post.fetched_at ?? post.posted_at;

  return (
    <CoverCard
      title={postTitle(post)}
      category={mediaLabel(post.media_kind)}
      platform={post.platform}
      location={
        handle ? (handle.startsWith("@") ? handle : `@${handle}`) : getPlatformLabel(post)
      }
      meta={formatDate(dateRaw) ?? "Saved"}
      action="Open ↗"
      imageUrl={proxiedMediaUrl(post.thumbnail_url)}
      onPress={onPress}
      accessibilityLabel={`Open post ${postTitle(post)}`}
    />
  );
});

function mediaLabel(kind: string | null | undefined): string {
  if (kind === "reel") return "Reel";
  if (kind === "carousel") return "Carousel";
  if (kind === "image") return "Photo";
  if (kind === "video") return "Video";
  if (!kind || kind === "post") return "Post";
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

export function postKey(post: SavedPost): string {
  return `${post.platform}:${nativePostId(post)}`;
}
