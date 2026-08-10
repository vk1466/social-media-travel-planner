/**
 * Mount the real Almanac places browse (filters + atlas) into #wf-places-root.
 * Page shells own chrome/hero; this keeps the product UI identical.
 */
import { hydratePlacesPage } from "../../sites/shared/places-page.js";

export function mountAtlasSlot(options = {}) {
  return hydratePlacesPage({
    theme: "almanac",
    omitMasthead: true,
    omitBanner: true,
    placeHref: (placeId) =>
      `../../sites/02-almanac/place.html?id=${encodeURIComponent(placeId)}`,
    ...options,
  });
}

function boot() {
  if (!document.getElementById("wf-places-root")) return;
  mountAtlasSlot();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
