/**
 * Interactive places atlas — same patterns as production PlaceLibrary:
 * hierarchy crumbs, covers/map, group-by, status/type filters, search.
 */

import { openClerkSignIn } from "./api.js";
import {
  atlasTrail,
  buildAtlas,
  childLevelLabel,
  countByCategory,
  leafPlaces,
  levelLabel,
  resolveScopeKey,
  searchAtlas,
} from "./place-atlas.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hashHue(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33 + value.charCodeAt(i)) % 360;
  }
  return hash;
}

function coverArt(name, hero) {
  if (hero) {
    return `background-image:linear-gradient(to top, rgb(15 22 19 / 0.72), transparent 55%), url('${String(hero).replace(/'/g, "%27")}')`;
  }
  const hue = 120 + (hashHue(name) % 120);
  return `background-image:linear-gradient(155deg, hsl(${hue} 30% 32%), hsl(${(hue + 45) % 360} 24% 14%))`;
}

let leafletPromise = null;

function ensureLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (!leafletPromise) {
    leafletPromise = new Promise((resolve, reject) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve(window.L);
      script.onerror = () => reject(new Error("Leaflet failed to load"));
      document.head.appendChild(script);
    });
  }
  return leafletPromise;
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   theme: 'voyager' | 'almanac' | 'memo',
 *   places: object[],
 *   usingLiveData: boolean,
 *   authState?: string,
 *   placeHref?: (placeId: string) => string,
 *   omitMasthead?: boolean,
 *   omitBanner?: boolean,
 * }} options
 */
export function mountPlacesBrowse(root, options) {
  const {
    theme,
    places: allPlaces,
    usingLiveData,
    authState = usingLiveData ? "signed-in" : "signed-out",
    placeHref = (placeId) => `place.html?id=${encodeURIComponent(placeId)}`,
    omitMasthead = false,
    omitBanner = false,
  } = options;

  const TYPE_PREVIEW_COUNT = 5;

  const state = {
    scopeKey: "world",
    statusFilter: "all",
    typeFilter: [],
    grouping: "region",
    viewMode: "covers",
    expandedKeys: [],
    typesExpanded: false,
    query: "",
  };

  let mapInstance = null;
  let mapLayerGroup = null;

  function statusPlaces() {
    if (state.statusFilter === "visited") {
      return allPlaces.filter((p) => p.visited);
    }
    if (state.statusFilter === "inspiration") {
      return allPlaces.filter((p) => !p.visited);
    }
    return allPlaces;
  }

  function filteredPlaces() {
    const base = statusPlaces();
    if (state.typeFilter.length === 0) return base;
    return base.filter((p) => state.typeFilter.includes(p.category || "other"));
  }

  function destroyMap() {
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
      mapLayerGroup = null;
    }
  }

  async function renderMap(scope) {
    const el = root.querySelector("[data-places-map]");
    if (!el) return;
    try {
      const L = await ensureLeaflet();
      if (!root.querySelector("[data-places-map]")) return;
      if (!mapInstance) {
        mapInstance = L.map(el, { scrollWheelZoom: false }).setView([20, 0], 2);
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
          maxZoom: 18,
        }).addTo(mapInstance);
        mapLayerGroup = L.layerGroup().addTo(mapInstance);
      }
      mapLayerGroup.clearLayers();
      const points = [];
      for (const child of scope.children) {
        if (child.level !== "place" && child.lat != null && child.lng != null) {
          const marker = L.circleMarker([child.lat, child.lng], {
            radius: Math.min(18, 8 + Math.sqrt(child.total)),
            color: "#1a5b45",
            fillColor: theme === "memo" ? "#c9a35c" : theme === "almanac" ? "#c85c34" : "#1a5b45",
            fillOpacity: 0.55,
            weight: 1,
          });
          marker.bindTooltip(`${child.name} · ${child.total}`);
          marker.on("click", () => {
            state.scopeKey = child.key;
            state.expandedKeys = [];
            render();
          });
          mapLayerGroup.addLayer(marker);
          points.push([child.lat, child.lng]);
        }
      }
      for (const place of leafPlaces(scope)) {
        if (place.lat == null || place.lng == null) continue;
        if (scope.level !== "place" && scope.children.some((c) => c.level !== "place")) {
          // Prefer region clusters when drilling; still show leaf pins when scoped to city/place parents
        }
        const icon = L.divIcon({
          className: "wf-places-map-pin-icon",
          html: `<i class="wf-places-map-pin ${place.visited ? "visited" : "dream"}"></i>`,
          iconSize: [14, 14],
          iconAnchor: [7, 14],
        });
        const marker = L.marker([place.lat, place.lng], { icon });
        marker.bindPopup(
          `<strong>${escapeHtml(place.name)}</strong><br/>${escapeHtml(place.trail.join(" · "))}`,
        );
        marker.on("click", () => {
          location.href = placeHref(place.placeId);
        });
        mapLayerGroup.addLayer(marker);
        points.push([place.lat, place.lng]);
      }
      if (points.length === 0) {
        mapInstance.setView([20, 0], 2);
      } else if (points.length === 1) {
        mapInstance.setView(points[0], 9);
      } else {
        mapInstance.fitBounds(points, { padding: [48, 48], maxZoom: 11 });
      }
      requestAnimationFrame(() => mapInstance.invalidateSize());
    } catch (err) {
      console.warn("[design-lab] map unavailable", err);
      el.innerHTML = `<p class="wf-places-empty">Map could not load.</p>`;
    }
  }

  function visibleTypeOptions(typeOptions) {
    if (state.typesExpanded || typeOptions.length <= TYPE_PREVIEW_COUNT) {
      return typeOptions;
    }
    const top = typeOptions.slice(0, TYPE_PREVIEW_COUNT);
    const topIds = new Set(top.map((option) => option.category));
    const selectedExtra = typeOptions.filter(
      (option) => state.typeFilter.includes(option.category) && !topIds.has(option.category),
    );
    return [...top, ...selectedExtra];
  }

  function typeOverflowControl(typeOptions) {
    if (typeOptions.length <= TYPE_PREVIEW_COUNT) return "";
    if (state.typesExpanded) {
      return `<button type="button" class="wf-places-pill wf-places-pill-more" data-types-less>Show less</button>`;
    }
    const visible = visibleTypeOptions(typeOptions);
    const hiddenCount = typeOptions.length - visible.length;
    if (hiddenCount <= 0) return "";
    return `<button type="button" class="wf-places-pill wf-places-pill-more" data-types-more>+${hiddenCount} more</button>`;
  }

  function render() {
    const statusList = statusPlaces();
    const filtered = filteredPlaces();
    const atlas = buildAtlas(filtered, state.grouping);
    const typeAtlas = buildAtlas(statusList, state.grouping);
    const scopeKey = resolveScopeKey(atlas, state.scopeKey);
    state.scopeKey = scopeKey;
    const scope = atlas.index.get(scopeKey) || atlas.root;
    const trail = atlasTrail(atlas, scope.key);
    const children = scope.children.filter((child) => child.total > 0);
    const typeScope =
      typeAtlas.index.get(resolveScopeKey(typeAtlas, scopeKey)) || typeAtlas.root;
    const typeOptions = countByCategory(leafPlaces(typeScope));
    const searching = state.query.trim().length > 0;
    const searchHits = searching
      ? searchAtlas(atlas, state.query, 40).filter((node) => node.place)
      : [];

    if (state.viewMode !== "map") {
      destroyMap();
    }

    const classicLink =
      `<p class="wf-places-classic-link">Also see the <a href="places-classic.html">original grid demo</a></p>`;
    const banner = omitBanner
      ? ""
      : usingLiveData
        ? `<div class="wf-places-banner"><span><strong>Live atlas</strong> · TravelPlanner-dev</span></div>${classicLink}`
        : `<div class="wf-places-banner">
          <span><strong>Sample data</strong> · ${
            authState === "error"
              ? "Could not reach the API — showing mock places."
              : "Sign in with the same Clerk account as the app to load your atlas."
          }</span>
          <button type="button" data-action="sign-in">Sign in</button>
        </div>${classicLink}`;

    const masthead = omitMasthead
      ? banner
        ? `<div class="wf-places-wrap">${banner}</div>`
        : ""
      : `<div class="wf-places-wrap">
        <div class="wf-places-masthead">
          <div>
            <p class="wf-places-eyebrow">Your atlas</p>
            <h1 class="wf-places-title">Atlas</h1>
            <p class="wf-places-lede">
              Everywhere your saves point to, from continents down to the single café — with what
              you've already visited marked off.
            </p>
          </div>
          <div class="wf-places-count">
            <span class="wf-places-count-value">${scope.total}</span>
            <span class="wf-places-count-label">places</span>
          </div>
        </div>
        ${banner}
      </div>`;

    root.className = `wf-places wf-places--${theme}${omitMasthead ? " wf-places--embedded" : ""}`;
    root.innerHTML = `
      ${masthead}

      <div class="wf-places-bar">
        <div class="wf-places-wrap wf-places-bar-inner">
          <nav class="wf-places-crumbs" aria-label="Hierarchy">
            ${trail
              .map(
                (node, index) => `
              <span>
                ${index > 0 ? `<span class="wf-places-crumb-sep" aria-hidden="true">/</span>` : ""}
                <button type="button" class="${node.key === scope.key ? "is-current" : ""}" data-scope="${escapeHtml(node.key)}">
                  ${escapeHtml(node.name)}
                </button>
              </span>`,
              )
              .join("")}
            ${
              trail.length > 1
                ? `<button type="button" class="wf-places-crumb-up" data-scope="${escapeHtml(trail[trail.length - 2].key)}">↑ Up one level</button>`
                : ""
            }
          </nav>
          <div class="wf-places-seg" role="group" aria-label="View mode">
            <button type="button" data-view="covers" class="${state.viewMode === "covers" ? "is-active" : ""}">Covers</button>
            <button type="button" data-view="map" class="${state.viewMode === "map" ? "is-active" : ""}">Map</button>
          </div>
        </div>
      </div>

      <div class="wf-places-wrap">
        <div class="wf-places-facets">
          <div class="wf-places-toolbar">
            <label class="wf-places-search">
              <input type="search" value="${escapeHtml(state.query)}" placeholder="Find a place…" aria-label="Search places" data-search />
            </label>
            <div class="wf-places-seg wf-places-seg--status" role="group" aria-label="Status filter">
              ${["all", "visited", "inspiration"]
                .map(
                  (filter) => `
                <button type="button" class="${state.statusFilter === filter ? "is-active" : ""}" data-status="${filter}">
                  ${filter === "all" ? "Everything" : filter === "visited" ? "Visited" : "Inspiration"}
                </button>`,
                )
                .join("")}
            </div>
            <div class="wf-places-seg wf-places-seg--group" role="group" aria-label="Grouping">
              <button type="button" class="${state.grouping === "region" ? "is-active" : ""}" data-grouping="region">Region</button>
              <button type="button" class="${state.grouping === "type" ? "is-active" : ""}" data-grouping="type">Type</button>
            </div>
          </div>
          <div class="wf-places-types" role="group" aria-label="Type filter">
            <button type="button" class="wf-places-pill ${state.typeFilter.length === 0 ? "is-active is-soft" : ""}" data-type-all>All types</button>
            ${visibleTypeOptions(typeOptions)
              .map(
                (option) => `
              <button type="button" class="wf-places-pill ${state.typeFilter.includes(option.category) ? "is-active" : ""}" data-type="${escapeHtml(option.category)}">
                ${escapeHtml(option.label)}<span class="count">${option.count}</span>
              </button>`,
              )
              .join("")}
            ${typeOverflowControl(typeOptions)}
          </div>
        </div>

        <div class="wf-places-body">
          <div class="wf-places-scopebar">
            <div>
              <strong>${escapeHtml(scope.name)}</strong>
              <span>
                ${scope.total} places · ${scope.visited} visited · ${scope.inspiration} inspiration ·
                showing ${escapeHtml(childLevelLabel(scope).toLowerCase())}
              </span>
            </div>
          </div>
          <div class="wf-places-legend">
            <span><i class="wf-places-dot visited"></i> Visited</span>
            <span><i class="wf-places-dot dream"></i> Inspiration</span>
            <span class="wf-places-legend-note">
              ${
                searching
                  ? "Search results · same filters"
                  : state.viewMode === "map"
                    ? "Map view · same scope and filters"
                    : "Making the atlas feel aspirational"
              }
            </span>
          </div>

          ${
            allPlaces.length === 0
              ? `<p class="wf-places-empty">No places yet — ingest a post with locations, then come back.</p>`
              : filtered.length === 0
                ? `<p class="wf-places-empty">Nothing matches these filters — clear a type or status.</p>`
                : searching
                  ? searchHits.length === 0
                    ? `<p class="wf-places-empty">No places match that search.</p>`
                    : `<div class="wf-places-search-results">
                        ${searchHits
                          .map((node) => {
                            const place = node.place;
                            return `
                            <a class="wf-places-search-row" href="${placeHref(place.placeId)}">
                              <i class="wf-places-dot ${place.visited ? "visited" : "dream"}"></i>
                              <span class="wf-places-search-row-name">${escapeHtml(place.name)}</span>
                              <span class="wf-places-search-row-trail">${escapeHtml(place.trail.join(" · "))}</span>
                            </a>`;
                          })
                          .join("")}
                      </div>`
                  : state.viewMode === "map"
                    ? `<div class="wf-places-map" data-places-map></div>`
                    : `<div class="wf-places-covers">
                        ${children
                          .map((child) => {
                            const ratio = child.total ? child.visited / child.total : 0;
                            const open = state.expandedKeys.includes(child.key);
                            const isPlace = child.level === "place";
                            const hero = child.place?.hero || null;
                            return `
                            <article class="wf-places-cover ${open ? "is-open" : ""}">
                              <button type="button" class="wf-places-cover-art" style="${coverArt(child.name, hero)}"
                                data-cover="${escapeHtml(child.key)}" data-place-level="${isPlace}">
                                <span class="wf-places-cover-kicker">${escapeHtml(levelLabel(child.level))}</span>
                                <h3>${escapeHtml(child.name)}</h3>
                                <span class="wf-places-cover-meter" style="--ratio:${ratio * 100}%"><i></i></span>
                                <span class="wf-places-cover-stats">
                                  ${
                                    isPlace
                                      ? child.place?.visited
                                        ? "Visited"
                                        : "Inspiration"
                                      : `${child.visited} visited · ${child.total} saved`
                                  }
                                </span>
                              </button>
                              ${
                                open && !isPlace
                                  ? `<div class="wf-places-cover-chips">
                                      ${child.children
                                        .slice(0, 16)
                                        .map(
                                          (grandchild) => `
                                        <button type="button" data-open="${escapeHtml(grandchild.key)}">
                                          ${
                                            grandchild.level === "place"
                                              ? `<i class="wf-places-dot ${grandchild.place?.visited ? "visited" : "dream"}"></i>`
                                              : ""
                                          }
                                          ${escapeHtml(grandchild.name)}
                                          ${grandchild.level !== "place" ? `<span>${grandchild.total}</span>` : ""}
                                        </button>`,
                                        )
                                        .join("")}
                                    </div>`
                                  : ""
                              }
                            </article>`;
                          })
                          .join("")}
                      </div>`
          }
        </div>
      </div>
    `;

    bind(atlas);
    if (state.viewMode === "map" && !searching && filtered.length > 0) {
      void renderMap(scope);
    }
  }

  function openNode(atlas, key) {
    const node = atlas.index.get(key);
    if (!node) return;
    if (node.level === "place" && node.place) {
      location.href = placeHref(node.place.placeId);
      return;
    }
    state.scopeKey = node.key;
    state.expandedKeys = [];
    render();
  }

  function bind(atlas) {
    root.querySelectorAll("[data-scope]").forEach((btn) => {
      btn.addEventListener("click", () => openNode(atlas, btn.getAttribute("data-scope")));
    });
    root.querySelectorAll("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.viewMode = btn.getAttribute("data-view");
        render();
      });
    });
    root.querySelectorAll("[data-grouping]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.grouping = btn.getAttribute("data-grouping");
        state.scopeKey = "world";
        state.expandedKeys = [];
        render();
      });
    });
    root.querySelectorAll("[data-status]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.statusFilter = btn.getAttribute("data-status");
        render();
      });
    });
    const typeAll = root.querySelector("[data-type-all]");
    if (typeAll) {
      typeAll.addEventListener("click", () => {
        state.typeFilter = [];
        render();
      });
    }
    root.querySelectorAll("[data-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const category = btn.getAttribute("data-type");
        state.typeFilter = state.typeFilter.includes(category)
          ? state.typeFilter.filter((entry) => entry !== category)
          : [...state.typeFilter, category];
        render();
      });
    });
    const typesMore = root.querySelector("[data-types-more]");
    if (typesMore) {
      typesMore.addEventListener("click", () => {
        state.typesExpanded = true;
        render();
      });
    }
    const typesLess = root.querySelector("[data-types-less]");
    if (typesLess) {
      typesLess.addEventListener("click", () => {
        state.typesExpanded = false;
        render();
      });
    }
    root.querySelectorAll("[data-cover]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-cover");
        const isPlace = btn.getAttribute("data-place-level") === "true";
        if (isPlace) {
          openNode(atlas, key);
          return;
        }
        state.expandedKeys = state.expandedKeys.includes(key)
          ? state.expandedKeys.filter((entry) => entry !== key)
          : [...state.expandedKeys, key];
        render();
      });
    });
    root.querySelectorAll("[data-open]").forEach((btn) => {
      btn.addEventListener("click", () => openNode(atlas, btn.getAttribute("data-open")));
    });
    const search = root.querySelector("[data-search]");
    if (search) {
      search.addEventListener("input", () => {
        state.query = search.value;
        clearTimeout(search._t);
        search._t = setTimeout(() => {
          const caret = search.selectionStart;
          render();
          const next = root.querySelector("[data-search]");
          if (next) {
            next.focus();
            try {
              next.setSelectionRange(caret, caret);
            } catch {
              /* ignore */
            }
          }
        }, 120);
      });
    }
    const signIn = root.querySelector('[data-action="sign-in"]');
    if (signIn) {
      signIn.addEventListener("click", () => openClerkSignIn());
    }
  }

  render();
}
