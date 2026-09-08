import { useEffect, useMemo, useState, type JSX } from "react";
import type { ExtractedRecipe, SavedPost } from "../../api";
import { reconstructRecipe } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";
import { CookModeModal } from "./CookModeModal";
import { NutritionPanel } from "./NutritionPanel";
import type { SavedRecipe } from "./recipeUtils";
import { groupRecipeSections, recipeMinutes } from "./recipeUtils";
import "./recipe-library.css";

export interface RecipeDetailModalProps {
  item: SavedRecipe;
  onClose: () => void;
  onAddToGrocery: () => void;
  isInGroceryList: boolean;
  onViewGrocery: () => void;
  onSelectPost?: (post: SavedPost) => void;
  onPostUpdated?: (post: SavedPost) => void;
}

export function RecipeDetailModal({
  item,
  onClose,
  onAddToGrocery,
  isInGroceryList,
  onViewGrocery,
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
  const [activeSection, setActiveSection] = useState<string>("all");

  useEffect(() => {
    setCurrentPost(item.post);
    setCurrentRecipe(item.recipe);
    setMultiplier(1);
    setCheckedIngredients(new Set());
    setReconstructError(null);
    setActiveSection("all");
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
  const timeDetails = [
    currentRecipe.prep_time_minutes && `${currentRecipe.prep_time_minutes}m prep`,
    currentRecipe.cook_time_minutes && `${currentRecipe.cook_time_minutes}m cook`,
  ]
    .filter(Boolean)
    .join(" · ");

  const { sections, hasMultipleSections } = useMemo(
    () => groupRecipeSections(currentRecipe, multiplier),
    [currentRecipe, multiplier]
  );

  const displayedSections = useMemo(() => {
    if (!hasMultipleSections || activeSection === "all") {
      return sections;
    }
    return sections.filter((sec) => sec.name === activeSection);
  }, [sections, hasMultipleSections, activeSection]);

  const otherSectionNames = useMemo(() => {
    if (!hasMultipleSections || activeSection === "all") return [];
    return sections
      .filter((sec) => sec.name !== activeSection)
      .map((sec) => sec.name.toLowerCase());
  }, [sections, hasMultipleSections, activeSection]);

  const filteredSteps = useMemo(() => {
    const all = currentRecipe.steps.map((step, idx) => ({ step, stepNum: idx + 1 }));
    if (!hasMultipleSections || activeSection === "all") {
      return all;
    }
    const currentLow = activeSection.toLowerCase();
    return all.filter(({ step }) => {
      const stepLow = step.toLowerCase();
      if (stepLow.includes(currentLow)) {
        return true;
      }
      const mentionsOther = otherSectionNames.some((other) => stepLow.includes(other));
      return !mentionsOther;
    });
  }, [currentRecipe.steps, hasMultipleSections, activeSection, otherSectionNames]);

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
              <div className="recipe-header-meta-row">
                <span className="recipe-eyebrow-tag">
                  {currentRecipe.cuisine ? `${currentRecipe.cuisine} Cuisine` : "Recipe Idea"}
                  {currentRecipe.meal_type ? ` · ${currentRecipe.meal_type}` : ""}
                </span>
                <div className="recipe-header-links">
                  <a
                    className="recipe-link-chip"
                    href={currentPost.post_url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open original video"
                  >
                    ▶ Watch Reel
                  </a>
                  {onSelectPost && (
                    <button
                      type="button"
                      className="recipe-link-chip"
                      onClick={() => onSelectPost(currentPost)}
                      title="View post details"
                    >
                      📄 Saved Post
                    </button>
                  )}
                </div>
              </div>

              <h2 className="recipe-modal-title">
                {currentRecipe.title ?? "Food inspiration"}
              </h2>

              {currentRecipe.summary && (
                <p className="recipe-modal-desc">{currentRecipe.summary}</p>
              )}

              <div className="recipe-pills-row">
                {totalMinutes != null && (
                  <span className="recipe-meta-pill">
                    ⏱ {totalMinutes}m total{timeDetails ? ` (${timeDetails})` : ""}
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
                  <span className="recipe-reconstructed-icon">⚡</span>
                  <div className="recipe-reconstructed-text">
                    <strong>Estimated recipe</strong> — The original post omitted some details, so amounts or steps were estimated.
                  </div>
                </div>
              )}

              {currentRecipe.nutrition && (
                <NutritionPanel nutrition={currentRecipe.nutrition} multiplier={multiplier} />
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
                className={`recipe-btn-outline ${isInGroceryList ? "is-added" : ""}`}
                disabled={currentRecipe.ingredients.length === 0}
                onClick={onAddToGrocery}
              >
                {isInGroceryList ? "✓ Added to grocery list" : "🛒 Add to grocery list"}
              </button>

              {isInGroceryList && (
                <button
                  type="button"
                  className="recipe-btn-outline recipe-btn-view-grocery"
                  onClick={onViewGrocery}
                >
                  View grocery list →
                </button>
              )}
            </div>

            <div className="recipe-columns">
              <div className="recipe-column-section">
                <div className="recipe-column-header">
                  <div className="recipe-column-title-wrap">
                    <h3>Ingredients</h3>
                    {checkedIngredients.size > 0 && (
                      <button
                        type="button"
                        className="recipe-clear-checks-btn"
                        onClick={() => setCheckedIngredients(new Set())}
                      >
                        Reset ({checkedIngredients.size})
                      </button>
                    )}
                  </div>

                  {currentRecipe.ingredients.length > 0 && (
                    <div className="recipe-servings-scale-wrap">
                      <span className="recipe-scale-label">Scale:</span>
                      <div className="recipe-scale-pills">
                        {([0.5, 1, 2] as const).map((factor) => (
                          <button
                            key={factor}
                            type="button"
                            className={`recipe-scale-pill ${multiplier === factor ? "is-active" : ""}`}
                            onClick={() => setMultiplier(factor)}
                          >
                            {factor === 0.5 ? "½×" : `${factor}×`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {hasMultipleSections && (
                  <div className="recipe-section-tabs">
                    <button
                      type="button"
                      className={`recipe-section-tab ${activeSection === "all" ? "is-active" : ""}`}
                      onClick={() => setActiveSection("all")}
                    >
                      All ({sections.length})
                    </button>
                    {sections.map((sec) => (
                      <button
                        key={sec.name}
                        type="button"
                        className={`recipe-section-tab ${activeSection === sec.name ? "is-active" : ""}`}
                        onClick={() => setActiveSection(sec.name)}
                      >
                        {sec.name}
                      </button>
                    ))}
                  </div>
                )}

                {currentRecipe.ingredients.length > 0 ? (
                  <div className="recipe-ingredient-blocks">
                    {displayedSections.map((sec) => (
                      <div key={sec.name} className="recipe-ingredient-subgroup">
                        {hasMultipleSections && activeSection === "all" && (
                          <h4 className="recipe-subgroup-title">
                            <span className="recipe-subgroup-icon">◆</span>
                            <span>{sec.name}</span>
                          </h4>
                        )}
                        <ul className="recipe-ingredient-list">
                          {sec.ingredients.map((ing) => {
                            const isChecked = checkedIngredients.has(ing.originalIndex);
                            return (
                              <li
                                key={`${ing.name}-${ing.originalIndex}`}
                                className={`recipe-ingredient-item ${isChecked ? "is-checked" : ""}`}
                                onClick={() => toggleIngredient(ing.originalIndex)}
                              >
                                <div className="recipe-custom-checkbox">
                                  {isChecked && <span className="recipe-checkbox-check">✓</span>}
                                </div>
                                <div className="recipe-ingredient-body">
                                  {(ing.amount || ing.unit) && (
                                    <span className="recipe-ing-amt">
                                      {ing.amount} {ing.unit}
                                    </span>
                                  )}
                                  <span className="recipe-ing-name">{ing.name}</span>
                                  {ing.note && (
                                    <span className="recipe-ing-note">({ing.note})</span>
                                  )}
                                </div>
                                {ing.aisle && (
                                  <span className="recipe-ingredient-aisle-tag">
                                    {ing.aisle}
                                  </span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="recipe-reconstruct-box">
                    <p>
                      The original post did not include enough measurements or steps to make this recipe.
                    </p>
                    <button
                      type="button"
                      className="recipe-btn-reconstruct"
                      disabled={isReconstructing}
                      onClick={handleReconstruct}
                    >
                      {isReconstructing ? "✨ Creating estimated recipe..." : "✨ Create estimated recipe"}
                    </button>
                    {reconstructError && (
                      <p className="recipe-reconstruct-error">{reconstructError}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="recipe-column-section">
                <div className="recipe-column-header">
                  <div className="recipe-column-title-wrap">
                    <h3>Cooking Steps</h3>
                  </div>
                  {filteredSteps.length > 0 && (
                    <span className="recipe-step-count-badge">
                      {filteredSteps.length} {filteredSteps.length === 1 ? "step" : "steps"}
                    </span>
                  )}
                </div>

                {filteredSteps.length > 0 ? (
                  <div className="recipe-steps-list">
                    {filteredSteps.map(({ step, stepNum }) => (
                      <div key={stepNum} className="recipe-step-card">
                        <div className="recipe-step-badge">{stepNum}</div>
                        <div className="recipe-step-body">
                          <p className="recipe-step-text">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
