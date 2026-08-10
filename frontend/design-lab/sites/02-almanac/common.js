/**
 * Almanac (site 02) — shared chrome + page renderers.
 * Every page in 02-almanac/ sets window.WF_SITE, includes mock.js + this file,
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
    map: '<svg viewBox="0 0 24 24"><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></svg>',
    book: '<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
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
      <header class="a-chrome">
        <div class="a-chrome-inner">
          <a href="index.html" class="a-logo">
            <span class="a-logo-mark">A</span>
            Almanac
          </a>
          <nav class="a-nav">
            <a href="index.html" ${p === "home" ? 'aria-current="page"' : ""}>Discover</a>
            <a href="posts.html" ${p === "posts" ? 'aria-current="page"' : ""}>Posts</a>
            <a href="places.html" ${p === "places" ? 'aria-current="page"' : ""}>Places</a>
            <a href="history.html" ${p === "history" ? 'aria-current="page"' : ""}>Journal</a>
          </nav>
          <div class="a-chrome-actions">
            <a href="search.html" class="a-icon-btn" aria-label="Search">${icon.search}</a>
            <a href="add.html" class="a-btn primary">Add a link ${icon.plus}</a>
          </div>
        </div>
      </header>
    `;
  }

  function renderFooter() {
    return `
      <div class="a-footer-block">
        <div class="a-footer-inner">
          <div>
            <h3>Save the next place worth writing home about.</h3>
            <p>Paste a reel, TikTok, or blog link — Almanac reads the caption and on-screen text, then files the places into your atlas.</p>
            <form class="a-footer-form" onsubmit="event.preventDefault(); location.href='add.html';">
              <input type="text" placeholder="Paste an Instagram, TikTok, or YouTube link" />
              <button class="a-btn cream" type="submit">Add ${icon.arrow}</button>
            </form>
          </div>
          <div class="a-footer-nav">
            <div class="a-footer-brand">Almanac</div>
            <a href="index.html">Discover</a>
            <a href="posts.html">Posts</a>
            <a href="places.html">Places</a>
            <a href="history.html">Journal</a>
            <a href="search.html">Search</a>
          </div>
        </div>
        <div class="a-footer-copy">
          <span>© 2026 Wanderfile · Almanac</span>
          <span>Curate the world you keep saving</span>
        </div>
      </div>
    `;
  }

  // ---------- HOME -----------------------------------------------------

  function renderHome() {
    const featured = [
      M.placeById("cappadocia"),
      M.placeById("kyoto"),
      M.placeById("santorini"),
      M.placeById("positano") || M.placeById("patagonia") || M.placeById("torres-del-paine"),
    ]
      .filter(Boolean)
      .slice(0, 4);
    const recentPosts = M.posts.slice(0, 3);
    const testimonials = M.testimonials;

    return `
      ${renderChrome()}

      <section class="a-hero">
        <div class="a-hero-img" style="background-image:url('${M.img("cappadociaBalloons", 1800, 1100)}')"></div>
        <div class="a-hero-inner">
          <div>
            <p class="a-eyebrow">A travel almanac for your saves</p>
            <h1>The places you keep<br/><em>coming back to.</em></h1>
            <div class="a-hero-actions">
              <a href="add.html" class="a-btn cream">Paste a link ${icon.arrow}</a>
              <a href="places.html" class="a-btn ghost" style="border-color: rgba(255,250,245,0.4); color: #fffaf5;">Open the atlas</a>
            </div>
            <ul class="a-hero-stats">
              <li><span class="a-eyebrow">Saves</span><strong>${M.stats.posts}</strong></li>
              <li><span class="a-eyebrow">Places</span><strong>${M.stats.places}</strong></li>
              <li><span class="a-eyebrow">Countries</span><strong>${M.stats.countries}</strong></li>
            </ul>
          </div>
          <div class="a-hero-float">
            <div class="tile" style="background-image:url('${M.img("santoriniBlue", 400, 500)}')"></div>
            <div class="tile" style="background-image:url('${M.img("amalfiPositano", 400, 500)}')"></div>
            <div class="tile" style="background-image:url('${M.img("kyotoTemple", 400, 500)}')"></div>
          </div>
        </div>
      </section>

      <section class="a-section tight">
        <div class="a-wrap">
          <div class="a-about">
            <div class="a-about-photo tilt-l" style="background-image:url('${M.img("santoriniBlue", 500, 400)}')"></div>
            <div class="a-about-copy">
              <h3>About Almanac</h3>
              <p>A warm editorial atlas for the reels you save — captions, audio, and on-screen text become real places on paper-soft pages.</p>
            </div>
            <div class="a-about-photo tilt-r" style="background-image:url('${M.img("cappadociaSunrise", 500, 400)}')"></div>
          </div>
        </div>
      </section>

      <section class="a-section">
        <div class="a-wrap">
          <div class="a-section-head">
            <div>
              <p class="a-eyebrow">Featured destinations</p>
              <h2>We only surface the <em>places worth the ink.</em></h2>
            </div>
            <a class="a-btn ghost" href="places.html">See all</a>
          </div>
          <div class="a-cover-strip">
            ${featured
              .map(
                (p) => `
              <a class="a-cover-card" href="place.html?id=${p.id}">
                <div class="img" style="background-image:url('${p.hero}')"></div>
                <span class="a-pill soft">${p.country}</span>
                <div class="body">
                  <p class="name">${p.name}</p>
                  <p class="meta">${p.postCount} saves · ${p.bestSeason}</p>
                </div>
              </a>`,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="a-section peach">
        <div class="a-wrap">
          <div class="a-section-head">
            <div>
              <p class="a-eyebrow">Why Almanac</p>
              <h2>Everything you saved.<br/><em>Filed like a field guide.</em></h2>
            </div>
          </div>
          <div class="a-features">
            <div class="a-feature">
              <div class="icon-wrap">${icon.book}</div>
              <h3>Reads the reel</h3>
              <p>Captions, on-screen text, and audio become place names worth going.</p>
            </div>
            <div class="a-feature">
              <div class="icon-wrap">${icon.map}</div>
              <h3>Maps itself</h3>
              <p>Every mention is geocoded onto your atlas — no spreadsheet required.</p>
            </div>
            <div class="a-feature">
              <div class="icon-wrap">${icon.heart}</div>
              <h3>Keeps a journal</h3>
              <p>Log visits when you get there. The saves that started it stay attached.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="a-section">
        <div class="a-wrap">
          <div class="a-section-head">
            <div>
              <p class="a-eyebrow">Wanderlust mosaic</p>
              <h2>Corners of the map <em>already calling.</em></h2>
            </div>
            <a class="a-btn ghost" href="places.html">Explore</a>
          </div>
          <div class="a-mosaic">
            <div class="a-mosaic-tile span" style="background-image:url('${M.img("desertDunes", 900, 1100)}')"><span>Sahara</span></div>
            <div class="a-mosaic-tile" style="background-image:url('${M.img("swissMountains", 700, 500)}')"><span>Zermatt</span></div>
            <div class="a-mosaic-tile" style="background-image:url('${M.img("parisEiffel", 700, 500)}')"><span>Paris</span></div>
            <div class="a-mosaic-tile" style="background-image:url('${M.img("northernLights", 700, 500)}')"><span>Tromsø</span></div>
            <div class="a-mosaic-tile" style="background-image:url('${M.img("coastalRoad", 700, 500)}')"><span>Pacific Coast</span></div>
          </div>
        </div>
      </section>

      <section class="a-section">
        <div class="a-wrap">
          <div class="a-section-head">
            <div>
              <p class="a-eyebrow">From the shelf</p>
              <h2>Latest notes from <em>your saved feed.</em></h2>
            </div>
            <a class="a-btn ghost" href="posts.html">View all</a>
          </div>
          <div class="a-blog-grid">
            ${recentPosts
              .map(
                (post) => `
              <a class="a-blog-card" href="post.html?id=${post.id}">
                <div class="a-blog-cover" style="background-image:url('${post.cover}')">
                  <span class="a-pill">${platformLabel[post.platform] || post.platform}</span>
                </div>
                <div class="a-blog-body">
                  <h3 class="a-blog-title">${post.title}</h3>
                  <p class="a-blog-excerpt">${post.excerpt}</p>
                  <div class="a-blog-meta">${post.author} · ${post.posted}</div>
                </div>
              </a>`,
              )
              .join("")}
          </div>
        </div>
      </section>

      <section class="a-section peach">
        <div class="a-wrap">
          <div class="a-section-head">
            <div>
              <p class="a-eyebrow">Loved by travelers</p>
              <h2>Field notes from <em>real people.</em></h2>
            </div>
          </div>
          <div class="a-testimonials">
            ${testimonials
              .map(
                (t) => `
              <div class="a-testimonial">
                <div class="a-testimonial-top">
                  <div class="a-testimonial-avatar" style="background-image:url('${t.avatar}')"></div>
                  <div>
                    <h4>${t.name}</h4>
                    <span class="role">${t.role}</span>
                  </div>
                </div>
                <div class="stars">${"★".repeat(t.rating || 5)}</div>
                <p>“${t.quote}”</p>
              </div>`,
              )
              .join("")}
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
      <div id="wf-posts-root" class="wf-posts wf-posts--almanac">
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
      <div id="wf-places-root" class="wf-places wf-places--almanac">
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

      <section class="a-page-hero">
        <p class="a-eyebrow">Your library · classic</p>
        <h1>Every reel, every link — <em>on one shelf.</em></h1>
        <p>Filter by platform or by the place a post is about. Covers do the talking; the grid stays out of the way.</p>
      </section>

      <div class="a-wrap">
        <div class="a-chipbar" role="group" aria-label="Platform filter">
          <span class="a-chipbar-label">Platform</span>
          ${platforms
            .map(
              (p) => `
            <a class="a-chip ${p.key === activePlatform ? "is-active" : ""}"
               href="posts-classic.html?platform=${p.key}${activePlace !== "all" ? "&place=" + activePlace : ""}">
              ${p.label}<span class="count">${platformCount(p.key)}</span>
            </a>`,
            )
            .join("")}
        </div>

        <div class="a-chipbar" role="group" aria-label="Place filter">
          <span class="a-chipbar-label">Places</span>
          ${placeChips
            .slice(0, 10)
            .map(
              (p) => `
            <a class="a-chip ${p.id === activePlace ? "is-active" : ""}"
               href="posts-classic.html?place=${p.id}${activePlatform !== "all" ? "&platform=" + activePlatform : ""}">
              ${p.label}<span class="count">${p.count}</span>
            </a>`,
            )
            .join("")}
        </div>

        <p style="color: var(--a-muted); margin: 0 0 20px;">${filtered.length} of ${M.posts.length} saves</p>
        <div class="a-post-grid">
          ${filtered
            .map(
              (post) => `
            <a class="a-post-card" href="post.html?id=${post.id}">
              <div class="a-post-cover" style="background-image:url('${post.cover}'); aspect-ratio: ${post.aspect};">
                <span class="a-post-badge">${platformLabel[post.platform] || post.platform}</span>
                ${post.duration ? `<span class="a-post-duration">${post.duration}</span>` : ""}
                ${post.readTime ? `<span class="a-post-duration">${post.readTime}</span>` : ""}
              </div>
              <div class="a-post-body">
                <h3 class="a-post-title">${post.title}</h3>
                <div class="a-post-meta">${post.author} · ${post.posted}</div>
                <p class="a-post-excerpt">${post.excerpt}</p>
                ${post.places
                  .map((id) => {
                    const pl = M.placeById(id);
                    return pl
                      ? `<span class="a-post-place">${icon.pin} ${pl.name}</span>`
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

      <div style="height: 64px;"></div>
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

      <section class="a-page-hero">
        <p class="a-eyebrow">Your atlas · classic</p>
        <h1>Every place you're <em>headed.</em></h1>
        <p>Filter by trip type, whether you've been, or the continent. Open a place to see the reels that put it here.</p>
        <div class="a-page-tabs" role="tablist">
          ${regions
            .map(
              (r) => `
            <a role="tab" ${r.key === activeRegion ? 'aria-current="page"' : ""} href="${link({ region: r.key })}">${r.label}</a>`,
            )
            .join("")}
        </div>
      </section>

      <div class="a-wrap">
        <div class="a-chipbar">
          <span class="a-chipbar-label">Type</span>
          ${types
            .map(
              (t) => `
            <a class="a-chip ${t.key === activeType ? "is-active" : ""}" href="${link({ type: t.key })}">
              ${t.label}<span class="count">${t.count}</span>
            </a>`,
            )
            .join("")}
        </div>
        <div class="a-chipbar">
          <span class="a-chipbar-label">Status</span>
          ${statuses
            .map(
              (s) => `
            <a class="a-chip ${s.key === activeStatus ? "is-active" : ""}" href="${link({ status: s.key })}">
              ${s.label}<span class="count">${s.count}</span>
            </a>`,
            )
            .join("")}
        </div>

        <p style="color: var(--a-muted); margin: 8px 0 20px;">${filtered.length} of ${M.places.length} places</p>
        <div class="a-place-grid">
          ${filtered
            .map(
              (p) => `
            <a class="a-place-card" href="place.html?id=${p.id}">
              <div class="a-place-img" style="background-image:url('${p.hero}')"></div>
              ${p.visited ? `<span class="a-place-visited">${icon.check} Visited</span>` : `<span class="a-place-cat">${p.category}</span>`}
              <span class="a-place-count">${p.postCount} saves</span>
              <div class="a-place-body">
                <p class="a-eyebrow">${p.country}</p>
                <h3>${p.name}</h3>
                <p>${p.tagline}</p>
              </div>
            </a>`,
            )
            .join("")}
        </div>
      </div>

      <div style="height: 64px;"></div>
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

      <section class="a-detail-hero" style="height: 480px;">
        <div class="a-hero-img" style="background-image:url('${post.cover}')"></div>
        <div class="a-detail-hero-inner">
          <p class="a-eyebrow">${platformLabel[post.platform]} · ${post.author}</p>
          <h1 style="font-size: clamp(2rem, 5vw, 3.8rem);">${post.title}</h1>
          <div class="a-detail-meta">
            <span>${post.posted}</span>
            ${post.duration ? `<span>${post.duration}</span>` : ""}
            ${post.readTime ? `<span>${post.readTime}</span>` : ""}
            <span>${post.places.length} place${post.places.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </section>

      <div class="a-detail-body">
        <div>
          <h2 class="lead">${post.excerpt}</h2>
          <div class="article">
            <p>
              This saved reel joined your almanac on ${post.posted}. Wanderfile read the caption, the on-screen text,
              and the audio track to pull the specific places worth going. Open the map to see them geocoded, or
              jump into a place below to browse everything else you've saved there.
            </p>
          </div>
          <p>
            <a class="a-btn ghost" href="https://example.com" target="_blank" rel="noopener">Open on ${platformLabel[post.platform]} ↗</a>
          </p>
          <h2 style="margin-top: 40px;">Places mentioned</h2>
          <div class="a-place-grid" style="grid-template-columns: repeat(2, 1fr); margin-top: 12px;">
            ${relatedPlaces
              .map(
                (p) => `
              <a class="a-place-card" href="place.html?id=${p.id}" style="height: 260px;">
                <div class="a-place-img" style="background-image:url('${p.hero}')"></div>
                ${p.visited ? `<span class="a-place-visited">${icon.check} Visited</span>` : ""}
                <div class="a-place-body">
                  <p class="a-eyebrow">${p.country}</p>
                  <h3 style="font-size: 20px;">${p.name}</h3>
                </div>
              </a>`,
              )
              .join("")}
          </div>
        </div>
        <aside>
          <div class="a-side-card">
            <h4>Post details</h4>
            <dl>
              <div><dt>Platform</dt><dd>${platformLabel[post.platform]}</dd></div>
              <div><dt>Author</dt><dd>${post.author}</dd></div>
              <div><dt>Saved</dt><dd>${post.posted}</dd></div>
              <div><dt>Places</dt><dd>${post.places.length}</dd></div>
            </dl>
            <h4 style="margin-top: 24px;">Tags</h4>
            <div class="a-tags">
              ${post.tags.map((t) => `<span class="a-tag">#${t}</span>`).join("")}
            </div>
          </div>
          ${
            otherPosts.length
              ? `
          <div class="a-side-card" style="margin-top: 16px;">
            <h4>More from ${primaryPlace.name}</h4>
            <div style="display: grid; gap: 12px;">
              ${otherPosts
                .map(
                  (op) => `
                <a href="post.html?id=${op.id}" style="display: grid; grid-template-columns: 60px 1fr; gap: 12px; align-items: center;">
                  <div style="width: 60px; height: 60px; border-radius: 12px; background-size: cover; background-position: center; background-image: url('${op.cover}'); border: 2px solid var(--a-paper);"></div>
                  <div>
                    <div style="font-weight: 500; font-size: 14px;">${op.title}</div>
                    <div style="color: var(--a-muted); font-size: 12px;">${platformLabel[op.platform]} · ${op.posted}</div>
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

      <section class="a-detail-hero">
        <div class="a-hero-img" style="background-image:url('${place.hero}')"></div>
        <div class="a-detail-hero-inner">
          <p class="a-eyebrow">${place.continent} · ${place.country}</p>
          <h1>${place.name}</h1>
          <div class="a-detail-meta">
            <span>${posts.length} saved posts</span>
            <span>${visits.length} personal visit${visits.length === 1 ? "" : "s"}</span>
            <span>Best: ${place.bestSeason}</span>
          </div>
        </div>
      </section>

      <div class="a-detail-body">
        <div>
          <h2 class="lead">${place.tagline}</h2>
          <p>${place.summary}</p>

          <div class="a-gallery-row">
            ${place.gallery.map((g) => `<div style="background-image:url('${g}')"></div>`).join("")}
          </div>

          <h2 style="margin-top: 32px;">Saves from your feed</h2>
          <div class="a-post-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 12px;">
            ${posts
              .slice(0, 6)
              .map(
                (post) => `
              <a class="a-post-card" href="post.html?id=${post.id}">
                <div class="a-post-cover" style="background-image:url('${post.cover}');">
                  <span class="a-post-badge">${platformLabel[post.platform]}</span>
                  ${post.duration ? `<span class="a-post-duration">${post.duration}</span>` : ""}
                </div>
                <div class="a-post-body">
                  <h3 class="a-post-title">${post.title}</h3>
                  <div class="a-post-meta">${post.author} · ${post.posted}</div>
                </div>
              </a>`,
              )
              .join("")}
          </div>

          ${
            visits.length
              ? `
          <h2 style="margin-top: 40px;">Your journal here</h2>
          <div class="a-journal">
            ${visits
              .map(
                (v) => `
              <div class="a-journal-entry">
                <div class="a-journal-year">${v.when}</div>
                <div class="a-journal-note">
                  <div class="rating">${"★".repeat(v.rating)}</div>
                  <h4>Visit · ${place.name}</h4>
                  <p>${v.note}</p>
                </div>
              </div>`,
              )
              .join("")}
          </div>
          `
              : ""
          }
        </div>
        <aside>
          <div class="a-side-card">
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
            <div class="a-tags">
              ${place.tags.map((t) => `<span class="a-tag">#${t}</span>`).join("")}
            </div>
            <div style="margin-top: 20px; display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="a-btn primary" style="flex: 1;">${icon.check} Log a visit</button>
              <a class="a-btn ghost" href="add.html">${icon.plus} Add link</a>
            </div>
          </div>

          <div class="a-side-card" style="margin-top: 16px;">
            <h4>Nearby in ${place.continent}</h4>
            <div style="display: grid; gap: 12px;">
              ${M.places
                .filter((p) => p.continent === place.continent && p.id !== place.id)
                .slice(0, 3)
                .map(
                  (p) => `
                <a href="place.html?id=${p.id}" style="display: grid; grid-template-columns: 60px 1fr; gap: 12px; align-items: center;">
                  <div style="width: 60px; height: 60px; border-radius: 12px; background-size: cover; background-position: center; background-image: url('${p.hero}'); border: 2px solid var(--a-paper);"></div>
                  <div>
                    <div style="font-weight: 500; font-size: 14px;">${p.name}</div>
                    <div style="color: var(--a-muted); font-size: 12px;">${p.country} · ${p.postCount} saves</div>
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

      <section class="a-page-hero">
        <p class="a-eyebrow">One link at a time</p>
        <h1>Paste anything. <em>We'll file the rest.</em></h1>
        <p>Instagram reels, TikToks, YouTube links, blog posts — Almanac reads the caption, on-screen text, and audio for the places worth saving.</p>
      </section>

      <div class="a-wrap">
        <div class="a-add-shell">
          <h2>Paste your link(s)</h2>
          <p class="lead">One per line. We'll dedupe against what's already in your library.</p>
          <textarea class="a-add-textarea" placeholder="https://www.instagram.com/reel/...
https://www.tiktok.com/@user/video/...
https://youtube.com/watch?v=..."></textarea>
          <div class="a-add-actions">
            <span style="color: var(--a-muted); font-size: 13px;">Instagram · TikTok · YouTube · Blog · Reddit</span>
            <div style="display: flex; gap: 12px;">
              <a class="a-btn ghost" href="posts.html">Cancel</a>
              <button class="a-btn primary">Add to almanac ${icon.arrow}</button>
            </div>
          </div>
          <div class="a-add-tips">
            <div class="a-add-tip">
              <strong>iOS Share Sheet</strong>
              Share any reel or TikTok to Wanderfile directly from the app.
            </div>
            <div class="a-add-tip">
              <strong>Batch import</strong>
              Paste your entire Saved folder — we'll process in the background.
            </div>
            <div class="a-add-tip">
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

      <section class="a-page-hero">
        <p class="a-eyebrow">Your journal</p>
        <h1>Where you've <em>actually been.</em></h1>
        <p>A running log of the places you've saved — and then walked. Tap any visit to see the reels that first put it on your map.</p>
      </section>

      <div class="a-wrap">
        <div class="a-chipbar">
          <span class="a-chipbar-label">Year</span>
          <a class="a-chip is-active" href="#">All</a>
          <a class="a-chip" href="#">2024</a>
          <a class="a-chip" href="#">2023</a>
          <a class="a-chip" href="#">2022</a>
          <a class="a-chip" href="#">2019</a>
        </div>

        <div class="a-postcard-list">
          ${visits
            .map((v) => {
              const p = M.placeById(v.placeId);
              return `
              <div class="a-postcard">
                <div>
                  <p class="a-postcard-date">${v.when}</p>
                  <h4>${p ? p.name : v.placeId}</h4>
                  <div style="color: var(--a-accent); font-size: 12px; margin-top: 4px;">${"★".repeat(v.rating)}</div>
                  <p>${v.note}</p>
                </div>
                ${
                  p
                    ? `<a class="a-postcard-thumb" href="place.html?id=${p.id}" style="background-image:url('${p.hero}'); text-decoration:none;" aria-label="${p.name}"></a>`
                    : ""
                }
              </div>`;
            })
            .join("")}
        </div>

        <div style="margin-top: 40px; padding: 40px; border-radius: var(--a-radius-lg); background: var(--a-peach); border: 1px solid var(--a-line); text-align: center;">
          <h3 style="margin: 0 0 12px; font-family: var(--a-serif); font-style: italic; font-weight: 500;">Log a new visit</h3>
          <p style="color: var(--a-ink-soft); margin: 0 0 20px;">Just came back? Add the trip to your journal.</p>
          <a class="a-btn primary" href="#">${icon.plus} Add a visit</a>
        </div>
      </div>

      <div style="height: 64px;"></div>
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

      <div class="a-search-shell">
        <p class="a-eyebrow" style="color: var(--a-muted); margin-bottom: 20px;">Search your library</p>
        <form class="a-search-input" onsubmit="event.preventDefault(); const q=this.q.value; location.href = 'search.html?q=' + encodeURIComponent(q);">
          <input name="q" placeholder="Search reels, tags, places, countries…" value="${q.replace(/"/g, "&quot;")}" autofocus />
          <button class="a-btn primary" type="submit">Search ${icon.arrow}</button>
        </form>
        <p style="color: var(--a-muted); font-size: 13px; margin: 12px 0 0;">Cmd/Ctrl + K opens search anywhere.</p>

        <div class="a-search-results">
          <div class="a-search-group">
            <h3>Places · ${places.length}</h3>
            <div class="a-place-grid" style="grid-template-columns: repeat(3, 1fr);">
              ${places
                .slice(0, 3)
                .map(
                  (p) => `
                <a class="a-place-card" href="place.html?id=${p.id}" style="height: 260px;">
                  <div class="a-place-img" style="background-image:url('${p.hero}')"></div>
                  ${p.visited ? `<span class="a-place-visited">${icon.check} Visited</span>` : ""}
                  <div class="a-place-body">
                    <p class="a-eyebrow">${p.country}</p>
                    <h3 style="font-size: 20px;">${p.name}</h3>
                  </div>
                </a>`,
                )
                .join("")}
            </div>
          </div>

          <div class="a-search-group">
            <h3>Posts · ${posts.length}</h3>
            <div class="a-post-grid" style="grid-template-columns: repeat(4, 1fr);">
              ${posts
                .slice(0, 4)
                .map(
                  (post) => `
                <a class="a-post-card" href="post.html?id=${post.id}">
                  <div class="a-post-cover" style="background-image:url('${post.cover}');">
                    <span class="a-post-badge">${platformLabel[post.platform]}</span>
                  </div>
                  <div class="a-post-body">
                    <h3 class="a-post-title">${post.title}</h3>
                    <div class="a-post-meta">${post.author} · ${post.posted}</div>
                  </div>
                </a>`,
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>

      <div style="height: 64px;"></div>
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
        .then((mod) => mod.hydratePostsPage({ theme: "almanac" }))
        .catch((err) => console.warn("[almanac] posts hydrate failed", err));
    }
    if (currentPage() === "places") {
      import("../shared/places-page.js")
        .then((mod) => mod.hydratePlacesPage({ theme: "almanac" }))
        .catch((err) => console.warn("[almanac] places hydrate failed", err));
    }
  });
})();
