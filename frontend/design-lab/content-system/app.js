import { pageCopy, pages, systems } from "./options.js";

const params = new URLSearchParams(location.search);
let systemIndex = Math.max(0, systems.findIndex((item) => item.id === (params.get("demo") || "01")));
let pageKey = pages.some((page) => page.key === params.get("page")) ? params.get("page") : "home";

const root = document.querySelector("#app");

function icons(key) {
  return { home: "⌂", posts: "▦", travel: "⌖", food: "◒", movies: "▶", history: "◷", add: "+", search: "⌕" }[key];
}

function preview(page, copy) {
  if (page === "add") return `<div class="input-card"><label>Source links</label><div class="textarea">https://www.instagram.com/reel/kyoto-walk<br>https://www.youtube.com/watch?v=amalfi-guide</div><p>2 links ready to save</p></div>`;
  if (page === "search") return `<div class="search-card"><span>⌕</span><b>Kyoto</b><kbd>⌘ K</kbd></div><div class="results"><p>Top results</p><article><b>Kiyomizu-dera</b><span>Place · Kyoto, Japan</span></article><article><b>A quiet morning in Higashiyama</b><span>Saved post · Instagram</span></article></div>`;
  if (page === "history") return `<div class="metrics"><article><b>24</b><span>visits</span></article><article><b>9</b><span>countries</span></article><article><b>17</b><span>cities</span></article></div><div class="journey"><time>May 2026</time><i></i><div><b>Kyoto, Japan</b><span>Temples, coffee, long walks</span></div></div>`;
  const cards = page === "food"
    ? [["Miso butter udon", "25 min · Japanese"], ["Summer tomato tart", "45 min · French"], ["Chili crisp eggs", "15 min · Breakfast"]]
    : page === "movies"
      ? [["Perfect Days", "2023 · Drama"], ["The Talented Mr. Ripley", "1999 · Thriller"], ["Past Lives", "2023 · Romance"]]
      : page === "travel"
        ? [["Kyoto", "12 saves · 4 visited"], ["Amalfi Coast", "9 saves · planning"], ["Mexico City", "7 saves · planning"]]
        : [["Kyoto before breakfast", "Instagram · 3 places"], ["A local guide to Ravello", "YouTube · 8 places"], ["48 hours in Roma Norte", "Blog · 11 places"]];
  return `<div class="filters"><button class="on">All</button><button>Saved</button><button>Visited</button><label>⌕ Search</label></div><div class="content-grid">${cards.map((card, index) => `<article><div class="cover c${index + 1}"><span>${icons(page)}</span></div><small>${copy.eyebrow}</small><b>${card[0]}</b><p>${card[1]}</p><button>Open ${page === "travel" ? "place" : page === "food" ? "recipe" : page === "movies" ? "movie" : "save"} →</button></article>`).join("")}</div>`;
}

function render() {
  const system = systems[systemIndex];
  const copy = pageCopy(system.id, pageKey);
  document.body.className = system.className;
  document.title = `${system.name} · ${pages.find((page) => page.key === pageKey).label} · Content System Lab`;
  root.innerHTML = `
    <aside class="review-rail">
      <a class="back" href="../index.html">← Design Lab</a>
      <p class="lab-kicker">Type + language</p>
      <h1>One voice,<br>every page.</h1>
      <nav class="system-list" aria-label="Demo directions">
        ${systems.map((item, index) => `<button class="${index === systemIndex ? "active" : ""}" data-system="${index}"><span>${item.id}</span><b>${item.name}</b></button>`).join("")}
      </nav>
      <p class="key-note">← → change system<br>↑ ↓ change page</p>
    </aside>
    <main class="stage">
      <div class="review-bar"><div><b>${system.id} · ${system.name}</b><span>${system.verdict} · ${system.axis}</span></div><span>8 pages · 10 systems</span></div>
      <section class="product-shell">
        <header class="product-header"><a class="brand">Wanderfile</a><nav>${pages.slice(0, 6).map((page) => `<button data-page="${page.key}" class="${page.key === pageKey ? "active" : ""}">${page.label}</button>`).join("")}</nav><div><button data-page="search" aria-label="Search">⌕</button><button class="add" data-page="add">+ Add</button></div></header>
        <div class="page-wrap">
          <header class="page-heading"><div><p>${copy.eyebrow}</p><h2>${copy.title}</h2><div class="lede">${copy.lede}</div></div><button class="primary">${copy.action}</button></header>
          <section class="section-heading"><div><p>01 / Collection</p><h3>${copy.section}</h3></div><span>${copy.meta}</span></section>
          ${preview(pageKey, copy)}
        </div>
      </section>
      <footer class="system-note"><b>${system.summary}</b><span>Inspect all eight pages before choosing a system.</span></footer>
    </main>`;
  root.querySelectorAll("[data-system]").forEach((button) => button.addEventListener("click", () => { systemIndex = Number(button.dataset.system); sync(); }));
  root.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => { pageKey = button.dataset.page; sync(); }));
}

function sync() {
  const url = new URL(location.href);
  url.searchParams.set("demo", systems[systemIndex].id);
  url.searchParams.set("page", pageKey);
  history.replaceState({}, "", url);
  render();
}

addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") systemIndex = (systemIndex + 1) % systems.length;
  else if (event.key === "ArrowLeft") systemIndex = (systemIndex - 1 + systems.length) % systems.length;
  else if (event.key === "ArrowDown") pageKey = pages[(pages.findIndex((page) => page.key === pageKey) + 1) % pages.length].key;
  else if (event.key === "ArrowUp") pageKey = pages[(pages.findIndex((page) => page.key === pageKey) - 1 + pages.length) % pages.length].key;
  else return;
  sync();
});

render();
