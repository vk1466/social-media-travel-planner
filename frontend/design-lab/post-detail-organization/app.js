/**
 * Post Detail Organization & Intra-Post Cross-Linking Architecture
 * 10 Interactive Concepts for Wanderfile Design Lab
 * Purely scoped to the data that exists within the reel/post:
 * Cover image, caption, extracted places, attached tips, and interactive map.
 * No embedded video player (links to Instagram), no OCR, no external trips or themes.
 */

// ── 1. Post Datasets (Real Data from Reel) ───────────────────────────────────
const datasets = {
  kyoto: {
    id: "kyoto",
    title: "4 Secret Kyoto Spots Without the Tour Buses",
    author: "elenainjapan",
    platform: "Instagram",
    postedDate: "Apr 12, 2025",
    savedDate: "May 3, 2025",
    mediaKind: "Reel",
    postUrl: "https://www.instagram.com/reel/C5rXYZ12345/",
    thumbUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    caption: "Everyone goes to Fushimi Inari and Kiyomizu-dera, but here are four spots in Kyoto that actually felt magical without the crowds! 1. Saiho-ji (Moss Temple) 2. Giō-ji bamboo hermitage 3. Otagi Nenbutsu-ji 4. Pontocho Alley dinner. Save this for your next trip to Japan! #kyoto #hiddengems #japantravel #kyototravel",
    summary: "A 4-stop Kyoto route focusing on tranquil morning moss temples, quiet bamboo garden paths, mountain stone rakan statues, and lantern-lit riverfront dining.",
    destination: "Kyoto, Japan",
    places: [
      {
        stopNum: 1,
        id: "jp-kyoto-saiho-ji",
        name: "Saiho-ji (Moss Temple)",
        category: "Historic Buddhist Temple",
        area: "Matsuo · Western Kyoto",
        tip: "Reservations mandatory 2 weeks early; includes sutra copying before visiting 120 varieties of moss.",
        quote: "You spend an hour quietly copying sutras before walking through carpets of emerald moss.",
        hours: "10:00–14:00",
        googleMapsQuery: "Saiho-ji+Kyoto",
        lat: "34.992",
        lng: "135.684"
      },
      {
        stopNum: 2,
        id: "jp-kyoto-gio-ji",
        name: "Giō-ji Temple & Bamboo Grove",
        category: "Hidden Garden Hermitage",
        area: "Sagano · Arashiyama",
        tip: "Far quieter than the main Arashiyama bamboo path; best in late morning light.",
        quote: "A tiny thatch-roofed temple tucked inside a bamboo grove that feels worlds away.",
        hours: "09:00–17:00",
        googleMapsQuery: "Gio-ji+Temple+Kyoto",
        lat: "35.019",
        lng: "135.669"
      },
      {
        stopNum: 3,
        id: "jp-kyoto-otagi-nenbutsu-ji",
        name: "Otagi Nenbutsu-ji",
        category: "Mountain Temple",
        area: "Deep Sagano",
        tip: "Take the #94 bus from Arashiyama station to avoid a 40-min steep uphill walk.",
        quote: "It has 1,200 quirky stone statues carved by amateur sculptors with tennis rackets and sake cups.",
        hours: "08:00–17:00",
        googleMapsQuery: "Otagi+Nenbutsu-ji+Kyoto",
        lat: "35.031",
        lng: "135.661"
      },
      {
        stopNum: 4,
        id: "jp-kyoto-pontocho-alley",
        name: "Pontocho Alley (先斗町)",
        category: "Culinary & Dining Street",
        area: "Nakagyo · Kamogawa River",
        tip: "Kawayuka wooden dining platforms open May–Sept; book river-facing seats in advance.",
        quote: "End your day having dinner along the narrow lantern-lit alley overlooking the river.",
        hours: "17:00–Late",
        googleMapsQuery: "Pontocho+Alley+Kyoto",
        lat: "35.006",
        lng: "135.771"
      }
    ]
  },

  amalfi: {
    id: "amalfi",
    title: "Amalfi Coast Beyond Positano: Cliff Walk & Bakeries",
    author: "marcofoodie",
    platform: "Instagram",
    postedDate: "Jun 14, 2025",
    savedDate: "Jul 1, 2025",
    mediaKind: "Reel",
    postUrl: "https://www.instagram.com/reel/C8aXYZ98765/",
    thumbUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    caption: "Skip the gridlock in Positano! Here is a peaceful half-day cliff route through Ravello down to Minori and the secret swimming fjord. 1. Villa Cimbrone 2. Sal De Riso 3. Fiordo di Furore. #amalficoast #italytravel #ravello",
    summary: "A food and cliffside walking route starting in Ravello and descending down ancient lemon-grove stairs to Minori and Furore.",
    destination: "Amalfi Coast, Italy",
    places: [
      {
        stopNum: 1,
        id: "it-ravello-villa-cimbrone",
        name: "Villa Cimbrone Gardens",
        category: "Historic Cliff Villa",
        area: "Ravello",
        tip: "Arrive at 9:00am right when gates open to have the Terrace of Infinity to yourself.",
        quote: "Walk straight out to the Terrace of Infinity for the most dramatic cliff view on the coast.",
        hours: "09:00–19:30",
        googleMapsQuery: "Villa+Cimbrone+Ravello",
        lat: "40.648",
        lng: "14.611"
      },
      {
        stopNum: 2,
        id: "it-minori-sal-de-riso",
        name: "Pasticceria Sal De Riso",
        category: "Pastry Shop & Cafe",
        area: "Minori Promenade",
        tip: "Order the Delizia al Limone and pair it with iced limoncello.",
        quote: "In Minori, you must stop at Sal De Riso for the most airy, perfumed lemon cake on Earth.",
        hours: "08:00–23:00",
        googleMapsQuery: "Sal+De+Riso+Minori",
        lat: "40.650",
        lng: "14.626"
      },
      {
        stopNum: 3,
        id: "it-furore-fjord-beach",
        name: "Fiordo di Furore",
        category: "Hidden Beach & Fjord",
        area: "Furore",
        tip: "The narrow cove only receives direct sunlight between 11:00 and 14:00.",
        quote: "A secluded sea canyon with fishing boats resting under the suspension bridge.",
        hours: "Open 24h",
        googleMapsQuery: "Fiordo+di+Furore",
        lat: "40.613",
        lng: "14.551"
      }
    ]
  },

  paris: {
    id: "paris",
    title: "Hidden Covered Passages of 19th Century Paris",
    author: "parisiancorners",
    platform: "Instagram",
    postedDate: "Feb 19, 2025",
    savedDate: "Mar 10, 2025",
    mediaKind: "Reel",
    postUrl: "https://www.instagram.com/reel/C3zXYZ54321/",
    thumbUrl: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    caption: "The best rainy day walk in Paris: 3 interconnected 19th-century covered arcades with vintage books, mosaic floors, and cozy bistros. 1. Galerie Vivienne 2. Passage des Panoramas 3. Passage Jouffroy. #parishiddengems #coveredpassages",
    summary: "A continuous walking route through 3 historic glass-roofed arcades in the 2nd and 9th arrondissements.",
    destination: "Paris, France",
    places: [
      {
        stopNum: 1,
        id: "fr-paris-galerie-vivienne",
        name: "Galerie Vivienne",
        category: "Covered Arcade",
        area: "2nd Arrondissement",
        tip: "Look down at the original 1823 mosaic floors by mosaicist Giandomenico Facchina.",
        quote: "Start at Galerie Vivienne, which has the most stunning neoclassical glass dome and mosaic tiles.",
        hours: "08:30–20:30",
        googleMapsQuery: "Galerie+Vivienne+Paris",
        lat: "48.866",
        lng: "2.339"
      },
      {
        stopNum: 2,
        id: "fr-paris-passage-des-panoramas",
        name: "Passage des Panoramas",
        category: "Dining Arcade",
        area: "Grands Boulevards",
        tip: "Paris's first gas-lit arcade; excellent small wine bars for lunch.",
        quote: "Cross the street into Passage des Panoramas for lunch at an artisanal wine counter.",
        hours: "06:00–00:00",
        googleMapsQuery: "Passage+des+Panoramas+Paris",
        lat: "48.871",
        lng: "2.341"
      },
      {
        stopNum: 3,
        id: "fr-paris-passage-jouffroy",
        name: "Passage Jouffroy",
        category: "Glass & Iron Arcade",
        area: "9th Arrondissement",
        tip: "Has original underfloor heating grates from 1845; houses antique bookshops.",
        quote: "Finish in Passage Jouffroy browsing rare books, vintage posters, and old curiosities.",
        hours: "07:00–21:30",
        googleMapsQuery: "Passage+Jouffroy+Paris",
        lat: "48.872",
        lng: "2.342"
      }
    ]
  }
};

// ── 2. The 10 Post-Scoped Architectural Concepts ─────────────────────────────
const concepts = [
  {
    id: "01",
    name: "The Visual Split-Dossier",
    kicker: "Recommended Layout",
    paradigm: "Cover & Places Side-by-Side",
    philosophy: "Retires the 180° flip card. High-res post cover photo and creator provenance stay pinned on the left, while structured places, tips, and the map scroll on the right.",
    crosslinkBreakthrough: "Tapping any place card immediately highlights its numbered pin on the map and scrolls to its location.",
    bestFor: "Standard desktop modal and wide tablet screens; clean and balanced.",
    render: (dataset, surface) => renderSplitDossier(dataset, surface)
  },
  {
    id: "02",
    name: "The Chronological Route Stepper",
    kicker: "Narrative Order",
    paradigm: "Step-by-Step Stop Sequence",
    philosophy: "Respects the sequence presented in the reel. Lays out Stop 1 → Stop 2 → Stop 3 as a continuous route with creator commentary.",
    crosslinkBreakthrough: "Direct Google Maps multi-stop directions link for the creator's exact route, paired with transit tips from the post.",
    bestFor: "Reels that share day itineraries, walking tours, or ordered food trails.",
    render: (dataset, surface) => renderRouteStepper(dataset, surface)
  },
  {
    id: "03",
    name: "The Content Bento Dashboard",
    kicker: "High-Scan Visuals",
    paradigm: "Modular Asymmetric Grid",
    philosophy: "No unformatted text walls. All data extracted from this post—cover image, map, places, tips, and caption—is packaged into scannable cards.",
    crosslinkBreakthrough: "Synchronized cross-highlights: hovering a place in the list pulses the map pin and highlights its mention in the caption box.",
    bestFor: "Desktop overview and users who want instant scannability.",
    render: (dataset, surface) => renderContentBento(dataset, surface)
  },
  {
    id: "04",
    name: "The Map-Dominant Split View",
    kicker: "Spatial Split-View",
    paradigm: "Map-First Exploration",
    philosophy: "Geography leads the interaction. The map takes 50% of the screen showing all stops and their connecting path.",
    crosslinkBreakthrough: "Clicking a map pin smoothly scrolls that place card into view; hovering a card highlights the map pin.",
    bestFor: "Travelers checking geographic spread, walking distances, and neighborhood locations.",
    render: (dataset, surface) => renderMapDominant(dataset, surface)
  },
  {
    id: "05",
    name: "The Focused Place Carousel",
    kicker: "Focus Stepper",
    paradigm: "Single-Stop Carousel Mode",
    philosophy: "Instead of a crowded list, lets the user focus on one stop at a time with full commentary, hours, coordinates, and creator tip.",
    crosslinkBreakthrough: "Top segmented stepper tabs (e.g. `[1. Saiho-ji]` `[2. Gio-ji]`) immediately sync the map view.",
    bestFor: "Deep reading without visual clutter; great for mobile and compact modals.",
    render: (dataset, surface) => renderPlaceCarousel(dataset, surface)
  },
  {
    id: "06",
    name: "The Two-Column Reading Deck",
    kicker: "Editorial Article",
    paradigm: "Provenance & Place Directory",
    philosophy: "Left column acts as the post book jacket (cover, creator, full caption). Right column is the clean extracted directory of places.",
    crosslinkBreakthrough: "Clear separation between the creator's social voice and the objective place directory.",
    bestFor: "Editorial feel and long captions with rich commentary.",
    render: (dataset, surface) => renderReadingDeck(dataset, surface)
  },
  {
    id: "07",
    name: "The Stop & Advice Matrix",
    kicker: "Actionable Digest",
    paradigm: "Compact Directory Table",
    philosophy: "High-density matrix: Stop Name | Neighborhood | Practical Tip | Direct Maps Action. Zero fluff.",
    crosslinkBreakthrough: "Scannable row-by-row layout where each stop has its specific advice immediately visible.",
    bestFor: "Quick scanning on desktop or mobile when looking for fast answers.",
    render: (dataset, surface) => renderAdviceMatrix(dataset, surface)
  },
  {
    id: "08",
    name: "Interactive Caption Reader",
    kicker: "Text-First Navigation",
    paradigm: "Caption with Entity Pills",
    philosophy: "Presents the creator's caption as clean editorial text, with embedded interactive entity pills for every place mentioned.",
    crosslinkBreakthrough: "Clicking any place pill inside the text immediately scrolls to and highlights its place card.",
    bestFor: "Social posts where the caption is the primary vehicle of information.",
    render: (dataset, surface) => renderCaptionReader(dataset, surface)
  },
  {
    id: "09",
    name: "Mobile Bottom Sheet",
    kicker: "Mobile Native",
    paradigm: "Cover Header & Swipeable Sheet",
    philosophy: "Mobile-first pattern where the cover photo remains visible in the top third while the user browses places and tips below.",
    crosslinkBreakthrough: "Tapping any place card scrolls into view and provides instant Google Maps navigation.",
    bestFor: "Expo mobile app and responsive mobile web.",
    render: (dataset, surface) => renderMobileSheet(dataset, surface)
  },
  {
    id: "10",
    name: "The Destination Overview",
    kicker: "City & Stops Hub",
    paradigm: "Destination Dossier",
    philosophy: "Frames the post as a mini city guide. Shows the destination header, summary, interactive map, and places directory.",
    crosslinkBreakthrough: "Combines all stops into a cohesive regional overview with attached tips.",
    bestFor: "City-focused travel inspiration.",
    render: (dataset, surface) => renderDestinationOverview(dataset, surface)
  }
];

// ── 3. Shared Intra-Post UI Components ───────────────────────────────────────

function renderChromeHeader(dataset) {
  return `
    <div class="modal-chrome-bar">
      <div class="chrome-provenance">
        <span class="chrome-platform-badge">📸 ${dataset.platform} ${dataset.mediaKind}</span>
        <a class="chrome-author-link" href="${dataset.postUrl}" target="_blank" rel="noreferrer">
          @${dataset.author} ↗
        </a>
        <span style="color: var(--muted); font-size: 11px;">· Saved ${dataset.savedDate}</span>
      </div>
      <div class="chrome-actions">
        <a class="chrome-btn primary" href="${dataset.postUrl}" target="_blank" rel="noreferrer">
          Watch on Instagram ↗
        </a>
        <button class="chrome-btn-close" aria-label="Close" onclick="showToast('Close modal simulation');">×</button>
      </div>
    </div>
  `;
}

function renderPostSummaryBar(dataset) {
  return `
    <div style="padding: 14px 20px; background: #fafbfa; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div>
        <h2 style="font-family: var(--serif); font-size: 24px; margin: 0 0 4px;">${dataset.title}</h2>
        <p style="margin: 0; color: var(--muted); font-size: 13px; max-width: 680px;">${dataset.summary}</p>
      </div>
      <div style="display: flex; gap: 6px;">
        <span style="font-size: 11px; font-weight: 700; background: var(--sage-wash); color: var(--forest-dark); padding: 4px 8px; border-radius: 6px;">
          📍 ${dataset.places.length} Places Found
        </span>
        <span style="font-size: 11px; font-weight: 700; background: var(--yellow-soft); color: #7a6316; padding: 4px 8px; border-radius: 6px;">
          💡 ${dataset.places.length} Creator Tips
        </span>
      </div>
    </div>
  `;
}

function renderPostCoverCard(dataset) {
  return `
    <div style="position: relative; height: 340px; border-radius: 12px; overflow: hidden; background: #000;">
      <div style="position: absolute; inset: 0; background-image: url('${dataset.thumbUrl}'); background-size: cover; background-position: center;"></div>
      <div class="mock-reel-vignette"></div>
      <div style="position: absolute; bottom: 16px; left: 16px; right: 16px; color: #fff; z-index: 2;">
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; background: rgba(0,0,0,0.6); padding: 2px 8px; border-radius: 4px; display: inline-block; margin-bottom: 6px;">
          ${dataset.destination}
        </span>
        <h3 style="margin: 0 0 8px; font-family: var(--serif); font-size: 22px; line-height: 1.15; text-shadow: 0 1px 4px rgba(0,0,0,0.6);">
          ${dataset.title}
        </h3>
        <a href="${dataset.postUrl}" target="_blank" rel="noreferrer" class="chrome-btn" style="background: rgba(255,255,255,0.92); color: #000; font-weight: 700; font-size: 11px; display: inline-flex; align-items: center; gap: 6px;">
          ▶ Watch Reel on Instagram ↗
        </a>
      </div>
    </div>
  `;
}

function renderMockMap(dataset, activeIndex = 0) {
  return `
    <div class="mock-map-canvas" style="min-height: 190px;">
      <div class="mock-map-grid"></div>
      <div class="mock-map-route-line"></div>
      ${dataset.places.map((p, i) => `
        <div class="mock-map-pin ${i === activeIndex ? 'is-active' : ''}" 
             style="top: ${28 + i * 18}%; left: ${22 + i * 20}%;"
             onclick="showToast('Focused Map Pin #${p.stopNum}: ${p.name}');">
          <span class="pin-dot"></span>
          <span>#${p.stopNum} ${p.name.split(" ")[0]}</span>
        </div>
      `).join("")}
    </div>
  `;
}

// ── Model 01: The Visual Split-Dossier ───────────────────────────────────────
function renderSplitDossier(dataset, surface) {
  return `
    <div style="display: flex; flex-direction: column; height: 100%;">
      ${renderChromeHeader(dataset)}
      ${renderPostSummaryBar(dataset)}

      <div style="display: grid; grid-template-columns: ${surface === 'mobile' ? '1fr' : '400px 1fr'}; flex: 1; overflow: hidden;">
        <!-- Left: Post Cover & Caption -->
        <div style="padding: 18px; border-right: ${surface === 'mobile' ? 'none' : '1px solid var(--line)'}; background: #fdfdfd; display: flex; flex-direction: column; gap: 14px; overflow-y: auto;">
          ${renderPostCoverCard(dataset)}

          <!-- Caption Box -->
          <div style="background: var(--paper-card); border: 1px solid var(--line); border-radius: 10px; padding: 14px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 6px;">
              Original Creator Caption:
            </span>
            <p style="margin: 0; font-size: 13px; line-height: 1.55; color: var(--ink-soft);">
              ${dataset.caption}
            </p>
          </div>

          <!-- Map Overview -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted);">Map Coordinates</span>
            ${renderMockMap(dataset, 0)}
          </div>
        </div>

        <!-- Right: Structured Places & Attached Tips -->
        <div style="padding: 20px; overflow-y: auto; background: #fff; display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0; font-size: 16px;">Stops Mentioned in this Post (${dataset.places.length})</h3>
            <span style="font-size: 11px; color: var(--muted);">Click stop to highlight on map</span>
          </div>

          <div class="places-list-container">
            ${dataset.places.map((p, idx) => `
              <div class="place-card-item ${idx === 0 ? 'is-selected' : ''}">
                <div class="place-card-header">
                  <div class="place-title-wrap">
                    <span class="place-stop-badge">${p.stopNum}</span>
                    <div>
                      <span class="place-name-link" style="cursor: pointer;" onclick="showToast('Focused ${p.name} on map');">
                        ${p.name}
                      </span>
                      <div class="place-meta-line">${p.category} · ${p.area} · ${p.hours}</div>
                    </div>
                  </div>
                </div>

                <!-- Attached Creator Tip -->
                <div class="place-tip-box">
                  <span>💡</span>
                  <span><strong>Tip from reel:</strong> ${p.tip}</span>
                </div>

                <!-- Intra-Post Actions -->
                <div class="place-crosslink-actions">
                  <a class="crosslink-btn" href="https://maps.google.com/?q=${p.googleMapsQuery}" target="_blank" rel="noreferrer">
                    Google Maps ↗
                  </a>
                  <button class="crosslink-btn" onclick="showToast('Centered map pin #${p.stopNum}');">
                    Highlight on Map 📍
                  </button>
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Model 02: The Chronological Route Stepper ────────────────────────────────
function renderRouteStepper(dataset, surface) {
  return `
    <div style="display: flex; flex-direction: column; height: 100%; overflow-y: auto;">
      ${renderChromeHeader(dataset)}
      ${renderPostSummaryBar(dataset)}

      <div style="padding: 24px; max-width: 820px; margin: 0 auto; width: 100%;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
          <div>
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--coral); letter-spacing: 0.1em;">
              Creator's Recommended Route Order
            </span>
            <h3 style="font-size: 22px; font-family: var(--serif); margin: 4px 0;">Sequence of Stops</h3>
            <p style="margin: 0; color: var(--muted); font-size: 13px;">Follow the creator's footsteps in chronological order.</p>
          </div>
          <a href="https://maps.google.com/?q=${dataset.places.map(p => p.googleMapsQuery).join("+to:")}" target="_blank" rel="noreferrer" class="chrome-btn primary" style="font-size: 12px;">
            Open Full Route in Google Maps ↗
          </a>
        </div>

        <!-- Stepper -->
        <div style="position: relative; padding-left: 36px; border-left: 2px dashed var(--coral); margin-left: 14px;">
          ${dataset.places.map((p, idx) => `
            <div style="position: relative; margin-bottom: 28px;">
              <div style="position: absolute; left: -49px; top: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--forest-dark); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 700; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
                ${p.stopNum}
              </div>

              <div class="place-card-item">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                    <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--coral);">
                      Stop ${p.stopNum} of ${dataset.places.length}
                    </span>
                    <h4 style="margin: 3px 0; font-size: 16px;">${p.name}</h4>
                    <div style="font-size: 12px; color: var(--muted);">${p.category} · ${p.area}</div>
                  </div>
                </div>

                <!-- Creator's commentary quote -->
                <p style="margin: 8px 0; font-style: italic; font-size: 13px; color: var(--ink-soft); background: var(--paper-tint); padding: 8px 12px; border-radius: 6px;">
                  "${p.quote}"
                </p>

                <div class="place-tip-box">
                  <span>💡 <strong>Advice:</strong> ${p.tip}</span>
                </div>

                <div class="place-crosslink-actions">
                  <a class="crosslink-btn" href="https://maps.google.com/?q=${p.googleMapsQuery}" target="_blank" rel="noreferrer">
                    Google Maps ↗
                  </a>
                  <button class="crosslink-btn" onclick="showToast('Highlighted Pin #${p.stopNum}');">
                    Focus Pin on Map 📍
                  </button>
                </div>
              </div>

              ${idx < dataset.places.length - 1 ? `
                <div style="margin: 8px 0 0 10px; font-size: 11px; color: var(--muted);">
                  ↓ Walk or transit to Stop ${idx + 2}
                </div>
              ` : ''}
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Model 03: The Content Bento Dashboard ────────────────────────────────────
function renderContentBento(dataset, surface) {
  return `
    <div style="display: flex; flex-direction: column; height: 100%; overflow-y: auto;">
      ${renderChromeHeader(dataset)}
      ${renderPostSummaryBar(dataset)}

      <div style="padding: 20px;">
        <div style="display: grid; grid-template-columns: ${surface === 'mobile' ? '1fr' : 'repeat(3, 1fr)'}; gap: 14px;">
          
          <!-- Tile 1: Cover Image & Caption (Span 2) -->
          <div style="grid-column: ${surface === 'mobile' ? '1' : 'span 2'};">
            ${renderPostCoverCard(dataset)}
          </div>

          <!-- Tile 2: Post Map Snapshot -->
          <div style="background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--muted);">Map Coordinates</span>
              <h4 style="margin: 4px 0; font-size: 15px;">${dataset.destination}</h4>
              <p style="margin: 0; font-size: 12px; color: var(--muted);">${dataset.places.length} geocoded locations</p>
            </div>
            ${renderMockMap(dataset, 0)}
            <a href="https://maps.google.com/?q=${dataset.destination}" target="_blank" rel="noreferrer" class="chrome-btn" style="justify-content: center; margin-top: 8px;">
              Open in Google Maps ↗
            </a>
          </div>

          <!-- Tile 3: Discovered Places Grid (Span 2) -->
          <div style="grid-column: ${surface === 'mobile' ? '1' : 'span 2'}; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px;">
            <h4 style="margin: 0 0 12px; font-size: 15px;">Discovered Places (${dataset.places.length})</h4>
            <div style="display: grid; grid-template-columns: ${surface === 'mobile' ? '1fr' : '1fr 1fr'}; gap: 10px;">
              ${dataset.places.map(p => `
                <div style="border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: var(--paper-card);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <strong style="font-size: 13px;">#${p.stopNum} ${p.name}</strong>
                  </div>
                  <div style="font-size: 11px; color: var(--muted); margin: 2px 0 6px;">${p.area} · ${p.hours}</div>
                  <div style="font-size: 11px; color: #7a6316; background: var(--yellow-soft); padding: 4px 6px; border-radius: 4px; margin-bottom: 6px;">
                    ${p.tip}
                  </div>
                  <a href="https://maps.google.com/?q=${p.googleMapsQuery}" target="_blank" rel="noreferrer" class="crosslink-btn" style="font-size: 10px;">Google Maps ↗</a>
                </div>
              `).join("")}
            </div>
          </div>

          <!-- Tile 4: Original Creator Caption -->
          <div style="background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px;">
            <h4 style="margin: 0; font-size: 15px;">Original Caption</h4>
            <div style="font-size: 12px; color: var(--muted); background: var(--paper-tint); padding: 10px; border-radius: 6px; line-height: 1.5; max-height: 180px; overflow-y: auto;">
              ${dataset.caption}
            </div>
            <a href="${dataset.postUrl}" target="_blank" rel="noreferrer" class="chrome-btn" style="justify-content: center;">
              Open Reel on Instagram ↗
            </a>
          </div>

        </div>
      </div>
    </div>
  `;
}

// ── Model 04: The Map-Dominant Split View ────────────────────────────────────
function renderMapDominant(dataset, surface) {
  return `
    <div style="display: flex; flex-direction: column; height: 100%;">
      ${renderChromeHeader(dataset)}
      ${renderPostSummaryBar(dataset)}

      <div style="display: grid; grid-template-columns: ${surface === 'mobile' ? '1fr' : '1fr 440px'}; flex: 1; overflow: hidden;">
        <!-- Left: Interactive Spatial Canvas -->
        <div style="background: #dfe8e2; position: relative; display: flex; flex-direction: column; justify-content: space-between; padding: 20px; overflow: hidden;">
          <div style="z-index: 10; background: #fff; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--line); font-size: 12px; font-weight: 600; align-self: flex-start;">
            📍 ${dataset.places.length} stops from this post
          </div>

          <div style="position: absolute; inset: 0;">
            <div class="mock-map-grid"></div>
            <div class="mock-map-route-line"></div>
            ${dataset.places.map((p, i) => `
              <div class="mock-map-pin ${i === 0 ? 'is-active' : ''}" 
                   style="top: ${28 + i * 18}%; left: ${20 + i * 20}%;"
                   onclick="showToast('Focused Stop #${p.stopNum}: ${p.name}');">
                <span class="pin-dot"></span>
                <span>#${p.stopNum} ${p.name.split(" ")[0]}</span>
              </div>
            `).join("")}
          </div>

          <div style="z-index: 10; background: rgba(255,255,255,0.9); padding: 8px 12px; border-radius: 6px; font-size: 11px; align-self: flex-end;">
            Hover any card on the right to focus its pin
          </div>
        </div>

        <!-- Right: Scrollable Place Cards -->
        <div style="padding: 18px; overflow-y: auto; background: #fff; display: flex; flex-direction: column; gap: 12px;">
          <h4 style="margin: 0; font-size: 15px;">Stops in ${dataset.destination}</h4>
          ${dataset.places.map((p, idx) => `
            <div class="place-card-item ${idx === 0 ? 'is-selected' : ''}" onmouseenter="showToast('Highlighted Pin #${p.stopNum}');">
              <div class="place-card-header">
                <div class="place-title-wrap">
                  <span class="place-stop-badge">${p.stopNum}</span>
                  <div>
                    <strong style="font-size: 14px;">${p.name}</strong>
                    <div class="place-meta-line">${p.area} · ${p.hours}</div>
                  </div>
                </div>
              </div>
              <div class="place-tip-box">
                <span>${p.tip}</span>
              </div>
              <div class="place-crosslink-actions">
                <a href="https://maps.google.com/?q=${p.googleMapsQuery}" target="_blank" rel="noreferrer" class="crosslink-btn">Google Maps ↗</a>
                <button class="crosslink-btn" onclick="showToast('Focused map pin #${p.stopNum}');">Pin on Map 📍</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Model 05: The Focused Place Carousel ─────────────────────────────────────
function renderPlaceCarousel(dataset, surface) {
  const p = dataset.places[0];
  return `
    <div style="display: flex; flex-direction: column; height: 100%; overflow-y: auto;">
      ${renderChromeHeader(dataset)}
      ${renderPostSummaryBar(dataset)}

      <div style="padding: 24px; max-width: 760px; margin: 0 auto; width: 100%;">
        <!-- Stop Selector Stepper Tabs -->
        <div style="display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto;">
          ${dataset.places.map((place, idx) => `
            <button class="chrome-btn ${idx === 0 ? 'primary' : ''}" style="white-space: nowrap;" onclick="showToast('Selected Stop #${place.stopNum}: ${place.name}');">
              #${place.stopNum} ${place.name.split(" ")[0]}
            </button>
          `).join("")}
        </div>

        <!-- Spotlight Place Card -->
        <div style="border: 1px solid var(--line); border-radius: 16px; overflow: hidden; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.06);">
          <div style="height: 240px; position: relative; background-image: url('${dataset.thumbUrl}'); background-size: cover; background-position: center;">
            <div class="mock-reel-vignette"></div>
            <div style="position: absolute; bottom: 16px; left: 20px; color: #fff;">
              <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; background: var(--coral); padding: 2px 8px; border-radius: 4px;">
                Stop 01 of 0${dataset.places.length}
              </span>
              <h2 style="font-family: var(--serif); font-size: 32px; margin: 4px 0 0;">${p.name}</h2>
              <span style="font-size: 13px; opacity: 0.9;">${p.category} · ${p.area}</span>
            </div>
          </div>

          <div style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
            <div>
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted);">What the Creator Said:</span>
              <blockquote style="margin: 6px 0; font-family: var(--serif); font-size: 20px; font-style: italic; line-height: 1.4; color: var(--ink);">
                "${p.quote}"
              </blockquote>
            </div>

            <div class="place-tip-box" style="font-size: 13px; padding: 12px 14px;">
              <span>💡 <strong>Practical Advice:</strong> ${p.tip}</span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; background: var(--paper-tint); border-radius: 8px; font-size: 12px;">
              <div><strong>Opening Hours:</strong> ${p.hours}</div>
              <div><strong>Coordinates:</strong> ${p.lat}, ${p.lng}</div>
              <div><strong>Neighborhood:</strong> ${p.area}</div>
              <div><strong>Category:</strong> ${p.category}</div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <a href="https://maps.google.com/?q=${p.googleMapsQuery}" target="_blank" rel="noreferrer" class="chrome-btn primary" style="flex: 1; justify-content: center; padding: 10px;">
                Open in Google Maps ↗
              </a>
              <a href="${dataset.postUrl}" target="_blank" rel="noreferrer" class="chrome-btn" style="flex: 1; justify-content: center; padding: 10px;">
                Watch on Instagram ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Model 06: The Two-Column Reading Deck ────────────────────────────────────
function renderReadingDeck(dataset, surface) {
  return `
    <div style="display: flex; flex-direction: column; height: 100%; overflow-y: auto;">
      ${renderChromeHeader(dataset)}
      ${renderPostSummaryBar(dataset)}

      <div style="display: grid; grid-template-columns: ${surface === 'mobile' ? '1fr' : '380px 1fr'}; gap: 24px; padding: 24px; max-width: 1080px; margin: 0 auto; width: 100%;">
        <!-- Left: Editorial Book Jacket -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${renderPostCoverCard(dataset)}

          <div style="background: var(--paper-card); border: 1px solid var(--line); border-radius: 12px; padding: 16px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 8px;">
              Full Creator Caption
            </span>
            <p style="margin: 0; font-size: 13px; line-height: 1.6; color: var(--ink-soft);">
              ${dataset.caption}
            </p>
          </div>
        </div>

        <!-- Right: Extracted Place Directory -->
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <h3 style="margin: 0; font-size: 18px; font-family: var(--serif);">Extracted Places Directory</h3>
          ${dataset.places.map(p => `
            <div class="place-card-item">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <span style="font-size: 10px; font-weight: 700; color: var(--forest-dark); background: var(--sage-wash); padding: 2px 6px; border-radius: 4px;">
                    Stop #${p.stopNum}
                  </span>
                  <h4 style="margin: 4px 0 2px; font-size: 16px;">${p.name}</h4>
                  <div style="font-size: 12px; color: var(--muted);">${p.area} · ${p.hours}</div>
                </div>
                <a href="https://maps.google.com/?q=${p.googleMapsQuery}" target="_blank" rel="noreferrer" class="crosslink-btn">
                  Google Maps ↗
                </a>
              </div>
              <div class="place-tip-box" style="margin-top: 8px;">
                <span>💡 ${p.tip}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Model 07: The Stop & Advice Matrix ────────────────────────────────────────
function renderAdviceMatrix(dataset, surface) {
  return `
    <div style="display: flex; flex-direction: column; height: 100%; overflow-y: auto;">
      ${renderChromeHeader(dataset)}
      ${renderPostSummaryBar(dataset)}

      <div style="padding: 24px; max-width: 920px; margin: 0 auto; width: 100%;">
        <div style="margin-bottom: 16px;">
          <h3 style="font-size: 20px; font-family: var(--serif); margin: 0 0 4px;">Stop &amp; Practical Advice Digest</h3>
          <p style="margin: 0; color: var(--muted); font-size: 13px;">High-density matrix matching each location to the creator's advice and Google Maps link.</p>
        </div>

        <div style="border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: #fff;">
          <div style="padding: 12px 16px; background: var(--paper-tint); border-bottom: 1px solid var(--line); display: grid; grid-template-columns: 36px 200px 1fr 120px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--muted);">
            <span>#</span>
            <span>Stop &amp; Category</span>
            <span>Practical Advice / Tip</span>
            <span>Action</span>
          </div>

          ${dataset.places.map(p => `
            <div style="padding: 14px 16px; border-bottom: 1px solid var(--line); display: grid; grid-template-columns: ${surface === 'mobile' ? '1fr' : '36px 200px 1fr 120px'}; gap: 12px; align-items: center;">
              <span style="font-weight: 700; color: var(--muted);">${p.stopNum}</span>
              <div>
                <strong style="font-size: 14px; display: block;">${p.name}</strong>
                <span style="font-size: 11px; color: var(--muted);">${p.area}</span>
              </div>
              <div style="font-size: 12px; color: #5c4b10; background: var(--yellow-soft); padding: 6px 10px; border-radius: 6px;">
                💡 ${p.tip}
              </div>
              <div>
                <a href="https://maps.google.com/?q=${p.googleMapsQuery}" target="_blank" rel="noreferrer" class="crosslink-btn" style="width: 100%; justify-content: center;">
                  Maps ↗
                </a>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Model 08: Interactive Caption Reader ─────────────────────────────────────
function renderCaptionReader(dataset, surface) {
  return `
    <div style="display: flex; flex-direction: column; height: 100%; overflow-y: auto;">
      ${renderChromeHeader(dataset)}
      ${renderPostSummaryBar(dataset)}

      <div style="padding: 24px; max-width: 820px; margin: 0 auto; width: 100%;">
        <div style="background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 24px;">
          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--coral); letter-spacing: 0.1em;">
            Interactive Caption Navigation
          </span>
          <h3 style="font-size: 20px; font-family: var(--serif); margin: 6px 0 12px;">Creator Caption with Entity Links</h3>
          <p style="font-size: 12px; color: var(--muted); margin: 0 0 20px;">
            Click any highlighted place mention below to focus its details.
          </p>

          <div style="font-size: 15px; line-height: 1.8; color: var(--ink-soft); padding: 18px; background: var(--paper-tint); border-radius: 10px;">
            "Everyone goes to Fushimi Inari and Kiyomizu-dera, but here are four spots in Kyoto that actually felt magical without the crowds! 
            1. <button class="crosslink-timestamp-pill" onclick="showToast('Selected Saiho-ji');">📍 Saiho-ji (Moss Temple)</button> 
            2. <button class="crosslink-timestamp-pill" onclick="showToast('Selected Giō-ji');">📍 Giō-ji bamboo hermitage</button> 
            3. <button class="crosslink-timestamp-pill" onclick="showToast('Selected Otagi Nenbutsu-ji');">📍 Otagi Nenbutsu-ji</button> 
            4. <button class="crosslink-timestamp-pill" onclick="showToast('Selected Pontocho Alley');">📍 Pontocho Alley</button> dinner. 
            Save this for your next trip to Japan! #kyoto #hiddengems #japantravel"
          </div>

          <!-- Places Grid Preview -->
          <div style="margin-top: 24px;">
            <h4 style="font-size: 14px; margin: 0 0 10px;">Extracted Locations:</h4>
            <div style="display: grid; grid-template-columns: ${surface === 'mobile' ? '1fr' : '1fr 1fr'}; gap: 10px;">
              ${dataset.places.map(p => `
                <div style="border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: #fff;">
                  <div style="display: flex; justify-content: space-between;">
                    <strong>#${p.stopNum} ${p.name}</strong>
                    <a href="https://maps.google.com/?q=${p.googleMapsQuery}" target="_blank" rel="noreferrer" class="crosslink-btn" style="font-size: 10px;">Maps ↗</a>
                  </div>
                  <div style="font-size: 11px; color: #7a6316; margin-top: 4px;">${p.tip}</div>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Model 09: Mobile Bottom Sheet ───────────────────────────────────────────
function renderMobileSheet(dataset, surface) {
  return `
    <div style="display: flex; flex-direction: column; height: 100%; position: relative;">
      <div class="mobile-notch">
        <span>9:41</span>
        <div class="mobile-notch-pill"></div>
        <span>5G 100%</span>
      </div>

      <!-- Static Cover Header -->
      <div style="height: 220px; position: relative; background: #000; flex-shrink: 0;">
        <div style="position: absolute; inset: 0; background-image: url('${dataset.thumbUrl}'); background-size: cover; background-position: center; opacity: 0.85;"></div>
        <div class="mock-reel-vignette"></div>
        <div style="position: absolute; top: 12px; left: 14px; right: 14px; display: flex; justify-content: space-between; z-index: 10;">
          <span style="font-size: 10px; background: rgba(0,0,0,0.6); color: #fff; padding: 2px 8px; border-radius: 99px;">
            Instagram Reel
          </span>
          <button style="width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.6); color: #fff; display: grid; place-items: center;" onclick="showToast('Close modal');">
            ✕
          </button>
        </div>
        <div style="position: absolute; bottom: 10px; left: 14px; right: 14px; color: #fff; z-index: 10;">
          <h4 style="margin: 0; font-size: 16px;">${dataset.title}</h4>
          <a href="${dataset.postUrl}" target="_blank" rel="noreferrer" style="font-size: 11px; color: var(--yellow); text-decoration: underline;">
            Watch Reel on Instagram ↗
          </a>
        </div>
      </div>

      <!-- Scrollable Content Sheet -->
      <div style="flex: 1; background: #fff; border-radius: 16px 16px 0 0; margin-top: -12px; position: relative; z-index: 20; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;">
        <div style="width: 36px; height: 4px; background: var(--line); border-radius: 99px; margin: 0 auto 4px;"></div>

        <h4 style="margin: 0; font-size: 15px;">Places in this Post (${dataset.places.length})</h4>

        <div class="places-list-container">
          ${dataset.places.map(p => `
            <div class="place-card-item" style="padding: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; gap: 6px;">
                  <span class="place-stop-badge">${p.stopNum}</span>
                  <div>
                    <strong style="font-size: 13px;">${p.name}</strong>
                    <div style="font-size: 11px; color: var(--muted);">${p.area}</div>
                  </div>
                </div>
                <a href="https://maps.google.com/?q=${p.googleMapsQuery}" target="_blank" rel="noreferrer" class="crosslink-btn">
                  Maps ↗
                </a>
              </div>
              <div style="font-size: 11px; color: #7a6316; margin: 6px 0 0;">
                💡 ${p.tip}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── Model 10: The Destination Overview ───────────────────────────────────────
function renderDestinationOverview(dataset, surface) {
  return `
    <div style="display: flex; flex-direction: column; height: 100%; overflow-y: auto;">
      ${renderChromeHeader(dataset)}
      
      <!-- Destination Hero Header -->
      <div style="background: var(--forest-dark); color: #fff; padding: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
        <div>
          <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--coral); letter-spacing: 0.1em;">
            Destination Spotlight
          </span>
          <h2 style="font-family: var(--serif); font-size: 30px; margin: 4px 0;">${dataset.destination}</h2>
          <p style="margin: 0; color: #b8c9c0; font-size: 13px; max-width: 580px;">${dataset.summary}</p>
        </div>
        <a href="${dataset.postUrl}" target="_blank" rel="noreferrer" class="chrome-btn" style="background: rgba(255,255,255,0.92); color: #000; font-weight: 700;">
          Watch on Instagram ↗
        </a>
      </div>

      <div style="padding: 24px; max-width: 900px; margin: 0 auto; width: 100%;">
        <!-- Map Overview -->
        <div style="margin-bottom: 20px;">
          <h4 style="margin: 0 0 8px; font-size: 14px;">Route Map of Extracted Stops</h4>
          ${renderMockMap(dataset, 0)}
        </div>

        <!-- Places List -->
        <h4 style="margin: 0 0 12px; font-size: 15px;">Stops (${dataset.places.length})</h4>
        <div class="places-list-container">
          ${dataset.places.map(p => `
            <div class="place-card-item">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <span class="place-stop-badge" style="display: inline-block; vertical-align: middle; margin-right: 6px;">${p.stopNum}</span>
                  <strong style="font-size: 15px;">${p.name}</strong>
                  <div style="font-size: 12px; color: var(--muted); margin-top: 2px;">${p.category} · ${p.area} · ${p.hours}</div>
                </div>
                <a href="https://maps.google.com/?q=${p.googleMapsQuery}" target="_blank" rel="noreferrer" class="crosslink-btn">
                  Google Maps ↗
                </a>
              </div>
              <div class="place-tip-box" style="margin-top: 8px;">
                <span>💡 ${p.tip}</span>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

// ── 4. Controller & State ───────────────────────────────────────────────────
let activeDatasetKey = "kyoto";
let activeConceptIndex = 0;
let activeSurface = "desktop";

const stageEl = document.getElementById("concept-stage");
const navEl = document.getElementById("concept-nav");
const titleEl = document.getElementById("concept-title");
const kickerEl = document.getElementById("concept-kicker");
const paradigmEl = document.getElementById("concept-paradigm");
const philosophyEl = document.getElementById("concept-philosophy");
const crosslinkEl = document.getElementById("concept-crosslink");
const bestForEl = document.getElementById("concept-best-for");
const posEl = document.getElementById("position");
const headerCountEl = document.getElementById("header-count");
const toastEl = document.getElementById("toast");

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => {
    toastEl.classList.remove("is-visible");
  }, 2200);
}
window.showToast = showToast;

function renderNavTabs() {
  navEl.innerHTML = concepts.map((c, i) => `
    <button type="button" class="concept-tab-btn ${i === activeConceptIndex ? 'is-active' : ''}" data-index="${i}">
      <span class="tab-num">${c.id}</span>
      <span>${c.name}</span>
    </button>
  `).join("");

  navEl.querySelectorAll(".concept-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      setConcept(idx);
    });
  });
}

function setConcept(index) {
  activeConceptIndex = (index + concepts.length) % concepts.length;
  const concept = concepts[activeConceptIndex];
  const dataset = datasets[activeDatasetKey];

  titleEl.textContent = concept.name;
  kickerEl.textContent = concept.kicker;
  paradigmEl.textContent = concept.paradigm;
  philosophyEl.textContent = concept.philosophy;
  crosslinkEl.textContent = concept.crosslinkBreakthrough;
  bestForEl.textContent = concept.bestFor;
  posEl.textContent = `${concept.id} / 10`;
  headerCountEl.textContent = `${concept.id} — 10`;

  navEl.querySelectorAll(".concept-tab-btn").forEach((btn, idx) => {
    btn.classList.toggle("is-active", idx === activeConceptIndex);
  });

  const innerHtml = concept.render(dataset, activeSurface);
  if (activeSurface === "mobile") {
    stageEl.innerHTML = `<div class="stage-mobile-surface">${innerHtml}</div>`;
  } else {
    stageEl.innerHTML = `<div class="stage-desktop-surface">${innerHtml}</div>`;
  }
}

// Prev / Next
document.getElementById("prev-btn").addEventListener("click", () => setConcept(activeConceptIndex - 1));
document.getElementById("next-btn").addEventListener("click", () => setConcept(activeConceptIndex + 1));

// Keyboard
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") setConcept(activeConceptIndex - 1);
  if (e.key === "ArrowRight") setConcept(activeConceptIndex + 1);
});

// Dataset Switcher
document.querySelectorAll(".dataset-pill").forEach(pill => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".dataset-pill").forEach(p => p.classList.remove("is-active"));
    pill.classList.add("is-active");
    activeDatasetKey = pill.getAttribute("data-dataset");
    setConcept(activeConceptIndex);
    showToast(`Loaded reel: ${datasets[activeDatasetKey].title}`);
  });
});

// Surface Switcher
document.querySelectorAll(".surface-toggle-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".surface-toggle-btn").forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    activeSurface = btn.getAttribute("data-surface");
    setConcept(activeConceptIndex);
    showToast(`Switched view to ${activeSurface}`);
  });
});

// Initial Mount
renderNavTabs();
setConcept(0);
