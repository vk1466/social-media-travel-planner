const concepts = [
  { id: "01", slug: "quiet-luxury", name: "Quiet luxury", note: "Photography, restraint, and a gallery-like detail view.", location: "Amalfi Coast · Italy", category: "Coast", stat: "6 saved places", image: "amalfi" },
  { id: "02", slug: "map-sheet", name: "Map sheet", note: "A familiar map-first card that grows into a spatial workspace.", location: "Dolomites · Italy", category: "Trail", stat: "3.8 km route", image: "dolomites" },
  { id: "03", slug: "field-notes", name: "Field notes", note: "A compact, editorial field guide made for useful details.", location: "Amalfi Coast · Italy", category: "Village", stat: "4 creator tips", image: "amalfi" },
  { id: "04", slug: "route-stop", name: "Route stop", note: "Itinerary context makes the place immediately actionable.", location: "Dolomites · Italy", category: "Day 03", stat: "9:30 AM", image: "dolomites" },
  { id: "05", slug: "soft-bento", name: "Soft bento", note: "Key facts become glanceable modules with calm visual rhythm.", location: "Amalfi Coast · Italy", category: "Scenic", stat: "8 saved posts", image: "amalfi" },
  { id: "06", slug: "native-sheet", name: "Native sheet", note: "Mobile-native actions and progressive disclosure over a map.", location: "Dolomites · Italy", category: "Lake", stat: "Open year-round", image: "dolomites" },
  { id: "07", slug: "postcard", name: "Postcard", note: "A tactile travel keepsake with a warm, personal detail page.", location: "Amalfi Coast · Italy", category: "Favorite", stat: "Visited Jun 2026", image: "amalfi" },
  { id: "08", slug: "precision", name: "Precision", note: "Dense, clean, and built for scanning a large place library.", location: "Dolomites · Italy", category: "Hike", stat: "Moderate · 2h", image: "dolomites" },
  { id: "09", slug: "social-proof", name: "Source story", note: "The people and posts behind a save become first-class context.", location: "Amalfi Coast · Italy", category: "From 8 saves", stat: "92% recommend", image: "amalfi" },
  { id: "10", slug: "night-atlas", name: "Night atlas", note: "A cinematic dark mode with bright, restrained wayfinding.", location: "Dolomites · Italy", category: "Alpine", stat: "46.538° N", image: "dolomites" },
  { id: "11", slug: "portrait-cover", name: "Portrait cover", note: "A tall, image-led save that reads like a travel magazine cover.", location: "Amalfi Coast · Italy", category: "Trail edit", stat: "6 saved places", image: "amalfi", format: "portrait" },
  { id: "12", slug: "portrait-guide", name: "Pocket guide", note: "Portrait proportions with practical trip signals layered into the image.", location: "Dolomites · Italy", category: "Field guide", stat: "Moderate · 2h", image: "dolomites", format: "portrait" },
  { id: "13", slug: "portrait-ticket", name: "Journey ticket", note: "A vertical keepsake that blends itinerary utility with ticket details.", location: "Amalfi Coast · Italy", category: "Day 04", stat: "07:30 departure", image: "amalfi", format: "portrait" },
  { id: "14", slug: "portrait-night", name: "Night portrait", note: "A dark, cinematic portrait card for atmospheric saved places.", location: "Dolomites · Italy", category: "Alpine", stat: "1,925 m", image: "dolomites", format: "portrait" },
];

const places = {
  amalfi: {
    name: "Path of the Gods",
    location: "Agerola, Campania, Italy",
    coordinates: "40.626° N · 14.545° E",
    bestTime: "7–11 AM",
    effort: "Moderate",
    season: "Apr–Oct",
    savedFrom: "6 posts",
    overview: "A high coastal path between Bomerano and Nocelle, with open views across terraced hillsides to Positano and Capri. Starting early keeps the exposed sections cooler and quieter.",
    tip: "Walk from Bomerano toward Nocelle for the best unfolding views. Bring water, sun protection, and shoes with reliable grip.",
    routeLabel: "Bomerano to Nocelle",
    routeSummary: "7.8 km · 3–4 hours",
    socialProof: "8 saves mention the trail; 6 recommend starting from Bomerano before 8 AM.",
    journal: "The terraces were still in shadow when we started, then Positano appeared around the ridge. Go early and take your time.",
  },
  dolomites: {
    name: "Lago di Sorapis",
    location: "Cortina d'Ampezzo, Veneto, Italy",
    coordinates: "46.538° N · 12.222° E",
    bestTime: "7–10 AM",
    effort: "Moderate",
    season: "Jun–Oct",
    savedFrom: "8 posts",
    overview: "A clear alpine lake beneath the Sorapis group, reached by a narrow balcony trail through larch forest. The color is most vivid before midday.",
    tip: "Take the first bus and bring cash for the rifugio. The exposed middle section has fixed cables.",
    routeLabel: "Trailhead to lake",
    routeSummary: "3.8 km · 1 hr 45 min",
    socialProof: "8 saves mention the lake; 6 recommend arriving before 9 AM.",
    journal: "The water was completely still before the first hikers arrived. Pack breakfast and take the early trail.",
  },
};

const grid = document.querySelector("#demo-grid");
const modalRoot = document.querySelector("#modal-root");
const toast = document.querySelector("#toast");
let previousFocus = null;
let toastTimer = null;

function icon(name, size = 16) {
  return `<i data-lucide="${name}" width="${size}" height="${size}" aria-hidden="true"></i>`;
}

function cardMarkup(concept) {
  const cardVariant = {
    "route-stop": `<div class="route-time"><b>09:30</b><span>Day three</span></div>`,
    precision: `<div class="precision-index">IT · 014</div>`,
    "social-proof": `<div class="avatar-stack"><span>AV</span><span>MK</span><span>+6</span></div>`,
    postcard: `<span class="postmark">VISITED<br>06·26</span>`,
    "portrait-cover": `<span class="portrait-kicker">The Italy edit · 01</span>`,
    "portrait-guide": `<div class="portrait-signal"><span>${icon("sun", 14)} 14°</span><span>${icon("mountain-snow", 14)} 1,925 m</span></div>`,
    "portrait-ticket": `<span class="ticket-code">BOM → NOC<br><b>07:30</b></span>`,
    "portrait-night": `<div class="portrait-compass">${icon("compass", 17)}<span>46.538° N</span></div>`,
  }[concept.slug] || "";

  return `
    <article class="demo concept-${concept.slug}${concept.format ? ` format-${concept.format}` : ""}">
      <header class="demo-label"><span>${concept.id}</span><div><h3>${concept.name}</h3><p>${concept.note}</p></div></header>
      <button class="travel-card" type="button" data-open="${concept.id}" aria-label="Open ${concept.name} details">
        <div class="card-media media-${concept.image}">
          <span class="card-category">${concept.category}</span>
          <span class="save-mark" title="Saved">${icon("bookmark", 17)}</span>
          ${cardVariant}
        </div>
        <div class="card-copy">
          <p class="card-location">${icon("map-pin", 13)} ${concept.location}</p>
          <h4>${concept.image === "amalfi" ? "Path of the Gods" : "Lago di Sorapis"}</h4>
          <div class="card-foot"><span>${concept.stat}</span><span class="open-mark">View ${icon("arrow-up-right", 14)}</span></div>
        </div>
      </button>
    </article>`;
}

function detailSections(concept) {
  const place = places[concept.image];
  const route = concept.slug === "route-stop" ? `<section class="route-line"><span class="route-node is-done"></span><div><small>08:00 · Start</small><b>Cortina d'Ampezzo</b></div><span class="route-node is-current"></span><div><small>09:30 · Current stop</small><b>Lago di Sorapis</b></div><span class="route-node"></span><div><small>13:00 · Next</small><b>Rifugio Vandelli</b></div></section>` : "";
  const sources = concept.slug === "social-proof" ? `<section class="source-feature"><div class="avatar-stack"><span>AV</span><span>MK</span><span>JL</span></div><div><b>Loved by your travel circle</b><p>${place.socialProof}</p></div></section>` : "";
  const journal = concept.slug === "postcard" ? `<blockquote>“${place.journal}”</blockquote>` : "";

  return `${route}${sources}${journal}
    <section class="facts-grid" aria-label="Key facts">
      <div><i data-lucide="clock"></i><span>Best time</span><b>${place.bestTime}</b></div>
      <div><i data-lucide="footprints"></i><span>Effort</span><b>${place.effort}</b></div>
      <div><i data-lucide="calendar-days"></i><span>Season</span><b>${place.season}</b></div>
      <div><i data-lucide="bookmark"></i><span>Saved from</span><b>${place.savedFrom}</b></div>
    </section>
    <section class="detail-copy-section"><div class="section-title"><h3>Why it’s saved</h3><span>Overview</span></div><p>${place.overview}</p></section>
    <section class="tip-box"><i data-lucide="lightbulb"></i><div><small>Creator tip</small><p>${place.tip}</p></div></section>
    <section class="source-row"><div><span class="source-thumb source-one"></span><span class="source-thumb source-two"></span><span class="source-thumb source-three"></span></div><p><b>Saved from ${place.savedFrom}</b><br><span>Instagram · TikTok · Maps</span></p><button type="button" data-action="sources" aria-label="View sources">${icon("chevron-right")}</button></section>`;
}

function modalMarkup(concept) {
  const place = places[concept.image];
  return `<div class="modal-backdrop concept-${concept.slug}">
    <article class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1">
      <div class="detail-media media-${concept.image}">
        <button class="icon-btn modal-close" type="button" data-close="true" aria-label="Close">${icon("x", 19)}</button>
        <button class="icon-btn modal-save" type="button" data-action="save" aria-label="Remove from saved places" aria-pressed="true">${icon("bookmark-check", 18)}</button>
        <div class="media-caption"><span>${concept.category}</span><p>${place.coordinates}</p></div>
      </div>
      <div class="detail-body">
        <header class="detail-title-row"><div><p class="detail-location">${icon("map-pin", 14)} ${place.location}</p><h2 id="modal-title">${place.name}</h2></div><span class="visited-pill">${icon("check", 13)} Visited</span></header>
        <nav class="quick-actions" aria-label="Place actions">
          <button type="button" data-action="directions">${icon("navigation", 17)}<span>Directions</span></button>
          <button type="button" data-action="trip">${icon("calendar-plus", 17)}<span>Add to trip</span></button>
          <button type="button" data-action="share">${icon("share-2", 17)}<span>Share</span></button>
        </nav>
        ${detailSections(concept)}
      </div>
      <div class="detail-map" aria-label="Map preview"><button class="icon-btn map-close" type="button" data-close="true" aria-label="Close">${icon("x", 19)}</button><span class="map-road road-a"></span><span class="map-road road-b"></span><span class="map-water"></span><span class="map-pin">${icon("map-pin", 18)}</span><div><small>${place.routeLabel}</small><b>${place.routeSummary}</b></div></div>
    </article>
  </div>`;
}

function openModal(id) {
  const concept = concepts.find((item) => item.id === id);
  if (!concept) return;
  previousFocus = document.activeElement;
  modalRoot.innerHTML = modalMarkup(concept);
  modalRoot.hidden = false;
  document.body.classList.add("modal-open");
  lucide.createIcons();
  modalRoot.querySelector(".detail-modal")?.focus();
}

function closeModal() {
  modalRoot.hidden = true;
  modalRoot.innerHTML = "";
  document.body.classList.remove("modal-open");
  previousFocus?.focus();
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function handleModalAction(button) {
  const action = button.dataset.action;
  if (action === "save") {
    const isSaved = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!isSaved));
    button.setAttribute("aria-label", isSaved ? "Save place" : "Remove from saved places");
    button.innerHTML = icon(isSaved ? "bookmark" : "bookmark-check", 18);
    lucide.createIcons();
    showToast(isSaved ? "Removed from saved places" : "Saved to your places");
    return;
  }

  const messages = {
    directions: "Directions preview opened",
    trip: "Added to your Italy trip",
    share: "Share link ready",
    sources: "Source posts preview opened",
  };
  if (messages[action]) showToast(messages[action]);
}

grid.innerHTML = concepts.map(cardMarkup).join("");
lucide.createIcons();

const initialConcept = new URLSearchParams(window.location.search).get("open");
if (initialConcept && concepts.some((concept) => concept.id === initialConcept.padStart(2, "0"))) {
  openModal(initialConcept.padStart(2, "0"));
}

grid.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-open]");
  if (opener) openModal(opener.dataset.open);
});

modalRoot.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (action) handleModalAction(action);
  if (event.target.closest("[data-close]") || event.target === event.currentTarget.firstElementChild) closeModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modalRoot.hidden) closeModal();
  if (event.key !== "Tab" || modalRoot.hidden) return;
  const focusable = [...modalRoot.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])")];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
