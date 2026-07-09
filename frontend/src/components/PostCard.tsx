import { useState } from "react";

import type { SavedPost } from "../api";
import {
  faviconUrl,
  formatPostDate,
  getPlatformLabel,
  getPostDescription,
  getPostDomain,
  getPostTags,
  getPostTitle,
} from "../postDisplayUtils";

interface PostCardProps {
  post: SavedPost;
  placeNamesById?: Record<string, string>;
  onSelect: (post: SavedPost) => void;
  onDelete: () => Promise<void>;
  onNavigateToPlace?: (placeId: string) => void;
}

function placeLabelFor(
  post: SavedPost,
  placeId: string,
  index: number,
  placeNamesById: Record<string, string>,
): string {
  return (
    placeNamesById[placeId] ??
    post.extracted_places[index]?.place_name ??
    post.places[index]?.place_name ??
    "Place"
  );
}

export function PostCard({
  post,
  placeNamesById = {},
  onSelect,
  onDelete,
  onNavigateToPlace,
}: PostCardProps) {
  const [deleting, setDeleting] = useState(false);
  const domain = getPostDomain(post.post_url);
  const title = getPostTitle(post);
  const description = getPostDescription(post);
  const tags = getPostTags(post);
  const platformLabel = getPlatformLabel(post);
  const dateLabel = formatPostDate(post);
  const placeCount = post.extracted_places.length || post.place_ids.length;

  return (
    <article className="post-card">
      <div className="post-card-source">
        <div className="post-source-meta">
          <img
            className="post-favicon"
            src={faviconUrl(domain)}
            alt=""
            width={16}
            height={16}
            loading="lazy"
          />
          <span className="post-domain">{domain}</span>
          <span className="post-platform-badge">{platformLabel}</span>
        </div>
        <a
          className="post-open-link"
          href={post.post_url}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          Open
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M3.5 1.5h7v7M10.5 1.5 5.5 6.5M10.5 1.5H7M10.5 1.5V5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>

      <button
        type="button"
        className="post-card-body"
        onClick={() => onSelect(post)}
        aria-label={`View details for ${title}`}
      >
        <h3 className="post-title">{title}</h3>
        <p className="post-description">{description}</p>

        {tags.length > 0 && (
          <div className="tag-list post-tag-list">
            {tags.map((tag) => (
              <span key={tag} className="tag-chip post-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </button>

      {placeCount > 0 && (
        <div className="post-places-row">
          <span className="post-places-count">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path
                d="M7 1.5C4.8 1.5 3 3.3 3 5.5c0 3.2 4 6.5 4 6.5s4-3.3 4-6.5c0-2.2-1.8-4-4-4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle cx="7" cy="5.5" r="1.2" fill="currentColor" />
            </svg>
            {placeCount} place{placeCount === 1 ? "" : "s"} extracted
          </span>
          <div className="post-view-places">
            {post.place_ids.slice(0, 3).map((placeId, index) => (
              <button
                key={placeId}
                type="button"
                className="view-place-button"
                onClick={(event) => {
                  event.stopPropagation();
                  onNavigateToPlace?.(placeId);
                }}
              >
                {placeLabelFor(post, placeId, index, placeNamesById)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="post-card-footer">
        {dateLabel && <time className="post-date">{dateLabel}</time>}
        <button
          type="button"
          className="post-delete-button"
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
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M2.5 4h9M5.5 4V2.5h3V4M5 4v7.5h4V4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </article>
  );
}
