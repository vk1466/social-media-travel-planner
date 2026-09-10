import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  fetchPlaceDetail,
  markPlaceVisited,
  unmarkPlaceVisited,
  type Place,
  type PlaceDetail,
  type SavedPost,
} from "../api";
import { coverArt, groupPlaces, locationLine, mapsUrl, postTitle, proxiedMediaUrl } from "../display";
import { DetailSheet } from "../components/DetailSheet";
import { EmptyState, Toolbar } from "../components/Toolbar";
import { PageHeading } from "../components/Shell";

export function TravelPage({
  places,
  posts,
  visitedIds,
  onVisitedChange,
}: {
  places: Place[];
  posts: SavedPost[];
  visitedIds: string[];
  onVisitedChange: () => void;
}) {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const visited = useMemo(() => new Set(visitedIds), [visitedIds]);
  const grouped = useMemo(() => groupPlaces(places), [places]);

  const filtered = grouped.filter(({ place, children }) => {
    const isVisited = visited.has(place.place_id) || children.some((child) => visited.has(child.place_id));
    if (status === "Visited" && !isVisited) return false;
    if (status === "Want to go" && isVisited) return false;
    const haystack = [place.display_name, locationLine(place), ...children.map((child) => child.display_name)]
      .join(" ")
      .toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  });

  const selected = places.find((place) => place.place_id === placeId) ?? null;

  return (
    <>
      <PageHeading
        kicker="Your atlas"
        title="Travel"
        lede="Saved places, trips, and visit context get a spatial page of their own."
        action={{ label: "Add links", onClick: () => navigate("/add") }}
      />
      <div className="travel-subnav">
        <button type="button" className="is-on">
          Places
        </button>
      </div>
      <Toolbar
        placeholder="Search places"
        query={query}
        onQuery={setQuery}
        options={["All", "Want to go", "Visited"]}
        selected={status}
        onSelect={setStatus}
      />
      {filtered.length === 0 ? (
        <EmptyState>No places in this view yet.</EmptyState>
      ) : (
        <div className="media-grid is-places">
          {filtered.map(({ place, children }) => {
            const source = posts.find((post) => place.source_post_ids.includes(post.post_id));
            const image = proxiedMediaUrl(source?.thumbnail_url);
            const isVisited = visited.has(place.place_id);
            return (
              <article
                key={place.place_id}
                className="media-card place-card"
                tabIndex={0}
                onClick={() => navigate(`/travel/${place.place_id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/travel/${place.place_id}`);
                  }
                }}
              >
                <div
                  className="photo"
                  style={
                    image
                      ? { backgroundImage: `url('${image}')` }
                      : { backgroundImage: coverArt(place.display_name) }
                  }
                >
                  <span>{place.category || "place"}</span>
                  {isVisited ? <em>Visited</em> : null}
                </div>
                <div>
                  <h2>{place.display_name}</h2>
                  <p>
                    {locationLine(place)}
                    {children.length ? ` · ${children.length} nearby` : ""}
                  </p>
                  {children.length > 0 ? (
                    <ul className="child-list">
                      {children.slice(0, 4).map((child) => (
                        <li key={child.place_id}>{child.display_name}</li>
                      ))}
                    </ul>
                  ) : null}
                  <button type="button">Open place →</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected ? (
        <PlaceDetailSheet
          place={selected}
          visited={visited.has(selected.place_id)}
          onClose={() => navigate("/travel")}
          onVisitedChange={onVisitedChange}
        />
      ) : null}
    </>
  );
}

function PlaceDetailSheet({
  place,
  visited,
  onClose,
  onVisitedChange,
}: {
  place: Place;
  visited: boolean;
  onClose: () => void;
  onVisitedChange: () => void;
}) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const map = mapsUrl(place);

  useEffect(() => {
    let cancelled = false;
    void fetchPlaceDetail(place.place_id)
      .then((next) => {
        if (!cancelled) setDetail(next);
      })
      .catch(() => {
        if (!cancelled) setDetail({ place, source_posts: [], children: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [place]);

  const current = detail?.place ?? place;
  const posts = detail?.source_posts ?? [];
  const children = detail?.children ?? [];

  return (
    <DetailSheet title={current.display_name} onClose={onClose} wide>
      <p className="eyebrow">{current.category || "Place"}</p>
      <h2 className="sheet-title">{current.display_name}</h2>
      <p className="sheet-meta">{locationLine(current)}</p>
      <div className="tag-row">
        {current.attributes.map((attr) => (
          <span key={attr}>{attr}</span>
        ))}
      </div>
      {current.details[0] ? <p className="sheet-copy">{current.details[0]}</p> : null}
      {current.tips.length > 0 ? (
        <ul className="sheet-list">
          {current.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}
      {children.length > 0 ? (
        <section>
          <h3 className="sheet-section">Nearby</h3>
          <ul className="sheet-list">
            {children.map((child) => (
              <li key={child.place_id}>
                <button type="button" onClick={() => navigate(`/travel/${child.place_id}`)}>
                  {child.display_name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {posts.length > 0 ? (
        <section>
          <h3 className="sheet-section">Saved from</h3>
          <div className="source-row">
            {posts.map((post) => {
              const image = proxiedMediaUrl(post.thumbnail_url);
              return (
                <button key={post.post_id} type="button" onClick={() => navigate("/posts")}>
                  {image ? <img src={image} alt="" /> : null}
                  <span>{postTitle(post)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}
      <div className="sheet-actions">
        {map ? (
          <a href={map} target="_blank" rel="noreferrer">
            Open in Maps
          </a>
        ) : null}
        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              if (visited) await unmarkPlaceVisited(current.place_id);
              else await markPlaceVisited(current.place_id);
              onVisitedChange();
            } finally {
              setSaving(false);
            }
          }}
        >
          {visited ? "Unmark visited" : "Mark visited"}
        </button>
      </div>
    </DetailSheet>
  );
}
