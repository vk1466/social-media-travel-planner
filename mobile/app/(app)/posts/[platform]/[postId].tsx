import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {thumb ? (
        <View style={styles.heroWrap}>
          <Image source={{ uri: thumb }} style={styles.hero} resizeMode="cover" />
          <View style={styles.playBadge}>
            <Ionicons name="play" size={16} color="#fff" />
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
