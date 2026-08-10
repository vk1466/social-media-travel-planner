/**
 * Volume home — bento hero + shared library shell (Places/Posts cores swap).
 */
import { loadLibrary, loadPlacesLibrary } from "../shared/api.js";
import { mountLibraryShell } from "./library-shell.js";

const FALLBACK_TILES = [
  {
    src: "https://images.unsplash.com/photo-1523592121529-f6dde35f079e?w=2000&h=1200&fit=crop&auto=format&q=80",
    caption: "Cappadocia",
  },
  {
    src: "https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1200&h=1600&fit=crop&auto=format&q=80",
    caption: "Positano",
  },
  {
    src: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1600&h=1000&fit=crop&auto=format&q=80",
    caption: "Kyoto",
  },
  {
    src: "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1800&h=1100&fit=crop&auto=format&q=80",
    caption: "Santorini",
  },
  {
    src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2000&h=1200&fit=crop&auto=format&q=80",
    caption: "Nærøyfjord",
  },
  {
    src: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=2000&h=1200&fit=crop&auto=format&q=80",
    caption: "Dolomites",
  },
  {
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=2000&h=1200&fit=crop&auto=format&q=80",
    caption: "Maldives",
  },
  {
    src: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1600&h=1000&fit=crop&auto=format&q=80",
    caption: "Paris",
  },
];

const SLOT_COUNT = 5;
const ROTATE_MS = 4200;
const TRANSITION_MS = 900;
const MOTION_STORAGE_KEY = "wf-bento-motion";

const MOTION_PRESETS = [
  {
    id: "crossfade",
    label: "Crossfade",
    note: "Gentle opacity blend.",
    swatch: "linear-gradient(135deg, #1a1612 0%, #ff8b4d 100%)",
  },
  {
    id: "slide-up",
    label: "Slide up",
    note: "Next frame rises from below.",
    swatch: "linear-gradient(180deg, #ff8b4d 0%, #1f3a2c 100%)",
  },
  {
    id: "slide-left",
    label: "Slide left",
    note: "Horizontal push.",
    swatch: "linear-gradient(90deg, #1f3a2c 0%, #ff5733 100%)",
  },
  {
    id: "zoom-soft",
    label: "Zoom soft",
    note: "Slight scale-in.",
    swatch: "radial-gradient(circle at 40% 40%, #ff8b4d, #0d1510)",
  },
  {
    id: "blur-dissolve",
    label: "Blur dissolve",
    note: "Soft focus out.",
    swatch: "linear-gradient(135deg, #9eb0a6 0%, #1a1612 100%)",
  },
  {
    id: "wipe",
    label: "Wipe",
    note: "Diagonal clip reveal.",
    swatch: "linear-gradient(135deg, #ff5733 45%, #1a1612 55%)",
  },
  {
    id: "flip",
    label: "Flip",
    note: "Card flip on Y.",
    swatch: "linear-gradient(90deg, #1a1612 50%, #ff8b4d 50%)",
  },
  {
    id: "card-shuffle",
    label: "Shuffle",
    note: "Tiny tilt and lift.",
    swatch: "linear-gradient(160deg, #ff8b4d 0%, #d94a1f 40%, #1f3a2c 100%)",
  },
];

const state = {
  posts: [],
  places: [],
  placesAuth: null,
  postsAuth: null,
  shell: null,
  activePanel: null,
  pool: [],
  tiles: [],
  slotCursor: 0,
  rotateTimer: null,
};

function applyMotion(id) {
  const next = MOTION_PRESETS.some((p) => p.id === id) ? id : "crossfade";
  document.documentElement.dataset.bentoMotion = next;
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

function readMotion() {
  try {
    const raw = localStorage.getItem(MOTION_STORAGE_KEY);
    if (raw && MOTION_PRESETS.some((p) => p.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return "crossfade";
}

function buildPhotoPool(posts) {
  const seenSrc = new Set();
  const pool = [];
  for (const post of posts) {
    if (!post.thumbnailUrl) continue;
    if (seenSrc.has(post.thumbnailUrl)) continue;
    const caption =
      (post.placeNames && post.placeNames[0]) ||
      post.author ||
      post.title?.slice(0, 28) ||
      "Saved";
    seenSrc.add(post.thumbnailUrl);
    pool.push({ src: post.thumbnailUrl, caption });
  }
  if (pool.length >= SLOT_COUNT + 1) return pool;
  for (const fallback of FALLBACK_TILES) {
    if (seenSrc.has(fallback.src)) continue;
    seenSrc.add(fallback.src);
    pool.push(fallback);
  }
  return pool;
}

function pickInitialTiles(pool) {
  if (!pool.length) return FALLBACK_TILES.slice(0, SLOT_COUNT);
  const tiles = [];
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    tiles.push(pool[i % pool.length]);
  }
  return tiles;
}

function nextTileForSlot(pool, current, slotIndex) {
  const usedElsewhere = new Set(
    current.filter((_, index) => index !== slotIndex).map((tile) => tile.src),
  );
  const candidates = pool.filter(
    (tile) => !usedElsewhere.has(tile.src) && tile.src !== current[slotIndex]?.src,
  );
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function setSlotTile(slotIndex, tile, { animate = true } = {}) {
  const slot = document.querySelector(`[data-slot="${slotIndex}"]`);
  if (!slot || !tile) return;

  const base = slot.querySelector(".vol-tile-layer--base");
  const next = slot.querySelector(".vol-tile-layer--next");
  const caption = slot.querySelector(".caption");

  if (!animate || !base || !next) {
    if (base) {
      base.src = tile.src;
      base.alt = tile.caption;
    }
    if (caption) caption.textContent = tile.caption;
    slot.classList.remove("is-in", "is-out", "is-transitioning");
    return;
  }

  if (base.getAttribute("src") === tile.src) {
    if (caption) caption.textContent = tile.caption;
    return;
  }

  next.src = tile.src;
  next.alt = tile.caption;
  slot.classList.remove("is-in");
  slot.classList.add("is-transitioning", "is-out");
  requestAnimationFrame(() => {
    slot.classList.remove("is-out");
    slot.classList.add("is-in");
  });
  if (caption) caption.textContent = tile.caption;

  window.setTimeout(() => {
    base.src = tile.src;
    base.alt = tile.caption;
    next.removeAttribute("src");
    slot.classList.remove("is-in", "is-out", "is-transitioning");
  }, TRANSITION_MS);
}

function paintTiles(tiles, { animate = false } = {}) {
  state.tiles = tiles;
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    setSlotTile(i, tiles[i], { animate });
  }
}

function startRotation() {
  if (state.rotateTimer) {
    window.clearInterval(state.rotateTimer);
    state.rotateTimer = null;
  }
  if (state.pool.length <= 1) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  state.rotateTimer = window.setInterval(() => {
    const slotIndex = state.slotCursor % SLOT_COUNT;
    state.slotCursor += 1;
    const next = nextTileForSlot(state.pool, state.tiles, slotIndex);
    if (!next) return;
    const updated = state.tiles.slice();
    updated[slotIndex] = next;
    state.tiles = updated;
    setSlotTile(slotIndex, next, { animate: true });
  }, ROTATE_MS);
}

function renderStats(posts, placeCount, visitCount) {
  const savedEl = document.querySelector('[data-stat="saved"]');
  const visitedEl = document.querySelector('[data-stat="visited"]');
  if (savedEl) savedEl.textContent = String(placeCount);
  if (visitedEl) visitedEl.textContent = String(visitCount);

  const placesMeta = document.querySelector('[data-tab-meta="places"]');
  const postsMeta = document.querySelector('[data-tab-meta="posts"]');
  if (placesMeta) {
    placesMeta.textContent = `${placeCount} place${placeCount === 1 ? "" : "s"} · ${visitCount} visited`;
  }
  if (postsMeta) {
    postsMeta.textContent = `${posts.length} save${posts.length === 1 ? "" : "s"}`;
  }
}

function renderBento(posts, placeCount, visitCount) {
  state.pool = buildPhotoPool(posts);
  paintTiles(pickInitialTiles(state.pool), { animate: false });
  renderStats(posts, placeCount, visitCount);
  startRotation();
}

function ensureShell() {
  if (state.shell) return state.shell;
  const panel = document.getElementById("panel-library");
  state.shell = mountLibraryShell(panel, {
    places: state.places,
    posts: state.posts,
    placesAuth: state.placesAuth,
    postsAuth: state.postsAuth,
  });
  return state.shell;
}

function syncTabChrome(kind) {
  const discover = document.querySelector("[data-nav-discover]");
  if (discover) discover.classList.toggle("is-on", !kind);

  for (const btn of document.querySelectorAll("[data-open]")) {
    const isActive = btn.getAttribute("data-open") === kind;
    btn.classList.toggle("is-on", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  }

  const panel = document.getElementById("panel-library");
  if (panel) {
    panel.hidden = !kind;
    if (kind === "places") panel.setAttribute("aria-labelledby", "tab-places");
    if (kind === "posts") panel.setAttribute("aria-labelledby", "tab-posts");
  }
}

async function openPanel(kind, { scroll = true } = {}) {
  if (kind !== "places" && kind !== "posts") return;
  state.activePanel = kind;
  syncTabChrome(kind);
  const shell = ensureShell();
  shell.open(kind);

  if (scroll) {
    document.getElementById("panel-library")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const url = new URL(location.href);
  url.searchParams.set("open", kind);
  history.replaceState(null, "", url);
}

function wireMotionPicker() {
  const root = document.querySelector("[data-motion-picker]");
  if (!root) return;

  const toggle = root.querySelector("[data-motion-toggle]");
  const panel = root.querySelector("[data-motion-panel]");
  const list = root.querySelector("[data-motion-list]");
  const swatch = root.querySelector("[data-motion-swatch]");

  const current = applyMotion(readMotion());

  list.innerHTML = MOTION_PRESETS.map(
    (preset) => `
    <button type="button" class="vol-motion-preset" data-motion-id="${preset.id}" aria-pressed="${preset.id === current}">
      <span class="vol-motion-preset-swatch" style="background:${preset.swatch}" aria-hidden="true"></span>
      <span class="vol-motion-preset-meta">
        <span class="vol-motion-preset-label">${preset.label}</span>
        <span class="vol-motion-preset-note">${preset.note}</span>
      </span>
    </button>`,
  ).join("");

  const syncActive = (id) => {
    const preset = MOTION_PRESETS.find((p) => p.id === id);
    if (swatch && preset) swatch.style.background = preset.swatch;
    for (const btn of list.querySelectorAll("[data-motion-id]")) {
      btn.setAttribute(
        "aria-pressed",
        btn.getAttribute("data-motion-id") === id ? "true" : "false",
      );
    }
  };
  syncActive(current);

  toggle?.addEventListener("click", () => {
    const open = root.getAttribute("data-open") === "true";
    root.setAttribute("data-open", open ? "false" : "true");
    if (panel) panel.hidden = open;
  });

  list.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-motion-id]");
    if (!btn) return;
    const id = applyMotion(btn.getAttribute("data-motion-id"));
    syncActive(id);
  });
}

function wireChrome() {
  document.addEventListener("click", (event) => {
    const openBtn = event.target.closest("[data-open]");
    if (!openBtn) return;
    event.preventDefault();
    openPanel(openBtn.getAttribute("data-open"));
  });

  const params = new URLSearchParams(location.search);
  const open = params.get("open");
  if (open === "places" || open === "posts") {
    state._pendingOpen = open;
  }
}

async function boot() {
  wireChrome();
  wireMotionPicker();
  renderBento([], 0, 0);

  try {
    const [postsLib, placesLib] = await Promise.all([
      loadLibrary(window.WF_MOCK),
      loadPlacesLibrary(window.WF_MOCK),
    ]);
    state.posts = postsLib.posts;
    state.places = placesLib.places;
    state.postsAuth = {
      usingLiveData: postsLib.usingLiveData,
      authState: postsLib.authState,
    };
    state.placesAuth = {
      usingLiveData: placesLib.usingLiveData,
      authState: placesLib.authState,
    };
    const visitCount = placesLib.places.filter((p) => p.visited).length;
    renderBento(postsLib.posts, placesLib.places.length, visitCount);
  } catch (err) {
    console.warn("[volume] library load failed", err);
    const mock = window.WF_MOCK;
    if (mock) {
      const visitCount = (mock.places || []).filter((p) => p.visited).length;
      const posts = (mock.posts || []).map((p) => ({
        thumbnailUrl: p.cover,
        placeNames: (p.places || [])
          .map((id) => mock.placeById(id)?.name)
          .filter(Boolean),
        author: p.author,
        title: p.title,
      }));
      state.posts = posts;
      state.places = [];
      renderBento(posts, mock.places.length, visitCount);
    }
  }

  if (state._pendingOpen) {
    openPanel(state._pendingOpen);
    state._pendingOpen = null;
  }
}

boot();
