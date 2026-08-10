/**
 * Hydrate the places page mount after site chrome renders.
 */
import { loadPlacesLibrary } from "./api.js";
import { mountPlacesBrowse } from "./places-browse.js";

export async function hydratePlacesPage({
  theme,
  omitMasthead = false,
  omitBanner = false,
  placeHref,
} = {}) {
  const root = document.getElementById("wf-places-root");
  if (!root) {
    console.warn("[design-lab] #wf-places-root missing — skip places hydrate");
    return;
  }

  root.innerHTML = `<div class="wf-places-loading">Loading atlas…</div>`;
  root.className = `wf-places wf-places--${theme}${omitMasthead ? " wf-places--embedded" : ""}`;

  try {
    const library = await loadPlacesLibrary(window.WF_MOCK);
    mountPlacesBrowse(root, {
      theme,
      places: library.places,
      usingLiveData: library.usingLiveData,
      authState: library.authState,
      omitMasthead,
      omitBanner,
      placeHref,
    });
  } catch (err) {
    console.warn("[design-lab] places hydrate failed", err);
    root.innerHTML = `<div class="wf-places-empty"><p>Could not load places.</p></div>`;
  }
}
