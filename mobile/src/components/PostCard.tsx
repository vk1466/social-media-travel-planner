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

export function PostCard({ post, onPress, dateMode = "saved" }: PostCardProps) {
  const handle = post.author_handle?.trim();
  const dateRaw = dateMode === "posted" ? post.posted_at : post.fetched_at ?? post.posted_at;

  return (
    <CoverCard
      title={postTitle(post)}
      category={post.media_kind || "post"}
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
}

export function postKey(post: SavedPost): string {
  return `${post.platform}:${nativePostId(post)}`;
}
