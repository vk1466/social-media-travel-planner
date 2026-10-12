import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appHref } from "@/src/nav";
import { colors, radius, shadow } from "@/src/theme";

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabBarHeight = 84 + insets.bottom;
  const tabBarBottomPadding = Math.max(insets.bottom, 20);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingTop: 8,
          paddingBottom: tabBarBottomPadding,
        },
      }}
    >
      {/* 1. Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* 2. Library Tab */}
      <Tabs.Screen
        name="posts"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "grid" : "grid-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* 3. Center Raised Save Action */}
      <Tabs.Screen
        name="save"
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push(appHref("/(app)/ingest"));
          },
        }}
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarButton: () => (
            <Pressable
              onPress={() => router.push(appHref("/(app)/ingest"))}
              accessibilityRole="button"
              accessibilityLabel="Save a link"
              style={({ pressed }) => [
                styles.saveFab,
                { opacity: pressed ? 0.85 : 1 },
                shadow(3),
              ]}
            >
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </Pressable>
          ),
        }}
      />

      {/* 4. Map Tab */}
      <Tabs.Screen
        name="travel"
        options={{
          title: "Map",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "location" : "location-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* 5. Collections Tab */}
      <Tabs.Screen
        name="collections"
        options={{
          title: "Collections",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "file-tray-full" : "file-tray-full-outline"} size={22} color={color} />
          ),
        }}
      />

      {/* Hidden sub-screens: accessible via collection cards */}
      <Tabs.Screen
        name="food"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  saveFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    marginHorizontal: 8,
  },
});
