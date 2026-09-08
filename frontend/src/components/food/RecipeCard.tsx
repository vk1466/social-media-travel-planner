import type { JSX } from "react";
import { proxiedMediaUrl } from "../../postDisplayUtils";
import type { SavedRecipe } from "./recipeUtils";
import { recipeMinutes } from "./recipeUtils";

export interface RecipeCardProps {
  item: SavedRecipe;
  onOpen: () => void;
}

function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function RecipeCard({ item, onOpen }: RecipeCardProps): JSX.Element {
  const { post, recipe } = item;
  const minutes = recipeMinutes(recipe);
  const durationLabel = formatDuration(minutes);
  const thumbnail = proxiedMediaUrl(post.thumbnail_url);
  const ingredientCount = recipe.ingredients.length;
  const hasIngredients = ingredientCount > 0;
  const dietaryTags = recipe.dietary ?? [];
  const mealType = recipe.meal_type;
  const cuisine = recipe.cuisine;
  const isChefReconstructed = recipe.estimated_inferred;

  return (
    <article
      className="recipe-grid-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`View recipe for ${recipe.title ?? "food post"}`}
    >
      <div className="recipe-poster-wrap">
        {thumbnail ? (
          <img
            className="recipe-poster-img"
            src={thumbnail}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="recipe-poster-placeholder" aria-hidden="true">
            <span className="recipe-placeholder-icon">🍳</span>
            <span className="recipe-placeholder-title">{recipe.title ?? "Food Inspiration"}</span>
          </div>
        )}

      </div>

      <div className="recipe-card-content">
        <h3 className="recipe-card-title">{recipe.title ?? "Food inspiration"}</h3>

        <div className="recipe-card-meta-line">
          {durationLabel && (
            <span className="recipe-duration-tag">⏱ {durationLabel}</span>
          )}
          {recipe.difficulty && (
            <span className="recipe-difficulty-tag">{recipe.difficulty}</span>
          )}
          {mealType && (
            <span className="recipe-kind-tag">{mealType}</span>
          )}
        </div>

        <div className="recipe-metrics-row">
          {hasIngredients ? (
            <span className="recipe-badge recipe-badge-ingredients">
              <span className="recipe-badge-icon" aria-hidden="true">🥬</span>
              <span className="recipe-badge-value">
                {ingredientCount} {ingredientCount === 1 ? "ingredient" : "ingredients"}
              </span>
            </span>
          ) : (
            <span className="recipe-badge recipe-badge-ai-needed">
              <span className="recipe-badge-icon" aria-hidden="true">✨</span>
              <span className="recipe-badge-value">Details unavailable</span>
            </span>
          )}

          {recipe.servings && (
            <span className="recipe-badge recipe-badge-servings">
              <span className="recipe-badge-icon" aria-hidden="true">🍽️</span>
              <span className="recipe-badge-value">Serves {recipe.servings}</span>
            </span>
          )}
        </div>

        {(cuisine || dietaryTags.length > 0) && (
          <div className="recipe-card-dietary">
            {cuisine && <span className="recipe-diet-pill">{cuisine}</span>}
            {dietaryTags.slice(0, 2).map((diet) => (
              <span key={diet} className="recipe-diet-pill">{diet}</span>
            ))}
            {dietaryTags.length > 2 && (
              <span className="recipe-more-dietary">+{dietaryTags.length - 2}</span>
            )}
          </div>
        )}

        {isChefReconstructed && (
          <span className="recipe-estimated-note">⚡ Estimated recipe</span>
        )}

        <span className="recipe-card-action" aria-hidden="true">
          View recipe <span>→</span>
        </span>
      </div>
    </article>
  );
}
