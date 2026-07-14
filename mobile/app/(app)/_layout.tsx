import { Stack } from "expo-router";

import { LibraryProvider } from "@/src/context/LibraryContext";
import { colors } from "@/src/theme";

export default function AppLayout() {
  return (
    <LibraryProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.brand,
          headerTitleStyle: { fontWeight: "700", color: colors.ink },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="posts/[platform]/[postId]" options={{ title: "Post" }} />
        <Stack.Screen name="places/[placeId]" options={{ title: "Place" }} />
        <Stack.Screen name="ingest" options={{ title: "Add links", presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
    </LibraryProvider>
  );
}
