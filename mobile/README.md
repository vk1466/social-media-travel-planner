# Travel Planner — mobile (Expo)

Native **iOS / Android** client (not web). Full parity with the Vite app plus
**share-to-app** for Instagram reels. Talks to the same TravelPlanner AWS API
with a Clerk JWT.

## Setup

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_BASE_URL + EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
npm install
```

In the [Clerk Dashboard](https://dashboard.clerk.com), add native applications for iOS (`com.travelplanner.app`) and Android with the redirect scheme `travelplanner`.

## Run (phone or simulator)

Do **not** open the browser / press `w` — this app is mobile-only.

```bash
npx expo start
```

Then:

- Scan the QR code with **Expo Go** on a physical iPhone/Android (same Wi‑Fi), or
- Press `i` for iOS Simulator (requires Xcode), or
- Press `a` for Android emulator (requires Android Studio)

**Share-to-app** needs a custom dev client (Expo Go cannot host the share extension):

```bash
npx eas build --profile development --platform ios
# or
npx expo prebuild
npx expo run:ios
npx expo run:android
```

Then in Instagram: Share → Travel Planner.

## Features

- Sign in with Clerk (same account as the web app)
- Paste links or receive shared reel URLs → ingest via AWS Step Functions
- Posts library + detail + delete
- Places browse / filters / map (`react-native-maps`) + detail
- Travel history (add / delete visits)
- Settings: reprocess places, cleanup data, sign out

## Env

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_BASE_URL` | TravelPlanner-dev/prod Function URL |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional; Android Google Maps tiles |

Without a Clerk key, the app uses the API `local-dev-user` bypass (dev stacks only).

## Layout

```
mobile/
  app/                 expo-router screens (iOS/Android)
  src/api.ts           API client (port of frontend/src/api.ts)
  src/components/      RN UI
  src/hooks/useJob.ts  job polling
  src/lib/shareUrl.ts  Instagram URL extraction from share text
  app.config.ts        scheme + expo-share-intent plugin
```
