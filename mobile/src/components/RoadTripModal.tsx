import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  type Place,
  type RouteOptimizationResult,
  type RouteStopInput,
  optimizeRoute,
} from "@/src/api";
import { colors, radius, shadow, spacing } from "@/src/theme";

export interface RoadTripModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  postId?: string | null;
  places: Place[];
}

type Strategy = "shortest" | "first" | "loop";
type TravelMode = "driving" | "walking" | "bicycling";

export function RoadTripModal({
  visible,
  onClose,
  title,
  postId,
  places,
}: RoadTripModalProps) {
  const insets = useSafeAreaInsets();
  const [strategy, setStrategy] = useState<Strategy>("shortest");
  const [travelMode, setTravelMode] = useState<TravelMode>("driving");
  const [filterOffRoad, setFilterOffRoad] = useState(true);
  const [cache, setCache] = useState<Record<string, RouteOptimizationResult>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Filter valid places with coordinates
  const validPlaces = places.filter(
    (p) => p.location?.latitude != null && p.location?.longitude != null,
  );

  const filterKey = travelMode === "driving" ? (filterOffRoad ? "filtered" : "all") : "all";
  const cacheKey = `${strategy}-${travelMode}-${filterKey}`;
  const currentResult = cache[cacheKey];

  const fetchOptimization = useCallback(
    async (strat: Strategy, mode: TravelMode, filterRoads: boolean) => {
      const fKey = mode === "driving" ? (filterRoads ? "filtered" : "all") : "all";
      const key = `${strat}-${mode}-${fKey}`;
      if (cache[key]) return;

      setLoading(true);
      setError(null);

      try {
        const stops: RouteStopInput[] = validPlaces.map((p) => ({
          stop_id: p.place_id,
          name: p.display_name,
          latitude: p.location.latitude!,
          longitude: p.location.longitude!,
          category: p.category,
          address: [p.location.city, p.location.state_province, p.location.country]
            .filter(Boolean)
            .join(", "),
        }));

        const res = await optimizeRoute({
          stops,
          place_ids: places.map((p) => p.place_id),
          post_id: postId,
          start_mode: strat === "first" ? "fixed" : "any",
          round_trip: strat === "loop",
          travel_mode: mode,
          filter_unreachable: mode === "driving" ? filterRoads : false,
        });

        setCache((prev) => ({ ...prev, [key]: res }));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Could not optimize route";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [cache, places, postId, validPlaces],
  );

  useEffect(() => {
    if (!visible || validPlaces.length === 0) return;
    void fetchOptimization(strategy, travelMode, filterOffRoad);
  }, [visible, strategy, travelMode, filterOffRoad, fetchOptimization, validPlaces.length]);

  const handleCopy = async () => {
    const url = currentResult?.google_maps_url || fallbackUrl;
    if (url) {
      await Clipboard.setStringAsync(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Fallback direct directions URL using available names / coords
  const fallbackUrl = (() => {
    const waypoints = places
      .map((p) => {
        if (p.location?.latitude != null && p.location?.longitude != null) {
          return `${p.location.latitude},${p.location.longitude}`;
        }
        return encodeURIComponent(p.display_name);
      })
      .filter(Boolean);
    if (waypoints.length >= 2) {
      return `https://www.google.com/maps/dir/${waypoints.join("/")}`;
    }
    if (waypoints.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&destination=${waypoints[0]}`;
    }
    return null;
  })();

  const shortestRes = cache[`shortest-${travelMode}-${filterKey}`];
  const firstRes = cache[`first-${travelMode}-${filterKey}`];
  const loopRes = cache[`loop-${travelMode}-${filterKey}`];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          {/* Top Grabber */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <Ionicons name="car-sport" size={20} color={colors.brand} />
              </View>
              <View style={styles.titleWrap}>
                <Text style={styles.title} numberOfLines={1}>
                  {title || "Distance-Optimized Road Trip"}
                </Text>
                <Text style={styles.subtitle}>
                  {validPlaces.length > 0 ? `${validPlaces.length} stops` : "Road trip"}{" "}
                  · Powered by Google OR-Tools
                </Text>
              </View>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>

          {/* Strategy Tabs */}
          <View style={styles.strategyRow}>
            <Pressable
              style={[styles.strategyTab, strategy === "shortest" && styles.strategyTabActive]}
              onPress={() => setStrategy("shortest")}
            >
              <View style={styles.strategyTop}>
                <Text
                  style={[
                    styles.strategyTitle,
                    strategy === "shortest" && styles.strategyTitleActive,
                  ]}
                  numberOfLines={1}
                >
                  Shortest
                </Text>
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>Best</Text>
                </View>
              </View>
              <Text style={styles.strategyMetric} numberOfLines={1}>
                {shortestRes
                  ? `${shortestRes.total_distance_km}km · -${shortestRes.savings_percent}%`
                  : "Optimal start"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.strategyTab, strategy === "first" && styles.strategyTabActive]}
              onPress={() => setStrategy("first")}
            >
              <View style={styles.strategyTop}>
                <Text
                  style={[
                    styles.strategyTitle,
                    strategy === "first" && styles.strategyTitleActive,
                  ]}
                  numberOfLines={1}
                >
                  Stop #1
                </Text>
              </View>
              <Text style={styles.strategyMetric} numberOfLines={1}>
                {firstRes
                  ? `${firstRes.total_distance_km}km · -${firstRes.savings_percent}%`
                  : "Fixed origin"}
              </Text>
            </Pressable>

            <Pressable
              style={[styles.strategyTab, strategy === "loop" && styles.strategyTabActive]}
              onPress={() => setStrategy("loop")}
            >
              <View style={styles.strategyTop}>
                <Text
                  style={[
                    styles.strategyTitle,
                    strategy === "loop" && styles.strategyTitleActive,
                  ]}
                  numberOfLines={1}
                >
                  Loop
                </Text>
              </View>
              <Text style={styles.strategyMetric} numberOfLines={1}>
                {loopRes ? `${loopRes.total_distance_km}km loop` : "Round trip"}
              </Text>
            </Pressable>
          </View>

          {/* Controls Bar: Mode + Off-Road Filter + Savings */}
          <View style={styles.controlsBar}>
            <View style={styles.modesRow}>
              {(["driving", "walking", "bicycling"] as const).map((mode) => (
                <Pressable
                  key={mode}
                  style={[styles.modeBtn, travelMode === mode && styles.modeBtnActive]}
                  onPress={() => setTravelMode(mode)}
                >
                  <Text
                    style={[
                      styles.modeBtnText,
                      travelMode === mode && styles.modeBtnTextActive,
                    ]}
                  >
                    {mode === "driving" ? "🚗 Drive" : mode === "walking" ? "🚶 Walk" : "🚲 Bike"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {travelMode === "driving" && (
              <Pressable
                style={[styles.filterOffRoadBtn, filterOffRoad && styles.filterOffRoadBtnActive]}
                onPress={() => setFilterOffRoad((v) => !v)}
              >
                <Text style={styles.filterOffRoadText}>🛣️ Filter Off-Road</Text>
                <View
                  style={[
                    styles.filterToggleBadge,
                    filterOffRoad && styles.filterToggleBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterToggleText,
                      filterOffRoad && styles.filterToggleTextActive,
                    ]}
                  >
                    {filterOffRoad ? "ON" : "OFF"}
                  </Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Savings Pill */}
          {currentResult && currentResult.savings_meters > 0 && (
            <View style={styles.savingsBanner}>
              <Text style={styles.savingsText}>
                ⚡ Saved {(currentResult.savings_meters / 1000).toFixed(1)} km (
                {currentResult.savings_percent}%) with OR-Tools distance optimization
              </Text>
            </View>
          )}

          {/* Excluded Stops Warning */}
          {currentResult?.excluded_stops && currentResult.excluded_stops.length > 0 && (
            <View style={styles.excludedBanner}>
              <View style={styles.excludedHeader}>
                <Text style={styles.excludedTitle}>
                  ⚠️ {currentResult.excluded_stops.length}{" "}
                  {currentResult.excluded_stops.length === 1 ? "stop" : "stops"} excluded (no road
                  access)
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.excludedList}>
                {currentResult.excluded_stops.map((exc) => (
                  <View key={exc.stop_id} style={styles.excludedPill}>
                    <Text style={styles.excludedName}>{exc.name}</Text>
                    <Text style={styles.excludedReason}>
                      {exc.road_distance_meters
                        ? `${(exc.road_distance_meters / 1000).toFixed(1)} km off-road`
                        : "unroutable"}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Metrics Row */}
          {currentResult && (
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{currentResult.total_distance_km} km</Text>
                <Text style={styles.metricLbl}>Total Distance</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>{currentResult.ordered_stops.length}</Text>
                <Text style={styles.metricLbl}>Stops</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricVal}>
                  ~
                  {travelMode === "walking"
                    ? Math.round(currentResult.total_distance_meters / 80)
                    : Math.max(
                        10,
                        Math.round(
                          currentResult.total_distance_meters / 450 +
                            currentResult.ordered_stops.length * 2,
                        ),
                      )}{" "}
                  min
                </Text>
                <Text style={styles.metricLbl}>Est. Travel Time</Text>
              </View>
            </View>
          )}

          {/* Stops List */}
          <ScrollView style={styles.stopsScroll} contentContainerStyle={styles.stopsContent}>
            {loading && !currentResult ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={colors.brand} />
                <Text style={styles.loadingText}>Computing optimal route with OR-Tools…</Text>
              </View>
            ) : error && !currentResult ? (
              <View style={styles.centerBox}>
                <Text style={styles.errorText}>⚠️ {error}</Text>
                {fallbackUrl ? (
                  <Pressable
                    style={styles.fallbackBtn}
                    onPress={() => void Linking.openURL(fallbackUrl)}
                  >
                    <Text style={styles.fallbackBtnText}>Open directions in Google Maps ↗</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : currentResult ? (
              <View style={styles.stopsList}>
                {currentResult.ordered_stops.map((stop, index) => {
                  const leg = currentResult.legs[index];
                  const isLast = index === currentResult.ordered_stops.length - 1;

                  return (
                    <View key={`${stop.stop_id}-${index}`} style={styles.stopRow}>
                      <View style={styles.pinCol}>
                        <View style={styles.pinNumber}>
                          <Text style={styles.pinNumberText}>{index + 1}</Text>
                        </View>
                        {!isLast && <View style={styles.pinLine} />}
                      </View>

                      <View style={styles.stopBody}>
                        <View style={styles.stopHeader}>
                          <Text style={styles.stopName} numberOfLines={1}>
                            {stop.name}
                          </Text>
                          {stop.category ? (
                            <View style={styles.categoryPill}>
                              <Text style={styles.categoryText}>{stop.category}</Text>
                            </View>
                          ) : null}
                        </View>
                        {stop.address ? (
                          <Text style={styles.stopAddress} numberOfLines={1}>
                            {stop.address}
                          </Text>
                        ) : null}

                        {leg ? (
                          <View style={styles.legBadge}>
                            <Ionicons name="arrow-down" size={11} color={colors.brand} />
                            <Text style={styles.legText}>
                              {leg.distance_meters < 1000
                                ? `${leg.distance_meters} m`
                                : `${(leg.distance_meters / 1000).toFixed(1)} km`}{" "}
                              ·{" "}
                              {travelMode === "walking"
                                ? `${leg.est_walking_minutes} min walk`
                                : `${leg.est_driving_minutes} min drive`}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <Pressable style={styles.copyBtn} onPress={handleCopy}>
              <Ionicons
                name={copied ? "checkmark-circle" : "copy-outline"}
                size={16}
                color={copied ? colors.brand : colors.ink}
              />
              <Text style={[styles.copyBtnText, copied && { color: colors.brand }]}>
                {copied ? "Copied Link" : "Copy Link"}
              </Text>
            </Pressable>

            <View style={styles.navActions}>
              {currentResult?.apple_maps_url ? (
                <Pressable
                  style={styles.appleBtn}
                  onPress={() => void Linking.openURL(currentResult.apple_maps_url)}
                >
                  <Text style={styles.appleBtnText}>Apple Maps ↗</Text>
                </Pressable>
              ) : null}

              {(currentResult?.google_maps_url || fallbackUrl) && (
                <Pressable
                  style={styles.gmapsBtn}
                  onPress={() =>
                    void Linking.openURL(currentResult?.google_maps_url ?? fallbackUrl!)
                  }
                >
                  <Ionicons name="navigate" size={15} color={colors.onFill} />
                  <Text style={styles.gmapsBtnText}>Google Maps ↗</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(8, 23, 30, 0.75)",
    justifyContent: "flex-end",
  },
  scrim: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "88%",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow(3),
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "rgba(79, 232, 246, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  subtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  strategyRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    backgroundColor: colors.bg,
  },
  strategyTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  strategyTabActive: {
    backgroundColor: "rgba(79, 232, 246, 0.1)",
    borderColor: colors.brand,
  },
  strategyTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  strategyTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  strategyTitleActive: {
    color: colors.brand,
  },
  bestBadge: {
    backgroundColor: colors.brand,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  bestBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.onFill,
  },
  strategyMetric: {
    fontSize: 10,
    color: colors.faint,
    marginTop: 2,
  },
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modesRow: {
    flexDirection: "row",
    gap: 4,
  },
  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  modeBtnActive: {
    backgroundColor: colors.brand,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted,
  },
  modeBtnTextActive: {
    color: colors.onFill,
  },
  filterOffRoadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterOffRoadBtnActive: {
    borderColor: colors.brand,
  },
  filterOffRoadText: {
    fontSize: 11,
    color: colors.ink,
  },
  filterToggleBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  filterToggleBadgeActive: {
    backgroundColor: colors.brand,
  },
  filterToggleText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.muted,
  },
  filterToggleTextActive: {
    color: colors.onFill,
  },
  savingsBanner: {
    backgroundColor: "rgba(46, 125, 82, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(46, 125, 82, 0.4)",
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6ee7b7",
    textAlign: "center",
  },
  excludedBanner: {
    backgroundColor: "rgba(217, 119, 6, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.3)",
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  excludedHeader: {
    marginBottom: 4,
  },
  excludedTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fbbf24",
  },
  excludedList: {
    flexDirection: "row",
    marginTop: 2,
  },
  excludedPill: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginRight: 6,
  },
  excludedName: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.ink,
  },
  excludedReason: {
    fontSize: 9,
    color: colors.muted,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricItem: {
    alignItems: "center",
  },
  metricVal: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
  },
  metricLbl: {
    fontSize: 10,
    color: colors.muted,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  stopsScroll: {
    maxHeight: 280,
  },
  stopsContent: {
    padding: spacing.md,
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 12,
    color: colors.muted,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    textAlign: "center",
  },
  fallbackBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  fallbackBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onFill,
  },
  stopsList: {
    gap: 0,
  },
  stopRow: {
    flexDirection: "row",
    minHeight: 52,
  },
  pinCol: {
    width: 28,
    alignItems: "center",
  },
  pinNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  pinNumberText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.onFill,
  },
  pinLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  stopBody: {
    flex: 1,
    paddingLeft: spacing.sm,
    paddingBottom: spacing.md,
  },
  stopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stopName: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink,
    flex: 1,
  },
  categoryPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
  },
  categoryText: {
    fontSize: 9,
    color: colors.brand,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  stopAddress: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  legBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(79, 232, 246, 0.08)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  legText: {
    fontSize: 10,
    color: colors.brand,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
  },
  navActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  appleBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  appleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
  },
  gmapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  gmapsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.onFill,
  },
});
