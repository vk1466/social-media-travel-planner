import { useState } from "react";

import type { SavedPost } from "../api";

interface PostCardProps {
  post: SavedPost;
  onSelect: (post: SavedPost) => void;
  onDelete: () => Promise<void>;
}

function formatPlace(post: SavedPost): string | null {
  const place = post.extracted_places[0] ?? post.places[0];
  if (!place) {
    return null;
  }
  const parts = [place.place_name, place.city, place.country].filter(Boolean);
  return parts.join(", ");
}

export function PostCard({ post, onSelect, onDelete }: PostCardProps) {
  const [deleting, setDeleting] = useState(false);
  const placeLabel = formatPlace(post);

  return (
    <article
      className="post-card post-card-clickable"
      onClick={() => onSelect(post)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(post);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View details for post by ${post.author_handle || "unknown"}`}
    >
      <div className="post-card-header">
        <div>
          <p className="post-author">@{post.author_handle || "unknown"}</p>
          <span className="badge">{post.media_kind}</span>
        </div>
        <a
          className="post-link"
          href={post.post_url}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          Open
        </a>
      </div>

      <p className="post-caption">{post.caption || "No caption"}</p>

      {placeLabel && <p className="place-chip">{placeLabel}</p>}

      <div className="post-stats">
        {post.like_count != null && <span>{post.like_count.toLocaleString()} likes</span>}
      </div>

      {post.extracted_places.length > 0 ? (
        <p className="post-extract-hint">
          {post.extracted_places.length} place{post.extracted_places.length === 1 ? "" : "s"}{" "}
          extracted — click to view
        </p>
      ) : (
        (post.media_kind === "reel" || post.media_kind === "video") && (
          <p className="post-extract-hint">No video places yet — click to view details</p>
        )
      )}

      <div className="post-card-footer">
        <button
          type="button"
          className="danger-button"
          disabled={deleting}
          onClick={async (event) => {
            event.stopPropagation();
            if (!window.confirm("Delete this saved post?")) {
              return;
            }
            setDeleting(true);
            try {
              await onDelete();
            } finally {
              setDeleting(false);
            }
          }}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}
