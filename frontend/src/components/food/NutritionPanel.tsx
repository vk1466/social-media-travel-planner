import type { RecipeNutrition } from "../../api";
import type { JSX } from "react";

interface NutritionPanelProps {
  nutrition: RecipeNutrition;
  multiplier: number;
}

function amount(value: number, suffix: string): string {
  return `${Math.round(value * 10) / 10}${suffix}`;
}

export function NutritionPanel({ nutrition, multiplier }: NutritionPanelProps): JSX.Element {
  const perServing = nutrition.per_serving;
  const total = nutrition.recipe_total;
  const totalLabel = multiplier === 1 ? "Recipe total" : `${multiplier}× recipe total`;

  return (
    <section className="recipe-nutrition" aria-label="Estimated nutrition">
      <div className="recipe-nutrition-header">
        <div>
          <h3>Nutrition</h3>
          <p>Estimated per serving · {amount(perServing.calories_kcal, " kcal")}</p>
        </div>
        {!nutrition.is_complete && (
          <span className="recipe-nutrition-partial">
            Based on {nutrition.matched_ingredient_count} of {nutrition.ingredient_count} ingredients
          </span>
        )}
      </div>
      <div className="recipe-nutrition-macros">
        <div><strong>{amount(perServing.protein_g, "g")}</strong><span>Protein</span></div>
        <div><strong>{amount(perServing.carbohydrates_g, "g")}</strong><span>Carbs</span></div>
        <div><strong>{amount(perServing.fat_g, "g")}</strong><span>Fat</span></div>
        <div><strong>{amount(perServing.fiber_g, "g")}</strong><span>Fiber</span></div>
      </div>
      <p className="recipe-nutrition-total">
        {totalLabel}: {amount(total.calories_kcal * multiplier, " kcal")} · {amount(total.protein_g * multiplier, "g protein")} · {amount(total.carbohydrates_g * multiplier, "g carbs")} · {amount(total.fat_g * multiplier, "g fat")}
      </p>
      <p className="recipe-nutrition-note">Nutrition is an estimate from {nutrition.source}; brands and unmeasured ingredients can change it.</p>
    </section>
  );
}
