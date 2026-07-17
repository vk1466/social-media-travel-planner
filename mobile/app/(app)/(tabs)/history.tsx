import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  acceptTimelineReview,
  cleanupVisits,
  createVisit,
  deleteVisit,
  discardTimelineReview,
  fetchTimelineReviews,
  importTimelineFile,
  startInstagramImport,
  type Place,
  type TimelineReviewDetail,
} from "@/src/api";
import { Button, EmptyState, ErrorBanner, SuccessBanner } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { colors, spacing } from "@/src/theme";

function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatVisitDates(visitedFrom?: string | null, visitedTo?: string | null): string {
  if (!visitedFrom) {
    return "Visited · date unknown";
  }
  if (!visitedTo || visitedTo === visitedFrom) {
    return visitedFrom;
  }
  return `${visitedFrom} → ${visitedTo}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { places, visits, loading, error, bumpRefresh, refreshToken } = useLibrary();
  const [destination, setDestination] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [visitedFrom, setVisitedFrom] = useState("");
  const [visitedTo, setVisitedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [timelineImporting, setTimelineImporting] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [reviews, setReviews] = useState<TimelineReviewDetail[]>([]);
  const [reviewBusyId, setReviewBusyId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setReviews(await fetchTimelineReviews());
      } catch {
        setReviews([]);
      }
    })();
  }, [refreshToken]);

  const suggestions = useMemo(() => {
    const q = destination.trim().toLowerCase();
    if (q.length < 2 || selectedPlace) {
      return [];
    }
    return places
      .filter(
        (place) =>
          place.display_name.toLowerCase().includes(q) ||
          place.aliases.some((alias) => alias.toLowerCase().includes(q)),
      )
      .slice(0, 6);
  }, [destination, places, selectedPlace]);

  const handleImportInstagram = async () => {
    setFormError(null);
    setFormSuccess(null);
    const username = instagramUsername.trim();
    if (!username) {
      setFormError("Enter an Instagram username");
      return;
    }
    setImporting(true);
    try {
      await startInstagramImport(username);
      setInstagramUsername("");
      setFormSuccess("Import started — open Add links to watch progress");
      bumpRefresh();
      router.push("/ingest");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to start Instagram import");
    } finally {
      setImporting(false);
    }
  };

  const handleImportTimeline = async () => {
    setFormError(null);
    setFormSuccess(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["application/json", "application/zip", "public.zip-archive", "*/*"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets?.[0]) {
      return;
    }
    const asset = picked.assets[0];
    const filename = asset.name || "Timeline.json";
    if (!/\.(json|zip)$/i.test(filename)) {
      setFormError("Choose a Timeline .json or Takeout .zip file");
      return;
    }
    setTimelineImporting(true);
    try {
      await importTimelineFile(asset.uri, filename);
      setFormSuccess("Timeline import started — open Add links to watch progress");
      bumpRefresh();
      router.push("/ingest");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to import Timeline");
    } finally {
      setTimelineImporting(false);
    }
  };

  const handleAcceptReview = (visitId: string) => {
    setReviewBusyId(visitId);
    void (async () => {
      try {
        await acceptTimelineReview(visitId);
        setFormSuccess("Kept in travel history");
        bumpRefresh();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to keep place");
      } finally {
        setReviewBusyId(null);
      }
    })();
  };

  const handleDiscardReview = (visitId: string) => {
    setReviewBusyId(visitId);
    void (async () => {
      try {
        await discardTimelineReview(visitId);
        setFormSuccess("Discarded");
        bumpRefresh();
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Failed to discard place");
      } finally {
        setReviewBusyId(null);
      }
    })();
  };

  const handleCleanupVisits = (scope: "timeline" | "all") => {
    const title = scope === "timeline" ? "Clear Timeline visits" : "Clear all visit history";
    const message =
      scope === "timeline"
        ? "Delete all visits imported from Google Maps Timeline? Places with no remaining visits will be unlinked."
        : "Delete ALL visited-place history (Timeline, Instagram, and manual)? Places with no remaining visits will be unlinked.";
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              const result = await cleanupVisits(scope);
              const visitLabel = `${result.visits_deleted} visit${result.visits_deleted === 1 ? "" : "s"}`;
              const placeLabel =
                result.places_unlinked > 0
                  ? `, unlinked ${result.places_unlinked} place${result.places_unlinked === 1 ? "" : "s"}`
                  : "";
              setFormSuccess(`Cleared ${visitLabel}${placeLabel}`);
              bumpRefresh();
            } catch (err) {
              setFormError(err instanceof Error ? err.message : "Failed to clear visits");
            }
          })();
        },
      },
    ]);
  };

  const handleSave = async () => {
    setFormError(null);
    setFormSuccess(null);
    if (!selectedPlace && !destination.trim()) {
      setFormError("Pick a place from your library or enter a destination");
      return;
    }
    if (visitedTo && !visitedFrom) {
      setFormError("Enter a start date if you set an end date");
      return;
    }
    setSaving(true);
    try {
      await createVisit({
        visited_from: visitedFrom || null,
        visited_to: visitedTo || null,
        notes: notes.trim() || null,
        place_id: selectedPlace?.place_id,
        place_query: selectedPlace ? null : destination.trim(),
      });
      setFormSuccess("Saved to your visits");
      setDestination("");
      setSelectedPlace(null);
      setVisitedFrom("");
      setVisitedTo("");
      setNotes("");
      bumpRefresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save visit");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (visitId: string) => {
    Alert.alert("Delete trip", "Remove this trip from your history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await deleteVisit(visitId);
            bumpRefresh();
          })();
        },
      },
    ]);
  };

  if (loading && visits.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={visits}
      keyExtractor={(item) => item.visit.visit_id}
      ListHeaderComponent={
        <View style={styles.form}>
          <Text style={styles.title}>Import from Instagram</Text>
          <Text style={styles.subtitle}>
            Latest public posts are ingested and places marked visited. Progress survives refresh.
          </Text>
          {error ? <ErrorBanner message={error} /> : null}
          {formError ? <ErrorBanner message={formError} /> : null}
          {formSuccess ? <SuccessBanner message={formSuccess} /> : null}
          <Text style={styles.label}>Instagram username</Text>
          <TextInput
            style={styles.input}
            value={instagramUsername}
            onChangeText={setInstagramUsername}
            placeholder="@yourusername"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            label="Import visits"
            loading={importing}
            onPress={() => void handleImportInstagram()}
          />

          <Text style={[styles.title, { marginTop: spacing.lg }]}>
            Import from Google Maps Timeline
          </Text>
          <Text style={styles.subtitle}>
            Upload a phone Timeline .json or Takeout .zip. Parsed on device; processes in the
            background. Home/errands filtered; unknown types gated via OpenStreetMap.
          </Text>
          <Button
            label={timelineImporting ? "Uploading…" : "Choose Timeline file"}
            loading={timelineImporting}
            onPress={() => void handleImportTimeline()}
          />
          <Button
            label="Clear Timeline visits"
            variant="danger"
            onPress={() => handleCleanupVisits("timeline")}
          />
          <Button
            label="Clear all visit history"
            variant="danger"
            onPress={() => handleCleanupVisits("all")}
          />

          {reviews.length > 0 ? (
            <>
              <Text style={[styles.title, { marginTop: spacing.lg }]}>Review Timeline places</Text>
              <Text style={styles.subtitle}>
                Ambiguous imports — keep trip memories, discard everyday stops. Suggestions are
                hints only.
              </Text>
              {reviews.map((item) => (
                <View key={item.visit.visit_id} style={styles.reviewCard}>
                  <Text style={styles.suggestionName}>{item.visit.place_name}</Text>
                  <Text style={styles.suggestionMeta}>
                    {formatVisitDates(item.visit.visited_from, item.visit.visited_to)}
                  </Text>
                  {item.suggestion ? (
                    <Text style={styles.suggestionMeta}>
                      Suggested: {item.suggestion}
                      {item.suggestion_reason ? ` — ${item.suggestion_reason}` : ""}
                    </Text>
                  ) : null}
                  <View style={styles.reviewActions}>
                    <Button
                      label="Keep"
                      loading={reviewBusyId === item.visit.visit_id}
                      onPress={() => handleAcceptReview(item.visit.visit_id)}
                    />
                    <Button
                      label="Discard"
                      variant="danger"
                      loading={reviewBusyId === item.visit.visit_id}
                      onPress={() => handleDiscardReview(item.visit.visit_id)}
                    />
                  </View>
                </View>
              ))}
            </>
          ) : null}

          <Text style={[styles.title, { marginTop: spacing.lg }]}>Add a place you’ve visited</Text>
          <Text style={styles.subtitle}>
            Pick a library place or type a new destination. Dates are optional.
          </Text>

          <Text style={styles.label}>Destination</Text>
          <TextInput
            style={styles.input}
            value={selectedPlace?.display_name ?? destination}
            onChangeText={(value) => {
              setSelectedPlace(null);
              setDestination(value);
            }}
            placeholder="Search your places or type a name"
            placeholderTextColor={colors.muted}
          />
          {suggestions.map((place) => (
            <Pressable
              key={place.place_id}
              style={styles.suggestion}
              onPress={() => {
                setSelectedPlace(place);
                setDestination(place.display_name);
              }}
            >
              <Text style={styles.suggestionName}>{place.display_name}</Text>
              <Text style={styles.suggestionMeta}>
                {[place.location.city, place.location.country].filter(Boolean).join(", ")}
              </Text>
            </Pressable>
          ))}

          <Text style={styles.label}>From (optional)</Text>
          <Pressable style={styles.input} onPress={() => setShowFromPicker(true)}>
            <Text style={styles.dateText}>{visitedFrom || "No date"}</Text>
          </Pressable>
          {showFromPicker ? (
            <DateTimePicker
              value={visitedFrom ? new Date(visitedFrom) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowFromPicker(Platform.OS === "ios");
                if (date) {
                  setVisitedFrom(toDateInput(date));
                }
              }}
            />
          ) : null}

          <Text style={styles.label}>To (optional)</Text>
          <Pressable style={styles.input} onPress={() => setShowToPicker(true)}>
            <Text style={styles.dateText}>{visitedTo || "No date"}</Text>
          </Pressable>
          {showToPicker ? (
            <DateTimePicker
              value={visitedTo ? new Date(visitedTo) : new Date()}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(_, date) => {
                setShowToPicker(Platform.OS === "ios");
                if (date) {
                  setVisitedTo(toDateInput(date));
                }
              }}
            />
          ) : null}

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notes]}
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            placeholderTextColor={colors.muted}
          />
          <Button label="Mark as visited" loading={saving} onPress={() => void handleSave()} />
          <Text style={[styles.title, { marginTop: spacing.lg }]}>Your visits</Text>
        </View>
      }
      ListEmptyComponent={
        <EmptyState title="No visits yet" body="Mark places as visited from here or a place page." />
      }
      renderItem={({ item }) => {
        const { visit, place } = item;
        return (
          <View style={styles.card}>
            <Pressable
              disabled={!visit.place_id}
              onPress={() => visit.place_id && router.push(`/places/${visit.place_id}`)}
            >
              <Text style={styles.cardTitle}>{visit.place_name}</Text>
            </Pressable>
            {place ? (
              <Text style={styles.cardMeta}>
                {[place.location.city, place.location.country].filter(Boolean).join(", ")}
              </Text>
            ) : null}
            <Text style={styles.cardDates}>
              {formatVisitDates(visit.visited_from, visit.visited_to)}
            </Text>
            {visit.notes ? <Text style={styles.cardNotes}>{visit.notes}</Text> : null}
            <Pressable onPress={() => handleDelete(visit.visit_id)}>
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  list: { padding: spacing.md, flexGrow: 1 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink },
  subtitle: { marginTop: 4, marginBottom: spacing.md, color: colors.muted, fontSize: 14 },
  label: {
    marginTop: spacing.sm,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    backgroundColor: colors.bg,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  notes: { minHeight: 80, textAlignVertical: "top" },
  dateText: { color: colors.ink },
  suggestion: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionName: { color: colors.ink, fontWeight: "600" },
  suggestionMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  reviewCard: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  reviewActions: { marginTop: spacing.sm, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.brand },
  cardMeta: { marginTop: 4, color: colors.muted, fontSize: 13 },
  cardDates: { marginTop: 6, color: colors.ink, fontWeight: "500" },
  cardNotes: { marginTop: 8, color: colors.muted, lineHeight: 20 },
  delete: { marginTop: 12, color: colors.danger, fontWeight: "600" },
});
