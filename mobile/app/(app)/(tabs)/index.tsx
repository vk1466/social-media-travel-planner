import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useLibrary } from "@/src/context/LibraryContext";
import { appHref } from "@/src/nav";
import { colors, radius, shadow, typography } from "@/src/theme";

export default function MobileHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { posts, places, loading } = useLibrary();
  const [pasteInput, setPasteInput] = useState("");

  const hasSaves = posts.length > 0;
  const placesCount = places.length;
  const recipesCount = posts.filter((p) => p.content_category === "food").length;
  const titlesCount = posts.filter((p) => p.content_category === "movies").length;

  const topPlace = places.length > 0 ? places[0] : null;

  const handlePasteSubmit = () => {
    if (pasteInput.trim()) {
      router.push({
        pathname: "/(app)/ingest" as any,
        params: { link: pasteInput.trim() },
      });
      setPasteInput("");
    } else {
      router.push("/(app)/ingest" as any);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: Math.max(insets.top, 16), paddingBottom: 100 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Top Header */}
      <View style={styles.headerRow}>
        <View style={styles.brandGroup}>
          <View style={styles.brandIcon}>
            <Ionicons name="location" size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.brandTitle}>Wanderfile</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account menu"
          onPress={() => router.push(appHref("/(app)/settings"))}
          style={styles.avatarButton}
        >
          <Text style={styles.avatarText}>V</Text>
        </Pressable>
      </View>

      <Text style={styles.screenHeading}>
        {hasSaves ? "Pick something to do next." : "Nothing saved yet"}
      </Text>

      {!hasSaves && (
        <Text style={styles.emptySubtext}>
          Paste a link and it will show up here, already filed.
        </Text>
      )}

      {/* Paste bar matching Mobile-Home.dc.html */}
      <View style={styles.pasteBar}>
        <Ionicons name="link-outline" size={20} color={colors.muted} />
        <TextInput
          placeholder={hasSaves ? "Paste a link or search" : "Paste a link"}
          placeholderTextColor={colors.muted}
          value={pasteInput}
          onChangeText={setPasteInput}
          onSubmitEditing={handlePasteSubmit}
          style={styles.pasteInput}
          returnKeyType="go"
        />
        <Pressable onPress={handlePasteSubmit} hitSlop={8}>
          <Ionicons name="arrow-forward-circle" size={28} color={colors.ink} />
        </Pressable>
      </View>

      {!hasSaves ? (
        /* Empty Home matching Mobile-Empty-Home.dc.html */
        <View style={styles.emptySection}>
          <View style={styles.getStartedCard}>
            <View style={styles.getStartedHeader}>
              <Text style={styles.getStartedTitle}>Get started</Text>
              <Text style={styles.getStartedCount}>0 of 3</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={styles.progressBarFill} />
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: colors.ink }]}>
                <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 13 }}>1</Text>
              </View>
              <Text style={styles.stepText}>Save a link</Text>
            </View>

            <View style={styles.stepRow}>
              <View style={[styles.stepBadge, { backgroundColor: colors.brandSoft }]}>
                <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 13 }}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.muted }]}>Look at your library</Text>
            </View>

            <View style={[styles.stepRow, { borderBottomWidth: 0 }]}>
              <View style={[styles.stepBadge, { backgroundColor: colors.brandSoft }]}>
                <Text style={{ color: colors.muted, fontWeight: "800", fontSize: 13 }}>3</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.muted }]}>Make a collection</Text>
            </View>
          </View>

          <View style={styles.dashedPrompt}>
            <Text style={styles.dashedPromptTitle}>Collections group your saves</Text>
            <Text style={styles.dashedPromptSub}>
              We'll suggest one when you save a few similar posts.
            </Text>
          </View>
        </View>
      ) : (
        /* Populated Home matching Mobile-Home.dc.html */
        <View style={styles.populatedSection}>
          {/* Next Up Card */}
          {topPlace && (
            <Pressable
              onPress={() => router.push(appHref(`/(app)/places/${topPlace.place_id}`))}
              style={[styles.nextUpCard, shadow(2)]}
            >
              <View style={styles.nextUpBadge}>
                <Text style={styles.nextUpBadgeText}>Next up</Text>
              </View>
              <Text style={styles.nextUpTitle} numberOfLines={1}>
                {topPlace.display_name}
              </Text>
              <Text style={styles.nextUpLocation}>
                {[topPlace.location?.city, topPlace.location?.state_province, topPlace.location?.country]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </Pressable>
          )}

          {/* 3 Collection Metric Cards */}
          <View style={styles.metricRow}>
            <Pressable
              onPress={() => router.push(appHref("/(app)/(tabs)/travel"))}
              style={[styles.metricCard, shadow(1)]}
            >
              <Text style={styles.metricCount}>{placesCount}</Text>
              <Text style={[styles.metricLabel, { color: colors.travelInk }]}>On the map</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(appHref("/(app)/(tabs)/collections"))}
              style={[styles.metricCard, shadow(1)]}
            >
              <Text style={styles.metricCount}>{recipesCount}</Text>
              <Text style={[styles.metricLabel, { color: colors.foodInk }]}>Recipes</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(appHref("/(app)/(tabs)/collections"))}
              style={[styles.metricCard, shadow(1)]}
            >
              <Text style={styles.metricCount}>{titlesCount}</Text>
              <Text style={[styles.metricLabel, { color: colors.movieInk }]}>Watch</Text>
            </Pressable>
          </View>

          {/* Recently Saved section */}
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recently saved</Text>
            <Pressable onPress={() => router.push(appHref("/(app)/(tabs)/posts"))}>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          <View style={styles.recentRow}>
            {posts.slice(0, 2).map((post) => (
              <Pressable
                key={post.post_id}
                onPress={() => router.push(appHref("/(app)/(tabs)/posts"))}
                style={[styles.recentCard, shadow(1)]}
              >
                <View style={styles.recentThumbPlaceholder} />
                <Text style={styles.recentCaption} numberOfLines={2}>
                  {post.caption || "Saved post"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
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
    marginBottom: 20,
  },
  brandGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: colors.ink,
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
  screenHeading: {
    fontSize: 30,
    lineHeight: 33,
    letterSpacing: -0.8,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.bodyTinted,
    marginBottom: 16,
  },
  pasteBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  pasteInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
  },
  emptySection: {
    gap: 16,
  },
  getStartedCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 20,
  },
  getStartedHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  getStartedTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: colors.ink,
  },
  getStartedCount: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginVertical: 12,
    overflow: "hidden",
  },
  progressBarFill: {
    width: "4%",
    height: "100%",
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink,
  },
  dashedPrompt: {
    borderWidth: 2,
    borderColor: colors.borderDashed,
    borderStyle: "dashed",
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    padding: 16,
  },
  dashedPromptTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
  },
  dashedPromptSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  populatedSection: {
    gap: 16,
  },
  nextUpCard: {
    height: 190,
    borderRadius: 24,
    padding: 20,
    justifyContent: "flex-end",
    backgroundColor: "#8E4A2B",
  },
  nextUpBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginBottom: 8,
  },
  nextUpBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  nextUpTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  nextUpLocation: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricCount: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 8,
  },
  recentTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.ink,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  recentRow: {
    flexDirection: "row",
    gap: 12,
  },
  recentCard: {
    flex: 1,
  },
  recentThumbPlaceholder: {
    height: 130,
    borderRadius: 18,
    backgroundColor: "#2D6A82",
  },
  recentCaption: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    lineHeight: 17,
  },
});
