import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Travel Planner",
  slug: "travel-planner",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "travelplanner",
  userInterfaceStyle: "light",
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.travelplanner.app",
    infoPlist: {
      LSApplicationQueriesSchemes: ["instagram"],
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#1a3a2f",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    package: "com.travelplanner.app",
    intentFilters: [
      {
        action: "VIEW",
        category: ["BROWSABLE", "DEFAULT"],
        data: [{ scheme: "travelplanner" }],
      },
    ],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
      },
    },
  },
  plugins: [
    "expo-router",
    "expo-secure-store",
    "expo-dev-client",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        resizeMode: "contain",
        backgroundColor: "#1a3a2f",
      },
    ],
    [
      "expo-share-intent",
      {
        iosActivationRules: {
          NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          NSExtensionActivationSupportsWebPageWithMaxCount: 1,
          NSExtensionActivationSupportsText: true,
        },
        androidIntentFilters: ["text/*"],
        iosShareExtensionName: "Travel Planner Share",
      },
    ],
    "@react-native-community/datetimepicker",
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: "b404d284-f25c-4221-911a-9ce06eb4721a",
    },
  },
  owner: "vipul1466",
});
