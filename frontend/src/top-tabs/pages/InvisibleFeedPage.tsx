import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  deletePost,
  nativePostId,
  type Place,
  type SavedPost,
} from "../../api";
import { getPostTitle, proxiedMediaUrl } from "../../postDisplayUtils";
import { CoverCard } from "../../components/CoverCard";
import {
  MasonryGrid,
  MasonrySkeletonGrid,
  postAspectRatio,
  postAspectRatioValue,
} from "../../components/MasonryGrid";
import { PostDetail } from "../../components/PostDetail";
import { PlaceDetail } from "../../components/PlaceDetail";
import { placeMatchesPlatform, postsForPlatforms, useLibraryPlatform } from "../../libraryPlatform";
import { useLabTheme } from "../theme";
import "./invisible-feed.css";

export type InvisibleCategoryKey =
  | "all"
  | "reels"
  | "photos"
  | "travel"
  | "food"
  | "watch";

interface InvisibleFeedPageProps {
  posts: SavedPost[];
  places?: Place[];
  loading?: boolean;
  onRefresh?: () => void;
}

interface FeedPostItem {
  id: string;
  kind: "post";
  post: SavedPost;
  title: string;
  creator: string;
  caption: string;
  category: string;
  aspectRatio: string;
  aspectRatioValue: number;
  imageUrl: string | null;
  location?: string;
  meta: string;
}

interface FeedPlaceItem {
  id: string;
  kind: "place";
  place: Place;
  title: string;
  creator: string;
  caption: string;
  category: string;
  aspectRatio: "16 / 9";
  aspectRatioValue: number;
  imageUrl: string | null;
  location?: string;
  meta: string;
}

type FeedItem = FeedPostItem | FeedPlaceItem;

export function InvisibleFeedPage({
  posts,
  places = [],
  loading = false,
  onRefresh,
}: InvisibleFeedPageProps) {
  const navigate = useNavigate();
  const { basePath } = useLabTheme();
  const { platforms } = useLibraryPlatform();
  const scopedPosts = useMemo(() => postsForPlatforms(posts, platforms), [posts, platforms]);
  const scopedPlaces = useMemo(
    () => places.filter((place) => placeMatchesPlatform(place.source_post_ids, posts, platforms)),
    [places, posts, platforms],
  );

  const [activeCategory, setActiveCategory] = useState<InvisibleCategoryKey>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [forceTouchMode, setForceTouchMode] = useState(false);
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  // Map places to thumbnails using source posts
  const thumbnailByPostId = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of scopedPosts) {
      if (p.thumbnail_url) {
        map.set(p.post_id, p.thumbnail_url);
      }
    }
    return map;
  }, [scopedPosts]);

  // Convert posts to unified feed items
  const postItems = useMemo<FeedPostItem[]>(() => {
    return scopedPosts.map((post) => {
      const handle = post.author_handle?.trim();
      const creator = handle ? `@${handle}` : post.platform;
      const title = getPostTitle(post);
      const ratio = postAspectRatio(post);
      const ratioValue = postAspectRatioValue(post);
      const category = post.content_category
        ? post.content_category.charAt(0).toUpperCase() + post.content_category.slice(1)
        : post.platform;

      const primaryPlace =
        post.extracted_places?.[0]?.place_name ||
        post.places?.[0]?.place_name ||
        undefined;

      return {
        id: `post:${post.post_id}`,
        kind: "post",
        post,
        title,
        creator,
        caption: post.caption || post.reel_summary || "",
        category,
        aspectRatio: ratio,
        aspectRatioValue: ratioValue,
        imageUrl: proxiedMediaUrl(post.thumbnail_url),
        location: primaryPlace,
        meta: creator,
      };
    });
  }, [scopedPosts]);

  // Convert places to horizontal 16:9 feed items
  const placeItems = useMemo<FeedPlaceItem[]>(() => {
    return scopedPlaces.map((place) => {
      const img =
        place.source_post_ids
          .map((id) => thumbnailByPostId.get(id))
          .find(Boolean) ?? null;

      const locParts = [
        place.location.city,
        place.location.state_province,
        place.location.country,
      ].filter(Boolean);

      const location = locParts.join(" · ") || place.category || "Place";
      const saveCount = place.source_post_ids.length || 1;

      return {
        id: `place:${place.place_id}`,
        kind: "place",
        place,
        title: place.display_name,
        creator: place.category || "Travel",
        caption: place.summary || place.tips.join(" ") || "",
        category: place.category || "Place",
        aspectRatio: "16 / 9",
        aspectRatioValue: 16 / 9,
        imageUrl: proxiedMediaUrl(img),
        location,
        meta: `${saveCount} ${saveCount === 1 ? "save" : "saves"}`,
      };
    });
  }, [scopedPlaces, thumbnailByPostId]);

  // Category filter predicate
  const matchesCategory = (item: FeedItem, cat: InvisibleCategoryKey): boolean => {
    if (cat === "all") return true;

    if (item.kind === "place") {
      return cat === "travel";
    }

    const { post } = item;
    const catLower = post.content_category?.toLowerCase() || "";
    const isVideo =
      post.media_kind === "video" ||
      catLower === "reels" ||
      post.platform === "instagram_reel" ||
      post.platform === "tiktok" ||
      post.platform === "youtube" ||
      Boolean(post.reel_summary);

    switch (cat) {
      case "reels":
        return isVideo;
      case "photos":
        return (
          !isVideo &&
          (post.media_kind === "photo" ||
            post.media_kind === "carousel" ||
            Boolean(post.slide_media_urls && post.slide_media_urls.length > 0))
        );
      case "travel":
        return Boolean(
          catLower === "travel" ||
            (post.place_ids && post.place_ids.length > 0) ||
            (post.extracted_places && post.extracted_places.length > 0),
        );
      case "food":
        return Boolean(catLower === "food" || post.extracted_recipe);
      case "watch":
        return Boolean(
          catLower === "movies" ||
            catLower === "watch" ||
            (post.extracted_movies && post.extracted_movies.length > 0) ||
            (post.resolved_movies && post.resolved_movies.length > 0),
        );
      default:
        return true;
    }
  };

  // Real-time counts across all items
  const counts = useMemo(() => {
    const allItems: FeedItem[] = [...postItems, ...placeItems];
    return {
      all: allItems.length,
      reels: postItems.filter((it) => matchesCategory(it, "reels")).length,
      photos: postItems.filter((it) => matchesCategory(it, "photos")).length,
      travel:
        postItems.filter((it) => matchesCategory(it, "travel")).length +
        placeItems.length,
      food: postItems.filter((it) => matchesCategory(it, "food")).length,
      watch: postItems.filter((it) => matchesCategory(it, "watch")).length,
    };
  }, [postItems, placeItems]);

  // Filter items by category first
  const categoryFilteredItems = useMemo<FeedItem[]>(() => {
    if (activeCategory === "travel") {
      const pItems = postItems.filter((it) => matchesCategory(it, "travel"));
      return [...pItems, ...placeItems];
    }
    if (activeCategory === "all") {
      return [...postItems, ...placeItems];
    }
    return postItems.filter((it) => matchesCategory(it, activeCategory));
  }, [postItems, placeItems, activeCategory]);

  // Filter items by search query
  const filteredItems = useMemo<FeedItem[]>(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categoryFilteredItems;

    return categoryFilteredItems.filter((item) => {
      if (item.title.toLowerCase().includes(query)) return true;
      if (item.creator.toLowerCase().includes(query)) return true;
      if (item.caption.toLowerCase().includes(query)) return true;
      if (item.location && item.location.toLowerCase().includes(query)) return true;
      if (item.category.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [categoryFilteredItems, searchQuery]);

  // List of posts in current view for next/prev keyboard navigation
  const visiblePosts = useMemo(() => {
    return filteredItems
      .filter((it): it is FeedPostItem => it.kind === "post")
      .map((it) => it.post);
  }, [filteredItems]);

  // Selected post index for next/prev
  const selectedPostIndex = selectedPost
    ? visiblePosts.findIndex((p) => p.post_id === selectedPost.post_id)
    : -1;

  const prevPost =
    selectedPostIndex > 0 ? visiblePosts[selectedPostIndex - 1] : undefined;
  const nextPost =
    selectedPostIndex >= 0 && selectedPostIndex < visiblePosts.length - 1
      ? visiblePosts[selectedPostIndex + 1]
      : undefined;

  const categoryChips: { key: InvisibleCategoryKey; label: string }[] = [
    { key: "all", label: "All Saves" },
    { key: "reels", label: "Reels & Videos" },
    { key: "photos", label: "Photos" },
    { key: "travel", label: "Travel & Places" },
    { key: "food", label: "Food & Recipes" },
    { key: "watch", label: "Watch" },
  ];

  return (
    <div className="invisible-feed-page">
      <div className="invisible-feed-toolbar">
        <div className="invisible-feed-header-row">
          <div className="invisible-feed-title-wrap">
            <Link to="/" className="invisible-feed-home-link" title="Back to Home view">
              ← Home
            </Link>
            <h1 className="invisible-feed-title">
              <span>✨</span> Invisible Feed
            </h1>
            <span className="invisible-feed-subtitle">Zero-Chrome Discovery</span>
          </div>

          <div className="invisible-feed-actions">
            {/* Search Input */}
            <div className="invisible-feed-search-wrap">
              <svg
                className="invisible-feed-search-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                className="invisible-feed-search-input"
                placeholder="Search titles, creators, places…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Filter invisible feed"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="invisible-feed-search-clear"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            {/* Simulate Touch Toggle */}
            <button
              type="button"
              className={`invisible-feed-touch-btn ${forceTouchMode ? "is-active" : ""}`}
              onClick={() => setForceTouchMode((prev) => !prev)}
              title={
                forceTouchMode
                  ? "Touch Mode is ON: Hover is disabled; tap card to reveal metadata, second tap to open"
                  : "Simulate mobile touch mode without a touch device"
              }
              aria-pressed={forceTouchMode}
            >
              <span>📱</span>
              <span>{forceTouchMode ? "Touch Mode: ON" : "Simulate Touch"}</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="invisible-feed-chips" role="tablist" aria-label="Category filters">
          {categoryChips.map((chip) => {
            const isActive = activeCategory === chip.key;
            const count = counts[chip.key];
            return (
              <button
                key={chip.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`invisible-feed-chip ${isActive ? "is-active" : ""}`}
                onClick={() => setActiveCategory(chip.key)}
              >
                <span>{chip.label}</span>
                <span className="invisible-feed-chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feed Status Meta */}
      <div className="invisible-feed-status-bar">
        <span>
          Showing {filteredItems.length} {filteredItems.length === 1 ? "save" : "saves"}
          {searchQuery ? ` matching "${searchQuery}"` : ""}
        </span>
        {forceTouchMode && (
          <span style={{ color: "var(--accent, #38bdf8)" }}>
            Tap card once to reveal info · Tap again to open
          </span>
        )}
      </div>

      {/* Grid or Skeleton or Empty */}
      {loading && filteredItems.length === 0 ? (
        <MasonrySkeletonGrid count={8} />
      ) : filteredItems.length === 0 ? (
        <div className="invisible-feed-empty">
          <h3>No saves found</h3>
          <p>
            {searchQuery
              ? `No items matched "${searchQuery}" in this category.`
              : "No saves in this category yet."}
          </p>
          {searchQuery && (
            <button
              type="button"
              className="invisible-feed-reset-btn"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <MasonryGrid<FeedItem>
          items={filteredItems}
          getItemKey={(item) => item.id}
          getItemAspectRatioValue={(item) => item.aspectRatioValue}
          renderItem={(item) => {
            if (item.kind === "post") {
              return (
                <CoverCard
                  title={item.title}
                  category={item.category}
                  location={item.location}
                  meta={item.meta}
                  imageUrl={item.imageUrl}
                  aspectRatio={item.aspectRatio}
                  forceTouchMode={forceTouchMode}
                  onOpen={() => setSelectedPost(item.post)}
                  ariaLabel={`Open post ${item.title}`}
                />
              );
            }
            return (
              <CoverCard
                title={item.title}
                category="Place"
                location={item.location}
                meta={item.meta}
                imageUrl={item.imageUrl}
                aspectRatio="16 / 9"
                forceTouchMode={forceTouchMode}
                onOpen={() => setSelectedPlace(item.place)}
                ariaLabel={`Open place ${item.title}`}
              />
            );
          }}
        />
      )}

      {/* Immersive Detail Modal: Post */}
      {selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onPrevPost={prevPost ? () => setSelectedPost(prevPost) : undefined}
          onNextPost={nextPost ? () => setSelectedPost(nextPost) : undefined}
          onDelete={async () => {
            await deletePost(selectedPost.platform, nativePostId(selectedPost));
            setSelectedPost(null);
            onRefresh?.();
          }}
          onNavigateToPlace={(placeId) => {
            setSelectedPost(null);
            navigate(`${basePath}/travel/${placeId}`);
          }}
        />
      )}

      {/* Immersive Detail Modal: Place */}
      {selectedPlace && (
        <PlaceDetail
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onNavigateToPlace={(place) => {
            setSelectedPlace(null);
            navigate(`${basePath}/travel/${place.place_id}`);
          }}
          onNavigateToPost={(platform, postId) => {
            setSelectedPlace(null);
            const found = posts.find(
              (p) => p.platform === platform && nativePostId(p) === postId,
            );
            if (found) {
              setSelectedPost(found);
            }
          }}
        />
      )}
    </div>
  );
}
