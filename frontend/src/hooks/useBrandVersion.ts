import { useSyncExternalStore } from "react";

import { getBrandVersion, subscribeBrandVersion } from "../themeColor";

/** Bumps when the brand color picker changes — use to remount Leaflet layers. */
export function useBrandVersion(): number {
  return useSyncExternalStore(subscribeBrandVersion, getBrandVersion, getBrandVersion);
}
