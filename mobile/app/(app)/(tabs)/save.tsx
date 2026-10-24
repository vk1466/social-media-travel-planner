import { Redirect } from "expo-router";

import { appHref } from "@/src/nav";

export default function SaveTabPlaceholder() {
  return <Redirect href={appHref("/(app)/(tabs)/posts")} />;
}
