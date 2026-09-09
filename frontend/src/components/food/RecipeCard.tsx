import { useEffect, useState, type JSX } from "react";
import { proxiedMediaUrl } from "../../postDisplayUtils";
import type { SavedRecipe } from "./recipeUtils";
import { getRecipeFoodHeroTheme, recipeMinutes } from "./recipeUtils";

export interface RecipeCardProps {
  item: SavedRecipe;
  onOpen: () => void;
}

function formatDuration(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

function formatCreator(handle: string | null | undefined, platform: string): string {
  const trimmedHandle = handle?.trim();
  if (trimmedHandle) {
    return trimmedHandle.startsWith("@") ? trimmedHandle : `@${trimmedHandle}`;
  }
  return platform === "instagram" ? "Instagram creator" : `${platform} creator`;
}

function formatPlatform(platform: string): string {
  if (platform === "instagram") return "Reel saved";
  if (platform === "tiktok") return "TikTok saved";
  if (platform === "youtube") return "Video saved";
  return "Post saved";
}

export function RecipeCard({ item, onOpen }: RecipeCardProps): JSX.Element {
  const { post, recipe } = item;
  const durationLabel = formatDuration(recipeMinutes(recipe));
  const thumbnail = proxiedMediaUrl(recipe.image_url || post.thumbnail_url);
  const [imageFailed, setImageFailed] = useState(false);
  const heroTheme = getRecipeFoodHeroTheme(recipe);
  const creator = formatCreator(post.author_handle, post.platform);
  const creatorInitial = creator.replace(/^@/, "").charAt(0).toUpperCase() || "W";
  const sourceLabel = formatPlatform(post.platform);

  useEffect(() => {
    setImageFailed(false);
  }, [thumbnail]);

  return (
    <article
      className="recipe-grid-card recipe-grid-card--from-reel"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-label={`Open full recipe for ${recipe.title ?? "food post"}`}
    >
      <div className="recipe-poster-wrap">
        {thumbnail && !imageFailed ? (
          <img
            className="recipe-poster-img"
            src={thumbnail}
            alt={recipe.title ?? "Recipe preview"}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="recipe-poster-placeholder"
            style={{ background: heroTheme.gradient }}
            aria-hidden="true"
          >
            <span className="recipe-placeholder-icon">{heroTheme.emoji}</span>
            <span className="recipe-placeholder-title">{recipe.title ?? "Food inspiration"}</span>
          </div>
        )}

        <span className="recipe-source-chip">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 7 8 5-8 5V7Z" />
          </svg>
          {sourceLabel}
        </span>
      </div>

      <div className="recipe-creator-row">
        <span className="recipe-creator-avatar" aria-hidden="true">{creatorInitial}</span>
        <span className="recipe-creator-copy">
          <strong>{creator}</strong>
          <small>Original creator</small>
        </span>
        {recipe.estimated_inferred && (
          <span className="recipe-estimated-chip" title="Some recipe details were estimated">
            ✦ Estimated
          </span>
        )}
      </div>

      <div className="recipe-card-content">
        <h3 className="recipe-card-title">{recipe.title ?? "Food inspiration"}</h3>

        <div className="recipe-card-meta-line" aria-label="Recipe overview">
          {durationLabel && (
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5v5l3 1.8" />
              </svg>
              {durationLabel}
            </span>
          )}
          {recipe.servings && <span>Serves {recipe.servings}</span>}
        </div>

        {recipe.summary && <p className="recipe-card-summary">{recipe.summary}</p>}

        <span className="recipe-card-action" aria-hidden="true">
          <span>Cook from this reel</span>
          <svg viewBox="0 0 24 24">
            <path d="M5 12h13M14 7l5 5-5 5" />
          </svg>
        </span>
      </div>
    </article>
  );
}
