import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, usePathname, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { postsOfCategory } from "@/src/contentCategory";
import { useLibrary } from "@/src/context/LibraryContext";
import { appHref } from "@/src/nav";
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
          marginLeft: side === "left" ? 12 : 4,
          marginRight: side === "right" ? 12 : 4,
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
  const insets = useSafeAreaInsets();
  const { posts, places, visits, loading } = useLibrary();
  const tabBarContentHeight = 56;
  const tabBarBottomInset = Math.max(insets.bottom, 8);

  const counts = useMemo(
    () => ({
      posts: posts.length,
      travel: places.length,
      food: postsOfCategory(posts, "food").length,
      movies: postsOfCategory(posts, "movies").length,
      history: visits.length,
    }),
    [posts, places.length, visits.length],
  );

  const hasAny = Object.values(counts).some((value) => value > 0);
  const showAll = loading && !hasAny;
  const tabHref = (count: number, emptyFallback = false) => {
    if (showAll || count > 0 || (emptyFallback && !hasAny)) return undefined;
    return null;
  };

  const pathname = usePathname();
  useEffect(() => {
    const all = ["posts", "travel", "food", "movies", "history"] as const;
    const visible = all.filter(
      (key) => showAll || counts[key] > 0 || (!hasAny && key === "posts"),
    );
    const current = pathname.split("/").filter(Boolean).at(-1);
    if (current && (all as readonly string[]).includes(current) && !visible.includes(current as (typeof all)[number])) {
      router.replace(appHref(`/(app)/(tabs)/${visible[0] ?? "posts"}`));
    }
  }, [counts, hasAny, pathname, router, showAll]);

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
          height: tabBarContentHeight + tabBarBottomInset,
          paddingTop: 6,
          paddingBottom: tabBarBottomInset,
        },
        headerLeft: () => (
          <HeaderButton
            icon="add"
            color={colors.accent}
            side="left"
            onPress={() => router.push(appHref("/(app)/ingest"))}
          />
        ),
        headerRight: () => (
          <>
            <HeaderButton
              icon="search"
              color={colors.brand}
              side="right"
              onPress={() => router.push(appHref("/(app)/search"))}
            />
            <HeaderButton
              icon="settings-outline"
              color={colors.brand}
              side="right"
              onPress={() => router.push(appHref("/(app)/settings"))}
            />
          </>
        ),
      }}
    >
      <Tabs.Screen
        name="posts"
        options={{
          title: "Posts",
          href: tabHref(counts.posts, true),
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="travel"
        options={{
          title: "Travel",
          href: tabHref(counts.travel),
          tabBarIcon: ({ color, size }) => <Ionicons name="navigate" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: "Food",
          href: tabHref(counts.food),
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="movies"
        options={{
          title: "Watch",
          href: tabHref(counts.movies),
          tabBarIcon: ({ color, size }) => <Ionicons name="film" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          href: tabHref(counts.history),
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
