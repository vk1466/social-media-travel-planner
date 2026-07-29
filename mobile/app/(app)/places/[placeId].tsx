import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  fetchPlaceDetail,
  fetchVisitedPlaceIds,
  markPlaceVisited,
  nativePostId,
  unmarkPlaceVisited,
  type PlaceDetail,
} from "@/src/api";
import { PlaceMap } from "@/src/components/PlaceMap";
import { Button, ErrorBanner, TagChip } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { googleMapsUrl } from "@/src/maps";
import { factsAttribution, factsRows } from "@/src/placeFacts";
import { getPostTitle } from "@/src/postDisplayUtils";
import { colors, radius, shadow, spacing } from "@/src/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function SectionHeader({ icon, title }: { icon: IconName; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={15} color={colors.brand} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function PlaceDetailScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();
  const { bumpRefresh } = useLibrary();
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisited, setIsVisited] = useState(false);
  const [visitedSaving, setVisitedSaving] = useState(false);
  const [visitedError, setVisitedError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!placeId) return;
      setLoading(true);
      try {
        const [next, visitedIds] = await Promise.all([
          fetchPlaceDetail(placeId),
          fetchVisitedPlaceIds(),
        ]);
        if (!cancelled) {
          setDetail(next);
          setIsVisited(visitedIds.includes(placeId));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load place");
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
  }, [placeId]);

  const handleToggleVisited = async () => {
    if (!placeId) return;
    setVisitedError(null);
    setVisitedSaving(true);
    const next = !isVisited;
    try {
      if (next) {
        await markPlaceVisited(placeId);
      } else {
        await unmarkPlaceVisited(placeId);
      }
      setIsVisited(next);
      bumpRefresh();
    } catch (err) {
      setVisitedError(err instanceof Error ? err.message : "Failed to update visited status");
    } finally {
      setVisitedSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.pad}>
        <ErrorBanner message={error ?? "Place not found"} />
      </View>
    );
  }

  const { place, parent, children, source_posts: sourcePosts } = detail;
  const mapUrl = googleMapsUrl(place.location);
  const locationLine = [place.location.city, place.location.state_province, place.location.country]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {parent ? (
        <Pressable
          onPress={() => router.push(`/places/${parent.place_id}`)}
          style={styles.parentRow}
        >
          <Ionicons name="arrow-up" size={14} color={colors.brand} />
          <Text style={styles.parent}>Part of {parent.display_name}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.title}>{place.display_name}</Text>
      {locationLine ? (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color={colors.muted} />
          <Text style={styles.meta}>{locationLine}</Text>
        </View>
      ) : null}
      {place.aliases.length > 0 ? (
        <Text style={styles.aliases}>also known as {place.aliases.join(", ")}</Text>
      ) : null}

      <Button
        label={isVisited ? "Visited" : "Mark as visited"}
        icon={isVisited ? "checkmark-circle" : "add-circle-outline"}
        variant={isVisited ? "secondary" : "primary"}
        loading={visitedSaving}
        onPress={() => void handleToggleVisited()}
        style={styles.visitedButton}
      />
      {isVisited ? (
        <View style={styles.visitedHintRow}>
          <Ionicons name="bookmark" size={13} color={colors.muted} />
          <Text style={styles.visitedHint}>In your travel history</Text>
        </View>
      ) : null}
      {visitedError ? <ErrorBanner message={visitedError} /> : null}

      <PlaceMap places={[place, ...children]} height={220} />

      {mapUrl ? (
        <Pressable onPress={() => void Linking.openURL(mapUrl)} style={styles.mapLink}>
          <Ionicons name="navigate" size={15} color={colors.brand} />
          <Text style={styles.link}>Open in Google Maps</Text>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <SectionHeader icon="pricetag-outline" title="Category" />
        <View style={styles.tags}>
          <TagChip category={place.category} />
          {(place.attributes ?? []).map((attr) => (
            <TagChip key={attr} label={attr} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader icon="document-text-outline" title="Facts" />
        {detail.facts_refresh_queued ? (
          <Text style={styles.factMuted}>Looking up source-backed facts…</Text>
        ) : null}
        {place.facts == null && !detail.facts_refresh_queued ? (
          <Text style={styles.factMuted}>No source-backed facts yet.</Text>
        ) : null}
        {place.facts?.status === "empty" ? (
          <Text style={styles.factMuted}>No objective facts found for this place.</Text>
        ) : null}
        {place.facts && place.facts.status !== "empty"
          ? factsRows(place.facts).map((row) => (
              <View key={row.label} style={styles.factRow}>
                <Text style={styles.factLabel}>{row.label}</Text>
                {row.label === "Website" ? (
                  <Pressable onPress={() => void Linking.openURL(row.value)}>
                    <Text style={styles.factLink}>{row.value}</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.factValue}>{row.value}</Text>
                )}
              </View>
            ))
          : null}
        {place.facts && factsAttribution(place.facts) ? (
          <Text style={styles.factMuted}>{factsAttribution(place.facts)}</Text>
        ) : null}
      </View>

      {place.details.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader icon="information-circle-outline" title="Details" />
          {place.details.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <Ionicons name="ellipse" size={5} color={colors.brand} style={styles.bulletDot} />
              <Text style={styles.bullet}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {place.tips.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader icon="bulb-outline" title="Tips" />
          {place.tips.map((tip) => (
            <View key={tip} style={styles.bulletRow}>
              <Ionicons name="ellipse" size={5} color={colors.accent} style={styles.bulletDot} />
              <Text style={styles.bullet}>{tip}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {children.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader icon="pin-outline" title="Spots here" />
          {children.map((child) => (
            <Pressable
              key={child.place_id}
              style={styles.row}
              onPress={() => router.push(`/places/${child.place_id}`)}
            >
              <Text style={styles.rowTitle}>{child.display_name}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {sourcePosts.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader icon="albums-outline" title="Source posts" />
          {sourcePosts.map((post) => (
            <Pressable
              key={post.post_id}
              style={styles.row}
              onPress={() =>
                router.push(`/posts/${post.platform}/${nativePostId(post)}`)
              }
            >
              <Text style={styles.rowTitle}>{getPostTitle(post)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  pad: { padding: spacing.md },
  parentRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  parent: { color: colors.brand, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "800", color: colors.ink, letterSpacing: -0.4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  meta: { color: colors.muted, fontSize: 14 },
  aliases: { marginTop: 4, color: colors.faint, fontSize: 13, fontStyle: "italic" },
  visitedButton: { marginTop: spacing.md, marginBottom: spacing.sm, alignSelf: "flex-start" },
  visitedHintRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.md },
  visitedHint: { color: colors.muted, fontSize: 13 },
  mapLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.md,
    alignSelf: "flex-start",
  },
  link: { color: colors.brand, fontWeight: "700" },
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.faint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tags: { flexDirection: "row", flexWrap: "wrap" },
  factRow: { marginBottom: spacing.sm },
  factLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.faint,
    marginBottom: 2,
  },
  factValue: { color: colors.ink, lineHeight: 20 },
  factLink: { color: colors.brand, fontWeight: "600", lineHeight: 20 },
  factMuted: { color: colors.muted, fontSize: 13, marginBottom: spacing.sm },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  bulletDot: { marginTop: 8 },
  bullet: { flex: 1, color: colors.ink, lineHeight: 22 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow(1),
  },
  rowTitle: { flex: 1, color: colors.brand, fontWeight: "600" },
});
