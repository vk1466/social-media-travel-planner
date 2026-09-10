import { useMemo, useState, type JSX } from "react";
import type { SavedPost } from "../../api";
import { FilterBar, FilterChrome, FilterPills } from "../library";
import { postsForPlatforms, useLibraryPlatform } from "../../libraryPlatform";
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
  const { platforms } = useLibraryPlatform();
  const [meal, setMeal] = useState<MealTypeFilter>("all");
  const [time, setTime] = useState<TimeFilter>("any");
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("all");
  const [selected, setSelected] = useState<SavedRecipe | null>(null);
  const [groceryOpen, setGroceryOpen] = useState(false);
  const [groceryRecipeKeys, setGroceryRecipeKeys] = useState<Set<string>>(new Set());
  const [updatedPosts, setUpdatedPosts] = useState<Record<string, SavedPost>>({});

  const effectivePosts = useMemo(() => {
    return postsForPlatforms(
      posts.map((p) => updatedPosts[p.post_id] ?? p),
      platforms,
    );
  }, [posts, updatedPosts, platforms]);

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
  };

  return (
    <div className="recipe-library-shelf">
      <FilterChrome>
        <FilterBar
          placeholder="Search by dish or pantry ingredient (e.g. garlic, salmon, pasta)..."
          query={query}
          onQuery={setQuery}
          groups={[
            {
              ariaLabel: "Meal",
              selected: meal,
              onSelect: (value) => setMeal(value as MealTypeFilter),
              options: MEAL_TYPES.map((value) => ({
                value,
                label: value === "all" ? "All meals" : value.charAt(0).toUpperCase() + value.slice(1),
              })),
            },
            {
              ariaLabel: "Time",
              selected: time,
              onSelect: (value) => setTime(value as TimeFilter),
              options: [
                { value: "any", label: "Any time" },
                { value: "20", label: "< 20 min" },
                { value: "45", label: "< 45 min" },
              ],
            },
          ]}
          trailing={
            <button
              type="button"
              className="lib-filters-action"
              onClick={() => setGroceryOpen(true)}
              aria-label="Open Grocery List"
            >
              Grocery list
              {groceryRecipeKeys.size > 0 ? <span>{groceryRecipeKeys.size}</span> : null}
            </button>
          }
        />
        {cuisines.length > 0 ? (
          <FilterPills
            allLabel="All cuisines"
            allCount={recipes.length}
            pills={cuisines.map((name) => ({ key: name, label: name }))}
            selectedKeys={[cuisine]}
            ariaLabel="Cuisine"
            onSelect={(key) => setCuisine(key === cuisine ? "all" : key)}
          />
        ) : null}
      </FilterChrome>

      <div className="recipe-meta-strip">
        <span className="recipe-count-text">
          {filtered.length} {filtered.length === 1 ? "recipe idea" : "recipe ideas"}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="recipe-grid cover-grid">
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
          }}
          isInGroceryList={groceryRecipeKeys.has(selected.key)}
          onViewGrocery={() => setGroceryOpen(true)}
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
          recipes={groceryRecipes}
          onClose={() => setGroceryOpen(false)}
        />
      )}
    </div>
  );
}
