import { loadLibrary, loadPlacesLibrary } from "../../sites/shared/api.js";
import { mountLibraryShell } from "../../sites/04-volume/library-shell.js";
import { demoFromDocument, TRAVEL_DEMOS } from "./options.js";

const demo = demoFromDocument();
const mock = window.WF_MOCK;
const app = document.querySelector("#travel-demo");
const demoIndex = TRAVEL_DEMOS.indexOf(demo);
const previousDemo = TRAVEL_DEMOS[(demoIndex - 1 + TRAVEL_DEMOS.length) % TRAVEL_DEMOS.length];
const nextDemo = TRAVEL_DEMOS[(demoIndex + 1) % TRAVEL_DEMOS.length];

function icon(name) {
  const paths = {
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15 9-2 4-4 2 2-4 4-2Z"/>',
    pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/>',
    bookmark: '<path d="M6 3h12v18l-6-4-6 4V3Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    upload: '<path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
}

function tabButton(key, label, meta, iconName) {
  return `<button class="travel-tab" type="button" role="tab" data-travel-tab="${key}">
    <span class="travel-tab-icon">${icon(iconName)}</span>
    <span><strong>${label}</strong><small>${meta}</small></span>
  </button>`;
}

function visitRows() {
  const visits = mock.visits || [];
  return visits.slice(0, 6).map((visit) => {
    const place = mock.placeById(visit.placeId);
    return `<article class="visit-row">
      <span class="visit-dot"></span>
      <div><time>${visit.when || visit.date || visit.visitedAt || "Past trip"}</time><h3>${place?.name || visit.placeName || "Saved place"}</h3>
      <p>${place ? `${place.region} · ${place.country}` : "Personal visit"}${visit.note ? ` · ${visit.note}` : ""}</p></div>
      ${place ? `<a href="../../sites/02-almanac/place.html?id=${encodeURIComponent(place.id)}">Open</a>` : ""}
    </article>`;
  }).join("");
}

function historyPanel() {
  return `<section class="history-demo" data-travel-panel="history" hidden>
    <header class="history-head">
      <div><p class="eyebrow">Where you have been</p><h2>Travel history</h2><p>Manual logs, Instagram imports, and Google Maps Timeline in one place.</p></div>
      <div class="history-metrics"><span><b>${mock.visits.length}</b> visits</span><span><b>${mock.places.filter((p) => p.visited).length}</b> places</span><span><b>${new Set(mock.places.filter((p) => p.visited).map((p) => p.country)).size}</b> countries</span></div>
    </header>
    <div class="history-actions-grid">
      <button type="button" class="action-card primary" data-open-visit>${icon("plus")}<span><b>Log a visit</b><small>Add dates, destination, and notes</small></span></button>
      <button type="button" class="action-card" data-instagram>${icon("upload")}<span><b>Import Instagram</b><small>Turn public posts into visits</small></span></button>
      <label class="action-card">${icon("upload")}<span><b>Import Timeline</b><small>Google Maps JSON or Takeout ZIP</small></span><input type="file" accept=".json,.zip" data-timeline /></label>
    </div>
    <div class="review-card"><span class="review-badge">2 to review</span><div><b>Timeline found possible travel stops</b><p>Keep or discard ambiguous places before they join your history.</p></div><button type="button" data-review>Review</button></div>
    <div class="visit-list-head"><div><p class="eyebrow">Your visits</p><h2>Recent journeys</h2></div><div class="visit-filters"><button class="is-on">All</button><button>City</button><button>Outdoors</button><button>Food</button></div></div>
    <div class="visit-list">${visitRows()}</div>
    <div class="history-reset"><span>Reset history</span><button type="button" data-reset>Clear Timeline visits</button><button type="button" data-reset>Clear all</button></div>
  </section>`;
}

function dialogMarkup() {
  const options = mock.places.map((p) => `<option value="${p.name}">${p.name}, ${p.country}</option>`).join("");
  return `<dialog class="visit-dialog" data-visit-dialog>
    <form method="dialog"><button class="dialog-close" aria-label="Close">×</button><p class="eyebrow">Travel history</p><h2>Log a visit</h2>
    <label>Destination<input list="travel-places" required placeholder="Search your atlas or type a place" /></label><datalist id="travel-places">${options}</datalist>
    <div class="date-pair"><label>From<input type="date" /></label><label>To<input type="date" /></label></div>
    <label>Notes<textarea rows="3" placeholder="What should you remember?"></textarea></label>
    <button class="save-visit" value="save">Save visit</button></form>
  </dialog>`;
}

function renderChrome(placeCount, postCount, visitCount) {
  app.innerHTML = `<div class="demo-progress" style="--progress:${Number(demo.id) * 10}%"></div>
    <header class="travel-topbar">
      <a class="travel-brand" href="../index.html"><span>W</span>Wanderfile</a>
      <nav aria-label="Product"><a href="../../sites/04-volume/index.html">Home</a><a class="is-on" href="#library">Travel</a><a href="../../sites/04-volume/add.html">Add</a></nav>
      <a class="avatar" href="../../sites/04-volume/index.html" aria-label="Account">VP</a>
    </header>
    <aside class="demo-rail">
      <a href="../index.html">All 10</a><span>${demo.id} / 10</span><strong>${demo.title}</strong><small>${demo.axis}</small>
      <div><a href="${previousDemo.id}-${previousDemo.slug}.html" aria-label="Previous design">←</a><a href="${nextDemo.id}-${nextDemo.slug}.html" aria-label="Next design">→</a></div>
    </aside>
    <main>
      <section class="travel-hero">
        <div class="hero-copy"><p class="eyebrow">Your travel world</p><h1>${demo.title}</h1><p>${demo.blurb}</p>
          <div class="hero-actions"><button type="button" data-jump="places">Explore places</button><button type="button" data-open-visit>Log a visit</button></div>
        </div>
        <div class="hero-photo"><span>Amalfi Coast · Italy</span></div>
        <div class="hero-stats"><article><b>${placeCount}</b><span>saved places</span></article><article><b>${postCount}</b><span>travel saves</span></article><article><b>${visitCount}</b><span>visited</span></article></div>
      </section>
      <section class="travel-workspace" id="library">
        <div class="travel-tabs" role="tablist" aria-label="Travel library">
          ${tabButton("places", "Places", `${placeCount} in your atlas`, "pin")}
          ${tabButton("posts", "Related posts", `${postCount} saved inspirations`, "bookmark")}
          ${tabButton("history", "History", `${visitCount} logged visits`, "clock")}
        </div>
        <div class="quick-row"><button type="button" data-open-visit>${icon("plus")} Log visit</button><a href="../../sites/04-volume/add.html">${icon("bookmark")} Add inspiration</a><button type="button" data-focus-search>${icon("search")} Search atlas</button></div>
        <div class="library-panel" data-travel-panel="library"><div id="travel-library"></div></div>
        ${historyPanel()}
      </section>
    </main>
    <nav class="mobile-dock" aria-label="Travel shortcuts"><button data-jump="places">${icon("pin")}<span>Places</span></button><button data-jump="posts">${icon("bookmark")}<span>Saves</span></button><button data-open-visit>${icon("plus")}<span>Log</span></button><button data-jump="history">${icon("clock")}<span>History</span></button></nav>
    ${dialogMarkup()}
    <div class="toast" role="status" aria-live="polite"></div>`;
}

function showToast(message) {
  const toast = document.querySelector(".toast");
  toast.textContent = message;
  toast.classList.add("is-on");
  window.setTimeout(() => toast.classList.remove("is-on"), 2600);
}

async function init() {
  const [postsLibrary, placesLibrary] = await Promise.all([loadLibrary(mock), loadPlacesLibrary(mock)]);
  const visitCount = placesLibrary.places.filter((place) => place.visited).length;
  renderChrome(placesLibrary.places.length, postsLibrary.posts.length, visitCount);

  const shell = mountLibraryShell(document.querySelector("#travel-library"), {
    places: placesLibrary.places,
    posts: postsLibrary.posts.map((post) => ({ ...post, postUrl: null })),
    placesAuth: placesLibrary,
    postsAuth: postsLibrary,
  });

  function openTab(key) {
    document.querySelectorAll("[data-travel-tab]").forEach((el) => {
      const active = el.dataset.travelTab === key;
      el.classList.toggle("is-on", active);
      el.setAttribute("aria-selected", String(active));
    });
    const history = document.querySelector('[data-travel-panel="history"]');
    const library = document.querySelector('[data-travel-panel="library"]');
    history.hidden = key !== "history";
    library.hidden = key === "history";
    if (key !== "history") shell.open(key);
    history.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-travel-tab]");
    if (tab) openTab(tab.dataset.travelTab);
    const jump = event.target.closest("[data-jump]");
    if (jump) openTab(jump.dataset.jump);
    if (event.target.closest("[data-open-visit]")) document.querySelector("[data-visit-dialog]").showModal();
    if (event.target.closest("[data-instagram]")) showToast("Instagram import preview started");
    if (event.target.closest("[data-review]")) showToast("Review queue opened — keep or discard each stop");
    if (event.target.closest("[data-reset]")) showToast("Reset is confirmation-protected in the live app");
    if (event.target.closest("[data-focus-search]")) {
      openTab("places");
      window.setTimeout(() => document.querySelector(".vol-shell-search input")?.focus(), 80);
    }
  });
  document.querySelector("[data-timeline]")?.addEventListener("change", () => showToast("Timeline file ready to import"));
  document.querySelector("[data-visit-dialog]")?.addEventListener("close", (event) => {
    if (event.target.returnValue === "save") showToast("Visit saved in this prototype");
  });
  window.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea")) return;
    if (event.key === "ArrowLeft") location.href = `${previousDemo.id}-${previousDemo.slug}.html`;
    if (event.key === "ArrowRight") location.href = `${nextDemo.id}-${nextDemo.slug}.html`;
  });
  openTab("places");
}

init().catch((error) => {
  console.error(error);
  app.innerHTML = `<p class="fatal">Could not mount this demo.</p>`;
});
