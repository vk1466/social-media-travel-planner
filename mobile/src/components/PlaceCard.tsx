import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Place } from "../api";
import { colors, radius, shadow, spacing } from "../theme";
import { TagChip } from "./ui";

interface PlaceCardProps {
  place: Place;
  visited?: boolean;
  onPress: () => void;
}

export function PlaceCard({ place, visited = false, onPress }: PlaceCardProps) {
  const locationLine = [place.location.city, place.location.country].filter(Boolean).join(", ");
  const attributes = (place.attributes ?? []).slice(0, 3);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.main}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {place.display_name}
          </Text>
          {visited ? (
            <View style={styles.visitedBadge}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={styles.visitedText}>Visited</Text>
            </View>
          ) : null}
        </View>
        {locationLine ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={13} color={colors.muted} />
            <Text style={styles.location} numberOfLines={1}>
              {locationLine}
            </Text>
          </View>
        ) : null}
        <View style={styles.tags}>
          <TagChip category={place.category} />
          {attributes.map((attr) => (
            <TagChip key={attr} label={attr} />
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} style={styles.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    ...shadow(1),
  },
  main: {
    flex: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  visitedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  visitedText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "700",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 5,
  },
  location: {
    flex: 1,
    color: colors.muted,
    fontSize: 13,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: spacing.sm,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
});
