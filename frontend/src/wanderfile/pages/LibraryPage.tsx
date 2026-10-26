import { useMemo, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, ArrowUpDown, Plus } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SkeletonGrid } from "../components/SkeletonCard";
import { PostCard } from "../components/PostCard";
import { OptimisticSaveCard } from "../components/OptimisticSaveCard";
import { EditPostModal } from "../components/EditPostModal";
import { useSavePipeline } from "../state/SavePipelineContext";
import { useToast } from "../state/ToastContext";
import { deletePost, parsePostId, type SavedPost } from "../../api";

interface LibraryPageProps {
  posts: SavedPost[];
  loading: boolean;
  onRefresh?: () => void;
}

type SortOrder = "recent" | "alpha";

export function LibraryPage({ posts, loading, onRefresh }: LibraryPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSaveSheet, inFlightSaves, retryFailedLink, removeFailedLink } = useSavePipeline();
  const { showToast } = useToast();
  const [editingPost, setEditingPost] = useState<SavedPost | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");

  // Soft deleted posts awaiting the 5s undo expiration
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const activeCategory = searchParams.get("category") || "all";
  const searchQuery = searchParams.get("q") || "";

  // Available posts excluding pending deletes
  const availablePosts = useMemo(() => {
    return posts.filter((p) => !pendingDeleteIds.has(p.post_id));
  }, [posts, pendingDeleteIds]);

  // Compute category counts
  const counts = useMemo(() => {
    const c: Record<string, number> = {
      all: availablePosts.length,
      travel: 0,
      food: 0,
      movies: 0,
      fashion: 0,
      hairstyle: 0,
      other: 0,
    };
    for (const p of availablePosts) {
      const cat = p.content_category || "other";
      if (cat in c) c[cat]++;
      else c.other++;
    }
    return c;
  }, [availablePosts]);

  const categories = [
    { key: "all", label: "All", count: counts.all, dot: null },
    { key: "travel", label: "Places", count: counts.travel, dot: "var(--wf-cat-place)" },
    { key: "food", label: "Food", count: counts.food, dot: "var(--wf-cat-food)" },
    { key: "movies", label: "Watch", count: counts.movies, dot: "var(--wf-cat-watch)" },
    { key: "fashion", label: "Fashion", count: counts.fashion, dot: "var(--wf-cat-fashion)" },
    { key: "hairstyle", label: "Hair", count: counts.hairstyle, dot: "var(--wf-cat-hair)" },
  ];

  // Soft delete with 5-second Undo toast
  const handleDeletePost = (postToDelete: SavedPost) => {
    const postId = postToDelete.post_id;
    // Mark pending delete optimistically
    setPendingDeleteIds((prev) => new Set(prev).add(postId));

    const commitTimer = setTimeout(async () => {
      try {
        const { platform, nativeId } = parsePostId(postId);
        await deletePost(platform, nativeId);
        onRefresh?.();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to delete post");
        // Revert on error
        setPendingDeleteIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } finally {
        deleteTimers.current.delete(postId);
      }
    }, 5000);

    deleteTimers.current.set(postId, commitTimer);

    showToast(
      "Deleted",
      {
        label: "Undo",
        onClick: () => {
          const timer = deleteTimers.current.get(postId);
          if (timer) {
            clearTimeout(timer);
            deleteTimers.current.delete(postId);
          }
          setPendingDeleteIds((prev) => {
            const next = new Set(prev);
            next.delete(postId);
            return next;
          });
        },
      },
      5000
    );
  };

  const filteredPosts = useMemo(() => {
    let list = availablePosts.filter((post) => {
      if (activeCategory !== "all") {
        if (post.content_category !== activeCategory) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = (post.title || "").toLowerCase();
        const caption = (post.caption || "").toLowerCase();
        const author = (post.author_handle || "").toLowerCase();
        const hashtags = (post.hashtags || []).join(" ").toLowerCase();
        if (
          !title.includes(query) &&
          !caption.includes(query) &&
          !author.includes(query) &&
          !hashtags.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });

    if (sortOrder === "alpha") {
      list = [...list].sort((a, b) => {
        const titleA = (a.title || a.caption || "").toLowerCase();
        const titleB = (b.title || b.caption || "").toLowerCase();
        return titleA.localeCompare(titleB);
      });
    } else {
      // Recent sort: preserve backend order (newest first) or sort by fetched_at / posted_at
      list = [...list].sort((a, b) => {
        const timeA = a.fetched_at || a.posted_at || "";
        const timeB = b.fetched_at || b.posted_at || "";
        return timeB.localeCompare(timeA);
      });
    }

    return list;
  }, [availablePosts, activeCategory, searchQuery, sortOrder]);

  if (loading && posts.length === 0) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 16px 80px", width: "100%", boxSizing: "border-box" }}>
        <SkeletonGrid count={8} />
      </main>
    );
  }

  const hasNoSavesAtAll = availablePosts.length === 0;
  const hasNoMatches = !hasNoSavesAtAll && filteredPosts.length === 0;

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
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1 className="wf-type-display" style={{ margin: 0, color: "var(--wf-text)" }}>
            Library
          </h1>
          <p className="wf-type-callout" style={{ margin: "4px 0 0", color: "var(--wf-text-muted)" }}>
            {filteredPosts.length} save{filteredPosts.length === 1 ? "" : "s"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openSaveSheet()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--wf-primary)",
            color: "var(--wf-on-primary)",
            border: "none",
            borderRadius: "var(--wf-radius-control)",
            padding: "0 18px",
            height: "44px",
            fontFamily: "inherit",
            fontSize: "15px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <Plus size={18} strokeWidth={2} />
          <span>Save reel</span>
        </button>
      </div>

      {/* Sticky Filter Bar */}
      <div
        style={{
          position: "sticky",
          top: "69px",
          zIndex: 30,
          background: "var(--wf-bg)",
          padding: "12px 0 16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          transition: "background-color 0.2s ease",
        }}
      >
        {/* Filter Chips with counts & accent dots */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            paddingBottom: "4px",
          }}
        >
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
                  height: "44px",
                  padding: "0 16px",
                  borderRadius: "var(--wf-radius-pill)",
                  fontFamily: "inherit",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isSelected ? "1px solid var(--wf-text)" : "1px solid var(--wf-border)",
                  background: isSelected ? "var(--wf-text)" : "var(--wf-surface)",
                  color: isSelected ? "var(--wf-bg)" : "var(--wf-text)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  transition: "all 0.15s ease",
                }}
              >
                {c.dot && (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: c.dot,
                      flexShrink: 0,
                    }}
                  />
                )}
                <span>{c.label}</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 700,
                    opacity: isSelected ? 0.9 : 0.6,
                  }}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              position: "relative",
              flex: "1 1 260px",
              maxWidth: "400px",
            }}
          >
            <Search
              size={18}
              strokeWidth={1.75}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--wf-text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search saves, places, notes…"
              value={searchQuery}
              onChange={(e) => {
                const next = new URLSearchParams(searchParams);
                if (e.target.value.trim()) {
                  next.set("q", e.target.value);
                } else {
                  next.delete("q");
                }
                setSearchParams(next);
              }}
              style={{
                width: "100%",
                height: "44px",
                padding: "0 14px 0 42px",
                borderRadius: "var(--wf-radius-control)",
                border: "1px solid var(--wf-border)",
                background: "var(--wf-surface)",
                color: "var(--wf-text)",
                fontSize: "15px",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <ArrowUpDown size={16} strokeWidth={1.75} style={{ color: "var(--wf-text-muted)" }} />
            <select
              aria-label="Sort order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              style={{
                height: "44px",
                padding: "0 12px",
                borderRadius: "var(--wf-radius-control)",
                border: "1px solid var(--wf-border)",
                background: "var(--wf-surface)",
                color: "var(--wf-text)",
                fontSize: "14px",
                fontFamily: "inherit",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <option value="recent">Recent</option>
              <option value="alpha">A–Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Grid or Empty States */}
      {hasNoSavesAtAll && inFlightSaves.length === 0 ? (
        <EmptyState
          screenLabel="Library, no saves yet"
          headline="Nothing saved yet"
          description="Paste an Instagram reel to start building your library."
          primaryActionLabel="Paste a reel"
          onPrimaryAction={() => openSaveSheet()}
          iconPath="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
          tint="var(--wf-surface-2)"
          ink="var(--wf-text)"
        />
      ) : hasNoMatches && inFlightSaves.length === 0 ? (
        <EmptyState
          screenLabel="Library, filters match nothing"
          headline="No matches found"
          description="Try removing your search query or picking another category filter."
          primaryActionLabel="Clear filters"
          onPrimaryAction={() => setSearchParams({})}
          iconPath="M4 5h16l-6 8v6l-4-2v-4z"
          tint="var(--wf-surface-2)"
          ink="var(--wf-text)"
        />
      ) : (
        <div className="wf-responsive-grid">
          {inFlightSaves.map((save) => (
            <OptimisticSaveCard
              key={save.id}
              save={save}
              onRetry={() => retryFailedLink(save.url)}
              onRemove={() => removeFailedLink(save.url)}
            />
          ))}
          {filteredPosts.map((post) => (
            <PostCard
              key={post.post_id}
              post={post}
              onEdit={setEditingPost}
              onDelete={handleDeletePost}
            />
          ))}
        </div>
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostModal
          isOpen={!!editingPost}
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={() => {
            setEditingPost(null);
            onRefresh?.();
          }}
        />
      )}
    </main>
  );
}
