import { useEffect, useMemo, useState, lazy, Suspense } from "react";

import { fetchPlaceDetail, nativePostId, type Place, type PlaceDetail as PlaceDetailData } from "../api";
import { googleMapsUrl } from "../maps";
import { DetailModal } from "./DetailModal";
import { mappablePlaces } from "../placeMapUtils";

const PlaceMap = lazy(() => import("./PlaceMap").then((module) => ({ default: module.PlaceMap })));

interface PlaceDetailProps {
  place: Place;
  onClose: () => void;
  onNavigateToPlace?: (place: Place) => void;
  onNavigateToPost?: (platform: string, postId: string) => void;
}

function locationBreadcrumb(place: Place): string {
  const { city, state_province: stateProvince, country, continent } = place.location;
  return [city, stateProvince, country, continent].filter(Boolean).join(" · ") || "Location unknown";
}

export function PlaceDetail({
  place: initialPlace,
  onClose,
  onNavigateToPlace,
  onNavigateToPost,
}: PlaceDetailProps) {
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
                {child.category && (
                  <span className="place-child-tags">
                    <span className="tag-chip tag-chip-small">{child.category}</span>
                    {(child.attributes ?? []).map((attr) => (
                      <span key={attr} className="tag-chip tag-chip-small">
                        {attr}
                      </span>
                    ))}
                  </span>
                )}
                {!child.category && (
                  <span className="place-child-tags">
                    <span className="tag-chip tag-chip-small">Uncategorized</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="detail-section">
        <h3>Category</h3>
        <div className="tag-list">
          <span className="tag-chip">{place.category ?? "Uncategorized"}</span>
          {(place.attributes ?? []).map((attr) => (
            <span key={attr} className="tag-chip">
              {attr}
            </span>
          ))}
        </div>
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
