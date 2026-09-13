import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { nativePostId } from "@/src/api";
import { FilterBar, PageHeading } from "@/src/components/LibraryChrome";
import { GroceryListSheet, RecipeDetailSheet } from "@/src/components/RecipeDetailSheet";
import { RecipeCard } from "@/src/components/RecipeCard";
import { EmptyState, ErrorBanner } from "@/src/components/ui";
import { postsOfCategory } from "@/src/contentCategory";
import { useLibrary } from "@/src/context/LibraryContext";
import { postsForPlatforms, useLibraryPlatform } from "@/src/libraryPlatform";
import { MEAL_TYPES, recipeMinutes, recipesFromPosts, type SavedRecipe } from "@/src/recipes";
import { colors, spacing } from "@/src/theme";

type TimeFilter = "any" | "20" | "45";

const LIST_GAP = 11;

export default function FoodScreen() {
  const router = useRouter();
  const { posts, loading, error, bumpRefresh } = useLibrary();
  const { platforms } = useLibraryPlatform();
  const [meal, setMeal] = useState<(typeof MEAL_TYPES)[number]>("all");
  const [time, setTime] = useState<TimeFilter>("any");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SavedRecipe | null>(null);
  const [groceryRecipeKeys, setGroceryRecipeKeys] = useState<Set<string>>(new Set());
  const [groceryOpen, setGroceryOpen] = useState(false);

  const foodPosts = postsForPlatforms(postsOfCategory(posts, "food"), platforms);
  const recipes = useMemo(() => recipesFromPosts(foodPosts), [foodPosts]);
  const groceryRecipes = useMemo(
    () => recipes.filter((item) => groceryRecipeKeys.has(item.key)),
    [recipes, groceryRecipeKeys],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter((item) => {
      const recipe = item.recipe;
      if (meal !== "all" && recipe.meal_type?.toLowerCase() !== meal) return false;
      const total = recipeMinutes(recipe);
      if (time === "20" && (total == null || total > 20)) return false;
      if (time === "45" && (total == null || total > 45)) return false;
      if (needle) {
        const haystack = [
          recipe.title,
          recipe.summary,
          recipe.cuisine,
          recipe.meal_type,
          ...recipe.ingredients.map((ingredient) => ingredient.name),
          ...recipe.tags,
          item.post.caption,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [recipes, meal, time, query]);

  if (loading && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {error ? <ErrorBanner message={error} /> : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <PageHeading
              kicker="Recipes from your saves"
              title="Food worth making"
              lede="Find a dish, check the ingredients, and cook from the post that inspired you."
              count={{ value: filtered.length, label: "recipes" }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mealRail}
            >
              {MEAL_TYPES.map((value) => {
                const on = meal === value;
                const icon =
                  value === "all"
                    ? "◎"
                    : value === "breakfast"
                      ? "☼"
                      : value === "lunch"
                        ? "◒"
                        : value === "dinner"
                          ? "◐"
                          : "✦";
                return (
                  <Pressable
                    key={value}
                    onPress={() => setMeal(value)}
                    style={[styles.mealRailBtn, on && styles.mealRailBtnOn]}
                  >
                    <Text style={styles.mealRailIcon}>{icon}</Text>
                    <Text style={[styles.mealRailLabel, on && styles.mealRailLabelOn]}>
                      {value === "all" ? "All" : value.charAt(0).toUpperCase() + value.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <FilterBar
              placeholder="Search dishes or ingredients"
              query={query}
              onQuery={setQuery}
              groups={[
                {
                  ariaLabel: "Meal",
                  selected: meal,
                  onSelect: (value) => setMeal(value as (typeof MEAL_TYPES)[number]),
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
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState title="No recipes yet" body="Save food posts to cook from your library." icon="restaurant-outline" />
        }
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <RecipeCard item={item} onPress={() => setSelected(item)} />
          </View>
        )}
      />
      {selected ? (
        <RecipeDetailSheet
          item={selected}
          onClose={() => setSelected(null)}
          isInGroceryList={groceryRecipeKeys.has(selected.key)}
          onAddToGrocery={() => {
            setGroceryRecipeKeys((current) => new Set(current).add(selected.key));
          }}
          onViewGrocery={() => setGroceryOpen(true)}
          onViewPost={(post) => {
            setSelected(null);
            router.push(`/posts/${post.platform}/${nativePostId(post)}`);
          }}
          onPostUpdated={(post) => {
            bumpRefresh();
            if (post.extracted_recipe) {
              setSelected({ key: post.post_id, post, recipe: post.extracted_recipe });
            }
          }}
        />
      ) : null}
      {groceryOpen ? (
        <GroceryListSheet recipes={groceryRecipes} onClose={() => setGroceryOpen(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  list: { padding: spacing.md, flexGrow: 1 },
  header: { gap: spacing.sm, marginBottom: spacing.md },
  mealRail: {
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealRailBtn: {
    width: 58,
    alignItems: "center",
    gap: 3,
    paddingVertical: 6,
    borderRadius: 9,
  },
  mealRailBtnOn: {
    backgroundColor: colors.surfaceAlt,
  },
  mealRailIcon: { fontSize: 16, lineHeight: 18, color: colors.ink },
  mealRailLabel: { fontSize: 10, fontWeight: "700", color: colors.muted },
  mealRailLabelOn: { color: colors.brand },
  listItem: {
    marginBottom: LIST_GAP,
  },
});
