import type { Place } from "../api";

interface PlaceCardProps {
  place: Place;
  children?: Place[];
  onSelect: (place: Place) => void;
}

function formatLocationLine(place: Place): string {
  const { city, state_province: stateProvince, country } = place.location;
  return [city, stateProvince, country].filter(Boolean).join(", ") || "Location unknown";
}

function uniquePostCount(place: Place, children: Place[]): number {
  const ids = new Set(place.source_post_ids);
  for (const child of children) {
    for (const postId of child.source_post_ids) {
      ids.add(postId);
    }
  }
  return ids.size;
}

function categoryLabel(place: Place): string {
  return place.category ?? "Uncategorized";
}

function ChildMeta({ place }: { place: Place }) {
  const attrs = place.attributes ?? [];
  return (
    <span className="place-child-tags">
      <span className="tag-chip tag-chip-small">{categoryLabel(place)}</span>
      {attrs.map((attr) => (
        <span key={attr} className="tag-chip tag-chip-small">
          {attr}
        </span>
      ))}
    </span>
  );
}

export function PlaceCard({ place, children = [], onSelect }: PlaceCardProps) {
  const childCount = children.length;
  const postCount = uniquePostCount(place, children);
  const placeCount = 1 + childCount;
  const attributes = place.attributes ?? [];

  return (
    <article className="place-card place-card-root">
      <div
        className="post-card-clickable"
        onClick={() => onSelect(place)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(place);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`View details for ${place.display_name}`}
      >
        <h3 className="place-name">{place.display_name}</h3>
        <p className="place-location-line">{formatLocationLine(place)}</p>

        <div className="tag-list">
          <span className="tag-chip">{categoryLabel(place)}</span>
          {attributes.map((attr) => (
            <span key={attr} className="tag-chip">
              {attr}
            </span>
          ))}
        </div>

        <p className="post-extract-hint">
          {postCount} source post{postCount === 1 ? "" : "s"} · {placeCount} place
          {placeCount === 1 ? "" : "s"}
        </p>
      </div>

      {childCount > 0 && (
        <ul className="place-child-list">
          {children.map((child) => (
            <li key={child.place_id}>
              <button type="button" className="place-child-link" onClick={() => onSelect(child)}>
                {child.display_name}
              </button>
              <ChildMeta place={child} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
