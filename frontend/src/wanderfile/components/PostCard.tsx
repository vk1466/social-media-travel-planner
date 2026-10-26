import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import type { SavedPost } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";

interface PostCardProps {
  post: SavedPost;
  onEdit?: (post: SavedPost) => void;
  onDelete?: (post: SavedPost) => void;
  style?: React.CSSProperties;
}

export function PostCard({ post, onEdit, onDelete, style }: PostCardProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const category = post.content_category || "other";
  const catLabels: Record<string, { label: string; bg: string; ink: string }> = {
    travel: { label: "Place", bg: "#E3F0F4", ink: "#1B5E78" },
    food: { label: "Recipe", bg: "#FBEBDD", ink: "#9A4513" },
    movies: { label: "Watch", bg: "#ECE8F7", ink: "#4B3C8C" },
    fashion: { label: "Fashion", bg: "#F4EBF7", ink: "#73248A" },
    hairstyle: { label: "Hairstyle", bg: "#EBF7F2", ink: "#1D7553" },
    other: { label: "Other", bg: "#ECECEA", ink: "#4A4E52" },
  };
  const tag = catLabels[category] || catLabels.other;

  const targetUrl = post.place_ids && post.place_ids.length > 0
    ? `/place/${post.place_ids[0]}`
    : `/post/${post.post_id}`;

  const displayTitle = post.title || post.caption || "Saved post";

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "20px",
        overflow: "visible",
        ...style,
      }}
    >
      <Link
        to={targetUrl}
        state={{ from: location.pathname }}
        style={{
          display: "flex",
          flexDirection: "column",
          textDecoration: "none",
          color: "#1B1D1F",
          background: "#FFFFFF",
          border: "1px solid #E6E3DC",
          borderRadius: "20px",
          overflow: "hidden",
          height: "100%",
        }}
      >
        <div
          style={{
            height: "210px",
            position: "relative",
            background: post.thumbnail_url
              ? `url(${proxiedMediaUrl(post.thumbnail_url)}) center/cover no-repeat`
              : "linear-gradient(160deg, #8CC3D6, #2D6A82)",
          }}
        >
          {/* Category tag */}
          <span
            style={{
              position: "absolute",
              left: "10px",
              top: "10px",
              fontSize: "12px",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "999px",
              background: tag.bg,
              color: tag.ink,
              zIndex: 2,
            }}
          >
            {tag.label}
          </span>
        </div>

        <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              lineHeight: 1.35,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {displayTitle}
          </div>
          <div style={{ fontSize: "13px", color: "#6B6F73" }}>
            {post.author_handle ? `@${post.author_handle}` : "Instagram reel"}
          </div>
        </div>
      </Link>

      {/* Menu button */}
      <button
        type="button"
        aria-label="Post options"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen((prev) => !prev);
        }}
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.9)",
          border: "1px solid rgba(0, 0, 0, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 5,
          color: "#1B1D1F",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: "46px",
            right: "10px",
            background: "#FFFFFF",
            border: "1px solid #E6E3DC",
            borderRadius: "14px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.15)",
            zIndex: 10,
            minWidth: "160px",
            overflow: "hidden",
            padding: "4px 0",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onEdit(post);
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "transparent",
                border: 0,
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                color: "#1B1D1F",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#F6F5F1")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Edit save
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                if (window.confirm("Are you sure you want to delete this save?")) {
                  onDelete(post);
                }
              }}
              style={{
                width: "100%",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "transparent",
                border: 0,
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                color: "#D93829",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#FCE8E6")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete save
            </button>
          )}
        </div>
      )}
    </div>
  );
}
