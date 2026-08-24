import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchPlaceDetail, fetchPost, nativePostId, type Place, type SavedPost } from "../api";
import { categoryLabel } from "../categoryLabels";
import { readPostCardLayout } from "../postCardLayout";
import { formatPostDate, getPlatformLabel, proxiedMediaUrl } from "../postDisplayUtils";
import { DetailModal } from "./DetailModal";
import { PostReelFace } from "./PostMediaPreview";
import { PostPlacesMap } from "./PostPlacesMap";
import {
  buildPlaceSummaries,
  buildReelSummary,
  formatCoordinates,
  mapPlaceStub,
  shortHeading,
  windowedDotIndices,
  type LinkedPlace,
  type PlaceSummary,
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

// ── PlaceCard: one stop in the horizontal scroll list ─────────────────────────

interface PlaceCardProps {
  place: PlaceSummary;
  index: number;
  isActive: boolean;
  onNavigateToPlace?: (placeId: string) => void;
}

function PlaceCard({ place, index, isActive, onNavigateToPlace }: PlaceCardProps) {
  const placeId = place.placeId;
  const canOpenPlace = Boolean(placeId && onNavigateToPlace);
  const tip = place.tips[0];

  return (
    <li className={isActive ? "post-flip-place-item is-active" : "post-flip-place-item"}>
      <span className="post-flip-place-index">{String(index + 1).padStart(2, "0")}</span>
      <div className="post-flip-place-copy">
        {canOpenPlace ? (
          <button
            type="button"
            className="post-flip-place-name"
            onClick={() => onNavigateToPlace?.(placeId!)}
          >
            {place.name}
          </button>
        ) : (
          <p className="post-flip-place-name-static">{place.name}</p>
        )}
        {(place.category ||
          place.locationLine ||
          (place.latitude != null && place.longitude != null)) && (
          <p className="post-flip-place-meta">
            {place.category && (
              <span className="post-flip-place-category">{categoryLabel(place.category)}</span>
            )}
            {place.locationLine && (
              <span className="post-flip-place-location">{place.locationLine}</span>
            )}
            {place.latitude != null && place.longitude != null && (
              <span className="post-flip-place-coords">
                {formatCoordinates(place.latitude, place.longitude)}
              </span>
            )}
          </p>
        )}
        {place.details && <p className="post-flip-place-blurb">{place.details}</p>}
        {tip && <p className="post-flip-place-tip">{tip}</p>}
      </div>
      <div className="post-flip-place-actions">
        {place.mapUrl && (
          <a
            className="text-button post-flip-maps-link"
            href={place.mapUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open in Maps
          </a>
        )}
        {canOpenPlace && (
          <button
            type="button"
            className="text-button place-summary-open"
            onClick={() => onNavigateToPlace?.(placeId!)}
          >
            View place
          </button>
        )}
      </div>
    </li>
  );
}

// ── PostFlipFront: detail + map face ──────────────────────────────────────────

interface PostFlipFrontProps {
  post: SavedPost;
  flipped: boolean;
  placeSummaries: PlaceSummary[];
  overviewPlaces: Place[];
  activePlaceIndex: number;
  activePlaceId: string | null;
  placeListRef: React.RefObject<HTMLUListElement | null>;
  onFlip: () => void;
  onClose: () => void;
  onDelete: () => void;
  scrollToPlaceIndex: (index: number) => void;
  onNavigateToPlace?: (placeId: string) => void;
}

function PostFlipFront({
  post,
  flipped,
  placeSummaries,
  overviewPlaces,
  activePlaceIndex,
  activePlaceId,
  placeListRef,
  onFlip,
  onClose,
  onDelete,
  scrollToPlaceIndex,
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

      <div className="post-flip-map-fill">
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

        {placeSummaries.length > 0 && (
          <PostPlacesMap
            places={overviewPlaces}
            activePlaceId={activePlaceId}
            onSelectPlaceId={(placeId) => {
              const index = placeSummaries.findIndex(
                (place) => (place.placeId ?? place.key) === placeId,
              );
              if (index >= 0) {
                scrollToPlaceIndex(index);
              }
            }}
          />
        )}

        <div className="post-flip-map-places">
          {placeSummaries.length === 0 ? (
            <p className="post-flip-empty">No places extracted from this post yet.</p>
          ) : (
            <>
              <ul className="post-flip-place-list" ref={placeListRef}>
                {placeSummaries.map((place, index) => (
                  <PlaceCard
                    key={place.key}
                    place={place}
                    index={index}
                    isActive={index === activePlaceIndex}
                    onNavigateToPlace={onNavigateToPlace}
                  />
                ))}
              </ul>
              <div className="post-flip-place-pager">
                <p className="post-flip-brief-meta">
                  {activePlaceIndex + 1} / {placeSummaries.length}
                </p>
                {placeSummaries.length > 1 && (
                  <div className="post-flip-place-dots" role="tablist" aria-label="Stops">
                    {windowedDotIndices(placeSummaries.length, activePlaceIndex).map((index) => (
                      <button
                        key={placeSummaries[index]!.key}
                        type="button"
                        role="tab"
                        aria-label={`Stop ${index + 1}: ${placeSummaries[index]!.name}`}
                        aria-selected={index === activePlaceIndex}
                        className={
                          index === activePlaceIndex
                            ? "post-flip-place-dot is-active"
                            : "post-flip-place-dot"
                        }
                        onClick={() => scrollToPlaceIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
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
  const [activePlaceIndex, setActivePlaceIndex] = useState(0);
  const placeListRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let cancelled = false;
    setFlipped(false);
    setActivePlaceIndex(0);

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
  const overviewPlaces = useMemo(
    () => placeSummaries.map(mapPlaceStub).filter((place): place is Place => place != null),
    [placeSummaries],
  );
  const activePlace = placeSummaries[activePlaceIndex] ?? placeSummaries[0];
  const activePlaceId = activePlace ? (activePlace.placeId ?? activePlace.key) : null;

  const scrollToPlaceIndex = useCallback((index: number) => {
    setActivePlaceIndex(index);
    const item = placeListRef.current?.children[index] as HTMLElement | undefined;
    item?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, []);

  useEffect(() => {
    const list = placeListRef.current;
    if (!list) return;
    const items = [...list.querySelectorAll<HTMLElement>(".post-flip-place-item")];
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const index = items.indexOf(visible.target as HTMLElement);
        if (index >= 0) {
          setActivePlaceIndex(index);
        }
      },
      { root: list, threshold: 0.55 },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [placeSummaries.length]);

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
            placeSummaries={placeSummaries}
            overviewPlaces={overviewPlaces}
            activePlaceIndex={activePlaceIndex}
            activePlaceId={activePlaceId}
            placeListRef={placeListRef}
            onFlip={() => setFlipped(true)}
            onClose={onClose}
            onDelete={() => void handleDelete()}
            scrollToPlaceIndex={scrollToPlaceIndex}
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
