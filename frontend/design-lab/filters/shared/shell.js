import { TYPES, STATUSES, GROUPINGS, PLACES } from "./data.js";

export function createState(overrides = {}) {
  return {
    grouping: "region",
    status: "all",
    types: [],
    query: "",
    ...overrides,
  };
}

export function filterPlaces(state) {
  const q = state.query.trim().toLowerCase();
  return PLACES.filter((place) => {
    if (state.status === "visited" && place.status !== "visited") return false;
    if (state.status === "inspiration" && place.status !== "inspiration") return false;
    if (state.types.length && !state.types.includes(place.type)) return false;
    if (q) {
      const hay = `${place.name} ${place.type} ${place.region}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function activeCount(state) {
  let n = 0;
  if (state.status !== "all") n += 1;
  if (state.types.length) n += state.types.length;
  if (state.query.trim()) n += 1;
  if (state.grouping !== "region") n += 1;
  return n;
}

export function typeLabel(id) {
  return TYPES.find((t) => t.id === id)?.label || id;
}

export function statusLabel(id) {
  return STATUSES.find((s) => s.id === id)?.label || id;
}

export function groupingLabel(id) {
  return GROUPINGS.find((g) => g.id === id)?.label || id;
}

export function renderResults(root, state) {
  const places = filterPlaces(state);
  const meta = root.querySelector("[data-results-meta]");
  const grid = root.querySelector("[data-results-grid]");
  if (meta) {
    meta.innerHTML = `<strong>${places.length} places</strong><span>Group by ${groupingLabel(state.grouping)}</span>`;
  }
  if (!grid) return;
  if (!places.length) {
    grid.innerHTML = `<p class="demo-empty">Nothing matches — clear a filter.</p>`;
    return;
  }
  grid.innerHTML = places
    .map(
      (p) => `
      <article class="demo-card">
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(typeLabel(p.type))} · ${escapeHtml(p.region)} · ${escapeHtml(p.status)}</p>
      </article>`,
    )
    .join("");
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function toggleType(state, typeId) {
  if (state.types.includes(typeId)) {
    state.types = state.types.filter((t) => t !== typeId);
  } else {
    state.types = [...state.types, typeId];
  }
}

export { TYPES, STATUSES, GROUPINGS, PLACES };
