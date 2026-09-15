import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { nativePostId } from "@/src/api";
import { FilterBar, PageHeading } from "@/src/components/LibraryChrome";
import { useLibrary } from "@/src/context/LibraryContext";
import { postTitle } from "@/src/display";
import { placeMatchesPlatform, postsForPlatforms, useLibraryPlatform } from "@/src/libraryPlatform";
import { aggregateMovies } from "@/src/movies";
import { appHref } from "@/src/nav";
import { recipesFromPosts } from "@/src/recipes";
import { colors, radius, spacing } from "@/src/theme";

export default function SearchScreen() {
  const router = useRouter();
  const { posts, places } = useLibrary();
  const { platforms } = useLibraryPlatform();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const scopedPosts = postsForPlatforms(posts, platforms);
  const recipes = recipesFromPosts(scopedPosts);
  const movies = aggregateMovies(scopedPosts);

  const results = useMemo(() => {
    if (!q) return [];
    const hits: { key: string; to: string; label: string; meta: string }[] = [];
    for (const post of scopedPosts) {
      if (`${postTitle(post)} ${post.caption}`.toLowerCase().includes(q)) {
        hits.push({
          key: `post-${post.post_id}`,
          to: `/posts/${post.platform}/${nativePostId(post)}`,
          label: postTitle(post),
          meta: "Post",
        });
      }
    }
    for (const place of places) {
      if (!placeMatchesPlatform(place.source_post_ids, posts, platforms)) continue;
      if (place.display_name.toLowerCase().includes(q)) {
        hits.push({
          key: `place-${place.place_id}`,
          to: `/places/${place.place_id}`,
          label: place.display_name,
          meta: "Place",
        });
      }
    }
    for (const recipe of recipes) {
      if ((recipe.recipe.title ?? "").toLowerCase().includes(q)) {
        hits.push({
          key: `recipe-${recipe.key}`,
          to: `/(app)/(tabs)/food`,
          label: recipe.recipe.title ?? "Recipe",
          meta: "Recipe",
        });
      }
    }
    for (const movie of movies) {
      if (movie.title.toLowerCase().includes(q)) {
        hits.push({
          key: `movie-${movie.key}`,
          to: `/(app)/(tabs)/movies`,
          label: movie.title,
          meta: "Movie",
        });
      }
    }
    return hits.slice(0, 30);
  }, [q, scopedPosts, places, recipes, movies, posts, platforms]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <PageHeading
        kicker="Search Wanderfile"
        title="Find anything you saved"
        lede="Search posts, places, recipes, and movies from one place."
        count={{ value: results.length, label: "results" }}
      />
      <FilterBar
        placeholder="Search saves"
        query={query}
        onQuery={setQuery}
        autoFocus
      />
      <View style={styles.jumps}>
        <Jump label="Posts" onPress={() => router.replace(appHref("/(app)/(tabs)/posts"))} />
        <Jump label="Places" onPress={() => router.replace(appHref("/(app)/(tabs)/travel"))} />
        <Jump label="Food" onPress={() => router.replace(appHref("/(app)/(tabs)/food"))} />
        <Jump label="Watch" onPress={() => router.replace(appHref("/(app)/(tabs)/movies"))} />
        <Jump label="Visits" onPress={() => router.replace(appHref("/(app)/(tabs)/history"))} />
      </View>
      {results.map((hit) => (
        <Pressable key={hit.key} style={styles.row} onPress={() => router.push(appHref(hit.to))}>
          <Text style={styles.label}>{hit.label}</Text>
          <Text style={styles.meta}>{hit.meta}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function Jump({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.jump}>
      <Text style={styles.jumpText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  jumps: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  jump: {
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  jumpText: { color: colors.brand, fontWeight: "700", fontSize: 13 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { color: colors.ink, fontWeight: "700" },
  meta: { color: colors.muted, marginTop: 4, fontSize: 12 },
});
