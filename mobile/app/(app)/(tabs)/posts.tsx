import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";

import { deletePost, nativePostId } from "@/src/api";
import { PostCard, postKey } from "@/src/components/PostCard";
import { EmptyState, ErrorBanner } from "@/src/components/ui";
import { useLibrary } from "@/src/context/LibraryContext";
import { colors, spacing } from "@/src/theme";

export default function PostsScreen() {
  const router = useRouter();
  const { posts, loading, error, refresh, bumpRefresh } = useLibrary();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleDelete = (platform: string, postId: string) => {
    Alert.alert("Remove post", "Remove this post from your library?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          void (async () => {
            await deletePost(platform, postId);
            bumpRefresh();
          })();
        },
      },
    ]);
  };

  if (loading && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {error ? <ErrorBanner message={error} /> : null}
      <FlatList
        data={posts}
        keyExtractor={postKey}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        ListEmptyComponent={
          <EmptyState
            title="No posts yet"
            body="Tap Add to paste Instagram reel links, or share a reel to Travel Planner."
          />
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() =>
              router.push(`/posts/${item.platform}/${nativePostId(item)}`)
            }
            onDelete={() => handleDelete(item.platform, nativePostId(item))}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
  list: {
    padding: spacing.md,
    flexGrow: 1,
  },
});
