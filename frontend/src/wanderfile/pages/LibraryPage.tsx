import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { SkeletonGrid } from "../components/SkeletonCard";
import { PostCard } from "../components/PostCard";
import { EditPostModal } from "../components/EditPostModal";
import { useSavePipeline } from "../state/SavePipelineContext";
import { deletePost, parsePostId, type SavedPost } from "../../api";

interface LibraryPageProps {
  posts: SavedPost[];
  loading: boolean;
  onRefresh?: () => void;
}

export function LibraryPage({ posts, loading, onRefresh }: LibraryPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSaveSheet } = useSavePipeline();
  const [editingPost, setEditingPost] = useState<SavedPost | null>(null);

  const activeCategory = searchParams.get("category") || "all";
  const searchQuery = searchParams.get("q") || "";

  const handleDeletePost = async (postToDelete: SavedPost) => {
    try {
      const { platform, nativeId } = parsePostId(postToDelete.post_id);
      await deletePost(platform, nativeId);
      onRefresh?.();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete post");
    }
  };

  const categories = [
    { key: "all", label: "All" },
    { key: "travel", label: "Places" },
    { key: "food", label: "Recipes" },
    { key: "movies", label: "Watch" },
    { key: "fashion", label: "Fashion" },
    { key: "hairstyle", label: "Hairstyle" },
    { key: "other", label: "Other" },
  ];

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (activeCategory !== "all") {
        if (post.content_category !== activeCategory) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = (post.title || "").toLowerCase();
        const caption = (post.caption || "").toLowerCase();
        const author = (post.author_handle || "").toLowerCase();
        const hashtags = (post.hashtags || []).join(" ").toLowerCase();
        if (!title.includes(query) && !caption.includes(query) && !author.includes(query) && !hashtags.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [posts, activeCategory, searchQuery]);

  if (loading && posts.length === 0) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "40px 24px 80px", width: "100%", boxSizing: "border-box" }}>
        <SkeletonGrid count={8} />
      </main>
    );
  }

  const hasNoSavesAtAll = posts.length === 0;
  const hasNoMatches = !hasNoSavesAtAll && filteredPosts.length === 0;

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
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "40px", letterSpacing: "-0.03em", fontWeight: 800, color: "#1B1D1F" }}>
          Library
        </h1>
        <span style={{ fontSize: "15px", color: "#6B6F73" }}>{filteredPosts.length} saves</span>
      </div>

      {/* Category filter strip */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "32px" }}>
        {categories.map((c) => {
          const isSelected = activeCategory === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                if (c.key === "all") {
                  next.delete("category");
                } else {
                  next.set("category", c.key);
                }
                setSearchParams(next);
              }}
              style={{
                height: "40px",
                padding: "0 18px",
                borderRadius: "999px",
                fontFamily: "inherit",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                border: isSelected ? "0" : "1px solid #E6E3DC",
                background: isSelected ? "#1B1D1F" : "#FFFFFF",
                color: isSelected ? "#FFFFFF" : "#4A4E52",
                transition: "all 0.15s ease",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {hasNoSavesAtAll ? (
        <EmptyState
          screenLabel="Library, no saves yet"
          headline="Your library starts with one link"
          description="Everything you save lands here, newest first."
          primaryActionLabel="Paste a link"
          onPrimaryAction={() => openSaveSheet()}
          iconPath="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
          tint="#ECECEA"
          ink="#4A4E52"
        />
      ) : hasNoMatches ? (
        <EmptyState
          screenLabel="Library, filters match nothing"
          headline="No saves match these filters"
          description="Try removing a filter or choosing another collection."
          primaryActionLabel="Clear filters"
          onPrimaryAction={() => setSearchParams({})}
          iconPath="M4 5h16l-6 8v6l-4-2v-4z"
          tint="#ECECEA"
          ink="#4A4E52"
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "24px",
          }}
        >
          {filteredPosts.map((post) => (
            <PostCard
              key={post.post_id}
              post={post}
              onEdit={(p) => setEditingPost(p)}
              onDelete={handleDeletePost}
            />
          ))}
        </div>
      )}

      <EditPostModal
        post={editingPost}
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        onSaved={() => onRefresh?.()}
      />
    </main>
  );
}
