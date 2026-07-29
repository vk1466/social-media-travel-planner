import { categoryChipClass, categoryLabel } from "../categoryLabels";

interface CategoryChipProps {
  category: string | null | undefined;
  small?: boolean;
}

/** Stable-tone chip for a Place.category (or Uncategorized). */
export function CategoryChip({ category, small = false }: CategoryChipProps) {
  return (
    <span className={`${categoryChipClass(category)}${small ? " category-chip--small" : ""}`}>
      {categoryLabel(category)}
    </span>
  );
}
