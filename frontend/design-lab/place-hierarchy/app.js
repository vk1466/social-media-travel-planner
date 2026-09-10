import { atlasTrail, buildAtlas, childLevelLabel, levelLabel, searchAtlas } from "../sites/shared/place-atlas.js";

const rows = [
  ["Asia", "Japan", "Kansai", "Kyoto", "Fushimi Inari Taisha", "landmark", true, 8],
  ["Asia", "Japan", "Kansai", "Kyoto", "Nishiki Market", "market", true, 5],
  ["Asia", "Japan", "Kansai", "Osaka", "Umeda Sky Building", "viewpoint", false, 4],
  ["Asia", "Japan", "Kanto", "Tokyo", "Meiji Jingu", "landmark", true, 6],
  ["Asia", "Japan", "Kanto", "Tokyo", "Golden Gai", "bar", false, 7],
  ["Asia", "Thailand", null, "Bangkok", "Wat Arun", "landmark", true, 6],
  ["Asia", "Thailand", null, "Chiang Mai", "Doi Suthep", "viewpoint", false, 3],
  ["Europe", "Italy", "Campania", "Agerola", "Path of the Gods", "hike", false, 8],
  ["Europe", "Italy", "Veneto", "Cortina d'Ampezzo", "Lago di Sorapis", "lake", false, 8],
  ["Europe", "Italy", "Lazio", "Rome", "Villa Borghese", "park", true, 3],
  ["Europe", "Portugal", "Lisboa", "Lisbon", "Alfama", "neighborhood", true, 7],
  ["Europe", "Portugal", "Lisboa", "Sintra", "Pena Palace", "landmark", true, 5],
  ["Europe", "Portugal", "Norte", "Porto", "Cais da Ribeira", "neighborhood", false, 4],
  ["North America", "United States", "California", "San Francisco", "Lands End", "hike", true, 6],
  ["North America", "United States", "California", "Big Sur", "McWay Falls", "waterfall", false, 9],
  ["North America", "United States", "New York", "New York City", "The High Line", "park", true, 5],
];

const places = rows.map(([continent, country, state, city, name, category, visited, saves], index) => ({
  placeId: `hierarchy-${index + 1}`,
  name, continent, country, countryCode: null, state, city, category,
  categoryLabel: category.charAt(0).toUpperCase() + category.slice(1),
  visited, saves, lat: null, lng: null,
  trail: [continent, country, state, city].filter(Boolean),
}));

const atlas = buildAtlas(places);
const concepts = [
  ["01", "tile-drill", "Guided shelves", "Editorial shelves reveal one geographic level at a time with progress.", "Apple Maps Guides · W3C breadcrumbs"],
  ["02", "living-tree", "Focus + siblings", "A strong current-location panel keeps ancestors and next choices together.", "WAI navigation tree"],
  ["03", "miller", "Column browser", "Parallel columns preserve parent, sibling, child, and preview context.", "macOS Finder columns"],
  ["04", "cover-flow", "Globe + guides", "A spatial overview pairs with a carousel of curated destination guides.", "Apple Maps globe · AllTrails Collections"],
  ["05", "ledger", "Multi-view index", "Switch the same hierarchy between list, table, and map representations.", "UNESCO World Heritage List"],
  ["06", "orbit", "Proportional atlas", "A treemap makes destination density and hierarchy visible at once.", "Data-atlas navigation"],
  ["07", "map-rail", "Map + bottom rail", "The map remains dominant while a horizontal result rail advances scope.", "Apple Maps · Google saved pins"],
  ["08", "command", "Universal jump", "A centered destination switcher searches every level and restores context.", "Map search · Spotlight"],
  ["09", "journey", "Geographic index", "An A–Z index combines country-directory speed with a persistent trail.", "UNESCO country index"],
  ["10", "sheets", "Adaptive bottom sheet", "Nested mobile sheets preserve map context and make backtracking physical.", "Apple Maps Places Library"],
];

const state = new Map(concepts.map(([id]) => [id, "world"]));
const grid = document.querySelector("#demo-grid");
const toast = document.querySelector("#toast");
let toastTimer;

const icon = (name, size = 16) => `<i data-lucide="${name}" width="${size}" height="${size}" aria-hidden="true"></i>`;
const currentNode = (id) => atlas.index.get(state.get(id)) || atlas.root;
const trailFor = (node) => atlasTrail(atlas, node.key);
const childButton = (child, className = "node-card") => `<button class="${className}" type="button" data-key="${child.key}"><span class="node-type">${levelLabel(child.level)}</span><b>${child.name}</b><small>${child.total} ${child.total === 1 ? "place" : "places"} · ${child.saves} saves</small>${icon(child.level === "place" ? "map-pin" : "chevron-right", 15)}</button>`;
const crumbs = (node, compact = false) => `<nav class="crumbs" aria-label="Current location">${trailFor(node).map((item, index, trail) => `<button type="button" data-key="${item.key}" ${index === trail.length - 1 ? "aria-current=\"page\"" : ""}>${compact && index === 0 ? icon("earth", 14) : item.name}</button>`).join("<span>›</span>")}</nav>`;

function emptyOrPlace(node) {
  if (node.level !== "place") return "";
  const place = node.place;
  return `<div class="place-arrival"><span>${icon("map-pin", 22)}</span><p class="eyebrow">You arrived</p><h4>${node.name}</h4><p>${place.categoryLabel} · ${place.saves} saves · ${place.visited ? "Visited" : "Want to go"}</p><button type="button" data-place="${node.name}">Open place details ${icon("arrow-up-right", 14)}</button></div>`;
}

function tileDrill(node) {
  const progress = Math.min(100, trailFor(node).length * 18);
  return `<div class="guided-top">${crumbs(node)}<span>${trailFor(node).length - 1} levels deep</span></div><div class="guided-progress"><i style="width:${progress}%"></i></div><div class="guided-heading"><div><span>Now browsing · ${levelLabel(node.level)}</span><h4>${node.name}</h4><p>${node.total} places · ${node.saves} saves · ${node.visited} visited</p></div><b>${String(node.total).padStart(2, "0")}</b></div>${emptyOrPlace(node) || `<div class="guided-shelf">${node.children.map((child, index) => `<button type="button" data-key="${child.key}"><span class="shelf-number">${String(index + 1).padStart(2, "0")}</span><div><small>${levelLabel(child.level)}</small><b>${child.name}</b><em>${child.total} places</em><i><span style="width:${Math.max(12, child.visited / child.total * 100)}%"></span></i></div>${icon("arrow-right", 15)}</button>`).join("")}</div>`}`;
}

function livingTree(node) {
  const trail = trailFor(node);
  return `<div class="focus-browser"><nav aria-label="Place hierarchy">${trail.map((item, index) => `<button class="${item.key === node.key ? "active" : ""}" type="button" data-key="${item.key}"><span>${index + 1}</span><small>${levelLabel(item.level)}</small><b>${item.name}</b></button>`).join("")}</nav><section><div class="focus-summary"><span>${levelLabel(node.level)}</span><h4>${node.name}</h4><p>${node.total} places nested here</p></div>${emptyOrPlace(node) || `<div class="sibling-list"><p>Choose ${childLevelLabel(node).toLowerCase()}</p>${node.children.map((child) => `<button type="button" data-key="${child.key}"><span><small>${levelLabel(child.level)}</small><b>${child.name}</b></span><em>${child.total}</em>${icon("chevron-right", 14)}</button>`).join("")}</div>`}</section></div>`;
}

function miller(node) {
  const path = trailFor(node);
  const columnNodes = [...path.slice(0, -1), node];
  return `<div class="miller-columns">${columnNodes.map((scope, index) => `<section><header><span>${levelLabel(scope.level)}</span><b>${scope.name}</b></header>${scope.children.length ? scope.children.map((child) => `<button type="button" data-key="${child.key}" class="${path[index + 1]?.key === child.key ? "selected" : ""}"><span>${child.name}</span><small>${child.total}</small>${icon("chevron-right", 13)}</button>`).join("") : emptyOrPlace(scope)}</section>`).join("")}</div>`;
}

function coverFlow(node) {
  const images = ["amalfi", "dolomites", "city"];
  return `<div class="globe-guide"><section class="mini-globe"><i class="latitude one"></i><i class="latitude two"></i><i class="longitude"></i><span class="globe-land land-one"></span><span class="globe-land land-two"></span><div><small>${levelLabel(node.level)}</small><b>${node.name}</b><em>${node.total} places</em></div></section><section class="guide-side">${crumbs(node, true)}<div class="collection-chips"><span>${icon("sparkles", 12)} Top picks</span><span>Hidden gems</span><span>Outdoors</span></div><h4>${childLevelLabel(node)}</h4>${emptyOrPlace(node) || `<div class="guide-carousel">${node.children.map((child, index) => `<button class="guide-cover ${images[index % images.length]}" type="button" data-key="${child.key}"><span>${levelLabel(child.level)}</span><b>${child.name}</b><small>${child.total} places</small></button>`).join("")}</div>`}</section></div>`;
}

function ledger(node, mode = "list") {
  const controls = `<div class="view-switch" aria-label="View options">${[["list","list"],["table","table-2"],["map","map"]].map(([view, viewIcon]) => `<button class="${mode === view ? "active" : ""}" type="button" data-view="${view}">${icon(viewIcon, 12)} ${view}</button>`).join("")}<span>By ${node.level === "world" ? "region" : childLevelLabel(node).toLowerCase()}</span></div>`;
  const list = `<div class="ledger-rows">${node.children.map((child, index) => `<button type="button" data-key="${child.key}"><em>${String(index + 1).padStart(2, "0")}</em><b>${child.name}</b><span>${levelLabel(child.level)}</span><span>${child.total}</span><span>${child.saves}</span>${icon("arrow-right", 14)}</button>`).join("")}</div>`;
  const table = `<div class="matrix-view">${node.children.map((child) => `<button type="button" data-key="${child.key}"><b>${child.name}</b><span>${child.total}<small>places</small></span><span>${child.visited}<small>visited</small></span><span>${child.saves}<small>saves</small></span></button>`).join("")}</div>`;
  const map = `<div class="index-map">${node.children.map((child, index) => `<button style="--x:${12 + (index * 29) % 78}%;--y:${18 + (index * 31) % 65}%" type="button" data-key="${child.key}"><i></i><span>${child.name}</span></button>`).join("")}<small>Overview · ${node.name}</small></div>`;
  return `${crumbs(node)}${controls}${emptyOrPlace(node) || `<div class="ledger-head"><span>Destination</span><span>Level</span><span>Places</span><span>Saves</span></div>${mode === "list" ? list : mode === "table" ? table : map}`}`;
}

function orbit(node) {
  if (node.level === "place") return `${crumbs(node, true)}${emptyOrPlace(node)}`;
  return `<div class="treemap-head">${crumbs(node, true)}<div><span>${levelLabel(node.level)}</span><b>${node.name}</b><small>Size = saved places</small></div></div><div class="treemap">${node.children.map((child, index) => `<button class="tone-${index % 5}" style="--weight:${Math.max(1, child.total)}" type="button" data-key="${child.key}"><span>${levelLabel(child.level)}</span><b>${child.name}</b><small>${child.total} places · ${child.visited} visited</small></button>`).join("")}</div>`;
}

function mapRail(node) {
  return `<div class="map-stage"><div class="fake-map"><span class="land land-a"></span><span class="land land-b"></span>${node.children.slice(0, 6).map((child, index) => `<button class="${child.visited === child.total ? "visited" : "saved"}" style="--x:${13 + (index * 17) % 75}%;--y:${15 + (index * 19) % 56}%" type="button" data-key="${child.key}" aria-label="Open ${child.name}"><i></i><span>${child.total}</span></button>`).join("")}<div class="map-legend"><span><i class="saved"></i>Saved</span><span><i class="visited"></i>Visited</span></div>${crumbs(node, true)}<div class="map-caption"><span>Overview at ${levelLabel(node.level).toLowerCase()} scale</span><b>${node.name}</b></div></div><section class="bottom-rail"><header><span>${childLevelLabel(node)}</span><b>${node.total} places in view</b></header>${emptyOrPlace(node) || `<div>${node.children.map((child) => childButton(child, "rail-node")).join("")}</div>`}</section></div>`;
}

function command(node, query = "") {
  const results = query ? searchAtlas(atlas, query, 6) : node.children;
  return `<div class="command-shell"><label>${icon("search", 17)}<input data-search placeholder="Search country, city, or place…" value="${query.replaceAll('"', '&quot;')}" /></label><div class="search-filters"><span>All</span><span>Outdoors</span><span>Food</span><span>Visited</span></div>${crumbs(node, true)}<p>${query ? `${results.length} matches across the atlas` : `Explore ${childLevelLabel(node).toLowerCase()} inside ${node.name}`}</p><div>${results.map((child) => `<button type="button" data-key="${child.key}"><span class="result-icon">${icon(child.level === "place" ? "map-pin" : "folder", 15)}</span><span><b>${child.name}</b><small>${[...child.trail, child.level === "place" ? "" : levelLabel(child.level)].filter(Boolean).join(" · ")}</small></span><em>${child.total}</em></button>`).join("") || `<div class="no-results">No destinations found.</div>`}</div></div>`;
}

function journey(node) {
  const groups = Object.entries(node.children.reduce((acc, child) => { const letter = child.name[0].toUpperCase(); (acc[letter] ||= []).push(child); return acc; }, {}));
  return `<div class="geo-index">${crumbs(node)}<header><div><span>${levelLabel(node.level)}</span><h4>${node.name}</h4></div><nav aria-label="Alphabet">${"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => `<span class="${groups.some(([key]) => key === letter) ? "available" : ""}">${letter}</span>`).join("")}</nav></header>${emptyOrPlace(node) || `<div class="alpha-groups">${groups.map(([letter, children]) => `<section><b>${letter}</b><div>${children.map((child) => `<button type="button" data-key="${child.key}"><span><small>${levelLabel(child.level)}</small><b>${child.name}</b></span><em>${child.total}</em>${icon("arrow-up-right", 14)}</button>`).join("")}</div></section>`).join("")}</div>`}</div>`;
}

function sheets(node) {
  const path = trailFor(node);
  const visible = path.slice(-3);
  return `<div class="phone"><div class="phone-top"><span>9:41</span><b>Places library</b>${icon("more-horizontal", 15)}</div><div class="library-tabs"><span class="active">Saved ${node.inspiration}</span><span>Visited ${node.visited}</span></div><div class="sheet-stack">${visible.map((item, index) => `<section class="sheet depth-${visible.length - index}" style="--sheet:${index}"><button class="sheet-title" type="button" data-key="${item.key}"><span>${levelLabel(item.level)}</span><b>${item.name}</b><small>${item.total} places</small></button>${item.key === node.key ? (emptyOrPlace(item) || `<div>${item.children.map((child) => childButton(child, "sheet-node")).join("")}</div>`) : ""}</section>`).join("")}</div></div>`;
}

const renderers = { "tile-drill": tileDrill, "living-tree": livingTree, miller, "cover-flow": coverFlow, ledger, orbit, "map-rail": mapRail, command, journey, sheets };
const queryState = new Map();
const viewState = new Map([["05", "list"]]);

function renderConcept(id) {
  const concept = concepts.find(([conceptId]) => conceptId === id);
  if (!concept) return;
  const [, slug] = concept;
  const canvas = grid.querySelector(`[data-canvas="${id}"]`);
  if (!canvas) return;
  canvas.innerHTML = slug === "command" ? command(currentNode(id), queryState.get(id) || "") : slug === "ledger" ? ledger(currentNode(id), viewState.get(id) || "list") : renderers[slug](currentNode(id));
  lucide.createIcons();
}

grid.innerHTML = concepts.map(([id, slug, name, note, researchCue]) => `<article class="demo concept-${slug}" data-demo="${id}"><header><span>${id}</span><div><h3>${name}</h3><p>${note}</p><small>Research cue · ${researchCue}</small></div><button type="button" data-reset="${id}" aria-label="Reset ${name}">${icon("rotate-ccw", 14)}</button></header><div class="canvas" data-canvas="${id}"></div></article>`).join("");
concepts.forEach(([id]) => renderConcept(id));

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 1800);
}

grid.addEventListener("click", (event) => {
  const demo = event.target.closest("[data-demo]");
  if (!demo) return;
  const id = demo.dataset.demo;
  const reset = event.target.closest("[data-reset]");
  if (reset) { state.set(id, "world"); queryState.set(id, ""); renderConcept(id); return; }
  const view = event.target.closest("[data-view]");
  if (view) { viewState.set(id, view.dataset.view); renderConcept(id); return; }
  const opener = event.target.closest("[data-key]");
  if (opener) { state.set(id, opener.dataset.key); queryState.set(id, ""); renderConcept(id); return; }
  const place = event.target.closest("[data-place]");
  if (place) showToast(`${place.dataset.place} detail would open`);
});

grid.addEventListener("input", (event) => {
  if (!event.target.matches("[data-search]")) return;
  const demo = event.target.closest("[data-demo]");
  queryState.set(demo.dataset.demo, event.target.value);
  renderConcept(demo.dataset.demo);
  const input = grid.querySelector(`[data-demo="${demo.dataset.demo}"] [data-search]`);
  input?.focus();
  input?.setSelectionRange(input.value.length, input.value.length);
});

document.querySelector("#reset-all").addEventListener("click", () => {
  concepts.forEach(([id]) => { state.set(id, "world"); queryState.set(id, ""); renderConcept(id); });
  showToast("All concepts reset to World");
});
