import { useEffect, useMemo, useState, lazy, Suspense } from "react";

import {
  fetchPlaceDetail,
  markPlaceVisited,
  nativePostId,
  unmarkPlaceVisited,
  type Place,
  type PlaceDetail as PlaceDetailData,
} from "../api";
import { googleMapsUrl } from "../maps";
import { factsAttribution, factsRows } from "../placeFacts";
import { getPlatformLabel, getPostTitle } from "../postDisplayUtils";
import { thumbStyle } from "../postBrowseModel";
import { DetailModal } from "./DetailModal";
import { CategoryChip } from "./CategoryChip";
import { mappablePlaces } from "../placeMapUtils";
import { RelationRail, type RelationRailItem } from "./RelationRail";

const PlaceMap = lazy(() => import("./PlaceMap").then((module) => ({ default: module.PlaceMap })));

interface PlaceDetailProps {
  place: Place;
  visited?: boolean;
  onClose: () => void;
  onNavigateToPlace?: (place: Place) => void;
  onNavigateToPost?: (platform: string, postId: string) => void;
  onVisitedChange?: (placeId: string, visited: boolean) => void;
}

function locationBreadcrumb(place: Place): string {
  const { city, state_province: stateProvince, country, continent } = place.location;
  return [city, stateProvince, country, continent].filter(Boolean).join(" · ") || "Location unknown";
}

const FALLBACK_HUES = [152, 28, 205, 168, 42];

function coverFallback(index: number): string {
  const hue = FALLBACK_HUES[index % FALLBACK_HUES.length];
  return `linear-gradient(145deg, hsl(${hue} 28% 42%), hsl(${hue + 30} 18% 22%))`;
}

export function PlaceDetail({
  place: initialPlace,
  visited = false,
  onClose,
  onNavigateToPlace,
  onNavigateToPost,
  onVisitedChange,
}: PlaceDetailProps) {
  const [detail, setDetail] = useState<PlaceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isVisited, setIsVisited] = useState(visited);
  const [visitedSaving, setVisitedSaving] = useState(false);
  const [visitedError, setVisitedError] = useState<string | null>(null);

  useEffect(() => {
    setIsVisited(visited);
  }, [visited, initialPlace.place_id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const fresh = await fetchPlaceDetail(initialPlace.place_id);
        if (!cancelled) {
          setDetail(fresh);
        }
      } catch {
        if (!cancelled) {
          setDetail({ place: initialPlace, source_posts: [], children: [] });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [initialPlace]);

  const place = detail?.place ?? initialPlace;
  const sourcePosts = detail?.source_posts ?? [];
  const parent = detail?.parent ?? null;
  const children = detail?.children ?? [];
  const mapUrl = googleMapsUrl(place.location);
  const mapPlaces = useMemo(() => [place, ...children], [place, children]);
  const savedFromItems = useMemo((): RelationRailItem[] => {
    return sourcePosts.map((post, index) => {
      const style = thumbStyle(
        {
          key: post.post_id,
          platform: post.platform,
          platformLabel: getPlatformLabel(post),
          title: getPostTitle(post),
          description: "",
          placeNames: [],
          placeCount: 0,
          tags: [],
          dateLabel: "",
          dayKey: "",
          monthKey: "",
          monthLabel: "",
          timestamp: 0,
          thumbnailUrl: post.thumbnail_url ?? null,
          author: post.author_handle ?? null,
          postUrl: post.post_url,
          aspect: 1,
        },
        index,
      );
      const background =
        typeof style.backgroundImage === "string"
          ? style.backgroundImage
          : post.thumbnail_url
            ? `url(${post.thumbnail_url})`
            : coverFallback(index);
      return {
        key: post.post_id,
        to: `/posts/${post.platform}/${nativePostId(post)}`,
        label: getPostTitle(post),
        sublabel: getPlatformLabel(post),
        background,
        shape: "tile" as const,
      };
    });
  }, [sourcePosts]);

  const handleToggleVisited = async () => {
    setVisitedError(null);
    setVisitedSaving(true);
    const next = !isVisited;
    try {
      if (next) {
        await markPlaceVisited(place.place_id);
      } else {
        await unmarkPlaceVisited(place.place_id);
      }
      setIsVisited(next);
      onVisitedChange?.(place.place_id, next);
    } catch (err) {
      setVisitedError(err instanceof Error ? err.message : "Failed to update visited status");
    } finally {
      setVisitedSaving(false);
    }
  };

  return (
    <DetailModal titleId="place-detail-title" onClose={onClose}>
      <header className="detail-header">
        <div>
          {parent && (
            <p className="detail-eyebrow">
              Part of{" "}
              <button
                type="button"
                className="inline-link-button"
                onClick={() => onNavigateToPlace?.(parent)}
              >
                {parent.display_name}
              </button>
            </p>
          )}
          <p className="detail-eyebrow">{locationBreadcrumb(place)}</p>
          <h2 id="place-detail-title">{place.display_name}</h2>
          {place.aliases.length > 0 && (
            <p className="detail-muted">also known as {place.aliases.join(", ")}</p>
          )}
          <div className="place-visited-row">
            <button
              type="button"
              className={isVisited ? "visited-button visited-button-active" : "visited-button"}
              onClick={() => void handleToggleVisited()}
              disabled={visitedSaving}
              aria-pressed={isVisited}
            >
              {visitedSaving ? "Saving…" : isVisited ? "Visited" : "Mark as visited"}
            </button>
            {isVisited && <span className="place-visited-hint">In your travel history</span>}
          </div>
          {visitedError && <p className="banner-error">{visitedError}</p>}
        </div>
        <button type="button" className="icon-button icon-button-close" onClick={onClose} aria-label="Close" />
      </header>

      {loading && <p className="detail-muted">Loading latest saved data…</p>}

      {children.length > 0 && (
        <section className="detail-section">
          <h3>Activities &amp; spots here ({children.length})</h3>
          <ul className="detail-list place-child-detail-list">
            {children.map((child) => (
              <li key={child.place_id}>
                <button
                  type="button"
                  className="inline-link-button"
                  onClick={() => onNavigateToPlace?.(child)}
                >
                  {child.display_name}
                </button>
                <span className="place-child-tags">
                  <CategoryChip category={child.category} small />
                  {(child.attributes ?? []).map((attr) => (
                    <span key={attr} className="tag-chip tag-chip-small">
                      {attr}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="detail-section">
        <h3>Category</h3>
        <div className="tag-list">
          <CategoryChip category={place.category} />
          {(place.attributes ?? []).map((attr) => (
            <span key={attr} className="tag-chip">
              {attr}
            </span>
          ))}
        </div>
      </section>

      <section className="detail-section">
        <h3>Facts</h3>
        {detail?.facts_refresh_queued && (
          <p className="detail-muted">Looking up source-backed facts…</p>
        )}
        {place.facts == null && !detail?.facts_refresh_queued && (
          <p className="detail-muted">No source-backed facts yet.</p>
        )}
        {place.facts?.status === "empty" && (
          <p className="detail-muted">No objective facts found for this place.</p>
        )}
        {place.facts && place.facts.status !== "empty" && (
          <>
            <dl className="place-facts-list">
              {factsRows(place.facts).map((row) => (
                <div key={row.label} className="place-facts-row">
                  <dt>{row.label}</dt>
                  <dd>
                    {row.label === "Website" ? (
                      <a href={row.value} target="_blank" rel="noreferrer">
                        {row.value}
                      </a>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
            {factsAttribution(place.facts) && (
              <p className="detail-muted place-facts-attribution">
                {factsAttribution(place.facts)}
              </p>
            )}
          </>
        )}
      </section>

      {place.details.length > 0 && (
        <section className="detail-section">
          <h3>Details</h3>
          <ul className="detail-list">
            {place.details.map((detailText) => (
              <li key={detailText}>{detailText}</li>
            ))}
          </ul>
        </section>
      )}

      {place.tips.length > 0 && (
        <section className="detail-section">
          <h3>Tips</h3>
          <ul className="detail-list">
            {place.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="detail-section">
        <h3>Source posts ({sourcePosts.length})</h3>
        {sourcePosts.length === 0 ? (
          <p className="detail-muted">No saved posts found for this place.</p>
        ) : (
          <ul className="detail-list source-post-list">
            {sourcePosts.map((post) => (
              <li key={`${post.platform}-${post.post_id}`}>
                {onNavigateToPost ? (
                  <button
                    type="button"
                    className="inline-link-button source-post-button"
                    onClick={() => onNavigateToPost(post.platform, nativePostId(post))}
                  >
                    <span className="badge badge-muted">{post.platform}</span>{" "}
                    {post.caption ? post.caption.slice(0, 80) : post.post_url}
                  </button>
                ) : (
                  <a href={post.post_url} target="_blank" rel="noreferrer">
                    <span className="badge badge-muted">{post.platform}</span>{" "}
                    {post.caption ? post.caption.slice(0, 80) : post.post_url}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <RelationRail
        heading="Saved from"
        emptyText="No saved posts point here yet."
        items={savedFromItems}
      />

      {mappablePlaces(mapPlaces).length > 0 && (
        <section className="detail-section">
          <h3>Map</h3>
          <Suspense fallback={<p className="loading-copy">Loading map…</p>}>
            <PlaceMap places={mapPlaces} height="240px" showCaption={false} />
          </Suspense>
          {mapUrl && (
            <a
              className="detail-open-link detail-map-link"
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open in Google Maps
            </a>
          )}
        </section>
      )}
    </DetailModal>
  );
}
