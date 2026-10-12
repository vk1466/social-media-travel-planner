import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLibrary } from "@/src/context/LibraryContext";
import { appHref } from "@/src/nav";
import { colors, radius, shadow } from "@/src/theme";

export default function MobileCollectionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, places } = useLibrary();

  const placesCount = places.length;
  const recipesCount = posts.filter((p) => p.content_category === "food").length;
  const titlesCount = posts.filter((p) => p.content_category === "movies").length;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16), paddingBottom: 100 },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.screenHeading}>Collections</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(appHref("/(app)/settings"))}
          style={styles.avatarButton}
        >
          <Text style={styles.avatarText}>V</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        {/* Map Collection Card */}
        <Pressable
          onPress={() => router.push(appHref("/(app)/(tabs)/travel"))}
          style={[styles.collectionCard, shadow(1)]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.travelTint }]}>
            <Ionicons name="location" size={22} color={colors.travelInk} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Map</Text>
            <Text style={styles.cardSubtitle}>Everything with a location</Text>
          </View>
          <Text style={styles.countText}>{placesCount}</Text>
        </Pressable>

        {/* Recipes Collection Card */}
        <Pressable
          onPress={() => router.push(appHref("/(app)/(tabs)/food"))}
          style={[styles.collectionCard, shadow(1)]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.foodTint }]}>
            <Ionicons name="restaurant" size={22} color={colors.foodInk} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Recipes</Text>
            <Text style={styles.cardSubtitle}>Recipe kit</Text>
          </View>
          <Text style={styles.countText}>{recipesCount}</Text>
        </Pressable>

        {/* Watch Collection Card */}
        <Pressable
          onPress={() => router.push(appHref("/(app)/(tabs)/movies"))}
          style={[styles.collectionCard, shadow(1)]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.movieTint }]}>
            <Ionicons name="film" size={22} color={colors.movieInk} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Watch</Text>
            <Text style={styles.cardSubtitle}>Title kit</Text>
          </View>
          <Text style={styles.countText}>{titlesCount}</Text>
        </Pressable>

        {/* Suggested Collection Prompt */}
        <View style={styles.suggestedCard}>
          <View style={[styles.iconWrap, { backgroundColor: colors.routineTint }]}>
            <Ionicons name="add" size={22} color={colors.routineInk} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Workouts?</Text>
            <Text style={styles.cardSubtitle}>A few saves look alike. Routine kit.</Text>
          </View>
          <View style={styles.soonPill}>
            <Text style={styles.soonText}>Soon</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  screenHeading: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.8,
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  list: {
    gap: 12,
  },
  collectionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  countText: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },
  suggestedCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.borderDashed,
    borderStyle: "dashed",
    backgroundColor: colors.surfaceAlt,
    gap: 14,
    marginTop: 6,
  },
  soonPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
  },
  soonText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.muted,
    textTransform: "uppercase",
  },
});
