import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
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

import { createVisit, deleteVisit, type Place } from "@/src/api";
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
  const { places, visits, loading, error, bumpRefresh } = useLibrary();
  const [destination, setDestination] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [visitedFrom, setVisitedFrom] = useState("");
  const [visitedTo, setVisitedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

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
          <Text style={styles.title}>Add a place you’ve visited</Text>
          <Text style={styles.subtitle}>
            Pick a library place or type a new destination. Dates are optional.
          </Text>
          {error ? <ErrorBanner message={error} /> : null}
          {formError ? <ErrorBanner message={formError} /> : null}
          {formSuccess ? <SuccessBanner message={formSuccess} /> : null}

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
