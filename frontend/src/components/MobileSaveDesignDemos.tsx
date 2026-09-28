import { useEffect, useState } from "react";
import "./mobile-save-design-demos.css";

type MockSaveState = "running" | "completed" | "duplicate" | "batch";

interface DemoOption {
  id: string;
  number: string;
  title: string;
  principle: string;
  description: string;
  tradeoff: string;
}

const OPTIONS: DemoOption[] = [
  {
    id: "pocket",
    number: "01",
    title: "Instant Pocket Save",
    principle: "Escape Hatch + Chunking",
    description: "Hero confirmation card with rich thumbnail, creator handle, and clear primary 'View in Library' and 'Close' actions.",
    tradeoff: "Optimized for single-reel share delight; manual multi-paste is secondary.",
  },
  {
    id: "ambient",
    number: "02",
    title: "Ambient Background Flow",
    principle: "Non-Blocking + Doherty Threshold",
    description: "Never traps the user on an ingest screen. Shows an ambient progress pill while immediately keeping the library browsable.",
    tradeoff: "Lower visual ceremony upon share; focuses entirely on returning to browsing.",
  },
  {
    id: "editorial",
    number: "03",
    title: "Editorial Storyboard",
    principle: "Card-Based Layouts + Recognition",
    description: "Magazine-style cover with hero photo, synthesized title, extracted insider tip, and destination badges.",
    tradeoff: "Takes slightly more screen real estate, but delivers maximum emotional connection to saved places.",
  },
  {
    id: "ledger",
    number: "04",
    title: "Live Extraction Ledger",
    principle: "Visibility of System Status",
    description: "Step-by-step pipeline timeline (Scrape → Transcribe → Geocode → Index) with live place chips and grouped daily history.",
    tradeoff: "More detailed technical visibility for power savers who want to see AI resolution in action.",
  },
  {
    id: "bottom-sheet",
    number: "05",
    title: "Split Bottom Sheet",
    principle: "Platform Conventions + Fitts's Law",
    description: "Native floating bottom drawer over the user's active library or map. One downward swipe dismisses back to your feed.",
    tradeoff: "Modal sheet over dimmed backdrop requires touch dismiss gesture.",
  },
  {
    id: "quiet-save",
    number: "06",
    title: "Quiet Save, Visible Progress",
    principle: "Capture + Status + Recognition",
    description: "A compact share receipt gives way to a browsable library. A persistent status card opens the finished save or recovery action.",
    tradeoff: "Keeps the everyday flow short; batch details stay in the full queue.",
  },
];

type ViewportMode = "mobile" | "desktop";
type DemoShare = { title: string; status: "organizing" | "waiting" | "on-device" };

const DEMO_SHARE_TITLES = ["Kyoto cafés", "Sunday pasta", "Amalfi guide", "Film list"];

const DESKTOP_OPTIONS: DemoOption[] = [
  {
    id: "desk-studio",
    number: "01",
    title: "The Intake Studio (Split Workspace)",
    principle: "Recognition over Recall + Doherty Threshold",
    description: "Widescreen split view: left panel for URL input & destination shelf tags; right canvas displays live extracted card preview, place tags, and direct 'Explore in Library' CTA.",
    tradeoff: "Provides maximum clarity and context simultaneously; ideal for desktop curation.",
  },
  {
    id: "desk-command",
    number: "02",
    title: "Ambient Command Bar & Live Feed Dock",
    principle: "Non-blocking Feedback + Continuous Browsing",
    description: "Minimalist top command bar with ⌘V shortcut. New saves stream directly as animated preview tiles into your library grid below without leaving the page.",
    tradeoff: "Zero context switching. Curation happens inline with your actual library.",
  },
  {
    id: "desk-editorial",
    number: "03",
    title: "Editorial Magazine Spread",
    principle: "Visual Hierarchy + Wanderfile Aesthetics",
    description: "Two-page publication layout: left side for intake and trip notes, right side featuring a full-bleed magazine cover card with extracted tips, stops, and map pins.",
    tradeoff: "High visual craft and storytelling; best for rich travel reels and recipe curation.",
  },
  {
    id: "desk-ledger",
    number: "04",
    title: "Pipeline Ledger & Batch Workspace",
    principle: "Chunking + System Transparency",
    description: "Power-curator workbench: multi-URL drag & drop with platform badges, real-time stage progress (Scrape → Transcribe → Geocode → Index), and grouped archive.",
    tradeoff: "Detailed status visibility for heavy batch saves (e.g. 10+ reels at once).",
  },
  {
    id: "desk-drawer",
    number: "05",
    title: "Slide-Over Studio Drawer",
    principle: "The Escape Hatch + Progressive Disclosure",
    description: "Add/Ingest opens as a slide-over panel from the right over your live Library or Map. Esc or backdrop click instantly returns you to where you were.",
    tradeoff: "Keeps the background page interactive and preserves scroll position.",
  },
];

export function MobileSaveDesignDemos() {
  const [viewport, setViewport] = useState<ViewportMode>("mobile");
  const [saveState, setSaveState] = useState<MockSaveState>("running");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [demoShares, setDemoShares] = useState<DemoShare[]>([{ title: DEMO_SHARE_TITLES[0], status: "organizing" }]);
  const [demoOffline, setDemoOffline] = useState(false);
  const [demoNotice, setDemoNotice] = useState("");

  const shareAnotherPost = () => {
    setDemoShares((shares) => shares.length < DEMO_SHARE_TITLES.length
      ? [...shares, { title: DEMO_SHARE_TITLES[shares.length], status: demoOffline ? "on-device" : "waiting" }]
      : shares);
    setDemoNotice(demoOffline ? "Saved on this device. It will submit when the app reconnects." : "Added automatically. No Save tap needed.");
  };

  const toggleDemoConnection = () => {
    if (demoOffline) {
      setDemoShares((shares) => shares.map((share) => share.status === "on-device" ? { ...share, status: "waiting" } : share));
      setDemoNotice("Connection restored. Pending links submit automatically.");
    } else {
      setDemoNotice("New shares will be kept on this device until the connection returns.");
    }
    setDemoOffline((offline) => !offline);
  };

  return (
    <div className="msd-page">
      <header className="msd-header">
        <div className="msd-breadcrumb">
          <a href="/">← Web Home</a>
          <span>·</span>
          <a href="/dev/mobile-library-designs">Mobile Library Demos</a>
          <span>·</span>
          <span>Save & Ingest UX</span>
        </div>
        <p className="msd-kicker">Wanderfile UX Guidelines · Mobile Ingest Exploration</p>
        <h1 className="msd-title">Six Ways to Save & Organize</h1>
        <p className="msd-subtitle">
          These mobile directions explore how to keep saving clear while processing continues. They apply <strong>The Escape Hatch</strong>, <strong>Visibility of System Status</strong>,{" "}
          <strong>Progressive Disclosure</strong>, and <strong>Recognition over Recall</strong> from{" "}
          <a href="/dev/mobile-library-designs">the library design work</a>. These are sample screens; only the controls above the mockups and the Quiet Save preview are interactive.
        </p>

        <p className="msd-flow-label">Two entry points · one save queue</p>
        <section className="msd-flow-grid" aria-label="Two ways to save a link">
          <div className="msd-flow-card">
            <span className="msd-flow-kicker">Flow A · From another app</span>
            <h2>Share a link</h2>
            <ol>
              <li>Tap Share in Instagram, TikTok, YouTube, or a browser; choose Wanderfile.</li>
              <li>Wanderfile keeps the link on the device, then submits it automatically. Sign in first if needed.</li>
              <li>A short receipt confirms the link was received. Close to return to the source app, or view the library.</li>
            </ol>
            <p>More shares join the same queue while earlier posts process. If submission fails, the link stays on the device for retry when the app returns to the foreground.</p>
            <div className="msd-flow-simulator" aria-label="Share queue simulation">
              <strong>Try repeated shares</strong>
              <div className="msd-flow-actions">
                <button type="button" onClick={shareAnotherPost} disabled={demoShares.length === DEMO_SHARE_TITLES.length}>Share another post</button>
                <button type="button" onClick={toggleDemoConnection}>{demoOffline ? "Reconnect" : "Go offline"}</button>
                <button type="button" onClick={() => setDemoNotice(`${demoShares.length} shared link${demoShares.length === 1 ? "" : "s"} remain after reopening.`)}>Simulate reopen</button>
              </div>
              <ul aria-live="polite">
                {demoShares.map((share) => <li key={share.title}><span>{share.title}</span><em>{share.status === "on-device" ? "Saved on device" : share.status === "waiting" ? "Waiting in queue" : "Organizing"}</em></li>)}
              </ul>
              <small role="status">{demoNotice || "Simulation only · no real links are saved here."}</small>
            </div>
          </div>
          <div className="msd-flow-card">
            <span className="msd-flow-kicker">Flow B · Inside Wanderfile</span>
            <h2>Paste a link</h2>
            <ol>
              <li>Tap Save from the library.</li>
              <li>Paste one or more links; review any flagged invalid lines.</li>
              <li>Tap Save links. See a receipt and continue browsing, or open the save queue.</li>
            </ol>
            <p>Keep the draft if this screen closes before submission.</p>
          </div>
        </section>
        <p className="msd-flow-common"><strong>Both flows:</strong> show “Organizing” after acceptance, “Ready” with a link to the saved item, “Already in your library” for duplicates, and a retry action for failures.</p>
        <p className="msd-flow-implementation">Implemented in mobile: automatic share submission, server queueing, and a device outbox for unaccepted links. The compact receipt and in-library status card below are design concepts.</p>

        {/* Viewport Switcher */}
        <div className="msd-viewport-bar">
          <button
            type="button"
            className={`msd-viewport-btn ${viewport === "mobile" ? "is-active" : ""}`}
            aria-pressed={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
          >
            📱 Mobile Views (6 Options)
          </button>
          <button
            type="button"
            className={`msd-viewport-btn ${viewport === "desktop" ? "is-active" : ""}`}
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
          >
            💻 Desktop Web Views (5 Options)
          </button>
        </div>

        {/* Global State Switcher */}
        <div className="msd-controls">
          <div className="msd-control-group">
            <span className="msd-control-label">Simulate Ingest State:</span>
            <button
              type="button"
              className={`msd-pill-btn ${saveState === "running" ? "is-active" : ""}`}
              aria-pressed={saveState === "running"}
              onClick={() => setSaveState("running")}
            >
              ⚡ Saving Reel (75%)
            </button>
            <button
              type="button"
              className={`msd-pill-btn ${saveState === "completed" ? "is-active" : ""}`}
              aria-pressed={saveState === "completed"}
              onClick={() => setSaveState("completed")}
            >
              ✓ Saved & Places Extracted
            </button>
            <button
              type="button"
              className={`msd-pill-btn ${saveState === "duplicate" ? "is-active" : ""}`}
              aria-pressed={saveState === "duplicate"}
              onClick={() => setSaveState("duplicate")}
            >
              ℹ Already in Library
            </button>
            <button
              type="button"
              className={`msd-pill-btn ${saveState === "batch" ? "is-active" : ""}`}
              aria-pressed={saveState === "batch"}
              onClick={() => setSaveState("batch")}
            >
              📋 Batch / Multi-Link
            </button>
          </div>
          <div className="msd-control-group">
            <span className="msd-control-label">Quick Action:</span>
            <button
              type="button"
              className="msd-pill-btn"
              aria-expanded={historyOpen}
              aria-controls="msd-sample-history"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              {historyOpen ? "Hide Sample History" : "Show Sample History"}
            </button>
          </div>
        </div>
        {historyOpen ? (
          <section className="msd-sample-history" id="msd-sample-history" aria-label="Sample save history">
            <strong>Sample save history</strong>
            <span>Today · Kyoto cafés · {saveState === "running" || saveState === "batch" ? "Organizing" : saveState === "duplicate" ? "Already saved" : "Ready"}</span>
            <span>Yesterday · Sunday pasta · Ready</span>
            <span>Sep 24 · The Grand Budapest Hotel · Ready</span>
          </section>
        ) : null}
      </header>

      {/* Grid: Mobile or Desktop */}
      {viewport === "mobile" ? (
        <div className="msd-grid">
        {/* OPTION 1: Instant Pocket Save */}
        <article className="msd-option-card">
          <div className="msd-option-header">
            <div className="msd-option-badge-row">
              <span className="msd-option-tag">Option {OPTIONS[0].number}</span>
              <span className="msd-option-principle">{OPTIONS[0].principle}</span>
            </div>
            <h2 className="msd-option-title">{OPTIONS[0].title}</h2>
            <p className="msd-option-desc">{OPTIONS[0].description}</p>
          </div>

          <div className="msd-phone">
            <div className="msd-phone-statusbar">
              <span>9:41</span>
              <div className="msd-phone-camera-island" />
              <span>5G 92%</span>
            </div>

            <div className="msd-screen-header">
              <div className="msd-header-left">
                <button type="button" className="msd-icon-btn" aria-label="Close">✕</button>
                <span className="msd-header-title">Save Reel</span>
              </div>
              <div className="msd-header-right">
                <button type="button" className="msd-home-pill">
                  <span>⌂</span> Home
                </button>
              </div>
            </div>

            <div className="msd-screen-body">
              {/* Active Hero Card */}
              <div className="msd-card">
                <div className="msd-hero-save">
                  <div className="msd-hero-thumb" />
                  <div className="msd-hero-meta">
                    <span className="msd-hero-creator">@kyotoguide · Instagram</span>
                    <h3 className="msd-hero-heading">7 Hidden Zen Cafés in Arashiyama</h3>
                    <span className="msd-hero-tag">📍 4 Places Detected</span>
                  </div>
                </div>

                <div className="msd-progress-wrap">
                  <div className="msd-progress-track">
                    <div
                      className={`msd-progress-fill ${saveState === "running" ? "msd-progress-pulse" : ""}`}
                      style={{ width: saveState === "running" ? "75%" : "100%" }}
                    />
                  </div>
                </div>

                <p style={{ margin: "6px 0 10px", fontSize: "11px", color: saveState === "duplicate" ? "#fdcb6e" : "#8ab5c2" }}>
                  {saveState === "running" && "Reading transcription & extracting locations..."}
                  {saveState === "completed" && "✓ Successfully added to Travel & Kyoto trip"}
                  {saveState === "duplicate" && "ℹ Already in your library · updated notes"}
                  {saveState === "batch" && "3 of 4 links processed"}
                </p>

                <div className="msd-chips">
                  <span className="msd-chip">☕ Kissa Soirée</span>
                  <span className="msd-chip">⛩️ Tenryu-ji Garden</span>
                  <span className="msd-chip">🍵 % Arabica Kyoto</span>
                </div>
              </div>

              {/* Clear Escape Actions */}
              <button type="button" className="msd-primary-action">
                View in Travel Library →
              </button>
              <button type="button" className="msd-secondary-action">
                Done · Keep Browsing
              </button>

              {/* Progressive Disclosure: Add Another Link */}
              <div style={{ margin: "4px 0" }}>
                <button
                  type="button"
                  onClick={() => setPasteOpen(!pasteOpen)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "transparent",
                    border: "1px dashed #285465",
                    borderRadius: "10px",
                    color: "#4fe8f6",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {pasteOpen ? "▲ Hide link input" : "＋ Paste another link"}
                </button>
                {pasteOpen ? (
                  <div style={{ marginTop: "8px", padding: "10px", background: "#163846", borderRadius: "10px", border: "1px solid #285669" }}>
                    <input
                      aria-label="Paste another URL"
                      placeholder="https://instagram.com/reel/..."
                      style={{
                        width: "100%",
                        background: "#0f2631",
                        border: "1px solid #285465",
                        borderRadius: "8px",
                        padding: "8px",
                        color: "#fff",
                        fontSize: "12px",
                        boxSizing: "border-box",
                        marginBottom: "8px",
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "10px", color: "#8bb6c5" }}>📋 Detected link in clipboard</span>
                      <button type="button" className="msd-pill-btn is-active" style={{ padding: "4px 10px", fontSize: "11px" }}>
                        Save link
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Rich Recent Saves (Replacing repetitive empty cards!) */}
              <div className="msd-card" style={{ marginTop: "auto" }}>
                <div className="msd-card-title">
                  <span>Recent Saves</span>
                  <span style={{ fontSize: "11px", color: "#4fe8f6", cursor: "pointer" }}>View all</span>
                </div>
                <div className="msd-history-list">
                  <div className="msd-history-item">
                    <div className="msd-hist-thumb travel" />
                    <div className="msd-hist-info">
                      <div className="msd-hist-title">Amalfi Coast Road Trip Guide</div>
                      <div className="msd-hist-sub">
                        <span>8 places</span> · <span>2m ago</span>
                      </div>
                    </div>
                    <span className="msd-hist-status">Ready</span>
                  </div>
                  <div className="msd-history-item">
                    <div className="msd-hist-thumb food" />
                    <div className="msd-hist-info">
                      <div className="msd-hist-title">Authentic Carbonara with Guanciale</div>
                      <div className="msd-hist-sub">
                        <span>Recipe</span> · <span>1h ago</span>
                      </div>
                    </div>
                    <span className="msd-hist-status">Ready</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* OPTION 2: Ambient Background Flow */}
        <article className="msd-option-card">
          <div className="msd-option-header">
            <div className="msd-option-badge-row">
              <span className="msd-option-tag">Option {OPTIONS[1].number}</span>
              <span className="msd-option-principle">{OPTIONS[1].principle}</span>
            </div>
            <h2 className="msd-option-title">{OPTIONS[1].title}</h2>
            <p className="msd-option-desc">{OPTIONS[1].description}</p>
          </div>

          <div className="msd-phone">
            <div className="msd-phone-statusbar">
              <span>9:41</span>
              <div className="msd-phone-camera-island" />
              <span>5G 92%</span>
            </div>

            <div className="msd-screen-header">
              <div className="msd-header-left">
                <button type="button" className="msd-icon-btn" aria-label="Back">←</button>
                <span className="msd-header-title">Posts & Saves</span>
              </div>
              <div className="msd-header-right">
                <button type="button" className="msd-text-btn">Search</button>
              </div>
            </div>

            <div className="msd-screen-body">
              {/* Ambient Active Toast Banner */}
              <div className="msd-home-banner">
                <div className="msd-home-banner-icon">⚡</div>
                <div className="msd-home-banner-text">
                  <div className="msd-home-banner-title">
                    {saveState === "running" ? "Saving Instagram Reel..." : "Reel Saved to Library"}
                  </div>
                  <div className="msd-home-banner-desc">
                    {saveState === "running"
                      ? "Wanderfile is organizing in background · tap to view"
                      : "4 places and trail tips extracted into your atlas"}
                  </div>
                </div>
                <span style={{ color: "#4fe8f6", fontSize: "16px" }}>→</span>
              </div>

              {/* Feed Content directly accessible! */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#7da2af" }}>
                  Your Library Feed
                </span>
                <span style={{ fontSize: "11px", color: "#4fe8f6" }}>Sort by Recent</span>
              </div>

              <div className="msd-history-list">
                <div className="msd-history-item" style={{ padding: "10px" }}>
                  <div className="msd-hist-thumb travel" style={{ width: "48px", height: "64px" }} />
                  <div className="msd-hist-info">
                    <span style={{ fontSize: "10px", color: "#4fe8f6", fontWeight: "700" }}>JUST NOW</span>
                    <div className="msd-hist-title" style={{ fontSize: "13px" }}>
                      7 Hidden Zen Cafés in Arashiyama
                    </div>
                    <div className="msd-hist-sub">
                      <span>@kyotoguide</span> · <span>4 places</span>
                    </div>
                  </div>
                </div>

                <div className="msd-history-item" style={{ padding: "10px" }}>
                  <div className="msd-hist-thumb food" style={{ width: "48px", height: "64px" }} />
                  <div className="msd-hist-info">
                    <span style={{ fontSize: "10px", color: "#8ab0bd" }}>SAVED YESTERDAY</span>
                    <div className="msd-hist-title" style={{ fontSize: "13px" }}>
                      Traditional Sourdough Focaccia
                    </div>
                    <div className="msd-hist-sub">
                      <span>@bakerboy</span> · <span>Recipe & Timing</span>
                    </div>
                  </div>
                </div>

                <div className="msd-history-item" style={{ padding: "10px" }}>
                  <div className="msd-hist-thumb watch" style={{ width: "48px", height: "64px" }} />
                  <div className="msd-hist-info">
                    <span style={{ fontSize: "10px", color: "#8ab0bd" }}>SAVED SEP 24</span>
                    <div className="msd-hist-title" style={{ fontSize: "13px" }}>
                      The Grand Budapest Hotel (2014)
                    </div>
                    <div className="msd-hist-sub">
                      <span>Watch</span> · <span>Wes Anderson</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Quick-Save drawer */}
              <div style={{ marginTop: "auto", padding: "12px", background: "#163745", borderRadius: "14px", border: "1px solid #255163" }}>
                <span style={{ fontSize: "11px", color: "#8bb5c3" }}>Need to paste another link?</span>
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <input
                    aria-label="Paste link"
                    placeholder="https://instagram.com/reel/..."
                    style={{
                      flex: 1,
                      background: "#102833",
                      border: "1px solid #234c5c",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "11px",
                      padding: "6px 8px",
                    }}
                  />
                  <button type="button" className="msd-pill-btn is-active" style={{ padding: "6px 12px", fontSize: "11px" }}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* OPTION 3: Editorial Storyboard */}
        <article className="msd-option-card">
          <div className="msd-option-header">
            <div className="msd-option-badge-row">
              <span className="msd-option-tag">Option {OPTIONS[2].number}</span>
              <span className="msd-option-principle">{OPTIONS[2].principle}</span>
            </div>
            <h2 className="msd-option-title">{OPTIONS[2].title}</h2>
            <p className="msd-option-desc">{OPTIONS[2].description}</p>
          </div>

          <div className="msd-phone">
            <div className="msd-phone-statusbar">
              <span>9:41</span>
              <div className="msd-phone-camera-island" />
              <span>5G 92%</span>
            </div>

            <div className="msd-screen-header">
              <div className="msd-header-left">
                <button type="button" className="msd-icon-btn" aria-label="Close">✕</button>
                <span className="msd-header-title" style={{ fontFamily: "Newsreader, serif", fontSize: "18px" }}>
                  Wanderfile
                </span>
              </div>
              <div className="msd-header-right">
                <button type="button" className="msd-text-btn">View Library</button>
              </div>
            </div>

            <div className="msd-screen-body">
              {/* Magazine Cover Card */}
              <div className="msd-editorial-cover">
                <div className="msd-editorial-content">
                  <div className="msd-editorial-kicker">Saved to Travel · Japan</div>
                  <h3 className="msd-editorial-headline">The Secret Zen Gardens of Western Kyoto</h3>
                  <p className="msd-editorial-quote">
                    “Arrive before 8:30 AM to catch the morning mist winding through Tenryu-ji’s bamboo groves.”
                  </p>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <span className="msd-chip" style={{ background: "#4fe8f6", color: "#112a35", fontWeight: "800" }}>
                      4 Places
                    </span>
                    <span className="msd-chip">☕ Cafés</span>
                    <span className="msd-chip">⛩️ Temples</span>
                  </div>
                </div>
              </div>

              {/* Status & Highlights */}
              <div className="msd-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "#f3fafc" }}>Places in this save</span>
                  <span style={{ fontSize: "11px", color: "#4fe8f6" }}>Open Maps ↗</span>
                </div>
                <div style={{ display: "grid", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#d2e6ed" }}>
                    <span>1. Tenryu-ji Temple</span>
                    <span style={{ color: "#7fa5b3" }}>Arashiyama</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#d2e6ed" }}>
                    <span>2. Kissa Soirée</span>
                    <span style={{ color: "#7fa5b3" }}>Kawaramachi</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#d2e6ed" }}>
                    <span>3. Sagano Bamboo Forest</span>
                    <span style={{ color: "#7fa5b3" }}>Trailhead</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <button type="button" className="msd-primary-action">
                Open Guide & Flip Cards
              </button>
              <button type="button" className="msd-secondary-action">
                Done · Return to Home
              </button>
            </div>
          </div>
        </article>

        {/* OPTION 4: Live Extraction Ledger */}
        <article className="msd-option-card">
          <div className="msd-option-header">
            <div className="msd-option-badge-row">
              <span className="msd-option-tag">Option {OPTIONS[3].number}</span>
              <span className="msd-option-principle">{OPTIONS[3].principle}</span>
            </div>
            <h2 className="msd-option-title">{OPTIONS[3].title}</h2>
            <p className="msd-option-desc">{OPTIONS[3].description}</p>
          </div>

          <div className="msd-phone">
            <div className="msd-phone-statusbar">
              <span>9:41</span>
              <div className="msd-phone-camera-island" />
              <span>5G 92%</span>
            </div>

            <div className="msd-screen-header">
              <div className="msd-header-left">
                <button type="button" className="msd-icon-btn" aria-label="Close">✕</button>
                <span className="msd-header-title">Ingest Ledger</span>
              </div>
              <div className="msd-header-right">
                <button type="button" className="msd-home-pill">
                  <span>⌂</span> Home
                </button>
              </div>
            </div>

            <div className="msd-screen-body">
              {/* Stepper Card */}
              <div className="msd-card">
                <div className="msd-card-title">
                  <span>Active Pipeline Status</span>
                  <span style={{ fontSize: "11px", color: "#4fe8f6" }}>Live</span>
                </div>

                <div className="msd-stepper">
                  <div className="msd-step-row">
                    <div className="msd-step-circle msd-step-done">✓</div>
                    <span>Download reel metadata & audio</span>
                  </div>
                  <div className="msd-step-row">
                    <div className="msd-step-circle msd-step-done">✓</div>
                    <span>Transcribe audio & detect places</span>
                  </div>
                  <div className="msd-step-row">
                    <div className="msd-step-circle msd-step-active">3</div>
                    <span style={{ color: "#4fe8f6", fontWeight: "700" }}>Geocode coordinates via OpenStreetMap</span>
                  </div>
                  <div className="msd-step-row">
                    <div className="msd-step-circle msd-step-pending">4</div>
                    <span style={{ color: "#7a9ca8" }}>Index into Travel atlas & user library</span>
                  </div>
                </div>

                <div style={{ marginTop: "12px", padding: "8px 10px", background: "#112630", borderRadius: "8px", fontSize: "11px", color: "#a5c8d4" }}>
                  Extracted 3 locations: <strong>Kyoto</strong>, <strong>Arashiyama</strong>, <strong>Gion</strong>
                </div>
              </div>

              {/* Grouped History Instead of 10 Identical Cards */}
              <div className="msd-card">
                <div className="msd-card-title">
                  <span>Library Activity</span>
                  <span style={{ fontSize: "11px", color: "#7fa5b3" }}>Grouped</span>
                </div>

                <div style={{ display: "grid", gap: "8px" }}>
                  <div style={{ padding: "8px", background: "#132d38", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700" }}>
                      <span>Today · 3 Saves Processed</span>
                      <span style={{ color: "#55efc4" }}>100% OK</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#8bb2c0" }}>
                      12 places added to Travel · 1 recipe added to Food
                    </p>
                  </div>

                  <div style={{ padding: "8px", background: "#132d38", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: "700" }}>
                      <span>Yesterday · 8 Saves</span>
                      <span style={{ color: "#55efc4" }}>100% OK</span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#8bb2c0" }}>
                      Amalfi Coast collection · 24 stops mapped
                    </p>
                  </div>
                </div>
              </div>

              <button type="button" className="msd-primary-action">
                Go to Home Dashboard
              </button>
            </div>
          </div>
        </article>

        {/* OPTION 5: Split Bottom Sheet */}
        <article className="msd-option-card">
          <div className="msd-option-header">
            <div className="msd-option-badge-row">
              <span className="msd-option-tag">Option {OPTIONS[4].number}</span>
              <span className="msd-option-principle">{OPTIONS[4].principle}</span>
            </div>
            <h2 className="msd-option-title">{OPTIONS[4].title}</h2>
            <p className="msd-option-desc">{OPTIONS[4].description}</p>
          </div>

          <div className="msd-phone">
            <div className="msd-phone-statusbar">
              <span>9:41</span>
              <div className="msd-phone-camera-island" />
              <span>5G 92%</span>
            </div>

            {/* Simulated background library view under dimmed overlay */}
            <div style={{ flex: 1, padding: "16px", opacity: 0.25, filter: "blur(2px)", pointerEvents: "none" }}>
              <div style={{ height: "40px", background: "#1f4a5c", borderRadius: "8px", marginBottom: "12px" }} />
              <div style={{ height: "160px", background: "#1f4a5c", borderRadius: "12px", marginBottom: "12px" }} />
              <div style={{ height: "160px", background: "#1f4a5c", borderRadius: "12px" }} />
            </div>

            {/* Native Floating Bottom Sheet */}
            <div className="msd-sheet-overlay">
              <div className="msd-sheet-drawer">
                <div className="msd-drag-handle" />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <span style={{ fontSize: "10px", fontWeight: "800", color: "#4fe8f6", textTransform: "uppercase" }}>
                      Wanderfile Save
                    </span>
                    <h4 style={{ margin: "2px 0 0", fontSize: "16px", color: "#fff" }}>
                      {saveState === "running" ? "Saving Reel..." : "Reel Captured!"}
                    </h4>
                  </div>
                  <button type="button" className="msd-icon-btn" aria-label="Close sheet">✕</button>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px", background: "#0e242e", padding: "8px 10px", borderRadius: "10px" }}>
                  <div style={{ width: "32px", height: "44px", borderRadius: "6px", background: "linear-gradient(135deg, #e17055, #6c5ce7)" }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#f3fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      7 Hidden Zen Cafés in Arashiyama
                    </div>
                    <div style={{ fontSize: "10px", color: "#8ab4c3" }}>@kyotoguide · 4 places detected</div>
                  </div>
                </div>

                {/* Quick Category Re-route */}
                <div style={{ marginBottom: "16px" }}>
                  <span style={{ fontSize: "11px", color: "#8bb4c2", display: "block", marginBottom: "6px" }}>
                    Destination Shelf:
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span className="msd-pill-btn is-active" style={{ fontSize: "11px", padding: "4px 10px" }}>✈️ Travel</span>
                    <span className="msd-pill-btn" style={{ fontSize: "11px", padding: "4px 10px" }}>🍝 Food</span>
                    <span className="msd-pill-btn" style={{ fontSize: "11px", padding: "4px 10px" }}>🎬 Watch</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="button" className="msd-primary-action" style={{ flex: 2, padding: "10px" }}>
                    View in Library
                  </button>
                  <button type="button" className="msd-secondary-action" style={{ flex: 1, padding: "10px" }}>
                    Dismiss
                  </button>
                </div>

                <div className="msd-sheet-back-hint">Swipe down or tap background to return to feed</div>
              </div>
            </div>
          </div>
        </article>

        <QuietSaveOption option={OPTIONS[5]} saveState={saveState} />
      </div>
      ) : (
      /* ========================================================
         DESKTOP WEB VERSION: FIVE DESKTOP DIRECTIONS
         ======================================================== */
      <div className="msd-desktop-grid">
        {/* DESKTOP OPTION 1: The Intake Studio (Split Workspace) */}
        <article className="msd-desktop-card">
          <div className="msd-option-header">
            <div className="msd-option-badge-row">
              <span className="msd-option-tag">Desktop Option {DESKTOP_OPTIONS[0].number}</span>
              <span className="msd-option-principle">{DESKTOP_OPTIONS[0].principle}</span>
            </div>
            <h2 className="msd-option-title">{DESKTOP_OPTIONS[0].title}</h2>
            <p className="msd-option-desc">{DESKTOP_OPTIONS[0].description}</p>
          </div>

          <div className="msd-browser-window">
            <div className="msd-browser-topbar">
              <div className="msd-browser-dots">
                <span className="msd-browser-dot red" />
                <span className="msd-browser-dot yellow" />
                <span className="msd-browser-dot green" />
              </div>
              <div className="msd-browser-address">🔒 https://wanderfile.com/add</div>
            </div>

            <div className="msd-browser-content">
              <div className="msd-desk-split">
                {/* Left Intake Form */}
                <div className="msd-desk-input-col">
                  <div>
                    <h3 style={{ margin: "0 0 6px", fontSize: "18px", color: "#fff" }}>Add Links to Library</h3>
                    <p style={{ margin: 0, fontSize: "12px", color: "#8cb3c2" }}>Paste Instagram, TikTok, or web URLs</p>
                  </div>

                  <textarea
                    rows={4}
                    defaultValue="https://www.instagram.com/reel/DbcHtcHyBfU"
                    style={{
                      width: "100%",
                      background: "#102833",
                      border: "1px solid #285465",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: "12px",
                      padding: "10px",
                      boxSizing: "border-box",
                    }}
                  />

                  <div>
                    <span style={{ fontSize: "11px", color: "#8bb4c2", display: "block", marginBottom: "6px" }}>Destination Shelf</span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span className="msd-pill-btn is-active" style={{ fontSize: "11px", padding: "4px 10px" }}>✈️ Travel</span>
                      <span className="msd-pill-btn" style={{ fontSize: "11px", padding: "4px 10px" }}>🍝 Food</span>
                      <span className="msd-pill-btn" style={{ fontSize: "11px", padding: "4px 10px" }}>🎬 Watch</span>
                    </div>
                  </div>

                  <button type="button" className="msd-primary-action" style={{ padding: "12px" }}>
                    Save & Extract Places
                  </button>
                </div>

                {/* Right Extracted Card Canvas */}
                <div className="msd-desk-output-col">
                  <div className="msd-desk-hero-card">
                    <div className="msd-desk-hero-thumb" />
                    <div className="msd-desk-hero-info">
                      <span style={{ fontSize: "11px", color: "#4fe8f6", fontWeight: "700" }}>SAVED JUST NOW · INSTAGRAM</span>
                      <h3 style={{ margin: "4px 0", fontSize: "18px", color: "#fff" }}>7 Hidden Zen Cafés in Arashiyama</h3>
                      <p style={{ margin: 0, fontSize: "12px", color: "#a5c8d4" }}>
                        4 stops extracted into Travel atlas. Tips and opening times recorded.
                      </p>
                      <div className="msd-chips" style={{ marginTop: "8px" }}>
                        <span className="msd-chip">☕ Kissa Soirée</span>
                        <span className="msd-chip">⛩️ Tenryu-ji Garden</span>
                        <span className="msd-chip">🍵 % Arabica Kyoto</span>
                      </div>
                    </div>
                    <div className="msd-desk-hero-actions">
                      <button type="button" className="msd-primary-action" style={{ padding: "10px 16px", fontSize: "12px" }}>
                        Explore in Travel Atlas →
                      </button>
                      <button type="button" className="msd-secondary-action" style={{ padding: "8px 14px", fontSize: "12px" }}>
                        View Reel Details
                      </button>
                    </div>
                  </div>

                  {/* Clean Recent Saves Table */}
                  <div className="msd-card">
                    <div className="msd-card-title">
                      <span>Recent Saves in your Library</span>
                      <span style={{ fontSize: "12px", color: "#4fe8f6" }}>Browse All (42) →</span>
                    </div>
                    <div style={{ display: "grid", gap: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", background: "#132d39", borderRadius: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div className="msd-hist-thumb travel" style={{ width: "40px", height: "40px", borderRadius: "8px" }} />
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>Amalfi Coast Road Trip Guide</div>
                            <div style={{ fontSize: "11px", color: "#7fa5b3" }}>8 places · 2 hours ago</div>
                          </div>
                        </div>
                        <span style={{ color: "#55efc4", fontSize: "12px", fontWeight: "700" }}>Indexed</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", background: "#132d39", borderRadius: "10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div className="msd-hist-thumb food" style={{ width: "40px", height: "40px", borderRadius: "8px" }} />
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>Authentic Roman Carbonara with Guanciale</div>
                            <div style={{ fontSize: "11px", color: "#7fa5b3" }}>Recipe · 4 hours ago</div>
                          </div>
                        </div>
                        <span style={{ color: "#55efc4", fontSize: "12px", fontWeight: "700" }}>Indexed</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* DESKTOP OPTION 2: Ambient Command Bar & Live Feed Dock */}
        <article className="msd-desktop-card">
          <div className="msd-option-header">
            <div className="msd-option-badge-row">
              <span className="msd-option-tag">Desktop Option {DESKTOP_OPTIONS[1].number}</span>
              <span className="msd-option-principle">{DESKTOP_OPTIONS[1].principle}</span>
            </div>
            <h2 className="msd-option-title">{DESKTOP_OPTIONS[1].title}</h2>
            <p className="msd-option-desc">{DESKTOP_OPTIONS[1].description}</p>
          </div>

          <div className="msd-browser-window">
            <div className="msd-browser-topbar">
              <div className="msd-browser-dots">
                <span className="msd-browser-dot red" />
                <span className="msd-browser-dot yellow" />
                <span className="msd-browser-dot green" />
              </div>
              <div className="msd-browser-address">🔒 https://wanderfile.com/posts</div>
            </div>

            <div className="msd-browser-content">
              {/* Command Bar */}
              <div className="msd-command-bar">
                <span style={{ fontSize: "18px", color: "#4fe8f6" }}>＋</span>
                <input
                  aria-label="Command bar input"
                  className="msd-command-input"
                  placeholder="Paste Instagram reels, TikToks, or articles to auto-organize into your library..."
                  defaultValue="https://www.instagram.com/reel/DbcHtcHyBfU"
                />
                <span className="msd-command-kbd">⌘ V</span>
                <button type="button" className="msd-pill-btn is-active">
                  Organize
                </button>
              </div>

              {/* Feed directly below */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Your Live Saves & Feed</h3>
                <span style={{ fontSize: "12px", color: "#7fa5b3" }}>Showing 42 items</span>
              </div>

              <div className="msd-desk-cards-row">
                {/* Active saving card */}
                <div className="msd-desk-card-tile" style={{ borderColor: "#4fe8f6", boxShadow: "0 0 16px rgba(79, 232, 246, 0.2)" }}>
                  <div className="msd-desk-card-tile-top" style={{ background: "linear-gradient(135deg, #163643, #235165)" }}>
                    <span className="msd-hero-tag">⚡ EXTRACTING PLACES (75%)</span>
                  </div>
                  <div className="msd-desk-card-tile-body">
                    <span style={{ fontSize: "11px", color: "#8ab4c3" }}>@kyotoguide · Instagram</span>
                    <h4 style={{ margin: "2px 0 6px", fontSize: "14px", color: "#fff" }}>7 Hidden Zen Cafés in Arashiyama</h4>
                    <span style={{ fontSize: "11px", color: "#4fe8f6" }}>Resolving 4 stops via OSM...</span>
                  </div>
                </div>

                <div className="msd-desk-card-tile">
                  <div className="msd-desk-card-tile-top" style={{ background: "linear-gradient(135deg, #0984e3, #00cec9)" }}>
                    <span className="msd-hero-tag" style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}>TRAVEL · 8 PLACES</span>
                  </div>
                  <div className="msd-desk-card-tile-body">
                    <span style={{ fontSize: "11px", color: "#8ab4c3" }}>@wanderlust · Instagram</span>
                    <h4 style={{ margin: "2px 0 6px", fontSize: "14px", color: "#fff" }}>Amalfi Coast Road Trip Guide</h4>
                    <span style={{ fontSize: "11px", color: "#a5c8d4" }}>Positano, Ravello, Amalfi</span>
                  </div>
                </div>

                <div className="msd-desk-card-tile">
                  <div className="msd-desk-card-tile-top" style={{ background: "linear-gradient(135deg, #e17055, #fdcb6e)" }}>
                    <span className="msd-hero-tag" style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}>FOOD · RECIPE</span>
                  </div>
                  <div className="msd-desk-card-tile-body">
                    <span style={{ fontSize: "11px", color: "#8ab4c3" }}>@cheftom · TikTok</span>
                    <h4 style={{ margin: "2px 0 6px", fontSize: "14px", color: "#fff" }}>Authentic Roman Carbonara</h4>
                    <span style={{ fontSize: "11px", color: "#a5c8d4" }}>5 ingredients · 20 mins</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* DESKTOP OPTION 3: Editorial Magazine Spread */}
        <article className="msd-desktop-card">
          <div className="msd-option-header">
            <div className="msd-option-badge-row">
              <span className="msd-option-tag">Desktop Option {DESKTOP_OPTIONS[2].number}</span>
              <span className="msd-option-principle">{DESKTOP_OPTIONS[2].principle}</span>
            </div>
            <h2 className="msd-option-title">{DESKTOP_OPTIONS[2].title}</h2>
            <p className="msd-option-desc">{DESKTOP_OPTIONS[2].description}</p>
          </div>

          <div className="msd-browser-window">
            <div className="msd-browser-topbar">
              <div className="msd-browser-dots">
                <span className="msd-browser-dot red" />
                <span className="msd-browser-dot yellow" />
                <span className="msd-browser-dot green" />
              </div>
              <div className="msd-browser-address">🔒 https://wanderfile.com/curate</div>
            </div>

            <div className="msd-browser-content">
              <div className="msd-editorial-spread">
                {/* Left Page */}
                <div className="msd-editorial-page">
                  <div>
                    <span style={{ fontSize: "11px", fontWeight: "800", textTransform: "uppercase", color: "#4fe8f6", letterSpacing: "0.14em" }}>
                      WANDERFILE NOTEBOOK
                    </span>
                    <h3 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: "28px", color: "#fff", margin: "8px 0 16px" }}>
                      Curate a Discovery
                    </h3>
                    <p style={{ fontSize: "13px", color: "#a5c8d4", lineHeight: "1.5", margin: "0 0 20px" }}>
                      Paste any reel, review, or article. Wanderfile extracts the exact geo-coordinates, hours, and practical tips.
                    </p>
                    <textarea
                      rows={3}
                      defaultValue="https://www.instagram.com/reel/DbcHtcHyBfU"
                      style={{
                        width: "100%",
                        background: "#0f2631",
                        border: "1px solid #285465",
                        borderRadius: "10px",
                        color: "#fff",
                        fontSize: "12px",
                        padding: "10px",
                        boxSizing: "border-box",
                        marginBottom: "16px",
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <span className="msd-pill-btn is-active" style={{ fontSize: "11px" }}>Japan Collection</span>
                      <span className="msd-pill-btn" style={{ fontSize: "11px" }}>Want to go</span>
                      <span className="msd-pill-btn" style={{ fontSize: "11px" }}>Autumn 2026</span>
                    </div>
                  </div>
                  <button type="button" className="msd-primary-action" style={{ marginTop: "24px" }}>
                    File into Travel Atlas
                  </button>
                </div>

                {/* Right Page (Cover Preview) */}
                <div className="msd-editorial-page" style={{ background: "#112630" }}>
                  <div className="msd-editorial-big-cover">
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <span className="msd-hero-tag" style={{ marginBottom: "8px" }}>FEATURED SAVE · ARASHIYAMA</span>
                      <h3 style={{ fontFamily: "Newsreader, Georgia, serif", fontSize: "24px", color: "#fff", margin: "0 0 8px" }}>
                        The Secret Zen Gardens of Western Kyoto
                      </h3>
                      <p style={{ fontStyle: "italic", fontSize: "12px", color: "#c2e4ef", margin: 0 }}>
                        “Arrive before 8:30 AM to catch the morning mist winding through Tenryu-ji’s bamboo groves.”
                      </p>
                    </div>
                  </div>
                  <div style={{ marginTop: "16px", display: "grid", gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#d2e6ed" }}>
                      <span>1. Tenryu-ji Garden & Pond</span>
                      <span style={{ color: "#4fe8f6" }}>Google Maps ↗</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#d2e6ed" }}>
                      <span>2. Kissa Soirée Retro Café</span>
                      <span style={{ color: "#4fe8f6" }}>Google Maps ↗</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* DESKTOP OPTION 4: Batch Pipeline Ledger */}
        <article className="msd-desktop-card">
          <div className="msd-option-header">
            <div className="msd-option-badge-row">
              <span className="msd-option-tag">Desktop Option {DESKTOP_OPTIONS[3].number}</span>
              <span className="msd-option-principle">{DESKTOP_OPTIONS[3].principle}</span>
            </div>
            <h2 className="msd-option-title">{DESKTOP_OPTIONS[3].title}</h2>
            <p className="msd-option-desc">{DESKTOP_OPTIONS[3].description}</p>
          </div>

          <div className="msd-browser-window">
            <div className="msd-browser-topbar">
              <div className="msd-browser-dots">
                <span className="msd-browser-dot red" />
                <span className="msd-browser-dot yellow" />
                <span className="msd-browser-dot green" />
              </div>
              <div className="msd-browser-address">🔒 https://wanderfile.com/batch</div>
            </div>

            <div className="msd-browser-content">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "#fff" }}>Batch Ingest & Extraction Workbench</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#8bb4c3" }}>Drop in links from saved collections or browser tabs</p>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <span className="msd-chip" style={{ background: "#214a5b" }}>Instagram Reels (3)</span>
                  <span className="msd-chip" style={{ background: "#214a5b" }}>TikTok (1)</span>
                </div>
              </div>

              <table className="msd-batch-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Source</th>
                    <th>Extraction Pipeline</th>
                    <th>Detected Entities</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Kyoto Zen Cafés</strong></td>
                    <td>Instagram Reel</td>
                    <td><span style={{ color: "#4fe8f6", fontWeight: "700" }}>● Geocoding places (75%)</span></td>
                    <td>4 places detected</td>
                    <td><button type="button" className="msd-text-btn">View Log</button></td>
                  </tr>
                  <tr>
                    <td><strong>Amalfi Coast Itinerary</strong></td>
                    <td>Instagram Reel</td>
                    <td><span style={{ color: "#55efc4", fontWeight: "700" }}>✓ Complete</span></td>
                    <td>8 places added to Travel</td>
                    <td><button type="button" className="msd-text-btn">Open Map ↗</button></td>
                  </tr>
                  <tr>
                    <td><strong>Roman Carbonara</strong></td>
                    <td>TikTok Video</td>
                    <td><span style={{ color: "#55efc4", fontWeight: "700" }}>✓ Complete</span></td>
                    <td>1 recipe added to Food</td>
                    <td><button type="button" className="msd-text-btn">View Recipe ↗</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </article>

        {/* DESKTOP OPTION 5: Slide-Over Studio Drawer */}
        <article className="msd-desktop-card">
          <div className="msd-option-header">
            <div className="msd-option-badge-row">
              <span className="msd-option-tag">Desktop Option {DESKTOP_OPTIONS[4].number}</span>
              <span className="msd-option-principle">{DESKTOP_OPTIONS[4].principle}</span>
            </div>
            <h2 className="msd-option-title">{DESKTOP_OPTIONS[4].title}</h2>
            <p className="msd-option-desc">{DESKTOP_OPTIONS[4].description}</p>
          </div>

          <div className="msd-browser-window">
            <div className="msd-browser-topbar">
              <div className="msd-browser-dots">
                <span className="msd-browser-dot red" />
                <span className="msd-browser-dot yellow" />
                <span className="msd-browser-dot green" />
              </div>
              <div className="msd-browser-address">🔒 https://wanderfile.com/travel</div>
            </div>

            <div className="msd-browser-content" style={{ padding: 0 }}>
              <div className="msd-drawer-container">
                {/* Background Dimmed Library */}
                <div className="msd-drawer-bg">
                  <div style={{ height: "200px", background: "#173b49", borderRadius: "12px" }} />
                  <div style={{ height: "200px", background: "#173b49", borderRadius: "12px" }} />
                  <div style={{ height: "200px", background: "#173b49", borderRadius: "12px" }} />
                  <div style={{ height: "200px", background: "#173b49", borderRadius: "12px" }} />
                  <div style={{ height: "200px", background: "#173b49", borderRadius: "12px" }} />
                  <div style={{ height: "200px", background: "#173b49", borderRadius: "12px" }} />
                </div>

                {/* Right Slide-Over Panel */}
                <div className="msd-drawer-panel">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontSize: "10px", fontWeight: "800", color: "#4fe8f6", textTransform: "uppercase" }}>WANDERFILE STUDIO</span>
                      <h3 style={{ margin: "2px 0 0", fontSize: "18px", color: "#fff" }}>Quick Add to Atlas</h3>
                    </div>
                    <button type="button" className="msd-icon-btn">✕</button>
                  </div>

                  <input
                    aria-label="Slide-over URL input"
                    defaultValue="https://www.instagram.com/reel/DbcHtcHyBfU"
                    style={{
                      width: "100%",
                      background: "#0e242f",
                      border: "1px solid #285465",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                      padding: "10px",
                      boxSizing: "border-box",
                    }}
                  />

                  <div style={{ background: "#0e242f", border: "1px solid #234d5d", borderRadius: "10px", padding: "12px" }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div className="msd-hero-thumb" style={{ width: "50px", height: "65px" }} />
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "700", color: "#fff" }}>7 Hidden Zen Cafés</div>
                        <div style={{ fontSize: "11px", color: "#4fe8f6", marginTop: "2px" }}>4 places extracted</div>
                        <div style={{ fontSize: "10px", color: "#7fa5b3", marginTop: "2px" }}>Arashiyama, Kyoto</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
                    <button type="button" className="msd-primary-action" style={{ flex: 2, padding: "10px" }}>
                      Save & Pin to Map
                    </button>
                    <button type="button" className="msd-secondary-action" style={{ flex: 1, padding: "10px" }}>
                      Close (Esc)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
      )}
    </div>
  );
}

function QuietSaveOption({ option, saveState }: { option: DemoOption; saveState: MockSaveState }) {
  const [shownState, setShownState] = useState<MockSaveState | "failed">(saveState);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [preview, setPreview] = useState<"receipt" | "save" | "queue">("receipt");

  useEffect(() => {
    setShownState(saveState);
    setSheetOpen(true);
    setPreview("receipt");
  }, [saveState]);

  const status = {
    running: { eyebrow: "LINK RECEIVED", title: "Organizing your save", detail: "You can keep browsing while we finish." },
    completed: { eyebrow: "READY TO OPEN", title: "Your save is ready", detail: "4 places found in this save." },
    duplicate: { eyebrow: "ALREADY SAVED", title: "In your library", detail: "Open the save you already have." },
    batch: { eyebrow: "SAVING LINKS", title: "3 of 4 processed", detail: "One link is still being organized." },
    failed: { eyebrow: "NEEDS ATTENTION", title: "Couldn't save this link", detail: "Your link is kept here. Try again." },
  }[shownState];

  const primaryLabel = {
    running: "Keep browsing",
    completed: "Open save",
    duplicate: "Open existing save",
    batch: "View queue",
    failed: "Try again",
  }[shownState];

  return (
    <article className="msd-option-card">
      <div className="msd-option-header">
        <div className="msd-option-badge-row">
          <span className="msd-option-tag">Option {option.number}</span>
          <span className="msd-option-principle">{option.principle}</span>
        </div>
        <h2 className="msd-option-title">{option.title}</h2>
        <p className="msd-option-desc">{option.description}</p>
        <button
          type="button"
          className="msd6-failure-trigger"
          onClick={() => { setShownState("failed"); setPreview("receipt"); setSheetOpen(true); }}
        >
          Simulate failed save
        </button>
      </div>

      <div className="msd-phone msd6-phone">
        <div className="msd-phone-statusbar">
          <span>9:41</span>
          <div className="msd-phone-camera-island" />
          <span>5G 92%</span>
        </div>
        <div className="msd-screen-header">
          <span className="msd-header-title">Your library</span>
          <span className="msd6-header-mark" aria-hidden="true">✳</span>
        </div>
        <div className="msd-screen-body msd6-library">
          <button type="button" className={`msd6-status msd6-status--${shownState}`} onClick={() => { setPreview("receipt"); setSheetOpen(true); }}>
            <span className="msd6-status-icon" aria-hidden="true">{shownState === "failed" ? "!" : shownState === "running" || shownState === "batch" ? "↻" : "✓"}</span>
            <span className="msd6-status-copy">
              <small>{status.eyebrow}</small>
              <strong>{status.title}</strong>
              <span>{status.detail}</span>
            </span>
            <span className="msd6-status-arrow" aria-hidden="true">›</span>
          </button>

          <div className="msd6-list-heading"><strong>Recently saved</strong><span>See all →</span></div>
          <div className="msd6-recent-card"><span className="msd-hist-thumb food" /><span><strong>Sunday pasta worth keeping</strong><small>Recipe · Yesterday</small></span></div>
          <div className="msd6-recent-card"><span className="msd-hist-thumb watch" /><span><strong>The Grand Budapest Hotel</strong><small>Watch · Sep 24</small></span></div>
          <div className="msd6-recent-card"><span className="msd-hist-thumb travel" /><span><strong>Amalfi Coast road trip</strong><small>Travel · Sep 22</small></span></div>
          <div className="msd6-tab-bar"><span>⌂<small>Home</small></span><span>▤<small>Posts</small></span><span>⌕<small>Search</small></span></div>
        </div>

        {sheetOpen ? (
          <div className="msd6-overlay">
            <button type="button" className="msd6-backdrop" aria-label="Close save preview" onClick={() => setSheetOpen(false)} />
            <div className="msd6-sheet">
              <div className="msd-drag-handle" aria-hidden="true" />
              <div className="msd6-sheet-heading">
                <div><small>WANDERFILE</small><h3>{preview === "save" ? "Saved item preview" : preview === "queue" ? "Your save queue" : status.title}</h3></div>
                <button type="button" className="msd-icon-btn" aria-label="Close save preview" onClick={() => setSheetOpen(false)}>✕</button>
              </div>
              {preview === "queue" ? (
                <div className="msd6-detail-list"><p>✓ Kyoto cafés · Ready</p><p>✓ Sunday pasta · Ready</p><p>✓ Film list · Ready</p><p>↻ Amalfi guide · Organizing</p></div>
              ) : (
                <>
                  <div className="msd6-preview">
                    <div className="msd6-preview-art" aria-hidden="true">▶</div>
                    <div><strong>7 Hidden Zen Cafés in Arashiyama</strong><span>Instagram · @kyotoguide</span></div>
                  </div>
                  <p className="msd6-sheet-message">{preview === "save" ? "Travel · Kyoto · Saved from Instagram" : status.detail}</p>
                  {preview === "save" || shownState === "completed" ? <p className="msd6-result">✓ 4 places found · Kissa Soirée, Tenryu-ji and more</p> : null}
                </>
              )}
              {preview === "receipt" ? (
                <button
                  type="button"
                  className="msd-primary-action"
                  onClick={() => {
                    if (shownState === "failed") setShownState("running");
                    else if (shownState === "completed" || shownState === "duplicate") setPreview("save");
                    else if (shownState === "batch") setPreview("queue");
                    else setSheetOpen(false);
                  }}
                >
                  {primaryLabel}
                </button>
              ) : null}
              {preview !== "receipt" || shownState === "completed" || shownState === "duplicate" || shownState === "batch" ? (
                <button type="button" className="msd6-done" onClick={() => setSheetOpen(false)}>Done</button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default MobileSaveDesignDemos;
