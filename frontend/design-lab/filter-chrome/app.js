const MEALS = [
  ["all", "All meals", "◎"],
  ["dinner", "Dinner", "◐"],
  ["lunch", "Lunch", "◒"],
  ["breakfast", "Breakfast", "☼"],
  ["dessert", "Dessert", "✦"],
  ["snack", "Snack", "·"],
  ["cocktail", "Cocktail", "✧"],
];
const TIMES = [
  ["any", "Any time"],
  ["20", "< 20 min"],
  ["45", "< 45 min"],
];

const searchIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg>`;

const concepts = [
  {
    name: "Capsule groups",
    tag: "Current",
    note: "Production silhouette: search field, two nested segment wells, cyan Grocery list. Dense, grouped, and already shipping.",
    render: (s) => `
      <div class="fb-capsules">
        ${search(s)}
        ${seg("meal", s)}
        ${seg("time", s)}
        ${cta()}
      </div>`,
  },
  {
    name: "Single dock",
    tag: "Unified",
    note: "One continuous bar. Hairline dividers instead of three separate wells. Grocery list becomes the dock’s end cap.",
    render: (s) => `
      <div class="fb-dock">
        ${search(s)}
        ${seg("meal", s)}
        ${seg("time", s)}
        ${cta()}
      </div>`,
  },
  {
    name: "Inset track",
    tag: "Soft",
    note: "A pill-shaped trough. Search and segments sit as inner capsules, closer to Maps / iOS toolbars.",
    render: (s) => `
      <div class="fb-track">
        ${search(s)}
        ${seg("meal", s)}
        ${seg("time", s)}
        ${cta()}
      </div>`,
  },
  {
    name: "Loose chips",
    tag: "Flat",
    note: "No grouping wells. Every meal and time is its own pill — easier to scan, easier to wrap on a phone.",
    render: (s) => `
      <div class="fb-loose">
        ${search(s)}
        ${seg("meal", s)}
        ${seg("time", s)}
        ${cta()}
      </div>`,
  },
  {
    name: "Underline meals",
    tag: "Editorial",
    note: "Meals become page tabs. Time stays a compact well on the right so the cuisine list never competes with meal type.",
    render: (s) => `
      <div class="fb-underline">
        <div class="fb-seg fb-seg-meal" role="tablist">${mealButtons(s)}</div>
        <div class="top">
          ${search(s)}
          ${seg("time", s, "fb-seg-time")}
          ${cta()}
        </div>
      </div>`,
  },
  {
    name: "Compact dropdowns",
    tag: "Quiet",
    note: "Meals and time collapse to two labeled triggers. The first viewport stays calm when you add cuisine later.",
    render: (s) => `
      <div class="fb-dropdowns">
        ${search(s)}
        <div class="wrap">
          <button type="button" class="fb-dd${s.meal !== "all" ? " is-on" : ""}" data-open="meal">${mealLabel(s.meal)} ▾</button>
          <div class="fb-menu" ${s.open === "meal" ? "" : "hidden"} data-menu="meal">${MEALS.map(([id, label]) =>
            `<button type="button" class="${s.meal === id ? "is-on" : ""}" data-meal="${id}">${label}</button>`).join("")}</div>
        </div>
        <div class="wrap">
          <button type="button" class="fb-dd${s.time !== "any" ? " is-on" : ""}" data-open="time">${timeLabel(s.time)} ▾</button>
          <div class="fb-menu" ${s.open === "time" ? "" : "hidden"} data-menu="time">${TIMES.map(([id, label]) =>
            `<button type="button" class="${s.time === id ? "is-on" : ""}" data-time="${id}">${label}</button>`).join("")}</div>
        </div>
        ${cta()}
      </div>`,
  },
  {
    name: "Two-row kitchen",
    tag: "Clear",
    note: "Search and Grocery list share the primary row. Meals and time get a dedicated second line so nothing truncates.",
    render: (s) => `
      <div class="fb-tworow">
        <div class="top">${search(s)}${cta()}</div>
        <div class="bottom">${seg("meal", s)}${seg("time", s)}</div>
      </div>`,
  },
  {
    name: "Icon meals",
    tag: "Compact",
    note: "Meal type as a glyph well. Hover still has the label in the button title; the row stays one line on laptop widths.",
    render: (s) => `
      <div class="fb-icons">
        ${search(s)}
        <div class="fb-seg fb-seg-meal">${MEALS.map(([id, label, icon]) =>
          `<button type="button" class="${s.meal === id ? "is-on" : ""}" data-meal="${id}" title="${label}">${icon}<span>${label}</span></button>`).join("")}</div>
        ${seg("time", s)}
        ${cta()}
      </div>`,
  },
  {
    name: "Time stepper",
    tag: "Cook-first",
    note: "Time is a cook constraint, not a category. Stepping Any → 20 → 45 feels more like a kitchen timer than a facet.",
    render: (s) => `
      <div class="fb-stepper">
        ${search(s)}
        ${seg("meal", s)}
        <div class="fb-step">
          <button type="button" data-nudge="-1" aria-label="More time">−</button>
          <b>${timeLabel(s.time)}</b>
          <button type="button" data-nudge="1" aria-label="Less time">+</button>
        </div>
        ${cta()}
      </div>`,
  },
  {
    name: "Paper invert",
    tag: "Contrast",
    note: "A light filter slab on the dusk page. Useful if the cyan-on-teal selected state still feels too quiet.",
    render: (s) => `
      <div class="fb-paper">
        ${search(s)}
        ${seg("meal", s)}
        ${seg("time", s)}
        ${cta()}
      </div>`,
  },
  {
    name: "Floating glass",
    tag: "Soft dock",
    note: "Frosted, slightly lifted. Same grouping as production, with more air so the bar reads as a tool, not a form.",
    render: (s) => `
      <div class="fb-glass">
        ${search(s)}
        ${seg("meal", s)}
        ${seg("time", s)}
        ${cta()}
      </div>`,
  },
  {
    name: "Filter sentence",
    tag: "Quietest",
    note: "A readable line does the filtering. Search and Grocery list stay as chrome; meals and time hide behind underlined words.",
    render: (s) => `
      <div class="fb-sentence">
        <div class="line">
          Showing
          <span class="wrap">
            <button type="button" data-open="meal">${s.meal === "all" ? "all meals" : mealLabel(s.meal).toLowerCase()}</button>
            <div class="pop" ${s.open === "meal" ? "" : "hidden"}>${MEALS.map(([id, label]) =>
              `<button type="button" class="${s.meal === id ? "is-on" : ""}" data-meal="${id}">${label}</button>`).join("")}</div>
          </span>
          ·
          <span class="wrap">
            <button type="button" data-open="time">${s.time === "any" ? "any time" : timeLabel(s.time)}</button>
            <div class="pop" ${s.open === "time" ? "" : "hidden"}>${TIMES.map(([id, label]) =>
              `<button type="button" class="${s.time === id ? "is-on" : ""}" data-time="${id}">${label}</button>`).join("")}</div>
          </span>
        </div>
        <div class="row">${search(s)}${cta()}</div>
      </div>`,
  },
];

function mealLabel(id) {
  return MEALS.find(([value]) => value === id)?.[1] ?? "All meals";
}
function timeLabel(id) {
  return TIMES.find(([value]) => value === id)?.[1] ?? "Any time";
}
function search(state) {
  return `<label class="fb-search">${searchIcon}<input type="search" placeholder="Search by dish or pantry ingredient" value="${escapeAttr(state.query)}" data-search /></label>`;
}
function cta() {
  return `<button type="button" class="fb-cta">Grocery list</button>`;
}
function mealButtons(state) {
  return MEALS.map(([id, label]) =>
    `<button type="button" class="${state.meal === id ? "is-on" : ""}" data-meal="${id}">${label}</button>`).join("");
}
function timeButtons(state) {
  return TIMES.map(([id, label]) =>
    `<button type="button" class="${state.time === id ? "is-on" : ""}" data-time="${id}">${label}</button>`).join("");
}
function seg(kind, state, extra = "") {
  return `<div class="fb-seg fb-seg-${kind} ${extra}" role="group">${kind === "meal" ? mealButtons(state) : timeButtons(state)}</div>`;
}
function escapeAttr(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

const options = document.querySelector("#options");
const demo = document.querySelector("#filter-demo");
const number = document.querySelector("#option-number");
const name = document.querySelector("#option-name");
const note = document.querySelector("#option-note");
const resultCount = document.querySelector("#result-count");

let current = Math.max(0, Math.min(concepts.length - 1, Number(location.hash.slice(1)) - 1 || 0));
const state = { meal: "all", time: "any", query: "", open: null };

options.innerHTML = concepts.map((concept, index) => `
  <button type="button" data-index="${index}">
    <span>${String(index + 1).padStart(2, "0")}</span>
    <b>${concept.name}</b>
    <small>${concept.tag}</small>
  </button>`).join("");

function counts() {
  let n = 8;
  if (state.meal !== "all") n = state.meal === "dinner" ? 3 : state.meal === "dessert" ? 1 : 2;
  if (state.time === "20") n = Math.max(1, n - 3);
  if (state.time === "45") n = Math.max(2, n - 1);
  if (state.query.trim()) n = Math.max(1, n - 2);
  return n;
}

function paint() {
  const concept = concepts[current];
  demo.innerHTML = concept.render(state);
  number.textContent = `Option ${String(current + 1).padStart(2, "0")} · ${concept.tag}`;
  name.textContent = concept.name;
  note.textContent = concept.note;
  const n = counts();
  resultCount.textContent = `${n} recipe idea${n === 1 ? "" : "s"}`;
  options.querySelectorAll("button").forEach((button, index) => {
    button.classList.toggle("is-active", index === current);
    if (index === current) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  });
  history.replaceState(null, "", `#${current + 1}`);
}

function go(index) {
  current = (index + concepts.length) % concepts.length;
  state.open = null;
  paint();
}

options.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) go(Number(button.dataset.index));
});

demo.addEventListener("input", (event) => {
  if (event.target.matches("[data-search]")) {
    state.query = event.target.value;
    resultCount.textContent = `${counts()} recipe ideas`;
  }
});

demo.addEventListener("click", (event) => {
  event.stopPropagation();
  const meal = event.target.closest("[data-meal]");
  const time = event.target.closest("[data-time]");
  const open = event.target.closest("[data-open]");
  const nudge = event.target.closest("[data-nudge]");
  if (meal) { state.meal = meal.dataset.meal; state.open = null; paint(); return; }
  if (time) { state.time = time.dataset.time; state.open = null; paint(); return; }
  if (open) {
    const key = open.dataset.open;
    state.open = state.open === key ? null : key;
    paint();
    return;
  }
  if (nudge) {
    const ids = TIMES.map(([id]) => id);
    const next = ids.indexOf(state.time) + Number(nudge.dataset.nudge);
    state.time = ids[Math.max(0, Math.min(ids.length - 1, next))];
    paint();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-open], .fb-menu, .pop")) {
    if (state.open) { state.open = null; paint(); }
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") go(current - 1);
  if (event.key === "ArrowRight") go(current + 1);
});

paint();
