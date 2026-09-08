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

export function formatUnit(unit: string | undefined | null, amountStr: string): string {
  if (!unit) return "";
  const trimmed = unit.trim();
  const isOne = amountStr === "1" || amountStr === "1.0" || amountStr === "1/1";

  if (isOne) {
    const lower = trimmed.toLowerCase();
    const singularMap: Record<string, string> = {
      cups: "cup",
      tablespoons: "tbsp",
      tbsp: "tbsp",
      tbsps: "tbsp",
      teaspoons: "tsp",
      tsp: "tsp",
      tsps: "tsp",
      cloves: "clove",
      pieces: "piece",
      slices: "slice",
      stalks: "stalk",
      cans: "can",
      packages: "package",
      pkgs: "pkg",
      bunches: "bunch",
      pinches: "pinch",
      ounces: "oz",
      pounds: "lb",
      grams: "g",
    };
    if (singularMap[lower]) {
      return /^[A-Z]/.test(trimmed) && !/^[A-Z]+$/.test(trimmed)
        ? singularMap[lower].charAt(0).toUpperCase() + singularMap[lower].slice(1)
        : singularMap[lower];
    }
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
    parts.push(formatUnit(ingredient.unit, amt));
  }
  parts.push(ingredient.name);
  if (ingredient.note) {
    parts.push(`(${ingredient.note})`);
  }
  return parts.filter(Boolean).join(" ");
}

export function extractSectionFromNote(note: string): string | null {
  const trimmed = note.trim();
  const match = trimmed.match(/^for\s+(?:the\s+)?(.+?)(?:\s+ice\s+cream|\s+flavor|\s+recipe)?$/i);
  if (match && match[1]) {
    const clean = match[1].trim();
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
  return null;
}

export interface FormattedIngredientItem {
  originalIndex: number;
  amount: string;
  unit: string;
  name: string;
  note?: string;
  section?: string;
  aisle?: string | null;
}

export interface RecipeSectionGroup {
  name: string;
  ingredients: FormattedIngredientItem[];
}

export function groupRecipeSections(
  recipe: ExtractedRecipe,
  multiplier = 1
): { sections: RecipeSectionGroup[]; hasMultipleSections: boolean } {
  const items: FormattedIngredientItem[] = recipe.ingredients.map((ing, idx) => {
    const rawAmt = scaledIngredientAmount(ing, multiplier);
    const unit = formatUnit(ing.unit, rawAmt);
    const note = ing.note?.trim();
    const section = note ? extractSectionFromNote(note) ?? undefined : undefined;
    return {
      originalIndex: idx,
      amount: rawAmt,
      unit,
      name: ing.name,
      note,
      section,
      aisle: ing.aisle,
    };
  });

  const sectionCounts = new Map<string, number>();
  for (const item of items) {
    if (item.section) {
      sectionCounts.set(item.section, (sectionCounts.get(item.section) || 0) + 1);
    }
  }

  if (sectionCounts.size >= 2) {
    const groups = new Map<string, RecipeSectionGroup>();
    for (const item of items) {
      const secName = item.section || "General";
      if (!groups.has(secName)) {
        groups.set(secName, { name: secName, ingredients: [] });
      }

      // Clean redundant note if it just repeats the section
      let cleanNote = item.note;
      if (cleanNote && item.section) {
        const isStrict = new RegExp(
          `^for\\s+(?:the\\s+)?${item.section}(?:\\s+ice\\s+cream|\\s+flavor|\\s+recipe)?$`,
          "i"
        ).test(cleanNote);
        if (isStrict) {
          cleanNote = undefined;
        } else {
          cleanNote = cleanNote
            .replace(
              new RegExp(
                `^for\\s+(?:the\\s+)?${item.section}(?:\\s+ice\\s+cream|\\s+flavor|\\s+recipe)?(?:,\\s*)?`,
                "i"
              ),
              ""
            )
            .trim() || undefined;
        }
      }

      groups.get(secName)!.ingredients.push({
        ...item,
        note: cleanNote,
      });
    }

    return {
      sections: Array.from(groups.values()),
      hasMultipleSections: true,
    };
  }

  return {
    sections: [
      {
        name: "Ingredients",
        ingredients: items,
      },
    ],
    hasMultipleSections: false,
  };
}
