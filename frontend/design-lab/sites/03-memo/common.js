/**
 * Memo (site 03) — shared chrome + page renderers.
 * Every page in 03-memo/ sets window.WF_SITE, includes mock.js + this file,
 * then calls the appropriate render function against #app.
 */
(function () {
  const M = window.WF_MOCK;
  if (!M) return;

  const icon = {
    search:
      '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    heart:
      '<svg viewBox="0 0 24 24"><path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z"/></svg>',
    arrow:
      '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-5.3-7-11a7 7 0 1 1 14 0c0 5.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    check:
      '<svg viewBox="0 0 24 24"><path d="M5 12l4.5 4.5L19 7"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    compass:
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M14.5 9.5l-2 5-5 2 2-5 5-2z"/></svg>',
    key: '<svg viewBox="0 0 24 24"><circle cx="8" cy="15" r="4"/><path d="M11 13l8-8M16 5l3 3"/></svg>',
    crown:
      '<svg viewBox="0 0 24 24"><path d="M3 18l2-10 5 4 2-6 2 6 5-4 2 10H3z"/></svg>',
    globe:
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  };

  const platformLabel = {
    instagram: "Instagram",
    tiktok: "TikTok",
    youtube: "YouTube",
    web: "Web",
    reddit: "Reddit",
  };

  const currentPage = () => (window.WF_SITE && window.WF_SITE.page) || "home";

  function renderChrome() {
    const p = currentPage();
    return `
      <header class="m-chrome">
        <div class="m-chrome-inner">
          <a href="index.html" class="m-logo">
            <span class="m-logo-mark">M</span>
            Memo
          </a>
          <nav class="m-nav">
            <a href="index.html" ${p === "home" ? 'aria-current="page"' : ""}>Discover</a>
            <a href="posts.html" ${p === "posts" ? 'aria-current="page"' : ""}>Collection</a>
            <a href="places.html" ${p === "places" ? 'aria-current="page"' : ""}>Residences</a>
            <a href="history.html" ${p === "history" ? 'aria-current="page"' : ""}>Journal</a>
          </nav>
          <div class="m-chrome-actions">
            <a href="search.html" class="m-icon-btn" aria-label="Search">${icon.search}</a>
            <a href="add.html" class="m-btn primary">Add a link ${icon.plus}</a>
          </div>
        </div>
      </header>
    `;
  }

  function renderFooter() {
    return `
      <footer class="m-footer">
        <div class="m-wrap">
          <div class="m-book">
            <h4>Begin your private atlas</h4>
            <form onsubmit="event.preventDefault(); location.href='add.html';">
              <input type="text" placeholder="Paste an Instagram, TikTok, or YouTube link" />
              <button class="m-btn primary" type="submit">Add ${icon.arrow}</button>
            </form>
          </div>
          <div class="m-footer-grid">
            <div>
              <div class="m-footer-brand">Wander<span>file</span></div>
              <p>A quiet house for the places you keep saving — curated like a private travel atelier.</p>
            </div>
            <div class="m-footer-col">
              <h5>Explore</h5>
              <a href="index.html">Discover</a>
              <a href="posts.html">The Collection</a>
              <a href="places.html">Residences</a>
              <a href="history.html">Journal</a>
            </div>
            <div class="m-footer-col">
              <h5>Atelier</h5>
              <a href="add.html">Add a link</a>
              <a href="search.html">Search</a>
              <a href="places.html?status=wishlist">Wishlist</a>
              <a href="places.html?status=visited">Visited</a>
            </div>
            <div class="m-footer-col">
              <h5>House</h5>
              <a href="#story">Our story</a>
              <a href="posts.html">Saved reels</a>
              <a href="places.html">Atlas</a>
              <a href="add.html">Concierge</a>
            </div>
          </div>
          <div class="m-footer-base">
            <span>© 2026 Memo · Wanderfile</span>
            <span>Dark luxury travel house</span>
          </div>
        </div>
      </footer>
    `;
  }

  // ---------- HOME -----------------------------------------------------

  function renderHome() {
    const featured = [
      M.placeById("kyoto"),
      M.placeById("cappadocia"),
      M.placeById("santorini"),
      M.placeById("patagonia") || M.placeById("torres-del-paine"),
    ]
      .filter(Boolean)
      .slice(0, 4);
    const cats = M.categories.slice(0, 5);

    return `
      ${renderChrome()}

      <section class="m-hero">
        <div class="m-hero-img" style="background-image:url('${M.img("santoriniSunset", 1800, 1100)}')"></div>
        <div class="m-hero-inner">
          <p class="m-eyebrow">Private travel atelier</p>
          <div class="m-hero-rule"></div>
          <h1>Where the Horizon Meets <em>Perfection</em></h1>
          <p class="m-hero-lead">
            Paste any reel, TikTok, or YouTube link — Memo reads the caption, audio, and
            on-screen text, then files each place into a quiet, cinematic atlas.
          </p>
          <div class="m-hero-actions">
            <a href="add.html" class="m-btn primary">Paste a link ${icon.arrow}</a>
            <a href="places.html" class="m-btn ghost">View residences</a>
          </div>
        </div>
      </section>

      <section class="m-cred" aria-label="Credentials">
        <div class="m-cred-item">
          <div class="m-cred-icon">${icon.compass}</div>
          <h3>Curated saves</h3>
          <p>Every reel is read for places worth going — never noise.</p>
        </div>
        <div class="m-cred-item">
          <div class="m-cred-icon">${icon.globe}</div>
          <h3>Global atlas</h3>
          <p>Geocoded residences across continents, filed with care.</p>
        </div>
        <div class="m-cred-item">
          <div class="m-cred-icon">${icon.key}</div>
          <h3>Private house</h3>
          <p>Your library stays yours — no marketers, no feeds.</p>
        </div>
        <div class="m-cred-item">
          <div class="m-cred-icon">${icon.crown}</div>
          <h3>Concierge ingest</h3>
          <p>Paste once. Captions, OCR, and audio become places.</p>
        </div>
      </section>

      <section class="m-section">
        <div class="m-wrap">
          <div class="m-section-head">
            <div>
              <p class="m-eyebrow">Global Residences</p>
              <h2>Destinations kept like <em>private estates.</em></h2>
            </div>
            <a class="m-btn" href="places.html">All residences</a>
          </div>
          <div class="m-res-grid">
            ${featured
              .map(
                (p) => `
              <a class="m-res-card" href="place.html?id=${p.id}">
                <div class="m-res-img" style="background-image:url('${p.hero}')"></div>
                <div class="m-res-body">
                  <p class="m-eyebrow">${p.country}</p>
                  <p class="m-res-name">${p.name}</p>
                  <p class="m-res-meta">${p.postCount} saves · ${p.continent}</p>
                </div>
              </a>`,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="m-section panel">
        <div class="m-wrap">
          <div class="m-section-head">
            <div>
              <p class="m-eyebrow">The Collection</p>
              <h2>Rooms for <em>every kind</em> of traveler.</h2>
            </div>
          </div>
          <div class="m-col-grid">
            ${cats
              .map(
                (c) => `
              <a class="m-col-card" href="places.html?type=${c.key}">
                <div class="m-col-img" style="background-image:url('${c.cover}')"></div>
                <div class="m-col-body">
                  <p class="m-eyebrow">${c.icon || "Suite"}</p>
                  <p class="m-col-name">${c.label}</p>
                </div>
              </a>`,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="m-section" id="story">
        <div class="m-wrap">
          <div class="m-story">
            <div class="m-story-copy">
              <p class="m-eyebrow">Our Story</p>
              <h2>A house built for the places you almost forget.</h2>
              <p>
                Memo began as a private filing system for travel inspiration — the reels you
                save at midnight, the places you mean to go. We read captions, on-screen text,
                and audio so each save becomes a residence on your map.
              </p>
              <p>
                No algorithmic feed. No sponsored itineraries. Just a dark, quiet room for the
                world you keep collecting.
              </p>
              <ul class="m-story-stats">
                <li><strong>${M.stats.posts}</strong><span>Saves filed</span></li>
                <li><strong>${M.stats.places}</strong><span>Residences</span></li>
                <li><strong>${M.stats.countries}</strong><span>Countries</span></li>
              </ul>
            </div>
            <div class="m-story-visual">
              <div style="background-image:url('${M.img("amalfiPositano", 900, 1100)}')"></div>
            </div>
          </div>
        </div>
      </section>

      ${renderFooter()}
    `;
  }

  // ---------- POSTS ----------------------------------------------------

  function renderPosts() {
    return `
      ${renderChrome()}
      <div id="wf-posts-root" class="wf-posts wf-posts--memo">
        <div class="wf-posts-loading">Loading saves…</div>
      </div>
      <div style="height: 40px;"></div>
      ${renderFooter()}
    `;
  }

  // ---------- PLACES ---------------------------------------------------

  function renderPlaces() {
    return `
      ${renderChrome()}
      <div id="wf-places-root" class="wf-places wf-places--memo">
        <div class="wf-places-loading">Loading atlas…</div>
      </div>
      <div style="height: 40px;"></div>
      ${renderFooter()}
    `;
  }


  // ---------- POSTS CLASSIC --------------------------------------------

  function renderPostsClassic() {
    const params = new URLSearchParams(location.search);
    const activePlatform = params.get("platform") || "all";
    const activePlace = params.get("place") || "all";

    const platforms = [
      { key: "all", label: "All platforms" },
      { key: "instagram", label: "Instagram" },
      { key: "tiktok", label: "TikTok" },
      { key: "youtube", label: "YouTube" },
      { key: "web", label: "Web" },
    ];
    const platformCount = (key) =>
      key === "all" ? M.posts.length : M.posts.filter((p) => p.platform === key).length;

    const filtered = M.posts.filter((post) => {
      if (activePlatform !== "all" && post.platform !== activePlatform) return false;
      if (activePlace !== "all" && !post.places.includes(activePlace)) return false;
      return true;
    });

    const placeChips = [
      { id: "all", label: "All places", count: M.posts.length },
      ...M.places
        .map((pl) => ({
          id: pl.id,
          label: pl.name,
          count: M.posts.filter((p) => p.places.includes(pl.id)).length,
        }))
        .filter((p) => p.count > 0)
        .sort((a, b) => b.count - a.count),
    ];

    return `
      ${renderChrome()}

      <section class="m-page-hero">
        <p class="m-eyebrow">The Collection · classic</p>
        <h1>Every reel, filed in the <em>dark.</em></h1>
        <p>Filter by platform or residence. Gold labels mark the source — covers do the rest.</p>
      </section>

      <div class="m-wrap">
        <div class="m-chipbar" role="group" aria-label="Platform filter">
          <span class="m-chipbar-label">Platform</span>
          ${platforms
            .map(
              (p) => `
            <a class="m-chip ${p.key === activePlatform ? "is-active" : ""}"
               href="posts-classic.html?platform=${p.key}${activePlace !== "all" ? "&place=" + activePlace : ""}">
              ${p.label}<span class="count">${platformCount(p.key)}</span>
            </a>`,
            )
            .join("")}
        </div>

        <div class="m-two-col">
          <aside>
            <div class="m-side-panel">
              <h4>Residences in this feed</h4>
              <ul class="m-side-list">
                ${placeChips
                  .slice(0, 10)
                  .map(
                    (p) => `
                  <li>
                    <a class="${p.id === activePlace ? "is-active" : ""}"
                       href="posts-classic.html?place=${p.id}${activePlatform !== "all" ? "&platform=" + activePlatform : ""}">
                      ${p.label}<span class="count">${p.count}</span>
                    </a>
                  </li>`,
                  )
                  .join("")}
              </ul>
            </div>
            <div class="m-side-panel">
              <h4>Sort</h4>
              <ul class="m-side-list">
                <li><a class="is-active" href="#">Newest first</a></li>
                <li><a href="#">Most places</a></li>
                <li><a href="#">By platform</a></li>
              </ul>
            </div>
          </aside>

          <div>
            <p style="color: var(--m-muted); margin: 0 0 20px; font-family: var(--m-mono); font-size: 12px; letter-spacing: 0.08em;">
              ${filtered.length} of ${M.posts.length} saves
            </p>
            <div class="m-post-grid">
              ${filtered
                .map(
                  (post) => `
                <a class="m-post-card" href="post.html?id=${post.id}">
                  <div class="m-post-cover" style="background-image:url('${post.cover}'); aspect-ratio: ${post.aspect};">
                    <span class="m-post-badge">${platformLabel[post.platform] || post.platform}</span>
                    ${post.duration ? `<span class="m-post-duration">${post.duration}</span>` : ""}
                    ${post.readTime ? `<span class="m-post-duration">${post.readTime}</span>` : ""}
                  </div>
                  <div class="m-post-body">
                    <h3 class="m-post-title">${post.title}</h3>
                    <div class="m-post-meta">${post.author} · ${post.posted}</div>
                    ${post.places
                      .map((id) => {
                        const pl = M.placeById(id);
                        return pl
                          ? `<span class="m-post-place">${icon.pin} ${pl.name}</span>`
                          : "";
                      })
                      .slice(0, 1)
                      .join("")}
                  </div>
                </a>`,
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>

      <div style="height: 80px;"></div>
      ${renderFooter()}
    `;
  }


  // ---------- PLACES CLASSIC -------------------------------------------

  function renderPlacesClassic() {
    const params = new URLSearchParams(location.search);
    const activeType = params.get("type") || "all";
    const activeStatus = params.get("status") || "all";
    const activeRegion = params.get("region") || "all";

    const types = [
      { key: "all", label: "All types", count: M.places.length },
      ...M.categories.map((c) => ({
        key: c.key,
        label: c.label,
        count: M.places.filter((p) => p.category === c.key).length,
      })),
    ];
    const statuses = [
      { key: "all", label: "All places", count: M.places.length },
      { key: "visited", label: "Visited", count: M.places.filter((p) => p.visited).length },
      { key: "wishlist", label: "Wishlist", count: M.places.filter((p) => !p.visited).length },
    ];
    const regions = [
      { key: "all", label: "Every continent" },
      ...Array.from(new Set(M.places.map((p) => p.continent))).map((c) => ({
        key: c,
        label: c,
      })),
    ];

    const filtered = M.places.filter((p) => {
      if (activeType !== "all" && p.category !== activeType) return false;
      if (activeStatus === "visited" && !p.visited) return false;
      if (activeStatus === "wishlist" && p.visited) return false;
      if (activeRegion !== "all" && p.continent !== activeRegion) return false;
      return true;
    });

    const link = (o) => {
      const q = new URLSearchParams({
        type: activeType,
        status: activeStatus,
        region: activeRegion,
        ...o,
      });
      return `places-classic.html?${q.toString()}`;
    };

    return `
      ${renderChrome()}

      <section class="m-page-hero">
        <p class="m-eyebrow">Residences · classic</p>
        <h1>Every place you're <em>headed.</em></h1>
        <p>Filter by type, status, or continent. Open a residence to see the reels that put it here.</p>
        <div class="m-page-tabs" role="tablist">
          ${regions
            .map(
              (r) => `
            <a role="tab" ${r.key === activeRegion ? 'aria-current="page"' : ""} href="${link({ region: r.key })}">${r.label}</a>`,
            )
            .join("")}
        </div>
      </section>

      <div class="m-wrap">
        <div class="m-chipbar">
          <span class="m-chipbar-label">Type</span>
          ${types
            .map(
              (t) => `
            <a class="m-chip ${t.key === activeType ? "is-active" : ""}" href="${link({ type: t.key })}">
              ${t.label}<span class="count">${t.count}</span>
            </a>`,
            )
            .join("")}
        </div>
        <div class="m-chipbar">
          <span class="m-chipbar-label">Status</span>
          ${statuses
            .map(
              (s) => `
            <a class="m-chip ${s.key === activeStatus ? "is-active" : ""}" href="${link({ status: s.key })}">
              ${s.label}<span class="count">${s.count}</span>
            </a>`,
            )
            .join("")}
        </div>

        <p style="color: var(--m-muted); margin: 8px 0 20px; font-family: var(--m-mono); font-size: 12px; letter-spacing: 0.08em;">
          ${filtered.length} of ${M.places.length} residences
        </p>
        <div class="m-place-grid">
          ${filtered
            .map(
              (p) => `
            <a class="m-place-card" href="place.html?id=${p.id}">
              <div class="m-place-img" style="background-image:url('${p.hero}')"></div>
              ${p.visited ? `<span class="m-place-visited">${icon.check} Visited</span>` : ""}
              <span class="m-place-count">${p.postCount} saves</span>
              <div class="m-place-body">
                <p class="m-eyebrow">${p.country}</p>
                <h3>${p.name}</h3>
                <p>${p.tagline}</p>
              </div>
            </a>`,
            )
            .join("")}
        </div>
      </div>

      <div style="height: 80px;"></div>
      ${renderFooter()}
    `;
  }

  // ---------- POST DETAIL ---------------------------------------------

  function renderPost() {
    const id = new URLSearchParams(location.search).get("id") || M.posts[0].id;
    const post = M.postById(id) || M.posts[0];
    const relatedPlaces = M.placesByIds(post.places);
    const primaryPlace = relatedPlaces[0];
    const otherPosts = primaryPlace
      ? M.postsForPlace(primaryPlace.id).filter((p) => p.id !== post.id).slice(0, 4)
      : [];

    return `
      ${renderChrome()}

      <section class="m-detail-hero" style="height: 480px;">
        <div class="m-hero-img" style="background-image:url('${post.cover}')"></div>
        <div class="m-detail-hero-inner">
          <p class="m-eyebrow">${platformLabel[post.platform]} · ${post.author}</p>
          <h1>${post.title}</h1>
          <div class="m-detail-meta">
            <span>${post.posted}</span>
            ${post.duration ? `<span>${post.duration}</span>` : ""}
            ${post.readTime ? `<span>${post.readTime}</span>` : ""}
            <span>${post.places.length} place${post.places.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </section>

      <div class="m-detail-body">
        <div>
          <h2>${post.excerpt}</h2>
          <p>
            This saved reel joined your house on ${post.posted}. Memo read the caption, the on-screen text,
            and the audio track to pull the specific places worth going. Open a residence below to browse
            everything else you've filed there.
          </p>
          <p>
            <a class="m-btn ghost" href="https://example.com" target="_blank" rel="noopener">Open on ${platformLabel[post.platform]} ↗</a>
          </p>
          <h2 style="margin-top: 40px;">Places mentioned</h2>
          <div class="m-place-grid" style="grid-template-columns: repeat(2, 1fr); margin-top: 12px;">
            ${relatedPlaces
              .map(
                (p) => `
              <a class="m-place-card" href="place.html?id=${p.id}" style="height: 260px;">
                <div class="m-place-img" style="background-image:url('${p.hero}')"></div>
                ${p.visited ? `<span class="m-place-visited">${icon.check} Visited</span>` : ""}
                <div class="m-place-body">
                  <p class="m-eyebrow">${p.country}</p>
                  <h3 style="font-size: 22px;">${p.name}</h3>
                </div>
              </a>`,
              )
              .join("")}
          </div>
        </div>
        <aside>
          <div class="m-side-card">
            <h4>Dossier</h4>
            <dl>
              <div><dt>Platform</dt><dd>${platformLabel[post.platform]}</dd></div>
              <div><dt>Author</dt><dd>${post.author}</dd></div>
              <div><dt>Saved</dt><dd>${post.posted}</dd></div>
              <div><dt>Places</dt><dd>${post.places.length}</dd></div>
            </dl>
            <h4 style="margin-top: 28px;">Tags</h4>
            <div class="m-tags">
              ${post.tags.map((t) => `<span class="m-tag">#${t}</span>`).join("")}
            </div>
          </div>
          ${
            otherPosts.length
              ? `
          <div class="m-side-card" style="margin-top: 16px;">
            <h4>More from ${primaryPlace.name}</h4>
            <div class="m-related">
              ${otherPosts
                .map(
                  (op) => `
                <a href="post.html?id=${op.id}">
                  <div class="m-related-thumb" style="background-image: url('${op.cover}');"></div>
                  <div>
                    <div class="m-related-title">${op.title}</div>
                    <div class="m-related-meta">${platformLabel[op.platform]} · ${op.posted}</div>
                  </div>
                </a>`,
                )
                .join("")}
            </div>
          </div>`
              : ""
          }
        </aside>
      </div>

      ${renderFooter()}
    `;
  }

  // ---------- PLACE DETAIL --------------------------------------------

  function renderPlace() {
    const id = new URLSearchParams(location.search).get("id") || M.places[0].id;
    const place = M.placeById(id) || M.places[0];
    const posts = M.postsForPlace(place.id);
    const visits = M.visitsForPlace(place.id);

    return `
      ${renderChrome()}

      <section class="m-detail-hero">
        <div class="m-hero-img" style="background-image:url('${place.hero}')"></div>
        <div class="m-detail-hero-inner">
          <p class="m-eyebrow">${place.continent} · ${place.country}</p>
          <h1>${place.name}</h1>
          <div class="m-detail-meta">
            <span>${posts.length} saved posts</span>
            <span>${visits.length} personal visit${visits.length === 1 ? "" : "s"}</span>
            <span>Best: ${place.bestSeason}</span>
          </div>
        </div>
      </section>

      <div class="m-detail-body">
        <div>
          <h2>${place.tagline}</h2>
          <p>${place.summary}</p>

          <div class="m-gallery-row">
            ${place.gallery.map((g) => `<div style="background-image:url('${g}')"></div>`).join("")}
          </div>

          <h2 style="margin-top: 32px;">From the collection</h2>
          <div class="m-post-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 12px;">
            ${posts
              .slice(0, 6)
              .map(
                (post) => `
              <a class="m-post-card" href="post.html?id=${post.id}">
                <div class="m-post-cover" style="background-image:url('${post.cover}');">
                  <span class="m-post-badge">${platformLabel[post.platform]}</span>
                  ${post.duration ? `<span class="m-post-duration">${post.duration}</span>` : ""}
                </div>
                <div class="m-post-body">
                  <h3 class="m-post-title">${post.title}</h3>
                  <div class="m-post-meta">${post.author} · ${post.posted}</div>
                </div>
              </a>`,
              )
              .join("")}
          </div>

          ${
            visits.length
              ? `
          <h2 style="margin-top: 40px;">Your journal here</h2>
          <div class="m-timeline">
            ${visits
              .map(
                (v) => `
              <div class="m-visit">
                <div class="m-visit-dot">✓</div>
                <div class="m-visit-body">
                  <h4>${v.when}</h4>
                  <span class="when">Rating · ${"★".repeat(v.rating)}</span>
                  <p>${v.note}</p>
                </div>
                <div class="m-visit-cover" style="background-image:url('${place.gallery[0]}')"></div>
              </div>`,
              )
              .join("")}
          </div>
          `
              : ""
          }
        </div>
        <aside>
          <div class="m-side-card">
            <h4>Residence dossier</h4>
            <dl>
              <div><dt>Country</dt><dd>${place.country}</dd></div>
              <div><dt>Region</dt><dd>${place.region}</dd></div>
              <div><dt>Type</dt><dd>${place.category}</dd></div>
              <div><dt>Best season</dt><dd>${place.bestSeason}</dd></div>
              <div><dt>Saves</dt><dd>${posts.length}</dd></div>
              <div><dt>Visited</dt><dd>${place.visited ? "Yes" : "Not yet"}</dd></div>
            </dl>
            <h4 style="margin-top: 24px;">Tags</h4>
            <div class="m-tags">
              ${place.tags.map((t) => `<span class="m-tag">#${t}</span>`).join("")}
            </div>
            <div style="margin-top: 24px; display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="m-btn primary" style="flex: 1;">${icon.check} Log a visit</button>
              <a class="m-btn ghost" href="add.html">${icon.plus} Add link</a>
            </div>
          </div>

          <div class="m-side-card" style="margin-top: 16px;">
            <h4>Nearby in ${place.continent}</h4>
            <div class="m-related">
              ${M.places
                .filter((p) => p.continent === place.continent && p.id !== place.id)
                .slice(0, 3)
                .map(
                  (p) => `
                <a href="place.html?id=${p.id}">
                  <div class="m-related-thumb" style="background-image: url('${p.hero}');"></div>
                  <div>
                    <div class="m-related-title">${p.name}</div>
                    <div class="m-related-meta">${p.country} · ${p.postCount} saves</div>
                  </div>
                </a>`,
                )
                .join("")}
            </div>
          </div>
        </aside>
      </div>

      ${renderFooter()}
    `;
  }

  // ---------- ADD -------------------------------------------------------

  function renderAdd() {
    return `
      ${renderChrome()}

      <section class="m-page-hero">
        <p class="m-eyebrow">Concierge</p>
        <h1>Paste anything. <em>We'll file the rest.</em></h1>
        <p>Instagram reels, TikToks, YouTube links, blogs — Memo reads caption, on-screen text, and audio for places worth keeping.</p>
      </section>

      <div class="m-wrap">
        <div class="m-add-shell">
          <h2>Paste your link(s)</h2>
          <p class="lead">One per line. We'll dedupe against what's already in the house.</p>
          <textarea class="m-add-textarea" placeholder="https://www.instagram.com/reel/...
https://www.tiktok.com/@user/video/...
https://youtube.com/watch?v=..."></textarea>
          <div class="m-add-actions">
            <span style="color: var(--m-muted); font-size: 12px; font-family: var(--m-mono); letter-spacing: 0.06em;">Instagram · TikTok · YouTube · Blog · Reddit</span>
            <div style="display: flex; gap: 12px;">
              <a class="m-btn ghost" href="posts.html">Cancel</a>
              <button class="m-btn primary">File to atlas ${icon.arrow}</button>
            </div>
          </div>
          <div class="m-add-tips">
            <div class="m-add-tip">
              <strong>iOS Share Sheet</strong>
              Share any reel or TikTok to Wanderfile directly from the app.
            </div>
            <div class="m-add-tip">
              <strong>Batch import</strong>
              Paste your entire Saved folder — we process in the background.
            </div>
            <div class="m-add-tip">
              <strong>Auto-tag places</strong>
              We geocode place names to real coordinates in your atlas.
            </div>
          </div>
        </div>
      </div>

      ${renderFooter()}
    `;
  }

  // ---------- HISTORY --------------------------------------------------

  function renderHistory() {
    const visits = M.visits;
    return `
      ${renderChrome()}

      <section class="m-page-hero">
        <p class="m-eyebrow">Journal</p>
        <h1>Where you've <em>actually been.</em></h1>
        <p>A running log of residences you've saved — and then walked. Open any visit to see the reels that first put it on your map.</p>
      </section>

      <div class="m-wrap">
        <div class="m-chipbar">
          <span class="m-chipbar-label">Year</span>
          <a class="m-chip is-active" href="#">All</a>
          <a class="m-chip" href="#">2024</a>
          <a class="m-chip" href="#">2023</a>
          <a class="m-chip" href="#">2022</a>
          <a class="m-chip" href="#">2019</a>
        </div>

        <div class="m-timeline">
          ${visits
            .map((v) => {
              const p = M.placeById(v.placeId);
              return `
              <div class="m-visit">
                <div class="m-visit-dot">${p ? p.name.charAt(0) : "•"}</div>
                <div class="m-visit-body">
                  <h4>${p ? p.name : v.placeId} · <span style="color: var(--m-muted); font-style: normal; font-family: var(--m-sans); font-size: 14px;">${v.when}</span></h4>
                  <span class="when">Rating · ${"★".repeat(v.rating)}</span>
                  <p>${v.note}</p>
                </div>
                ${p ? `<a class="m-visit-cover" href="place.html?id=${p.id}" style="background-image:url('${p.hero}'); text-decoration:none;"></a>` : ""}
              </div>`;
            })
            .join("")}
        </div>

        <div class="m-log-cta">
          <h3>Log a new visit</h3>
          <p>Just came back? Add the trip to your journal.</p>
          <a class="m-btn primary" href="#">${icon.plus} Add a visit</a>
        </div>
      </div>

      <div style="height: 80px;"></div>
      ${renderFooter()}
    `;
  }

  // ---------- SEARCH ---------------------------------------------------

  function renderSearch() {
    const q = new URLSearchParams(location.search).get("q") || "";
    const query = q.toLowerCase();
    const posts = query
      ? M.posts.filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.excerpt.toLowerCase().includes(query) ||
            p.tags.join(" ").toLowerCase().includes(query),
        )
      : M.posts.slice(0, 4);
    const places = query
      ? M.places.filter(
          (p) =>
            p.name.toLowerCase().includes(query) ||
            p.country.toLowerCase().includes(query) ||
            p.tagline.toLowerCase().includes(query),
        )
      : M.places.slice(0, 3);

    return `
      ${renderChrome()}

      <div class="m-search-shell">
        <p class="m-eyebrow" style="margin-bottom: 20px;">Search the house</p>
        <form class="m-search-input" onsubmit="event.preventDefault(); const q=this.q.value; location.href = 'search.html?q=' + encodeURIComponent(q);">
          <input name="q" placeholder="Search reels, tags, residences, countries…" value="${q.replace(/"/g, "&quot;")}" autofocus />
          <button class="m-btn primary" type="submit">Search ${icon.arrow}</button>
        </form>
        <p style="color: var(--m-muted); font-size: 12px; margin: 14px 0 0; font-family: var(--m-mono); letter-spacing: 0.06em;">Cmd/Ctrl + K opens search anywhere.</p>

        <div class="m-search-results">
          <div class="m-search-group">
            <h3>Residences · ${places.length}</h3>
            <div class="m-place-grid" style="grid-template-columns: repeat(3, 1fr);">
              ${places
                .slice(0, 3)
                .map(
                  (p) => `
                <a class="m-place-card" href="place.html?id=${p.id}" style="height: 260px;">
                  <div class="m-place-img" style="background-image:url('${p.hero}')"></div>
                  ${p.visited ? `<span class="m-place-visited">${icon.check} Visited</span>` : ""}
                  <div class="m-place-body">
                    <p class="m-eyebrow">${p.country}</p>
                    <h3 style="font-size: 22px;">${p.name}</h3>
                  </div>
                </a>`,
                )
                .join("")}
            </div>
          </div>

          <div class="m-search-group">
            <h3>Posts · ${posts.length}</h3>
            <div class="m-post-grid" style="grid-template-columns: repeat(4, 1fr);">
              ${posts
                .slice(0, 4)
                .map(
                  (post) => `
                <a class="m-post-card" href="post.html?id=${post.id}">
                  <div class="m-post-cover" style="background-image:url('${post.cover}');">
                    <span class="m-post-badge">${platformLabel[post.platform]}</span>
                  </div>
                  <div class="m-post-body">
                    <h3 class="m-post-title">${post.title}</h3>
                    <div class="m-post-meta">${post.author} · ${post.posted}</div>
                  </div>
                </a>`,
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>

      <div style="height: 80px;"></div>
      ${renderFooter()}
    `;
  }

  // ---------- ROUTER ---------------------------------------------------

  const RENDERERS = {
    home: renderHome,
    posts: renderPosts,
    "posts-classic": renderPostsClassic,
    places: renderPlaces,
    "places-classic": renderPlacesClassic,
    post: renderPost,
    place: renderPlace,
    add: renderAdd,
    history: renderHistory,
    search: renderSearch,
  };

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(() => {
    const app = document.getElementById("app");
    if (!app) return;
    const render = RENDERERS[currentPage()] || renderHome;
    app.innerHTML = render();
    window.scrollTo(0, 0);
    if (currentPage() === "posts") {
      import("../shared/posts-page.js")
        .then((mod) => mod.hydratePostsPage({ theme: "memo" }))
        .catch((err) => console.warn("[memo] posts hydrate failed", err));
    }
    if (currentPage() === "places") {
      import("../shared/places-page.js")
        .then((mod) => mod.hydratePlacesPage({ theme: "memo" }))
        .catch((err) => console.warn("[memo] places hydrate failed", err));
    }
  });
})();
