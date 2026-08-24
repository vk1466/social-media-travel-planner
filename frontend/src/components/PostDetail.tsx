import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchPlaceDetail, fetchPost, nativePostId, type Place, type SavedPost } from "../api";
import { effectiveContentCategory } from "../contentCategory";
import { readPostCardLayout } from "../postCardLayout";
import { formatPostDate, getPlatformLabel, proxiedMediaUrl } from "../postDisplayUtils";
import { DetailModal } from "./DetailModal";
import { PostReelFace } from "./PostMediaPreview";
import { PostPlacesMap } from "./PostPlacesMap";
import {
  buildPlaceSummaries,
  buildReelDetailItems,
  buildReelSummary,
  mapPlaceStub,
  shortHeading,
  windowedDotIndices,
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
}

function DeleteIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M2.5 4h9M5.5 4V2.5h3V4M5 4v7.5h4V4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M3 5.5h7.5M10.5 5.5 8.5 3.5M10.5 5.5 8.5 7.5M13 10.5H5.5M5.5 10.5 7.5 8.5M5.5 10.5 7.5 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#34A853" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <path fill="#FBBC04" d="M12 2v20s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <path fill="#EA4335" d="M12 9v13s7-7.75 7-13H12z" />
      <path fill="#4285F4" d="M5 9a7 7 0 0 0 1.76 4.7L12 22V9H5z" />
      <circle cx="12" cy="9" r="3.15" fill="#1A73E8" />
      <circle cx="12" cy="9" r="1.45" fill="#fff" />
    </svg>
  );
}

function WanderfilePlaceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect width="16" height="16" rx="4" fill="currentColor" opacity="0.22" />
      <path
        d="M3.4 4.2h1.55l1.42 5.35L8 6.05l1.63 3.5 1.42-5.35H12.6L10.7 12.1H9.05L8 9.55 6.95 12.1H5.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

// ── FlipDetailCard: one stop / title / reel-detail in the scroll list ────────

interface FlipDetailCardProps {
  item: ReelDetailItem;
  isActive: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onNavigateToPlace?: (placeId: string) => void;
}

function FlipDetailCard({
  item,
  isActive,
  expanded,
  onToggleExpand,
  onNavigateToPlace,
}: FlipDetailCardProps) {
  const canOpenPlace = Boolean(item.placeId && onNavigateToPlace);
  const metaLine = [item.category, ...item.metaParts].filter(Boolean).join(" · ");
  const hasActions = Boolean(item.mapUrl || item.actionHref || canOpenPlace);
  const itemClass = [
    "post-flip-place-item",
    isActive ? "is-active" : "",
    expanded ? "is-expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={itemClass}>
      <div className="post-flip-place-title-row">
        <button
          type="button"
          className="post-flip-place-name"
          aria-expanded={expanded}
          onClick={onToggleExpand}
        >
          {item.name}
        </button>
        {hasActions && (
          <div className="post-flip-place-actions">
            {item.mapUrl && (
              <a
                className="post-flip-icon-btn"
                href={item.mapUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in Google Maps"
                title="Maps"
              >
                <GoogleMapsIcon />
              </a>
            )}
            {item.actionHref && (
              <a
                className="text-button post-flip-maps-link"
                href={item.actionHref}
                target="_blank"
                rel="noreferrer"
              >
                {item.actionLabel ?? "Open"}
              </a>
            )}
            {canOpenPlace && (
              <button
                type="button"
                className="post-flip-icon-btn"
                aria-label="Open place"
                title="Place"
                onClick={() => onNavigateToPlace?.(item.placeId!)}
              >
                <WanderfilePlaceIcon />
              </button>
            )}
          </div>
        )}
      </div>
      {expanded && metaLine && <p className="post-flip-place-meta">{metaLine}</p>}
      {expanded && item.details && <p className="post-flip-place-blurb">{item.details}</p>}
      {expanded && item.tip && <p className="post-flip-place-tip">{item.tip}</p>}
    </li>
  );
}

// ── PostFlipFront: detail + map face ──────────────────────────────────────────

interface PostFlipFrontProps {
  post: SavedPost;
  flipped: boolean;
  detailItems: ReelDetailItem[];
  overviewPlaces: Place[];
  pinIndexByPlaceId: Record<string, number>;
  activeItemIndex: number;
  activePlaceId: string | null;
  cardsExpanded: boolean;
  placeListRef: React.RefObject<HTMLUListElement | null>;
  onFlip: () => void;
  onClose: () => void;
  onDelete: () => void;
  scrollToItemIndex: (index: number) => void;
  onToggleExpand: () => void;
  onNavigateToPlace?: (placeId: string) => void;
}

function PostFlipFront({
  post,
  flipped,
  detailItems,
  overviewPlaces,
  pinIndexByPlaceId,
  activeItemIndex,
  activePlaceId,
  cardsExpanded,
  placeListRef,
  onFlip,
  onClose,
  onDelete,
  scrollToItemIndex,
  onToggleExpand,
  onNavigateToPlace,
}: PostFlipFrontProps) {
  const { reelSummary, llmSummary, summaryExcerpt } = buildReelSummary(post);
  const heading = shortHeading(post);
  const showHeading =
    Boolean(heading) &&
    (!reelSummary ||
      Boolean(llmSummary) ||
      !reelSummary.toLowerCase().startsWith(heading.replace(/…$/, "").toLowerCase().slice(0, 24)));

  const dateLabel = formatPostDate(post);
  const platformLabel = getPlatformLabel(post);
  const thumbUrl = proxiedMediaUrl(post.thumbnail_url);
  const thumbStyle = thumbUrl ? { backgroundImage: `url("${thumbUrl}")` } : undefined;
  const isTravelPost = effectiveContentCategory(post) === "travel";
  const showMap = isTravelPost && overviewPlaces.length > 0;
  const showCards = detailItems.length > 0;

  return (
    <section
      className="post-flip-face post-flip-front"
      data-card-layout={readPostCardLayout()}
      aria-hidden={flipped}
    >
      {thumbStyle && (
        <div className="post-flip-front-thumb" style={thumbStyle} aria-hidden="true" />
      )}
      <div className="post-flip-front-wash" aria-hidden="true" />
      <div className="post-flip-front-glow" aria-hidden="true" />

      <header className="post-flip-header">
        <div className="post-flip-meta">
          <p className="post-flip-eyebrow">
            {platformLabel}
            {post.author_handle ? ` · @${post.author_handle}` : ""}
          </p>
          <div className="detail-badges">
            <span className="badge badge-muted">{post.media_kind}</span>
            {dateLabel && <span className="badge badge-muted">{dateLabel}</span>}
            <button type="button" className="post-flip-reel-pill" onClick={onFlip}>
              <PlayIcon />
              Watch
            </button>
          </div>
        </div>
        <div className="post-flip-header-actions">
          <button
            type="button"
            className="icon-button post-flip-delete-icon"
            aria-label="Delete post"
            title="Delete"
            onClick={onDelete}
          >
            <DeleteIcon />
          </button>
          <button
            type="button"
            className="icon-button icon-button-close post-flip-front-close"
            onClick={onClose}
            aria-label="Close"
          />
        </div>
      </header>

      <div className={showMap ? "post-flip-map-fill" : "post-flip-map-fill is-cover"}>
        <div className="post-flip-map-intro">
          {showHeading && (
            <h2 id="post-detail-title" className="post-flip-heading">
              {heading}
            </h2>
          )}
          {reelSummary && (
            <p
              id={showHeading ? undefined : "post-detail-title"}
              className="post-flip-summary"
            >
              {summaryExcerpt.text}
            </p>
          )}
          {!showHeading && !reelSummary && (
            <h2 id="post-detail-title" className="post-flip-heading">
              {heading || "Saved post"}
            </h2>
          )}
        </div>

        {showMap ? (
          <PostPlacesMap
            places={overviewPlaces}
            activePlaceId={activePlaceId}
            pinIndexByPlaceId={pinIndexByPlaceId}
            onSelectPlaceId={(placeId) => {
              const index = detailItems.findIndex((item) => item.placeId === placeId || item.key === placeId);
              if (index >= 0) {
                scrollToItemIndex(index);
              }
            }}
          />
        ) : thumbUrl ? (
          <img
            className="post-flip-cover-image"
            src={thumbUrl}
            alt=""
            decoding="async"
          />
        ) : (
          <div className="post-flip-cover-empty" aria-hidden="true" />
        )}

        {showCards && (
          <div className="post-flip-map-places">
            <ul className="post-flip-place-list" ref={placeListRef}>
              {detailItems.map((item, index) => (
                <FlipDetailCard
                  key={item.key}
                  item={item}
                  isActive={index === activeItemIndex}
                  expanded={cardsExpanded}
                  onToggleExpand={onToggleExpand}
                  onNavigateToPlace={onNavigateToPlace}
                />
              ))}
            </ul>
            <div className="post-flip-place-pager">
              <p className="post-flip-brief-meta">
                {activeItemIndex + 1} / {detailItems.length}
              </p>
              {detailItems.length > 1 && (
                <div className="post-flip-place-dots" role="tablist" aria-label="Details">
                  {windowedDotIndices(detailItems.length, activeItemIndex).map((index) => (
                    <button
                      key={detailItems[index]!.key}
                      type="button"
                      role="tab"
                      aria-label={detailItems[index]!.name}
                      aria-selected={index === activeItemIndex}
                      className={
                        index === activeItemIndex
                          ? "post-flip-place-dot is-active"
                          : "post-flip-place-dot"
                      }
                      onClick={() => scrollToItemIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── PostDetail: root component ────────────────────────────────────────────────

export function PostDetail({
  post: initialPost,
  onClose,
  onDelete,
  onNavigateToPlace,
  onPrevPost,
  onNextPost,
}: PostDetailProps) {
  const [post, setPost] = useState(initialPost);
  const [linkedPlaces, setLinkedPlaces] = useState<LinkedPlace[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [cardsExpanded, setCardsExpanded] = useState(false);
  const placeListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    setFlipped(false);
    setActiveItemIndex(0);
    setCardsExpanded(false);

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
    item?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, []);

  useEffect(() => {
    const list = placeListRef.current;
    if (!list) return;
    const items = [...list.querySelectorAll<HTMLElement>(".post-flip-place-item")];
    if (items.length === 0) return;

    const mostVisibleIndex = () => {
      const root = list.getBoundingClientRect();
      let bestIndex = 0;
      let bestOverlap = -1;
      items.forEach((item, index) => {
        const rect = item.getBoundingClientRect();
        const overlap = Math.max(0, Math.min(rect.right, root.right) - Math.max(rect.left, root.left));
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestIndex = index;
        }
      });
      return bestIndex;
    };

    const syncActive = () => {
      setActiveItemIndex(mostVisibleIndex());
    };

    syncActive();
    list.addEventListener("scroll", syncActive, { passive: true });
    const observer = new IntersectionObserver(syncActive, {
      root: list,
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    items.forEach((item) => observer.observe(item));
    return () => {
      list.removeEventListener("scroll", syncActive);
      observer.disconnect();
    };
  }, [detailItems.length, cardsExpanded]);

  const handleDelete = async () => {
    if (!window.confirm("Delete this saved post?")) return;
    await onDelete();
    onClose();
  };

  return (
    <DetailModal
      titleId="post-detail-title"
      onClose={onClose}
      panelClassName="detail-panel-flip"
    >
      <div className={flipped ? "post-flip is-flipped" : "post-flip"}>
        <div className="post-flip-inner">
          <PostFlipFront
            post={post}
            flipped={flipped}
            detailItems={detailItems}
            overviewPlaces={overviewPlaces}
            pinIndexByPlaceId={pinIndexByPlaceId}
            activeItemIndex={activeItemIndex}
            activePlaceId={activePlaceId}
            cardsExpanded={cardsExpanded}
            placeListRef={placeListRef}
            onFlip={() => setFlipped(true)}
            onClose={onClose}
            onDelete={() => void handleDelete()}
            scrollToItemIndex={scrollToItemIndex}
            onToggleExpand={() => setCardsExpanded((open) => !open)}
            onNavigateToPlace={onNavigateToPlace}
          />

          {/* ── BACK: reel preview ─────────────────────────────────────── */}
          <section className="post-flip-face post-flip-back" aria-hidden={!flipped}>
            <PostReelFace post={post} active={flipped} />
            <div className="post-flip-back-scrim" aria-hidden="true" />
            <header className="post-flip-header post-flip-header-back">
              <div className="post-flip-meta" aria-hidden="true" />
              <button
                type="button"
                className="icon-button icon-button-close post-flip-back-close"
                onClick={onClose}
                aria-label="Close"
              />
            </header>
            <button
              type="button"
              className="post-flip-toggle post-flip-toggle-back"
              onClick={() => setFlipped(false)}
            >
              <FlipIcon />
              View details
            </button>
          </section>
        </div>

        {/* ── Side nav arrows: prev / next post (desktop only) ──────── */}
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
      </div>
    </DetailModal>
  );
}
