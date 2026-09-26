import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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
import { compactMentionDetails } from "../mentionDetails";
import { getPlatformLabel, getPostTitle } from "../postDisplayUtils";
import { thumbStyle } from "../postBrowseModel";
import { CategoryChip } from "./CategoryChip";
import { DetailModal } from "./DetailModal";
import { RelationRail, type RelationRailItem } from "./RelationRail";

function GoogleMapsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#34A853" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <path fill="#FBBC04" d="M12 2v20s7-7.75 7-13a7 7 0 0 0-7-7z" />
      <path fill="#EA4335" d="M12 9v13s7-7.75 7-13H12z" />
      <path fill="#4285F4" d="M5 9a7 7 0 0 0 1.76 4.7L12 22V9H5z" />
      <circle cx="12" cy="9" r="3.15" fill="#1A73E8" />
      <circle cx="12" cy="9" r="1.45" fill="var(--on-fill)" />
    </svg>
  );
}

interface PlaceDetailProps {
  place: Place;
  visited?: boolean;
  onClose: () => void;
  onNavigateToPlace?: (place: Place) => void;
  onNavigateToPost?: (platform: string, postId: string) => void;
  onVisitedChange?: (placeId: string, visited: boolean) => void;
}

function locationBreadcrumb(place: Place): string {
  const {
    city,
    state_province: stateProvince,
    country,
    continent,
  } = place.location;
  return (
    [city, stateProvince, country, continent].filter(Boolean).join(" · ") ||
    "Location unknown"
  );
}

export function PlaceDetail({
  place: initialPlace,
  visited = false,
  onClose,
  onNavigateToPlace,
  onNavigateToPost,
  onVisitedChange,
}: PlaceDetailProps) {
  const navigate = useNavigate();
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
        if (!cancelled) setDetail(fresh);
      } catch {
        if (!cancelled) {
          setDetail({ place: initialPlace, source_posts: [], children: [] });
        }
      } finally {
        if (!cancelled) setLoading(false);
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
  const facts = place.facts;
  const whyGoDetails = useMemo(() => {
    const rawDetails = compactMentionDetails(place.details, place.display_name);
    if (!place.summary) return rawDetails;
    const lowerSummary = place.summary.toLowerCase();
    return rawDetails.filter((detail) => {
      const lower = detail.toLowerCase().trim();
      if (!lower) return false;
      return !lowerSummary.includes(lower) && !lower.includes(lowerSummary);
    });
  }, [place.details, place.display_name, place.summary]);
  const factRows =
    facts && facts.status !== "empty" ? factsStructuredRows(facts) : [];

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
      return {
        key: post.post_id,
        to: `/posts/${post.platform}/${nativePostId(post)}`,
        onSelect: onNavigateToPost
          ? () => onNavigateToPost(post.platform, nativePostId(post))
          : undefined,
        label: getPostTitle(post),
        sublabel: getPlatformLabel(post),
        background:
          typeof style.backgroundImage === "string"
            ? style.backgroundImage
            : post.thumbnail_url
              ? `url(${post.thumbnail_url})`
              : "var(--theme-soft)",
        shape: "tile",
      };
    });
  }, [onNavigateToPost, sourcePosts]);
  const heroBackground =
    savedFromItems[0]?.background ??
    "linear-gradient(145deg, var(--theme-mid), var(--theme-fill))";

  const handleToggleVisited = async () => {
    setVisitedError(null);
    setVisitedSaving(true);
    const next = !isVisited;
    try {
      if (next) await markPlaceVisited(place.place_id);
      else await unmarkPlaceVisited(place.place_id);
      setIsVisited(next);
      onVisitedChange?.(place.place_id, next);
    } catch (err) {
      setVisitedError(
        err instanceof Error ? err.message : "Failed to update visited status",
      );
    } finally {
      setVisitedSaving(false);
    }
  };

  return (
    <DetailModal
      titleId="place-detail-title"
      onClose={onClose}
      panelClassName="place-cover-panel"
      overlayClassName="place-cover-overlay"
    >
      <div className="place-decision-detail">
        <aside
          className="place-decision-hero"
          style={{ backgroundImage: heroBackground }}
          aria-label={`${place.display_name} cover image`}
        >
          <div className="place-decision-hero-caption">
            <span>{place.category || "Saved place"}</span>
            <p>{locationBreadcrumb(place)}</p>
          </div>
        </aside>

        <div className="place-decision-top-controls">
          <button
            type="button"
            className="place-cover-close place-decision-home-btn"
            onClick={() => {
              onClose();
              navigate("/");
            }}
            aria-label="Go to Home view"
            title="Go to Home view"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </button>
          <button
            type="button"
            className="place-cover-close place-decision-close"
            onClick={onClose}
            aria-label="Close"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="place-decision-content">
        <header className="place-decision-header">
          <div className="place-decision-identity">
            <p className="place-cover-location">
              <Link to="/" className="place-decision-home-link" title="Go to Home view">
                Home
              </Link>
              <span className="place-crumb-sep" aria-hidden="true"> · </span>
              {locationBreadcrumb(place)}
            </p>
            <h2 id="place-detail-title">{place.display_name}</h2>
            {place.aliases.length > 0 && (
              <p className="place-flip-muted">
                Also known as {place.aliases.join(", ")}
              </p>
            )}
            <div className="place-cover-tags">
              <CategoryChip category={place.category} small />
              {(place.attributes ?? []).map((attribute) => (
                <span key={attribute} className="tag-chip tag-chip-small">
                  {attribute}
                </span>
              ))}
            </div>
          </div>
          <div className="place-cover-actions place-decision-actions">
            {mapUrl && (
              <a
                className="place-decision-map-icon"
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open ${place.display_name} in Google Maps`}
                title="Open in Google Maps"
              >
                <GoogleMapsIcon />
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
        {loading && (
          <p className="place-flip-muted place-decision-status">
            Loading latest saved data…
          </p>
        )}

        <div className="place-decision-grid">
          <main className="place-decision-main">
            {place.summary && (
              <div className="place-intuitive-summary">
                <span className="place-intuitive-summary-label">
                  <span aria-hidden="true">✦</span> Overview
                </span>
                <p className="place-intuitive-summary-text">{place.summary}</p>
              </div>
            )}

            {factRows.length > 0 && (
              <div className="place-quick-facts-grid">
                {factRows.map((row) => (
                  <div key={row.label} className="place-quick-fact-card">
                    <span className="place-quick-fact-label">{row.label}</span>
                    <span className="place-quick-fact-value">
                      {row.label === "Website" ? (
                        <a href={row.value} target="_blank" rel="noreferrer">
                          Visit website ↗
                        </a>
                      ) : (
                        row.value
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <details className="place-decision-section place-why-go" open>
              <summary><h3>Why go</h3></summary>
              {whyGoDetails.length > 0 ? (
                <ul className="place-decision-summary">
                  {whyGoDetails.map((text) => <li key={text}>{text}</li>)}
                </ul>
              ) : null}
              {facts?.highlights && facts.highlights.length > 0 && (
                <div className="place-fact-highlights">
                  <span className="place-decision-label">Objective highlights</span>
                  <ul>
                    {facts.highlights.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
              {whyGoDetails.length === 0 && !(facts?.highlights && facts.highlights.length > 0) ? (
                <p className="place-flip-muted">
                  A saved place worth keeping on your shortlist.
                </p>
              ) : null}
            </details>

            {(facts?.recommendations?.length || facts?.caveats?.length) ? (
              <details className="place-decision-section" open>
                <summary><h3>Know before you go</h3></summary>
                <div className="place-advice-grid">
                  {facts.recommendations && facts.recommendations.length > 0 && (
                    <div className="place-advice-block">
                      <span className="place-decision-label">Recommendations</span>
                      <ul>{facts.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  )}
                  {facts.caveats && facts.caveats.length > 0 && (
                    <div className="place-advice-block place-advice-caveat">
                      <span className="place-decision-label">Caveats</span>
                      <ul>{facts.caveats.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                  )}
                </div>
              </details>
            ) : null}

            {place.tips.length > 0 && (
              <details className="place-decision-section" open>
                <summary>
                  <h3>
                    Creator tips &amp; insights{" "}
                    <span className="place-section-count">{place.tips.length}</span>
                  </h3>
                </summary>
                <ul className="place-flip-tips-cards">
                  {place.tips.map((tip, index) => (
                    <li key={index} className="place-flip-tip-card">
                      <span className="place-flip-tip-icon" aria-hidden="true">💡</span>
                      <span className="place-flip-tip-text">{tip}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {children.length > 0 && (
              <details className="place-decision-section">
                <summary><h3>Related spots <span className="place-section-count">{children.length}</span></h3></summary>
                <ul className="place-related-spots">
                  {children.map((child) => (
                    <li key={child.place_id}>
                      <button type="button" className="place-flip-inline" onClick={() => onNavigateToPlace?.(child)}>{child.display_name}</button>
                      <span>
                        <CategoryChip category={child.category} small />
                        {(child.attributes ?? []).map((attribute) => <span key={attribute} className="tag-chip tag-chip-small">{attribute}</span>)}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </main>

          <aside className="place-decision-rail">
            <details className="place-rail-card place-objective-facts" open>
              <summary><h3>At a glance</h3></summary>
              {detail?.facts_refresh_queued && <p className="place-flip-muted">Looking up source-backed facts…</p>}
              {!detail?.facts_refresh_queued && !facts && <p className="place-flip-muted">No source-backed facts yet.</p>}
              {facts?.status === "empty" && <p className="place-flip-muted">No objective facts found for this place.</p>}
              {factRows.length > 0 && (
                <dl className="place-facts-list">
                  {factRows.map((row) => (
                    <div key={row.label} className="place-facts-row">
                      <dt>{row.label}</dt>
                      <dd>{row.label === "Website" ? <a href={row.value} target="_blank" rel="noreferrer">{row.value}</a> : row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {facts && factsAttribution(facts) && <p className="place-flip-muted place-facts-attribution">{factsAttribution(facts)}</p>}
            </details>
            <details className="place-saved-from-section">
              <summary><h3>Saved from{sourcePosts.length ? ` (${sourcePosts.length})` : ""}</h3></summary>
              <RelationRail heading="" emptyText="No saved posts point here yet." items={savedFromItems} />
            </details>
          </aside>
        </div>
        </div>
      </div>
    </DetailModal>
  );
}
