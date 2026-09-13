import type { Place } from "../api";
import { categoryLabel } from "../categoryLabels";
import { CoverCard } from "./CoverCard";

interface PlaceCardProps {
  place: Place;
  visited?: boolean;
  imageUrl?: string | null;
  onPress: () => void;
}

export function PlaceCard({ place, visited = false, imageUrl, onPress }: PlaceCardProps) {
  const locationLine = [place.location.city, place.location.country].filter(Boolean).join(" · ");
  const saveCount = place.source_post_ids.length;
  const meta =
    saveCount === 1 ? "1 saved post" : `${saveCount} saved posts`;

  return (
    <CoverCard
      title={place.display_name}
      category={place.category ? categoryLabel(place.category) : "Place"}
      location={locationLine || undefined}
      meta={meta}
      action={visited ? "Visited" : "Open ↗"}
      imageUrl={imageUrl}
      onPress={onPress}
      accessibilityLabel={`Open ${place.display_name}`}
    />
  );
}
