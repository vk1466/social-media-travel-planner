import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { cleanupData, reprocessPlaces } from "@/src/api";
import { Button, ErrorBanner, SuccessBanner } from "@/src/components/ui";
import { clerkEnabled } from "@/src/config";
import { useLibrary } from "@/src/context/LibraryContext";
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
  const { bumpRefresh } = useLibrary();
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

  const handleCleanup = () => {
    Alert.alert(
      "Clean up data",
      "Delete all saved posts, places, and travel history? This cannot be undone.",
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
                const posts = result.posts_deleted ?? 0;
                const places = result.places_deleted ?? 0;
                const visits = result.visits_deleted ?? 0;
                setMessage(
                  `Deleted ${posts} post${posts === 1 ? "" : "s"}, ${places} place${places === 1 ? "" : "s"}, and ${visits} trip${visits === 1 ? "" : "s"}.`,
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
      {clerkEnabled ? <ClerkAccountCard /> : <LocalAccountCard />}

      <View style={styles.card}>
        <View style={styles.labelRow}>
          <Ionicons name="construct-outline" size={15} color={colors.brand} />
          <Text style={styles.label}>Data tools</Text>
        </View>
        <Text style={styles.copy}>
          Reprocess rebuilds the shared place library from all saved posts. Clean up deletes shared
          posts, places, and visits — admin only when ADMIN_USER_IDS is set.
        </Text>
        {message ? <SuccessBanner message={message} /> : null}
        {error ? <ErrorBanner message={error} /> : null}
        <Button
          label={reprocessing ? "Reprocessing…" : "Reprocess places"}
          icon="refresh-outline"
          variant="secondary"
          loading={reprocessing}
          disabled={cleaning}
          onPress={() => void handleReprocess()}
          style={{ marginBottom: spacing.sm }}
        />
        <Button
          label={cleaning ? "Cleaning up…" : "Clean up data"}
          icon="trash-outline"
          variant="danger"
          loading={cleaning}
          disabled={reprocessing}
          onPress={handleCleanup}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md },
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
});
