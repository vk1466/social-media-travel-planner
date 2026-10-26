import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ComingSoonButton } from "../comingSoon/ComingSoonControl";
import { EditPostModal } from "../components/EditPostModal";
import { deletePost, parsePostId, type SavedPost } from "../../api";

interface PostDetailPageProps {
  posts: SavedPost[];
  onRefresh?: () => void;
}

export function PostDetailPage({ posts, onRefresh }: PostDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const post = posts.find((p) => p.post_id === id);

  const [servings, setServings] = useState(4);
  const [cooked, setCooked] = useState(false);
  const [watched, setWatched] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!post) return;
    if (!window.confirm("Are you sure you want to delete this save?")) return;
    setDeleting(true);
    try {
      const { platform, nativeId } = parsePostId(post.post_id);
      await deletePost(platform, nativeId);
      onRefresh?.();
      navigate("/library");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete post");
      setDeleting(false);
    }
  };

  if (!post) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "60px 24px 80px", width: "100%", boxSizing: "border-box" }}>
        <EmptyState
          screenLabel="Post detail"
          headline="Post not found"
          description="This post is not in your saved library."
          primaryActionLabel="Back to Library"
          onPrimaryAction={() => {}}
          iconPath="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.5h-2v-2h2zm0-4.5h-2V7h2z"
        />
      </main>
    );
  }

  const category = post.content_category || "other";
  const isRecipe = category === "food";
  const isMovie = category === "movies";

  const heroBg = isMovie
    ? "#17181C"
    : isRecipe
    ? "#FBEBDD"
    : "#FFFFFF";

  const heroColor = isMovie ? "#FFFFFF" : "#1B1D1F";

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "40px 24px 80px",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Figtree', system-ui, sans-serif",
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
            fontWeight: 700,
            color: "#6B6F73",
            textDecoration: "none",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Library
        </Link>
      </div>

      {/* Hero card */}
      <section
        style={{
          background: heroBg,
          color: heroColor,
          border: "1px solid #E6E3DC",
          borderRadius: "28px",
          padding: "36px",
          display: "flex",
          gap: "36px",
          flexWrap: "wrap",
          marginBottom: "36px",
        }}
      >
        <div
          style={{
            width: "220px",
            height: "300px",
            borderRadius: "20px",
            background: post.thumbnail_url
              ? `url(${post.thumbnail_url}) center/cover no-repeat`
              : "linear-gradient(160deg, #8CC3D6, #2D6A82)",
            flexShrink: 0,
          }}
        />

        <div style={{ flex: 1, minWidth: "280px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 800,
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: isMovie ? "rgba(255,255,255,0.15)" : "#ECECEA",
                  color: isMovie ? "#FFFFFF" : "#1B1D1F",
                  textTransform: "uppercase",
                }}
              >
                {category}
              </span>
              {post.author_handle && (
                <span style={{ fontSize: "14px", color: isMovie ? "rgba(255,255,255,0.7)" : "#6B6F73" }}>
                  @{post.author_handle}
                </span>
              )}
            </div>

            <h1 style={{ margin: "0 0 12px", fontSize: "36px", lineHeight: 1.15, fontWeight: 800 }}>
              {post.title || post.caption?.slice(0, 75) || "Saved Post"}
            </h1>

            <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.5, opacity: 0.85 }}>
              {post.caption || "No caption provided."}
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", marginTop: "24px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              style={{
                height: "44px",
                padding: "0 18px",
                borderRadius: "999px",
                border: isMovie ? "1px solid rgba(255,255,255,0.3)" : "1px solid #D9D5CB",
                background: isMovie ? "rgba(255,255,255,0.1)" : "#FFFFFF",
                color: isMovie ? "#FFFFFF" : "#1B1D1F",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Edit save
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                height: "44px",
                padding: "0 18px",
                borderRadius: "999px",
                border: "1px solid #FCA5A5",
                background: isMovie ? "rgba(239,68,68,0.15)" : "#FEF2F2",
                color: "#DC2626",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 700,
                cursor: deleting ? "not-allowed" : "pointer",
                opacity: deleting ? 0.6 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {deleting ? "Deleting..." : "Delete save"}
            </button>

            {isRecipe && (
              <>
                <button
                  type="button"
                  onClick={() => setCooked((c) => !c)}
                  style={{
                    height: "44px",
                    padding: "0 22px",
                    borderRadius: "999px",
                    border: 0,
                    background: cooked ? "#25623A" : "#1B1D1F",
                    color: "#FFFFFF",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {cooked ? "Cooked" : "Mark cooked"}
                </button>
                <ComingSoonButton
                  featureId="cook-mode"
                  style={{
                    height: "44px",
                    padding: "0 18px",
                    borderRadius: "999px",
                    border: "1px solid #D9D5CB",
                    background: "#FFFFFF",
                    color: "#1B1D1F",
                    fontFamily: "inherit",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cook mode
                </ComingSoonButton>
              </>
            )}

            {isMovie && (
              <button
                type="button"
                onClick={() => setWatched((w) => !w)}
                style={{
                  height: "44px",
                  padding: "0 22px",
                  borderRadius: "999px",
                  border: 0,
                  background: watched ? "#25623A" : "#FFFFFF",
                  color: watched ? "#FFFFFF" : "#1B1D1F",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {watched ? "Watched" : "Mark watched"}
              </button>
            )}

            {post.post_url && (
              <a
                href={post.post_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  height: "44px",
                  padding: "0 18px",
                  borderRadius: "999px",
                  border: isMovie ? "1px solid rgba(255,255,255,0.3)" : "1px solid #D9D5CB",
                  background: "transparent",
                  color: isMovie ? "#FFFFFF" : "#1B1D1F",
                  fontSize: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Open on original site
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Two column grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "28px" }}>
        {/* Left Column: Details / Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* Transcript section */}
          <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "24px" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>Transcript</h2>
            {post.transcript ? (
              <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.6, color: "#4A4E52" }}>{post.transcript}</p>
            ) : (
              <div style={{ fontSize: "14px", color: "#6B6F73" }}>No transcript for this reel</div>
            )}
          </section>

          {/* Top Comments */}
          <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "24px" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>Top comments</h2>
            {post.top_comments && post.top_comments.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {post.top_comments.slice(0, 5).map((comment, i) => (
                  <div key={i} style={{ fontSize: "14px", color: "#4A4E52", paddingBottom: "8px", borderBottom: "1px solid #EFEDE7" }}>
                    {comment}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: "14px", color: "#6B6F73" }}>No comments to show</div>
            )}
          </section>
        </div>

        {/* Right Column: Kit specifics or unfiled prompt */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {isRecipe ? (
            <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>Ingredients</h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setServings((s) => Math.max(1, s - 1))}
                    style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid #D9D5CB", background: "#FFFFFF", cursor: "pointer" }}
                  >
                    -
                  </button>
                  <span style={{ fontSize: "14px", fontWeight: 700 }}>{servings} servings</span>
                  <button
                    type="button"
                    onClick={() => setServings((s) => s + 1)}
                    style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid #D9D5CB", background: "#FFFFFF", cursor: "pointer" }}
                  >
                    +
                  </button>
                </div>
              </div>
              <div style={{ fontSize: "14px", color: "#6B6F73" }}>
                Ingredients extracted from caption and on-screen text.
              </div>
              <div style={{ marginTop: "16px" }}>
                <ComingSoonButton
                  featureId="grocery-list"
                  style={{
                    height: "38px",
                    padding: "0 16px",
                    borderRadius: "999px",
                    border: "1px solid #D9D5CB",
                    background: "#FFFFFF",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#1B1D1F",
                    cursor: "pointer",
                  }}
                >
                  Add to grocery list
                </ComingSoonButton>
              </div>
            </section>
          ) : isMovie ? (
            <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "24px" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 800 }}>Catalog match</h2>
              <div style={{ fontSize: "14px", color: "#6B6F73" }}>
                Title extracted and matched with ratings and streaming services.
              </div>
            </section>
          ) : (
            <section
              style={{
                border: "2px dashed #C9C5BA",
                background: "#FBFAF7",
                borderRadius: "24px",
                padding: "24px",
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800 }}>
                No extra details for this category yet
              </h2>
              <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6B6F73", lineHeight: 1.5 }}>
                Fashion, hairstyle and other categories currently keep only what the post gives us.
              </p>
              <Link
                to="/collections"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  height: "38px",
                  padding: "0 16px",
                  borderRadius: "999px",
                  background: "#1B1D1F",
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Make a collection
              </Link>
            </section>
          )}

          {/* Location tag section */}
          <section style={{ background: "#FFFFFF", border: "1px solid #E6E3DC", borderRadius: "24px", padding: "24px" }}>
            <h2 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 800 }}>Location tag</h2>
            {post.places && post.places.length > 0 && post.places[0].place_name ? (
              <div style={{ fontSize: "14px", color: "#1B5E78", fontWeight: 600 }}>
                {post.places[0].place_name}
              </div>
            ) : (
              <div style={{ fontSize: "14px", color: "#6B6F73" }}>No location tag on this post</div>
            )}
          </section>
        </div>
      </div>

      <EditPostModal
        post={post}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSaved={onRefresh}
      />
    </main>
  );
}
