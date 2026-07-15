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

import { fetchPlaceDetail, nativePostId, type PlaceDetail } from "@/src/api";
import { PlaceMap } from "@/src/components/PlaceMap";
import { ErrorBanner, TagChip } from "@/src/components/ui";
import { googleMapsUrl } from "@/src/maps";
import { getPostTitle } from "@/src/postDisplayUtils";
import { colors, spacing } from "@/src/theme";

export default function PlaceDetailScreen() {
  const { placeId } = useLocalSearchParams<{ placeId: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!placeId) return;
      setLoading(true);
      try {
        const next = await fetchPlaceDetail(placeId);
        if (!cancelled) {
          setDetail(next);
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
        <Pressable onPress={() => router.push(`/places/${parent.place_id}`)}>
          <Text style={styles.parent}>Part of {parent.display_name}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.title}>{place.display_name}</Text>
      {locationLine ? <Text style={styles.meta}>{locationLine}</Text> : null}
      {place.aliases.length > 0 ? (
        <Text style={styles.meta}>also known as {place.aliases.join(", ")}</Text>
      ) : null}

      <PlaceMap places={[place, ...children]} height={220} />

      {mapUrl ? (
        <Pressable onPress={() => void Linking.openURL(mapUrl)} style={styles.mapLink}>
          <Text style={styles.link}>Open in Google Maps</Text>
        </Pressable>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.tags}>
          <TagChip label={place.category ?? "Uncategorized"} />
          {(place.attributes ?? []).map((attr) => (
            <TagChip key={attr} label={attr} />
          ))}
        </View>
      </View>

      {place.details.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          {place.details.map((item) => (
            <Text key={item} style={styles.bullet}>
              • {item}
            </Text>
          ))}
        </View>
      ) : null}

      {place.tips.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tips</Text>
          {place.tips.map((tip) => (
            <Text key={tip} style={styles.bullet}>
              • {tip}
            </Text>
          ))}
        </View>
      ) : null}

      {children.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spots here</Text>
          {children.map((child) => (
            <Pressable
              key={child.place_id}
              style={styles.row}
              onPress={() => router.push(`/places/${child.place_id}`)}
            >
              <Text style={styles.rowTitle}>{child.display_name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {sourcePosts.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Source posts</Text>
          {sourcePosts.map((post) => (
            <Pressable
              key={post.post_id}
              style={styles.row}
              onPress={() =>
                router.push(`/posts/${post.platform}/${nativePostId(post)}`)
              }
            >
              <Text style={styles.rowTitle}>{getPostTitle(post)}</Text>
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
  parent: { color: colors.brand, fontWeight: "600", marginBottom: 6 },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink },
  meta: { marginTop: 4, color: colors.muted, marginBottom: spacing.md },
  mapLink: { marginBottom: spacing.md },
  link: { color: colors.brand, fontWeight: "700" },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  tags: { flexDirection: "row", flexWrap: "wrap" },
  bullet: { color: colors.ink, lineHeight: 22, marginBottom: 4 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowTitle: { color: colors.brand, fontWeight: "600" },
});
