const items = [
  {
    id: "post",
    kind: "Post",
    title: "Dawn walk through Kyoto lanes",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    stack: [
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=400&q=70",
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=400&q=70",
    ],
    overline: "Instagram reel",
    person: "@ayaka.walks",
    place: "Gion, Kyoto",
    stat: "4 places",
    secondary: "Saved Mar 12",
    duration: "0:47",
    action: "Open",
    accent: "#e45a3c",
  },
  {
    id: "travel",
    kind: "Travel",
    title: "Amalfi Coast",
    image: "https://images.unsplash.com/photo-1533105079780-fdcd5fdcbaa0?auto=format&fit=crop&w=1200&q=80",
    stack: [
      "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=400&q=70",
      "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=400&q=70",
    ],
    overline: "Coast · Italy",
    person: "Campania",
    place: "Positano → Ravello",
    stat: "12 places",
    secondary: "3 visited",
    duration: "4 days",
    action: "Explore",
    accent: "#1f6b52",
  },
  {
    id: "food",
    kind: "Food",
    title: "Chili garlic noodles",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1200&q=80",
    stack: [
      "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=70",
      "https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=400&q=70",
    ],
    overline: "Reel saved",
    person: "@thefeedfeed",
    place: "Weeknight dinner",
    stat: "25 min",
    secondary: "Serves 4",
    duration: "0:28",
    action: "Cook",
    accent: "#c45c1a",
  },
];

const options = [
  {
    id: "01",
    name: "Cinema overlay",
    note: "Photo is the card",
    inspired: "Inspired by Airbnb listing photos and Pinterest’s “get out of the photograph’s way.”",
    rationale: "Drop the cream footer. Title, kind, and one fact live on a bottom scrim. The bookmark is a glass disc, not a competing chip.",
    best: "Best default if the library is visual-first and you want one object across Posts, Travel, and Food.",
  },
  {
    id: "02",
    name: "Editorial folio",
    note: "Type leads",
    inspired: "Inspired by Kinfolk / Monocle issue covers: huge display type, a thin photo, issue metadata.",
    rationale: "The photo is a 40% band. The title does the selling. Kind is a running header, not a sticker on the image.",
    best: "Best if Wanderfile should feel like a magazine you collect, not a booking marketplace.",
  },
  {
    id: "03",
    name: "Hover pin",
    note: "Pinterest grammar",
    inspired: "Inspired by Pinterest pins: 16px radius, image at native crop, save appears on hover, caption stays quiet.",
    rationale: "Chrome vanishes until you care. Title and meta sit under the photo at caption size. Hover reveals Save + the primary action.",
    best: "Best for dense masonry browsing where people scan 40+ saves at once.",
  },
  {
    id: "04",
    name: "Journey ticket",
    note: "Physical object",
    inspired: "Inspired by airline boarding-pass UIs (Skylark, digital wallets): stub, perforation, condensed codes.",
    rationale: "A left stub names the library. The photo is a stamp. Facts sit on a dotted rail like a ticket itinerary.",
    best: "Best if you want Posts / Travel / Food to be instantly distinguishable in a mixed search grid.",
  },
  {
    id: "05",
    name: "Polaroid journal",
    note: "Kept thing",
    inspired: "Inspired by scrapbook travel landing pages: Polaroids, linen, a caption in the white margin.",
    rationale: "White frame, slight tilt, handwritten-feeling caption. Feels saved, not generated. Weak for dense grids; strong for shelves of 8–12.",
    best: "Best for a warm, personal “my scrapbook” home — not for a utilitarian index.",
  },
  {
    id: "06",
    name: "Glass dock",
    note: "Three facts",
    inspired: "Inspired by iOS Live Activities and Apple Maps place cards: one photo, a frosted dock of scannable stats.",
    rationale: "The job of each library is three numbers/words: places, time, creator. You decide without reading a paragraph.",
    best: "Best when comparison (cook time vs. place count vs. reel length) is the real decision.",
  },
  {
    id: "07",
    name: "Horizon listing",
    note: "Landscape scan",
    inspired: "Inspired by Airbnb stay cards: wide photo, heart, location line, then a single quiet title.",
    rationale: "3:2 crop shows more place/food context. Heart is the only chrome on the image. Meta is a sentence, not chips.",
    best: "Best for Travel-heavy browsing and desktop rows of three. Weaker for portrait reels.",
  },
  {
    id: "08",
    name: "Index row",
    note: "Fast list",
    inspired: "Inspired by Spotify / Apple Music rows and Expedia’s tight transactional cards.",
    rationale: "Thumb + title + one fact + action. Same height, instant scan. Use when search or filters are the primary move.",
    best: "Best for search results, recents, and mobile lists. Pair with a richer cover elsewhere.",
  },
  {
    id: "09",
    name: "Stacked folio",
    note: "There’s more inside",
    inspired: "Inspired by Apple Photos stacks and Pinterest board previews: offset frames implying a collection.",
    rationale: "A post with 4 places, a coast with 12 stops, a recipe with mise shots — the stack is the affordance. Badge counts what’s inside.",
    best: "Best when cards are containers (a reel → places, a region → spots, a recipe → steps), not single artifacts.",
  },
  {
    id: "10",
    name: "Night reel",
    note: "Social native",
    inspired: "Inspired by Instagram/TikTok save trays: 9:16, play, duration, creator chip, dark ground.",
    rationale: "Honors that most saves are vertical video. Travel and food inherit the same night chrome so the grid doesn’t mix paper and OLED.",
    best: "Best if Posts is the center of gravity and Travel/Food should feel like “this came from a reel.”",
  },
];

const icons = {
  bookmark:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h10v16l-5-3.1-5 3.1v-16Z"/></svg>',
  heart:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9.2A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.8C19 15.6 12 20 12 20Z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7 9 5-9 5V7Z" fill="currentColor" stroke="none"/></svg>',
  pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z"/><circle cx="12" cy="11" r="1.8"/></svg>',
};

let active = Math.max(0, Math.min(9, Number(new URLSearchParams(location.search).get("option") || 1) - 1));
const saved = new Set();

const optionList = document.querySelector("#option-list");
const stage = document.querySelector("#preview-stage");
const toast = document.querySelector("#toast");

function setQuery() {
  const url = new URL(location.href);
  url.searchParams.set("option", String(active + 1));
  history.replaceState(null, "", url);
}

function img(item, extra = "") {
  return `<img src="${item.image}" alt="" ${extra} />`;
}

function saveBtn(item) {
  const on = saved.has(item.id);
  return `<button type="button" class="icon-btn ${on ? "is-on" : ""}" data-save="${item.id}" aria-label="${on ? "Unsave" : "Save"} ${item.title}" aria-pressed="${on}">${icons.bookmark}</button>`;
}

function heartBtn(item) {
  const on = saved.has(item.id);
  return `<button type="button" class="icon-btn ${on ? "is-on" : ""}" data-save="${item.id}" aria-label="${on ? "Unsave" : "Save"} ${item.title}" aria-pressed="${on}">${icons.heart}</button>`;
}

function openAttr(item) {
  return `data-open="${item.id}" role="button" tabindex="0" aria-label="${item.action} ${item.title}"`;
}

function renderCard(option, item) {
  switch (option) {
    case 0:
      return `<article class="card cinema" ${openAttr(item)}>
        ${img(item)}
        <div class="cinema-scrim"></div>
        <span class="glass-chip">${item.overline}</span>
        ${saveBtn(item)}
        <div class="cinema-copy">
          <strong>${item.title}</strong>
          <span>${item.place} · ${item.stat}</span>
        </div>
      </article>`;
    case 1:
      return `<article class="card folio" ${openAttr(item)}>
        <header class="folio-run"><span>${item.kind}</span><span>${item.secondary}</span></header>
        <div class="folio-photo">${img(item)}</div>
        <div class="folio-copy">
          <p class="folio-kicker">${item.person}</p>
          <h3>${item.title}</h3>
          <p class="folio-meta">${item.place} — ${item.stat}</p>
          <span class="text-cta">${item.action} →</span>
        </div>
      </article>`;
    case 2:
      return `<article class="card pin" ${openAttr(item)}>
        <div class="pin-media">
          ${img(item)}
          <div class="pin-hover">
            ${saveBtn(item)}
            <span class="pin-cta">${item.action}</span>
          </div>
        </div>
        <div class="pin-caption">
          <strong>${item.title}</strong>
          <span>${item.person} · ${item.stat}</span>
        </div>
      </article>`;
    case 3:
      return `<article class="card ticket" ${openAttr(item)}>
        <div class="ticket-stub"><span>${item.kind}</span><b>${item.id.slice(0, 1).toUpperCase()}</b></div>
        <div class="ticket-body">
          <div class="ticket-stamp">${img(item)}${saveBtn(item)}</div>
          <div class="ticket-copy">
            <p class="ticket-code">${item.overline}</p>
            <h3>${item.title}</h3>
            <div class="ticket-rail">
              <span><small>From</small>${item.person}</span>
              <span><small>Where</small>${item.place}</span>
              <span><small>Hold</small>${item.stat}</span>
            </div>
          </div>
        </div>
      </article>`;
    case 4:
      return `<article class="card polaroid polaroid--${item.id}" ${openAttr(item)}>
        <div class="polaroid-tape"></div>
        <div class="polaroid-photo">${img(item)}</div>
        <p class="polaroid-caption">${item.title}</p>
        <p class="polaroid-sub">${item.person} · ${item.stat}</p>
      </article>`;
    case 5:
      return `<article class="card dock" ${openAttr(item)}>
        <div class="dock-photo">${img(item)}${heartBtn(item)}</div>
        <div class="dock-bar">
          <span><small>${item.kind}</small>${item.stat}</span>
          <span><small>Who</small>${item.person}</span>
          <span><small>Next</small>${item.action}</span>
        </div>
        <h3>${item.title}</h3>
      </article>`;
    case 6:
      return `<article class="card horizon" ${openAttr(item)}>
        <div class="horizon-photo">${img(item)}${heartBtn(item)}</div>
        <p class="horizon-loc">${icons.pin} ${item.place}</p>
        <h3>${item.title}</h3>
        <p class="horizon-meta">${item.overline} · ${item.stat} · ${item.secondary}</p>
      </article>`;
    case 7:
      return `<article class="card row" ${openAttr(item)}>
        <div class="row-thumb">${img(item)}</div>
        <div class="row-copy">
          <p class="row-kind">${item.kind}</p>
          <h3>${item.title}</h3>
          <p>${item.person} · ${item.stat}</p>
        </div>
        <button type="button" class="row-go" data-open="${item.id}">${item.action}</button>
      </article>`;
    case 8:
      return `<article class="card stack" ${openAttr(item)}>
        <div class="stack-pack" aria-hidden="true">
          <img src="${item.stack[1]}" alt="" />
          <img src="${item.stack[0]}" alt="" />
          ${img(item)}
        </div>
        <span class="stack-count">${item.stat}</span>
        <div class="stack-copy">
          <p>${item.kind} · ${item.overline}</p>
          <h3>${item.title}</h3>
        </div>
      </article>`;
    default:
      return `<article class="card reel" ${openAttr(item)}>
        ${img(item)}
        <div class="reel-scrim"></div>
        <span class="reel-time">${item.duration}</span>
        <span class="reel-play">${icons.play}</span>
        <div class="reel-foot">
          <span class="reel-avatar" style="background-image:url('${item.stack[0]}')"></span>
          <div>
            <strong>${item.title}</strong>
            <span>${item.person}</span>
          </div>
          ${saveBtn(item)}
        </div>
      </article>`;
  }
}

function renderOptions() {
  optionList.innerHTML = options
    .map(
      (option, index) => `<button type="button" class="option ${index === active ? "is-active" : ""}" role="tab" aria-selected="${index === active}" data-option="${index}">
        <span>${option.id}</span><b>${option.name}</b><small>${option.note}</small>
      </button>`,
    )
    .join("");
}

function render() {
  const option = options[active];
  document.querySelector("#option-count").textContent = `${option.id} / 10`;
  document.querySelector("#preview-kicker").textContent = `Direction ${option.id} · ${option.note}`;
  document.querySelector("#preview-title").textContent = option.name;
  document.querySelector("#preview-rationale").textContent = option.rationale;
  document.querySelector("#preview-inspired").textContent = option.inspired;
  document.querySelector("#preview-best-for").innerHTML = option.best;
  stage.className = `preview-stage theme-${active + 1}`;
  const layout = active === 7 ? "stage-list" : "stage-trio";
  stage.innerHTML = `<div class="${layout}">${items.map((item) => renderCard(active, item)).join("")}</div>`;
  renderOptions();
  setQuery();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-on");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-on"), 1600);
}

function openItem(id) {
  const item = items.find((entry) => entry.id === id);
  if (item) showToast(`${item.action}: ${item.title}`);
}

optionList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-option]");
  if (!button) return;
  active = Number(button.dataset.option);
  render();
});

stage.addEventListener("click", (event) => {
  const save = event.target.closest("[data-save]");
  if (save) {
    event.stopPropagation();
    const id = save.dataset.save;
    if (saved.has(id)) saved.delete(id);
    else saved.add(id);
    render();
    showToast(saved.has(id) ? "Saved to library" : "Removed from saved");
    return;
  }
  const open = event.target.closest("[data-open]");
  if (open) openItem(open.dataset.open);
});

stage.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const open = event.target.closest("[data-open]");
  if (!open) return;
  event.preventDefault();
  openItem(open.dataset.open);
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
