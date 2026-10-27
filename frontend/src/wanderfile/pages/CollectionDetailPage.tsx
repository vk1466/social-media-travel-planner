import { useParams, Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { useSavePipeline } from "../state/SavePipelineContext";
import type { SavedPost } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";

interface CollectionDetailPageProps {
  posts: SavedPost[];
}

export function CollectionDetailPage({ posts }: CollectionDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const { openSaveSheet } = useSavePipeline();

  const isRecipes = id === "recipes" || id === "food";
  const isWatch = id === "watch" || id === "movies";

  const collectionTitle = isRecipes ? "Recipes" : isWatch ? "Watch" : id ? id.charAt(0).toUpperCase() + id.slice(1) : "Collection";
  const kitLabel = isRecipes ? "Recipe kit" : isWatch ? "Watch kit" : "Collection";

  const matchingPosts = posts.filter((p) => {
    if (isRecipes) return p.content_category === "food";
    if (isWatch) return p.content_category === "movies";
    return true;
  });

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
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B6F73" }}>
            {kitLabel}
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: "40px", letterSpacing: "-0.03em", fontWeight: 800 }}>
            {collectionTitle}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => openSaveSheet()}
          style={{
            height: "44px",
            padding: "0 20px",
            borderRadius: "999px",
            border: 0,
            background: "#1B1D1F",
            color: "#FFFFFF",
            fontFamily: "inherit",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Paste a link
        </button>
      </div>

      {matchingPosts.length === 0 ? (
        <EmptyState
          screenLabel="Collection page, empty"
          headline="This collection is empty"
          description="Move saves here from your library, or paste a new link."
          primaryActionLabel="Paste a link"
          onPrimaryAction={() => openSaveSheet()}
          secondaryActionLabel="Explore Library"
          onSecondaryAction={() => {}}
          iconPath="M7 3h8l4 4v14H7zM15 3v4h4"
          tint={isRecipes ? "#FBEBDD" : "#ECE8F7"}
          ink={isRecipes ? "#9A4513" : "#4B3C8C"}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "24px",
          }}
        >
          {matchingPosts.map((post) => (
            <Link
              key={post.post_id}
              to={`/post/${post.post_id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                textDecoration: "none",
                color: "#1B1D1F",
                background: "#FFFFFF",
                border: "1px solid #E6E3DC",
                borderRadius: "24px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "200px",
                  background: "var(--wf-surface-2, #E8E6DF)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--wf-text-muted)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <span style={{ fontSize: "28px" }}>📌</span>
                {post.thumbnail_url ? (
                  <img
                    src={proxiedMediaUrl(post.thumbnail_url) || post.thumbnail_url}
                    alt={post.caption || "Saved post"}
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
              </div>
              <div style={{ padding: "16px" }}>
                <div style={{ fontSize: "16px", fontWeight: 700, lineHeight: 1.35 }}>
                  {post.caption || "Saved post"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
