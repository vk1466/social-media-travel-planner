import { useState, useEffect } from "react";
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
import { deletePost, parsePostId, fetchPost, type SavedPost, type Place } from "../../api";
import { proxiedMediaUrl, capitalizePlaceName, getPlaceBestImageUrl } from "../../postDisplayUtils";
import { getCategoryVisual } from "../categoryVisuals";

interface PostDetailPageProps {
  posts: SavedPost[];
  places?: Place[];
  onRefresh?: () => void;
}

export function PostDetailPage({ posts, places = [], onRefresh }: PostDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const foundPost = posts.find((p) => p.post_id === id);
  const [fetchedPost, setFetchedPost] = useState<SavedPost | null>(null);
  const [fetching, setFetching] = useState<boolean>(!foundPost);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [ocrExpanded, setOcrExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [customPlaces, setCustomPlaces] = useState<string[]>([]);
  const [newPlaceInput, setNewPlaceInput] = useState("");
  const [showAddPlace, setShowAddPlace] = useState(false);

  useEffect(() => {
    if (foundPost) {
      setFetching(false);
      return;
    }
    if (!id) {
      setFetching(false);
      return;
    }
    let cancelled = false;
    setFetching(true);
    try {
      const { platform, nativeId } = parsePostId(id);
      fetchPost(platform, nativeId)
        .then((data) => {
          if (!cancelled && data) {
            setFetchedPost(data);
          }
        })
        .catch(() => {
          // ignore error
        })
        .finally(() => {
          if (!cancelled) setFetching(false);
        });
    } catch {
      setFetching(false);
    }
    return () => {
      cancelled = true;
    };
  }, [id, foundPost]);

  const post = foundPost || fetchedPost;

  if (!post) {
    if (fetching) {
      return (
        <main style={{ maxWidth: "1040px", margin: "0 auto", padding: "24px 20px 80px", width: "100%", boxSizing: "border-box" }}>
          <div style={{ height: "24px", width: "120px", background: "var(--wf-surface-2, #F3F3F1)", borderRadius: "8px", marginBottom: "20px" }} />
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "32px" }}>
            <div style={{ width: "320px", height: "320px", background: "var(--wf-surface-2, #F3F3F1)", borderRadius: "16px" }} />
            <div style={{ flex: 1, minWidth: "260px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ height: "32px", width: "70%", background: "var(--wf-surface-2, #F3F3F1)", borderRadius: "8px" }} />
              <div style={{ height: "18px", width: "40%", background: "var(--wf-surface-2, #F3F3F1)", borderRadius: "8px" }} />
              <div style={{ height: "80px", width: "100%", background: "var(--wf-surface-2, #F3F3F1)", borderRadius: "8px", marginTop: "12px" }} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ height: "64px", background: "var(--wf-surface-2, #F3F3F1)", borderRadius: "12px" }} />
            ))}
          </div>
        </main>
      );
    }
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

  const currentPost = post;

  // Delete with 5s Undo Toast (no window.confirm dialog per spec)
  const handleDelete = () => {
    const postId = currentPost.post_id;
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

  const category = currentPost.content_category || "other";

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
  const displayTitle = currentPost.title || currentPost.caption || "Saved reel";
  const hasThumbnail = Boolean(currentPost.thumbnail_url && !imgError);

  const canonicalPlaceIds = currentPost.place_ids || [];
  const canonicalPlaces = canonicalPlaceIds.map((pid) => {
    const pl = (places || []).find((p) => p.place_id === pid);
    const vis = getCategoryVisual(pl?.category);
    const img = pl ? getPlaceBestImageUrl(pl, posts) : null;
    return {
      placeId: pid,
      name: pl ? capitalizePlaceName(pl.display_name) : pid,
      area: pl ? [pl.location?.city, pl.location?.state_province, pl.location?.country].filter(Boolean).join(", ") : "",
      category: pl?.category || null,
      visual: vis,
      imageUrl: img,
      isCanonical: true,
      link: `/place/${pid}`,
    };
  });

  // Fallback for extracted places not covered in canonical place_ids
  const unmappedExtracted = (currentPost.extracted_places || [])
    .filter((_, idx) => !currentPost.place_ids?.[idx] && canonicalPlaces.length === 0)
    .map((p) => ({
      placeId: null,
      name: capitalizePlaceName(p.place_name),
      area: [p.city, p.state_province, p.country].filter(Boolean).join(", ") || p.tips?.[0] || "",
      category: p.category || null,
      visual: getCategoryVisual(p.category || "other"),
      imageUrl: null,
      isCanonical: false,
      link: null,
    }));

  const customList = customPlaces.map((name) => ({
    placeId: null,
    name,
    area: "Custom spot",
    category: null,
    visual: getCategoryVisual("other"),
    imageUrl: null,
    isCanonical: false,
    link: null,
  }));

  const resolvedPlaces = [...canonicalPlaces, ...unmappedExtracted, ...customList];

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
              Places in this save ({resolvedPlaces.length})
            </h2>
            {Boolean(post.expected_place_count) && (
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "999px",
                  background: resolvedPlaces.length >= post.expected_place_count!
                    ? "rgba(16, 185, 129, 0.12)"
                    : "rgba(234, 88, 12, 0.15)",
                  color: resolvedPlaces.length >= post.expected_place_count!
                    ? "#059669"
                    : "#ea580c",
                  border: resolvedPlaces.length >= post.expected_place_count!
                    ? "1px solid rgba(16, 185, 129, 0.3)"
                    : "1px solid rgba(234, 88, 12, 0.3)",
                }}
              >
                {resolvedPlaces.length} of {post.expected_place_count} places found
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

        {resolvedPlaces.length === 0 ? (
          <p style={{ color: "var(--wf-text-muted)", fontSize: "14px", margin: 0 }}>
            No specific places detected in this save yet.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {resolvedPlaces.map((item, idx) => {
              const thumbUrl = item.imageUrl ? proxiedMediaUrl(item.imageUrl) : null;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: "var(--wf-radius-control)",
                    background: "var(--wf-surface-2)",
                    border: "1px solid var(--wf-border)",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    {thumbUrl ? (
                      <img
                        src={thumbUrl}
                        alt={item.name}
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "10px",
                          objectFit: "cover",
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "10px",
                          background: item.visual.tint,
                          color: item.visual.hue,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "20px",
                          flexShrink: 0,
                        }}
                      >
                        {item.visual.glyph}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--wf-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.link ? (
                            <Link to={item.link} style={{ color: "inherit", textDecoration: "none" }} className="wf-hover-underline">
                              {item.name}
                            </Link>
                          ) : (
                            item.name
                          )}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            background: item.visual.tint,
                            color: item.visual.hue,
                            flexShrink: 0,
                          }}
                        >
                          <span>{item.visual.glyph}</span>
                          <span>{item.visual.name}</span>
                        </span>
                      </div>
                      {item.area && (
                        <div style={{ fontSize: "13px", color: "var(--wf-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                          {item.area}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {item.link && (
                      <Link
                        to={item.link}
                        style={{
                          height: "36px",
                          padding: "0 12px",
                          borderRadius: "var(--wf-radius-pill)",
                          background: "var(--wf-surface)",
                          border: "1px solid var(--wf-border)",
                          color: "var(--wf-primary)",
                          fontSize: "13px",
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span>Details</span>
                      </Link>
                    )}
                    <Link
                      to={item.placeId ? `/map?selected=${item.placeId}` : "/map"}
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
                </div>
              );
            })}
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
