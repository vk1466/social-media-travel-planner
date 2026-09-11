const concepts = [
  {
    name: "Quiet stack",
    note: "A clear page name plus useful context. No eyebrow and no explanation of the obvious.",
    tag: "Recommended",
    markup: `<header class="page-head quiet-stack">
      <h1>Saved posts</h1>
      <p class="lede">148 ideas collected from Instagram, TikTok, and YouTube.</p>
    </header>`,
  },
  {
    name: "Source switcher",
    note: "Makes source a real filter control instead of presenting “All sources” as unexplained copy.",
    tag: "Balanced",
    markup: `<header class="page-head inline-context">
      <h1>Saved posts</h1>
      <div class="source-switcher" aria-label="Current source filter"><span class="source-dots"><i>◎</i><i>♪</i><i>▶</i></span><b>3 apps</b><span>⌄</span></div>
      <p class="lede">148 saves</p>
    </header>`,
  },
  {
    name: "Library breadcrumb",
    note: "Uses the upper line for navigation and the lower line for recent activity.",
    tag: "Navigational",
    markup: `<header class="page-head breadcrumb-head">
      <p class="crumb">Your library <span>/</span> Saved posts</p>
      <div><h1>Saved posts</h1><p class="lede"><b>3 new</b> since Tuesday</p></div>
    </header>`,
  },
  {
    name: "Action rail",
    note: "Pairs a branded title treatment with the page’s primary action—useful, compact, and aligned.",
    tag: "Branded",
    markup: `<header class="page-head accent-rail">
      <div><span>Your inspiration library</span><h1>Saved posts</h1></div>
      <button class="head-action">＋ Add inspiration</button>
    </header>`,
  },
  {
    name: "Section index",
    note: "Treats category pages like chapters while the supporting copy reports meaningful scope.",
    tag: "Editorial",
    markup: `<header class="page-head section-index">
      <span class="big-index">01</span>
      <div><p class="eyebrow">Your library</p><h1>Saved posts</h1></div>
      <p class="lede">148 finds<br />from 3 apps</p>
    </header>`,
  },
  {
    name: "Ledger rule",
    note: "A calm archive header with item count and freshness replacing decorative description text.",
    tag: "Structured",
    markup: `<header class="page-head ledger-rule">
      <span class="folio">Library / 01</span>
      <h1>Saved posts</h1>
      <p class="lede">148 items</p>
      <span class="source">Updated today</span>
    </header>`,
  },
  {
    name: "Source chips",
    note: "Promotes platforms into understandable, one-tap filters directly beside the page title.",
    tag: "Friendly",
    markup: `<header class="page-head soft-label">
      <h1>Saved posts</h1>
      <div class="header-chips" aria-label="Filter saved posts by source">
        <button class="is-selected">Everything <b>148</b></button>
        <button>Instagram <b>91</b></button>
        <button>TikTok <b>42</b></button>
        <button>YouTube <b>15</b></button>
      </div>
    </header>`,
  },
  {
    name: "Library dashboard",
    note: "A contained header earns its space by summarizing both saves and the places found inside them.",
    tag: "Contained",
    markup: `<header class="page-head compact-band">
      <h1>Saved posts</h1>
      <div class="band-metrics"><span><b>148</b> posts</span><span><b>57</b> places found</span></div>
      <button class="head-action">＋ Add</button>
    </header>`,
  },
  {
    name: "Search first",
    note: "Drops the lede entirely and gives the saved library’s primary task pride of place.",
    tag: "Expressive",
    markup: `<header class="page-head type-lockup">
      <h1>Saved posts</h1>
      <label class="header-search"><span>⌕</span><input placeholder="Search 148 saves" /></label>
    </header>`,
  },
  {
    name: "Utility row",
    note: "The densest option: page identity, count, latest activity, and primary action share one row.",
    tag: "Most compact",
    markup: `<header class="page-head utility-row">
      <h1>Saved posts</h1>
      <span class="count">148</span>
      <span class="recent"><i></i> Last saved 2h ago</span>
      <button class="head-action">＋ Add inspiration</button>
    </header>`,
  },
];

const options = document.querySelector("#options");
const demo = document.querySelector("#header-demo");
const number = document.querySelector("#option-number");
const name = document.querySelector("#option-name");
const note = document.querySelector("#option-note");
let current = Math.max(0, Math.min(concepts.length - 1, Number(location.hash.slice(1)) - 1 || 0));

options.innerHTML = concepts.map((concept, index) => `
  <button type="button" data-index="${index}">
    <span>${String(index + 1).padStart(2, "0")}</span>
    <b>${concept.name}</b>
    <small>${concept.tag}</small>
  </button>`).join("");

function render(index) {
  current = (index + concepts.length) % concepts.length;
  const concept = concepts[current];
  demo.innerHTML = concept.markup;
  number.textContent = `Option ${String(current + 1).padStart(2, "0")} · ${concept.tag}`;
  name.textContent = concept.name;
  note.textContent = concept.note;
  options.querySelectorAll("button").forEach((button, buttonIndex) => {
    button.classList.toggle("is-active", buttonIndex === current);
    button.setAttribute("aria-current", buttonIndex === current ? "true" : "false");
  });
  history.replaceState(null, "", `#${current + 1}`);
}

options.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button) render(Number(button.dataset.index));
});

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") render(current - 1);
  if (event.key === "ArrowRight") render(current + 1);
});

render(current);
