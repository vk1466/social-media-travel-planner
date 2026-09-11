const tile = (i, extra = "") => `<i class="tile t${(i % 12) + 1} ${extra}"></i>`;
const tiles = (n, start = 1, extra = "") =>
  Array.from({ length: n }, (_, i) => tile(start + i, extra)).join("");

const concepts = [
  {
    name: "Month rails",
    tag: "Your idea",
    inspired: "Netflix / Spotify rows",
    note: "Vertical time, one month per row, posts scroll sideways. Cap each row (~12) then See all. Best default if you want recency without a 1,000-card wall.",
    markup: `
      <div class="archive rails">
        ${["September 2026 · 18", "August 2026 · 41", "July 2026 · 9"].map(
          (label, row) => `
          <section class="rail">
            <div class="rail-head"><b>${label.split(" · ")[0]}</b><small>${label.split(" · ")[1]} saves</small><a>See all →</a></div>
            <div class="rail-track">${tiles(9, row * 3, "portrait")}${tile(row, "peek")}</div>
          </section>`,
        ).join("")}
      </div>`,
  },
  {
    name: "Justified timeline",
    tag: "Proven",
    inspired: "Google Photos / Immich",
    note: "One continuous scroll. Sticky month headers, justified rows that keep aspect ratios, and a right-edge date scrubber for jumping years.",
    markup: `
      <div class="archive photos">
        <aside class="scrubber"><span>2026</span><b>Sep</b><span>Aug</span><span>Jul</span><span>Jun</span><span>2025</span></aside>
        <div>
          <p class="sticky">September 2026</p>
          <div class="justified">${tiles(7, 1, "j")}</div>
          <p class="sticky">August 2026</p>
          <div class="justified">${tiles(11, 4, "j")}</div>
        </div>
      </div>`,
  },
  {
    name: "Year zoom",
    tag: "Scale",
    inspired: "Apple Photos / Noodle Gallery",
    note: "Years → Months → All. A decade of saves becomes 4 year covers. Tap a year to zoom into months, then into the dense grid, without losing place.",
    markup: `
      <div class="archive zoom">
        <div class="zoom-switch"><button>Years</button><button class="on">Months</button><button>All</button></div>
        <div class="year-grid">
          ${["Sep 26", "Aug 26", "Jul 26", "Jun 26", "May 26", "Apr 26"].map(
            (m, i) => `<figure class="year-card">${tile(i, "fill")}<figcaption>${m}<small>${[18, 41, 9, 22, 14, 7][i]}</small></figcaption></figure>`,
          ).join("")}
        </div>
      </div>`,
  },
  {
    name: "Collections hub",
    tag: "Entry",
    inspired: "iOS Photos Collections",
    note: "Do not land in the full archive. Land on auto-rows: Just saved, Creators, Trips, Recipes, Unwatched. Each row is a doorway, not the whole library.",
    markup: `
      <div class="archive hub">
        ${[
          ["Just saved", 8],
          ["Kyoto · Lisbon · Paris", 6],
          ["Creators you follow", 7],
        ].map(
          ([title, n], i) => `
          <section class="hub-row">
            <div class="rail-head"><b>${title}</b><a>Open →</a></div>
            <div class="rail-track wide">${tiles(n, i * 2, i === 1 ? "square" : "portrait")}</div>
          </section>`,
        ).join("")}
      </div>`,
  },
  {
    name: "Masonry moodboard",
    tag: "Visual",
    inspired: "Pinterest / Cosmos / Savee",
    note: "Uneven heights, image-first, weak on dates. Use after a filter (one place, one cuisine) when the job is scanning covers, not reconstructing when you saved them.",
    markup: `
      <div class="archive masonry">
        ${[140, 200, 110, 170, 90, 210, 150, 120, 180, 100, 160, 130].map(
          (h, i) => `<i class="pin t${(i % 12) + 1}" style="height:${h}px"></i>`,
        ).join("")}
      </div>`,
  },
  {
    name: "Channel walls",
    tag: "Intentional",
    inspired: "Are.na",
    note: "Saves live in named channels you keep: Japan 2027, Weeknight noodles, Miyazaki. Time is gone. Best when people already think in projects, not recency.",
    markup: `
      <div class="archive channels">
        ${[
          ["Japan 2027", 24, 1],
          ["Weeknight noodles", 11, 4],
          ["Studio Ghibli shelf", 8, 7],
          ["Lisbon weekend", 6, 2],
        ].map(
          ([name, n, s]) => `
          <article class="channel">
            <div class="channel-mosaic">${tiles(4, s, "tiny")}</div>
            <b>${name}</b>
            <small>${n} blocks</small>
          </article>`,
        ).join("")}
        <article class="channel add"><span>+</span><b>New channel</b></article>
      </div>`,
  },
  {
    name: "Four views, one set",
    tag: "Flexible",
    inspired: "Raindrop.io",
    note: "Same filtered set, four renderings: covers, headlines, masonry, compact list. Power users switch density. Casual users stay on covers.",
    markup: `
      <div class="archive raindrop">
        <div class="view-switch"><button class="on">Covers</button><button>Headlines</button><button>Masonry</button><button>List</button></div>
        <div class="cover-grid">${tiles(12, 1, "square")}</div>
      </div>`,
  },
  {
    name: "Save diary",
    tag: "Log",
    inspired: "Letterboxd diary",
    note: "A ledger: date, thumb, title, place. Extremely scannable at 1,000 items if people remember when they saved something. Weak for visual browsing.",
    markup: `
      <div class="archive diary">
        ${[
          ["10 Sep", "A quiet morning in Gion", "Kyoto"],
          ["10 Sep", "Three pastel bakeries", "Lisbon"],
          ["9 Sep", "Neighborhood wine list", "Paris"],
          ["8 Sep", "Onsen day from the reel", "Hakone"],
          ["7 Sep", "Late noodles in Shinjuku", "Tokyo"],
          ["6 Sep", "Coast road pull-offs", "Algarve"],
        ].map(
          ([d, t, p], i) => `
          <article class="diary-row">
            <time>${d}</time>
            ${tile(i, "diary")}
            <div><b>${t}</b><small>${p} · Instagram</small></div>
          </article>`,
        ).join("")}
      </div>`,
  },
  {
    name: "Poster wall",
    tag: "Dense",
    inspired: "Letterboxd / VSCO",
    note: "Equal tiles, no grouping, maximum density. Works once a filter has cut the set to under ~80. Do not use as the unfiltered home of 1,000 saves.",
    markup: `<div class="archive poster">${tiles(24, 1, "poster")}</div>`,
  },
  {
    name: "Similarity clusters",
    tag: "Find",
    inspired: "Cosmos visual search",
    note: "Group by look-alike covers, dominant color, or overlapping places. A way to stumble on “more like this Kyoto alley” without typing.",
    markup: `
      <div class="archive clusters">
        ${["Warm interiors", "Coast light", "Night streets"].map(
          (title, i) => `
          <section>
            <div class="rail-head"><b>${title}</b><small>visually close</small></div>
            <div class="cluster">${tiles(5, i * 3, "cluster")}</div>
          </section>`,
        ).join("")}
      </div>`,
  },
  {
    name: "Map + filmstrip",
    tag: "Travel",
    inspired: "Photos Trips / Immich map",
    note: "Map owns the page; a time filmstrip along the bottom. Click a pin to filter the strip. Posts that have no place sit in an Ungrounded tray.",
    markup: `
      <div class="archive mapstrip">
        <div class="map">
          <span class="pin" style="left:28%;top:42%"></span>
          <span class="pin" style="left:61%;top:33%"></span>
          <span class="pin on" style="left:72%;top:48%"></span>
          <span class="pin" style="left:44%;top:62%"></span>
          <div class="map-label">Kyoto · 11 saves</div>
        </div>
        <div class="filmstrip">${tiles(10, 2, "strip")}</div>
      </div>`,
  },
  {
    name: "Creator shelves",
    tag: "People",
    inspired: "Spotify artist rows",
    note: "Vertical axis is who you save from, not when. Strong if a few handles dominate the library. Weak if every save is from a different stranger.",
    markup: `
      <div class="archive rails">
        ${["@onigiriwalks · 22", "@lisboakitchens · 14", "@nighttrainfilms · 9"].map(
          (label, row) => `
          <section class="rail">
            <div class="rail-head"><b>${label.split(" · ")[0]}</b><small>${label.split(" · ")[1]}</small></div>
            <div class="rail-track">${tiles(8, row * 4, "portrait")}</div>
          </section>`,
        ).join("")}
      </div>`,
  },
  {
    name: "Trip chapters",
    tag: "Story",
    inspired: "Photos Memories + your places",
    note: "Cluster saves that share a city/country into a chapter with a cover and a count. Time still orders chapters. Better than raw months when a trip spanned two calendar months.",
    markup: `
      <div class="archive chapters">
        ${[
          ["Kyoto in September", "11 saves · 4 places"],
          ["Lisbon long weekend", "7 saves · 6 places"],
          ["Unplaced this month", "9 saves"],
        ].map(
          ([t, m], i) => `
          <article class="chapter">
            ${tile(i + 2, "hero")}
            <div><b>${t}</b><small>${m}</small></div>
            <div class="chapter-thumbs">${tiles(4, i * 3, "tiny")}</div>
          </article>`,
        ).join("")}
      </div>`,
  },
  {
    name: "Inbox then archive",
    tag: "Practical",
    inspired: "Apple Recently Saved",
    note: "Last 14 days as large cards (the working set). Everything older collapses to month chips. Stops the archive from competing with “what I just dumped in.”",
    markup: `
      <div class="archive inbox">
        <p class="section-label">This week</p>
        <div class="inbox-large">${tiles(4, 1, "large")}</div>
        <p class="section-label">Earlier</p>
        <div class="month-chips">
          ${["Aug 41", "Jul 9", "Jun 22", "May 14", "2025 61"].map((c) => `<button>${c}</button>`).join("")}
        </div>
      </div>`,
  },
  {
    name: "Magazine issues",
    tag: "Editorial",
    inspired: "Print almanac / Are.na editorial",
    note: "Each month is an issue: one hero, a contents line, then a spread. Beautiful, slow. Use for a “look back” mode, not daily retrieval.",
    markup: `
      <div class="archive magazine">
        <article class="issue">
          ${tile(3, "issue-hero")}
          <div class="issue-copy">
            <small>Issue 09 · September 2026</small>
            <h3>Eighteen saves, mostly Japan</h3>
            <ol>
              <li>Gion before the tour groups</li>
              <li>Onsen day from a 42-second reel</li>
              <li>Shinjuku noodles after midnight</li>
            </ol>
          </div>
        </article>
      </div>`,
  },
  {
    name: "Book spine",
    tag: "Jump",
    inspired: "Address-book index + Photos scrubber",
    note: "Left: years and months as a permanent spine. Right: the open month’s grid. Fast jumping, no nested horizontal scroll. Excellent on desktop, cramped on phone.",
    markup: `
      <div class="archive spine">
        <nav>
          <b>2026</b>
          <button class="on">Sep</button><button>Aug</button><button>Jul</button><button>Jun</button>
          <b>2025</b>
          <button>Dec</button><button>Nov</button>
        </nav>
        <div class="spine-grid">${tiles(15, 1, "square")}</div>
      </div>`,
  },
  {
    name: "Facet river",
    tag: "Original",
    inspired: "Netflix rows, but topic not time",
    note: "Same row mechanic as month rails, but rows are Kyoto / Ramen / Ghibli / Unplaced. Time becomes a sort inside the row. Often a better primary axis than the calendar for this product.",
    markup: `
      <div class="archive rails">
        ${["Kyoto · 11", "Ramen & late bowls · 8", "Ghibli & animation · 6"].map(
          (label, row) => `
          <section class="rail">
            <div class="rail-head"><b>${label.split(" · ")[0]}</b><small>${label.split(" · ")[1]}</small><a>See all →</a></div>
            <div class="rail-track">${tiles(8, row * 2 + 1, "portrait")}</div>
          </section>`,
        ).join("")}
      </div>`,
  },
  {
    name: "Heat calendar",
    tag: "Overview",
    inspired: "GitHub contribution graph",
    note: "A year of save-density at a glance. Click a day or week to load that slice. Superb overview, useless as the only browse surface — pair with a grid below.",
    markup: `
      <div class="archive heat">
        <div class="heat-grid">
          ${Array.from({ length: 84 }, (_, i) => `<i class="cell c${(i * 7) % 5}"></i>`).join("")}
        </div>
        <p class="heat-caption">Sep 10 · 3 saves</p>
        <div class="heat-day">${tiles(3, 5, "square")}</div>
      </div>`,
  },
  {
    name: "Fanned month decks",
    tag: "Peek",
    inspired: "Your old lantern eras",
    note: "Each month is a stacked fan of covers. Hover or tap to explode into a row. More compact than rails, more playful than accordions. Easy to get cute and slow.",
    markup: `
      <div class="archive fans">
        ${["September", "August", "July"].map(
          (m, i) => `
          <section class="fan ${i === 0 ? "is-open" : ""}">
            <b>${m}</b>
            <div class="fan-stack">${tiles(5, i * 2, "fan")}</div>
          </section>`,
        ).join("")}
      </div>`,
  },
  {
    name: "Split inspector",
    tag: "Work",
    inspired: "Eagle / Finder column view",
    note: "Dense thumbs on the left, persistent detail on the right. Keyboard up/down. The fastest retrieval UI, the least “inspiration wall.” Pair with search.",
    markup: `
      <div class="archive inspector">
        <div class="inspector-grid">${tiles(20, 1, "tiny")}</div>
        <aside>
          ${tile(3, "inspect-hero")}
          <b>A quiet morning in Gion</b>
          <small>@onigiriwalks · 10 Sep · Kyoto</small>
          <p>Three temples before 9am, then coffee in the opposite direction of the crowd.</p>
        </aside>
      </div>`,
  },
];

const nav = document.getElementById("options");
const demo = document.getElementById("archive-demo");
const numberEl = document.getElementById("option-number");
const nameEl = document.getElementById("option-name");
const noteEl = document.getElementById("option-note");

let index = 0;

function render(next) {
  index = (next + concepts.length) % concepts.length;
  const concept = concepts[index];
  numberEl.textContent = `Option ${String(index + 1).padStart(2, "0")}`;
  nameEl.textContent = concept.name;
  noteEl.innerHTML = `<strong>${concept.inspired}</strong> — ${concept.note}`;
  demo.innerHTML = concept.markup;
  [...nav.children].forEach((btn, i) => btn.classList.toggle("is-active", i === index));
}

concepts.forEach((concept, i) => {
  const button = document.createElement("button");
  button.type = "button";
  button.innerHTML = `<span>${String(i + 1).padStart(2, "0")}</span><b>${concept.name}</b><small>${concept.tag}</small>`;
  button.addEventListener("click", () => render(i));
  nav.append(button);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") render(index + 1);
  if (event.key === "ArrowLeft") render(index - 1);
});

render(0);
