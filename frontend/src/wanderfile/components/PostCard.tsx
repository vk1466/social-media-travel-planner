import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { MapPin, Utensils, Film, Sparkles, Scissors, Bookmark, MoreHorizontal, Edit3, Trash2, FolderPlus } from "lucide-react";
import type { SavedPost } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";

interface PostCardProps {
  post: SavedPost;
  onEdit?: (post: SavedPost) => void;
  onDelete?: (post: SavedPost) => void;
  onAddToCollection?: (post: SavedPost) => void;
  style?: React.CSSProperties;
}

export function PostCard({ post, onEdit, onDelete, onAddToCollection, style }: PostCardProps) {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
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

  const getCategoryConfig = (cat: string) => {
    switch (cat) {
      case "travel":
        return { label: "Places", dot: "var(--wf-cat-place)", Icon: MapPin };
      case "food":
        return { label: "Food", dot: "var(--wf-cat-food)", Icon: Utensils };
      case "movies":
        return { label: "Watch", dot: "var(--wf-cat-watch)", Icon: Film };
      case "fashion":
        return { label: "Fashion", dot: "var(--wf-cat-fashion)", Icon: Sparkles };
      case "hairstyle":
        return { label: "Hair", dot: "var(--wf-cat-hair)", Icon: Scissors };
      default:
        return { label: "Other", dot: "var(--wf-text-muted)", Icon: Bookmark };
    }
  };

  const { label, dot, Icon } = getCategoryConfig(category);

  const targetUrl = post.place_ids && post.place_ids.length > 0
    ? `/place/${post.place_ids[0]}`
    : `/post/${post.post_id}`;

  const displayTitle = post.title || post.caption || "Saved reel";

  // Build caption line such as "3 places · Lisbon"
  const placesCount = (post.place_ids?.length || 0) + (post.extracted_places?.length || 0);
  let captionLine = post.author_handle ? `@${post.author_handle}` : "Instagram save";
  if (placesCount > 0) {
    const spot = post.extracted_places?.[0]?.place_name;
    captionLine = `${placesCount} spot${placesCount === 1 ? "" : "s"}${spot ? ` · ${spot}` : ""}`;
  }

  const hasRealImage = Boolean(post.thumbnail_url && !imgError);

  return (
    <div
      style={{
        position: "relative",
        borderRadius: "var(--wf-radius-card)",
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
          color: "inherit",
          background: "var(--wf-surface)",
          border: "1px solid var(--wf-border)",
          borderRadius: "var(--wf-radius-card)",
          overflow: "hidden",
          boxShadow: "var(--wf-shadow-card)",
          height: "100%",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        className="wf-card-hover"
      >
        {/* 4:5 ratio image container */}
        <div
          style={{
            width: "100%",
            aspectRatio: "4 / 5",
            position: "relative",
            background: "var(--wf-surface-2)",
            overflow: "hidden",
          }}
        >
          {hasRealImage ? (
            <img
              src={proxiedMediaUrl(post.thumbnail_url!) || ""}
              alt={displayTitle}
              onError={() => setImgError(true)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
              loading="lazy"
            />
          ) : (
            /* Neutral surface-2 tile with category icon fallback per spec (NEVER gradient) */
            <div
              className="wf-neutral-tile"
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
              <Icon size={28} strokeWidth={1.75} color={dot} />
              <span style={{ fontSize: "12px", color: "var(--wf-text-muted)", fontWeight: 500 }}>
                {label}
              </span>
            </div>
          )}

          {/* Category pill top-left with accent dot */}
          <div
            style={{
              position: "absolute",
              left: "10px",
              top: "10px",
              fontSize: "12px",
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "var(--wf-radius-pill)",
              background: "rgba(255, 255, 255, 0.92)",
              color: "#14161A",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
              zIndex: 2,
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: dot,
                flexShrink: 0,
              }}
            />
            {label}
          </div>
        </div>

        {/* Text info */}
        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              lineHeight: "20px",
              color: "var(--wf-text)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {displayTitle}
          </div>
          <div
            style={{
              fontSize: "13px",
              lineHeight: "18px",
              color: "var(--wf-text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {captionLine}
          </div>
        </div>
      </Link>

      {/* Menu button (⋯) with 44px tap target */}
      <button
        type="button"
        aria-label="Save options"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen((prev) => !prev);
        }}
        style={{
          position: "absolute",
          top: "6px",
          right: "6px",
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "transparent",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 5,
        }}
      >
        <span
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(4px)",
            border: "1px solid rgba(0, 0, 0, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#14161A",
            boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
          }}
        >
          <MoreHorizontal size={18} strokeWidth={1.75} />
        </span>
      </button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: "52px",
            right: "8px",
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-border)",
            borderRadius: "var(--wf-radius-control)",
            boxShadow: "var(--wf-shadow-elevated)",
            zIndex: 10,
            minWidth: "170px",
            overflow: "hidden",
            padding: "4px",
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {onAddToCollection && (
            <button
              type="button"
              className="wf-menu-item"
              onClick={() => {
                setMenuOpen(false);
                onAddToCollection(post);
              }}
            >
              <FolderPlus size={16} strokeWidth={1.75} />
              <span>Add to collection</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              className="wf-menu-item"
              onClick={() => {
                setMenuOpen(false);
                onEdit(post);
              }}
            >
              <Edit3 size={16} strokeWidth={1.75} />
              <span>Edit save</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              className="wf-menu-item wf-menu-item-danger"
              onClick={() => {
                setMenuOpen(false);
                onDelete(post);
              }}
            >
              <Trash2 size={16} strokeWidth={1.75} />
              <span>Delete save</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
