import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import * as Clipboard from "expo-clipboard";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  deletePost,
  fetchPlaceDetail,
  fetchPost,
  nativePostId,
  type ExtractedPlace,
  type SavedPost,
} from "@/src/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Button, ErrorBanner, TagChip } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { googleMapsUrl } from "@/src/maps";
import { formatPostDate, getPlatformLabel, getPostTitle, proxiedMediaUrl } from "@/src/postDisplayUtils";
import { colors, radius, shadow, spacing } from "@/src/theme";

export default function PostDetailScreen() {
  const { platform, postId } = useLocalSearchParams<{ platform: string; postId: string }>();
  const router = useRouter();
  const { bumpRefresh } = useLibrary();
  const [post, setPost] = useState<SavedPost | null>(null);
  const [placeNames, setPlaceNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipeMultiplier, setRecipeMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!platform || !postId) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const next = await fetchPost(platform, postId);
        if (cancelled) return;
        setPost(next);
        const names: Record<string, string> = {};
        await Promise.all(
          next.place_ids.map(async (placeId) => {
            try {
              const detail = await fetchPlaceDetail(placeId);
              names[placeId] = detail.place.display_name;
            } catch {
              names[placeId] = placeId;
            }
          }),
        );
        if (!cancelled) {
          setPlaceNames(names);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load post");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [platform, postId]);

  const extracted = useMemo(() => post?.extracted_places ?? [], [post]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (error || !post) {
    return (
      <View style={styles.pad}>
        <ErrorBanner message={error ?? "Post not found"} />
      </View>
    );
  }

  const thumb = proxiedMediaUrl(post.thumbnail_url);
  const date = formatPostDate(post);
  const recipe = post.extracted_recipe;
  const ingredientText = (
    amount: string | null | undefined,
    unit: string | null | undefined,
    name: string,
    note: string | null | undefined,
  ) => {
    if (!amount || recipeMultiplier === 1) {
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
      ? String(Math.round(numeric * recipeMultiplier * 100) / 100)
      : amount;
    return [scaled, unit, name, note].filter(Boolean).join(" ");
  };
  const copyIngredients = async () => {
    if (!recipe) return;
    const text = recipe.ingredients.map((ingredient) => `- ${ingredientText(ingredient.amount, ingredient.unit, ingredient.name, ingredient.note)}`).join("\n");
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Ingredients are ready to paste into your grocery list.");
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {thumb ? (
        <View style={styles.heroWrap}>
          <Image source={{ uri: thumb }} style={styles.hero} resizeMode="cover" />
          <View style={styles.playBadge}>
            <Ionicons name="play" size={16} color={colors.onFill} />
          </View>
        </View>
      ) : null}
      <View style={styles.metaRow}>
        <Ionicons name="logo-instagram" size={14} color={colors.muted} />
        <Text style={styles.meta}>
          {getPlatformLabel(post)}
          {date ? ` · ${date}` : ""}
          {post.author_handle ? ` · @${post.author_handle}` : ""}
        </Text>
      </View>
      <Text style={styles.title}>{getPostTitle(post)}</Text>
      {post.reel_summary ? <Text style={styles.summary}>{post.reel_summary}</Text> : null}
      {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

      {recipe ? (
        <View style={styles.recipeCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="restaurant" size={16} color={colors.brand} />
            <Text style={styles.sectionTitle}>Recipe idea</Text>
          </View>
          <Text style={styles.recipeTitle}>{recipe.title ?? "Food inspiration"}</Text>
          {recipe.summary ? <Text style={styles.recipeSummary}>{recipe.summary}</Text> : null}
          {recipe.estimated_inferred ? <Text style={styles.recipeEstimate}>Chef estimated: some cooking details were filled in.</Text> : null}
          {(recipe.servings || recipe.prep_time_minutes || recipe.cook_time_minutes) ? (
            <Text style={styles.recipeMeta}>
              {[
                recipe.servings,
                recipe.prep_time_minutes ? `${recipe.prep_time_minutes} min prep` : null,
                recipe.cook_time_minutes ? `${recipe.cook_time_minutes} min cook` : null,
              ].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          {recipe.ingredients.length > 0 ? (
            <View style={styles.recipePart}>
              <View style={styles.recipeRow}><Text style={styles.recipeHeading}>Ingredients</Text><View style={styles.scaler}><Pressable onPress={() => setRecipeMultiplier((value) => Math.max(1, value / 2))}><Text style={styles.scalerButton}>−</Text></Pressable><Text style={styles.scalerText}>{recipeMultiplier}×</Text><Pressable onPress={() => setRecipeMultiplier((value) => Math.min(4, value * 2))}><Text style={styles.scalerButton}>+</Text></Pressable></View></View>
              {recipe.ingredients.map((ingredient, index) => (
                <Pressable key={`${ingredient.name}-${index}`} style={styles.ingredientRow} onPress={() => setCheckedIngredients((current) => { const next = new Set(current); next.has(index) ? next.delete(index) : next.add(index); return next; })}>
                  <Ionicons name={checkedIngredients.has(index) ? "checkbox" : "square-outline"} size={18} color={colors.brand} />
                  <Text style={[styles.recipeLine, checkedIngredients.has(index) && styles.checkedIngredient]}>{ingredientText(ingredient.amount, ingredient.unit, ingredient.name, ingredient.note)}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.copyIngredients} onPress={() => void copyIngredients()}><Ionicons name="copy-outline" size={14} color={colors.brand} /><Text style={styles.copyIngredientsText}>Copy ingredients</Text></Pressable>
            </View>
          ) : null}
          {recipe.steps.length > 0 ? (
            <View style={styles.recipePart}>
              <Text style={styles.recipeHeading}>Steps</Text>
              {recipe.steps.map((step, index) => (
                <Text key={`${index}-${step}`} style={styles.recipeLine}>{index + 1}. {step}</Text>
              ))}
            </View>
          ) : null}
          {recipe.nutrition ? (
            <View style={styles.recipePart}>
              <Text style={styles.recipeHeading}>Estimated nutrition (per serving)</Text>
              <View style={styles.nutritionRow}>
                <View style={styles.nutritionCol}>
                  <Text style={styles.nutritionVal}>{Math.round(recipe.nutrition.per_serving.calories_kcal)}</Text>
                  <Text style={styles.nutritionLabel}>kcal</Text>
                </View>
                <View style={styles.nutritionCol}>
                  <Text style={styles.nutritionVal}>{Math.round(recipe.nutrition.per_serving.protein_g * 10) / 10}g</Text>
                  <Text style={styles.nutritionLabel}>Protein</Text>
                </View>
                <View style={styles.nutritionCol}>
                  <Text style={styles.nutritionVal}>{Math.round(recipe.nutrition.per_serving.carbohydrates_g * 10) / 10}g</Text>
                  <Text style={styles.nutritionLabel}>Carbs</Text>
                </View>
                <View style={styles.nutritionCol}>
                  <Text style={styles.nutritionVal}>{Math.round(recipe.nutrition.per_serving.fat_g * 10) / 10}g</Text>
                  <Text style={styles.nutritionLabel}>Fat</Text>
                </View>
              </View>
              {recipe.nutrition.macro_highlights && recipe.nutrition.macro_highlights.length > 0 ? (
                <View style={styles.highlightRow}>
                  {recipe.nutrition.macro_highlights.map((hl, i) => (
                    <Text key={i} style={styles.highlightPill}>✨ {hl}</Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.recipeNote}>Only details found in the reel are shown. Rewatch the original for anything missing.</Text>
        </View>
      ) : null}

      {post.hashtags.length > 0 ? (
        <View style={styles.tags}>
          {post.hashtags.map((tag) => (
            <TagChip key={tag} label={tag.replace(/^#/, "")} />
          ))}
        </View>
      ) : null}

      {(post.place_ids.length > 0 || extracted.length > 0) && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={15} color={colors.brand} />
            <Text style={styles.sectionTitle}>Places</Text>
          </View>
          {post.place_ids.map((placeId, index) => {
            const extractedPlace: ExtractedPlace | undefined = extracted[index];
            return (
              <Pressable
                key={placeId}
                style={styles.placeRow}
                onPress={() => router.push(`/places/${placeId}`)}
              >
                <View style={styles.placeRowMain}>
                  <Text style={styles.placeName}>{placeNames[placeId] ?? placeId}</Text>
                  {extractedPlace ? (
                    <Text style={styles.placeMeta}>
                      {[extractedPlace.city, extractedPlace.country].filter(Boolean).join(", ")}
                    </Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.faint} />
              </Pressable>
            );
          })}
          {extracted
            .filter((_, index) => !post.place_ids[index])
            .map((place, index) => {
              const mapUrl = googleMapsUrl({
                display_name: place.place_name,
                city: place.city,
                country: place.country,
              });
              return (
                <View key={`${place.place_name}-${index}`} style={styles.placeRow}>
                  <View style={styles.placeRowMain}>
                    <Text style={styles.placeName}>{place.place_name}</Text>
                    {mapUrl ? (
                      <Pressable onPress={() => void Linking.openURL(mapUrl)} style={styles.mapLink}>
                        <Ionicons name="navigate" size={13} color={colors.brand} />
                        <Text style={styles.link}>Open in Maps</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })}
        </View>
      )}

      <Button
        label="Open original"
        icon="open-outline"
        variant="secondary"
        onPress={() => void Linking.openURL(post.post_url)}
        style={{ marginBottom: spacing.md }}
      />
      <Button
        label="Remove from library"
        icon="trash-outline"
        variant="danger"
        onPress={() => {
          Alert.alert("Remove post", "Remove this post from your library?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: () => {
                void (async () => {
                  await deletePost(post.platform, nativePostId(post));
                  bumpRefresh();
                  router.back();
                })();
              },
            },
          ]);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  pad: { padding: spacing.md },
  heroWrap: { marginBottom: spacing.md },
  hero: {
    width: "100%",
    height: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.brandSoft,
  },
  playBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    height: 34,
    width: 34,
    borderRadius: radius.pill,
    backgroundColor: "rgba(20,32,27,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
  meta: { color: colors.muted, fontSize: 13 },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink, marginBottom: spacing.sm, letterSpacing: -0.4 },
  summary: {
    backgroundColor: colors.brandSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.ink,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  recipeCard: { backgroundColor: colors.brandSoft, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  recipeTitle: { color: colors.ink, fontSize: 19, fontWeight: "800", marginBottom: 4 },
  recipeSummary: { color: colors.ink, lineHeight: 20, marginBottom: 8 },
  recipeEstimate: { color: "#9a4b0c", backgroundColor: "#fff0dc", borderRadius: radius.sm, padding: 8, fontSize: 12, marginBottom: 8 },
  recipeMeta: { color: colors.muted, fontSize: 13, marginBottom: 8 },
  recipePart: { marginTop: 8 },
  recipeHeading: { color: colors.ink, fontSize: 14, fontWeight: "800", marginBottom: 4 },
  recipeLine: { color: colors.ink, lineHeight: 21, marginBottom: 2 },
  recipeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scaler: { flexDirection: "row", alignItems: "center", gap: 8 },
  scalerButton: { color: colors.brand, fontSize: 20, fontWeight: "700", paddingHorizontal: 5 },
  scalerText: { color: colors.ink, fontWeight: "700" },
  ingredientRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 3 },
  checkedIngredient: { textDecorationLine: "line-through", color: colors.muted },
  copyIngredients: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 10 },
  copyIngredientsText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  nutritionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  nutritionCol: { flex: 1, backgroundColor: "rgba(0,0,0,0.05)", borderRadius: radius.sm, padding: 8, alignItems: "center" },
  nutritionVal: { color: colors.ink, fontWeight: "800", fontSize: 14 },
  nutritionLabel: { color: colors.muted, fontSize: 11, marginTop: 2 },
  highlightRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  highlightPill: { backgroundColor: "rgba(56, 189, 248, 0.12)", color: colors.brand, fontSize: 11, fontWeight: "600", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  recipeNote: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 12 },
  caption: { color: colors.ink, lineHeight: 22, marginBottom: spacing.md },
  tags: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.faint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow(1),
  },
  placeRowMain: { flex: 1 },
  placeName: { color: colors.brand, fontWeight: "700", fontSize: 15 },
  placeMeta: { marginTop: 4, color: colors.muted, fontSize: 13 },
  mapLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  link: { color: colors.brand, fontWeight: "600" },
});
