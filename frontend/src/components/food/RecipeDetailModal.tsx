import { useEffect, useState, type JSX } from "react";
import type { ExtractedRecipe, SavedPost } from "../../api";
import { reconstructRecipe } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";
import { CookModeModal } from "./CookModeModal";
import type { SavedRecipe } from "./recipeUtils";
import { ingredientLabel, recipeMinutes } from "./recipeUtils";
import "./recipe-library.css";

export interface RecipeDetailModalProps {
  item: SavedRecipe;
  onClose: () => void;
  onAddToGrocery: () => void;
  onSelectPost?: (post: SavedPost) => void;
  onPostUpdated?: (post: SavedPost) => void;
}

export function RecipeDetailModal({
  item,
  onClose,
  onAddToGrocery,
  onSelectPost,
  onPostUpdated,
}: RecipeDetailModalProps): JSX.Element {
  const [multiplier, setMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [cooking, setCooking] = useState(false);
  const [currentPost, setCurrentPost] = useState<SavedPost>(item.post);
  const [currentRecipe, setCurrentRecipe] = useState<ExtractedRecipe>(item.recipe);
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [reconstructError, setReconstructError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPost(item.post);
    setCurrentRecipe(item.recipe);
    setMultiplier(1);
    setCheckedIngredients(new Set());
    setReconstructError(null);
  }, [item]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !cooking) {
        event.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [onClose, cooking]);

  const totalMinutes = recipeMinutes(currentRecipe);
  const thumbnail = proxiedMediaUrl(currentPost.thumbnail_url);
  const baseServings = currentRecipe.servings ?? "1 recipe";

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleReconstruct = async () => {
    setIsReconstructing(true);
    setReconstructError(null);
    try {
      const parts = currentPost.post_id.split(":");
      const nativeId = parts.length > 1 ? parts.slice(1).join(":") : currentPost.post_id;
      const updated = await reconstructRecipe(currentPost.platform, nativeId);
      setCurrentPost(updated);
      if (updated.extracted_recipe) {
        setCurrentRecipe(updated.extracted_recipe);
      }
      onPostUpdated?.(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Reconstruction failed. Please try again.";
      setReconstructError(message);
    } finally {
      setIsReconstructing(false);
    }
  };

  return (
    <>
      <div
        className="recipe-modal-backdrop"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={`${currentRecipe.title ?? "Recipe"} details`}
      >
        <section
          className="recipe-detail-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="recipe-modal-close"
            aria-label="Close recipe details"
            onClick={onClose}
          >
            ✕
          </button>

          {thumbnail && (
            <div className="recipe-modal-hero">
              <img
                className="recipe-modal-hero-img"
                src={thumbnail}
                alt=""
                loading="lazy"
              />
              <div className="recipe-modal-hero-scrim" />
            </div>
          )}

          <div className="recipe-modal-content">
            <div className="recipe-modal-header">
              <span className="recipe-eyebrow-tag">
                {currentRecipe.cuisine ? `${currentRecipe.cuisine} Cuisine` : "Recipe Idea"}
                {currentRecipe.meal_type ? ` · ${currentRecipe.meal_type}` : ""}
              </span>
              <h2 className="recipe-modal-title">
                {currentRecipe.title ?? "Food inspiration"}
              </h2>
              {currentRecipe.summary && (
                <p className="recipe-modal-desc">{currentRecipe.summary}</p>
              )}

              <div className="recipe-pills-row">
                {totalMinutes != null && (
                  <span className="recipe-meta-pill">
                    ⏱ {totalMinutes} min total
                    {currentRecipe.prep_time_minutes ? ` (${currentRecipe.prep_time_minutes}m prep` : ""}
                    {currentRecipe.cook_time_minutes ? ` + ${currentRecipe.cook_time_minutes}m cook)` : ")"}
                  </span>
                )}
                {currentRecipe.difficulty && (
                  <span className="recipe-meta-pill" style={{ textTransform: "capitalize" }}>
                    🎯 {currentRecipe.difficulty}
                  </span>
                )}
                {currentRecipe.servings && (
                  <span className="recipe-meta-pill">
                    🍽 {currentRecipe.servings}
                  </span>
                )}
                {currentRecipe.equipment && currentRecipe.equipment.length > 0 && (
                  <span className="recipe-meta-pill">
                    🍳 {currentRecipe.equipment.join(", ")}
                  </span>
                )}
              </div>

              {currentRecipe.estimated_inferred && (
                <div className="recipe-reconstructed-banner">
                  ⚡ <strong>Chef Reconstructed</strong> — Creator omitted measurements; ingredients & steps estimated by Chef AI.
                </div>
              )}
            </div>

            <div className="recipe-action-bar">
              <button
                type="button"
                className="recipe-btn-primary"
                disabled={currentRecipe.steps.length === 0}
                onClick={() => setCooking(true)}
              >
                🍳 Start cook mode
              </button>

              <button
                type="button"
                className="recipe-btn-outline"
                disabled={currentRecipe.ingredients.length === 0}
                onClick={onAddToGrocery}
              >
                🛒 Add to grocery list
              </button>

              <a
                className="recipe-btn-outline"
                href={currentPost.post_url}
                target="_blank"
                rel="noreferrer"
              >
                ▶ Watch original reel
              </a>

              {onSelectPost && (
                <button
                  type="button"
                  className="recipe-btn-outline"
                  onClick={() => onSelectPost(currentPost)}
                >
                  📄 View saved post
                </button>
              )}
            </div>

            <div className="recipe-columns">
              <div className="recipe-column-section">
                <h3>
                  <span>Ingredients</span>
                  {currentRecipe.ingredients.length > 0 && (
                    <div className="recipe-servings-stepper">
                      <button
                        type="button"
                        className="recipe-stepper-btn"
                        onClick={() => setMultiplier((n) => Math.max(0.5, n / 2))}
                        aria-label="Decrease servings"
                      >
                        −
                      </button>
                      <span>{multiplier}× · {baseServings}</span>
                      <button
                        type="button"
                        className="recipe-stepper-btn"
                        onClick={() => setMultiplier((n) => Math.min(4, n * 2))}
                        aria-label="Increase servings"
                      >
                        +
                      </button>
                    </div>
                  )}
                </h3>

                {currentRecipe.ingredients.length > 0 ? (
                  <ul className="recipe-ingredient-list">
                    {currentRecipe.ingredients.map((ing, idx) => {
                      const isChecked = checkedIngredients.has(idx);
                      return (
                        <li key={`${ing.name}-${idx}`} className="recipe-ingredient-item">
                          <label className="recipe-ingredient-label">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleIngredient(idx)}
                            />
                            <span>{ingredientLabel(ing, multiplier)}</span>
                          </label>
                          {ing.aisle && (
                            <span className="recipe-ingredient-aisle-tag">
                              {ing.aisle}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="recipe-reconstruct-box">
                    <p>
                      The creator didn't include measurements or steps in the caption/audio.
                    </p>
                    <button
                      type="button"
                      className="recipe-btn-reconstruct"
                      disabled={isReconstructing}
                      onClick={handleReconstruct}
                    >
                      {isReconstructing ? "✨ Reconstructing recipe with AI..." : "✨ Reconstruct recipe with AI"}
                    </button>
                    {reconstructError && (
                      <p className="recipe-reconstruct-error">{reconstructError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="recipe-column-section">
                <h3>Cooking Steps</h3>

                {currentRecipe.steps.length > 0 ? (
                  <ol className="recipe-steps-list">
                    {currentRecipe.steps.map((step, idx) => (
                      <li key={`${idx}-${step.slice(0, 20)}`} className="recipe-step-item">
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="recipe-empty-state" style={{ padding: "1.5rem" }}>
                    No step-by-step instructions extracted. Use the AI reconstruction above to generate steps.
                  </p>
                )}

                {currentRecipe.tips && currentRecipe.tips.length > 0 && (
                  <div className="recipe-tips-box" style={{ marginTop: "1.5rem" }}>
                    <span className="recipe-tips-title">💡 Chef & Creator Tips</span>
                    <ul className="recipe-tips-list">
                      {currentRecipe.tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {cooking && (
        <CookModeModal
          item={{ key: currentPost.post_id, post: currentPost, recipe: currentRecipe }}
          onClose={() => setCooking(false)}
        />
      )}
    </>
  );
}
