import { useMemo, useState, type JSX } from "react";
import type { SavedPost } from "../../api";
import { GroceryListModal } from "./GroceryListModal";
import { RecipeCard } from "./RecipeCard";
import { RecipeDetailModal } from "./RecipeDetailModal";
import {
  MEAL_TYPES,
  recipesFromPosts,
  recipeMinutes,
  type MealTypeFilter,
  type SavedRecipe,
} from "./recipeUtils";
import "./recipe-library.css";

export interface RecipeLibraryProps {
  posts: SavedPost[];
  onSelectPost?: (post: SavedPost) => void;
  onPostUpdated?: (post: SavedPost) => void;
}

type TimeFilter = "any" | "20" | "45";

export function RecipeLibrary({ posts, onSelectPost, onPostUpdated }: RecipeLibraryProps): JSX.Element {
  const [meal, setMeal] = useState<MealTypeFilter>("all");
  const [time, setTime] = useState<TimeFilter>("any");
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("all");
  const [selected, setSelected] = useState<SavedRecipe | null>(null);
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [groceryRecipeKeys, setGroceryRecipeKeys] = useState<Set<string>>(new Set());
  const [updatedPosts, setUpdatedPosts] = useState<Record<string, SavedPost>>({});

  const effectivePosts = useMemo(() => {
    return posts.map((p) => updatedPosts[p.post_id] ?? p);
  }, [posts, updatedPosts]);

  const recipes = useMemo(() => recipesFromPosts(effectivePosts), [effectivePosts]);

  const cuisines = useMemo(() => {
    const list = recipes
      .map((item) => item.recipe.cuisine)
      .filter((name): name is string => Boolean(name && name.trim()));
    return [...new Set(list)].sort();
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recipes.filter((item) => {
      const recipe = item.recipe;

      if (meal !== "all" && recipe.meal_type?.toLowerCase() !== meal) {
        return false;
      }

      if (cuisine !== "all" && recipe.cuisine !== cuisine) {
        return false;
      }

      const totalMinutes = recipeMinutes(recipe);
      if (time === "20" && (totalMinutes == null || totalMinutes > 20)) {
        return false;
      }
      if (time === "45" && (totalMinutes == null || totalMinutes > 45)) {
        return false;
      }

      if (q) {
        const searchable = [
          recipe.title,
          recipe.summary,
          recipe.cuisine,
          recipe.meal_type,
          ...recipe.ingredients.map((ing) => ing.name),
          ...recipe.tags,
          item.post.caption,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [recipes, meal, time, cuisine, query]);

  const groceryRecipes = useMemo(
    () => recipes.filter((item) => groceryRecipeKeys.has(item.key)),
    [recipes, groceryRecipeKeys],
  );

  const handleAddToGrocery = (recipeKey: string) => {
    setGroceryRecipeKeys((prev) => new Set([...prev, recipeKey]));
    setGroceryOpen(true);
  };

  return (
    <div className="recipe-library-shelf">
      <div className="recipe-toolbar">
        <div className="recipe-search-row">
          <div className="recipe-search-wrap">
            <span className="recipe-search-icon" aria-hidden="true">🔍</span>
            <input
              className="recipe-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by dish or pantry ingredient (e.g. garlic, salmon, pasta)..."
              aria-label="Search recipes"
            />
          </div>

          <button
            type="button"
            className="recipe-grocery-btn"
            onClick={() => setGroceryOpen(true)}
            aria-label="Open Grocery List"
          >
            🛒 Grocery list
            {groceryRecipeKeys.size > 0 && (
              <span className="recipe-grocery-badge">
                {groceryRecipeKeys.size}
              </span>
            )}
          </button>
        </div>

        <div className="recipe-filter-group">
          <div className="recipe-filter-segment">
            <span className="recipe-filter-label">Meal:</span>
            {MEAL_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                className={`recipe-chip${meal === value ? " is-active" : ""}`}
                onClick={() => setMeal(value)}
              >
                {value === "all" ? "All meals" : value.charAt(0).toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>

          <div className="recipe-filter-segment">
            <span className="recipe-filter-label">Time:</span>
            {(["any", "20", "45"] as TimeFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                className={`recipe-chip${time === value ? " is-active" : ""}`}
                onClick={() => setTime(value)}
              >
                {value === "any" ? "Any time" : `< ${value} min`}
              </button>
            ))}
          </div>

          {cuisines.length > 0 && (
            <div className="recipe-filter-segment">
              <span className="recipe-filter-label">Cuisine:</span>
              <select
                className="recipe-select"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                aria-label="Filter by cuisine"
              >
                <option value="all">All cuisines</option>
                {cuisines.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="recipe-meta-strip">
        <span className="recipe-count-text">
          {filtered.length} {filtered.length === 1 ? "recipe idea" : "recipe ideas"}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="recipe-grid">
          {filtered.map((item) => (
            <RecipeCard
              key={item.key}
              item={item}
              onOpen={() => setSelected(item)}
            />
          ))}
        </div>
      ) : (
        <div className="recipe-empty-state">
          <span className="recipe-empty-icon" aria-hidden="true">🍲</span>
          <h3>No recipe matches found</h3>
          <p>
            {query.trim() || meal !== "all" || time !== "any" || cuisine !== "all"
              ? "Try adjusting your search terms or filters to find more recipes."
              : "Save a food reel or recipe post from Instagram to start your personal digital cookbook."}
          </p>
        </div>
      )}

      {selected && (
        <RecipeDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onAddToGrocery={() => {
            handleAddToGrocery(selected.key);
            setSelected(null);
          }}
          onSelectPost={
            onSelectPost
              ? (post) => {
                  setSelected(null);
                  onSelectPost(post);
                }
              : undefined
          }
          onPostUpdated={(updated) => {
            setUpdatedPosts((prev) => ({ ...prev, [updated.post_id]: updated }));
            onPostUpdated?.(updated);
          }}
        />
      )}

      {groceryOpen && (
        <GroceryListModal
          recipes={groceryRecipes.length > 0 ? groceryRecipes : (selected ? [selected] : recipes.slice(0, 3))}
          onClose={() => setGroceryOpen(false)}
        />
      )}
    </div>
  );
}
