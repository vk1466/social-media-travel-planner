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
  const slides =
    post.slide_media_urls && post.slide_media_urls.length > 0
      ? post.slide_media_urls
      : post.thumbnail_url
        ? [post.thumbnail_url]
        : [];
  const [slideIndex, setSlideIndex] = useState(0);

  const currentSource = slides[slideIndex] || post.thumbnail_url?.trim() || null;
  const thumbnailUrl = proxiedMediaUrl(currentSource);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  useEffect(() => {
    setThumbnailFailed(false);
  }, [thumbnailUrl]);

  useEffect(() => {
    setSlideIndex(0);
  }, [post.post_id]);

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
          <span>Watch on {post.platform === "youtube" ? "YouTube" : "Instagram"}</span>
        </a>

        {slides.length > 1 && (
          <div className="post-flip-slide-nav">
            <button
              type="button"
              className="post-flip-slide-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSlideIndex((i) => (i - 1 + slides.length) % slides.length);
              }}
              aria-label="Previous slide"
            >
              ‹
            </button>
            <span className="post-flip-slide-counter">
              Slide {slideIndex + 1} of {slides.length}
            </span>
            <button
              type="button"
              className="post-flip-slide-btn"
              onClick={(e) => {
                e.stopPropagation();
                setSlideIndex((i) => (i + 1) % slides.length);
              }}
              aria-label="Next slide"
            >
              ›
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="post-flip-reel post-flip-reel-empty">
      <a className="post-flip-reel-play" href={post.post_url} target="_blank" rel="noreferrer">
        <span className="post-flip-reel-play-icon">
          <PlayIcon />
        </span>
        <span>Watch on {post.platform === "youtube" ? "YouTube" : "Instagram"}</span>
      </a>
      <p className="post-flip-reel-empty-note">
        {currentSource
          ? "Couldn't load the preview image."
          : "No preview image saved for this post yet."}
      </p>
    </div>
  );
}
