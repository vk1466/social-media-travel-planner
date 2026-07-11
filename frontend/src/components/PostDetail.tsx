import { useEffect, useMemo, useState } from "react";

import { fetchPlaceDetail, fetchPost, nativePostId, type ExtractedPlace, type PlatformPlace, type SavedPost } from "../api";
import { googleMapsUrl } from "../maps";
import {
  formatPostDate,
  getCaptionExcerpt,
  getPlatformLabel,
  getPostTitle,
  proxiedMediaUrl,
} from "../postDisplayUtils";
import { DetailModal } from "./DetailModal";
import { PostReelFace } from "./PostMediaPreview";

interface PostDetailProps {
  post: SavedPost;
  onClose: () => void;
  onDelete: () => Promise<void>;
  onNavigateToPlace?: (placeId: string) => void;
}

interface LinkedPlace {
  placeId: string;
  displayName: string;
}

interface PlaceSummary {
  key: string;
  name: string;
  placeId?: string;
  locationLine?: string;
  parentPlaceName?: string | null;
  tags: string[];
  details?: string | null;
  tips: string[];
  mapUrl?: string | null;
}

function locationFromExtracted(place: ExtractedPlace): string | undefined {
  const parts = [place.city, place.state_province, place.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function locationFromTagged(place: PlatformPlace): string | undefined {
  const parts = [place.city, place.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

function buildPlaceSummaries(post: SavedPost, linkedPlaces: LinkedPlace[]): PlaceSummary[] {
  const linkedByIndex = new Map(linkedPlaces.map((linked, index) => [index, linked]));
  const count = Math.max(post.extracted_places.length, post.place_ids.length);

  if (count > 0) {
    const summaries: PlaceSummary[] = [];
    for (let index = 0; index < count; index += 1) {
      const extracted = post.extracted_places[index];
      const linked = linkedByIndex.get(index) ?? (
        post.place_ids[index]
          ? { placeId: post.place_ids[index], displayName: post.place_ids[index] }
          : undefined
      );

      if (extracted) {
        summaries.push({
          key: linked?.placeId ?? `${extracted.place_name}-${index}`,
          name: linked?.displayName ?? extracted.place_name,
          placeId: linked?.placeId,
          locationLine: locationFromExtracted(extracted),
          parentPlaceName: extracted.parent_place_name,
          tags: extracted.tags,
          details: extracted.details,
          tips: extracted.tips,
        });
        continue;
      }

      if (linked) {
        summaries.push({
          key: linked.placeId,
          name: linked.displayName,
          placeId: linked.placeId,
          tags: [],
          tips: [],
        });
      }
    }
    return summaries;
  }

  return post.places.map((place, index) => {
    const mapUrl = googleMapsUrl({
      display_name: place.place_name,
      city: place.city,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    return {
      key: `${place.place_name}-${place.latitude}-${place.longitude}-${index}`,
      name: place.place_name,
      locationLine: locationFromTagged(place),
      tags: [],
      tips: [],
      mapUrl,
    };
  });
}

function captionFallbackSummary(post: SavedPost): string {
  const caption = post.caption?.trim() ?? "";
  if (!caption) {
    return "";
  }
  const lines = caption
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1) {
    return lines.slice(1).join(" ");
  }
  return caption;
}

function shortHeading(post: SavedPost): string {
  const title = getPostTitle(post);
  if (title.length <= 56) {
    return title;
  }
  return `${title.slice(0, 53).trimEnd()}…`;
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

export function PostDetail({
  post: initialPost,
  onClose,
  onDelete,
  onNavigateToPlace,
}: PostDetailProps) {
  const [post, setPost] = useState(initialPost);
  const [linkedPlaces, setLinkedPlaces] = useState<LinkedPlace[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFlipped(false);
    setSummaryExpanded(false);

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
            return { placeId, displayName: detail.place.display_name };
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
  const heading = shortHeading(post);
  const llmSummary = post.reel_summary?.trim() ?? "";
  const fallbackSummary = captionFallbackSummary(post);
  const reelSummary = llmSummary || fallbackSummary;
  // Avoid repeating the same caption as both heading and summary.
  const showHeading =
    Boolean(heading) &&
    (!reelSummary ||
      Boolean(llmSummary) ||
      !reelSummary.toLowerCase().startsWith(heading.replace(/…$/, "").toLowerCase().slice(0, 24)));
  const summaryExcerpt = getCaptionExcerpt(reelSummary, 240);
  const canExpandSummary = summaryExcerpt.truncated;
  const dateLabel = formatPostDate(post);
  const platformLabel = getPlatformLabel(post);
  const thumbUrl = proxiedMediaUrl(post.thumbnail_url);
  const thumbStyle = thumbUrl
    ? { backgroundImage: `url("${thumbUrl}")` }
    : undefined;

  return (
    <DetailModal
      titleId="post-detail-title"
      onClose={onClose}
      panelClassName="detail-panel-flip"
    >
      <div className={flipped ? "post-flip is-flipped" : "post-flip"}>
        <div className="post-flip-inner">
          <section className="post-flip-face post-flip-front" aria-hidden={flipped}>
            <div className="post-flip-front-wash" aria-hidden="true" />
            <div className="post-flip-front-glow" aria-hidden="true" />
            {thumbStyle && (
              <div className="post-flip-front-thumb" style={thumbStyle} aria-hidden="true" />
            )}

            <header className="post-flip-header">
              <div className="post-flip-meta">
                <p className="post-flip-eyebrow">
                  {platformLabel}
                  {post.author_handle ? ` · @${post.author_handle}` : ""}
                </p>
                <div className="detail-badges">
                  <span className="badge">{post.media_kind}</span>
                  {dateLabel && <span className="badge badge-muted">{dateLabel}</span>}
                </div>
              </div>
              <button
                type="button"
                className="icon-button icon-button-close"
                onClick={onClose}
                aria-label="Close"
              />
            </header>

            <div className="post-flip-front-body">
              <section className="post-flip-intro">
                {showHeading && (
                  <h2 id="post-detail-title" className="post-flip-heading">
                    {heading}
                  </h2>
                )}
                {reelSummary && (
                  <>
                    <p
                      id={showHeading ? undefined : "post-detail-title"}
                      className="post-flip-summary"
                    >
                      {summaryExpanded || !canExpandSummary
                        ? reelSummary
                        : summaryExcerpt.text}
                    </p>
                    {canExpandSummary && (
                      <button
                        type="button"
                        className="text-button post-caption-toggle"
                        onClick={() => setSummaryExpanded((open) => !open)}
                      >
                        {summaryExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </>
                )}
                {!showHeading && !reelSummary && (
                  <h2 id="post-detail-title" className="post-flip-heading">
                    {heading || "Saved post"}
                  </h2>
                )}
              </section>

              <section className="post-flip-places">
                <h3>
                  {placeSummaries.length > 0
                    ? `Places (${placeSummaries.length})`
                    : "Places"}
                </h3>
                {placeSummaries.length === 0 ? (
                  <p className="post-flip-empty">No places extracted from this post yet.</p>
                ) : (
                  <ul className="post-flip-place-list">
                    {placeSummaries.map((place) => {
                      const placeId = place.placeId;
                      const canOpenPlace = Boolean(placeId && onNavigateToPlace);
                      return (
                        <li key={place.key} className="post-flip-place-item">
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
                            {place.locationLine && (
                              <p className="post-flip-place-location">{place.locationLine}</p>
                            )}
                            {place.details && (
                              <p className="post-flip-place-blurb">{place.details}</p>
                            )}
                          </div>
                          {canOpenPlace && (
                            <button
                              type="button"
                              className="text-button place-summary-open"
                              onClick={() => onNavigateToPlace?.(placeId!)}
                            >
                              View place →
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            <footer className="post-flip-footer">
              <button
                type="button"
                className="post-flip-toggle"
                onClick={() => setFlipped(true)}
              >
                <FlipIcon />
                View reel
              </button>
              <button
                type="button"
                className="icon-button post-flip-delete-icon"
                aria-label="Delete post"
                title="Delete"
                onClick={async () => {
                  if (!window.confirm("Delete this saved post?")) {
                    return;
                  }
                  await onDelete();
                  onClose();
                }}
              >
                <DeleteIcon />
              </button>
            </footer>
          </section>

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
      </div>
    </DetailModal>
  );
}
