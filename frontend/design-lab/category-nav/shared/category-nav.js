const ICONS = {
  posts: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/></svg>',
  travel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6.5-5.4 6.5-11A6.5 6.5 0 0 0 5.5 10c0 5.6 6.5 11 6.5 11Z"/><circle cx="12" cy="10" r="2.1"/></svg>',
  food: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8Z"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  movies: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="m10 9.5 6 3.5-6 3.5V9.5Z"/></svg>',
  history: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.8"/></svg>',
  notes: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h8l4 4V19.5H7Z"/><path d="M15 4.5V9h4.5"/><path d="M9.5 12.5h7M9.5 16h5"/></svg>',
  people: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="3.2"/><path d="M6.5 19c.8-3 2.8-4.5 5.5-4.5s4.7 1.5 5.5 4.5"/></svg>',
  shops: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8.5h14l-1 11H6l-1-11Z"/><path d="M9 9V7a3 3 0 0 1 6 0v2"/></svg>',
};

const CATS = [
  {
    key: "posts",
    label: "Posts",
    note: "Every save",
    count: 128,
    hint: "Reels, stills, threads",
    code: "PS",
    accent: "#e45a3c",
    cover: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80",
    stack: [
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=200&q=70",
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=200&q=70",
    ],
  },
  {
    key: "travel",
    label: "Travel",
    note: "Places + trips",
    count: 64,
    hint: "Atlas of saved stops",
    code: "TR",
    accent: "#1f6b52",
    cover: "https://images.unsplash.com/photo-1533105079780-fdcd5fdcbaa0?auto=format&fit=crop&w=900&q=80",
    stack: [
      "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=200&q=70",
      "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=200&q=70",
    ],
  },
  {
    key: "food",
    label: "Food",
    note: "Your cookbook",
    count: 22,
    hint: "Cook from a reel",
    code: "FD",
    accent: "#c45c1a",
    cover: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=80",
    stack: [
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=200&q=70",
      "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=200&q=70",
    ],
  },
  {
    key: "movies",
    label: "Movies",
    note: "Watchlist",
    count: 9,
    hint: "Titles from saves",
    code: "MV",
    accent: "#3d4a9a",
    cover: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
    stack: [
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=200&q=70",
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=200&q=70",
    ],
  },
  {
    key: "history",
    label: "History",
    note: "Visits",
    count: 14,
    hint: "Where you’ve been",
    code: "HX",
    accent: "#5b4a3a",
    cover: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=80",
    stack: [
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=200&q=70",
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=200&q=70",
    ],
  },
  {
    key: "people",
    label: "People",
    note: "Creators",
    count: 31,
    hint: "Saved accounts",
    code: "PE",
    accent: "#5a3d8a",
    cover: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80",
    stack: [
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=200&q=70",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=70",
    ],
  },
  {
    key: "shops",
    label: "Shops",
    note: "Stores",
    count: 18,
    hint: "Places to buy",
    code: "SH",
    accent: "#8a3d4a",
    cover: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=900&q=80",
    stack: [
      "https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?auto=format&fit=crop&w=200&q=70",
      "https://images.unsplash.com/photo-1472851298512-30199c243ffb?auto=format&fit=crop&w=200&q=70",
    ],
  },
  {
    key: "notes",
    label: "Notes",
    note: "Field notes",
    count: 7,
    hint: "Lists and reminders",
    code: "NT",
    accent: "#3d5a8a",
    cover: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
    stack: [
      "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=200&q=70",
      "https://images.unsplash.com/photo-1456327102063-fb5054efe647?auto=format&fit=crop&w=200&q=70",
    ],
  },
];

const OPTIONS = [
  {
    id: "01",
    name: "Cover portals",
    note: "Last save as the door",
    inspired: "Inspired by Pinterest boards and Apple TV+ category tiles: the destination is a picture, not a glyph.",
    rationale: "Each room uses a recent cover. Label and count sit on a scrim. Active state is a bright inner ring, not a second border color.",
    best: "Best if the navigator should feel like opening a library, and Posts / Travel / Food already have strong imagery.",
  },
  {
    id: "02",
    name: "Type monument",
    note: "The word is the icon",
    inspired: "Inspired by magazine section heads and Monocle department pages: display type, a giant count, almost no chrome.",
    rationale: "Drop the emoji-adjacent glyphs. POSTS / TRAVEL / FOOD become architecture. The number is the only decoration.",
    best: "Best for a confident editorial product. Weak if you need icons for glanceability on mobile.",
  },
  {
    id: "03",
    name: "Color rooms",
    note: "Each shelf a climate",
    inspired: "Inspired by iOS Home Screen tinted folders and Stripe dashboard product cards with a single hue per surface.",
    rationale: "Same layout as today, but each destination has its own climate so Travel never looks like Food. Active = filled, idle = tinted.",
    best: "Smallest production jump from the current strip, with much clearer wayfinding.",
  },
  {
    id: "04",
    name: "Sliding dock",
    note: "One control, not five cards",
    inspired: "Inspired by iOS segmented controls, Arc spaces, and NN/g’s warning: don’t fake tabs as marketing cards.",
    rationale: "These are sibling destinations. A single scrolling bar is more honest than wrapping tiles. Active item fills; extra shelves slide sideways.",
    best: "Best if you want the header + nav to collapse into one chrome band and give the page back to content.",
  },
  {
    id: "05",
    name: "Folder tabs",
    note: "Physical filing",
    inspired: "Inspired by classic folder tabs (NN/g) and notebook section dividers — the selected card shares a surface with the page.",
    rationale: "Idle tabs sit behind; the active one joins the content panel. Makes “you are here” unmistakable.",
    best: "Best when the library below should feel attached to the navigator, not a separate grid.",
  },
  {
    id: "06",
    name: "Index plaques",
    note: "01 / 02 / 03",
    inspired: "Inspired by museum wayfinding and editorial contents pages.",
    rationale: "Number, name, one-line job. Hairline frames. Feels like a table of contents for the product.",
    best: "Best for a quieter, adult Wanderfile. Pairs well with the editorial folio cover cards.",
  },
  {
    id: "07",
    name: "Board stacks",
    note: "What’s inside",
    inspired: "Inspired by Pinterest board covers and Apple Photos albums: a stack implies a collection.",
    rationale: "Three thumbs + a label. Posts shows reels, Travel shows places, Food shows dishes — the card teaches the destination.",
    best: "Best when counts alone don’t explain the shelf. Slightly taller than today’s 108px tiles.",
  },
  {
    id: "08",
    name: "Terminal signs",
    note: "Airport wayfinding",
    inspired: "Inspired by airport / metro signage and boarding-pass stubs: code, name, gate-like count.",
    rationale: "Two-letter codes (PS, TR, FD) and condensed type. Instantly distinct, slightly playful, very scannable in a row.",
    best: "Best if Travel is the emotional center and the rest of the product can borrow that language.",
  },
  {
    id: "09",
    name: "Metric tickets",
    note: "Count leads",
    inspired: "Inspired by Stripe/Amplitude metric cards: the number is the headline, the label is secondary.",
    rationale: "128 / 64 / 22 do the navigating. People who live in the library already know the names; they hunt by size.",
    best: "Best for returning users. Weaker for first-run, when “Food” still needs explaining.",
  },
  {
    id: "10",
    name: "Night glass",
    note: "OLED dock",
    inspired: "Inspired by visionOS orbs and dark streaming home rows (Netflix/Disney category chips on photography).",
    rationale: "Frosted tiles over a cinematic header wash. Active tile lights up; others stay dim. Matches a night-reel library.",
    best: "Best if you commit to a dark product chrome. Don’t mix with the cream cover cards without a theme split.",
  },
];

let active = Math.max(0, Math.min(9, Number(new URLSearchParams(location.search).get("option") || 1) - 1));
let selected = "travel";

const optionList = document.querySelector("#option-list");
const stage = document.querySelector("#preview-stage");

function setQuery() {
  const url = new URL(location.href);
  url.searchParams.set("option", String(active + 1));
  history.replaceState(null, "", url);
}

function cls(cat) {
  return cat.key === selected ? "is-on" : "";
}

function headerChrome(dark = false) {
  return `<header class="app-head ${dark ? "is-dark" : ""}">
    <span class="wordmark">Wanderfile</span>
    <div class="head-actions">
      <span class="ghost">Search</span>
      <span class="solid">Add</span>
    </div>
  </header>`;
}

function pageStub(cat) {
  return `<section class="page-stub">
    <p>Now in</p>
    <h3>${cat.label}</h3>
    <p>${cat.hint} · ${cat.count} in this shelf</p>
  </section>`;
}

function renderNav(option) {
  const cards = CATS.map((cat) => {
    const on = cls(cat);
    const icon = ICONS[cat.key];
    switch (option) {
      case 0:
        return `<button type="button" class="nav-card cover ${on}" data-cat="${cat.key}" style="--accent:${cat.accent}">
          <img src="${cat.cover}" alt="" />
          <span class="cover-scrim"></span>
          <span class="cover-copy"><b>${cat.label}</b><small>${cat.count} · ${cat.note}</small></span>
        </button>`;
      case 1:
        return `<button type="button" class="nav-card monument ${on}" data-cat="${cat.key}">
          <span class="mon-count">${cat.count}</span>
          <strong>${cat.label}</strong>
          <small>${cat.note}</small>
        </button>`;
      case 2:
        return `<button type="button" class="nav-card room ${on}" data-cat="${cat.key}" style="--accent:${cat.accent}">
          <span class="room-icon">${icon}</span>
          <span><b>${cat.label}</b><small>${cat.count} · ${cat.note}</small></span>
        </button>`;
      case 3:
        return `<button type="button" class="dock-item ${on}" data-cat="${cat.key}">
          ${icon}<span>${cat.label}</span><em>${cat.count}</em>
        </button>`;
      case 4:
        return `<button type="button" class="folder-tab ${on}" data-cat="${cat.key}">
          ${icon}<span>${cat.label}</span><em>${cat.count}</em>
        </button>`;
      case 5:
        return `<button type="button" class="nav-card plaque ${on}" data-cat="${cat.key}">
          <span class="plaque-no">${String(CATS.indexOf(cat) + 1).padStart(2, "0")}</span>
          <span><b>${cat.label}</b><small>${cat.hint}</small></span>
          <em>${cat.count}</em>
        </button>`;
      case 6:
        return `<button type="button" class="nav-card board ${on}" data-cat="${cat.key}">
          <span class="board-stack">
            <img src="${cat.stack[1]}" alt="" />
            <img src="${cat.stack[0]}" alt="" />
            <img src="${cat.cover}" alt="" />
          </span>
          <span class="board-copy"><b>${cat.label}</b><small>${cat.count} saved</small></span>
        </button>`;
      case 7:
        return `<button type="button" class="nav-card terminal ${on}" data-cat="${cat.key}">
          <span class="term-code">${cat.code}</span>
          <span class="term-name">${cat.label}</span>
          <span class="term-gate">Gate ${cat.count}</span>
        </button>`;
      case 8:
        return `<button type="button" class="nav-card metric ${on}" data-cat="${cat.key}" style="--accent:${cat.accent}">
          <small>${cat.label}</small>
          <strong>${cat.count}</strong>
          <span>${cat.note}</span>
        </button>`;
      default:
        return `<button type="button" class="nav-card glass ${on}" data-cat="${cat.key}">
          <img src="${cat.cover}" alt="" />
          <span class="glass-body">${icon}<b>${cat.label}</b><small>${cat.count}</small></span>
        </button>`;
    }
  }).join("");

  if (option === 3) {
    return `<nav class="nav-row dock" aria-label="Library type">${cards}</nav>`;
  }
  if (option === 4) {
    return `<nav class="nav-row folders" aria-label="Library type">${cards}</nav>`;
  }
  const extra = option === 1 ? "is-monument" : option === 6 ? "is-board" : option === 9 ? "is-glass" : "";
  return `<nav class="nav-row grid ${extra}" aria-label="Library type">${cards}</nav>`;
}

function render() {
  const option = OPTIONS[active];
  const cat = CATS.find((item) => item.key === selected);
  document.querySelector("#option-count").textContent = `${option.id} / 10`;
  document.querySelector("#preview-kicker").textContent = `Direction ${option.id} · ${option.note}`;
  document.querySelector("#preview-title").textContent = option.name;
  document.querySelector("#preview-rationale").textContent = option.rationale;
  document.querySelector("#preview-inspired").textContent = option.inspired;
  document.querySelector("#preview-best-for").textContent = option.best;
  optionList.innerHTML = OPTIONS.map(
    (item, index) => `<button type="button" class="option ${index === active ? "is-active" : ""}" data-option="${index}" role="tab" aria-selected="${index === active}">
      <span>${item.id}</span><b>${item.name}</b><small>${item.note}</small>
    </button>`,
  ).join("");
  const dark = active === 9;
  stage.className = `preview-stage theme-${active + 1}`;
  stage.innerHTML = `<div class="device ${dark ? "is-dark" : ""}">
    ${headerChrome(dark)}
    <div class="device-nav">${renderNav(active)}</div>
    ${pageStub(cat)}
  </div>`;
  setQuery();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  stage.querySelector(".is-on")?.scrollIntoView({
    inline: "nearest",
    block: "nearest",
    behavior: reduceMotion ? "auto" : "smooth",
  });
}

optionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-option]");
  if (!button) return;
  active = Number(button.dataset.option);
  render();
});

stage.addEventListener("click", (event) => {
  const button = event.target.closest("[data-cat]");
  if (!button) return;
  selected = button.dataset.cat;
  render();
});

document.querySelector("#previous-option").addEventListener("click", () => {
  active = (active + 9) % 10;
  render();
});
document.querySelector("#next-option").addEventListener("click", () => {
  active = (active + 1) % 10;
  render();
});
window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    active = (active + 9) % 10;
    render();
  }
  if (event.key === "ArrowRight") {
    active = (active + 1) % 10;
    render();
  }
});

render();
