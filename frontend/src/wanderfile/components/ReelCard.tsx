import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { SavedPost } from "../../api";
import { getPostTitle, proxiedMediaUrl, truncateAtWordBoundary } from "../../postDisplayUtils";

interface ReelCardProps {
  post: SavedPost;
  onEdit?: (post: SavedPost) => void;
  onDelete?: (post: SavedPost) => void;
  style?: React.CSSProperties;
}

export function ReelCard({ post, style }: ReelCardProps) {
  const location = useLocation();
  const [imgError, setImgError] = useState(false);

  const rawUrl = post.thumbnail_url || (post.slide_media_urls && post.slide_media_urls[0]);
  const imageUrl = rawUrl ? proxiedMediaUrl(rawUrl) : null;
  const spotCount = post.extracted_places?.length || post.place_ids?.length || 0;
  const creator = post.author_handle || "instagram";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        borderRadius: "20px",
        transition: "transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)",
        ...style,
      }}
      className="wf-reel-card-root"
    >
      <Link
        to={`/post/${post.post_id}`}
        state={{ from: location.pathname }}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
        }}
      >
        {/* Natural / Masonry Thumbnail with Radius 20 */}
        <div
          style={{
            width: "100%",
            borderRadius: "20px",
            overflow: "hidden",
            position: "relative",
            background: "var(--surface-2, #F3F3F1)",
            boxShadow: "var(--shadow-sm, 0 1px 2px rgba(16,24,40,.06))",
            cursor: "pointer",
            aspectRatio: "9 / 14",
          }}
          className="wf-card-hover"
        >
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={post.caption || "Instagram reel"}
              onError={() => setImgError(true)}
              loading="lazy"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transition: "transform 0.25s ease",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                color: "var(--ink-2, #5E636B)",
              }}
            >
              <span style={{ fontSize: "36px" }}>🎬</span>
            </div>
          )}

          {/* Top-Left Creator Avatar / Initials */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "rgba(22, 24, 27, 0.75)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              fontSize: "11px",
              fontWeight: 700,
              zIndex: 2,
              overflow: "hidden",
              border: "1.5px solid rgba(255, 255, 255, 0.4)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
          >
            {post.author_avatar_url ? (
              <img
                src={proxiedMediaUrl(post.author_avatar_url) ?? undefined}
                alt={creator}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span>{(creator || "CR").slice(0, 2).toUpperCase()}</span>
            )}
          </div>

          {/* Place-Count Badge */}
          {spotCount > 0 && (
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                padding: "4px 10px",
                borderRadius: "999px",
                background: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                color: "#FFFFFF",
                fontSize: "11px",
                fontWeight: 600,
                zIndex: 2,
              }}
            >
              {post.expected_place_count
                ? `${spotCount} of ${post.expected_place_count} places found`
                : `${spotCount} ${spotCount === 1 ? "place" : "places"}`}
            </div>
          )}

          {/* Bottom Gradient Overlay for Creator & Compact Engagement */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "28px 12px 10px",
              background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "6px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, overflow: "hidden" }}>
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "9px",
                  fontWeight: 700,
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {post.author_avatar_url ? (
                  <img
                    src={proxiedMediaUrl(post.author_avatar_url) ?? undefined}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span>{(creator || "CR")[0].toUpperCase()}</span>
                )}
              </div>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                @{creator}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", flexShrink: 0, opacity: 0.95 }}>
              {post.like_count != null && post.like_count > 0 && (
                <span>♥ {post.like_count >= 1000 ? `${(post.like_count / 1000).toFixed(1)}k` : post.like_count}</span>
              )}
              {post.comment_count != null && post.comment_count > 0 && (
                <span>💬 {post.comment_count >= 1000 ? `${(post.comment_count / 1000).toFixed(1)}k` : post.comment_count}</span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* 2-line clean title below image */}
      <div style={{ padding: "0 2px" }}>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: "18px",
            color: "var(--ink, #16181B)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "normal",
            overflowWrap: "break-word",
          }}
        >
          {truncateAtWordBoundary(getPostTitle(post), 75)}
        </p>
      </div>
    </div>
  );
}
