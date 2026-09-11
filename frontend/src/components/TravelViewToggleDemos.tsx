import { useState, type ReactNode } from "react";

import "./travel-view-toggle-demos.css";

type ViewMode = "covers" | "map";

function CoversIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="6" height="14" rx="1.5" />
      <rect x="12" y="5" width="8" height="6" rx="1.5" />
      <rect x="12" y="13" width="8" height="6" rx="1.5" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function ModeButton({
  mode,
  value,
  onChange,
  children,
  className = "",
}: {
  mode: ViewMode;
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`${className} ${mode === value ? "is-active" : ""}`.trim()}
      aria-pressed={mode === value}
      onClick={() => onChange(value)}
    >
      {children}
    </button>
  );
}

function Segment({ mode, onChange, icons = false }: { mode: ViewMode; onChange: (mode: ViewMode) => void; icons?: boolean }) {
  return (
    <div className="tvt-segment" aria-label="View mode">
      <ModeButton mode={mode} value="covers" onChange={onChange}>
        {icons ? <CoversIcon /> : null}<span>Covers</span>
      </ModeButton>
      <ModeButton mode={mode} value="map" onChange={onChange}>
        {icons ? <MapIcon /> : null}<span>Map</span>
      </ModeButton>
    </div>
  );
}

function MiniContent({ mode }: { mode: ViewMode }) {
  return mode === "map" ? (
    <div className="tvt-map" aria-label="Map preview">
      <i className="tvt-road tvt-road-a" /><i className="tvt-road tvt-road-b" />
      <span className="tvt-pin tvt-pin-a">1</span><span className="tvt-pin tvt-pin-b">2</span><span className="tvt-pin tvt-pin-c">3</span>
    </div>
  ) : (
    <div className="tvt-covers" aria-label="Cover preview">
      <article><span>Lisbon</span><strong>Pastel mornings</strong></article>
      <article><span>Kyoto</span><strong>Quiet corners</strong></article>
      <article><span>Mexico City</span><strong>Weekend table</strong></article>
    </div>
  );
}

function Frame({
  number,
  title,
  note,
  renderControl,
  controlPosition = "toolbar",
}: {
  number: number;
  title: string;
  note: string;
  renderControl: (mode: ViewMode, onChange: (mode: ViewMode) => void) => ReactNode;
  controlPosition?: "header" | "toolbar" | "content" | "floating";
}) {
  const [mode, setMode] = useState<ViewMode>("covers");
  const control = renderControl(mode, setMode);

  return (
    <article className="tvt-option">
      <div className="tvt-option-copy"><span>{String(number).padStart(2, "0")}</span><h2>{title}</h2><p>{note}</p></div>
      <div className="tvt-browser">
        <div className="tvt-browser-top"><i /><i /><i /><span>wanderfile.app/travel</span></div>
        <div className="tvt-page">
          <header className="tvt-header">
            <div><small>Your atlas</small><h3>Travel</h3><p>Places worth remembering.</p></div>
            {controlPosition === "header" ? control : <b>24<small> places</small></b>}
          </header>
          <div className="tvt-toolbar"><span>Search your places</span>{controlPosition === "toolbar" ? control : null}</div>
          {controlPosition === "content" ? <div className="tvt-content-control">{control}</div> : null}
          <MiniContent mode={mode} />
          {controlPosition === "floating" ? <div className="tvt-floating">{control}</div> : null}
        </div>
      </div>
    </article>
  );
}

export function TravelViewToggleDemos() {
  return (
    <main className="tvt-demo-page">
      <header className="tvt-intro">
        <a href="/travel">← Travel</a>
        <p>View switch explorations</p>
        <h1>Map or covers?</h1>
        <span>Ten interactive directions. Switch each one to compare its placement and feel.</span>
      </header>
      <section className="tvt-grid">
        <Frame number={1} title="Content toolbar" note="Recommended · icon and label, next to the content it changes." renderControl={(mode, onChange) => <Segment mode={mode} onChange={onChange} icons />} />
        <Frame number={2} title="Header segment" note="The current position, strengthened with recognizable icons." controlPosition="header" renderControl={(mode, onChange) => <Segment mode={mode} onChange={onChange} icons />} />
        <Frame number={3} title="Editorial tabs" note="A wider, quieter underline treatment above the results." controlPosition="content" renderControl={(mode, onChange) => <div className="tvt-tabs"><ModeButton mode={mode} value="covers" onChange={onChange}>Covers</ModeButton><ModeButton mode={mode} value="map" onChange={onChange}>Map</ModeButton></div>} />
        <Frame number={4} title="Sliding lens" note="A tactile switch with a single animated selection surface." renderControl={(mode, onChange) => <div className={`tvt-slider is-${mode}`}><i /><ModeButton mode={mode} value="covers" onChange={onChange}><CoversIcon /><span>Covers</span></ModeButton><ModeButton mode={mode} value="map" onChange={onChange}><MapIcon /><span>Map</span></ModeButton></div>} />
        <Frame number={5} title="Icon pair" note="Minimal footprint for a busy header or narrow toolbar." controlPosition="header" renderControl={(mode, onChange) => <div className="tvt-icons" aria-label="View mode"><ModeButton mode={mode} value="covers" onChange={onChange} className="tvt-icon-button"><CoversIcon /><span className="tvt-sr-only">Covers</span></ModeButton><ModeButton mode={mode} value="map" onChange={onChange} className="tvt-icon-button"><MapIcon /><span className="tvt-sr-only">Map</span></ModeButton></div>} />
        <Frame number={6} title="Browse as" note="Explicit framing, with room for a future list or itinerary view." renderControl={(mode, onChange) => <div className="tvt-browse-as"><small>Browse as</small><Segment mode={mode} onChange={onChange} /></div>} />
        <Frame number={7} title="Visual previews" note="Tiny cover and map thumbnails make the outcome unmistakable." controlPosition="content" renderControl={(mode, onChange) => <div className="tvt-previews"><ModeButton mode={mode} value="covers" onChange={onChange}><i className="tvt-preview-cards"><em /><em /><em /></i><span>Covers</span></ModeButton><ModeButton mode={mode} value="map" onChange={onChange}><i className="tvt-preview-map"><em /><em /></i><span>Map</span></ModeButton></div>} />
        <Frame number={8} title="Contextual action" note="One clear action names the destination rather than both states." renderControl={(mode, onChange) => <ModeButton mode={mode} value={mode === "covers" ? "map" : "covers"} onChange={onChange} className="tvt-contextual">{mode === "covers" ? <MapIcon /> : <CoversIcon />}<span>{mode === "covers" ? "Map these places" : "Browse covers"}</span></ModeButton>} />
        <Frame number={9} title="Sticky rail" note="A compact switch anchored to the upper-right of the results." controlPosition="floating" renderControl={(mode, onChange) => <Segment mode={mode} onChange={onChange} icons />} />
        <Frame number={10} title="Map peek" note="Covers stay primary; the map opens as an inviting secondary view." controlPosition="floating" renderControl={(mode, onChange) => <ModeButton mode={mode} value={mode === "covers" ? "map" : "covers"} onChange={onChange} className="tvt-peek">{mode === "covers" ? <PinIcon /> : <CoversIcon />}<span>{mode === "covers" ? "View map" : "View covers"}</span></ModeButton>} />
      </section>
    </main>
  );
}
