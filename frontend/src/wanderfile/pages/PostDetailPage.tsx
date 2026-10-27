import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronUp,
  Plus,
  Bookmark,
  Utensils,
  Film,
  Sparkles,
  Scissors,
} from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { EditPostModal } from "../components/EditPostModal";
import { useToast } from "../state/ToastContext";
import { deletePost, parsePostId, type SavedPost } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";

interface PostDetailPageProps {
  posts: SavedPost[];
  onRefresh?: () => void;
}

export function PostDetailPage({ posts, onRefresh }: PostDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const post = posts.find((p) => p.post_id === id);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [ocrExpanded, setOcrExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [customPlaces, setCustomPlaces] = useState<string[]>([]);
  const [newPlaceInput, setNewPlaceInput] = useState("");
  const [showAddPlace, setShowAddPlace] = useState(false);

  if (!post) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "60px 16px 80px", width: "100%", boxSizing: "border-box" }}>
        <EmptyState
          screenLabel="Post detail"
          headline="Post not found"
          description="This post is not in your saved library."
          primaryActionLabel="Back to Library"
          onPrimaryAction={() => navigate("/library")}
          iconPath="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5h-2v-2h2zm0-4.5h-2V7h2z"
        />
      </main>
    );
  }

  // Delete with 5s Undo Toast (no window.confirm dialog per spec)
  const handleDelete = () => {
    const postId = post.post_id;
    navigate("/library");

    let undone = false;
    const timer = setTimeout(async () => {
      if (!undone) {
        try {
          const { platform, nativeId } = parsePostId(postId);
          await deletePost(platform, nativeId);
          onRefresh?.();
        } catch {
          // silently handle or toast
        }
      }
    }, 5000);

    showToast(
      "Deleted",
      {
        label: "Undo",
        onClick: () => {
          undone = true;
          clearTimeout(timer);
          navigate(`/post/${postId}`);
        },
      },
      5000
    );
  };

  const category = post.content_category || "other";

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "travel":
        return MapPin;
      case "food":
        return Utensils;
      case "movies":
        return Film;
      case "fashion":
        return Sparkles;
      case "hairstyle":
        return Scissors;
      default:
        return Bookmark;
    }
  };

  const CategoryIcon = getCategoryIcon(category);
  const displayTitle = post.title || post.caption || "Saved reel";
  const hasThumbnail = Boolean(post.thumbnail_url && !imgError);

  const extractedPlaces = [
    ...(post.extracted_places || []).map((p) => ({
      name: p.place_name,
      area: [p.city, p.state_province, p.country].filter(Boolean).join(", ") || p.tips?.[0] || "",
    })),
    ...customPlaces.map((name) => ({ name, area: "Custom spot" })),
  ];

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "32px 16px 80px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Back button */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          to="/library"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--wf-text-muted)",
            textDecoration: "none",
            minHeight: "44px",
          }}
        >
          <ArrowLeft size={18} strokeWidth={2} />
          <span>Back to Library</span>
        </Link>
      </div>

      {/* Hero card */}
      <section
        style={{
          background: "var(--wf-surface)",
          color: "var(--wf-text)",
          border: "1px solid var(--wf-border)",
          borderRadius: "var(--wf-radius-card)",
          padding: "24px",
          display: "flex",
          gap: "24px",
          flexWrap: "wrap",
          marginBottom: "28px",
          boxShadow: "var(--wf-shadow-card)",
        }}
      >
        {/* 4:5 Thumbnail or Neutral Tile */}
        <div
          style={{
            width: "220px",
            aspectRatio: "4 / 5",
            borderRadius: "var(--wf-radius-control)",
            background: "var(--wf-surface-2)",
            border: "1px solid var(--wf-border)",
            overflow: "hidden",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {hasThumbnail ? (
            <img
              src={proxiedMediaUrl(post.thumbnail_url!) || ""}
              alt={displayTitle}
              onError={() => setImgError(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div className="wf-neutral-tile" style={{ width: "100%", height: "100%" }}>
              <CategoryIcon size={36} strokeWidth={1.75} color="var(--wf-primary)" />
            </div>
          )}
        </div>

        {/* Title, Author, Actions */}
        <div style={{ flex: 1, minWidth: "260px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: "var(--wf-radius-pill)",
                  background: "var(--wf-surface-2)",
                  color: "var(--wf-text)",
                  textTransform: "capitalize",
                }}
              >
                {category}
              </span>
              {post.author_handle && (
                <span style={{ fontSize: "14px", color: "var(--wf-text-muted)", fontWeight: 500 }}>
                  @{post.author_handle.replace(/^@/, "")}
                </span>
              )}
              {post.like_count != null && (
                <span style={{ fontSize: "13px", color: "var(--wf-text-muted)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span>♥</span> {post.like_count.toLocaleString()}
                </span>
              )}
              {post.comment_count != null && (
                <span style={{ fontSize: "13px", color: "var(--wf-text-muted)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <span>💬</span> {post.comment_count.toLocaleString()}
                </span>
              )}
            </div>

            <h1 className="wf-type-h1" style={{ margin: "0 0 12px", color: "var(--wf-text)" }}>
              {displayTitle}
            </h1>

            {/* Open in Instagram Link */}
            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--wf-primary)",
                  textDecoration: "none",
                  marginTop: "4px",
                  minHeight: "44px",
                }}
              >
                <ExternalLink size={16} strokeWidth={2} />
                <span>Open in Instagram</span>
              </a>
            )}
          </div>

          {/* Action Row */}
          <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              style={{
                height: "44px",
                padding: "0 18px",
                borderRadius: "var(--wf-radius-pill)",
                border: "1px solid var(--wf-border)",
                background: "var(--wf-surface)",
                color: "var(--wf-text)",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Edit3 size={16} strokeWidth={1.75} />
              <span>Edit save</span>
            </button>

            <button
              type="button"
              onClick={handleDelete}
              style={{
                height: "44px",
                padding: "0 18px",
                borderRadius: "var(--wf-radius-pill)",
                border: "1px solid var(--wf-danger)",
                background: "transparent",
                color: "var(--wf-danger)",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Trash2 size={16} strokeWidth={1.75} />
              <span>Delete save</span>
            </button>
          </div>
        </div>
      </section>

      {/* Extracted Places Section */}
      <section
        style={{
          background: "var(--wf-surface)",
          border: "1px solid var(--wf-border)",
          borderRadius: "var(--wf-radius-card)",
          padding: "24px",
          marginBottom: "24px",
          boxShadow: "var(--wf-shadow-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h2 className="wf-type-h2" style={{ margin: 0 }}>
              Extracted places ({extractedPlaces.length})
            </h2>
            {Boolean(post.expected_place_count) && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: extractedPlaces.length >= post.expected_place_count!
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(234, 88, 12, 0.15)",
                  color: extractedPlaces.length >= post.expected_place_count!
                    ? "#059669"
                    : "#ea580c",
                  border: extractedPlaces.length >= post.expected_place_count!
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : "1px solid rgba(234, 88, 12, 0.3)",
                }}
              >
                {extractedPlaces.length} of {post.expected_place_count} places found
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAddPlace((prev) => !prev)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--wf-primary)",
              fontWeight: 600,
              fontSize: "14px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              minHeight: "44px",
            }}
          >
            <Plus size={16} strokeWidth={2} />
            <span>Add missing place</span>
          </button>
        </div>

        {showAddPlace && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <input
              type="text"
              placeholder="Enter spot name…"
              value={newPlaceInput}
              onChange={(e) => setNewPlaceInput(e.target.value)}
              style={{
                flex: 1,
                height: "44px",
                padding: "0 14px",
                borderRadius: "var(--wf-radius-control)",
                border: "1px solid var(--wf-border)",
                background: "var(--wf-surface-2)",
                color: "var(--wf-text)",
                fontSize: "14px",
                fontFamily: "inherit",
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (newPlaceInput.trim()) {
                  setCustomPlaces((prev) => [...prev, newPlaceInput.trim()]);
                  setNewPlaceInput("");
                  setShowAddPlace(false);
                  showToast("Place added");
                }
              }}
              style={{
                height: "44px",
                padding: "0 18px",
                borderRadius: "var(--wf-radius-control)",
                border: "none",
                background: "var(--wf-primary)",
                color: "var(--wf-on-primary)",
                fontWeight: 600,
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Add
            </button>
          </div>
        )}

        {extractedPlaces.length === 0 ? (
          <p style={{ color: "var(--wf-text-muted)", fontSize: "14px", margin: 0 }}>
            No specific places detected in this save yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {extractedPlaces.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "var(--wf-radius-control)",
                  background: "var(--wf-surface-2)",
                  border: "1px solid var(--wf-border)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <MapPin size={18} strokeWidth={1.75} color="var(--wf-primary)" />
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--wf-text)" }}>
                      {item.name}
                    </div>
                    {item.area && (
                      <div style={{ fontSize: "13px", color: "var(--wf-text-muted)" }}>
                        {item.area}
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  to="/map"
                  style={{
                    height: "36px",
                    padding: "0 12px",
                    borderRadius: "var(--wf-radius-pill)",
                    background: "var(--wf-surface)",
                    border: "1px solid var(--wf-border)",
                    color: "var(--wf-text)",
                    fontSize: "13px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>Map</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trip Tips Section */}
      {post.trip_tips && post.trip_tips.length > 0 && (
        <section
          style={{
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-border)",
            borderRadius: "var(--wf-radius-card)",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "var(--wf-shadow-card)",
          }}
        >
          <h2 className="wf-type-h2" style={{ margin: "0 0 16px" }}>
            Trip Tips ({post.trip_tips.length})
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {post.trip_tips.map((tip, idx) => (
              <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "baseline" }}>
                <span style={{ color: "var(--wf-primary)", fontWeight: 700 }}>•</span>
                <span style={{ fontSize: "15px", lineHeight: "22px", color: "var(--wf-text)" }}>{tip}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top Comments Section */}
      {post.top_comments && post.top_comments.length > 0 && (
        <section
          style={{
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-border)",
            borderRadius: "var(--wf-radius-card)",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "var(--wf-shadow-card)",
          }}
        >
          <h2 className="wf-type-h2" style={{ margin: "0 0 16px" }}>
            Top Comments
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {post.top_comments.map((comment, idx) => (
              <div
                key={idx}
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--wf-radius-control)",
                  background: "var(--wf-surface-2)",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "var(--wf-text)",
                  fontStyle: "italic",
                }}
              >
                "{comment}"
              </div>
            ))}
          </div>
        </section>
      )}

      {/* On-screen Text (OCR) Section */}
      {post.image_text && (
        <section
          style={{
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-border)",
            borderRadius: "var(--wf-radius-card)",
            padding: "20px",
            marginBottom: "24px",
            boxShadow: "var(--wf-shadow-card)",
          }}
        >
          <button
            type="button"
            onClick={() => setOcrExpanded((prev) => !prev)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              padding: 0,
              minHeight: "44px",
            }}
          >
            <h2 className="wf-type-h2" style={{ margin: 0, fontSize: "17px" }}>
              On-screen Text (OCR)
            </h2>
            {ocrExpanded ? (
              <ChevronUp size={20} color="var(--wf-text-muted)" />
            ) : (
              <ChevronDown size={20} color="var(--wf-text-muted)" />
            )}
          </button>
          {ocrExpanded && (
            <p
              style={{
                marginTop: "12px",
                fontSize: "13px",
                lineHeight: "20px",
                color: "var(--wf-text-muted)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {post.image_text}
            </p>
          )}
        </section>
      )}

      {/* Collapsible Caption Section */}
      {post.caption && (
        <section
          style={{
            background: "var(--wf-surface)",
            border: "1px solid var(--wf-border)",
            borderRadius: "var(--wf-radius-card)",
            padding: "20px",
            boxShadow: "var(--wf-shadow-card)",
          }}
        >
          <button
            type="button"
            onClick={() => setCaptionExpanded((prev) => !prev)}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              padding: 0,
              minHeight: "44px",
            }}
          >
            <h2 className="wf-type-h2" style={{ margin: 0, fontSize: "17px" }}>
              Caption
            </h2>
            {captionExpanded ? (
              <ChevronUp size={20} color="var(--wf-text-muted)" />
            ) : (
              <ChevronDown size={20} color="var(--wf-text-muted)" />
            )}
          </button>

          {captionExpanded && (
            <p
              style={{
                marginTop: "12px",
                fontSize: "14px",
                lineHeight: "22px",
                color: "var(--wf-body-tinted)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {post.caption}
            </p>
          )}
        </section>
      )}

      {/* Edit Post Modal */}
      {isEditModalOpen && (
        <EditPostModal
          isOpen={isEditModalOpen}
          post={post}
          onClose={() => setIsEditModalOpen(false)}
          onSaved={() => {
            setIsEditModalOpen(false);
            onRefresh?.();
          }}
        />
      )}
    </main>
  );
}
