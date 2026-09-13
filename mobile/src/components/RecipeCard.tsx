import { CoverCard } from "./CoverCard";
import { proxiedMediaUrl } from "../postDisplayUtils";
import { recipeCoverFields, type SavedRecipe } from "../recipes";

interface RecipeCardProps {
  item: SavedRecipe;
  onPress: () => void;
}

export function RecipeCard({ item, onPress }: RecipeCardProps) {
  const fields = recipeCoverFields(item);

  return (
    <CoverCard
      title={fields.title}
      category={fields.category}
      platform={item.post.platform}
      kicker={fields.kicker}
      location={fields.location}
      meta={fields.meta}
      action="Cook ↗"
      imageUrl={proxiedMediaUrl(fields.imageUrl)}
      variant="row"
      onPress={onPress}
      accessibilityLabel={`Open full recipe for ${fields.title}`}
    />
  );
}
