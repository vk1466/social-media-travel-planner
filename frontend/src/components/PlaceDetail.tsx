import { useEffect, useState } from "react";

import { fetchPlaceDetail, type CanonicalPlace, type PlaceDetail as PlaceDetailData } from "../api";
import { googleMapsUrl } from "../maps";

interface PlaceDetailProps {
  place: CanonicalPlace;
  onClose: () => void;
  onNavigateToPlace?: (place: CanonicalPlace) => void;
}

function locationBreadcrumb(place: CanonicalPlace): string {
  const { city, state_province: stateProvince, country, continent } = place.location;
  return [city, stateProvince, country, continent].filter(Boolean).join(" · ") || "Location unknown";
}

export function PlaceDetail({ place: initialPlace, onClose, onNavigateToPlace }: PlaceDetailProps) {
  const [detail, setDetail] = useState<PlaceDetailData | null>(null);
  const [loading, setLoading] = useState(true);

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
          setDetail({ place: initialPlace, source_posts: [] });
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const place = detail?.place ?? initialPlace;
  const sourcePosts = detail?.source_posts ?? [];
  const parent = detail?.parent ?? null;
  const children = detail?.children ?? [];
  const mapUrl = googleMapsUrl(place.location);

  return (
    <div className="detail-overlay" onClick={onClose} role="presentation">
      <article
        className="detail-panel"
        onClick={(event) => event.stopPropagation()}
        aria-labelledby="place-detail-title"
      >
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
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        {loading && <p className="detail-muted">Loading latest saved data…</p>}

        {children.length > 0 && (
          <section className="detail-section">
            <h3>Places within this attraction ({children.length})</h3>
            <ul className="detail-list">
              {children.map((child) => (
                <li key={child.place_id}>
                  <button
                    type="button"
                    className="inline-link-button"
                    onClick={() => onNavigateToPlace?.(child)}
                  >
                    {child.display_name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {place.tags.length > 0 && (
          <section className="detail-section">
            <h3>Tags</h3>
            <div className="tag-list">
              {place.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}

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
                  <a href={post.post_url} target="_blank" rel="noreferrer">
                    <span className="badge badge-muted">{post.platform}</span>{" "}
                    {post.caption ? post.caption.slice(0, 80) : post.post_url}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {mapUrl && (
          <section className="detail-section">
            <h3>Map</h3>
            <a className="detail-open-link" href={mapUrl} target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
          </section>
        )}
      </article>
    </div>
  );
}
