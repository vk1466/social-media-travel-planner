import { Pressable, StyleSheet, Text, View, type DimensionValue } from "react-native";

import type { Place } from "../api";
import { mappablePlaces } from "../placeMapUtils";
import { colors, radius, spacing } from "../theme";

interface PlaceMapProps {
  places: Place[];
  visitedPlaceIds?: ReadonlySet<string>;
  onSelectPlace?: (place: Place) => void;
  height?: DimensionValue;
}

/** Expo web fallback — iOS/Android use PlaceMap.native.tsx (Leaflet, same as the Vite app). */
export function PlaceMap({
  places,
  visitedPlaceIds,
  onSelectPlace,
  height = 280,
}: PlaceMapProps) {
  const mapped = mappablePlaces(places);
  const visited = visitedPlaceIds ?? new Set<string>();

  return (
    <View style={[styles.wrap, { minHeight: height }]}>
      <Text style={styles.title}>Map is on iOS and Android</Text>
      <Text style={styles.copy}>
        Open this app in Expo Go or a simulator for the live map. In the browser, tap a place
        below.
      </Text>
      {mapped.slice(0, 8).map((place) => (
        <Pressable key={place.place_id} onPress={() => onSelectPlace?.(place)} style={styles.row}>
          <Text style={styles.name}>{place.display_name}</Text>
          <Text style={styles.meta}>
            {visited.has(place.place_id) ? "Visited" : "Inspiration"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: { color: colors.ink, fontWeight: "800", fontSize: 16, marginBottom: 6 },
  copy: { color: colors.muted, lineHeight: 20, marginBottom: spacing.md },
  row: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  name: { color: colors.brand, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
});
