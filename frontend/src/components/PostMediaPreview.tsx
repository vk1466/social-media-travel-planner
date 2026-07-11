import { useEffect, useState } from "react";

import type { SavedPost } from "../api";
import { proxiedMediaUrl } from "../postDisplayUtils";

interface PostReelFaceProps {
  post: SavedPost;
  active: boolean;
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <path d="M10 7.5v13l11-6.5L10 7.5Z" fill="currentColor" />
    </svg>
  );
}

export function PostReelFace({ post, active }: PostReelFaceProps) {
  const sourceUrl = post.thumbnail_url?.trim() || null;
  const thumbnailUrl = proxiedMediaUrl(sourceUrl);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  useEffect(() => {
    setThumbnailFailed(false);
  }, [thumbnailUrl]);

  if (!active) {
    return <div className="post-flip-reel" aria-hidden="true" />;
  }

  if (thumbnailUrl && !thumbnailFailed) {
    return (
      <div className="post-flip-reel post-flip-reel-thumb">
        <img
          className="post-flip-reel-thumb-image"
          src={thumbnailUrl}
          alt=""
          decoding="async"
          onError={() => setThumbnailFailed(true)}
        />
        <a
          className="post-flip-reel-play"
          href={post.post_url}
          target="_blank"
          rel="noreferrer"
        >
          <span className="post-flip-reel-play-icon">
            <PlayIcon />
          </span>
          <span>Watch on Instagram</span>
        </a>
      </div>
    );
  }

  return (
    <div className="post-flip-reel post-flip-reel-empty">
      <a className="post-flip-reel-play" href={post.post_url} target="_blank" rel="noreferrer">
        <span className="post-flip-reel-play-icon">
          <PlayIcon />
        </span>
        <span>Watch on Instagram</span>
      </a>
      <p className="post-flip-reel-empty-note">
        {sourceUrl
          ? "Couldn't load the preview image."
          : "No preview image saved for this post yet."}
      </p>
    </div>
  );
}
