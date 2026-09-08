# Food & Recipe Feature Implementation Plan

Transform social media food reels and recipe posts into a practical, interactive digital cookbook.

## Overview & Current State

Currently, the repository contains initial scaffolding for recipes:
- **Classification**: `classify_content.py` detects `food` posts (recipes, home cooking, kitchen technique with no visitable venue).
- **Extraction**: `recipe_extract.py` and `steps/extract_recipe.py` extract basic recipe hints using OpenAI structured output.
- **Data Model**: `ExtractedRecipe` stores `title`, `summary`, `ingredients`, `steps`, `servings`, `prep_time_minutes`, `cook_time_minutes`, `tags`.
- **Status**: The feature flag `food_recipes` is set to `False` by default in `travelplanner/feature_flag.py`. On the frontend, `PostDetail.tsx` completely ignores `extracted_recipe`, and there is no native library view for food (unlike `travel` which has the Atlas/Places view and `movies` which has `MovieLibrary`). Mobile only renders a plain bullet-point card with a disclaimer.

This plan outlines the end-to-end upgrade to turn food reels into an engaging, cooking-ready feature.

---

## User Review Required

> [!IMPORTANT]
> **Extraction Philosophy: Pure Source Grounding vs. Chef Completion**
> - **Option A (Strictly Grounded)**: Only extract what is explicitly written in the caption or spoken in the video. If the reel doesn't specify baking temperature or measurements, leave them null.
> - **Option B (Hybrid / Recommended)**: Extract the grounded reel facts, but when critical cooking parameters (measurements, oven temperatures, basic cooking steps) are omitted by the creator, have the model provide a sensible, structured estimate clearly badged as *"Chef inferred / estimated"*.

> [!IMPORTANT]
> **Native View Integration**
> - Food will become the 3rd native category surface alongside Travel (Atlas) and Movies (Reel).
> - We will add `"food"` to `CATEGORY_NATIVE_VIEWS` in `contentCategory.ts` and build a dedicated `RecipeLibrary.tsx`.

---

## Proposed Changes

### Component 1: Extraction Engine & Pipeline (`travelplanner/`)

#### [MODIFY] [recipe_hints.py](file:///Users/vipul/Projects/social-media-travel-planner/travelplanner/recipe_hints.py)
- Enrich `RecipeIngredient` with an `aisle` / `category` field (e.g., `Produce`, `Dairy & Refrigerated`, `Meat & Seafood`, `Pantry & Spices`, `Bakery`, `Other`) to power grocery list aggregation.
- Enrich `ExtractedRecipe` with:
  - `cuisine`: e.g. "Italian", "Mexican", "Japanese"
  - `meal_type`: e.g. "dinner", "breakfast", "dessert", "cocktail", "snack"
  - `difficulty`: e.g. "easy", "medium", "hard"
  - `estimated_inferred`: boolean indicating if missing measurements were filled in
  - `tips`: tuple of chef notes or reel tips

#### [MODIFY] [recipe_extract.py](file:///Users/vipul/Projects/social-media-travel-planner/travelplanner/recipe_extract.py)
- Update `RECIPE_EXTRACT_SCHEMA` to match the enriched fields.
- Update `RECIPE_EXTRACT_PROMPT` to:
  1. Extract all ingredients with standard units (g, ml, tbsp, tsp, cups, pieces).
  2. Map ingredients to grocery aisles.
  3. Formulate clear, ordered, actionable cooking steps.
  4. Fill in missing critical baking/cooking temperatures or times when obvious, marking them appropriately.

#### [MODIFY] [feature_flag.py](file:///Users/vipul/Projects/social-media-travel-planner/travelplanner/feature_flag.py)
- Enable `food_recipes: True` by default or maintain controlled toggle.

#### [MODIFY] [db/posts_repo.py](file:///Users/vipul/Projects/social-media-travel-planner/travelplanner/db/posts_repo.py)
- Update `_extracted_recipe_from_dict` and serialization to preserve new fields (`cuisine`, `meal_type`, `difficulty`, `aisle`, etc.).

---

### Component 2: Frontend Web App (`frontend/src/`)

#### [MODIFY] [api.ts](file:///Users/vipul/Projects/social-media-travel-planner/frontend/src/api.ts)
- Update TypeScript interfaces `RecipeIngredient` and `ExtractedRecipe` to match the enriched schema.

#### [MODIFY] [contentCategory.ts](file:///Users/vipul/Projects/social-media-travel-planner/frontend/src/contentCategory.ts)
- Add `"food"` to `CATEGORY_NATIVE_VIEWS`:
  ```ts
  export const CATEGORY_NATIVE_VIEWS: ReadonlySet<ContentCategory> = new Set([
    "travel",
    "movies",
    "food",
  ]);
  ```

#### [NEW] `frontend/src/components/food/`
- **`RecipeLibrary.tsx`**:
  - Grid of visual recipe cards.
  - Filter bar:
    - Meal Type chips (`All`, `Dinner`, `Breakfast`, `Lunch`, `Dessert`, `Drinks`).
    - Cook Time pills (`Any`, `< 20 min`, `< 45 min`).
    - Cuisine filter dropdown or chips.
    - Ingredient search / Pantry filter ("Type an ingredient, e.g., salmon or zucchini").
  - Actions: "Grocery List" modal launcher.
- **`RecipeCard.tsx`**:
  - Thumbnail with video play badge.
  - Title and cuisine badge (`🍝 Italian`, `🥗 Healthy`).
  - Meta strip: Cook time (`⏱ 25 min`), Ingredient count (`8 ingredients`), Difficulty (`Easy`).
  - Bookmark / quick-view trigger.
- **`RecipeDetailModal.tsx`**:
  - Rich hero view with original reel preview/link.
  - Servings scaler (`- [ 2 ] +`) that dynamically scales ingredient amounts.
  - Interactive ingredient checklist (scratch off items as you prep).
  - Step-by-step instructions.
  - Action buttons: "Start Cook Mode" and "Add to Grocery List".
- **`CookModeModal.tsx`**:
  - Fullscreen distraction-free cooking interface designed for kitchen counters.
  - Large step text with prev/next controls.
  - One-tap countdown timer for steps with durations (e.g., "Simmer for 15 min" -> starts 15:00 timer).
- **`GroceryListModal.tsx`**:
  - Multi-recipe grocery list aggregator.
  - Groups ingredients by aisle (`Produce`, `Dairy`, `Pantry`, etc.).
  - Copy to clipboard or export for Apple Reminders/Notes.

#### [MODIFY] [components/PostDetail.tsx](file:///Users/vipul/Projects/social-media-travel-planner/frontend/src/components/PostDetail.tsx)
- Embed the full recipe card inside the post detail modal when `post.extracted_recipe` is present, ensuring web users can view ingredients and instructions directly.

#### [MODIFY] [components/SavedPage.tsx](file:///Users/vipul/Projects/social-media-travel-planner/frontend/src/components/SavedPage.tsx)
- Render `<RecipeLibrary>` when active tab is `"food"`.

---

### Component 3: Mobile App (`mobile/`)

#### [MODIFY] [mobile/src/api.ts](file:///Users/vipul/Projects/social-media-travel-planner/mobile/src/api.ts)
- Update recipe types to match the updated schema.

#### [MODIFY] [mobile/src/components/PostCard.tsx](file:///Users/vipul/Projects/social-media-travel-planner/mobile/src/components/PostCard.tsx)
- Add visual recipe indicators (prep/cook time, ingredient count chip).

#### [MODIFY] [mobile/app/(app)/posts/[platform]/[postId].tsx](file:///Users/vipul/Projects/social-media-travel-planner/mobile/app/(app)/posts/[platform]/[postId].tsx)
- Replace static bullet points with an interactive checklist.
- Add servings adjustment pill (`1x`, `2x`, `4x`).
- Add one-tap "Copy Ingredients to Clipboard".

---

## Verification Plan

### Automated Tests
```bash
# 1. Test recipe extraction parsing and fail-soft behavior
pytest tests/test_recipe_extract.py

# 2. Test pipeline dispatch and category routing
pytest tests/test_pipeline_dispatch.py

# 3. Test DynamoDB repo serialization
pytest tests/test_posts_repo.py

# 4. Frontend build and type validation
cd frontend && npm run build
```

### Manual Verification
- Ingest a sample food reel (or run with mocked bundle) and verify:
  1. Post classifies as `food`.
  2. Recipe extraction populates ingredients, times, and aisle categorization.
  3. Web frontend displays the recipe in both `RecipeLibrary` and `PostDetail`.
  4. Ingredient scaling (1x $\to$ 2x) accurately updates quantities.
  5. Grocery list modal groups items correctly by aisle.
  6. Mobile view renders interactive checkable ingredients.
