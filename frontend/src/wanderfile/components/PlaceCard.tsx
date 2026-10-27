import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Place, SavedPost } from "../../api";
import { getCategoryVisual } from "../categoryVisuals";
import { proxiedMediaUrl } from "../../postDisplayUtils";

interface PlaceCardProps {
  place: Place;
  posts?: SavedPost[];
  isVisited?: boolean;
  onToggleVisited?: (placeId: string) => void;
  style?: React.CSSProperties;
}

export function PlaceCard({ place, posts = [], isVisited = false, onToggleVisited, style }: PlaceCardProps) {
  const location = useLocation();
  const visual = getCategoryVisual(place.category);

  // Find thumbnail from matching source post
  const matchingPost = posts.find((p) => place.source_post_ids?.includes(p.post_id));
  const creatorHandle = matchingPost?.author_handle || "instagram";
  const reelCount = place.source_post_ids?.length || 1;
  const rawImageUrl = matchingPost?.thumbnail_url || (matchingPost?.slide_media_urls && matchingPost.slide_media_urls[0]);
  const imageUrl = rawImageUrl ? proxiedMediaUrl(rawImageUrl) : null;

  const [imgError, setImgError] = useState(false);

  const locationText = [place.location?.city, place.location?.country].filter(Boolean).join(" · ") || "Location saved";

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
      className="wf-place-card-root"
    >
      <Link
        to={`/place/${place.place_id}`}
        state={{ from: location.pathname }}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
        }}
      >
        {/* 4:5 Image Card with Radius 20 */}
        <div
          style={{
            width: "100%",
            aspectRatio: "4 / 5",
            borderRadius: "20px",
            overflow: "hidden",
            position: "relative",
            background: visual.tint,
            boxShadow: "var(--shadow-sm, 0 1px 2px rgba(16,24,40,.06))",
            cursor: "pointer",
          }}
          className="wf-card-hover"
        >
          {imageUrl && !imgError ? (
            <img
              src={imageUrl}
              alt={place.display_name}
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
              }}
            >
              <span style={{ fontSize: "42px" }}>{visual.glyph}</span>
            </div>
          )}

          {/* Top-Left Category Chip (90% blur pill) */}
          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "#16181B",
              fontSize: "12px",
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
              zIndex: 2,
            }}
          >
            <span style={{ fontSize: "13px" }}>{visual.glyph}</span>
            <span>{visual.name}</span>
          </div>

          {/* Top-Right Heart / Visited Toggle */}
          {onToggleVisited && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleVisited(place.place_id);
              }}
              aria-label={isVisited ? "Marked as visited" : "Mark as visited"}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                zIndex: 2,
                fontSize: "14px",
              }}
            >
              {isVisited ? "❤️" : "🤍"}
            </button>
          )}

          {/* Bottom Gradient Scrim (0 to 60% black) */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "36px 14px 14px",
              background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              zIndex: 1,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 600,
                color: "#FFFFFF",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}
            >
              {place.display_name}
            </h3>
            <span
              style={{
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.85)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {locationText}
            </span>
          </div>
        </div>
      </Link>

      {/* Below Image: Creator Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "0 4px",
          fontSize: "12px",
          color: "var(--ink-2, #5E636B)",
        }}
      >
        <div
          style={{
            width: "20px",
            height: "20px",
            borderRadius: "50%",
            background: "var(--surface-2, #F3F3F1)",
            border: "1px solid var(--line, #E7E6E3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10px",
            fontWeight: 700,
            color: "var(--ink, #16181B)",
            flexShrink: 0,
          }}
        >
          {creatorHandle[0].toUpperCase()}
        </div>
        <span style={{ fontWeight: 600, color: "var(--ink, #16181B)" }}>@{creatorHandle}</span>
        <span>·</span>
        <span>from {reelCount} {reelCount === 1 ? "reel" : "reels"}</span>
      </div>
    </div>
  );
}
