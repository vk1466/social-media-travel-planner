import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useDragDismiss } from "../../hooks/usePointerSwipe";
import type { ExtractedRecipe, SavedPost } from "../../api";
import { reconstructRecipe } from "../../api";
import { proxiedMediaUrl } from "../../postDisplayUtils";
import { CookModeModal } from "./CookModeModal";
import { NutritionPanel } from "./NutritionPanel";
import type { SavedRecipe } from "./recipeUtils";
import {
  getRecipeFoodHeroTheme,
  getAisleIcon,
  getSectionEmoji,
  groupRecipeSections,
  recipeMinutes,
} from "./recipeUtils";
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
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const dialogTitleId = useMemo(
    () => `recipe-title-${item.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    [item.key],
  );
  const [multiplier, setMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [cooking, setCooking] = useState(false);
  useDragDismiss(panelRef, onClose, { enabled: !cooking });
  const [currentPost, setCurrentPost] = useState<SavedPost>(item.post);
  const [currentRecipe, setCurrentRecipe] = useState<ExtractedRecipe>(item.recipe);
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [reconstructError, setReconstructError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("all");
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setCurrentPost(item.post);
    setCurrentRecipe(item.recipe);
    setMultiplier(1);
    setCheckedIngredients(new Set());
    setReconstructError(null);
    setActiveSection("all");
    setIngredientsOpen(false);
    setMethodOpen(false);
    setMacrosOpen(false);
    setImageFailed(false);
  }, [item]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

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
  const thumbnail = proxiedMediaUrl(currentRecipe.image_url || currentPost.thumbnail_url);
  const heroTheme = useMemo(() => getRecipeFoodHeroTheme(currentRecipe), [currentRecipe]);

  useEffect(() => {
    setImageFailed(false);
  }, [thumbnail]);
  const timeDetails = [
    currentRecipe.prep_time_minutes && `${currentRecipe.prep_time_minutes}m prep`,
    currentRecipe.cook_time_minutes && `${currentRecipe.cook_time_minutes}m cook`,
  ]
    .filter(Boolean)
    .join(" · ");
  const creator = currentPost.author_handle?.trim()
    ? (currentPost.author_handle.startsWith("@") ? currentPost.author_handle : `@${currentPost.author_handle}`)
    : "Original creator";

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
        className="recipe-modal-backdrop recipe-modal-backdrop--editorial"
        onClick={onClose}
      >
        <section
          ref={panelRef}
          className="recipe-detail-panel recipe-detail-panel--editorial"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sheet-handle recipe-sheet-handle" data-drag-handle aria-hidden="true" />
          <button
            ref={closeButtonRef}
            type="button"
            className="recipe-modal-close"
            aria-label="Close recipe details"
            onClick={onClose}
          >
            ✕
          </button>

          {thumbnail && !imageFailed ? (
            <div className="recipe-modal-hero">
              <img
                className="recipe-modal-hero-img"
                src={thumbnail}
                alt={currentRecipe.title ?? "Recipe preview"}
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
              <div className="recipe-modal-hero-scrim" />
              <span className="recipe-sheet-source">Saved from {creator}</span>
            </div>
          ) : (
            <div
              className="recipe-modal-hero recipe-modal-hero-fallback"
              style={{ background: heroTheme.gradient }}
            >
              <div className="recipe-hero-fallback-body">
                <div className="recipe-hero-fallback-art" aria-hidden="true">
                  <span className="recipe-hero-art-icon">{heroTheme.emoji}</span>
                </div>
                <div className="recipe-hero-fallback-meta">
                  <span className="recipe-hero-fallback-pill">
                    {currentRecipe.cuisine ? `${currentRecipe.cuisine} Cuisine` : "Social Food Inspiration"}
                  </span>
                  <span className="recipe-hero-fallback-title">{heroTheme.label}</span>
                </div>
              </div>
              <div className="recipe-modal-hero-scrim" />
              <span className="recipe-sheet-source">Saved from {creator}</span>
            </div>
          )}

          <div className="recipe-modal-content">
            <div className="recipe-modal-header">
              <div className="recipe-header-meta-row">
                <span className="recipe-eyebrow-tag">
                  {creator}{currentRecipe.cuisine ? ` · ${currentRecipe.cuisine}` : ""}
                </span>
                <div className="recipe-header-links">
                  {currentPost.post_url && (
                    <a
                      className="recipe-link-chip"
                      href={currentPost.post_url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open original video"
                    >
                      Watch reel ↗
                    </a>
                  )}
                  {onSelectPost && (
                    <button
                      type="button"
                      className="recipe-link-chip"
                      onClick={() => onSelectPost(currentPost)}
                      title="View post details"
                    >
                      View saved post ↗
                    </button>
                  )}
                </div>
              </div>

              <h2 id={dialogTitleId} className="recipe-modal-title">
                {currentRecipe.title ?? "Food inspiration"}
              </h2>

            </div>

            <p className="recipe-editorial-summary">
              {currentRecipe.summary || "Open the original reel for this recipe's story and preparation."}
            </p>

            <div className="recipe-editorial-facts">
              {totalMinutes != null && <span><b>{totalMinutes} min</b><small>Total time{timeDetails ? ` · ${timeDetails}` : ""}</small></span>}
              {currentRecipe.difficulty && <span><b>{currentRecipe.difficulty}</b><small>Difficulty</small></span>}
              {currentRecipe.servings && <span><b>{currentRecipe.servings}</b><small>Servings</small></span>}
            </div>

            {currentRecipe.estimated_inferred && (
              <div className="recipe-reconstructed-banner">
                <strong>Estimated recipe</strong> · Some amounts or steps were inferred because the original post was incomplete.
              </div>
            )}

            <div className={`recipe-editorial-content ${ingredientsOpen || methodOpen || macrosOpen ? "has-expanded-section" : ""}`}>
              <section className="recipe-column-section recipe-editorial-ingredients">
                <div className="recipe-column-header">
                  <div className="recipe-column-title-wrap">
                    <button
                      type="button"
                      className="recipe-editorial-section-toggle"
                      aria-expanded={ingredientsOpen}
                      onClick={() => setIngredientsOpen((open) => !open)}
                    >
                      <span>Ingredients</span>
                      <small>{currentRecipe.ingredients.length}</small>
                      <i aria-hidden="true">⌄</i>
                    </button>
                    {ingredientsOpen && checkedIngredients.size > 0 && (
                      <button
                        type="button"
                        className="recipe-clear-checks-btn"
                        onClick={() => setCheckedIngredients(new Set())}
                      >
                        Reset ({checkedIngredients.size})
                      </button>
                    )}
                  </div>

                  {ingredientsOpen && currentRecipe.ingredients.length > 0 && (
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

                {ingredientsOpen && (
                  <>
                {hasMultipleSections && (
                  <div className="recipe-section-tabs">
                    <button
                      type="button"
                      className={`recipe-section-tab ${activeSection === "all" ? "is-active" : ""}`}
                      onClick={() => setActiveSection("all")}
                    >
                      🍽️ All ({sections.length})
                    </button>
                    {sections.map((sec) => (
                      <button
                        key={sec.name}
                        type="button"
                        className={`recipe-section-tab ${activeSection === sec.name ? "is-active" : ""}`}
                        onClick={() => setActiveSection(sec.name)}
                      >
                        {getSectionEmoji(sec.name)} {sec.name}
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
                            <span className="recipe-subgroup-icon">{getSectionEmoji(sec.name)}</span>
                            <span>{sec.name}</span>
                          </h4>
                        )}
                        <ul className="recipe-ingredient-list">
                          {sec.ingredients.map((ing) => {
                            const isChecked = checkedIngredients.has(ing.originalIndex);
                            const aisleIcon = getAisleIcon(ing.aisle);
                            return (
                              <li
                                key={`${ing.name}-${ing.originalIndex}`}
                                className={`recipe-ingredient-item ${isChecked ? "is-checked" : ""}`}
                              >
                                <button
                                  type="button"
                                  className="recipe-ingredient-toggle"
                                  onClick={() => toggleIngredient(ing.originalIndex)}
                                  aria-pressed={isChecked}
                                  aria-label={`${isChecked ? "Uncheck" : "Check"} ${ing.name}${ing.aisle ? `, ${ing.aisle}` : ""}`}
                                >
                                <span className="recipe-custom-checkbox" aria-hidden="true">
                                  {isChecked && <span className="recipe-checkbox-check">✓</span>}
                                </span>
                                {aisleIcon && (
                                  <span
                                    className="recipe-ingredient-aisle-icon"
                                    title={ing.aisle ?? undefined}
                                    aria-hidden="true"
                                  >
                                    {aisleIcon}
                                  </span>
                                )}
                                <span className="recipe-ingredient-body">
                                  {(ing.amount || ing.unit) && (
                                    <span className="recipe-ing-amt">
                                      {ing.amount} {ing.unit}
                                    </span>
                                  )}
                                  <span className="recipe-ing-name">{ing.name}</span>
                                  {ing.note && (
                                    <span className="recipe-ing-note">({ing.note})</span>
                                  )}
                                </span>
                                </button>
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
                  </>
                )}
              </section>

              <section className="recipe-column-section recipe-editorial-method">
                <div className="recipe-column-header">
                  <div className="recipe-column-title-wrap">
                    <button
                      type="button"
                      className="recipe-editorial-section-toggle"
                      aria-expanded={methodOpen}
                      onClick={() => setMethodOpen((open) => !open)}
                    >
                      <span>Method</span>
                      <small>{currentRecipe.steps.length}</small>
                      <i aria-hidden="true">⌄</i>
                    </button>
                  </div>
                </div>
                {methodOpen && (currentRecipe.steps.length > 0 ? (
                  <ol className="recipe-editorial-steps">
                    {currentRecipe.steps.map((step, index) => (
                      <li key={`${index + 1}-${step}`}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <p>{step}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="recipe-detail-empty">No steps were extracted. Create an estimated recipe to add them.</p>
                ))}
                {methodOpen && currentRecipe.tips && currentRecipe.tips.length > 0 && (
                  <div className="recipe-tips-box">
                    <span className="recipe-tips-title">Creator tips</span>
                    <ul className="recipe-tips-list">{currentRecipe.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
                  </div>
                )}
              </section>

              <section className="recipe-column-section recipe-editorial-macros">
                <div className="recipe-column-header">
                  <div className="recipe-column-title-wrap">
                    <button
                      type="button"
                      className="recipe-editorial-section-toggle"
                      aria-expanded={macrosOpen}
                      onClick={() => setMacrosOpen((open) => !open)}
                    >
                      <span>Macros</span>
                      {currentRecipe.nutrition && (
                        <small>{Math.round(currentRecipe.nutrition.per_serving.calories_kcal)} kcal</small>
                      )}
                      <i aria-hidden="true">⌄</i>
                    </button>
                  </div>
                </div>
                {macrosOpen && (
                  currentRecipe.nutrition
                    ? <NutritionPanel nutrition={currentRecipe.nutrition} multiplier={multiplier} />
                    : <p className="recipe-detail-empty">Nutrition has not been estimated for this recipe yet.</p>
                )}
              </section>
            </div>

            <div className="recipe-action-bar">
              <button
                type="button"
                className={`recipe-btn-outline ${isInGroceryList ? "is-added" : ""}`}
                disabled={currentRecipe.ingredients.length === 0}
                onClick={isInGroceryList ? onViewGrocery : onAddToGrocery}
              >
                {isInGroceryList ? "✓ View grocery list" : "Add ingredients to groceries"}
              </button>
              <button
                type="button"
                className="recipe-btn-primary"
                disabled={currentRecipe.steps.length === 0}
                onClick={() => setCooking(true)}
              >
                Start cook mode →
              </button>
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
