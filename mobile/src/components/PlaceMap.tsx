import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import type { Place } from "../api";
import { mappablePlaces } from "../placeMapUtils";
import { colors, spacing } from "../theme";

interface PlaceMapProps {
  places: Place[];
  visitedPlaceIds?: ReadonlySet<string>;
  onSelectPlace?: (place: Place) => void;
  height?: number;
}

export function PlaceMap({
  places,
  visitedPlaceIds,
  onSelectPlace,
  height = 280,
}: PlaceMapProps) {
  const mapped = useMemo(() => mappablePlaces(places), [places]);
  const visited = visitedPlaceIds ?? new Set<string>();

  const region = useMemo(() => {
    if (mapped.length === 0) {
      return {
        latitude: 20,
        longitude: 0,
        latitudeDelta: 80,
        longitudeDelta: 80,
      };
    }
    const lats = mapped.map((p) => p.location.latitude!);
    const lngs = mapped.map((p) => p.location.longitude!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.5, (maxLat - minLat) * 1.4 || 2),
      longitudeDelta: Math.max(0.5, (maxLng - minLng) * 1.4 || 2),
    };
  }, [mapped]);

  if (mapped.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>No mapped places yet</Text>
      </View>
    );
  }

  const visitedCount = mapped.filter((place) => visited.has(place.place_id)).length;

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView style={StyleSheet.absoluteFill} provider={PROVIDER_DEFAULT} initialRegion={region}>
        {mapped.map((place) => {
          const isVisited = visited.has(place.place_id);
          return (
            <Marker
              key={place.place_id}
              coordinate={{
                latitude: place.location.latitude!,
                longitude: place.location.longitude!,
              }}
              title={place.display_name}
              description={isVisited ? "Visited" : undefined}
              pinColor={isVisited ? colors.success : colors.accent}
              onCalloutPress={() => onSelectPlace?.(place)}
            />
          );
        })}
      </MapView>
      <View style={styles.legend}>
        <Text style={styles.legendText}>
          {mapped.length} on map
          {visitedCount > 0 ? ` · ${visitedCount} visited` : ""}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  empty: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyText: {
    color: colors.muted,
  },
  legend: {
    position: "absolute",
    left: spacing.sm,
    bottom: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  legendText: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: "500",
  },
});
