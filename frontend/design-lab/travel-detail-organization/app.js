const place = {
  name: "Hierve el Agua",
  region: "San Lorenzo Albarradas · Oaxaca, Mexico",
  type: "Natural landmark",
  rating: "4.7 · 2,814 reviews",
  price: "MX$50 entry",
  hours: "08:00–18:00",
  best: "Before 10:00",
  season: "Nov–Apr",
  drive: "1 h 45 from Oaxaca City",
  summary: "Mineral springs spill over a mountain edge, forming two pale travertine shelves above a wide valley.",
  highlights: ["Infinity-edge pools", "Lower cascade ridge walk", "Local food stalls"],
  guide: "Pair the pools with Mitla on the return. Leave before dusk—the mountain road is slower after dark.",
  tip: "Bring cash, water, a towel, and shoes with grip. The upper pool is shallow.",
  sources: ["@roamwithnina · Reel", "Oaxaca tourism board", "18 Wanderfile saves"],
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Hierve+el+Agua+Oaxaca",
};

const concepts = [
  { id: "01", name: "Decision stack", kicker: "Recommended", rationale: "One answer per layer: decide, understand, prepare, then verify.", tradeoff: "The calmest production change; intentionally conventional." },
  { id: "02", name: "Pocket chapters", kicker: "Mobile navigation", rationale: "Overview, Advice, and Sources become short chapters instead of one long page.", tradeoff: "Fast to navigate; some information sits behind a tap." },
  { id: "03", name: "Travel bento", kicker: "Modular scan", rationale: "Unequal modules make importance visible and let rich records breathe.", tradeoff: "Highly scannable; careful module ordering is essential." },
  { id: "04", name: "Arrival briefing", kicker: "Time based", rationale: "Information follows the traveler from planning through arrival and departure.", tradeoff: "Excellent for visits; less natural for passive inspiration." },
  { id: "05", name: "Evidence ledger", kicker: "Trust first", rationale: "Advice is paired with its author, source type, and freshness.", tradeoff: "Clear provenance; denser than the other directions." },
  { id: "06", name: "Save or skip", kicker: "Decision matrix", rationale: "A compact verdict frames the exact tradeoffs behind adding a place to a trip.", tradeoff: "Efficient for planning; compresses the destination’s personality." },
  { id: "07", name: "Creator story", kicker: "Social origin", rationale: "The source reel becomes the narrative doorway, with facts kept visibly separate.", tradeoff: "Emotionally strong; relies on good creator material." },
  { id: "08", name: "Quiet accordion", kicker: "Progressive depth", rationale: "A short summary stays visible while complete groups open on demand.", tradeoff: "Handles dense records; requires clear disclosure labels." },
  { id: "09", name: "Trip card", kicker: "Action oriented", rationale: "The place is treated as a candidate itinerary stop with a readiness checklist.", tradeoff: "Highly actionable; assumes the user is actively planning." },
  { id: "10", name: "Field companion", kicker: "Native first", rationale: "Large tap targets and offline essentials optimize the page for use during the visit.", tradeoff: "Excellent in the field; editorial depth becomes secondary." },
];

const fact = (label, value) => `<div class="u-fact"><span>${label}</span><b>${value}</b></div>`;
const facts = (className = "") => `<section class="u-facts ${className}">${fact("Entry", place.price)}${fact("Hours", place.hours)}${fact("Best time", place.best)}${fact("Season", place.season)}</section>`;
const identity = (eyebrow = place.type) => `<header class="u-identity"><span class="u-kicker">${eyebrow}</span><h3>${place.name}</h3><p>${place.region}</p><span class="u-rating">★ ${place.rating}</span></header>`;
const mapsButton = (label = "Open in Google Maps") => `<a class="u-maps" href="${place.mapsUrl}" target="_blank" rel="noreferrer"><span class="g-pin">G</span>${label}<b>↗</b></a>`;
const whyGo = (title = "Why go") => `<section class="u-why"><span class="u-kicker">${title}</span><p>${place.summary}</p><ul>${place.highlights.map((item) => `<li>✦ ${item}</li>`).join("")}</ul></section>`;
const advice = () => `<section class="u-advice"><article><span class="u-kicker">Guide recommendation</span><p>${place.guide}</p><small>Editorial guide · checked 2 weeks ago</small></article><article><span class="u-kicker">Creator tip</span><p>${place.tip}</p><small>@roamwithnina · 3 weeks ago</small></article></section>`;
const sourceTrail = () => `<section class="u-sources"><span class="u-kicker">Source trail</span>${place.sources.map((source, index) => `<div><i>${index + 1}</i><span>${source}</span><b>${index === 0 ? "Creator" : index === 1 ? "Official" : "Community"}</b></div>`).join("")}</section>`;
const actions = () => `<div class="u-actions"><button type="button" class="primary">＋ Add to trip</button><button type="button">♡ Save</button></div>`;

function decision(surface) {
  if (surface === "desktop") return `<div class="decision-desktop"><main>${identity()}${whyGo()}${advice()}</main><aside>${facts()}${mapsButton()}${sourceTrail()}</aside>${actions()}</div>`;
  return `<div class="decision-mobile">${identity()}${facts("scroll-facts")}${mapsButton("Directions & location")}${whyGo()}${advice()}${sourceTrail()}${actions()}</div>`;
}

function chapters(surface) {
  const nav = `<nav class="chapter-nav"><button class="active">Overview</button><button>Advice</button><button>Sources</button></nav>`;
  if (surface === "desktop") return `<div class="chapters-desktop"><aside>${identity("Field guide")}${nav}${mapsButton()}</aside><main><span class="chapter-number">01 / Overview</span>${whyGo("The place")}${facts()}${advice()}${sourceTrail()}</main></div>`;
  return `<div class="chapters-mobile">${identity("Pocket guide")}${nav}<div class="chapter-card"><span class="chapter-number">01</span>${whyGo("Overview")}${facts()}${mapsButton()}</div><details><summary>Advice from guides + creator</summary>${advice()}</details><details><summary>3 attributed sources</summary>${sourceTrail()}</details>${actions()}</div>`;
}

function bento(surface) {
  if (surface === "desktop") return `<div class="bento-grid">${identity("Place dashboard")}<div class="bento-verdict"><span>Worth the detour</span><b>Go early</b><small>Half-day · moderate drive</small></div>${facts()}${whyGo("Three reasons to go")}${mapsButton()}${advice()}${sourceTrail()}${actions()}</div>`;
  return `<div class="bento-mobile">${identity("Travel bento")}<div class="bento-pair"><div class="bento-verdict"><span>Verdict</span><b>Go early</b></div>${mapsButton("Google Maps")}</div>${whyGo("Why save it")}${facts("scroll-facts")}<div class="snap-advice">${advice()}</div>${sourceTrail()}${actions()}</div>`;
}

function briefing(surface) {
  const timeline = `<ol class="briefing-line"><li><time>Before</time><b>Leave Oaxaca by 07:00</b><p>${place.drive}. Bring cash.</p></li><li><time>Arrive</time><b>Pools first</b><p>${place.best}; walk the ridge after.</p></li><li><time>Return</time><b>Pair with Mitla</b><p>Leave the mountain road before dusk.</p></li></ol>`;
  if (surface === "desktop") return `<div class="briefing-desktop">${identity("Half-day briefing")}<header><h4>Your visit, in sequence</h4>${mapsButton("Open route in Google Maps")}</header>${timeline}<div class="briefing-bottom">${facts()}${whyGo("What makes it special")}${advice()}${sourceTrail()}</div>${actions()}</div>`;
  return `<div class="briefing-mobile">${identity("Today · Half-day")}${mapsButton("Start from Oaxaca City")}${timeline}<details open><summary>Why this stop</summary>${whyGo()}</details><details><summary>Guide + creator notes</summary>${advice()}</details><details><summary>Facts and sources</summary>${facts()}${sourceTrail()}</details>${actions()}</div>`;
}

function ledger(surface) {
  const claim = (type, text, source) => `<article class="claim"><span>${type}</span><p>${text}</p><small>${source}</small></article>`;
  const claims = `${claim("Official fact", `${place.hours} · ${place.price}`, "Oaxaca tourism board · checked 14 days ago")}${claim("Guide recommendation", place.guide, "Wanderfile editorial · reviewed")}${claim("Creator observation", place.tip, "@roamwithnina · original reel")}`;
  if (surface === "desktop") return `<div class="ledger-desktop"><header>${identity("Evidence ledger")}${mapsButton()}</header><div class="ledger-summary">${whyGo("Supported summary")}${facts()}</div><section class="claims">${claims}</section>${sourceTrail()}${actions()}</div>`;
  return `<div class="ledger-mobile">${identity("Evidence ledger")}<div class="confidence"><b>3 source types</b><span>Current enough to plan</span></div>${mapsButton()}${whyGo("Supported summary")}<section class="claims">${claims}</section><details><summary>View source trail</summary>${sourceTrail()}</details>${actions()}</div>`;
}

function matrix(surface) {
  const rows = [["Time", "Half day", "Good fit"], ["Cost", place.price, "Low"], ["Crowds", "Busy after 10", "Go early"], ["Drive", place.drive, "Long"], ["Payoff", "Pools + valley", "High"]];
  const matrixRows = `<div class="matrix-rows">${rows.map(([label, value, signal]) => `<div><span>${label}</span><b>${value}</b><i>${signal}</i></div>`).join("")}</div>`;
  if (surface === "desktop") return `<div class="matrix-desktop"><header>${identity("Saved-place decision")}<div class="verdict"><span>Verdict</span><b>Keep</b><small>Best as an early half-day</small></div></header>${matrixRows}<div class="matrix-evidence">${whyGo("Payoff")}${advice()}${sourceTrail()}</div><footer>${mapsButton("Check location in Google Maps")}${actions()}</footer></div>`;
  return `<div class="matrix-mobile">${identity("Save or skip")}<div class="verdict"><span>Verdict</span><b>Keep this one</b></div>${matrixRows}${mapsButton("Check the drive")}${whyGo("Why it wins")}<details><summary>Advice and evidence</summary>${advice()}${sourceTrail()}</details>${actions()}</div>`;
}

function creator(surface) {
  const reel = `<section class="reel-card"><span class="reel-badge">Saved reel · 0:24</span><blockquote>“Come for the pools. Stay for the ridge.”</blockquote><footer><i>N</i><span><b>@roamwithnina</b><small>Oaxaca road trip</small></span></footer></section>`;
  if (surface === "desktop") return `<div class="creator-desktop">${reel}<main>${identity("From a creator you saved")}${whyGo("What the reel showed")}${advice()}${facts()}${mapsButton()}${sourceTrail()}${actions()}</main></div>`;
  return `<div class="creator-mobile">${reel}${identity("From your saves")}${mapsButton("See where this is")}${whyGo("What caught your eye")}<details open><summary>Creator tip</summary>${advice()}</details><details><summary>Practical facts + sources</summary>${facts()}${sourceTrail()}</details>${actions()}</div>`;
}

function accordion(surface) {
  const sections = `<div class="quiet-sections"><details open><summary>At a glance <span>4 facts</span></summary>${facts()}</details><details><summary>Why go <span>3 highlights</span></summary>${whyGo()}</details><details><summary>Know before you go <span>2 notes</span></summary>${advice()}</details><details><summary>Sources <span>3 references</span></summary>${sourceTrail()}</details></div>`;
  if (surface === "desktop") return `<div class="quiet-desktop"><aside>${identity("Quiet guide")}${mapsButton()}${actions()}</aside><main><p class="quiet-summary">${place.summary}</p>${sections}</main></div>`;
  return `<div class="quiet-mobile">${identity("Quiet guide")}<p class="quiet-summary">${place.summary}</p>${mapsButton()}${sections}${actions()}</div>`;
}

function tripCard(surface) {
  const checklist = `<section class="trip-check"><label><input type="checkbox" checked> Fits a half-day</label><label><input type="checkbox" checked> Open on your date</label><label><input type="checkbox"> Add transport note</label><label><input type="checkbox"> Assign to a day</label></section>`;
  if (surface === "desktop") return `<div class="trip-desktop"><aside><span class="day-stamp">DAY<br><b>03</b></span>${identity("Oaxaca itinerary")}${mapsButton("View drive in Google Maps")}</aside><main><div class="trip-ready"><span>Trip readiness</span><b>2 of 4 ready</b></div>${checklist}${facts()}${whyGo("Why it belongs")}${advice()}${sourceTrail()}${actions()}</main></div>`;
  return `<div class="trip-mobile"><header><span class="day-stamp">03</span>${identity("Candidate stop")}</header><div class="trip-ready"><span>Trip readiness</span><b>2 / 4</b></div>${checklist}${mapsButton("Check route")}${facts("scroll-facts")}<details><summary>Why go and what to know</summary>${whyGo()}${advice()}</details><details><summary>Sources</summary>${sourceTrail()}</details>${actions()}</div>`;
}

function companion(surface) {
  const essentials = `<section class="field-essentials"><div><span>OPEN</span><b>Until 18:00</b></div><div><span>PAY</span><b>Cash · MX$50</b></div><div><span>LEAVE</span><b>Before dusk</b></div></section>`;
  if (surface === "desktop") return `<div class="field-desktop"><header>${identity("Field companion · Available offline")}${mapsButton("Open location in Google Maps")}</header>${essentials}<div class="field-columns"><section><h4>Do this first</h4>${whyGo("At the place")}</section><section><h4>Remember</h4>${advice()}</section><section><h4>Stored evidence</h4>${sourceTrail()}</section></div>${actions()}</div>`;
  return `<div class="field-mobile">${identity("Available offline")}${essentials}${mapsButton("Open Google Maps")}${whyGo("Do this first")}<section class="field-note"><span>REMEMBER</span><p>${place.tip}</p></section><details><summary>Guide note and saved sources</summary>${advice()}${sourceTrail()}</details>${actions()}</div>`;
}

const renderers = [decision, chapters, bento, briefing, ledger, matrix, creator, accordion, tripCard, companion];
const requestedConcept = Number(new URLSearchParams(window.location.search).get("concept"));
let current = Number.isInteger(requestedConcept) && requestedConcept >= 1 && requestedConcept <= concepts.length ? requestedConcept - 1 : 0;

const conceptEl = document.querySelector("#concept");
const titleEl = document.querySelector("#concept-title");
const kickerEl = document.querySelector("#concept-kicker");
const positionEl = document.querySelector("#position");
const navEl = document.querySelector("#concept-nav");

function preview(label, surface, body) {
  const chrome = surface === "native"
    ? `<div class="native-status"><span>9:41</span><i></i><span>▮ ᯤ</span></div><div class="native-title"><button>‹</button><b>Place</b><button>•••</button></div>`
    : surface === "mobile"
      ? `<div class="browser-bar"><span>‹</span><b>wanderfile.app</b><span>•••</span></div>`
      : `<div class="desktop-bar"><b>Wanderfile</b><nav>Home&nbsp;&nbsp; Posts&nbsp;&nbsp; Travel</nav><span>VP</span></div>`;
  const footer = surface === "native" ? `<div class="native-tabs"><b>⌂<small>Home</small></b><b class="active">⌖<small>Travel</small></b><b>＋<small>Add</small></b><b>○<small>You</small></b></div>` : "";
  return `<section class="preview ${surface}"><div class="preview-label"><span>${label}</span><i>${surface === "desktop" ? "1280" : "390"} px</i></div><div class="surface">${chrome}<div class="screen">${body}</div>${footer}</div></section>`;
}

function render(moveFocus = false) {
  const concept = concepts[current];
  const renderer = renderers[current];
  kickerEl.textContent = current === 0 ? "Recommended direction" : "Design direction";
  titleEl.textContent = `${concept.id} · ${concept.name}`;
  positionEl.textContent = `${concept.id} / 10`;
  document.querySelector(".top-count").textContent = `${concept.id}—10`;
  navEl.innerHTML = concepts.map((item, index) => `<button type="button" class="${index === current ? "active" : ""}" data-index="${index}" aria-label="Concept ${item.id}: ${item.name}" aria-current="${index === current}">${item.id}</button>`).join("");
  conceptEl.innerHTML = `<div class="concept-meta"><span class="badge">${concept.kicker}</span><p>${concept.rationale}</p><small><b>Tradeoff</b>${concept.tradeoff}</small></div><div class="previews">${preview("Mobile web", "mobile", renderer("mobile"))}${preview("Native app", "native", renderer("native"))}${preview("Desktop", "desktop", renderer("desktop"))}</div>`;
  conceptEl.className = `concept concept-${current + 1}`;
  window.history.replaceState(null, "", `${window.location.pathname}?concept=${current + 1}`);
  if (moveFocus) document.querySelector(`[data-index="${current}"]`)?.focus({ preventScroll: true });
}

function move(delta) {
  current = (current + delta + concepts.length) % concepts.length;
  render(true);
}

document.querySelector("#prev").addEventListener("click", () => move(-1));
document.querySelector("#next").addEventListener("click", () => move(1));
navEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-index]");
  if (!button) return;
  current = Number(button.dataset.index);
  render(true);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") move(1);
  if (event.key === "ArrowLeft") move(-1);
});

render();
