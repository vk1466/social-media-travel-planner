import { useMemo, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, ArrowUpDown, Grid, List as ListIcon } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SkeletonGrid } from "../components/SkeletonCard";
import { ReelCard } from "../components/ReelCard";
import { PlaceCard } from "../components/PlaceCard";
import { OptimisticSaveCard } from "../components/OptimisticSaveCard";
import { EditPostModal } from "../components/EditPostModal";
import { useSavePipeline } from "../state/SavePipelineContext";
import { useToast } from "../state/ToastContext";
import { deletePost, parsePostId, type SavedPost, type Place } from "../../api";
import { proxiedMediaUrl, getPlaceBestImageUrl } from "../../postDisplayUtils";
import { CANONICAL_CATEGORIES, getCategoryVisual } from "../categoryVisuals";

interface LibraryPageProps {
  posts: SavedPost[];
  places?: Place[];
  loading: boolean;
  onRefresh?: () => void;
}

type TabType = "reels" | "places";
type SortOrder = "recent" | "alpha" | "city";

export function LibraryPage({ posts, places = [], loading, onRefresh }: LibraryPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openSaveSheet, inFlightSaves, retryFailedLink, removeFailedLink } = useSavePipeline();
  const { showToast } = useToast();
  const [editingPost, setEditingPost] = useState<SavedPost | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get("tab") as TabType) || "reels"
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>("recent");
  const [placesViewMode, setPlacesViewMode] = useState<"grid" | "list">("grid");

  // Soft deleted posts awaiting the 5s undo expiration
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());
  const deleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const activeCategory = searchParams.get("category") || "all";
  const activeCity = searchParams.get("city") || "all";
  const searchQuery = searchParams.get("q") || "";

  // Available posts excluding pending deletes
  const availablePosts = useMemo(() => {
    return posts.filter((p) => !pendingDeleteIds.has(p.post_id));
  }, [posts, pendingDeleteIds]);

  // Cities list from places
  const cities = useMemo(() => {
    return Array.from(new Set(places.map((p) => p.location?.city).filter(Boolean))) as string[];
  }, [places]);

  // Soft delete with 5-second Undo toast
  const handleDeletePost = (postToDelete: SavedPost) => {
    const postId = postToDelete.post_id;
    setPendingDeleteIds((prev) => new Set(prev).add(postId));

    const commitTimer = setTimeout(async () => {
      try {
        const { platform, nativeId } = parsePostId(postId);
        await deletePost(platform, nativeId);
        onRefresh?.();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Failed to delete post");
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

    showToast("Post deleted", {
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
    });
  };

  // Filter & sort reels
  const filteredPosts = useMemo(() => {
    let list = availablePosts.filter((post) => {
      if (activeCategory !== "all") {
        const postPlaces = places.filter((p) => post.place_ids?.includes(p.place_id));
        const matchesCategory = postPlaces.some(
          (p) => getCategoryVisual(p.category).name === activeCategory
        );
        if (!matchesCategory) return false;
      }
      if (activeCity !== "all") {
        const postPlaces = places.filter((p) => post.place_ids?.includes(p.place_id));
        const matchesCity = postPlaces.some((p) => p.location?.city === activeCity);
        if (!matchesCity) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = (post.title || "").toLowerCase();
        const caption = (post.caption || "").toLowerCase();
        const author = (post.author_handle || "").toLowerCase();
        if (!title.includes(query) && !caption.includes(query) && !author.includes(query)) {
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
      list = [...list].sort((a, b) => {
        const timeA = a.fetched_at || a.posted_at || "";
        const timeB = b.fetched_at || b.posted_at || "";
        return timeB.localeCompare(timeA);
      });
    }

    return list;
  }, [availablePosts, places, activeCategory, activeCity, searchQuery, sortOrder]);

  // Filter & sort places
  const filteredPlaces = useMemo(() => {
    let list = places.filter((place) => {
      if (activeCategory !== "all") {
        if (getCategoryVisual(place.category).name !== activeCategory) return false;
      }
      if (activeCity !== "all") {
        if (place.location?.city !== activeCity) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const name = (place.display_name || "").toLowerCase();
        const city = (place.location?.city || "").toLowerCase();
        const country = (place.location?.country || "").toLowerCase();
        if (!name.includes(query) && !city.includes(query) && !country.includes(query)) {
          return false;
        }
      }
      return true;
    });

    if (sortOrder === "alpha") {
      list = [...list].sort((a, b) => (a.display_name || "").localeCompare(b.display_name || ""));
    } else if (sortOrder === "city") {
      list = [...list].sort((a, b) =>
        (a.location?.city || "").localeCompare(b.location?.city || "")
      );
    }

    return list;
  }, [places, activeCategory, activeCity, searchQuery, sortOrder]);

  if (loading && posts.length === 0) {
    return (
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 16px 80px", width: "100%", boxSizing: "border-box" }}>
        <SkeletonGrid count={8} />
      </main>
    );
  }

  return (
    <main
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "clamp(20px, 4vw, 36px) clamp(16px, 4vw, 32px) 80px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      {/* Top Header: Title & Segmented Toggle (Reels | Places) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(24px, 3vw, 32px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--ink, #16181B)" }}>
            Library
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "14px", color: "var(--ink-2, #5E636B)" }}>
            {activeTab === "reels" ? `${filteredPosts.length} reels saved` : `${filteredPlaces.length} spots saved`}
          </p>
        </div>

        {/* Segmented Reels | Places Toggle */}
        <div
          style={{
            display: "inline-flex",
            padding: "3px",
            borderRadius: "999px",
            background: "var(--surface-2, #F3F3F1)",
            border: "1px solid var(--line, #E7E6E3)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("reels")}
            style={{
              padding: "6px 18px",
              borderRadius: "999px",
              border: 0,
              background: activeTab === "reels" ? "var(--ink, #16181B)" : "transparent",
              color: activeTab === "reels" ? "var(--bg, #FAFAF9)" : "var(--ink-2, #5E636B)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Reels ({availablePosts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("places")}
            style={{
              padding: "6px 18px",
              borderRadius: "999px",
              border: 0,
              background: activeTab === "places" ? "var(--ink, #16181B)" : "transparent",
              color: activeTab === "places" ? "var(--bg, #FAFAF9)" : "var(--ink-2, #5E636B)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Places ({places.length})
          </button>
        </div>
      </div>

      {/* Controls Row: Search + Sort + (Places View Toggle) */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        {/* Inline Search */}
        <div
          style={{
            flex: "1 1 240px",
            height: "40px",
            borderRadius: "999px",
            background: "var(--surface, #FFFFFF)",
            border: "1px solid var(--line, #E7E6E3)",
            display: "flex",
            alignItems: "center",
            padding: "0 14px",
            gap: "10px",
          }}
        >
          <Search size={16} color="var(--ink-2, #5E636B)" />
          <input
            type="text"
            placeholder={activeTab === "reels" ? "Search captions, creators..." : "Search places, cities..."}
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              const next = new URLSearchParams(searchParams);
              if (val) next.set("q", val);
              else next.delete("q");
              setSearchParams(next);
            }}
            style={{
              flex: 1,
              border: 0,
              outline: "none",
              background: "transparent",
              color: "var(--ink, #16181B)",
              fontSize: "14px",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <ArrowUpDown size={15} color="var(--ink-2, #5E636B)" />
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            style={{
              height: "40px",
              padding: "0 14px",
              borderRadius: "999px",
              background: "var(--surface, #FFFFFF)",
              border: "1px solid var(--line, #E7E6E3)",
              color: "var(--ink, #16181B)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
              fontFamily: "inherit",
            }}
          >
            <option value="recent">Recently saved</option>
            <option value="alpha">A – Z</option>
            {activeTab === "places" && <option value="city">By city</option>}
          </select>
        </div>

        {/* Places View Mode Toggle (Grid vs List) */}
        {activeTab === "places" && (
          <div
            style={{
              display: "inline-flex",
              padding: "2px",
              borderRadius: "999px",
              background: "var(--surface-2, #F3F3F1)",
              border: "1px solid var(--line, #E7E6E3)",
            }}
          >
            <button
              type="button"
              onClick={() => setPlacesViewMode("grid")}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: 0,
                background: placesViewMode === "grid" ? "var(--ink, #16181B)" : "transparent",
                color: placesViewMode === "grid" ? "#FFFFFF" : "var(--ink-2, #5E636B)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPlacesViewMode("list")}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                border: 0,
                background: placesViewMode === "list" ? "var(--ink, #16181B)" : "transparent",
                color: placesViewMode === "list" ? "#FFFFFF" : "var(--ink-2, #5E636B)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="List view"
            >
              <ListIcon size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Filter Chips: 32px Pills (Horizontal Scroll) */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
        {/* All Chip */}
        <button
          type="button"
          onClick={() => {
            const next = new URLSearchParams(searchParams);
            next.delete("category");
            setSearchParams(next);
          }}
          style={{
            height: "32px",
            padding: "0 14px",
            borderRadius: "999px",
            border: activeCategory === "all" ? "1px solid var(--ink, #16181B)" : "1px solid var(--line, #E7E6E3)",
            background: activeCategory === "all" ? "var(--ink, #16181B)" : "var(--surface-2, #F3F3F1)",
            color: activeCategory === "all" ? "var(--bg, #FAFAF9)" : "var(--ink-2, #5E636B)",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          All categories
        </button>

        {/* 8 Canonical Categories */}
        {CANONICAL_CATEGORIES.map((cat) => {
          const vis = getCategoryVisual(cat);
          const isSelected = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                if (isSelected) next.delete("category");
                else next.set("category", cat);
                setSearchParams(next);
              }}
              style={{
                height: "32px",
                padding: "0 12px",
                borderRadius: "999px",
                border: isSelected ? "1px solid var(--ink, #16181B)" : "1px solid var(--line, #E7E6E3)",
                background: isSelected ? "var(--ink, #16181B)" : "var(--surface-2, #F3F3F1)",
                color: isSelected ? "var(--bg, #FAFAF9)" : "var(--ink-2, #5E636B)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>{vis.glyph}</span>
              <span>{cat}</span>
            </button>
          );
        })}

        {/* Cities */}
        {cities.slice(0, 5).map((city) => {
          const isSelected = activeCity === city;
          return (
            <button
              key={city}
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                if (isSelected) next.delete("city");
                else next.set("city", city);
                setSearchParams(next);
              }}
              style={{
                height: "32px",
                padding: "0 12px",
                borderRadius: "999px",
                border: isSelected ? "1px solid var(--ink, #16181B)" : "1px solid var(--line, #E7E6E3)",
                background: isSelected ? "var(--ink, #16181B)" : "var(--surface-2, #F3F3F1)",
                color: isSelected ? "var(--bg, #FAFAF9)" : "var(--ink-2, #5E636B)",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              📍 {city}
            </button>
          );
        })}
      </div>

      {/* Content Rendering */}
      {activeTab === "reels" ? (
        filteredPosts.length === 0 && inFlightSaves.length === 0 ? (
          <EmptyState
            screenLabel="Library"
            headline="Nothing here yet"
            description="Reels you save on Instagram will be neatly organized here."
            primaryActionLabel="Paste a reel"
            onPrimaryAction={() => openSaveSheet()}
            iconPath="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            tint="var(--surface-2, #F3F3F1)"
            ink="var(--ink, #16181B)"
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: "24px",
            }}
          >
            {inFlightSaves.map((job) => (
              <OptimisticSaveCard
                key={job.id}
                save={job}
                onRetry={() => retryFailedLink(job.url)}
                onRemove={() => removeFailedLink(job.url)}
              />
            ))}
            {filteredPosts.map((post) => (
              <ReelCard
                key={post.post_id}
                post={post}
                onEdit={(p) => setEditingPost(p)}
                onDelete={(p) => handleDeletePost(p)}
              />
            ))}
          </div>
        )
      ) : (
        /* Places View */
        filteredPlaces.length === 0 ? (
          <EmptyState
            screenLabel="Places"
            headline="No places found"
            description="Places mentioned in your reels will appear here."
            primaryActionLabel="Save a reel"
            onPrimaryAction={() => openSaveSheet()}
            iconPath="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"
            tint="var(--surface-2, #F3F3F1)"
            ink="var(--ink, #16181B)"
          />
        ) : placesViewMode === "grid" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "24px",
            }}
          >
            {filteredPlaces.map((place) => (
              <PlaceCard key={place.place_id} place={place} posts={posts} />
            ))}
          </div>
        ) : (
          /* Places List View (PlaceRow) */
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filteredPlaces.map((place) => {
              const vis = getCategoryVisual(place.category);
              const thumb = getPlaceBestImageUrl(place, posts);
              return (
                <Link
                  key={place.place_id}
                  to={`/place/${place.place_id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    background: "var(--surface, #FFFFFF)",
                    border: "1px solid var(--line, #E7E6E3)",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "all 0.15s ease",
                  }}
                  className="wf-card-hover"
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "14px",
                      overflow: "hidden",
                      background: vis.tint,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      position: "relative",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>{vis.glyph}</span>
                    {thumb ? (
                      <img
                        src={proxiedMediaUrl(thumb) || ""}
                        alt={place.display_name}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink, #16181B)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {place.display_name}
                    </span>
                    <div style={{ fontSize: "13px", color: "var(--ink-2, #5E636B)", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: vis.hue }} />
                      <span>{vis.name}</span>
                      {place.location?.city && <span>· {place.location.city}</span>}
                    </div>
                    {place.tips?.[0] && (
                      <div style={{ fontSize: "12px", color: "var(--ink-2, #5E636B)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        "{place.tips[0]}"
                      </div>
                    )}
                  </div>

                  <span style={{ fontSize: "14px", color: "var(--ink-2, #5E636B)" }}>→</span>
                </Link>
              );
            })}
          </div>
        )
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
