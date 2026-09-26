import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchPlaceDetail, fetchPost, nativePostId, type Place, type SavedPost } from "../api";
import { mappablePlaces } from "../placeMapUtils";
import { formatPostDate, getPlatformLabel, proxiedMediaUrl } from "../postDisplayUtils";
import { DetailModal } from "./DetailModal";
import { PostPlacesMap } from "./PostPlacesMap";
import { RoadTripModal } from "./RoadTripModal";
import { TrailerModal } from "./movies/TrailerModal";
import { RecipeDetailModal } from "./food/RecipeDetailModal";
import { GroceryListModal } from "./food/GroceryListModal";
import {
  buildPlaceSummaries,
  buildReelDetailItems,
  isEnclosingParentPlace,
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

function CarIcon() {
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
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  );
}



// ── ReadingDeckPlaceCard: Individual Place / Stop in Right Column ────────────

interface ReadingDeckPlaceCardProps {
  item: ReelDetailItem;
  stopNumber?: number;
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
          {stopNumber != null ? (
            <span className="post-deck-stop-badge">{stopNumber}</span>
          ) : (
            <span
              className="post-deck-stop-badge post-deck-stop-badge--parent"
              title="Parent Area"
            >
              🏞️
            </span>
          )}
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
  const navigate = useNavigate();
  const [post, setPost] = useState(initialPost);
  const [linkedPlaces, setLinkedPlaces] = useState<LinkedPlace[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [roadTripOpen, setRoadTripOpen] = useState(false);
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
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && onPrevPost) {
        e.preventDefault();
        onPrevPost();
      } else if (e.key === "ArrowRight" && onNextPost) {
        e.preventDefault();
        onNextPost();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPrevPost, onNextPost]);

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
              stateProvince: detail.place.location.state_province,
              country: detail.place.location.country,
              latitude: detail.place.location.latitude,
              longitude: detail.place.location.longitude,
              providerPlaceId: detail.place.location.provider_place_id,
              facts: detail.place.facts,
              parentPlaceId: detail.place.parent_place_id ?? null,
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
  const heading = shortHeading(post);
  const rawCaption = post.caption?.trim() || "";

  const textCorpus = useMemo(
    () =>
      [
        heading,
        rawCaption,
        post.reel_summary,
        post.video_analysis,
        post.transcript,
        ...(post.hashtags || []),
      ]
        .filter(Boolean)
        .join(" "),
    [
      heading,
      rawCaption,
      post.reel_summary,
      post.video_analysis,
      post.transcript,
      post.hashtags,
    ],
  );

  const { parentPlaceIds, parentPlaceNames } = useMemo(() => {
    const ids = new Set<string>();
    const names = new Set<string>();

    placeSummaries.forEach((ps) => {
      if (ps.parentPlaceId?.trim()) {
        ids.add(ps.parentPlaceId.trim().toLowerCase());
      }
      if (ps.parentPlaceName?.trim()) {
        names.add(ps.parentPlaceName.trim().toLowerCase());
      }
    });

    overviewPlaces.forEach((p) => {
      if (p.parent_place_id?.trim()) {
        ids.add(p.parent_place_id.trim().toLowerCase());
      }
    });

    post.extracted_places?.forEach((ep) => {
      if (ep.parent_place_name?.trim()) {
        names.add(ep.parent_place_name.trim().toLowerCase());
      }
    });

    return { parentPlaceIds: ids, parentPlaceNames: names };
  }, [placeSummaries, overviewPlaces, post.extracted_places]);

  // Road trip map places: if the list has a parent place (like Yellowstone National Park)
  // along with its child places (Fishing Cone, West Thumb Geyser Basin), ignore that parent place!
  const mapPlaces = useMemo(() => {
    const nonParents = overviewPlaces.filter(
      (p) =>
        !isEnclosingParentPlace(
          p,
          overviewPlaces,
          parentPlaceIds,
          parentPlaceNames,
          textCorpus,
        ),
    );
    return nonParents.length > 0 ? nonParents : overviewPlaces;
  }, [overviewPlaces, parentPlaceIds, parentPlaceNames, textCorpus]);

  const activeItem = detailItems[activeItemIndex] ?? detailItems[0];
  const activePlaceId = useMemo(() => {
    if (!activeItem) return mapPlaces[0]?.place_id ?? null;
    const directKey = activeItem.placeId ?? activeItem.key;
    if (mapPlaces.some((p) => p.place_id === directKey || p.display_name === activeItem.name)) {
      return directKey;
    }
    return mapPlaces[0]?.place_id ?? null;
  }, [activeItem, mapPlaces]);

  const pinIndexByPlaceId = useMemo(() => {
    const indexes: Record<string, number> = {};
    mapPlaces.forEach((place, index) => {
      indexes[place.place_id] = index;
      indexes[place.display_name] = index;
    });
    return indexes;
  }, [mapPlaces]);

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

  const dateLabel = formatPostDate(post);
  const platformLabel = getPlatformLabel(post);
  const thumbUrl = proxiedMediaUrl(post.thumbnail_url);
  const showMap = mappablePlaces(mapPlaces).length > 0;

  // Caption truncation logic
  const isCaptionLong = rawCaption.length > 160;
  const displayCaption = !isCaptionLong || captionExpanded
    ? rawCaption
    : `${rawCaption.slice(0, 160).trimEnd()}…`;

  // Contextual Top Action: Hike Details vs Road Trip Directions
  const topAction = useMemo(() => {
    // 1. Road Trip intent
    const isExplicitRoadTrip =
      /\b(road\s*trip|roadtrip|scenic\s+drive|scenic\s+byway|driving\s+route|car\s+trip|vanlife|rv\s+trip|cross\s*country\s+drive)\b/i.test(
        textCorpus,
      );
    const hasDriveKeywords =
      /\b(drive|driving|itinerary|route|loop|stops?\s+(along|on|from)|from\s+[\w\s]+\s+to\s+[\w\s]+)\b/i.test(
        textCorpus,
      );

    // 2. Hike intent
    const isHikeText =
      /\b(hike|hiking|trail|trails|dayhike|day\s+hike|thruhike|thru-hike|trek|trekking|summit\s+trail|trailhead|ridge\s+walk)\b/i.test(
        textCorpus,
      );
    const hasHikeHashtags = post.hashtags?.some((t) =>
      /hike|hiking|trail|trails|thruhike|backpacking/i.test(t),
    );

    // Place categorization using mapPlaces (which already excluded enclosing parent places)
    const places = mapPlaces.length > 0 ? mapPlaces : overviewPlaces;
    const hikePlaces = places.filter(
      (p) =>
        p.category?.toLowerCase() === "hike" ||
        p.category?.toLowerCase() === "trail" ||
        Boolean(p.facts?.website_url?.includes("alltrails.com")),
    );
    const totalPlacesCount = Math.max(
      places.length,
      detailItems.length,
      post.extracted_places?.length || 0,
    );

    const isHeadingHike = /\b(hike|hiking|trail|trails|summit)\b/i.test(heading);
    const areAllPlacesHikes = totalPlacesCount > 0 && hikePlaces.length === totalPlacesCount;
    const isDedicatedHike =
      !isExplicitRoadTrip &&
      (isHeadingHike ||
        areAllPlacesHikes ||
        (hikePlaces.length > 0 && totalPlacesCount <= 2) ||
        ((isHikeText || hasHikeHashtags) && totalPlacesCount <= 1));

    // 3. Build waypoints for Google Maps directions using mapPlaces (excluding parent place)
    const waypoints: string[] = [];
    places.forEach((p) => {
      if (p.location?.latitude != null && p.location?.longitude != null) {
        waypoints.push(`${p.location.latitude},${p.location.longitude}`);
      } else if (p.display_name?.trim()) {
        const parts = [
          p.display_name.trim(),
          p.location?.city,
          p.location?.state_province,
        ].filter(Boolean);
        waypoints.push(encodeURIComponent(parts.join(", ")));
      }
    });

    // Multi-stop directions URL
    const roadTripUrl =
      waypoints.length >= 2
        ? `https://www.google.com/maps/dir/${waypoints.join("/")}`
        : waypoints.length === 1 && (isExplicitRoadTrip || hasDriveKeywords)
          ? `https://www.google.com/maps/dir/?api=1&destination=${waypoints[0]}`
          : null;

    // 5. If post is a Road Trip -> Road Trip button
    if (isExplicitRoadTrip && roadTripUrl) {
      return {
        type: "road_trip" as const,
        label: "Road Trip ↗",
        title: `Open road trip directions for all ${waypoints.length} locations in Google Maps`,
        url: roadTripUrl,
      };
    }

    // 6. If post is primarily about a Hike -> Hike Details button
    if (isDedicatedHike || ((isHikeText || hasHikeHashtags) && !roadTripUrl)) {
      const targetItem =
        (activeItem?.category?.toLowerCase() === "hike" ? activeItem : null) ??
        detailItems.find((item) => item.category?.toLowerCase() === "hike") ??
        detailItems[0];
      const targetPlace =
        places.find((p) => p.category?.toLowerCase() === "hike") ?? places[0];
      const targetExtracted =
        post.extracted_places?.find(
          (ep) => ep.category?.toLowerCase() === "hike",
        ) ?? post.extracted_places?.[0];

      const hikeName =
        targetItem?.name ||
        targetPlace?.display_name ||
        targetExtracted?.place_name ||
        heading ||
        "Trail";

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
        (targetPlace?.facts?.website_url &&
        targetPlace.facts.website_url.includes("alltrails.com/trail/")
          ? targetPlace.facts.website_url
          : null);

      return {
        type: "hike" as const,
        label: "Hike Details ↗",
        title: `View ${hikeName} on AllTrails`,
        url:
          resolvedUrl ||
          `https://www.google.com/search?q=site:alltrails.com/trail/+${encodeURIComponent(query)}`,
      };
    }

    // 7. If post has multiple locations (road trip / multi-stop route)
    if (roadTripUrl) {
      return {
        type: "road_trip" as const,
        label: "Road Trip ↗",
        title: `Open directions for all ${waypoints.length} locations in Google Maps`,
        url: roadTripUrl,
      };
    }

    // 8. Fallback: if single place is a hike or has trailStats
    if (hikePlaces.length > 0 || detailItems.some((it) => Boolean(it.trailStats))) {
      const targetItem =
        detailItems.find((it) => Boolean(it.trailStats)) ?? detailItems[0];
      const hikeName = targetItem?.name || heading || "Trail";
      const resolvedUrl = targetItem?.trailStats?.alltrailsUrl;
      return {
        type: "hike" as const,
        label: "Hike Details ↗",
        title: `View ${hikeName} on AllTrails`,
        url:
          resolvedUrl ||
          `https://www.google.com/search?q=site:alltrails.com/trail/+${encodeURIComponent(hikeName)}`,
      };
    }

    return null;
  }, [
    heading,
    rawCaption,
    post.reel_summary,
    post.video_analysis,
    post.transcript,
    post.hashtags,
    post.extracted_places,
    overviewPlaces,
    placeSummaries,
    detailItems,
    activeItem,
  ]);

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
            className="icon-button post-deck-home-btn"
            aria-label="Go to Home view"
            title="Go to Home view"
            onClick={() => {
              onClose();
              navigate("/");
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
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
                  places={mapPlaces}
                  activePlaceId={activePlaceId}
                  pinIndexByPlaceId={pinIndexByPlaceId}
                  onSelectPlaceId={(placeId) => {
                    const index = detailItems.findIndex(
                      (item) =>
                        item.placeId === placeId ||
                        item.key === placeId ||
                        item.name === placeId,
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
            {topAction && (
              topAction.type === "road_trip" ? (
                <button
                  type="button"
                  onClick={() => setRoadTripOpen(true)}
                  className="post-deck-route-btn post-deck-roadtrip-btn"
                  title="View shortest distance route options and open in Google Maps"
                >
                  <CarIcon />
                  {topAction.label}
                </button>
              ) : (
                <a
                  href={topAction.url}
                  target="_blank"
                  rel="noreferrer"
                  className="post-deck-route-btn post-deck-hike-btn"
                  title={topAction.title}
                >
                  <MountainIcon />
                  {topAction.label}
                </a>
              )
            )}
          </div>

          {detailItems.length > 0 ? (
            <ul className="post-deck-places-list" ref={placeListRef}>
              {detailItems.map((item, index) => {
                const pinIndex =
                  (item.placeId && pinIndexByPlaceId[item.placeId] != null)
                    ? pinIndexByPlaceId[item.placeId]
                    : pinIndexByPlaceId[item.name];
                const stopNumber = pinIndex != null ? pinIndex + 1 : undefined;
                return (
                  <ReadingDeckPlaceCard
                    key={item.key}
                    item={item}
                    stopNumber={stopNumber}
                    isActive={index === activeItemIndex}
                    onNavigateToPlace={onNavigateToPlace}
                    onPlayTrailer={setActiveTrailerKey}
                    onHighlight={() => setActiveItemIndex(index)}
                  />
                );
              })}
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
      {roadTripOpen && (
        <RoadTripModal
          isOpen={roadTripOpen}
          onClose={() => setRoadTripOpen(false)}
          postTitle={heading}
          postId={post.post_id}
          places={mapPlaces.length > 0 ? mapPlaces : overviewPlaces}
        />
      )}
    </DetailModal>
  );
}
