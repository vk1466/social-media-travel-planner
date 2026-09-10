import { activePageCategory, activePageDemo, PAGE_CATEGORIES, PAGE_DEMOS } from "./options.js";

const demo = activePageDemo();
const category = activePageCategory();
const root = document.querySelector("#pages-demo");
const demoIndex = PAGE_DEMOS.indexOf(demo);
const previous = PAGE_DEMOS[(demoIndex - 1 + PAGE_DEMOS.length) % PAGE_DEMOS.length];
const next = PAGE_DEMOS[(demoIndex + 1) % PAGE_DEMOS.length];

const images = {
  kyoto: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1100&h=800&fit=crop&auto=format&q=82",
  coast: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1100&h=800&fit=crop&auto=format&q=82",
  road: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1100&h=800&fit=crop&auto=format&q=82",
  pasta: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900&h=900&fit=crop&auto=format&q=82",
  toast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&h=900&fit=crop&auto=format&q=82",
  market: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=900&h=900&fit=crop&auto=format&q=82",
  cinema: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&h=1100&fit=crop&auto=format&q=82",
  mountain: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&h=1100&fit=crop&auto=format&q=82",
};

const content = {
  posts: [
    ["A hidden Kyoto walk", "Instagram · yesterday", images.kyoto],
    ["The coast road worth saving", "TikTok · Monday", images.coast],
    ["48 hours in the Dolomites", "Instagram · last week", images.mountain],
    ["A market morning", "Instagram · Aug 28", images.market],
  ],
  travel: [
    ["Amalfi Coast", "Italy · 12 places", images.coast],
    ["Kyoto", "Japan · 8 places", images.kyoto],
    ["Sausalito", "California · 6 places", images.road],
  ],
  food: [
    ["Lemon pasta", "25 min · dinner", images.pasta],
    ["Tomato toast", "15 min · brunch", images.toast],
    ["Market salad", "20 min · lunch", images.market],
  ],
  movies: [
    ["The Secret Life of Walter Mitty", "2013 · Adventure", images.mountain],
    ["Lost in Translation", "2003 · Tokyo", images.kyoto],
    ["Cinema Paradiso", "1988 · Sicily", images.cinema],
  ],
};

function icon(name) {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function categoryHref(key) {
  return `${key}.html`;
}

function navItems() {
  return PAGE_CATEGORIES.map((item) => `<a href="${categoryHref(item.key)}" class="${item.key === category.key ? "is-on" : ""}" aria-current="${item.key === category.key ? "page" : "false"}"><span>${item.icon}</span><b>${item.label}</b>${item.count ? `<small>${item.count}</small>` : ""}</a>`).join("");
}

function navigation() {
  if (["02", "07", "09"].includes(demo.id)) {
    return `<aside class="side-navigation"><a class="wordmark" href="home.html">Wanderfile</a><p>Library</p><nav>${navItems()}</nav><button data-add>${icon("plus")} Add links</button></aside>`;
  }
  if (demo.id === "03") {
    return `<aside class="icon-navigation"><a class="mark" href="home.html">W</a><nav>${navItems()}</nav><button data-add aria-label="Add links">${icon("plus")}</button></aside>`;
  }
  if (["08", "10"].includes(demo.id)) {
    return `<nav class="dock-navigation" aria-label="Category pages">${navItems()}<button data-add aria-label="Add links">${icon("plus")}</button></nav>`;
  }
  return `<header class="top-navigation"><a class="wordmark" href="home.html">Wanderfile</a><nav>${navItems()}</nav><div><button data-search-button aria-label="Search">${icon("search")}</button><button class="add-button" data-add>${icon("plus")} Add</button></div></header>`;
}

function reviewBar() {
  return `<header class="review-bar"><a href="../../index.html">← All 10</a><div><span>${demo.id} / 10</span><b>${demo.title}</b><small>${category.label} page · ${demo.axis}</small></div><nav><a href="../${previous.id}-${previous.slug}/${category.key}.html" aria-label="Previous system">←</a><a href="../${next.id}-${next.slug}/${category.key}.html" aria-label="Next system">→</a></nav></header>`;
}

function pageHeading(kicker, title, lede, action = "Add links") {
  return `<header class="page-heading"><div><p class="eyebrow">${kicker}</p><h1>${title}</h1><p>${lede}</p></div><button class="primary" data-add>${icon("plus")} ${action}</button></header>`;
}

function searchToolbar(placeholder, options = ["All", "Recent", "Favorites"]) {
  return `<div class="toolbar"><label>${icon("search")}<input data-search placeholder="${placeholder}"></label><div>${options.map((item, index) => `<button class="${index === 0 ? "is-on" : ""}">${item}</button>`).join("")}</div><button data-filter>Filters</button></div>`;
}

function mediaCards(items, kind) {
  return `<div class="media-grid" data-results>${items.map(([title, meta, image], index) => `<article class="media-card" data-title="${title.toLowerCase()}" tabindex="0"><div class="photo ${kind === "movies" ? "is-poster" : ""}" style="background-image:url('${image}')"><span>${kind}</span>${index === 0 ? `<em>Recently saved</em>` : ""}</div><div><h2>${title}</h2><p>${meta}</p><button data-open>Open ${kind === "food" ? "recipe" : kind === "movies" ? "movie" : kind === "travel" ? "place" : "post"} →</button></div></article>`).join("")}</div>`;
}

function homePage() {
  return `${pageHeading("Your library", "Everything you saved, ready when you are.", "Start from a category. Each one now has its own predictable page and URL.")}<section class="home-hero"><div><p class="eyebrow">Continue planning</p><h2>Amalfi Coast</h2><p>12 places · 4 days · updated yesterday</p><a href="travel.html">Open travel page →</a></div></section><section class="portal-grid">${PAGE_CATEGORIES.filter((item) => !["home"].includes(item.key)).map((item, index) => `<a href="${item.key}.html"><span>${item.icon}</span><b>${item.label}</b><small>${item.count} ${index === 4 ? "visits" : "saves"}</small><em>Open page →</em></a>`).join("")}</section><section class="library-panel slim-panel home-recent"><div class="panel-heading"><div><p class="eyebrow">Just saved</p><h2>Recent posts</h2></div><a href="posts.html">See all →</a></div>${mediaCards(content.posts, "posts")}</section>`;
}

function postsPage() {
  return `${pageHeading("All sources", "Posts", "Every social save in one feed. Filter here without changing the other category pages.")}${searchToolbar("Search saved posts", ["All", "Instagram", "TikTok"])}${mediaCards(content.posts, "posts")}`;
}

function travelPage() {
  return `${pageHeading("Your atlas", "Travel", "Saved places, trips, and visit context get a spatial page of their own.", "Add place")}<div class="travel-layout"><section><div class="travel-subnav"><button class="is-on">Places</button><button>Trips</button><button>Map</button></div>${searchToolbar("Search places", ["All", "Want to go", "Visited"])}${mediaCards(content.travel, "travel")}</section><aside class="map-card"><div class="map-lines"></div><i style="--x:27%;--y:34%">1</i><i style="--x:58%;--y:52%">2</i><i style="--x:72%;--y:24%">3</i><span>48 places across 9 countries</span></aside></div>`;
}

function foodPage() {
  return `${pageHeading("Your cookbook", "Food", "Recipes get cooking time, meal context, and actions instead of generic post metadata.", "Add recipe")}<section class="feature-strip"><div style="background-image:url('${images.pasta}')"></div><article><p class="eyebrow">Cook tonight</p><h2>Lemon pasta</h2><p>Seven ingredients · 25 minutes</p><button data-open>Start cooking →</button></article></section>${searchToolbar("Search recipes", ["All", "Under 30 min", "Dinner"])}${mediaCards(content.food, "food")}`;
}

function moviesPage() {
  return `${pageHeading("Your watchlist", "Movies", "A cinematic page foregrounds title, year, genre, and filming destinations.", "Add movie")}<section class="movie-hero" style="background-image:linear-gradient(90deg,rgba(12,16,15,.94),rgba(12,16,15,.16)),url('${images.mountain}')"><p class="eyebrow">Up next</p><h2>The Secret Life<br>of Walter Mitty</h2><p>Iceland · Adventure · 2013</p><button data-open>View details →</button></section>${searchToolbar("Search your watchlist", ["All", "Unwatched", "Watched"])}${mediaCards(content.movies, "movies")}`;
}

function historyPage() {
  const visits = [["Sep 2026", "Sausalito", "California · weekend trip"], ["Jul 2026", "Kyoto", "Japan · 6 days"], ["Apr 2026", "Amalfi Coast", "Italy · 4 days"], ["Dec 2025", "Reykjavík", "Iceland · 5 days"]];
  return `${pageHeading("Where you have been", "History", "Visits and imports live on a stable personal timeline, separate from inspiration.", "Log visit")}<section class="history-stats"><article><b>24</b><span>visits</span></article><article><b>9</b><span>countries</span></article><article><b>16</b><span>cities</span></article></section><div class="history-toolbar"><button data-import>Import Instagram</button><button data-import>Import Timeline</button><button data-filter>Filter visits</button></div><section class="visit-timeline">${visits.map(([date, place, meta]) => `<article><time>${date}</time><i></i><div><h2>${place}</h2><p>${meta}</p></div><button data-open>Open →</button></article>`).join("")}</section>`;
}

function pageContent() {
  if (category.key === "posts") return postsPage();
  if (category.key === "travel") return travelPage();
  if (category.key === "food") return foodPage();
  if (category.key === "movies") return moviesPage();
  if (category.key === "history") return historyPage();
  return homePage();
}

root.innerHTML = `${reviewBar()}<div class="app-shell">${navigation()}<main class="page-content">${demo.id === "06" ? `<button class="command-button" data-search-button>${icon("search")} Jump to a page or search <kbd>⌘ K</kbd></button>` : ""}${demo.id === "09" ? `<div class="crumb"><a href="home.html">Library</a><span>/</span><b>${category.label}</b></div>` : ""}${pageContent()}</main></div><dialog class="command-dialog"><form method="dialog"><label>${icon("search")}<input autofocus placeholder="Search or jump to a page"></label>${PAGE_CATEGORIES.map((item) => `<a href="${item.key}.html"><span>${item.icon}</span>${item.label}<small>${item.count}</small></a>`).join("")}<button>Close</button></form></dialog><div class="toast" role="status" aria-live="polite"></div>`;

function toast(message) {
  const toastElement = document.querySelector(".toast");
  toastElement.textContent = message;
  toastElement.classList.add("is-on");
  window.setTimeout(() => toastElement.classList.remove("is-on"), 2200);
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-add]")) toast(category.key === "history" ? "Log visit opens here" : "Add links opens here");
  if (event.target.closest("[data-open]")) toast("Detail page opens from here");
  if (event.target.closest("[data-filter]")) toast(`Filters stay scoped to ${category.label}`);
  if (event.target.closest("[data-import]")) toast("Import flow opens here");
  if (event.target.closest("[data-search-button]")) document.querySelector(".command-dialog").showModal();
});

document.addEventListener("input", (event) => {
  if (!event.target.matches("[data-search]")) return;
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll("[data-results] .media-card").forEach((card) => { card.hidden = Boolean(query) && !card.dataset.title.includes(query); });
});

window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.querySelector(".command-dialog").showModal();
    return;
  }
  if (event.target.matches("input,textarea")) return;
  if (event.key === "ArrowLeft") location.href = `../${previous.id}-${previous.slug}/${category.key}.html`;
  if (event.key === "ArrowRight") location.href = `../${next.id}-${next.slug}/${category.key}.html`;
});
