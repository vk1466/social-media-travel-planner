import { dashboardDemoFromDocument, DASHBOARD_DEMOS } from "./options.js";

const demo = dashboardDemoFromDocument();
const root = document.querySelector("#dashboard-demo");
const demoIndex = DASHBOARD_DEMOS.indexOf(demo);
const previousDemo = DASHBOARD_DEMOS[(demoIndex - 1 + DASHBOARD_DEMOS.length) % DASHBOARD_DEMOS.length];
const nextDemo = DASHBOARD_DEMOS[(demoIndex + 1) % DASHBOARD_DEMOS.length];

const library = [
  { type: "travel", title: "Sausalito morning", meta: "California · 8 places", image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1000&h=760&fit=crop&auto=format&q=82" },
  { type: "food", title: "Lemon pasta", meta: "25 min · saved today", image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900&h=900&fit=crop&auto=format&q=82" },
  { type: "movies", title: "The Secret Life of Walter Mitty", meta: "Watchlist · Iceland", image: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=900&h=1100&fit=crop&auto=format&q=82" },
  { type: "posts", title: "A hidden Kyoto walk", meta: "Instagram · yesterday", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1000&h=760&fit=crop&auto=format&q=82" },
  { type: "travel", title: "Amalfi coast", meta: "Italy · 12 places", image: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1000&h=760&fit=crop&auto=format&q=82" },
  { type: "food", title: "Tomato toast", meta: "15 min · brunch", image: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=900&h=900&fit=crop&auto=format&q=82" },
];

const categories = [
  { key: "posts", label: "Posts", count: 126, note: "Every save", icon: "▦" },
  { key: "travel", label: "Travel", count: 48, note: "Places + trips", icon: "⌖" },
  { key: "food", label: "Food", count: 31, note: "Your cookbook", icon: "◒" },
  { key: "movies", label: "Movies", count: 17, note: "Your watchlist", icon: "▶" },
];

function icons(name) {
  const path = {
    home: '<path d="m4 11 8-7 8 7v9H5v-9Z"/><path d="M9 20v-6h6v6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${path[name]}</svg>`;
}

function categoryTabs(className = "category-tabs") {
  return `<div class="${className}" role="tablist" aria-label="Library type">${categories.map((category) => `<button type="button" role="tab" data-category="${category.key}" aria-selected="${category.key === "posts"}"><span class="category-icon">${category.icon}</span><span><b>${category.label}</b><small>${category.count} · ${category.note}</small></span></button>`).join("")}</div>`;
}

function card(item, compact = false) {
  return `<article class="content-card${compact ? " is-compact" : ""}" data-kind="${item.type}" tabindex="0"><div class="content-photo" style="background-image:url('${item.image}')"><span>${item.type}</span></div><div class="content-copy"><h3>${item.title}</h3><p>${item.meta}</p><button type="button" data-open>Open <span>→</span></button></div></article>`;
}

function cards(items = library, compact = false) {
  return `<div class="content-grid" data-results>${items.map((item) => card(item, compact)).join("")}</div>`;
}

function toolbar() {
  return `<div class="content-toolbar"><label>${icons("search")}<input type="search" data-search placeholder="Search this view" aria-label="Search this view"></label><div class="view-toggle" role="group" aria-label="Layout"><button class="is-on" data-view="grid" aria-label="Grid view">${icons("grid")}</button><button data-view="list" aria-label="List view">${icons("list")}</button></div><button class="filter-button" type="button" data-filter>Filter <span>2</span></button></div>`;
}

function pageHeader(title = demo.title, lede = demo.blurb) {
  return `<header class="page-heading"><div><p class="eyebrow">Your library</p><h1>${title}</h1><p>${lede}</p></div><button class="primary-action" type="button" data-add>${icons("plus")} Add links</button></header>`;
}

function standardContent() {
  return `${pageHeader()}${categoryTabs()}<section class="library-panel"><div class="panel-heading"><div><p class="eyebrow">All saves</p><h2>Recently added</h2></div><a href="#all">View all 126 →</a></div>${toolbar()}${cards()}</section>`;
}

function todayContent() {
  return `${pageHeader("Good morning, Vipul", "Pick up where you left off or open a shelf.")}<section class="today-grid"><article class="continue-card"><p class="eyebrow">Continue planning</p><h2>Long weekend in Sausalito</h2><p>8 places · 3 days · updated yesterday</p><div class="progress"><i></i></div><button data-open>Open trip →</button></article><div class="today-stats"><article><b>6</b><span>new saves this week</span></article><article><b>3</b><span>places to review</span></article><article><b>12</b><span>visited this year</span></article></div></section>${categoryTabs("category-tabs compact-tabs")}<section class="library-panel"><div class="panel-heading"><div><p class="eyebrow">Fresh finds</p><h2>Saved recently</h2></div><a href="#all">See everything →</a></div>${cards(library.slice(0, 4), true)}</section>`;
}

function railContent() {
  return `<div class="rail-layout"><aside class="app-rail"><a class="rail-brand" href="../index.html">W</a><p>Library</p>${categories.map((category) => `<button data-category="${category.key}" class="${category.key === "posts" ? "is-on" : ""}"><span>${category.icon}</span>${category.label}<b>${category.count}</b></button>`).join("")}<p>Personal</p><button><span>◷</span>History</button><button><span>♙</span>Profile</button></aside><main class="rail-main">${pageHeader("All saves", "Everything you kept, organized into familiar views.")}${toolbar()}${cards()}</main></div>`;
}

function bentoContent() {
  return `${pageHeader("Your collections", "A quick read on everything you have saved.")}<section class="bento-board"><article class="bento-feature" style="background-image:linear-gradient(90deg,rgba(17,24,21,.82),rgba(17,24,21,.1)),url('${library[0].image}')"><p class="eyebrow">Travel</p><h2>48 places<br>worth a detour.</h2><button data-category="travel">Open atlas →</button></article>${categories.slice(1).map((category) => `<button class="bento-stat" data-category="${category.key}"><span>${category.icon}</span><b>${category.count}</b><strong>${category.label}</strong><small>${category.note}</small></button>`).join("")}<article class="bento-recent"><p class="eyebrow">Just saved</p><h2>${library[1].title}</h2><p>${library[1].meta}</p><button data-open>Open recipe →</button></article></section><section class="library-panel slim-panel"><div class="panel-heading"><h2>Recent across every shelf</h2><a href="#all">View all →</a></div>${cards(library.slice(3, 6), true)}</section>`;
}

function searchContent() {
  return `<section class="search-hero"><a href="../index.html" class="mini-brand">Wanderfile</a><p class="eyebrow">Search your world</p><h1>What are you looking for?</h1><label class="global-search">${icons("search")}<input autofocus data-search placeholder="Try ‘Italy’, ‘pasta’, or ‘Iceland’" aria-label="Search all saved content"><kbd>⌘ K</kbd></label>${categoryTabs("search-scopes")}</section><section class="search-results"><div class="panel-heading"><div><p class="eyebrow">Suggested</p><h2>Pick up where you left off</h2></div><button class="primary-action" data-add>${icons("plus")} Add links</button></div>${cards(library.slice(0, 4), true)}</section>`;
}

function streamContent() {
  const events = [
    ["Today", "Saved a recipe", library[1]], ["Yesterday", "Added a place", library[0]],
    ["Monday", "Added to watchlist", library[2]], ["Sep 2", "Saved a post", library[3]],
    ["Aug 28", "Visited", library[4]],
  ];
  return `${pageHeader("Your recent activity", "One continuous story across every collection.")}${categoryTabs("category-tabs compact-tabs")}<section class="stream">${events.map(([date, action, item]) => `<article class="stream-row" data-kind="${item.type}"><time>${date}</time><i></i><div class="stream-image" style="background-image:url('${item.image}')"></div><div><span>${action}</span><h2>${item.title}</h2><p>${item.meta}</p></div><button data-open aria-label="Open ${item.title}">→</button></article>`).join("")}</section>`;
}

function splitContent() {
  return `<div class="split-layout"><section class="split-list">${pageHeader("Travel", "Scan on the left. Keep context on the right.")}${categoryTabs("split-tabs")}${toolbar()}<div class="split-rows">${library.map((item, index) => `<button data-preview="${index}" class="${index === 0 ? "is-on" : ""}"><span class="row-thumb" style="background-image:url('${item.image}')"></span><span><b>${item.title}</b><small>${item.meta}</small></span><em>${item.type}</em></button>`).join("")}</div></section><aside class="preview-pane"><div class="preview-photo" data-preview-photo style="background-image:url('${library[0].image}')"></div><p class="eyebrow" data-preview-type>${library[0].type}</p><h2 data-preview-title>${library[0].title}</h2><p data-preview-meta>${library[0].meta}</p><div class="preview-actions"><button class="primary-action" data-open>Open details</button><button data-add>+ Add to trip</button></div><dl><div><dt>Saved from</dt><dd>Instagram</dd></div><div><dt>Status</dt><dd>Inspiration</dd></div></dl></aside></div>`;
}

function shelvesContent() {
  const shelf = (category, offset) => `<section class="media-shelf"><div class="panel-heading"><div><p class="eyebrow">${category.note}</p><h2>${category.label}</h2></div><button data-category="${category.key}">See all ${category.count} →</button></div><div class="shelf-row">${[0,1,2,3].map((step) => card(library[(offset + step) % library.length], true)).join("")}</div></section>`;
  return `${pageHeader("Saved for later", "Browse your library the way you browse ideas: visually.")}${categoryTabs("category-tabs compact-tabs")}${shelf(categories[1],0)}${shelf(categories[2],1)}${shelf(categories[3],2)}`;
}

function indexContent() {
  return `${pageHeader("Library index", "A compact view for finding and organizing a large collection.")}${categoryTabs("category-tabs compact-tabs")}${toolbar()}<section class="index-table"><div class="index-head"><span>Title</span><span>Type</span><span>Source</span><span>Saved</span><span>Status</span><span></span></div>${[...library, ...library.slice(0,3)].map((item, index) => `<button class="index-row" data-open><span><i style="background-image:url('${item.image}')"></i><b>${item.title}</b></span><span><em>${item.type}</em></span><span>${index % 2 ? "Instagram" : "TikTok"}</span><span>${index < 2 ? "Today" : index < 5 ? "This week" : "Aug 2026"}</span><span>● Saved</span><span>•••</span></button>`).join("")}</section>`;
}

function mobileContent() {
  return `<div class="phone-frame"><header class="phone-head"><a href="../index.html" class="mini-brand">W</a><button aria-label="Profile">VP</button></header><main>${pageHeader("For your next adventure", "Recent ideas from every shelf.")}<label class="phone-search">${icons("search")}<input data-search placeholder="Search everything"></label><section class="phone-feature" style="background-image:linear-gradient(0deg,rgba(10,17,14,.82),transparent),url('${library[4].image}')"><span>Continue planning</span><h2>Amalfi coast</h2><p>12 places · 4 days</p></section><div class="phone-shortcuts">${categories.map((category) => `<button data-category="${category.key}"><span>${category.icon}</span><b>${category.label}</b><small>${category.count}</small></button>`).join("")}</div><div class="panel-heading"><h2>Recently saved</h2><a href="#all">See all</a></div>${cards(library.slice(0,3), true)}</main><nav class="phone-dock"><button class="is-on">${icons("home")}<span>Home</span></button><button>${icons("grid")}<span>Library</span></button><button class="dock-add" data-add>${icons("plus")}</button><button>${icons("clock")}<span>History</span></button><button>${icons("search")}<span>Search</span></button></nav></div>`;
}

function demoBody() {
  if (demo.id === "02") return todayContent();
  if (demo.id === "03") return railContent();
  if (demo.id === "04") return bentoContent();
  if (demo.id === "05") return searchContent();
  if (demo.id === "06") return streamContent();
  if (demo.id === "07") return splitContent();
  if (demo.id === "08") return shelvesContent();
  if (demo.id === "09") return indexContent();
  if (demo.id === "10") return mobileContent();
  return standardContent();
}

root.innerHTML = `<div class="demo-progress" style="--progress:${Number(demo.id) * 10}%"></div><header class="review-bar"><a href="../index.html">← All 10</a><div><span>${demo.id} / 10</span><b>${demo.title}</b><small>${demo.axis}</small></div><nav><a href="${previousDemo.id}-${previousDemo.slug}.html" aria-label="Previous dashboard">←</a><a href="${nextDemo.id}-${nextDemo.slug}.html" aria-label="Next dashboard">→</a></nav></header><div class="demo-canvas">${demoBody()}</div><div class="toast" role="status" aria-live="polite"></div>`;

function toast(message) {
  const element = document.querySelector(".toast");
  element.textContent = message;
  element.classList.add("is-on");
  window.setTimeout(() => element.classList.remove("is-on"), 2200);
}

function activateCategory(key) {
  document.querySelectorAll("[data-category]").forEach((button) => {
    const active = button.dataset.category === key;
    button.classList.toggle("is-on", active);
    if (button.getAttribute("role") === "tab") button.setAttribute("aria-selected", String(active));
  });
  document.querySelectorAll("[data-results] .content-card").forEach((cardElement) => {
    cardElement.hidden = key !== "posts" && cardElement.dataset.kind !== key;
  });
  toast(`${categories.find((category) => category.key === key)?.label || "Library"} view opened`);
}

document.addEventListener("click", (event) => {
  const category = event.target.closest("[data-category]");
  if (category) activateCategory(category.dataset.category);
  const view = event.target.closest("[data-view]");
  if (view) {
    document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-on", button === view));
    document.querySelector("[data-results]")?.classList.toggle("is-list", view.dataset.view === "list");
  }
  if (event.target.closest("[data-add]")) toast("Add links opens here");
  if (event.target.closest("[data-filter]")) toast("Filters would open in a compact drawer");
  if (event.target.closest("[data-open]")) toast("Detail preview opened");
  const preview = event.target.closest("[data-preview]");
  if (preview) {
    const item = library[Number(preview.dataset.preview)];
    document.querySelectorAll("[data-preview]").forEach((row) => row.classList.toggle("is-on", row === preview));
    document.querySelector("[data-preview-photo]").style.backgroundImage = `url('${item.image}')`;
    document.querySelector("[data-preview-type]").textContent = item.type;
    document.querySelector("[data-preview-title]").textContent = item.title;
    document.querySelector("[data-preview-meta]").textContent = item.meta;
  }
});

document.addEventListener("input", (event) => {
  if (!event.target.matches("[data-search]")) return;
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll(".content-card").forEach((cardElement) => {
    cardElement.hidden = Boolean(query) && !cardElement.textContent.toLowerCase().includes(query);
  });
});

window.addEventListener("keydown", (event) => {
  if (event.target.matches("input,textarea")) return;
  if (event.key === "ArrowLeft") location.href = `${previousDemo.id}-${previousDemo.slug}.html`;
  if (event.key === "ArrowRight") location.href = `${nextDemo.id}-${nextDemo.slug}.html`;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.querySelector("[data-search]")?.focus();
  }
});
