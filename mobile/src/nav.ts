import type { Href } from "expo-router";

/** Typed routes lag behind new screens until Expo regenerates; keep navigation explicit. */
export function appHref(path: string): Href {
  return path as Href;
}
