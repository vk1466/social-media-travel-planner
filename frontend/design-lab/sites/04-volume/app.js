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
];

const state = {
  posts: [],
  places: [],
  placesAuth: null,
  postsAuth: null,
  shell: null,
  activePanel: null,
};

function pickBentoTiles(posts) {
  const seenCaptions = new Set();
  const fromReels = [];
  for (const post of posts) {
    if (!post.thumbnailUrl) continue;
    const caption =
      (post.placeNames && post.placeNames[0]) ||
      post.author ||
      post.title?.slice(0, 28) ||
      "Saved";
    const captionKey = String(caption).toLowerCase();
    if (seenCaptions.has(captionKey)) continue;
    seenCaptions.add(captionKey);
    fromReels.push({ src: post.thumbnailUrl, caption });
    if (fromReels.length >= 5) break;
  }
  const tiles = [...fromReels];
  for (const fallback of FALLBACK_TILES) {
    if (tiles.length >= 5) break;
    if (tiles.some((t) => t.caption === fallback.caption)) continue;
    tiles.push(fallback);
  }
  while (tiles.length < 5) {
    tiles.push(FALLBACK_TILES[tiles.length % FALLBACK_TILES.length]);
  }
  return tiles.slice(0, 5);
}

function renderBento(posts, placeCount, visitCount) {
  const tiles = pickBentoTiles(posts);
  for (let i = 0; i < 5; i += 1) {
    const slot = document.querySelector(`[data-slot="${i}"]`);
    if (!slot) continue;
    const img = slot.querySelector("img");
    const caption = slot.querySelector(".caption");
    const tile = tiles[i];
    if (img) {
      img.src = tile.src;
      img.alt = tile.caption;
    }
    if (caption) caption.textContent = tile.caption;
  }
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
    // Wait until library data is ready — boot() will re-call after load if needed
    state._pendingOpen = open;
  }
}

async function boot() {
  wireChrome();
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
