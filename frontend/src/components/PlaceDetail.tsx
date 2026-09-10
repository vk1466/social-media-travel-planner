import { useEffect, useMemo, useState } from "react";

import {
  fetchPlaceDetail,
  markPlaceVisited,
  nativePostId,
  unmarkPlaceVisited,
  type Place,
  type PlaceDetail as PlaceDetailData,
} from "../api";
import { googleMapsUrl } from "../maps";
import { factsAttribution, factsStructuredRows } from "../placeFacts";
import { getPlatformLabel, getPostTitle } from "../postDisplayUtils";
import { thumbStyle } from "../postBrowseModel";
import { mappablePlaces } from "../placeMapUtils";
import { DetailModal } from "./DetailModal";
import { CategoryChip } from "./CategoryChip";
import { PostPlacesMap } from "./PostPlacesMap";
import { RelationRail, type RelationRailItem } from "./RelationRail";

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
  const mapUrl = place.google_maps_url || googleMapsUrl(place.location);
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
        onSelect: onNavigateToPost
          ? () => onNavigateToPost(post.platform, nativePostId(post))
          : undefined,
        label: getPostTitle(post),
        sublabel: getPlatformLabel(post),
        background,
        shape: "tile" as const,
      };
    });
  }, [onNavigateToPost, sourcePosts]);

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

  const heroBackground = savedFromItems[0]?.background ?? coverFallback(0);

  return (
    <DetailModal
      titleId="place-detail-title"
      onClose={onClose}
      panelClassName="place-cover-panel"
      overlayClassName="place-cover-overlay"
    >
      <div className="place-cover-detail">
        <aside className="place-cover-hero" style={{ backgroundImage: heroBackground }}>
          <button
            type="button"
            className="place-cover-close"
            onClick={onClose}
            aria-label="Close"
          >
            <span aria-hidden="true">×</span>
          </button>
          <div className="place-cover-hero-caption">
            <span>{place.category || "Saved place"}</span>
            <p>{locationBreadcrumb(place)}</p>
          </div>
        </aside>

        <section className="place-cover-content">
          <header className="place-cover-header">
            <div>
              <p className="place-cover-location">{locationBreadcrumb(place)}</p>
              <h2 id="place-detail-title">{place.display_name}</h2>
              {place.aliases.length > 0 && (
                <p className="place-flip-muted">Also known as {place.aliases.join(", ")}</p>
              )}
            </div>
            <div className="place-cover-actions">
              {mapUrl && (
                <a href={mapUrl} target="_blank" rel="noreferrer">
                  Maps ↗
                </a>
              )}
              <button
                type="button"
                className={isVisited ? "is-visited" : ""}
                onClick={() => void handleToggleVisited()}
                disabled={visitedSaving}
                aria-pressed={isVisited}
              >
                {visitedSaving ? "Saving…" : isVisited ? "✓ Visited" : "Mark visited"}
              </button>
            </div>
          </header>

          <div className="place-cover-tags">
            <CategoryChip category={place.category} small />
            {(place.attributes ?? []).map((attr) => (
              <span key={attr} className="tag-chip tag-chip-small">
                {attr}
              </span>
            ))}
          </div>

          {parent && (
            <p className="place-cover-parent">
              Part of{" "}
              <button
                type="button"
                className="place-flip-inline"
                onClick={() => onNavigateToPlace?.(parent)}
              >
                {parent.display_name}
              </button>
            </p>
          )}
          {visitedError && <p className="banner-error">{visitedError}</p>}
          {loading && <p className="place-flip-muted">Loading latest saved data…</p>}

          <div className="place-flip-body place-cover-scroll">

              {children.length > 0 && (
                <section className="place-flip-section">
                  <h3>Activities &amp; spots here ({children.length})</h3>
                  <ul className="place-flip-list">
                    {children.map((child) => (
                      <li key={child.place_id}>
                        <button
                          type="button"
                          className="place-flip-inline"
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

              <section className="place-flip-section">
                <h3>Facts</h3>
                {detail?.facts_refresh_queued && (
                  <p className="place-flip-muted">Looking up source-backed facts…</p>
                )}
                {place.facts == null && !detail?.facts_refresh_queued && (
                  <p className="place-flip-muted">No source-backed facts yet.</p>
                )}
                {place.facts?.status === "empty" && (
                  <p className="place-flip-muted">No objective facts found for this place.</p>
                )}
                {place.facts && place.facts.status !== "empty" && (
                  <>
                    <dl className="place-facts-list">
                      {factsStructuredRows(place.facts).map((row) => (
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

                    {place.facts.highlights && place.facts.highlights.length > 0 && (
                      <div className="place-facts-insights-block">
                        <h4 className="place-facts-insights-title">✨ Highlights</h4>
                        <ul className="place-facts-insights-pills">
                          {place.facts.highlights.map((item, idx) => (
                            <li key={idx} className="place-facts-highlight-pill">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {place.facts.recommendations && place.facts.recommendations.length > 0 && (
                      <div className="place-facts-insights-block">
                        <h4 className="place-facts-insights-title">🌐 Guide Recommendations</h4>
                        <ul className="place-facts-insights-list">
                          {place.facts.recommendations.map((item, idx) => (
                            <li key={idx} className="place-facts-rec-item">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {place.facts.caveats && place.facts.caveats.length > 0 && (
                      <div className="place-facts-insights-block place-facts-caveats-block">
                        <h4 className="place-facts-insights-title">⚠️ Watch Out</h4>
                        <ul className="place-facts-insights-list">
                          {place.facts.caveats.map((item, idx) => (
                            <li key={idx} className="place-facts-caveat-item">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {factsAttribution(place.facts) && (
                      <p className="place-flip-muted place-facts-attribution">
                        {factsAttribution(place.facts)}
                      </p>
                    )}
                  </>
                )}
              </section>

              {place.details.length > 0 && (
                <section className="place-flip-section">
                  <h3>Details</h3>
                  <ul className="place-flip-list">
                    {place.details.map((detailText) => (
                      <li key={detailText}>{detailText}</li>
                    ))}
                  </ul>
                </section>
              )}

              {place.tips.length > 0 && (
                <section className="place-flip-section">
                  <h3>Tips from Creator ({place.tips.length})</h3>
                  <ul className="place-flip-tips-cards">
                    {place.tips.map((tip, idx) => (
                      <li key={idx} className="place-flip-tip-card">
                        <span className="place-flip-tip-icon" aria-hidden="true">💡</span>
                        <span className="place-flip-tip-text">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <RelationRail
                heading={`Saved from${sourcePosts.length ? ` (${sourcePosts.length})` : ""}`}
                emptyText="No saved posts point here yet."
                items={savedFromItems}
              />

              {mappablePlaces(mapPlaces).length > 0 && (
                <section className="place-flip-section">
                  <h3>Map</h3>
                  <PostPlacesMap places={mapPlaces} />
                  {mapUrl && (
                    <a
                      className="place-flip-inline place-flip-maps"
                      href={mapUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps
                    </a>
                  )}
                </section>
              )}
          </div>
        </section>
      </div>
    </DetailModal>
  );
}
