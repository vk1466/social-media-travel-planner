import type { JSX } from "react";
import { proxiedMediaUrl } from "../../postDisplayUtils";
import type { SavedRecipe } from "./recipeUtils";
import { recipeMinutes } from "./recipeUtils";

export interface RecipeCardProps {
  item: SavedRecipe;
  onOpen: () => void;
}

export function RecipeCard({ item, onOpen }: RecipeCardProps): JSX.Element {
  const { post, recipe } = item;
  const minutes = recipeMinutes(recipe);
  const thumbnail = proxiedMediaUrl(post.thumbnail_url);

  return (
    <button
      type="button"
      className="recipe-card"
      onClick={onOpen}
      aria-label={`Open recipe for ${recipe.title ?? "food post"}`}
    >
      <div className="recipe-card-media">
        {thumbnail ? (
          <img
            className="recipe-card-img"
            src={thumbnail}
            alt={recipe.title ?? "Recipe thumbnail"}
            loading="lazy"
          />
        ) : (
          <div className="recipe-card-placeholder" aria-hidden="true">
            <span>🍳</span>
          </div>
        )}

        <span className="recipe-card-badge-play">
          ▶ Reel
        </span>

        {recipe.cuisine && (
          <span className="recipe-card-badge-cuisine">
            {recipe.cuisine}
          </span>
        )}

        {recipe.estimated_inferred && (
          <span className="recipe-card-badge-chef" title="Chef Reconstructed: creator omitted measurements">
            ⚡ Chef Reconstructed
          </span>
        )}
      </div>

      <div className="recipe-card-body">
        <h3 className="recipe-card-title">{recipe.title ?? "Food inspiration"}</h3>
        <p className="recipe-card-summary">
          {recipe.summary ?? (post.caption ? post.caption.slice(0, 120) : "A saved recipe idea from this reel.")}
        </p>

        <div className="recipe-card-meta-chips">
          {minutes != null && (
            <span className="recipe-meta-pill">
              ⏱ {minutes} min
            </span>
          )}
          {recipe.ingredients.length > 0 ? (
            <span className="recipe-meta-pill">
              🥬 {recipe.ingredients.length} ingredients
            </span>
          ) : (
            <span className="recipe-meta-pill" style={{ background: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" }}>
              ✨ Needs AI details
            </span>
          )}
          {recipe.difficulty && (
            <span className="recipe-meta-pill" style={{ textTransform: "capitalize" }}>
              {recipe.difficulty}
            </span>
          )}
          {recipe.meal_type && (
            <span className="recipe-meta-pill" style={{ textTransform: "capitalize" }}>
              {recipe.meal_type}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
