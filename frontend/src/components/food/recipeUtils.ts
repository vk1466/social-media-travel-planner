import type { ExtractedRecipe, RecipeIngredient, SavedPost } from "../../api";

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
  const prep = recipe.prep_time_minutes ?? 0;
  const cook = recipe.cook_time_minutes ?? 0;
  const total = prep + cook;
  return total > 0 ? total : null;
}

/**
 * Format a decimal number into clean fractions or whole numbers.
 * e.g. 0.5 -> "1/2", 0.25 -> "1/4", 0.75 -> "3/4", 1.5 -> "1 1/2"
 */
function formatFraction(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  const whole = Math.floor(value);
  const remainder = Math.round((value - whole) * 100) / 100;

  let fraction = "";
  if (Math.abs(remainder - 0.25) < 0.05) fraction = "1/4";
  else if (Math.abs(remainder - 0.33) < 0.05) fraction = "1/3";
  else if (Math.abs(remainder - 0.5) < 0.05) fraction = "1/2";
  else if (Math.abs(remainder - 0.67) < 0.05) fraction = "2/3";
  else if (Math.abs(remainder - 0.75) < 0.05) fraction = "3/4";

  if (fraction) {
    return whole > 0 ? `${whole} ${fraction}` : fraction;
  }

  // Fallback to up to 2 decimal places without trailing zeros
  return String(Math.round(value * 100) / 100);
}

export function scaledAmount(amount: string, multiplier: number): string {
  if (multiplier === 1) {
    return amount.trim();
  }

  const trimmed = amount.trim();

  // Mixed number pattern: "1 1/2" or "2 1/4"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (den > 0) {
      const val = (whole + num / den) * multiplier;
      return formatFraction(val);
    }
  }

  // Simple fraction: "1/2", "3/4"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (den > 0) {
      const val = (num / den) * multiplier;
      return formatFraction(val);
    }
  }

  // Decimal or integer: "2", "2.5"
  const numVal = Number(trimmed);
  if (!Number.isNaN(numVal) && Number.isFinite(numVal) && numVal > 0) {
    return formatFraction(numVal * multiplier);
  }

  return trimmed;
}

export function scaledIngredientAmount(ingredient: RecipeIngredient, multiplier: number): string {
  if (multiplier === 1 && ingredient.amount) {
    return ingredient.amount.trim();
  }
  if (ingredient.amount_numeric != null && ingredient.amount_numeric > 0) {
    return formatFraction(ingredient.amount_numeric * multiplier);
  }
  if (ingredient.amount) {
    return scaledAmount(ingredient.amount, multiplier);
  }
  return "";
}

export function ingredientLabel(ingredient: RecipeIngredient, multiplier = 1): string {
  const parts: string[] = [];
  const amt = scaledIngredientAmount(ingredient, multiplier);
  if (amt) {
    parts.push(amt);
  }
  if (ingredient.unit) {
    parts.push(ingredient.unit);
  }
  parts.push(ingredient.name);
  if (ingredient.note) {
    parts.push(`(${ingredient.note})`);
  }
  return parts.filter(Boolean).join(" ");
}
