/**
 * Voyager (site 01) — shared chrome + page renderers.
 * Every page in 01-voyager/ sets window.WF_SITE, includes mock.js + this file,
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
      <header class="v-chrome">
        <div class="v-chrome-inner">
          <a href="index.html" class="v-logo">
            <span class="v-logo-mark">W</span>
            Wanderfile
          </a>
          <nav class="v-nav">
            <a href="index.html" ${p === "home" ? 'aria-current="page"' : ""}>Discover</a>
            <a href="posts.html" ${p === "posts" ? 'aria-current="page"' : ""}>Posts</a>
            <a href="places.html" ${p === "places" ? 'aria-current="page"' : ""}>Places</a>
            <a href="history.html" ${p === "history" ? 'aria-current="page"' : ""}>Trips</a>
          </nav>
          <div class="v-chrome-actions">
            <a href="search.html" class="v-icon-btn" aria-label="Search">${icon.search}</a>
            <a href="add.html" class="v-btn primary">Add a link ${icon.plus}</a>
          </div>
        </div>
      </header>
    `;
  }

  function renderFooter() {
    return `
      <div class="v-wrap">
        <div class="v-book">
          <h4>Save your first link today</h4>
          <form onsubmit="event.preventDefault(); location.href='add.html';">
            <input type="text" placeholder="Paste an Instagram, TikTok, or YouTube link" />
            <button class="v-btn primary" type="submit">Add ${icon.arrow}</button>
          </form>
        </div>
        <footer class="v-footer">
          <div class="v-footer-links">
            <a href="index.html">Home</a>
            <a href="posts.html">Posts</a>
            <a href="places.html">Places</a>
            <a href="history.html">Trips</a>
          </div>
          <div class="v-footer-brand">Wanderfile</div>
          <div>© 2026 · Curate the world you keep saving</div>
        </footer>
      </div>
    `;
  }

  // ---------- HOME -----------------------------------------------------

  function renderHome() {
    const featured = [M.placeById("kyoto"), M.placeById("cappadocia"), M.placeById("santorini"), M.placeById("patagonia") || M.placeById("torres-del-paine")].filter(Boolean).slice(0, 4);
    const cats = M.categories.slice(0, 5);
    const testimonials = M.testimonials;

    return `
      ${renderChrome()}

      <section class="v-hero">
        <div class="v-hero-img" style="background-image:url('${M.img('cappadociaBalloons', 1800, 1100)}')"></div>
        <div class="v-hero-inner">
          <div>
            <p class="v-eyebrow">Turn saves into trips</p>
            <h1>Discover the <em>world</em><br/>you keep saving.</h1>
            <p style="max-width: 480px; margin-top: 16px; color: rgba(244, 247, 234, 0.9);">
              Paste any reel, TikTok, or YouTube link — Wanderfile reads the caption,
              audio, and on-screen text for real places worth going, and puts them on your map.
            </p>
            <div class="v-hero-actions">
              <a href="add.html" class="v-btn primary">Paste a link ${icon.arrow}</a>
              <a href="places.html" class="v-btn ghost" style="background: rgba(244,247,234,0.12); border-color: rgba(244,247,234,0.28); color: #f4f7ea;">Open your atlas</a>
            </div>
          </div>
          <ul class="v-hero-stats">
            <li><span class="v-eyebrow">Saves</span><strong>${M.stats.posts}</strong></li>
            <li><span class="v-eyebrow">Places</span><strong>${M.stats.places}</strong></li>
            <li><span class="v-eyebrow">Countries</span><strong>${M.stats.countries}</strong></li>
          </ul>
        </div>
      </section>

      <section class="v-section tight">
        <div class="v-wrap">
          <div class="v-about">
            <div class="v-about-photo" style="background-image:url('${M.img('santoriniBlue', 500, 400)}')"></div>
            <div class="v-about-copy">
              <h3>About Wanderfile</h3>
              <p>Wanderfile turns your saved reels into a curated atlas — captions, audio, and on-screen text become real places on a map.</p>
            </div>
            <div class="v-about-photo" style="background-image:url('${M.img('amalfiPositano', 500, 400)}')"></div>
          </div>
        </div>
      </section>

      <section class="v-section" id="why">
        <div class="v-wrap">
          <div class="v-why">
            <div>
              <p class="v-eyebrow">Why Wanderfile</p>
              <h2 style="font-family: var(--v-sans); font-size: clamp(1.9rem, 3.4vw, 2.6rem); font-weight: 600; letter-spacing: -0.02em; margin: 8px 0 24px;">
                Everything you saved.<br/><em style="font-family: var(--v-serif); font-style: italic; font-weight: 400; color: var(--v-accent);">Finally in one place.</em>
              </h2>
              <ul class="v-why-list">
                <li>${icon.check} Reads captions, on-screen text, and audio</li>
                <li>${icon.check} Geocodes real places automatically</li>
                <li>${icon.check} Trusted by curious travelers, not marketers</li>
                <li>${icon.check} Free forever for personal libraries</li>
              </ul>
            </div>
            <div class="v-why-image" style="background-image:url('${M.img('hikerSummit', 900, 700)}')"></div>
          </div>
        </div>
      </section>

      <section class="v-section">
        <div class="v-wrap">
          <div class="v-section-head">
            <div>
              <p class="v-eyebrow">Featured</p>
              <h2>We only surface the <em>best destinations</em> you saved.</h2>
            </div>
            <a class="v-btn" href="places.html">See all</a>
          </div>
          <div class="v-dest-grid">
            ${featured.map(
              (p) => `
              <a class="v-dest-card" href="place.html?id=${p.id}">
                <div class="v-dest-img" style="background-image:url('${p.hero}')"></div>
                <div class="v-dest-body">
                  <div>
                    <p class="v-dest-name">${p.name}</p>
                    <p class="v-dest-meta">${p.country} · ${p.postCount} saves</p>
                  </div>
                  <div class="v-dest-arrow">${icon.arrow}</div>
                </div>
              </a>`,
            ).join("")}
          </div>
        </div>
      </section>

      <section class="v-section">
        <div class="v-wrap">
          <div class="v-section-head">
            <div>
              <p class="v-eyebrow">Tailored packages</p>
              <h2>A collection for <em>every kind</em> of traveler.</h2>
            </div>
          </div>
          <div class="v-cat-row">
            ${cats
              .map(
                (c, i) => `
              <a class="v-cat-card ${i === 2 ? "tall" : ""}" href="places.html?type=${c.key}">
                <div class="v-cat-img" style="background-image:url('${c.cover}')"></div>
                <div class="v-cat-body">
                  <span class="v-eyebrow">${c.icon}</span>
                  <p class="v-cat-name">${c.label} <span class="v-cat-arrow">${icon.arrow}</span></p>
                </div>
              </a>`,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="v-section" style="background: var(--v-panel);">
        <div class="v-wrap">
          <div class="v-section-head">
            <div>
              <p class="v-eyebrow">Loved by travelers</p>
              <h2>Real reviews from<br/><em>real people.</em></h2>
            </div>
            <a class="v-btn" href="posts.html">View all</a>
          </div>
          <div class="v-reviews">
            <div class="v-reviews-photos">
              <div style="background-image:url('${M.img('portraitTraveler1', 700, 900)}')"></div>
              <div style="background-image:url('${M.img('portraitTraveler2', 700, 900)}')"></div>
              <div style="background-image:url('${M.img('portraitTraveler3', 700, 900)}')"></div>
            </div>
            <div class="v-review">
              <div class="v-stars">★★★★★</div>
              <h4>${testimonials[0].name}</h4>
              <span class="role">${testimonials[0].role}</span>
              <p>“${testimonials[0].quote}”</p>
            </div>
          </div>
        </div>
      </section>

      <section class="v-section">
        <div class="v-wrap">
          <div class="v-section-head">
            <div>
              <p class="v-eyebrow">Adventure awakens</p>
              <h2>Your <em>soul.</em></h2>
            </div>
            <a class="v-btn" href="places.html">Explore</a>
          </div>
          <div class="v-adv-row">
            <div class="v-adv-tile" style="background-image:url('${M.img('desertDunes', 700, 800)}')"><span>Sahara</span></div>
            <div class="v-adv-tile" style="background-image:url('${M.img('swissMountains', 700, 800)}')"><span>Zermatt</span></div>
            <div class="v-adv-tile" style="background-image:url('${M.img('parisEiffel', 700, 800)}')"><span>Paris</span></div>
            <div class="v-adv-tile" style="background-image:url('${M.img('northernLights', 700, 800)}')"><span>Tromsø</span></div>
          </div>
        </div>
      </section>

      <section class="v-section tight">
        <div class="v-wrap">
          <div class="v-cta">
            <div>
              <p class="v-eyebrow">Ready to start?</p>
              <h3>Get in touch — <em style="font-family: var(--v-serif); font-style: italic;">or just paste a link.</em></h3>
              <p style="color: var(--v-ink-soft); margin: 0 0 20px;">You save it, we map it. One save is enough to start filling your atlas.</p>
              <a class="v-btn primary" href="add.html">Add your first link ${icon.arrow}</a>
            </div>
            <div class="v-cta-image" style="background-image:url('${M.img('coastalRoad', 800, 500)}')"></div>
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
      <div id="wf-posts-root" class="wf-posts wf-posts--voyager">
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
      <div id="wf-places-root" class="wf-places wf-places--voyager">
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

      <section class="v-page-hero">
        <p class="v-eyebrow">Your library · classic</p>
        <h1>Every reel, every link — <em>on one shelf.</em></h1>
        <p>Filter by platform or by the place a post is about. Grid stays out of the way so the covers do the talking.</p>
      </section>

      <div class="v-wrap">
        <div class="v-chipbar" role="group" aria-label="Platform filter">
          <span class="v-chipbar-label">Platform</span>
          ${platforms
            .map(
              (p) => `
            <a class="v-chip ${p.key === activePlatform ? "is-active" : ""}"
               href="posts-classic.html?platform=${p.key}${activePlace !== "all" ? "&place=" + activePlace : ""}">
              ${p.label}<span class="count">${platformCount(p.key)}</span>
            </a>`,
            )
            .join("")}
        </div>

        <div class="v-two-col">
          <aside>
            <div class="v-side-panel">
              <h4>Places in this feed</h4>
              <ul class="v-side-list">
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
            <div class="v-side-panel">
              <h4>Sort</h4>
              <ul class="v-side-list">
                <li><a class="is-active" href="#">Newest first</a></li>
                <li><a href="#">Most places</a></li>
                <li><a href="#">By platform</a></li>
              </ul>
            </div>
          </aside>

          <div>
            <p style="color: var(--v-muted); margin: 0 0 20px;">${filtered.length} of ${M.posts.length} saves</p>
            <div class="v-post-grid">
              ${filtered
                .map(
                  (post) => `
                <a class="v-post-card" href="post.html?id=${post.id}">
                  <div class="v-post-cover" style="background-image:url('${post.cover}'); aspect-ratio: ${post.aspect};">
                    <span class="v-post-badge">${platformLabel[post.platform] || post.platform}</span>
                    ${post.duration ? `<span class="v-post-duration">${post.duration}</span>` : ""}
                    ${post.readTime ? `<span class="v-post-duration">${post.readTime}</span>` : ""}
                  </div>
                  <div class="v-post-body">
                    <h3 class="v-post-title">${post.title}</h3>
                    <div class="v-post-meta">${post.author} · ${post.posted}</div>
                    ${post.places
                      .map((id) => {
                        const pl = M.placeById(id);
                        return pl
                          ? `<span class="v-post-place">${icon.pin} ${pl.name}</span>`
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

      <section class="v-page-hero">
        <p class="v-eyebrow">Your atlas · classic</p>
        <h1>Every place you're <em>headed.</em></h1>
        <p>Filter by trip type, whether you've been, or the continent. Open a place to see the reels that put it here.</p>
        <div class="v-page-tabs" role="tablist">
          ${regions
            .map(
              (r) => `
            <a role="tab" ${r.key === activeRegion ? 'aria-current="page"' : ""} href="${link({ region: r.key })}">${r.label}</a>`,
            )
            .join("")}
        </div>
      </section>

      <div class="v-wrap">
        <div class="v-chipbar">
          <span class="v-chipbar-label">Type</span>
          ${types
            .map(
              (t) => `
            <a class="v-chip ${t.key === activeType ? "is-active" : ""}" href="${link({ type: t.key })}">
              ${t.label}<span class="count">${t.count}</span>
            </a>`,
            )
            .join("")}
        </div>
        <div class="v-chipbar">
          <span class="v-chipbar-label">Status</span>
          ${statuses
            .map(
              (s) => `
            <a class="v-chip ${s.key === activeStatus ? "is-active" : ""}" href="${link({ status: s.key })}">
              ${s.label}<span class="count">${s.count}</span>
            </a>`,
            )
            .join("")}
        </div>

        <p style="color: var(--v-muted); margin: 8px 0 20px;">${filtered.length} of ${M.places.length} places</p>
        <div class="v-place-grid">
          ${filtered
            .map(
              (p) => `
            <a class="v-place-card" href="place.html?id=${p.id}">
              <div class="v-place-img" style="background-image:url('${p.hero}')"></div>
              ${p.visited ? `<span class="v-place-visited">${icon.check} Visited</span>` : ""}
              <span class="v-place-count">${p.postCount} saves</span>
              <div class="v-place-body">
                <p class="v-eyebrow">${p.country}</p>
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

      <section class="v-detail-hero" style="height: 480px;">
        <div class="v-hero-img" style="background-image:url('${post.cover}')"></div>
        <div class="v-detail-hero-inner">
          <p class="v-eyebrow">${platformLabel[post.platform]} · ${post.author}</p>
          <h1 style="font-size: clamp(2rem, 5vw, 3.8rem);">${post.title}</h1>
          <div class="v-detail-meta">
            <span>${post.posted}</span>
            ${post.duration ? `<span>${post.duration}</span>` : ""}
            ${post.readTime ? `<span>${post.readTime}</span>` : ""}
            <span>${post.places.length} place${post.places.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </section>

      <div class="v-detail-body">
        <div>
          <h2>${post.excerpt}</h2>
          <p>
            This saved reel joined your atlas on ${post.posted}. Wanderfile read the caption, the on-screen text,
            and the audio track to pull the specific places worth going. Open the map to see them geocoded, or
            jump into a place below to browse everything else you've saved there.
          </p>
          <p>
            <a class="v-btn ghost" href="https://example.com" target="_blank" rel="noopener">Open on ${platformLabel[post.platform]} ↗</a>
          </p>
          <h2 style="margin-top: 40px;">Places mentioned</h2>
          <div class="v-place-grid" style="grid-template-columns: repeat(2, 1fr); margin-top: 12px;">
            ${relatedPlaces
              .map(
                (p) => `
              <a class="v-place-card" href="place.html?id=${p.id}" style="height: 260px;">
                <div class="v-place-img" style="background-image:url('${p.hero}')"></div>
                ${p.visited ? `<span class="v-place-visited">${icon.check} Visited</span>` : ""}
                <div class="v-place-body">
                  <p class="v-eyebrow">${p.country}</p>
                  <h3 style="font-size: 20px;">${p.name}</h3>
                </div>
              </a>`,
              )
              .join("")}
          </div>
        </div>
        <aside>
          <div class="v-side-card">
            <h4>Post details</h4>
            <dl>
              <div><dt>Platform</dt><dd>${platformLabel[post.platform]}</dd></div>
              <div><dt>Author</dt><dd>${post.author}</dd></div>
              <div><dt>Saved</dt><dd>${post.posted}</dd></div>
              <div><dt>Places</dt><dd>${post.places.length}</dd></div>
            </dl>
            <h4 style="margin-top: 24px;">Tags</h4>
            <div class="v-tags">
              ${post.tags.map((t) => `<span class="v-tag">#${t}</span>`).join("")}
            </div>
          </div>
          ${otherPosts.length
            ? `
          <div class="v-side-card" style="margin-top: 16px;">
            <h4>More from ${primaryPlace.name}</h4>
            <div style="display: grid; gap: 12px;">
              ${otherPosts
                .map(
                  (op) => `
                <a href="post.html?id=${op.id}" style="display: grid; grid-template-columns: 60px 1fr; gap: 12px; align-items: center;">
                  <div style="width: 60px; height: 60px; border-radius: 12px; background-size: cover; background-position: center; background-image: url('${op.cover}');"></div>
                  <div>
                    <div style="font-weight: 500; font-size: 14px;">${op.title}</div>
                    <div style="color: var(--v-muted); font-size: 12px;">${platformLabel[op.platform]} · ${op.posted}</div>
                  </div>
                </a>`,
                )
                .join("")}
            </div>
          </div>`
            : ""}
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

      <section class="v-detail-hero">
        <div class="v-hero-img" style="background-image:url('${place.hero}')"></div>
        <div class="v-detail-hero-inner">
          <p class="v-eyebrow">${place.continent} · ${place.country}</p>
          <h1>${place.name}</h1>
          <div class="v-detail-meta">
            <span>${posts.length} saved posts</span>
            <span>${visits.length} personal visit${visits.length === 1 ? "" : "s"}</span>
            <span>Best: ${place.bestSeason}</span>
          </div>
        </div>
      </section>

      <div class="v-detail-body">
        <div>
          <h2 style="font-family: var(--v-serif); font-style: italic; font-weight: 400; font-size: 34px; letter-spacing: -0.01em;">
            ${place.tagline}
          </h2>
          <p>${place.summary}</p>

          <div class="v-gallery-row">
            ${place.gallery.map((g) => `<div style="background-image:url('${g}')"></div>`).join("")}
          </div>

          <h2 style="margin-top: 32px;">Saves from your feed</h2>
          <div class="v-post-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 12px;">
            ${posts
              .slice(0, 6)
              .map(
                (post) => `
              <a class="v-post-card" href="post.html?id=${post.id}">
                <div class="v-post-cover" style="background-image:url('${post.cover}');">
                  <span class="v-post-badge">${platformLabel[post.platform]}</span>
                  ${post.duration ? `<span class="v-post-duration">${post.duration}</span>` : ""}
                </div>
                <div class="v-post-body">
                  <h3 class="v-post-title">${post.title}</h3>
                  <div class="v-post-meta">${post.author} · ${post.posted}</div>
                </div>
              </a>`,
              )
              .join("")}
          </div>

          ${
            visits.length
              ? `
          <h2 style="margin-top: 40px;">Your trips here</h2>
          <div class="v-timeline">
            ${visits
              .map(
                (v) => `
              <div class="v-visit">
                <div class="v-visit-dot">✓</div>
                <div class="v-visit-body">
                  <h4>${v.when}</h4>
                  <span class="when">Rating · ${"★".repeat(v.rating)}</span>
                  <p>${v.note}</p>
                </div>
                <div class="v-visit-cover" style="background-image:url('${place.gallery[0]}')"></div>
              </div>`,
              )
              .join("")}
          </div>
          `
              : ""
          }
        </div>
        <aside>
          <div class="v-side-card">
            <h4>Field notes</h4>
            <dl>
              <div><dt>Country</dt><dd>${place.country}</dd></div>
              <div><dt>Region</dt><dd>${place.region}</dd></div>
              <div><dt>Type</dt><dd>${place.category}</dd></div>
              <div><dt>Best season</dt><dd>${place.bestSeason}</dd></div>
              <div><dt>Saves</dt><dd>${posts.length}</dd></div>
              <div><dt>Visited</dt><dd>${place.visited ? "Yes" : "Not yet"}</dd></div>
            </dl>
            <h4 style="margin-top: 20px;">Tags</h4>
            <div class="v-tags">
              ${place.tags.map((t) => `<span class="v-tag">#${t}</span>`).join("")}
            </div>
            <div style="margin-top: 20px; display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="v-btn primary" style="flex: 1;">${icon.check} Log a visit</button>
              <a class="v-btn ghost" href="add.html">${icon.plus} Add link</a>
            </div>
          </div>

          <div class="v-side-card" style="margin-top: 16px;">
            <h4>Nearby in ${place.continent}</h4>
            <div style="display: grid; gap: 12px;">
              ${M.places
                .filter((p) => p.continent === place.continent && p.id !== place.id)
                .slice(0, 3)
                .map(
                  (p) => `
                <a href="place.html?id=${p.id}" style="display: grid; grid-template-columns: 60px 1fr; gap: 12px; align-items: center;">
                  <div style="width: 60px; height: 60px; border-radius: 12px; background-size: cover; background-position: center; background-image: url('${p.hero}');"></div>
                  <div>
                    <div style="font-weight: 500; font-size: 14px;">${p.name}</div>
                    <div style="color: var(--v-muted); font-size: 12px;">${p.country} · ${p.postCount} saves</div>
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

      <section class="v-page-hero">
        <p class="v-eyebrow">One link at a time</p>
        <h1>Paste anything. <em>We'll do the rest.</em></h1>
        <p>Instagram reels, TikToks, YouTube links, blog posts — Wanderfile reads the caption, on-screen text, and audio for the places worth saving.</p>
      </section>

      <div class="v-wrap">
        <div class="v-add-shell">
          <h2>Paste your link(s)</h2>
          <p class="lead">One per line. We'll dedupe against what's already in your library.</p>
          <textarea class="v-add-textarea" placeholder="https://www.instagram.com/reel/...
https://www.tiktok.com/@user/video/...
https://youtube.com/watch?v=..."></textarea>
          <div class="v-add-actions">
            <span style="color: var(--v-muted); font-size: 13px;">Instagram · TikTok · YouTube · Blog · Reddit</span>
            <div style="display: flex; gap: 12px;">
              <a class="v-btn ghost" href="posts.html">Cancel</a>
              <button class="v-btn primary">Add to atlas ${icon.arrow}</button>
            </div>
          </div>
          <div class="v-add-tips">
            <div class="v-add-tip">
              <strong>iOS Share Sheet</strong>
              Share any reel or TikTok to Wanderfile directly from the app.
            </div>
            <div class="v-add-tip">
              <strong>Batch import</strong>
              Paste your entire Saved folder — we'll process in the background.
            </div>
            <div class="v-add-tip">
              <strong>Places auto-tag</strong>
              We geocode place names to real coordinates on your atlas.
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

      <section class="v-page-hero">
        <p class="v-eyebrow">Your trips</p>
        <h1>Where you've <em>actually been.</em></h1>
        <p>A running log of the places you've saved — and then walked. Tap any visit to see the reels that first put it on your map.</p>
      </section>

      <div class="v-wrap">
        <div class="v-chipbar">
          <span class="v-chipbar-label">Year</span>
          <a class="v-chip is-active" href="#">All</a>
          <a class="v-chip" href="#">2024</a>
          <a class="v-chip" href="#">2023</a>
          <a class="v-chip" href="#">2022</a>
          <a class="v-chip" href="#">2019</a>
        </div>

        <div class="v-timeline">
          ${visits
            .map((v) => {
              const p = M.placeById(v.placeId);
              return `
              <div class="v-visit">
                <div class="v-visit-dot">${p ? p.name.charAt(0) : "•"}</div>
                <div class="v-visit-body">
                  <h4>${p ? p.name : v.placeId} · <span style="color: var(--v-muted); font-weight: 400;">${v.when}</span></h4>
                  <span class="when">Rating · ${"★".repeat(v.rating)}</span>
                  <p>${v.note}</p>
                </div>
                ${p ? `<a class="v-visit-cover" href="place.html?id=${p.id}" style="background-image:url('${p.hero}'); text-decoration:none;"></a>` : ""}
              </div>`;
            })
            .join("")}
        </div>

        <div style="margin-top: 40px; padding: 40px; border-radius: var(--v-radius-lg); background: var(--v-panel); border: 1px solid var(--v-line); text-align: center;">
          <h3 style="margin: 0 0 12px;">Log a new visit</h3>
          <p style="color: var(--v-ink-soft); margin: 0 0 20px;">Just came back? Add the trip to your history.</p>
          <a class="v-btn primary" href="#">${icon.plus} Add a visit</a>
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

      <div class="v-search-shell">
        <p class="v-eyebrow" style="color: var(--v-muted); margin-bottom: 20px;">Search your library</p>
        <form class="v-search-input" onsubmit="event.preventDefault(); const q=this.q.value; location.href = 'search.html?q=' + encodeURIComponent(q);">
          <input name="q" placeholder="Search reels, tags, places, countries…" value="${q.replace(/"/g, '&quot;')}" autofocus />
          <button class="v-btn primary" type="submit">Search ${icon.arrow}</button>
        </form>
        <p style="color: var(--v-muted); font-size: 13px; margin: 12px 0 0;">Cmd/Ctrl + K opens search anywhere.</p>

        <div class="v-search-results">
          <div class="v-search-group">
            <h3>Places · ${places.length}</h3>
            <div class="v-place-grid" style="grid-template-columns: repeat(3, 1fr);">
              ${places
                .slice(0, 3)
                .map(
                  (p) => `
                <a class="v-place-card" href="place.html?id=${p.id}" style="height: 260px;">
                  <div class="v-place-img" style="background-image:url('${p.hero}')"></div>
                  ${p.visited ? `<span class="v-place-visited">${icon.check} Visited</span>` : ""}
                  <div class="v-place-body">
                    <p class="v-eyebrow">${p.country}</p>
                    <h3 style="font-size: 20px;">${p.name}</h3>
                  </div>
                </a>`,
                )
                .join("")}
            </div>
          </div>

          <div class="v-search-group">
            <h3>Posts · ${posts.length}</h3>
            <div class="v-post-grid" style="grid-template-columns: repeat(4, 1fr);">
              ${posts
                .slice(0, 4)
                .map(
                  (post) => `
                <a class="v-post-card" href="post.html?id=${post.id}">
                  <div class="v-post-cover" style="background-image:url('${post.cover}');">
                    <span class="v-post-badge">${platformLabel[post.platform]}</span>
                  </div>
                  <div class="v-post-body">
                    <h3 class="v-post-title">${post.title}</h3>
                    <div class="v-post-meta">${post.author} · ${post.posted}</div>
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
        .then((mod) => mod.hydratePostsPage({ theme: "voyager" }))
        .catch((err) => console.warn("[voyager] posts hydrate failed", err));
    }
    if (currentPage() === "places") {
      import("../shared/places-page.js")
        .then((mod) => mod.hydratePlacesPage({ theme: "voyager" }))
        .catch((err) => console.warn("[voyager] places hydrate failed", err));
    }
  });
})();
