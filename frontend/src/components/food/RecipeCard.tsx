import { useEffect, useState, type JSX } from "react";

import { CoverCard } from "../CoverCard";
import { proxiedMediaUrl } from "../../postDisplayUtils";
import type { SavedRecipe } from "./recipeUtils";
import { recipeMinutes } from "./recipeUtils";

export interface RecipeCardProps {
  item: SavedRecipe;
  onOpen: () => void;
}

function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function formatCreator(handle: string | null | undefined, platform: string): string {
  const trimmedHandle = handle?.trim();
  if (trimmedHandle) {
    return trimmedHandle.startsWith("@") ? trimmedHandle : `@${trimmedHandle}`;
  }
  return platform === "instagram" ? "Instagram creator" : `${platform} creator`;
}

function formatPlatform(platform: string): string {
  if (platform === "instagram") return "Reel saved";
  if (platform === "tiktok") return "TikTok saved";
  if (platform === "youtube") return "Video saved";
  return "Post saved";
}

export function RecipeCard({ item, onOpen }: RecipeCardProps): JSX.Element {
  const { post, recipe } = item;
  const title = recipe.title ?? "Food inspiration";
  const durationLabel = formatDuration(recipeMinutes(recipe));
  const thumbnail = proxiedMediaUrl(recipe.image_url || post.thumbnail_url);
  const [imageFailed, setImageFailed] = useState(false);
  const creator = formatCreator(post.author_handle, post.platform);
  const meal = recipe.meal_type?.trim();
  const cuisine = recipe.cuisine?.trim();
  const category = meal
    ? meal.charAt(0).toUpperCase() + meal.slice(1)
    : recipe.estimated_inferred
      ? "Estimated"
      : "Recipe";
  const location = [durationLabel, recipe.servings ? `Serves ${recipe.servings}` : null]
    .filter(Boolean)
    .join(" · ");

  useEffect(() => {
    if (!thumbnail) {
      setImageFailed(true);
      return;
    }
    setImageFailed(false);
    const probe = new Image();
    probe.onerror = () => setImageFailed(true);
    probe.src = thumbnail;
  }, [thumbnail]);

  return (
    <CoverCard
      title={title}
      category={category}
      kicker={cuisine || formatPlatform(post.platform)}
      location={location || creator}
      meta={location ? creator : formatPlatform(post.platform)}
      action="Cook ↗"
      imageUrl={thumbnail && !imageFailed ? thumbnail : null}
      onOpen={onOpen}
      ariaLabel={`Open full recipe for ${title}`}
    />
  );
}
