import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import { Platform, Pressable } from "react-native";

import { colors, shadow } from "@/src/theme";

type IconName = keyof typeof Ionicons.glyphMap;

function HeaderButton({
  icon,
  color,
  onPress,
  side,
}: {
  icon: IconName;
  color: string;
  onPress: () => void;
  side: "left" | "right";
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          marginLeft: side === "left" ? 16 : 0,
          marginRight: side === "right" ? 16 : 0,
          height: 36,
          width: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        shadow(1),
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "800", fontSize: 20 },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: Platform.OS === "ios" ? 88 : 64,
          paddingTop: 6,
        },
        headerRight: () => (
          <HeaderButton
            icon="settings-outline"
            color={colors.brand}
            side="right"
            onPress={() => router.push("/(app)/settings")}
          />
        ),
        headerLeft: () => (
          <HeaderButton
            icon="add"
            color={colors.accent}
            side="left"
            onPress={() => router.push("/(app)/ingest")}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="posts"
        options={{
          title: "Posts",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="bookmark" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="places"
        options={{
          title: "Places",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="location" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
