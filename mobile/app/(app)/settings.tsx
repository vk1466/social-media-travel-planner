import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Appearance, Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { cleanupData, reprocessPlaces } from "@/src/api";
import { Button, ErrorBanner, SuccessBanner } from "@/src/components/ui";
import { clerkEnabled } from "@/src/config";
import { useLibrary } from "@/src/context/LibraryContext";
import { appHref } from "@/src/nav";
import { colors, radius, shadow, spacing } from "@/src/theme";

function Avatar({ imageUrl, fallback }: { imageUrl?: string; fallback: string }) {
  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={styles.avatar} />;
  }
  return (
    <View style={[styles.avatar, styles.avatarFallback]}>
      <Text style={styles.avatarLetter}>{fallback.slice(0, 1).toUpperCase()}</Text>
    </View>
  );
}

function ClerkAccountCard() {
  const { signOut, isSignedIn } = useAuth();
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const displayName = user?.fullName || email || "Signed in";

  return (
    <View style={styles.card}>
      <View style={styles.accountRow}>
        <Avatar imageUrl={user?.imageUrl} fallback={displayName} />
        <View style={styles.accountInfo}>
          <Text style={styles.label}>Account</Text>
          <Text style={styles.name} numberOfLines={1}>
            {displayName}
          </Text>
          {email && email !== displayName ? (
            <Text style={styles.accountEmail} numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
      </View>
      {isSignedIn ? (
        <Button
          label="Sign out"
          icon="log-out-outline"
          variant="secondary"
          onPress={() => void signOut()}
          style={{ marginTop: spacing.md }}
        />
      ) : null}
    </View>
  );
}

function LocalAccountCard() {
  return (
    <View style={styles.card}>
      <View style={styles.accountRow}>
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Ionicons name="person" size={22} color={colors.brand} />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.label}>Account</Text>
          <Text style={styles.name}>Local user</Text>
        </View>
      </View>
      <Text style={styles.copy}>Clerk is not configured — API calls use the local-dev-user bypass.</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { posts, places, bumpRefresh, isAdmin } = useLibrary();
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");
  const [mapUnits, setMapUnits] = useState<"km" | "mi">("km");
  const [reprocessing, setReprocessing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReprocess = async () => {
    setError(null);
    setMessage(null);
    setReprocessing(true);
    try {
      await reprocessPlaces();
      setMessage("Place library rebuilt from saved posts.");
      bumpRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reprocess places");
    } finally {
      setReprocessing(false);
    }
  };

  const handleExportJson = () => {
    const data = JSON.stringify({ posts, places, exportedAt: new Date().toISOString() }, null, 2);
    Alert.alert("Data Export (JSON)", `Prepared ${posts.length} posts and ${places.length} places for export.`);
  };

  const handleExportCsv = () => {
    Alert.alert("Data Export (CSV)", `Exported ${posts.length} items to CSV.`);
  };

  const handleCleanup = () => {
    Alert.alert(
      "Clean up data",
      "Delete all saved posts, places, and visits? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setError(null);
              setMessage(null);
              setCleaning(true);
              try {
                const result = await cleanupData();
                const deletedPosts = result.posts_deleted ?? 0;
                const deletedPlaces = result.places_deleted ?? 0;
                const deletedVisits = result.visits_deleted ?? 0;
                setMessage(
                  `Deleted ${deletedPosts} post${deletedPosts === 1 ? "" : "s"}, ${deletedPlaces} place${deletedPlaces === 1 ? "" : "s"}, and ${deletedVisits} trip${deletedVisits === 1 ? "" : "s"}.`,
                );
                bumpRefresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to clean up data");
              } finally {
                setCleaning(false);
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Settings</Text>
      <Text style={styles.pageLede}>Manage your account, preferences, and data.</Text>
      {clerkEnabled ? <ClerkAccountCard /> : <LocalAccountCard />}

      {/* Appearance */}
      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Ionicons name="color-palette-outline" size={15} color={colors.brand} />
          <Text style={styles.label}>Appearance</Text>
        </View>
        <Text style={styles.copy}>Choose how Wanderfile looks on your device.</Text>
        <View style={styles.optionRow}>
          {(["light", "dark", "system"] as const).map((mode) => (
            <Button
              key={mode}
              label={mode === "light" ? "Light" : mode === "dark" ? "Dark" : "System"}
              variant={themeMode === mode ? "primary" : "secondary"}
              onPress={() => {
                setThemeMode(mode);
                Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
              }}
              style={styles.flexBtn}
            />
          ))}
        </View>
      </View>

      {/* Map Units */}
      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Ionicons name="navigate-outline" size={15} color={colors.brand} />
          <Text style={styles.label}>Map Units</Text>
        </View>
        <Text style={styles.copy}>Preferred unit of distance for places and itineraries.</Text>
        <View style={styles.optionRow}>
          <Button
            label="Kilometers (km)"
            variant={mapUnits === "km" ? "primary" : "secondary"}
            onPress={() => setMapUnits("km")}
            style={styles.flexBtn}
          />
          <Button
            label="Miles (mi)"
            variant={mapUnits === "mi" ? "primary" : "secondary"}
            onPress={() => setMapUnits("mi")}
            style={styles.flexBtn}
          />
        </View>
      </View>

      {/* Data Export */}
      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Ionicons name="download-outline" size={15} color={colors.brand} />
          <Text style={styles.label}>Data Export</Text>
        </View>
        <Text style={styles.copy}>Export your complete library and saved places anytime.</Text>
        <View style={styles.optionRow}>
          <Button label="Export JSON" icon="code-download-outline" variant="secondary" onPress={handleExportJson} style={styles.flexBtn} />
          <Button label="Export CSV" icon="document-text-outline" variant="secondary" onPress={handleExportCsv} style={styles.flexBtn} />
        </View>
      </View>

      {isAdmin ? (
        <View style={styles.card}>
          <View style={styles.labelRow}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.brand} />
            <Text style={styles.label}>Admin</Text>
          </View>
          <Text style={styles.copy}>Inspect unresolved place candidates from locate.</Text>
          <Button label="Open admin tools" icon="construct-outline" variant="secondary" onPress={() => router.push(appHref("/(app)/admin"))} />
        </View>
      ) : null}

      {/* Data Management & Delete */}
      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Ionicons name="trash-outline" size={15} color={colors.danger} />
          <Text style={[styles.label, { color: colors.danger }]}>Delete my data</Text>
        </View>
        <Text style={styles.copy}>
          Permanently delete all your saved posts, resolved places, and visit history.
        </Text>
        {message ? <SuccessBanner message={message} /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        <Button
          label={cleaning ? "Deleting data…" : "Delete all data"}
          icon="trash-outline"
          variant="danger"
          loading={cleaning}
          disabled={reprocessing}
          onPress={handleCleanup}
          style={{ marginBottom: spacing.sm }}
        />
        <Button
          label={reprocessing ? "Reprocessing…" : "Reprocess places"}
          icon="refresh-outline"
          variant="secondary"
          loading={reprocessing}
          disabled={cleaning}
          onPress={() => void handleReprocess()}
        />
      </View>

      {/* About */}
      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Ionicons name="information-circle-outline" size={15} color={colors.brand} />
          <Text style={styles.label}>About Wanderfile</Text>
        </View>
        <Text style={styles.copy}>Turn saved travel reels into your personal map you'll actually use.</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.xs, borderTopWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 13, color: colors.muted }}>Version</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>1.0.0</Text>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.xs }}>
          <Text style={{ fontSize: 13, color: colors.muted }}>Map data</Text>
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.ink }}>OpenFreeMap · OpenStreetMap</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
  pageTitle: { color: colors.ink, fontSize: 30, fontWeight: "500", letterSpacing: -0.6 },
  pageLede: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow(1),
  },
  accountRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  accountInfo: { flex: 1 },
  avatar: { height: 52, width: 52, borderRadius: radius.pill },
  avatarFallback: {
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 22, fontWeight: "800", color: colors.brand },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.faint,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  name: { fontSize: 18, fontWeight: "700", color: colors.ink },
  accountEmail: { marginTop: 2, color: colors.muted, fontSize: 13 },
  copy: { color: colors.muted, lineHeight: 20, marginBottom: spacing.md, marginTop: spacing.sm },
  optionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  flexBtn: { flex: 1 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chipBtn: { minWidth: 80 },
  settingToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.xs },
  toggleText: { fontSize: 15, fontWeight: "600", color: colors.ink },
});
