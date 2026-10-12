import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { SkeletonGrid } from "../components/SkeletonCard";
import { useSavePipeline } from "../state/SavePipelineContext";
import type { SavedPost } from "../../api";

interface LibraryPageProps {
  posts: SavedPost[];
  loading: boolean;
}

export function LibraryPage({ posts, loading }: LibraryPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSaveSheet } = useSavePipeline();

  const activeCategory = searchParams.get("category") || "all";
  const searchQuery = searchParams.get("q") || "";

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
        const caption = (post.caption || "").toLowerCase();
        const author = (post.author_handle || "").toLowerCase();
        const hashtags = (post.hashtags || []).join(" ").toLowerCase();
        if (!caption.includes(query) && !author.includes(query) && !hashtags.includes(query)) {
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
          {filteredPosts.map((post) => {
            const category = post.content_category || "other";
            const catLabels: Record<string, { label: string; bg: string; ink: string }> = {
              travel: { label: "Place", bg: "#E3F0F4", ink: "#1B5E78" },
              food: { label: "Recipe", bg: "#FBEBDD", ink: "#9A4513" },
              movies: { label: "Title", bg: "#ECE8F7", ink: "#4B3C8C" },
              other: { label: "Other", bg: "#ECECEA", ink: "#4A4E52" },
            };
            const tag = catLabels[category] || catLabels.other;

            return (
              <Link
                key={post.post_id}
                to={post.place_ids && post.place_ids.length > 0 ? `/place/${post.place_ids[0]}` : `/post/${post.post_id}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  textDecoration: "none",
                  color: "#1B1D1F",
                  background: "#FFFFFF",
                  border: "1px solid #E6E3DC",
                  borderRadius: "24px",
                  overflow: "hidden",
                  transition: "transform 0.15s ease",
                }}
              >
                <div
                  style={{
                    height: "220px",
                    position: "relative",
                    background: post.thumbnail_url
                      ? `url(${post.thumbnail_url}) center/cover no-repeat`
                      : "linear-gradient(160deg, #8CC3D6, #2D6A82)",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "12px",
                      fontSize: "12px",
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: "999px",
                      background: tag.bg,
                      color: tag.ink,
                    }}
                  >
                    {tag.label}
                  </span>
                </div>
                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
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
                    {post.caption || "Saved post"}
                  </div>
                  <div style={{ fontSize: "13px", color: "#6B6F73" }}>
                    {post.author_handle ? `@${post.author_handle}` : "Instagram reel"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
