import { useEffect, useState } from "react";

import { fetchPlaceDetail, fetchPost, type SavedPost } from "../api";
import { googleMapsUrl } from "../maps";
import { DetailModal } from "./DetailModal";

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

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  return (
    <div className="detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function isVideoPost(post: SavedPost): boolean {
  return post.media_kind === "reel" || post.media_kind === "video";
}

export function PostDetail({
  post: initialPost,
  onClose,
  onDelete,
  onNavigateToPlace,
}: PostDetailProps) {
  const [post, setPost] = useState(initialPost);
  const [loading, setLoading] = useState(true);
  const [linkedPlaces, setLinkedPlaces] = useState<LinkedPlace[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadFreshPost() {
      setLoading(true);
      try {
        const fresh = await fetchPost(initialPost.platform, initialPost.post_id);
        if (!cancelled) {
          setPost(fresh);
        }
      } catch {
        if (!cancelled) {
          setPost(initialPost);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
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

  return (
    <DetailModal titleId="post-detail-title" onClose={onClose}>
      <header className="detail-header">
        <div>
          <p className="detail-eyebrow">{post.platform}</p>
          <h2 id="post-detail-title">@{post.author_handle || "unknown"}</h2>
          <div className="detail-badges">
            <span className="badge">{post.media_kind}</span>
            <span className="badge badge-muted">{post.post_id}</span>
          </div>
        </div>
        <button type="button" className="icon-button icon-button-close" onClick={onClose} aria-label="Close" />
      </header>

      {loading && <p className="detail-muted">Loading latest saved data…</p>}

      <section className="detail-section">
        <h3>Caption</h3>
        <p className="detail-text">{post.caption || "No caption"}</p>
      </section>

      {post.hashtags.length > 0 && (
        <section className="detail-section">
          <h3>Hashtags</h3>
          <div className="tag-list">
            {post.hashtags.map((tag) => (
              <span key={tag} className="tag-chip">
                #{tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {linkedPlaces.length > 0 && (
        <section className="detail-section">
          <h3>Places in library</h3>
          <ul className="detail-list">
            {linkedPlaces.map((linked) => (
              <li key={linked.placeId}>
                {onNavigateToPlace ? (
                  <button
                    type="button"
                    className="inline-link-button"
                    onClick={() => onNavigateToPlace(linked.placeId)}
                  >
                    {linked.displayName}
                  </button>
                ) : (
                  linked.displayName
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {isVideoPost(post) && (
        <section className="detail-section">
          <h3>Extracted places</h3>
          {post.extracted_places.length === 0 ? (
            <p className="detail-note">
              No places were extracted from this reel. Re-ingest with{" "}
              <strong>Re-fetch already saved</strong> checked if the transcript or
              OpenAI extraction was unavailable.
            </p>
          ) : (
            <div className="extracted-places">
              {post.extracted_places.map((place) => (
                <article
                  key={`${place.place_name}-${place.city}-${place.country}`}
                  className="extracted-place-card"
                >
                  <h4>{place.place_name}</h4>
                  {(place.city || place.country || place.state_province) && (
                    <p className="detail-muted">
                      {[place.city, place.state_province, place.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {place.parent_place_name && (
                    <p className="detail-muted">
                      Inside{" "}
                      <strong>{place.parent_place_name}</strong>
                    </p>
                  )}
                  {place.tags.length > 0 && (
                    <div className="tag-list">
                      {place.tags.map((tag) => (
                        <span key={tag} className="tag-chip tag-chip-small">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {place.details && <p className="detail-text">{place.details}</p>}
                  {place.tips.length > 0 && (
                    <div>
                      <p className="extracted-label">Tips</p>
                      <ul className="detail-list">
                        {place.tips.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {post.places.length > 0 && (
        <section className="detail-section">
          <h3>Tagged location</h3>
          <ul className="detail-list">
            {post.places.map((place) => {
              const mapUrl = googleMapsUrl({
                display_name: place.place_name,
                city: place.city,
                country: place.country,
                latitude: place.latitude,
                longitude: place.longitude,
              });
              return (
                <li key={`${place.place_name}-${place.latitude}-${place.longitude}`}>
                  <strong>{place.place_name}</strong>
                  {[place.city, place.country].filter(Boolean).join(", ")}
                  {mapUrl && (
                    <>
                      {" "}
                      <a href={mapUrl} target="_blank" rel="noreferrer">
                        View on Google Maps
                      </a>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="detail-section">
        <h3>Metadata</h3>
        <dl className="detail-metadata">
          <DetailRow label="Post URL" value={post.post_url} />
          <DetailRow label="Posted at" value={formatDate(post.posted_at)} />
          <DetailRow label="Fetched at" value={formatDate(post.fetched_at)} />
          <DetailRow
            label="Likes"
            value={post.like_count != null ? post.like_count.toLocaleString() : null}
          />
        </dl>
      </section>

      <footer className="detail-footer">
        <a className="primary-button detail-open-link" href={post.post_url} target="_blank" rel="noreferrer">
          Open original post
        </a>
        <button
          type="button"
          className="danger-button"
          onClick={async () => {
            if (!window.confirm("Delete this saved post?")) {
              return;
            }
            await onDelete();
            onClose();
          }}
        >
          Delete
        </button>
      </footer>
    </DetailModal>
  );
}
