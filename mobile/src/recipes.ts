import type { ExtractedRecipe, SavedPost } from "./api";

export interface SavedRecipe {
  key: string;
  post: SavedPost;
  recipe: ExtractedRecipe;
}

export const MEAL_TYPES = [
  "all",
  "dinner",
  "lunch",
  "breakfast",
  "dessert",
  "snack",
  "cocktail",
] as const;

export type MealTypeFilter = (typeof MEAL_TYPES)[number];

export function recipesFromPosts(posts: SavedPost[]): SavedRecipe[] {
  return posts.map((post) => ({
    key: post.post_id,
    post,
    recipe: post.extracted_recipe ?? {
      title: post.caption.trim().slice(0, 80) || "Food inspiration",
      summary: post.caption || null,
      ingredients: [],
      steps: [],
      tags: [],
      cuisine: null,
      meal_type: null,
      difficulty: null,
      estimated_inferred: false,
      tips: [],
    },
  }));
}

export function recipeMinutes(recipe: ExtractedRecipe): number | null {
  const total = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);
  return total > 0 ? total : null;
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

export function formatCreator(handle: string | null | undefined, platform: string): string {
  const trimmedHandle = handle?.trim();
  if (trimmedHandle) {
    return trimmedHandle.startsWith("@") ? trimmedHandle : `@${trimmedHandle}`;
  }
  return platform === "instagram" ? "Instagram creator" : `${platform} creator`;
}

export function formatPlatform(platform: string): string {
  if (platform === "instagram") return "Reel saved";
  if (platform === "tiktok") return "TikTok saved";
  if (platform === "youtube") return "Video saved";
  return "Post saved";
}

export function recipeCoverFields(item: SavedRecipe) {
  const { post, recipe } = item;
  const title = recipe.title ?? "Food inspiration";
  const durationLabel = formatDuration(recipeMinutes(recipe));
  const meal = recipe.meal_type?.trim();
  const cuisine = recipe.cuisine?.trim();
  const category = meal
    ? meal.charAt(0).toUpperCase() + meal.slice(1)
    : recipe.estimated_inferred
      ? "Estimated"
      : "Recipe";
  const creator = formatCreator(post.author_handle, post.platform);
  const location = [durationLabel, recipe.servings ? `Serves ${recipe.servings}` : null]
    .filter(Boolean)
    .join(" · ");

  return {
    title,
    category,
    kicker: (cuisine || formatPlatform(post.platform)).toUpperCase(),
    location: location || creator,
    meta: location ? creator : formatPlatform(post.platform),
    imageUrl: post.thumbnail_url,
  };
}
