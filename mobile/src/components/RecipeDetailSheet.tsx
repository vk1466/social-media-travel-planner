import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  nativePostId,
  reconstructRecipe,
  type ExtractedRecipe,
  type SavedPost,
} from "@/src/api";
import { Button } from "@/src/components/ui";
import { coverFallbackColor } from "@/src/coverArt";
import { proxiedMediaUrl } from "@/src/postDisplayUtils";
import { formatCreator, recipeMinutes, type SavedRecipe } from "@/src/recipes";
import { colors, radius, shadow, spacing } from "@/src/theme";

const SCALE_OPTIONS = [0.5, 1, 2] as const;

function scaleFactorLabel(factor: number): string {
  return factor === 0.5 ? "½×" : `${factor}×`;
}

function ingredientText(
  amount: string | null | undefined,
  unit: string | null | undefined,
  name: string,
  note: string | null | undefined,
  multiplier: number,
): string {
  if (!amount || multiplier === 1) {
    return [amount, unit, name, note].filter(Boolean).join(" ");
  }
  const trimmed = amount.trim();
  let numeric = Number.NaN;
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    numeric = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  } else {
    const frac = trimmed.match(/^(\d+)\/(\d+)$/);
    if (frac) {
      numeric = Number(frac[1]) / Number(frac[2]);
    } else {
      const val = Number(trimmed);
      if (!Number.isNaN(val) && Number.isFinite(val)) {
        numeric = val;
      }
    }
  }
  const scaled = Number.isFinite(numeric)
    ? String(Math.round(numeric * multiplier * 100) / 100)
    : amount;
  return [scaled, unit, name, note].filter(Boolean).join(" ");
}

function CollapsibleSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Pressable
        style={styles.sectionHeader}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        {count != null ? <Text style={styles.sectionCount}>{count}</Text> : null}
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
      </Pressable>
      {open ? children : null}
    </View>
  );
}

export interface RecipeDetailSheetProps {
  item: SavedRecipe;
  onClose: () => void;
  isInGroceryList: boolean;
  onAddToGrocery: () => void;
  onViewGrocery: () => void;
  onViewPost?: (post: SavedPost) => void;
  onPostUpdated?: (post: SavedPost) => void;
}

export function RecipeDetailSheet({
  item,
  onClose,
  isInGroceryList,
  onAddToGrocery,
  onViewGrocery,
  onViewPost,
  onPostUpdated,
}: RecipeDetailSheetProps) {
  const [multiplier, setMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [ingredientsOpen, setIngredientsOpen] = useState(true);
  const [methodOpen, setMethodOpen] = useState(false);
  const [macrosOpen, setMacrosOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [currentPost, setCurrentPost] = useState(item.post);
  const [currentRecipe, setCurrentRecipe] = useState(item.recipe);
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [reconstructError, setReconstructError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentPost(item.post);
    setCurrentRecipe(item.recipe);
    setMultiplier(1);
    setCheckedIngredients(new Set());
    setIngredientsOpen(true);
    setMethodOpen(false);
    setMacrosOpen(false);
    setImageFailed(false);
    setReconstructError(null);
  }, [item]);

  const creator = formatCreator(currentPost.author_handle, currentPost.platform);
  const totalMinutes = recipeMinutes(currentRecipe);
  const thumbnail = proxiedMediaUrl(currentPost.thumbnail_url);
  const timeDetails = [
    currentRecipe.prep_time_minutes && `${currentRecipe.prep_time_minutes}m prep`,
    currentRecipe.cook_time_minutes && `${currentRecipe.cook_time_minutes}m cook`,
  ]
    .filter(Boolean)
    .join(" · ");

  const copyIngredients = async () => {
    if (currentRecipe.ingredients.length === 0) return;
    const text = currentRecipe.ingredients
      .map(
        (ingredient, index) =>
          `- ${ingredientText(
            ingredient.amount,
            ingredient.unit,
            ingredient.name,
            ingredient.note,
            multiplier,
          )}${checkedIngredients.has(index) ? " ✓" : ""}`,
      )
      .join("\n");
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Ingredients are ready to paste into your grocery list.");
  };

  const handleReconstruct = async () => {
    setIsReconstructing(true);
    setReconstructError(null);
    try {
      const updated = await reconstructRecipe(currentPost.platform, nativePostId(currentPost));
      setCurrentPost(updated);
      if (updated.extracted_recipe) {
        setCurrentRecipe(updated.extracted_recipe);
      }
      onPostUpdated?.(updated);
    } catch (err) {
      setReconstructError(err instanceof Error ? err.message : "Reconstruction failed.");
    } finally {
      setIsReconstructing(false);
    }
  };

  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const nutritionSummary = useMemo(() => {
    const nutrition = currentRecipe.nutrition;
    if (!nutrition) return null;
    return {
      perServing: nutrition.per_serving,
      highlights: nutrition.macro_highlights ?? [],
      dietary: nutrition.dietary_fit ?? [],
    };
  }, [currentRecipe.nutrition]);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.heroWrap}>
            {thumbnail && !imageFailed ? (
              <Image
                source={{ uri: thumbnail }}
                style={styles.heroImage}
                resizeMode="cover"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <View
                style={[styles.heroImage, { backgroundColor: coverFallbackColor(currentRecipe.title ?? "Recipe") }]}
              >
                <Text style={styles.heroFallbackEmoji}>🍳</Text>
              </View>
            )}
            <View style={styles.heroScrim} />
            <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close recipe">
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
            <Text style={styles.heroSource}>Saved from {creator}</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.eyebrow}>
              {creator}
              {currentRecipe.cuisine ? ` · ${currentRecipe.cuisine}` : ""}
            </Text>

            <View style={styles.linkRow}>
              {currentPost.post_url ? (
                <Pressable
                  style={styles.linkChip}
                  onPress={() => void Linking.openURL(currentPost.post_url)}
                >
                  <Text style={styles.linkChipText}>Watch reel ↗</Text>
                </Pressable>
              ) : null}
              {onViewPost ? (
                <Pressable style={styles.linkChip} onPress={() => onViewPost(currentPost)}>
                  <Text style={styles.linkChipText}>View saved post ↗</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.title}>{currentRecipe.title ?? "Food inspiration"}</Text>

            {currentRecipe.summary ? (
              <Text style={styles.summary}>{currentRecipe.summary}</Text>
            ) : (
              <Text style={styles.summary}>
                Open the original reel for this recipe&apos;s story and preparation.
              </Text>
            )}

            <View style={styles.factsRow}>
              {totalMinutes != null ? (
                <View style={styles.fact}>
                  <Text style={styles.factValue}>{totalMinutes} min</Text>
                  <Text style={styles.factLabel}>
                    Total time{timeDetails ? ` · ${timeDetails}` : ""}
                  </Text>
                </View>
              ) : null}
              {currentRecipe.difficulty ? (
                <View style={styles.fact}>
                  <Text style={styles.factValue}>{currentRecipe.difficulty}</Text>
                  <Text style={styles.factLabel}>Difficulty</Text>
                </View>
              ) : null}
              {currentRecipe.servings ? (
                <View style={styles.fact}>
                  <Text style={styles.factValue}>{currentRecipe.servings}</Text>
                  <Text style={styles.factLabel}>Servings</Text>
                </View>
              ) : null}
            </View>

            {currentRecipe.estimated_inferred ? (
              <View style={styles.estimatedBanner}>
                <Text style={styles.estimatedBannerText}>
                  <Text style={styles.estimatedStrong}>Estimated recipe</Text> · Some amounts or
                  steps were inferred because the original post was incomplete.
                </Text>
              </View>
            ) : null}

            <CollapsibleSection
              title="Ingredients"
              count={currentRecipe.ingredients.length}
              open={ingredientsOpen}
              onToggle={() => setIngredientsOpen((open) => !open)}
            >
              {currentRecipe.ingredients.length > 0 ? (
                <>
                  <View style={styles.scaleRow}>
                    <Text style={styles.scaleLabel}>Scale:</Text>
                    <View style={styles.scalePills}>
                      {SCALE_OPTIONS.map((factor) => {
                        const active = multiplier === factor;
                        return (
                          <Pressable
                            key={factor}
                            style={[styles.scalePill, active && styles.scalePillOn]}
                            onPress={() => setMultiplier(factor)}
                          >
                            <Text style={[styles.scalePillText, active && styles.scalePillTextOn]}>
                              {scaleFactorLabel(factor)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {checkedIngredients.size > 0 ? (
                      <Pressable onPress={() => setCheckedIngredients(new Set())}>
                        <Text style={styles.resetChecks}>Reset ({checkedIngredients.size})</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {currentRecipe.ingredients.map((ingredient, index) => {
                    const checked = checkedIngredients.has(index);
                    return (
                      <Pressable
                        key={`${ingredient.name}-${index}`}
                        style={styles.ingredientRow}
                        onPress={() => toggleIngredient(index)}
                      >
                        <Ionicons
                          name={checked ? "checkbox" : "square-outline"}
                          size={18}
                          color={colors.brand}
                        />
                        <Text style={[styles.ingredientText, checked && styles.ingredientChecked]}>
                          {ingredientText(
                            ingredient.amount,
                            ingredient.unit,
                            ingredient.name,
                            ingredient.note,
                            multiplier,
                          )}
                        </Text>
                      </Pressable>
                    );
                  })}
                </>
              ) : (
                <View style={styles.reconstructBox}>
                  <Text style={styles.reconstructCopy}>
                    The original post did not include enough measurements or steps to make this
                    recipe.
                  </Text>
                  <Button
                    label={isReconstructing ? "Creating estimated recipe…" : "Create estimated recipe"}
                    onPress={() => void handleReconstruct()}
                    loading={isReconstructing}
                    disabled={isReconstructing}
                  />
                  {reconstructError ? (
                    <Text style={styles.reconstructError}>{reconstructError}</Text>
                  ) : null}
                </View>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Method"
              count={currentRecipe.steps.length}
              open={methodOpen}
              onToggle={() => setMethodOpen((open) => !open)}
            >
              {currentRecipe.steps.length > 0 ? (
                <>
                  {currentRecipe.steps.map((step, index) => (
                    <View key={`${index}-${step}`} style={styles.stepRow}>
                      <Text style={styles.stepNum}>{String(index + 1).padStart(2, "0")}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                  {currentRecipe.tips && currentRecipe.tips.length > 0 ? (
                    <View style={styles.tipsBox}>
                      <Text style={styles.tipsTitle}>Creator tips</Text>
                      {currentRecipe.tips.map((tip) => (
                        <Text key={tip} style={styles.tipLine}>
                          • {tip}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.emptySection}>
                  No steps were extracted. Create an estimated recipe to add them.
                </Text>
              )}
            </CollapsibleSection>

            <CollapsibleSection
              title="Macros"
              count={
                nutritionSummary
                  ? Math.round(nutritionSummary.perServing.calories_kcal)
                  : undefined
              }
              open={macrosOpen}
              onToggle={() => setMacrosOpen((open) => !open)}
            >
              {nutritionSummary ? (
                <>
                  <Text style={styles.nutritionIntro}>
                    Estimated per serving ·{" "}
                    <Text style={styles.nutritionStrong}>
                      {Math.round(nutritionSummary.perServing.calories_kcal)} kcal
                    </Text>
                  </Text>
                  <View style={styles.nutritionRow}>
                    {(
                      [
                        ["kcal", nutritionSummary.perServing.calories_kcal, ""],
                        ["Protein", nutritionSummary.perServing.protein_g, "g"],
                        ["Carbs", nutritionSummary.perServing.carbohydrates_g, "g"],
                        ["Fat", nutritionSummary.perServing.fat_g, "g"],
                      ] as const
                    ).map(([label, value, suffix]) => (
                      <View key={label} style={styles.nutritionCol}>
                        <Text style={styles.nutritionVal}>
                          {Math.round(value * 10) / 10}
                          {suffix}
                        </Text>
                        <Text style={styles.nutritionLabel}>{label}</Text>
                      </View>
                    ))}
                  </View>
                  {nutritionSummary.highlights.length > 0 ||
                  nutritionSummary.dietary.length > 0 ? (
                    <View style={styles.highlightRow}>
                      {nutritionSummary.highlights.map((hl) => (
                        <Text key={hl} style={styles.highlightPill}>
                          ✨ {hl}
                        </Text>
                      ))}
                      {nutritionSummary.dietary.map((df) => (
                        <Text key={df} style={styles.highlightPill}>
                          🌱 {df}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.emptySection}>
                  Nutrition has not been estimated for this recipe yet.
                </Text>
              )}
            </CollapsibleSection>
          </View>
        </ScrollView>

        <View style={styles.actionBar}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnOutline]}
            onPress={() => void copyIngredients()}
            disabled={currentRecipe.ingredients.length === 0}
          >
            <Ionicons name="copy-outline" size={15} color={colors.brand} />
            <Text style={styles.actionBtnOutlineText}>Copy ingredients</Text>
          </Pressable>
          <Pressable
            style={[
              styles.actionBtn,
              isInGroceryList ? styles.actionBtnAdded : styles.actionBtnOutline,
            ]}
            onPress={isInGroceryList ? onViewGrocery : onAddToGrocery}
            disabled={currentRecipe.ingredients.length === 0}
          >
            <Ionicons
              name={isInGroceryList ? "checkmark-circle" : "cart-outline"}
              size={15}
              color={isInGroceryList ? colors.success : colors.brand}
            />
            <Text
              style={[
                styles.actionBtnOutlineText,
                isInGroceryList && styles.actionBtnAddedText,
              ]}
            >
              {isInGroceryList ? "View grocery" : "Add to grocery"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const STANDARD_AISLES = [
  { key: "Produce", label: "🥬 Produce" },
  { key: "Dairy & Refrigerated", label: "🥛 Dairy & Refrigerated" },
  { key: "Meat & Seafood", label: "🥩 Meat & Seafood" },
  { key: "Pantry & Spices", label: "🧂 Pantry & Spices" },
  { key: "Bakery", label: "🥖 Bakery" },
  { key: "Other", label: "📦 Other" },
] as const;

function groceryIngredientText(ingredient: ExtractedRecipe["ingredients"][number]): string {
  return [ingredient.amount, ingredient.unit, ingredient.name, ingredient.note ? `(${ingredient.note})` : ""]
    .filter(Boolean)
    .join(" ");
}

export function GroceryListSheet({
  recipes,
  onClose,
}: {
  recipes: SavedRecipe[];
  onClose: () => void;
}) {
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, Array<{ key: string; text: string }>>();
    for (const item of recipes) {
      for (const ing of item.recipe.ingredients) {
        const aisleKey =
          ing.aisle && STANDARD_AISLES.some((aisle) => aisle.key === ing.aisle)
            ? ing.aisle
            : "Other";
        const list = map.get(aisleKey) ?? [];
        list.push({
          key: `${item.key}-${ing.name}-${list.length}`,
          text: groceryIngredientText(ing),
        });
        map.set(aisleKey, list);
      }
    }
    return map;
  }, [recipes]);

  const totalCount = useMemo(
    () => recipes.reduce((sum, item) => sum + item.recipe.ingredients.length, 0),
    [recipes],
  );

  const toggleItem = (key: string) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const copyList = async () => {
    const lines: string[] = [];
    lines.push(`Grocery list (${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"})`);
    lines.push(recipes.map((item) => `• ${item.recipe.title ?? "Recipe"}`).join("\n"));
    lines.push("");
    for (const aisle of STANDARD_AISLES) {
      const items = grouped.get(aisle.key);
      if (!items?.length) continue;
      lines.push(`${aisle.label}:`);
      for (const item of items) {
        lines.push(`  [ ] ${item.text}`);
      }
      lines.push("");
    }
    await Clipboard.setStringAsync(lines.join("\n"));
    Alert.alert("Copied", "Grocery list copied to clipboard.");
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.groceryContent}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>
          <Pressable style={styles.closeBtnFloating} onPress={onClose} accessibilityLabel="Close grocery list">
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>

          <Text style={styles.groceryEyebrow}>Aisle-sorted shopping list</Text>
          <Text style={styles.groceryTitle}>
            {totalCount > 0 ? `Grocery list (${totalCount} items)` : "Your grocery list is empty"}
          </Text>
          {recipes.length > 0 ? (
            <Text style={styles.grocerySub}>
              From {recipes.length} saved {recipes.length === 1 ? "recipe" : "recipes"}:{" "}
              {recipes
                .map((item) => item.recipe.title ?? "Recipe")
                .slice(0, 3)
                .join(", ")}
              {recipes.length > 3 ? ` +${recipes.length - 3} more` : ""}
            </Text>
          ) : (
            <Text style={styles.grocerySub}>
              Open a recipe and add its ingredients to build your list.
            </Text>
          )}

          <Button
            label="Copy formatted list"
            icon="copy-outline"
            variant="secondary"
            onPress={() => void copyList()}
            disabled={totalCount === 0}
            style={styles.groceryCopyBtn}
          />

          {STANDARD_AISLES.map((aisle) => {
            const items = grouped.get(aisle.key);
            if (!items?.length) return null;
            return (
              <View key={aisle.key} style={styles.groceryAisle}>
                <Text style={styles.groceryAisleTitle}>
                  {aisle.label} ({items.length})
                </Text>
                {items.map((item) => (
                  <Pressable
                    key={item.key}
                    style={styles.groceryItemRow}
                    onPress={() => toggleItem(item.key)}
                  >
                    <Ionicons
                      name={checkedKeys.has(item.key) ? "checkbox" : "square-outline"}
                      size={18}
                      color={colors.brand}
                    />
                    <Text
                      style={[
                        styles.groceryItemText,
                        checkedKeys.has(item.key) && styles.ingredientChecked,
                      ]}
                    >
                      {item.text}
                    </Text>
                  </Pressable>
                ))}
              </View>
            );
          })}

          {totalCount === 0 ? (
            <View style={styles.groceryEmpty}>
              <Text style={styles.heroFallbackEmoji}>🛒</Text>
              <Text style={styles.groceryEmptyTitle}>No ingredients yet</Text>
              <Text style={styles.groceryEmptyBody}>
                Add recipes with ingredients to build your shopping list.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
  handleWrap: { alignItems: "center", paddingTop: spacing.sm, paddingBottom: spacing.xs },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  heroWrap: { height: 200, position: "relative" },
  heroImage: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heroFallbackEmoji: { fontSize: 36 },
  heroScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(17, 42, 53, 0.55)",
  },
  closeBtn: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(17, 42, 53, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnFloating: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  closeBtnText: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  heroSource: {
    position: "absolute",
    left: spacing.md,
    bottom: spacing.sm,
    color: colors.ink,
    fontSize: 12,
    fontWeight: "600",
  },
  body: { padding: spacing.lg, gap: spacing.sm },
  eyebrow: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  linkRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linkChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.surface,
  },
  linkChipText: { color: colors.brand, fontSize: 12, fontWeight: "700" },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  summary: { color: colors.ink, fontSize: 14, lineHeight: 22 },
  factsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  fact: {
    minWidth: 88,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  factValue: { color: colors.ink, fontWeight: "800", fontSize: 15 },
  factLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  estimatedBanner: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  estimatedBannerText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  estimatedStrong: { color: colors.ink, fontWeight: "700" },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  sectionTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", flex: 1 },
  sectionCount: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  scaleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: spacing.sm,
  },
  scaleLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  scalePills: { flexDirection: "row", gap: 6 },
  scalePill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surface,
  },
  scalePillOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  scalePillText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  scalePillTextOn: { color: colors.brand },
  resetChecks: { color: colors.brand, fontSize: 12, fontWeight: "700" },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 5,
  },
  ingredientText: { color: colors.ink, fontSize: 14, lineHeight: 21, flex: 1 },
  ingredientChecked: { textDecorationLine: "line-through", color: colors.muted },
  reconstructBox: { gap: spacing.sm, paddingVertical: spacing.sm },
  reconstructCopy: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  reconstructError: { color: colors.danger, fontSize: 12 },
  stepRow: { flexDirection: "row", gap: 10, marginBottom: spacing.sm },
  stepNum: { color: colors.brand, fontWeight: "800", fontSize: 13, width: 24 },
  stepText: { color: colors.ink, fontSize: 14, lineHeight: 22, flex: 1 },
  tipsBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: 4,
  },
  tipsTitle: { color: colors.ink, fontWeight: "800", fontSize: 13 },
  tipLine: { color: colors.ink, fontSize: 13, lineHeight: 20 },
  emptySection: { color: colors.muted, fontSize: 13, lineHeight: 20, paddingVertical: 4 },
  nutritionIntro: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
  nutritionStrong: { color: colors.ink, fontWeight: "800" },
  nutritionRow: { flexDirection: "row", gap: 8 },
  nutritionCol: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: 8,
    alignItems: "center",
  },
  nutritionVal: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  nutritionLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  highlightRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  highlightPill: {
    backgroundColor: colors.surfaceAlt,
    color: colors.brand,
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  actionBar: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.sm,
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  actionBtnAdded: {
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  actionBtnOutlineText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  actionBtnAddedText: { color: colors.success },
  groceryContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  groceryEyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  groceryTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  grocerySub: { color: colors.muted, fontSize: 13, lineHeight: 20, marginBottom: spacing.md },
  groceryCopyBtn: { marginBottom: spacing.lg },
  groceryAisle: { marginBottom: spacing.lg, gap: 4 },
  groceryAisleTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  groceryItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  groceryItemText: { color: colors.ink, fontSize: 14, lineHeight: 20, flex: 1 },
  groceryEmpty: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  groceryEmptyTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  groceryEmptyBody: { color: colors.muted, fontSize: 13, textAlign: "center" },
});
