import type { ExtractedRecipe, RecipeIngredient, SavedPost } from "./api";

export interface SavedRecipe {
  key: string;
  post: SavedPost;
  recipe: ExtractedRecipe;
}

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
  if (hours === 0) return `${remaining} min`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function formatFraction(value: number): string {
  if (Number.isInteger(value)) return String(value);
  const whole = Math.floor(value);
  const remainder = Math.round((value - whole) * 100) / 100;
  let fraction = "";
  if (Math.abs(remainder - 0.25) < 0.05) fraction = "1/4";
  else if (Math.abs(remainder - 0.33) < 0.05) fraction = "1/3";
  else if (Math.abs(remainder - 0.5) < 0.05) fraction = "1/2";
  else if (Math.abs(remainder - 0.67) < 0.05) fraction = "2/3";
  else if (Math.abs(remainder - 0.75) < 0.05) fraction = "3/4";
  if (fraction) return whole > 0 ? `${whole} ${fraction}` : fraction;
  return String(Math.round(value * 100) / 100);
}

export function ingredientLabel(ingredient: RecipeIngredient, multiplier = 1): string {
  let amount = "";
  if (ingredient.amount_numeric != null && ingredient.amount_numeric > 0) {
    amount = formatFraction(ingredient.amount_numeric * multiplier);
  } else if (ingredient.amount) {
    amount = multiplier === 1 ? ingredient.amount.trim() : ingredient.amount.trim();
  }
  return [amount, ingredient.unit, ingredient.name, ingredient.note ? `(${ingredient.note})` : ""]
    .filter(Boolean)
    .join(" ");
}
