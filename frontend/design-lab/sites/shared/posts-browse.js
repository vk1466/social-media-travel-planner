/**
 * Interactive posts library — same patterns as production PostLibrary:
 * platform pills, search, place rings, month eras, deck/grid lattice.
 */

import { PLATFORMS, openClerkSignIn } from "./api.js";

const MAX_PLACE_RINGS = 9;
const ERA_PREVIEW_FRAMES = 8;
const FALLBACK_HUES = [152, 28, 205, 168, 42];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function thumbStyle(post, index) {
  if (post.thumbnailUrl) {
    return `background-image:url('${String(post.thumbnailUrl).replace(/'/g, "%27")}')`;
  }
  const hue = FALLBACK_HUES[index % FALLBACK_HUES.length];
  return `background-image:linear-gradient(145deg, hsl(${hue} 28% 42%), hsl(${hue + 30} 18% 22%))`;
}

function groupByMonth(posts) {
  const groups = new Map();
  for (const post of posts) {
    const existing = groups.get(post.monthKey);
    if (existing) {
      existing.posts.push(post);
    } else {
      groups.set(post.monthKey, {
        key: post.monthKey,
        label: post.monthLabel,
        posts: [post],
      });
    }
  }
  return Array.from(groups.values()).sort((a, b) => {
    if (a.key === "unknown") return 1;
    if (b.key === "unknown") return -1;
    return b.key.localeCompare(a.key);
  });
}

function buildPlaceRings(posts) {
  const tally = new Map();
  for (const post of posts) {
    if (post.placeIds?.length) {
      post.placeIds.forEach((placeId, i) => {
        const key = `id:${placeId}`;
        const label = post.placeNames[i] || post.placeNames[0] || placeId;
        const existing = tally.get(key);
        if (existing) existing.count += 1;
        else tally.set(key, { label, placeId, count: 1, cover: post });
      });
    } else {
      const names = post.placeNames?.length ? post.placeNames : ["Unplaced"];
      for (const name of names) {
        const key = `name:${name}`;
        const existing = tally.get(key);
        if (existing) existing.count += 1;
        else tally.set(key, { label: name, placeId: null, count: 1, cover: post });
      }
    }
  }
  const ranked = Array.from(tally.entries())
    .sort((a, b) => b[1].count - a[1].count || a[1].label.localeCompare(b[1].label))
    .slice(0, MAX_PLACE_RINGS);
  const peak = Math.max(...ranked.map(([, e]) => e.count), 1);
  return [
    {
      key: "all",
      label: "All saves",
      placeId: null,
      count: posts.length,
      cover: posts[0] || null,
      share: 1,
    },
    ...ranked.map(([key, entry]) => ({
      key,
      label: entry.label,
      placeId: entry.placeId,
      count: entry.count,
      cover: entry.cover,
      share: entry.count / peak,
    })),
  ];
}

function filterPosts(posts, { platform, ringKey, query }) {
  let list = posts;
  if (platform !== "all") {
    list = list.filter((p) => p.platform === platform);
  }
  if (ringKey !== "all") {
    list = list.filter((post) => {
      if (ringKey.startsWith("id:")) {
        return (post.placeIds || []).includes(ringKey.slice(3));
      }
      if (ringKey.startsWith("name:")) {
        const name = ringKey.slice(5);
        if (name === "Unplaced") {
          return !(post.placeIds || []).length && !(post.placeNames || []).length;
        }
        return (post.placeNames || []).includes(name);
      }
      return false;
    });
  }
  const needle = query.trim().toLowerCase();
  if (needle) {
    list = list.filter((post) => {
      if (post.title.toLowerCase().includes(needle)) return true;
      if (post.description.toLowerCase().includes(needle)) return true;
      if ((post.placeNames || []).some((n) => n.toLowerCase().includes(needle))) return true;
      if ((post.tags || []).some((t) => t.toLowerCase().includes(needle))) return true;
      return false;
    });
  }
  return list;
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   theme: 'voyager' | 'almanac' | 'memo',
 *   posts: object[],
 *   usingLiveData: boolean,
 *   authState?: string,
 *   postHref?: (post) => string,
 *   placeHref?: (placeId: string) => string,
 * }} options
 */
export function mountPostsBrowse(root, options) {
  const {
    theme,
    posts: allPosts,
    usingLiveData,
    authState = usingLiveData ? "signed-in" : "signed-out",
    postHref = (post) => `post.html?id=${encodeURIComponent(post.key)}`,
    placeHref = (placeId) => `place.html?id=${encodeURIComponent(placeId)}`,
  } = options;

  const state = {
    platform: "all",
    ringKey: "all",
    query: "",
    deckMode: "deck",
    openEraKey: null,
  };

  function platformPosts() {
    if (state.platform === "all") return allPosts;
    return allPosts.filter((p) => p.platform === state.platform);
  }

  function render() {
    const scoped = platformPosts();
    const rings = buildPlaceRings(scoped);
    if (!rings.some((r) => r.key === state.ringKey)) {
      state.ringKey = "all";
    }
    const filtered = filterPosts(allPosts, state);
    const eras = groupByMonth(filtered);
    if (state.openEraKey === null && eras[0]) {
      state.openEraKey = eras[0].key;
    }
    if (
      state.openEraKey &&
      state.openEraKey !== "" &&
      !eras.some((e) => e.key === state.openEraKey)
    ) {
      state.openEraKey = eras[0]?.key ?? "";
    }
    const openLabel =
      eras.find((e) => e.key === state.openEraKey)?.label || "All months";

    const classicLink =
      `<p class="wf-posts-classic-link">Also see the <a href="posts-classic.html">original grid demo</a></p>`;
    const banner =
      usingLiveData
        ? `<div class="wf-posts-banner"><span><strong>Live library</strong> · TravelPlanner-dev</span></div>${classicLink}`
        : `<div class="wf-posts-banner">
            <span><strong>Sample data</strong> · ${
              authState === "error"
                ? "Could not reach the API — showing mock saves."
                : "Sign in with the same Clerk account as the app to load your saves."
            }</span>
            <button type="button" data-action="sign-in">Sign in</button>
          </div>${classicLink}`;

    root.className = `wf-posts wf-posts--${theme}`;
    root.dataset.mode = state.deckMode;
    root.innerHTML = `
      <div class="wf-posts-wrap">
        <div class="wf-posts-masthead">
          <div>
            <p class="wf-posts-eyebrow">Your library</p>
            <h1 class="wf-posts-title">Saves</h1>
            <p class="wf-posts-lede">
              Every reel, short, and post you've kept — grouped by the month you saved it and the places inside it.
            </p>
          </div>
          <div class="wf-posts-count">
            <span class="wf-posts-count-value">${filtered.length}</span>
            <span class="wf-posts-count-label">saves</span>
          </div>
        </div>
        ${banner}
      </div>

      <div class="wf-posts-bar">
        <div class="wf-posts-wrap wf-posts-bar-inner">
          <p class="wf-posts-context">${escapeHtml(openLabel)}</p>
          <div class="wf-posts-seg" role="group" aria-label="Layout">
            <button type="button" data-mode="deck" class="${state.deckMode === "deck" ? "is-active" : ""}">Deck</button>
            <button type="button" data-mode="grid" class="${state.deckMode === "grid" ? "is-active" : ""}">Grid</button>
          </div>
        </div>
      </div>

      <div class="wf-posts-wrap">
        <div class="wf-posts-facets">
          <div class="wf-posts-facet-row" role="tablist" aria-label="Platform filter">
            <span class="wf-posts-facet-label">Platform</span>
            ${PLATFORMS.map(
              (p) => `
              <button type="button" role="tab" class="wf-posts-pill ${state.platform === p ? "is-active" : ""}" data-platform="${p}" aria-selected="${state.platform === p}">
                ${p}
              </button>`,
            ).join("")}
          </div>
          <div class="wf-posts-facet-row">
            <span class="wf-posts-facet-label">Search</span>
            <label class="wf-posts-search">
              <input type="search" value="${escapeHtml(state.query)}" placeholder="Title, place, tag…" aria-label="Search saves" data-search />
            </label>
          </div>
        </div>

        <div class="wf-posts-body">
          ${
            allPosts.length === 0
              ? `<div class="wf-posts-empty"><p>No saves yet. Paste a link from Add.</p></div>`
              : `
            <div class="wf-posts-rings" role="tablist" aria-label="Place filter">
              ${rings
                .map(
                  (ring, index) => `
                <button type="button" role="tab" class="wf-posts-ring ${state.ringKey === ring.key ? "is-active" : ""}"
                  style="--share:${ring.share}" data-ring="${escapeHtml(ring.key)}" aria-selected="${state.ringKey === ring.key}">
                  <span class="wf-posts-ring-halo">
                    <span class="wf-posts-ring-thumb" style="${ring.cover ? thumbStyle(ring.cover, index) : ""}"></span>
                  </span>
                  ${
                    ring.placeId
                      ? `<a class="wf-posts-ring-label" href="${placeHref(ring.placeId)}" data-place-link>${escapeHtml(ring.label)}</a>`
                      : `<span class="wf-posts-ring-label">${escapeHtml(ring.label)}</span>`
                  }
                  <span class="wf-posts-ring-count">${ring.count}</span>
                </button>`,
                )
                .join("")}
            </div>
            ${
              filtered.length === 0
                ? `<p class="wf-posts-empty">No posts in this filter.</p>`
                : `<div class="wf-posts-timeline">
                    ${eras
                      .map((era) => {
                        const open = state.openEraKey === era.key;
                        return `
                        <section class="wf-posts-era ${open ? "is-open" : ""}" data-era="${escapeHtml(era.key)}">
                          <button type="button" class="wf-posts-era-head" aria-expanded="${open}" data-era-toggle="${escapeHtml(era.key)}">
                            <span class="wf-posts-era-pin" aria-hidden="true"></span>
                            <span class="wf-posts-era-label">${escapeHtml(era.label)}</span>
                            <span class="wf-posts-era-count">${era.posts.length} save${era.posts.length === 1 ? "" : "s"}</span>
                            <span class="wf-posts-era-strip" aria-hidden="true">
                              ${era.posts
                                .slice(0, ERA_PREVIEW_FRAMES)
                                .map(
                                  (post, i) =>
                                    `<span class="wf-posts-era-frame" style="${thumbStyle(post, i)}"></span>`,
                                )
                                .join("")}
                            </span>
                            <span class="wf-posts-era-chevron" aria-hidden="true"></span>
                          </button>
                          ${
                            open
                              ? `<div class="wf-posts-lattice" aria-label="${escapeHtml(era.label)} saves">
                                  ${era.posts
                                    .map((post, index) => {
                                      const chips = (post.placeIds || [])
                                        .slice(0, 2)
                                        .map((id, i) => ({
                                          placeId: id,
                                          name: post.placeNames[i] || post.placeNames[0] || id,
                                        }));
                                      return `
                                      <a class="wf-posts-tile" href="${postHref(post)}" style="--i:${index}">
                                        <span class="wf-posts-tile-thumb" style="${thumbStyle(post, index)}" aria-hidden="true"></span>
                                        <span class="wf-posts-tile-veil" aria-hidden="true"></span>
                                        <span class="wf-posts-tile-copy">
                                          <span class="wf-posts-tile-title">${escapeHtml(post.title)}</span>
                                          <span class="wf-posts-tile-reveal">
                                            <span class="wf-posts-tile-desc">${escapeHtml(post.description)}</span>
                                            <span class="wf-posts-tile-meta">
                                              <span>${escapeHtml(post.platformLabel)}</span>
                                              ${
                                                chips.length
                                                  ? `<span>${chips
                                                      .map(
                                                        (c) =>
                                                          `<span class="wf-posts-chip">${escapeHtml(c.name)}</span>`,
                                                      )
                                                      .join("")}</span>`
                                                  : post.placeCount > 0
                                                    ? `<span>${post.placeCount} place${post.placeCount === 1 ? "" : "s"}</span>`
                                                    : ""
                                              }
                                              <span>${escapeHtml(post.dateLabel)}</span>
                                            </span>
                                          </span>
                                        </span>
                                      </a>`;
                                    })
                                    .join("")}
                                </div>`
                              : ""
                          }
                        </section>`;
                      })
                      .join("")}
                  </div>`
            }`}
        </div>
      </div>
    `;

    bind();
  }

  function bind() {
    root.querySelectorAll("[data-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.deckMode = btn.getAttribute("data-mode");
        render();
      });
    });
    root.querySelectorAll("[data-platform]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.platform = btn.getAttribute("data-platform");
        state.openEraKey = null;
        render();
      });
    });
    root.querySelectorAll("[data-ring]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        if (event.target.closest("[data-place-link]")) return;
        state.ringKey = btn.getAttribute("data-ring");
        state.openEraKey = null;
        render();
      });
    });
    root.querySelectorAll("[data-era-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-era-toggle");
        state.openEraKey = state.openEraKey === key ? "" : key;
        render();
      });
    });
    const search = root.querySelector("[data-search]");
    if (search) {
      search.addEventListener("input", () => {
        state.query = search.value;
        state.openEraKey = null;
        clearTimeout(search._t);
        search._t = setTimeout(() => {
          const caret = search.selectionStart;
          render();
          const next = root.querySelector("[data-search]");
          if (next) {
            next.focus();
            try {
              next.setSelectionRange(caret, caret);
            } catch {
              /* ignore */
            }
          }
        }, 120);
      });
    }
    const signIn = root.querySelector('[data-action="sign-in"]');
    if (signIn) {
      signIn.addEventListener("click", () => openClerkSignIn());
    }
  }

  render();
}
