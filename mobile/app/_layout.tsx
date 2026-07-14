import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { setAuthTokenGetter } from "@/src/api";
import { clerkEnabled, clerkPublishableKey } from "@/src/config";
import { PendingShareProvider, usePendingShare } from "@/src/context/PendingShareContext";
import { ShareIntentRoot, useShareIntentHandler } from "@/src/share/ShareIntentRoot";
import { colors } from "@/src/theme";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { pendingUrls } = usePendingShare();

  useShareIntentHandler(Boolean(isLoaded && isSignedIn));

  useEffect(() => {
    setAuthTokenGetter(async () => (await getToken()) ?? null);
  }, [getToken]);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    const inAuthGroup = segments[0] === "(auth)";
    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      if (pendingUrls.length > 0) {
        router.replace({ pathname: "/(app)/ingest", params: { shared: "1" } });
      } else {
        router.replace("/(app)/(tabs)/posts");
      }
    }
  }, [isLoaded, isSignedIn, segments, router, pendingUrls.length]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return <>{children}</>;
}

function LocalAuthBridge({ children }: { children: ReactNode }) {
  useShareIntentHandler(true);

  useEffect(() => {
    setAuthTokenGetter(async () => "dev:local-dev-user");
    SplashScreen.hideAsync();
  }, []);

  return <>{children}</>;
}

function AppStack() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" />
    </Stack>
  );
}

function RootTree() {
  return (
    <PendingShareProvider>
      {clerkEnabled ? (
        <ClerkAuthBridge>
          <AppStack />
        </ClerkAuthBridge>
      ) : (
        <LocalAuthBridge>
          <AppStack />
        </LocalAuthBridge>
      )}
    </PendingShareProvider>
  );
}

export default function RootLayout() {
  const router = useRouter();

  const tree = clerkEnabled ? (
    <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
      <RootTree />
    </ClerkProvider>
  ) : (
    <RootTree />
  );

  return (
    <ShareIntentRoot onReset={() => router.replace("/(app)/(tabs)/posts")}>{tree}</ShareIntentRoot>
  );
}
