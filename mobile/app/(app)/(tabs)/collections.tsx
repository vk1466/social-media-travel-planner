import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLibrary } from "@/src/context/LibraryContext";
import { appHref } from "@/src/nav";
import { proxiedMediaUrl } from "@/src/postDisplayUtils";
import { colors, fonts } from "@/src/theme";

interface CollectionItem {
  id: string;
  name: string;
  meta: string;
  kit: string;
  kitBg: string;
  kitInk: string;
  route: string;
  fallbackColors: [string, string, string];
  images: (string | null)[];
}

export default function MobileCollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, places } = useLibrary();
  const [showSuggested, setShowSuggested] = useState(true);

  const placesCount = places.length;
  const foodPosts = posts.filter((p) => p.content_category === "food");
  const moviePosts = posts.filter((p) => p.content_category === "movies");
  const travelPosts = posts.filter((p) => p.content_category === "travel" || p.places?.length);

  const foodThumbs = foodPosts.map((p) => proxiedMediaUrl(p.thumbnail_url)).filter(Boolean).slice(0, 3);
  const movieThumbs = moviePosts.map((p) => proxiedMediaUrl(p.thumbnail_url)).filter(Boolean).slice(0, 3);
  const travelThumbs = travelPosts.map((p) => proxiedMediaUrl(p.thumbnail_url)).filter(Boolean).slice(0, 3);

  const collections: CollectionItem[] = [
    {
      id: "recipes",
      name: "Recipes",
      meta: `${foodPosts.length} saves`,
      kit: "Recipe kit",
      kitBg: "#FBEBDD",
      kitInk: "#9A4513",
      route: "/(app)/(tabs)/food",
      fallbackColors: ["#E4B25B", "#C78A55", "#8DB06A"],
      images: foodThumbs,
    },
    {
      id: "watch",
      name: "Watch",
      meta: `${moviePosts.length} saves`,
      kit: "Title kit",
      kitBg: "#ECE8F7",
      kitInk: "#4B3C8C",
      route: "/(app)/(tabs)/movies",
      fallbackColors: ["#6B4A78", "#C4642B", "#4F7F86"],
      images: movieThumbs,
    },
    {
      id: "pnw",
      name: "Pacific Northwest",
      meta: "Fills itself",
      kit: "Place kit",
      kitBg: "#E3F0F4",
      kitInk: "#1B5E78",
      route: "/(app)/(tabs)/travel",
      fallbackColors: ["#8CC3D6", "#8DB48A", "#C98A5B"],
      images: travelThumbs,
    },
    {
      id: "vietnam",
      name: "Vietnam",
      meta: `${placesCount > 0 ? placesCount : 12} places`,
      kit: "Place kit",
      kitBg: "#E3F0F4",
      kitInk: "#1B5E78",
      route: "/(app)/(tabs)/travel",
      fallbackColors: ["#D9B26A", "#C96A3C", "#7FB06A"],
      images: travelThumbs.slice().reverse(),
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: 84 + insets.bottom + 24,
        },
      ]}
    >
      {/* C1: Title "Collections" with 44px round ink "+" button and subtitle */}
      <View style={styles.headerRow}>
        <Text style={styles.screenHeading}>Collections</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New collection"
          onPress={() => router.push(appHref("/(app)/coming-soon"))}
          style={styles.plusButton}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Groups that build themselves as you save.</Text>

      {/* C2: Suggested Workouts card */}
      {showSuggested ? (
        <View style={styles.suggestedCard}>
          <View style={styles.suggestedTopRow}>
            <View style={styles.suggestedIconWrap} />
            <View>
              <Text style={styles.suggestedBadge}>SUGGESTED</Text>
              <Text style={styles.suggestedTitle}>Workouts</Text>
            </View>
          </View>
          <Text style={styles.suggestedDesc}>
            A few saves look like routines, like &quot;Kettlebell full body workout&quot;.
          </Text>
          <View style={styles.suggestedButtonsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create Workouts collection"
              onPress={() => router.push(appHref("/(app)/coming-soon"))}
              style={styles.createButton}
            >
              <Text style={styles.createButtonText}>Create</Text>
              <View style={styles.soonPill}>
                <Text style={styles.soonPillText}>Soon</Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss suggestion"
              onPress={() => setShowSuggested(false)}
              style={styles.notNowButton}
            >
              <Text style={styles.notNowButtonText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* C3: "Your collections" two-column grid */}
      <Text style={styles.sectionHeading}>Your collections</Text>
      <View style={styles.grid}>
        {collections.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => router.push(appHref(c.route as any))}
            style={styles.collectionCard}
          >
            {/* 92px collage cover: 1 large on left, 2 small stacked on right */}
            <View style={styles.collageCover}>
              <View
                style={[
                  styles.collageLarge,
                  { backgroundColor: c.fallbackColors[0] },
                ]}
              >
                {c.images[0] ? (
                  <Image source={{ uri: c.images[0] }} style={styles.coverImage} />
                ) : null}
              </View>
              <View style={styles.collageSmallStack}>
                <View
                  style={[
                    styles.collageSmall,
                    { backgroundColor: c.fallbackColors[1] },
                  ]}
                >
                  {c.images[1] ? (
                    <Image source={{ uri: c.images[1] }} style={styles.coverImage} />
                  ) : null}
                </View>
                <View
                  style={[
                    styles.collageSmall,
                    { backgroundColor: c.fallbackColors[2] },
                  ]}
                >
                  {c.images[2] ? (
                    <Image source={{ uri: c.images[2] }} style={styles.coverImage} />
                  ) : null}
                </View>
              </View>
            </View>

            {/* Collection info */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardName} numberOfLines={1}>
                {c.name}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {c.meta}
              </Text>
              <View style={[styles.kitBadge, { backgroundColor: c.kitBg }]}>
                <Text style={[styles.kitText, { color: c.kitInk }]}>{c.kit}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F5F1",
  },
  content: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenHeading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#1B1D1F",
    letterSpacing: -0.8,
    fontFamily: fonts.heavy,
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1B1D1F",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B6F73",
    marginTop: 6,
    fontFamily: fonts.body,
  },
  suggestedCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#C9C5BA",
    borderStyle: "dashed",
    backgroundColor: "#FBFAF7",
  },
  suggestedTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  suggestedIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#E9D8CC",
  },
  suggestedBadge: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "#25623A",
    fontFamily: fonts.bold,
  },
  suggestedTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: "#1B1D1F",
    fontFamily: fonts.heavy,
  },
  suggestedDesc: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#6B6F73",
    fontFamily: fonts.body,
  },
  suggestedButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    alignItems: "center",
  },
  createButton: {
    flex: 1,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#1B1D1F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: fonts.bold,
  },
  soonPill: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  soonPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  notNowButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  notNowButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#4A4E52",
    fontFamily: fonts.bold,
  },
  sectionHeading: {
    marginTop: 24,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: "#1B1D1F",
    fontFamily: fonts.heavy,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  collectionCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E3DC",
    borderRadius: 20,
    padding: 8,
  },
  collageCover: {
    height: 92,
    flexDirection: "row",
    gap: 4,
  },
  collageLarge: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  collageSmallStack: {
    flex: 1,
    flexDirection: "column",
    gap: 4,
  },
  collageSmall: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  cardInfo: {
    paddingTop: 10,
    paddingHorizontal: 6,
    paddingBottom: 4,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: "#1B1D1F",
    fontFamily: fonts.heavy,
  },
  cardMeta: {
    marginTop: 2,
    fontSize: 12,
    color: "#6B6F73",
    fontFamily: fonts.body,
  },
  kitBadge: {
    alignSelf: "flex-start",
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  kitText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: fonts.bold,
  },
});
