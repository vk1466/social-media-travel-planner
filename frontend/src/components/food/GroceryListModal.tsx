import { useEffect, useMemo, useState, type JSX } from "react";
import type { SavedRecipe } from "./recipeUtils";
import { ingredientLabel } from "./recipeUtils";
import "./recipe-library.css";

const STANDARD_AISLES = [
  { key: "Produce", label: "🥬 Produce" },
  { key: "Dairy & Refrigerated", label: "🥛 Dairy & Refrigerated" },
  { key: "Meat & Seafood", label: "🥩 Meat & Seafood" },
  { key: "Pantry & Spices", label: "🧂 Pantry & Spices" },
  { key: "Bakery", label: "🥖 Bakery" },
  { key: "Other", label: "📦 Other" },
] as const;

export interface GroceryListModalProps {
  recipes: SavedRecipe[];
  onClose: () => void;
}

export function GroceryListModal({ recipes, onClose }: GroceryListModalProps): JSX.Element {
  const [copyStatus, setCopyStatus] = useState("");
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [onClose]);

  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ key: string; text: string; recipeTitle?: string }>>();

    for (const item of recipes) {
      for (const ing of item.recipe.ingredients) {
        const aisleKey = ing.aisle && STANDARD_AISLES.some((a) => a.key === ing.aisle)
          ? ing.aisle
          : "Other";

        const list = map.get(aisleKey) ?? [];
        list.push({
          key: `${item.key}-${ing.name}-${list.length}`,
          text: ingredientLabel(ing),
          recipeTitle: item.recipe.title ?? undefined,
        });
        map.set(aisleKey, list);
      }
    }

    return map;
  }, [recipes]);

  const toggleItem = (key: string) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleCopy = async () => {
    const lines: string[] = [];

    lines.push(`🛒 GROCERY LIST (${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"})`);
    lines.push(recipes.map((r) => `• ${r.recipe.title ?? "Recipe"}`).join("\n"));
    lines.push("\n────────────────────────");

    for (const aisle of STANDARD_AISLES) {
      const items = grouped.get(aisle.key);
      if (items && items.length > 0) {
        lines.push(`\n${aisle.label}:`);
        for (const item of items) {
          lines.push(`  [ ] ${item.text}`);
        }
      }
    }

    const fullText = lines.join("\n");
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyStatus("✓ Copied to clipboard! Ready to paste into Notes or Reminders.");
      window.setTimeout(() => setCopyStatus(""), 4000);
    } catch {
      setCopyStatus("Copy failed. Please select text manually.");
    }
  };

  const totalIngredientsCount = useMemo(() => {
    let count = 0;
    for (const r of recipes) {
      count += r.recipe.ingredients.length;
    }
    return count;
  }, [recipes]);
  const hasRecipes = recipes.length > 0;

  return (
    <div
      className="recipe-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Grocery List"
    >
      <section
        className="grocery-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="recipe-modal-close"
          aria-label="Close grocery list"
          onClick={onClose}
        >
          ✕
        </button>

        <div>
          <span className="recipe-eyebrow-tag">Aisle-Sorted Shopping List</span>
          <h2 style={{ margin: "0.25rem 0 0.5rem", fontSize: "1.6rem", color: "var(--text)" }}>
            {hasRecipes ? `🛒 Grocery List (${totalIngredientsCount} items)` : "🛒 Your grocery list is empty"}
          </h2>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.92rem" }}>
            {hasRecipes ? (
              <>
                Aggregated from {recipes.length} saved {recipes.length === 1 ? "recipe" : "recipes"}:{" "}
                <span style={{ fontWeight: 600 }}>
                  {recipes.map((r) => r.recipe.title ?? "Recipe").slice(0, 3).join(", ")}
                  {recipes.length > 3 ? ` +${recipes.length - 3} more` : ""}
                </span>
              </>
            ) : "Open a recipe and add its ingredients to build your list."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            className="recipe-btn-primary"
            disabled={totalIngredientsCount === 0}
            onClick={() => void handleCopy()}
          >
            📋 Copy formatted list for Reminders/Notes
          </button>
        </div>

        {copyStatus && (
          <p className="grocery-copy-status" role="status">
            {copyStatus}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {STANDARD_AISLES.map((aisle) => {
            const items = grouped.get(aisle.key);
            if (!items || items.length === 0) return null;

            return (
              <div key={aisle.key} className="grocery-aisle-block">
                <h3 className="grocery-aisle-heading">
                  {aisle.label} ({items.length})
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                  {items.map((item) => (
                    <label key={item.key} className="grocery-item-row">
                      <input
                        type="checkbox"
                        checked={checkedKeys.has(item.key)}
                        onChange={() => toggleItem(item.key)}
                      />
                      <span>{item.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {totalIngredientsCount === 0 && (
            <div className="recipe-empty-state" style={{ padding: "2rem" }}>
              <span className="recipe-empty-icon" aria-hidden="true">🛒</span>
              <h3>No ingredients found</h3>
              <p>Add recipes with ingredients to build your shopping list.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
