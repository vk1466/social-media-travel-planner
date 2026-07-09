import type { CanonicalPlace } from "../api";

interface PlaceCardProps {
  place: CanonicalPlace;
  children?: CanonicalPlace[];
  onSelect: (place: CanonicalPlace) => void;
}

function formatLocationLine(place: CanonicalPlace): string {
  const { city, state_province: stateProvince, country } = place.location;
  return [city, stateProvince, country].filter(Boolean).join(", ") || "Location unknown";
}

function uniquePostCount(place: CanonicalPlace, children: CanonicalPlace[]): number {
  const ids = new Set(place.source_post_ids);
  for (const child of children) {
    for (const postId of child.source_post_ids) {
      ids.add(postId);
    }
  }
  return ids.size;
}

function ChildTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) {
    return null;
  }
  return (
    <span className="place-child-tags">
      {tags.map((tag) => (
        <span key={tag} className="tag-chip tag-chip-small">
          {tag}
        </span>
      ))}
    </span>
  );
}

export function PlaceCard({ place, children = [], onSelect }: PlaceCardProps) {
  const childCount = children.length;
  const postCount = uniquePostCount(place, children);
  const placeCount = 1 + childCount;

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

        {place.tags.length > 0 && (
          <div className="tag-list">
            {place.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        )}

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
              <ChildTags tags={child.tags} />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
