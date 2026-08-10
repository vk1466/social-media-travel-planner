/**
 * Volume shared library shell — one chrome for Places & Posts.
 * Filter UX stays the same; only conditions + core body swap by mode.
 */
import { openClerkSignIn, PLATFORMS } from "../shared/api.js";
import { mountPlacesBrowse } from "../shared/places-browse.js";
import { mountPostsBrowse } from "../shared/posts-browse.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PILL_PREVIEW_COUNT = 5;

const COPY = {
  places: {
    eyebrow: "Your atlas",
    title: "Places",
    lede: "Everywhere your saves point to — filters stay put, only the atlas body changes.",
    searchPlaceholder: "Find a place…",
    searchLabel: "Search places",
    pillAll: "All types",
    viewA: { key: "covers", label: "Covers" },
    viewB: { key: "map", label: "Map" },
  },
  posts: {
    eyebrow: "Your library",
    title: "Posts",
    lede: "Every reel and save — same filter chrome as Places, different conditions underneath.",
    searchPlaceholder: "Title, place, tag…",
    searchLabel: "Search saves",
    pillAll: "All saves",
    viewA: { key: "deck", label: "Deck" },
    viewB: { key: "grid", label: "Grid" },
  },
};

/**
 * @param {HTMLElement} panel
 * @param {{
 *   places: object[],
 *   posts: object[],
 *   placesAuth?: object,
 *   postsAuth?: object,
 * }} data
 */
export function mountLibraryShell(panel, data) {
  const state = {
    mode: null,
    places: {
      statusFilter: "all",
      grouping: "region",
      typeFilter: [],
      query: "",
      viewMode: "covers",
    },
    posts: {
      platform: "all",
      ringKey: "all",
      query: "",
      deckMode: "deck",
    },
    pillsExpanded: false,
    meta: { count: 0, countLabel: "", context: "", pills: [] },
  };

  let placesCtl = null;
  let postsCtl = null;
  let searchTimer = null;

  panel.innerHTML = `
    <div class="vol-shell">
      <div class="vol-shell-masthead">
        <div>
          <p class="vol-shell-eyebrow" data-shell-eyebrow></p>
          <h3 data-shell-title></h3>
          <p class="vol-shell-lede" data-shell-lede></p>
        </div>
        <div class="vol-shell-count">
          <span class="vol-shell-count-value" data-shell-count>—</span>
          <span class="vol-shell-count-label" data-shell-count-label></span>
        </div>
      </div>
      <div class="vol-shell-banner" data-shell-banner hidden></div>
      <div class="vol-shell-bar">
        <p class="vol-shell-context" data-shell-context></p>
        <div class="vol-shell-seg" role="group" aria-label="View mode" data-shell-view></div>
      </div>
      <div class="vol-shell-facets">
        <div class="vol-shell-toolbar">
          <label class="vol-shell-search">
            <input type="search" data-shell-search aria-label="Search" />
          </label>
          <div class="vol-shell-seg vol-shell-seg--primary" data-shell-primary role="group"></div>
          <div class="vol-shell-seg vol-shell-seg--secondary" data-shell-secondary role="group"></div>
        </div>
        <div class="vol-shell-pills" data-shell-pills role="group"></div>
      </div>
      <div class="vol-shell-core">
        <div id="wf-places-root" class="wf-places wf-places--volume wf-places--embedded wf-places--core" hidden></div>
        <div id="wf-posts-root" class="wf-posts wf-posts--volume wf-posts--embedded wf-posts--core" hidden></div>
      </div>
    </div>
  `;

  const els = {
    eyebrow: panel.querySelector("[data-shell-eyebrow]"),
    title: panel.querySelector("[data-shell-title]"),
    lede: panel.querySelector("[data-shell-lede]"),
    count: panel.querySelector("[data-shell-count]"),
    countLabel: panel.querySelector("[data-shell-count-label]"),
    banner: panel.querySelector("[data-shell-banner]"),
    context: panel.querySelector("[data-shell-context]"),
    view: panel.querySelector("[data-shell-view]"),
    search: panel.querySelector("[data-shell-search]"),
    primary: panel.querySelector("[data-shell-primary]"),
    secondary: panel.querySelector("[data-shell-secondary]"),
    pills: panel.querySelector("[data-shell-pills]"),
    placesRoot: panel.querySelector("#wf-places-root"),
    postsRoot: panel.querySelector("#wf-posts-root"),
  };

  function activeFilters() {
    return state.mode === "places" ? state.places : state.posts;
  }

  function visiblePills(pills, selectedKeys) {
    if (state.pillsExpanded || pills.length <= PILL_PREVIEW_COUNT) {
      return pills;
    }
    const top = pills.slice(0, PILL_PREVIEW_COUNT);
    const topKeys = new Set(top.map((pill) => pill.key));
    const selectedExtra = pills.filter(
      (pill) => selectedKeys.includes(pill.key) && !topKeys.has(pill.key),
    );
    return [...top, ...selectedExtra];
  }

  function pillsOverflowControl(pills, visible) {
    if (pills.length <= PILL_PREVIEW_COUNT) return "";
    if (state.pillsExpanded) {
      return `<button type="button" class="vol-shell-pill vol-shell-pill-more" data-shell-pills-less>Show less</button>`;
    }
    const hiddenCount = pills.length - visible.length;
    if (hiddenCount <= 0) return "";
    return `<button type="button" class="vol-shell-pill vol-shell-pill-more" data-shell-pills-more>+${hiddenCount} more</button>`;
  }

  function renderPillsRow() {
    const copy = COPY[state.mode];
    const filters = activeFilters();
    const pills = state.meta.pills || [];

    if (state.mode === "places") {
      const visible = visiblePills(pills, filters.typeFilter);
      els.pills.innerHTML = `
        <button type="button" class="vol-shell-pill ${filters.typeFilter.length === 0 ? "is-active is-soft" : ""}" data-shell-pill-all>${copy.pillAll}</button>
        ${visible
          .map(
            (pill) => `
          <button type="button" class="vol-shell-pill ${filters.typeFilter.includes(pill.key) ? "is-active" : ""}" data-shell-pill="${escapeHtml(pill.key)}">
            ${escapeHtml(pill.label)}${pill.count != null ? `<span class="count">${pill.count}</span>` : ""}
          </button>`,
          )
          .join("")}
        ${pillsOverflowControl(pills, visible)}`;
      return;
    }

    // Posts: first pill is usually "All saves" — keep it pinned, limit the rest.
    const lead = pills.filter((pill) => pill.key === "all");
    const rest = pills.filter((pill) => pill.key !== "all");
    const selectedRest = filters.ringKey !== "all" ? [filters.ringKey] : [];
    const visibleRest = visiblePills(rest, selectedRest);
    els.pills.innerHTML = `
      ${lead
        .map(
          (pill) => `
        <button type="button" class="vol-shell-pill ${filters.ringKey === pill.key ? "is-active is-soft" : "is-soft"}" data-shell-pill="${escapeHtml(pill.key)}">
          ${escapeHtml(pill.label)}${pill.count != null ? `<span class="count">${pill.count}</span>` : ""}
        </button>`,
        )
        .join("")}
      ${visibleRest
        .map(
          (pill) => `
        <button type="button" class="vol-shell-pill ${filters.ringKey === pill.key ? "is-active" : ""}" data-shell-pill="${escapeHtml(pill.key)}">
          ${escapeHtml(pill.label)}${pill.count != null ? `<span class="count">${pill.count}</span>` : ""}
        </button>`,
        )
        .join("")}
      ${pillsOverflowControl(rest, visibleRest)}`;
  }

  function renderBanner() {
    const auth =
      state.mode === "places"
        ? data.placesAuth || { usingLiveData: false, authState: "signed-out" }
        : data.postsAuth || { usingLiveData: false, authState: "signed-out" };
    if (auth.usingLiveData) {
      els.banner.hidden = false;
      els.banner.innerHTML = `<span><strong>Live library</strong> · TravelPlanner-dev</span>`;
      return;
    }
    els.banner.hidden = false;
    els.banner.innerHTML = `
      <span><strong>Sample data</strong> · ${
        auth.authState === "error"
          ? "Could not reach the API — showing mock library."
          : "Sign in with the same Clerk account as the app to load your library."
      }</span>
      <button type="button" data-shell-signin>Sign in</button>`;
    els.banner.querySelector("[data-shell-signin]")?.addEventListener("click", () => openClerkSignIn());
  }

  function renderChrome() {
    const copy = COPY[state.mode];
    const filters = activeFilters();
    els.eyebrow.textContent = copy.eyebrow;
    els.title.textContent = copy.title;
    els.lede.textContent = copy.lede;
    els.count.textContent = String(state.meta.count ?? "—");
    els.countLabel.textContent = state.meta.countLabel || "";
    els.context.textContent = state.meta.context || "Library";
    els.search.placeholder = copy.searchPlaceholder;
    els.search.setAttribute("aria-label", copy.searchLabel);
    els.search.value = state.mode === "places" ? filters.query : filters.query;

    els.view.innerHTML = `
      <button type="button" data-shell-view-btn="${copy.viewA.key}" class="${
        (state.mode === "places" ? filters.viewMode : filters.deckMode) === copy.viewA.key
          ? "is-active"
          : ""
      }">${copy.viewA.label}</button>
      <button type="button" data-shell-view-btn="${copy.viewB.key}" class="${
        (state.mode === "places" ? filters.viewMode : filters.deckMode) === copy.viewB.key
          ? "is-active"
          : ""
      }">${copy.viewB.label}</button>`;

    if (state.mode === "places") {
      els.primary.innerHTML = ["all", "visited", "inspiration"]
        .map(
          (key) => `
        <button type="button" data-shell-primary-btn="${key}" class="${filters.statusFilter === key ? "is-active" : ""}">
          ${key === "all" ? "Everything" : key === "visited" ? "Visited" : "Inspiration"}
        </button>`,
        )
        .join("");
      els.secondary.hidden = false;
      els.secondary.innerHTML = `
        <button type="button" data-shell-secondary-btn="region" class="${filters.grouping === "region" ? "is-active" : ""}">Region</button>
        <button type="button" data-shell-secondary-btn="type" class="${filters.grouping === "type" ? "is-active" : ""}">Type</button>`;
    } else {
      els.primary.innerHTML = PLATFORMS.map(
        (key) => `
        <button type="button" data-shell-primary-btn="${key}" class="${filters.platform === key ? "is-active" : ""}">
          ${key === "all" ? "Everything" : key}
        </button>`,
      ).join("");
      els.secondary.hidden = true;
      els.secondary.innerHTML = "";
    }

    renderPillsRow();
    renderBanner();
  }

  function onMeta(meta) {
    state.meta = meta;
    els.count.textContent = String(meta.count ?? "—");
    els.countLabel.textContent = meta.countLabel || "";
    els.context.textContent = meta.context || "Library";
    renderPillsRow();
  }

  function ensureCore(mode) {
    if (mode === "places" && !placesCtl) {
      placesCtl = mountPlacesBrowse(els.placesRoot, {
        theme: "volume",
        places: data.places,
        usingLiveData: Boolean(data.placesAuth?.usingLiveData),
        authState: data.placesAuth?.authState || "signed-out",
        omitChrome: true,
        omitBanner: true,
        initialState: { ...state.places },
        onMeta: (meta) => {
          if (state.mode !== "places") return;
          onMeta(meta);
        },
        placeHref: (placeId) => `place.html?id=${encodeURIComponent(placeId)}`,
      });
    }
    if (mode === "posts" && !postsCtl) {
      postsCtl = mountPostsBrowse(els.postsRoot, {
        theme: "volume",
        posts: data.posts,
        usingLiveData: Boolean(data.postsAuth?.usingLiveData),
        authState: data.postsAuth?.authState || "signed-out",
        omitChrome: true,
        omitBanner: true,
        initialState: { ...state.posts },
        onMeta: (meta) => {
          if (state.mode !== "posts") return;
          onMeta(meta);
        },
        postHref: (post) =>
          post.postUrl?.startsWith("http")
            ? post.postUrl
            : `post.html?id=${encodeURIComponent(post.key)}`,
        placeHref: (placeId) => `place.html?id=${encodeURIComponent(placeId)}`,
      });
    }
  }

  function applyFiltersToCore() {
    if (state.mode === "places" && placesCtl) {
      placesCtl.setFilters({ ...state.places });
    }
    if (state.mode === "posts" && postsCtl) {
      postsCtl.setFilters({ ...state.posts });
    }
  }

  function showMode(mode) {
    if (state.mode !== mode) {
      state.pillsExpanded = false;
    }
    state.mode = mode;
    ensureCore(mode);
    els.placesRoot.hidden = mode !== "places";
    els.postsRoot.hidden = mode !== "posts";
    renderChrome();
    applyFiltersToCore();
  }

  panel.addEventListener("click", (event) => {
    const viewBtn = event.target.closest("[data-shell-view-btn]");
    if (viewBtn) {
      const key = viewBtn.getAttribute("data-shell-view-btn");
      if (state.mode === "places") state.places.viewMode = key;
      else state.posts.deckMode = key;
      renderChrome();
      applyFiltersToCore();
      return;
    }
    const primaryBtn = event.target.closest("[data-shell-primary-btn]");
    if (primaryBtn) {
      const key = primaryBtn.getAttribute("data-shell-primary-btn");
      if (state.mode === "places") state.places.statusFilter = key;
      else state.posts.platform = key;
      renderChrome();
      applyFiltersToCore();
      return;
    }
    const secondaryBtn = event.target.closest("[data-shell-secondary-btn]");
    if (secondaryBtn && state.mode === "places") {
      state.places.grouping = secondaryBtn.getAttribute("data-shell-secondary-btn");
      renderChrome();
      applyFiltersToCore();
      return;
    }
    if (event.target.closest("[data-shell-pills-more]")) {
      state.pillsExpanded = true;
      renderPillsRow();
      return;
    }
    if (event.target.closest("[data-shell-pills-less]")) {
      state.pillsExpanded = false;
      renderPillsRow();
      return;
    }
    if (event.target.closest("[data-shell-pill-all]") && state.mode === "places") {
      state.places.typeFilter = [];
      renderChrome();
      applyFiltersToCore();
      return;
    }
    const pill = event.target.closest("[data-shell-pill]");
    if (pill) {
      const key = pill.getAttribute("data-shell-pill");
      if (state.mode === "places") {
        state.places.typeFilter = state.places.typeFilter.includes(key)
          ? state.places.typeFilter.filter((entry) => entry !== key)
          : [...state.places.typeFilter, key];
      } else {
        state.posts.ringKey = key;
      }
      renderChrome();
      applyFiltersToCore();
    }
  });

  els.search.addEventListener("input", () => {
    const value = els.search.value;
    if (state.mode === "places") state.places.query = value;
    else state.posts.query = value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => applyFiltersToCore(), 120);
  });

  return {
    open(mode) {
      showMode(mode);
    },
    getMode() {
      return state.mode;
    },
  };
}
