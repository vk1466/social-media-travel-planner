import { useState, type JSX } from "react";
import type { RecipeNutrition } from "../../api";

interface NutritionPanelProps {
  nutrition: RecipeNutrition;
  multiplier: number;
}

function amount(value: number, suffix: string): string {
  return `${Math.round(value * 10) / 10}${suffix}`;
}

export function NutritionPanel({ nutrition, multiplier }: NutritionPanelProps): JSX.Element {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const perServing = nutrition.per_serving;
  const total = nutrition.recipe_total;
  const totalLabel = multiplier === 1 ? "Recipe total" : `${multiplier}× recipe total`;

  // Macro energy distribution (4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat)
  const proteinKcal = perServing.protein_g * 4.0;
  const carbsKcal = perServing.carbohydrates_g * 4.0;
  const fatKcal = perServing.fat_g * 9.0;
  const macroKcal = proteinKcal + carbsKcal + fatKcal;

  const proteinPct = macroKcal > 0 ? Math.round((proteinKcal / macroKcal) * 100) : 0;
  const carbsPct = macroKcal > 0 ? Math.round((carbsKcal / macroKcal) * 100) : 0;
  const fatPct = macroKcal > 0 ? Math.max(0, 100 - proteinPct - carbsPct) : 0;

  const matched = nutrition.matched_ingredients ?? [];
  const unmatched = nutrition.unmatched_ingredients ?? [];

  return (
    <section className="recipe-nutrition" aria-label="Estimated nutrition">
      <div className="recipe-nutrition-header">
        <div>
          <h3>Nutrition</h3>
          <p>
            Estimated per serving · <strong>{amount(perServing.calories_kcal, " kcal")}</strong>
            {nutrition.servings_inferred && <span className="recipe-nutrition-inferred-pill">Estimated {nutrition.servings} serv</span>}
          </p>
        </div>
        {!nutrition.is_complete && (
          <span className="recipe-nutrition-partial">
            Partial estimate · {nutrition.matched_ingredient_count} of {nutrition.ingredient_count} ingredients measured
          </span>
        )}
      </div>

      {((nutrition.macro_highlights && nutrition.macro_highlights.length > 0) ||
        (nutrition.dietary_fit && nutrition.dietary_fit.length > 0)) && (
        <div className="recipe-nutrition-highlights">
          {nutrition.macro_highlights?.map((hl, i) => (
            <span key={`hl-${i}`} className="recipe-nutrition-highlight-chip">
              ✨ {hl}
            </span>
          ))}
          {nutrition.dietary_fit?.map((df, i) => (
            <span key={`df-${i}`} className="recipe-nutrition-dietary-chip">
              🌱 {df}
            </span>
          ))}
        </div>
      )}

      {macroKcal > 0 && (
        <div className="recipe-macro-bar-wrap" aria-label="Macro split">
          <div className="recipe-macro-bar">
            <div className="recipe-macro-bar-protein" style={{ width: `${proteinPct}%` }} title={`Protein: ${proteinPct}%`} />
            <div className="recipe-macro-bar-carbs" style={{ width: `${carbsPct}%` }} title={`Carbs: ${carbsPct}%`} />
            <div className="recipe-macro-bar-fat" style={{ width: `${fatPct}%` }} title={`Fat: ${fatPct}%`} />
          </div>
          <div className="recipe-macro-legend">
            <span className="macro-legend-item macro-legend-protein">Protein {proteinPct}%</span>
            <span className="macro-legend-item macro-legend-carbs">Carbs {carbsPct}%</span>
            <span className="macro-legend-item macro-legend-fat">Fat {fatPct}%</span>
          </div>
        </div>
      )}

      <div className="recipe-nutrition-macros">
        <div>
          <strong>{amount(perServing.protein_g, "g")}</strong>
          <span>Protein</span>
        </div>
        <div>
          <strong>{amount(perServing.carbohydrates_g, "g")}</strong>
          <span>Carbs</span>
        </div>
        <div>
          <strong>{amount(perServing.fat_g, "g")}</strong>
          <span>Fat</span>
        </div>
        <div>
          <strong>{amount(perServing.fiber_g, "g")}</strong>
          <span>Fiber</span>
        </div>
      </div>

      <p className="recipe-nutrition-total">
        {totalLabel}: {amount(total.calories_kcal * multiplier, " kcal")} · {amount(total.protein_g * multiplier, "g protein")} · {amount(total.carbohydrates_g * multiplier, "g carbs")} · {amount(total.fat_g * multiplier, "g fat")}
      </p>

      {(matched.length > 0 || unmatched.length > 0) && (
        <div className="recipe-nutrition-breakdown-toggle-wrap">
          <button
            type="button"
            className="recipe-nutrition-breakdown-btn"
            onClick={() => setShowBreakdown((prev) => !prev)}
            aria-expanded={showBreakdown}
          >
            {showBreakdown ? "Hide ingredient breakdown ▲" : "View ingredient breakdown ▼"}
          </button>
          {showBreakdown && (
            <div className="recipe-nutrition-breakdown-list">
              {matched.length > 0 && (
                <div className="recipe-breakdown-group">
                  <span className="recipe-breakdown-heading">Included in calculation:</span>
                  <ul>
                    {matched.map((name, i) => (
                      <li key={`${name}-${i}`} className="is-matched">✓ {name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {unmatched.length > 0 && (
                <div className="recipe-breakdown-group">
                  <span className="recipe-breakdown-heading">Omitted (unmeasured or no match):</span>
                  <ul>
                    {unmatched.map((name, i) => (
                      <li key={`${name}-${i}`} className="is-unmatched">○ {name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="recipe-nutrition-note">
        Nutrition is an estimate from {nutrition.source}. Real-world nutrition varies with specific brands and unmeasured ingredients.
      </p>
    </section>
  );
}
