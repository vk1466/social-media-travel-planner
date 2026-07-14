import { Tabs, useRouter } from "expo-router";
import { Pressable, Text } from "react-native";

import { colors } from "@/src/theme";

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? colors.brand : colors.muted, fontSize: 12, fontWeight: "600" }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "700" },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        headerRight: () => (
          <Pressable onPress={() => router.push("/(app)/settings")} style={{ marginRight: 16 }}>
            <Text style={{ color: colors.brand, fontWeight: "600" }}>Settings</Text>
          </Pressable>
        ),
        headerLeft: () => (
          <Pressable onPress={() => router.push("/(app)/ingest")} style={{ marginLeft: 16 }}>
            <Text style={{ color: colors.accent, fontWeight: "700" }}>Add</Text>
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="posts"
        options={{
          title: "Posts",
          tabBarLabel: ({ focused }) => <TabLabel label="Posts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="places"
        options={{
          title: "Places",
          tabBarLabel: ({ focused }) => <TabLabel label="Places" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarLabel: ({ focused }) => <TabLabel label="History" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
