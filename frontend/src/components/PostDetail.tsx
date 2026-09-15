import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchPlaceDetail, fetchPost, nativePostId, type Place, type SavedPost } from "../api";
import { mappablePlaces } from "../placeMapUtils";
import { formatPostDate, getPlatformLabel, proxiedMediaUrl } from "../postDisplayUtils";
import { DetailModal } from "./DetailModal";
import { PostPlacesMap } from "./PostPlacesMap";
import { TrailerModal } from "./movies/TrailerModal";
import { RecipeDetailModal } from "./food/RecipeDetailModal";
import { GroceryListModal } from "./food/GroceryListModal";
import {
  buildPlaceSummaries,
  buildReelDetailItems,
  mapPlaceStub,
  shortHeading,
  type LinkedPlace,
  type ReelDetailItem,
} from "./postDetailUtils";

interface PostDetailProps {
  post: SavedPost;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onNavigateToPlace?: (placeId: string) => void;
  onPrevPost?: () => void;
  onNextPost?: () => void;
  onPostUpdated?: (post: SavedPost) => void;
}

function DeleteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M10 12L6 8l4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 4l4 4-4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5 3l9 5-9 5V3z" fill="currentColor" />
    </svg>
  );
}

function GoogleMapsIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#34A853" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <path fill="#FBBC04" d="M12 2v20s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <path fill="#EA4335" d="M12 9v13s7-7.75 7-13H12z" />
      <path fill="#4285F4" d="M5 9a7 7 0 0 0 1.76 4.7L12 22V9H5z" />
      <circle cx="12" cy="9" r="3.15" fill="#1A73E8" />
      <circle cx="12" cy="9" r="1.45" fill="#ffffff" />
    </svg>
  );
}

function MountainIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ marginRight: 4, flexShrink: 0 }}
    >
      <path d="m8 3 4 8 5-5 5 15H2L8 3z" />
      <path d="M4.14 15.08c2.62-1.57 5.24-1.43 7.86.42 2.74 1.94 5.49 2 8.23.19" />
    </svg>
  );
}


// ── ReadingDeckPlaceCard: Individual Place / Stop in Right Column ────────────

interface ReadingDeckPlaceCardProps {
  item: ReelDetailItem;
  stopNumber: number;
  isActive: boolean;
  onNavigateToPlace?: (placeId: string) => void;
  onPlayTrailer?: (key: string) => void;
  onHighlight: () => void;
}

function ReadingDeckPlaceCard({
  item,
  stopNumber,
  isActive,
  onNavigateToPlace,
  onPlayTrailer,
  onHighlight,
}: ReadingDeckPlaceCardProps) {
  const canOpenPlace = Boolean(item.placeId && onNavigateToPlace);
  const metaLine = [item.category, ...item.metaParts].filter(Boolean).join(" · ");
  const cardClass = [
    "post-deck-place-card",
    isActive ? "is-active" : "",
    item.posterUrl ? "has-movie-poster" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={cardClass} onMouseEnter={onHighlight} id={`post-place-${item.key}`}>
      <div className="post-deck-place-header">
        <div className="post-deck-place-identity">
          <span className="post-deck-stop-badge">{stopNumber}</span>
          <div>
            {canOpenPlace ? (
              <button
                type="button"
                className="post-deck-place-name-btn"
                onClick={() => onNavigateToPlace?.(item.placeId!)}
                title="Open place page"
              >
                {item.name} ↗
              </button>
            ) : (
              <strong className="post-deck-place-name-btn" style={{ cursor: "default" }}>
                {item.name}
              </strong>
            )}
            {metaLine && <div className="post-deck-place-meta">{metaLine}</div>}
          </div>
        </div>

        <div className="post-deck-place-actions">
          {item.trailerKey && onPlayTrailer && (
            <button
              type="button"
              className="post-deck-action-btn"
              onClick={() => onPlayTrailer(item.trailerKey!)}
              title="Watch trailer"
            >
              <PlayIcon /> Trailer
            </button>
          )}
          {item.trailStats?.alltrailsUrl && (
            <a
              className="post-deck-action-btn"
              href={item.trailStats.alltrailsUrl}
              target="_blank"
              rel="noreferrer"
              title="Open on AllTrails"
            >
              AllTrails ↗
            </a>
          )}
          {item.mapUrl && (
            <a
              className="post-deck-action-btn"
              href={item.mapUrl}
              target="_blank"
              rel="noreferrer"
              title="Open in Google Maps"
            >
              <GoogleMapsIcon /> Google Maps ↗
            </a>
          )}
          {item.actionHref && (
            <a
              className="post-deck-action-btn"
              href={item.actionHref}
              target="_blank"
              rel="noreferrer"
            >
              {item.actionLabel ?? "Open ↗"}
            </a>
          )}
        </div>
      </div>

      {/* Trail Stats Rail */}
      {item.trailStats && (
        <div className="post-deck-trail-stats">
          {item.trailStats.distance && (
            <span className="post-deck-trail-pill">
              🥾 {item.trailStats.distance}
            </span>
          )}
          {item.trailStats.elevation && (
            <span className="post-deck-trail-pill">
              {item.trailStats.elevation}
            </span>
          )}
          {item.trailStats.difficulty && (
            <span className={`post-deck-trail-pill post-deck-difficulty--${item.trailStats.difficulty.toLowerCase()}`}>
              {item.trailStats.difficulty.charAt(0).toUpperCase() + item.trailStats.difficulty.slice(1)}
            </span>
          )}
          {item.trailStats.routeType && (
            <span className="post-deck-trail-pill">
              🔁 {item.trailStats.routeType}
            </span>
          )}
          {item.trailStats.rating != null && (
            <span className="post-deck-trail-pill post-deck-trail-rating">
              ★ {item.trailStats.rating.toFixed(1)}
              {item.trailStats.reviewsCount ? ` (${item.trailStats.reviewsCount.toLocaleString()})` : ""}
            </span>
          )}
        </div>
      )}

      {/* Movie Crew & Streaming Info */}
      {(Boolean(item.directors?.length) || Boolean(item.cast?.length)) && (
        <p className="movie-crew-line" style={{ margin: "4px 0 0", fontSize: "11px" }}>
          {item.directors && item.directors.length > 0 && (
            <span><strong>Dir:</strong> {item.directors.join(", ")}</span>
          )}
          {item.directors && item.directors.length > 0 && item.cast && item.cast.length > 0 && " · "}
          {item.cast && item.cast.length > 0 && (
            <span><strong>Cast:</strong> {item.cast.join(", ")}</span>
          )}
        </p>
      )}

      {item.watchProviders && item.watchProviders.length > 0 && (
        <div className="movie-watch-providers" style={{ marginTop: "4px" }}>
          <span className="movie-provider-label">Stream on:</span>
          {item.watchProviders.map((provider) => (
            <span key={provider} className="movie-provider-pill">{provider}</span>
          ))}
        </div>
      )}

      {/* Details / description spanning full width */}
      {item.details && <p className="post-deck-place-details">{item.details}</p>}

      {/* Attached Tips from the Creator */}
      {item.tips && item.tips.length > 0 ? (
        <div className="post-deck-place-tip">
          <span>💡</span>
          <div>{item.tips.join(" · ")}</div>
        </div>
      ) : item.tip ? (
        <div className="post-deck-place-tip">
          <span>💡</span>
          <div>{item.tip}</div>
        </div>
      ) : null}
    </li>
  );
}

// ── PostDetail: Root Component ──────────────────────────────────────────────

export function PostDetail({
  post: initialPost,
  onClose,
  onDelete,
  onNavigateToPlace,
  onPrevPost,
  onNextPost,
  onPostUpdated,
}: PostDetailProps) {
  const [post, setPost] = useState(initialPost);
  const [linkedPlaces, setLinkedPlaces] = useState<LinkedPlace[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [recipeGroceryOpen, setRecipeGroceryOpen] = useState(false);
  const [groceryRecipePostId, setGroceryRecipePostId] = useState<string | null>(null);
  const placeListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    setActiveItemIndex(0);
    setCaptionExpanded(false);

    async function loadFreshPost() {
      try {
        const fresh = await fetchPost(initialPost.platform, nativePostId(initialPost));
        if (!cancelled) {
          setPost(fresh);
        }
      } catch {
        if (!cancelled) {
          setPost(initialPost);
        }
      }
    }

    void loadFreshPost();
    return () => {
      cancelled = true;
    };
  }, [initialPost.platform, initialPost.post_id, initialPost]);

  useEffect(() => {
    let cancelled = false;

    async function loadLinkedPlaces() {
      if (post.place_ids.length === 0) {
        setLinkedPlaces([]);
        return;
      }
      const results = await Promise.all(
        post.place_ids.map(async (placeId) => {
          try {
            const detail = await fetchPlaceDetail(placeId);
            return {
              placeId,
              displayName: detail.place.display_name,
              city: detail.place.location.city,
              country: detail.place.location.country,
              latitude: detail.place.location.latitude,
              longitude: detail.place.location.longitude,
              providerPlaceId: detail.place.location.provider_place_id,
              facts: detail.place.facts,
            };
          } catch {
            return { placeId, displayName: placeId };
          }
        }),
      );
      if (!cancelled) {
        setLinkedPlaces(results);
      }
    }

    void loadLinkedPlaces();
    return () => {
      cancelled = true;
    };
  }, [post.place_ids]);

  const placeSummaries = useMemo(
    () => buildPlaceSummaries(post, linkedPlaces),
    [post, linkedPlaces],
  );
  const detailItems = useMemo(
    () => buildReelDetailItems(post, placeSummaries),
    [post, placeSummaries],
  );
  const overviewPlaces = useMemo(
    () => placeSummaries.map(mapPlaceStub).filter((place): place is Place => place != null),
    [placeSummaries],
  );
  const activeItem = detailItems[activeItemIndex] ?? detailItems[0];
  const activePlaceId = activeItem ? (activeItem.placeId ?? activeItem.key) : null;
  const pinIndexByPlaceId = useMemo(() => {
    const indexes: Record<string, number> = {};
    detailItems.forEach((item, index) => {
      indexes[item.key] = index;
      if (item.placeId) {
        indexes[item.placeId] = index;
      }
    });
    return indexes;
  }, [detailItems]);

  const scrollToItemIndex = useCallback((index: number) => {
    setActiveItemIndex(index);
    const item = placeListRef.current?.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, []);

  const handleDelete = async () => {
    if (!window.confirm("Delete this saved post?")) return;
    await onDelete();
    onClose();
  };

  const heading = shortHeading(post);
  const dateLabel = formatPostDate(post);
  const platformLabel = getPlatformLabel(post);
  const thumbUrl = proxiedMediaUrl(post.thumbnail_url);
  const showMap = mappablePlaces(overviewPlaces).length > 0;

  // Caption truncation logic
  const rawCaption = post.caption?.trim() || "";
  const isCaptionLong = rawCaption.length > 180 || rawCaption.split("\n").length > 3;
  const displayCaption = !isCaptionLong || captionExpanded
    ? rawCaption
    : `${rawCaption.slice(0, 160).trimEnd()}…`;

  // Combined Multi-Stop Google Maps route URL
  const multiStopMapUrl = useMemo(() => {
    const mappable = mappablePlaces(overviewPlaces);
    if (mappable.length <= 1) return null;
    const waypoints = mappable
      .map((p) =>
        p.location.latitude != null && p.location.longitude != null
          ? `${p.location.latitude},${p.location.longitude}`
          : encodeURIComponent(p.display_name),
      )
      .join("/");
    return `https://www.google.com/maps/dir/${waypoints}`;
  }, [overviewPlaces]);

  // Hike details URL (e.g. AllTrails search) for hike posts
  const hikeInfo = useMemo(() => {
    // 1. Check activeItem or detailItems or overviewPlaces for a place with category === "hike"
    const targetItem =
      (activeItem?.category?.toLowerCase() === "hike" ? activeItem : null) ??
      detailItems.find((item) => item.category?.toLowerCase() === "hike");
    const targetPlace = overviewPlaces.find(
      (p) => p.category?.toLowerCase() === "hike",
    );
    const targetExtracted = post.extracted_places?.find(
      (ep) => ep.category?.toLowerCase() === "hike",
    );

    let hikeName =
      targetItem?.name || targetPlace?.display_name || targetExtracted?.place_name;

    // 2. Fallback: check if post itself is a hike post based on hashtags, caption, or heading
    if (!hikeName) {
      const isHikePost =
        post.hashtags?.some((t) => /hike|hiking|trail/i.test(t)) ||
        /\bhike\b|\btrail\b/i.test(heading) ||
        /\bhike\b|\btrail\b/i.test(rawCaption);
      if (isHikePost && detailItems.length > 0) {
        hikeName = detailItems[0].name;
      }
    }

    if (!hikeName) return null;

    // Location context (city or state) to make AllTrails search accurate
    const stateOrCity =
      targetExtracted?.state_province ||
      targetPlace?.location?.state_province ||
      targetExtracted?.city ||
      targetPlace?.location?.city ||
      (targetItem?.metaParts && targetItem.metaParts.length > 0
        ? targetItem.metaParts[0].split(",")[0].trim()
        : "");

    const query = stateOrCity ? `${hikeName} ${stateOrCity}` : hikeName;
    const resolvedUrl =
      targetItem?.trailStats?.alltrailsUrl ||
      (targetPlace?.facts?.website_url && targetPlace.facts.website_url.includes("alltrails.com/trail/")
        ? targetPlace.facts.website_url
        : null);

    return {
      name: hikeName,
      url: resolvedUrl || `https://www.google.com/search?q=site:alltrails.com/trail/+${encodeURIComponent(query)}`,
    };
  }, [activeItem, detailItems, overviewPlaces, post, heading, rawCaption]);

  return (
    <DetailModal
      titleId="post-detail-title"
      onClose={onClose}
      panelClassName="detail-panel-reading-deck"
    >
      {/* ── Header Provenance & Actions ─────────────────────────────────── */}
      <header className="post-deck-header">
        <div className="post-deck-provenance">
          <span className="post-deck-platform-badge">{platformLabel}</span>
          {post.author_handle && (
            <span className="post-deck-author">@{post.author_handle}</span>
          )}
          {dateLabel && <span className="post-deck-date">· {dateLabel}</span>}
          {post.slide_media_urls && post.slide_media_urls.length > 1 && (
            <span className="post-deck-badge">📷 {post.slide_media_urls.length} slides</span>
          )}
        </div>
        <div className="post-deck-header-actions">
          <button
            type="button"
            className="post-deck-delete-btn"
            aria-label="Delete post"
            title="Delete post"
            onClick={() => void handleDelete()}
          >
            <DeleteIcon />
          </button>
          <button
            type="button"
            className="icon-button icon-button-close post-deck-close-btn"
            onClick={onClose}
            aria-label="Close"
          />
        </div>
      </header>

      {/* ── Two-Column Body ─────────────────────────────────────────────── */}
      <div className="post-deck-body">
        {/* ── Left Column: Cover & Caption ──────────────────────────────── */}
        <div className="post-deck-left-col">
          {thumbUrl && (
            <div className="post-deck-cover-card">
              <img
                src={thumbUrl}
                alt={heading || "Post thumbnail"}
                className="post-deck-cover-img"
                loading="lazy"
              />
              {post.post_url && (
                <a
                  href={post.post_url}
                  target="_blank"
                  rel="noreferrer"
                  className="post-deck-external-link"
                >
                  Watch on {platformLabel} ↗
                </a>
              )}
            </div>
          )}

          {post.extracted_recipe && (
            <button
              type="button"
              className="post-deck-recipe-btn"
              onClick={() => setRecipeOpen(true)}
            >
              🍳 View Recipe Details
            </button>
          )}

          {heading && <h2 id="post-detail-title" className="post-deck-heading">{heading}</h2>}

          {/* Caption with Truncation & Toggle */}
          {rawCaption && (
            <div className="post-deck-caption-wrap">
              <span className="post-deck-caption-label">Original Caption</span>
              <p className="post-deck-caption-text">
                {displayCaption}
                {isCaptionLong && (
                  <button
                    type="button"
                    className="post-deck-caption-toggle"
                    onClick={() => setCaptionExpanded((prev) => !prev)}
                  >
                    {captionExpanded ? " Show less" : " More"}
                  </button>
                )}
              </p>
            </div>
          )}

          {/* Hashtags */}
          {post.hashtags && post.hashtags.length > 0 && (
            <div className="post-deck-hashtags">
              {post.hashtags.slice(0, 6).map((tag, idx) => (
                <span key={idx} className="post-deck-tag">
                  {tag.startsWith("#") ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          )}

          {/* Map Preview */}
          {showMap && (
            <div className="post-deck-map-container">
              <span className="post-deck-section-label">Stops on Map</span>
              <div className="post-deck-map-wrap">
                <PostPlacesMap
                  places={overviewPlaces}
                  activePlaceId={activePlaceId}
                  pinIndexByPlaceId={pinIndexByPlaceId}
                  onSelectPlaceId={(placeId) => {
                    const index = detailItems.findIndex(
                      (item) => item.placeId === placeId || item.key === placeId,
                    );
                    if (index >= 0) {
                      scrollToItemIndex(index);
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Right Column: Places Directory ───────────────────────────── */}
        <div className="post-deck-right-col">
          <div className="post-deck-places-head">
            <h3 className="post-deck-places-title">
              {detailItems.length > 0
                ? `Places Mentioned (${detailItems.length})`
                : "Post Details"}
            </h3>
            {hikeInfo ? (
              <a
                href={hikeInfo.url}
                target="_blank"
                rel="noreferrer"
                className="post-deck-route-btn post-deck-hike-btn"
                title={`View ${hikeInfo.name} on AllTrails`}
              >
                <MountainIcon /> Hike Details ↗
              </a>
            ) : multiStopMapUrl ? (
              <a
                href={multiStopMapUrl}
                target="_blank"
                rel="noreferrer"
                className="post-deck-route-btn"
              >
                Open Route in Maps ↗
              </a>
            ) : null}
          </div>

          {detailItems.length > 0 ? (
            <ul className="post-deck-places-list" ref={placeListRef}>
              {detailItems.map((item, index) => (
                <ReadingDeckPlaceCard
                  key={item.key}
                  item={item}
                  stopNumber={index + 1}
                  isActive={index === activeItemIndex}
                  onNavigateToPlace={onNavigateToPlace}
                  onPlayTrailer={setActiveTrailerKey}
                  onHighlight={() => setActiveItemIndex(index)}
                />
              ))}
            </ul>
          ) : (
            <div className="post-deck-empty-places">
              <p>No specific locations were extracted from this post.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Side nav arrows: prev / next post (desktop only) ──────────── */}
      {onPrevPost && (
        <button
          type="button"
          className="post-flip-side-arrow post-flip-side-arrow-left"
          onClick={onPrevPost}
          aria-label="Previous post"
          title="Previous post"
        >
          <ChevronLeftIcon />
        </button>
      )}
      {onNextPost && (
        <button
          type="button"
          className="post-flip-side-arrow post-flip-side-arrow-right"
          onClick={onNextPost}
          aria-label="Next post"
          title="Next post"
        >
          <ChevronRightIcon />
        </button>
      )}

      {/* ── Sub-Modals (Trailers, Recipes, Grocery) ────────────────────── */}
      {activeTrailerKey && (
        <TrailerModal
          youtubeKey={activeTrailerKey}
          title={activeItem?.name ?? "Trailer"}
          onClose={() => setActiveTrailerKey(null)}
        />
      )}
      {recipeOpen && (post.extracted_recipe || post.content_category === "food") && (
        <RecipeDetailModal
          item={{
            key: post.post_id,
            post,
            recipe: post.extracted_recipe ?? {
              title: post.caption.slice(0, 80) || "Food inspiration",
              summary: post.caption || null,
              ingredients: [],
              steps: [],
              tags: [],
              cuisine: null,
              meal_type: null,
              difficulty: null,
              estimated_inferred: false,
              tips: [],
            },
          }}
          onClose={() => setRecipeOpen(false)}
          onAddToGrocery={() => setGroceryRecipePostId(post.post_id)}
          isInGroceryList={groceryRecipePostId === post.post_id}
          onViewGrocery={() => setRecipeGroceryOpen(true)}
          onPostUpdated={(updated) => {
            setPost(updated);
            onPostUpdated?.(updated);
          }}
        />
      )}
      {recipeGroceryOpen && post.extracted_recipe && (
        <GroceryListModal
          recipes={[{ key: post.post_id, post, recipe: post.extracted_recipe }]}
          onClose={() => setRecipeGroceryOpen(false)}
        />
      )}
    </DetailModal>
  );
}
