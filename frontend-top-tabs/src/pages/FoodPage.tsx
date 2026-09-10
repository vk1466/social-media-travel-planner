import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { nativePostId, reconstructRecipe, type SavedPost } from "../api";
import { platformLabel, proxiedMediaUrl } from "../display";
import {
  formatDuration,
  ingredientLabel,
  recipeMinutes,
  recipesFromPosts,
  type SavedRecipe,
} from "../recipes";
import { DetailSheet } from "../components/DetailSheet";
import { EmptyState, Toolbar } from "../components/Toolbar";
import { PageHeading } from "../components/Shell";

export function FoodPage({
  posts,
  onPostUpdated,
}: {
  posts: SavedPost[];
  onPostUpdated: (post: SavedPost) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState("All");
  const [selected, setSelected] = useState<SavedRecipe | null>(null);
  const recipes = recipesFromPosts(posts);
  const meals = ["All", ...new Set(recipes.map((item) => item.recipe.meal_type).filter(Boolean))] as string[];
  const featured = recipes[0];

  const filtered = recipes.filter((item) => {
    if (meal !== "All" && item.recipe.meal_type !== meal) return false;
    const haystack = [
      item.recipe.title,
      item.recipe.summary,
      item.recipe.cuisine,
      ...item.recipe.ingredients.map((ingredient) => ingredient.name),
      item.post.caption,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !query.trim() || haystack.includes(query.trim().toLowerCase());
  });

  return (
    <>
      <PageHeading
        kicker="Your cookbook"
        title="Food"
        lede="Recipes get cooking time, meal context, and actions instead of generic post metadata."
        action={{ label: "Add links", onClick: () => navigate("/add") }}
      />
      {featured ? (
        <section className="feature-strip">
          <div
            style={{
              backgroundImage: `url('${proxiedMediaUrl(featured.recipe.image_url || featured.post.thumbnail_url) ?? ""}')`,
            }}
          />
          <article>
            <p className="eyebrow">Cook tonight</p>
            <h2>{featured.recipe.title}</h2>
            <p>
              {[
                formatDuration(recipeMinutes(featured.recipe)),
                featured.recipe.meal_type,
                featured.recipe.cuisine,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <button type="button" onClick={() => setSelected(featured)}>
              Start cooking →
            </button>
          </article>
        </section>
      ) : null}
      <Toolbar
        placeholder="Search recipes"
        query={query}
        onQuery={setQuery}
        options={meals}
        selected={meal}
        onSelect={setMeal}
      />
      {filtered.length === 0 ? (
        <EmptyState>No recipes in this view yet.</EmptyState>
      ) : (
        <div className="media-grid">
          {filtered.map((item) => {
            const image = proxiedMediaUrl(item.recipe.image_url || item.post.thumbnail_url);
            const minutes = formatDuration(recipeMinutes(item.recipe));
            return (
              <article
                key={item.key}
                className="media-card"
                tabIndex={0}
                onClick={() => setSelected(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelected(item);
                  }
                }}
              >
                <div className="photo" style={image ? { backgroundImage: `url('${image}')` } : undefined}>
                  <span>{item.recipe.meal_type || "recipe"}</span>
                </div>
                <div>
                  <h2>{item.recipe.title}</h2>
                  <p>
                    {[minutes, item.recipe.servings ? `Serves ${item.recipe.servings}` : null, platformLabel(item.post.platform)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <button type="button">Open recipe →</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selected ? (
        <RecipeDetail
          item={selected}
          onClose={() => setSelected(null)}
          onPostUpdated={(post) => {
            onPostUpdated(post);
            if (post.extracted_recipe) {
              setSelected({ key: post.post_id, post, recipe: post.extracted_recipe });
            }
          }}
        />
      ) : null}
    </>
  );
}

function RecipeDetail({
  item,
  onClose,
  onPostUpdated,
}: {
  item: SavedRecipe;
  onClose: () => void;
  onPostUpdated: (post: SavedPost) => void;
}) {
  const [multiplier, setMultiplier] = useState(1);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const image = proxiedMediaUrl(item.recipe.image_url || item.post.thumbnail_url);

  return (
    <DetailSheet title={item.recipe.title ?? "Recipe"} onClose={onClose} wide>
      {image ? <div className="sheet-hero" style={{ backgroundImage: `url('${image}')` }} /> : null}
      <p className="eyebrow">{item.recipe.cuisine || "Recipe"}</p>
      <h2 className="sheet-title">{item.recipe.title}</h2>
      <p className="sheet-meta">
        {[
          formatDuration(recipeMinutes(item.recipe)),
          item.recipe.servings ? `Serves ${item.recipe.servings}` : null,
          item.recipe.meal_type,
          platformLabel(item.post.platform),
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {item.recipe.summary ? <p className="sheet-copy">{item.recipe.summary}</p> : null}
      <div className="sheet-actions">
        {[0.5, 1, 2].map((value) => (
          <button
            key={value}
            type="button"
            className={multiplier === value ? "is-on" : ""}
            onClick={() => setMultiplier(value)}
          >
            {value}×
          </button>
        ))}
      </div>
      {item.recipe.ingredients.length > 0 ? (
        <section>
          <h3 className="sheet-section">Ingredients</h3>
          <ul className="check-list">
            {item.recipe.ingredients.map((ingredient, index) => (
              <li key={`${ingredient.name}-${index}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked.has(index)}
                    onChange={() => {
                      const next = new Set(checked);
                      if (next.has(index)) next.delete(index);
                      else next.add(index);
                      setChecked(next);
                    }}
                  />
                  {ingredientLabel(ingredient, multiplier)}
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {item.recipe.steps.length > 0 ? (
        <section>
          <h3 className="sheet-section">Method</h3>
          <ol className="sheet-steps">
            {item.recipe.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      ) : null}
      <div className="sheet-actions">
        <a href={item.post.post_url} target="_blank" rel="noreferrer">
          Open reel
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const updated = await reconstructRecipe(item.post.platform, nativePostId(item.post));
              onPostUpdated(updated);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Rebuilding…" : "Rebuild recipe"}
        </button>
      </div>
    </DetailSheet>
  );
}
