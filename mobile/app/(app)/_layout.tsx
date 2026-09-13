import { Stack } from "expo-router";
import { Platform } from "react-native";

import { LibraryProvider } from "@/src/context/LibraryContext";
import { LibraryPlatformProvider } from "@/src/libraryPlatform";
import { colors } from "@/src/theme";

const detailSheetPresentation = Platform.select({
  ios: "formSheet" as const,
  android: "modal" as const,
  default: "modal" as const,
});

export default function AppLayout() {
  return (
    <LibraryProvider>
      <LibraryPlatformProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.brand,
            headerTitleStyle: { fontWeight: "700", color: colors.ink },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="posts/[platform]/[postId]"
            options={{
              headerShown: false,
              title: "",
              presentation: detailSheetPresentation,
            }}
          />
          <Stack.Screen
            name="places/[placeId]"
            options={{
              headerShown: false,
              title: "",
              presentation: detailSheetPresentation,
            }}
          />
          <Stack.Screen name="ingest" options={{ title: "Processing", presentation: "modal" }} />
          <Stack.Screen name="search" options={{ title: "Search", presentation: "modal" }} />
          <Stack.Screen name="settings" options={{ title: "Settings" }} />
          <Stack.Screen name="admin" options={{ title: "Admin" }} />
        </Stack>
      </LibraryPlatformProvider>
    </LibraryProvider>
  );
}
