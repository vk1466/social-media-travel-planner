import { useState } from "react";

import "./mobile-library-design-demos.css";

type Demo = {
  title: string;
  note: string;
  mode: "list" | "covers" | "map" | "sheet" | "lens";
};

const demos: Demo[] = [
  { title: "Compact filter tray", note: "One clear entry point for secondary filters.", mode: "sheet" },
  { title: "Lens bar", note: "Switch the library lens before refining results.", mode: "lens" },
  { title: "Bottom-sheet filters", note: "Keep the browse surface calm and touchable.", mode: "sheet" },
  { title: "Sticky query header", note: "Search stays close while the heading recedes.", mode: "list" },
  { title: "Editorial category rail", note: "Small marks replace oversized category cards.", mode: "list" },
  { title: "Cover rails by section", note: "A sequence of focused, swipeable shelves.", mode: "covers" },
  { title: "Map-first travel", note: "Let place and geography lead the experience.", mode: "map" },
  { title: "Dense library list", note: "More saved ideas visible per thumb-length.", mode: "list" },
  { title: "Progressive disclosure", note: "Reveal only filters relevant to the current lens.", mode: "lens" },
  { title: "Full-screen browse", note: "An immersive mobile surface with minimal chrome.", mode: "covers" },
];

const places = [
  ["Alfama", "Lisbon · neighborhood", "coral"],
  ["Kotor Bay", "Montenegro · coast", "sage"],
  ["Ubud", "Bali · retreat", "gold"],
] as const;

function MockCard({ index, compact = false }: { index: number; compact?: boolean }) {
  const place = places[index % places.length];
  return (
    <article className={`mld-card${compact ? " is-compact" : ""}`}>
      <span className={`mld-thumb ${place[2]}`} aria-hidden="true" />
      <span className="mld-card-copy"><strong>{place[0]}</strong><small>{place[1]}</small></span>
      <span className="mld-card-count">{index + 3}</span>
    </article>
  );
}

function Filters({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div className="mld-filter-area">
      <div className="mld-search" role="search"><span aria-hidden="true">⌕</span><input aria-label="Search places" placeholder="Search your atlas" /></div>
      <button className={`mld-filter-button${open ? " is-on" : ""}`} type="button" aria-expanded={open} onClick={onToggle}>Filters <b>2</b></button>
      <div className="mld-token-row" aria-label="Active filters"><button type="button">Want to go ×</button><button type="button">Coast ×</button></div>
      {open ? <div className="mld-sheet" role="dialog" aria-label="Filter places"><strong>Refine your atlas</strong><button type="button" className="mld-sheet-option is-selected">Want to go <span>✓</span></button><button type="button" className="mld-sheet-option">Visited <span>○</span></button><button type="button" className="mld-sheet-option">Coast <span>✓</span></button><button type="button" className="mld-apply" onClick={onToggle}>Show 24 places</button></div> : null}
    </div>
  );
}

function Phone({ demo, index }: { demo: Demo; index: number }) {
  const [open, setOpen] = useState(false);
  const option = index + 1;
  return (
    <article className="mld-option">
      <div className="mld-option-heading"><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{demo.title}{index === 4 ? <em>Selected</em> : null}</h2><p>{demo.note}</p></div></div>
      <div className={`mld-phone mld-mode-${demo.mode} mld-option-${option}`}>
        <header className="mld-phone-header"><span className="mld-wordmark">Wanderfile</span><div><button type="button" aria-label="Search">⌕</button><button type="button" aria-label="Add link">＋</button></div></header>
        {option === 2 || option === 9 ? <nav className="mld-lens" aria-label="Library lens"><button className="is-active" type="button">Travel</button><button type="button">Food</button><button type="button">Movies</button></nav> : null}
        <main className="mld-phone-body">
          {option === 4 ? <div className="mld-condensed"><span className="mld-scroll-kicker">24 places · Lisbon</span><div className="mld-title-row"><h3>Places</h3><span>Sort ↕</span></div><div className="mld-search"><span aria-hidden="true">⌕</span><input aria-label="Sticky search" placeholder="Search stays, cities…" /></div></div> : <><p className="mld-eyebrow">Your atlas</p><div className="mld-title-row"><h3>{option === 7 ? "Lisbon" : option === 6 ? "By region" : option === 10 ? "Field notes" : "Saved ideas"}</h3><span>24 places</span></div></>}
          {option === 1 ? <><Filters open={open} onToggle={() => setOpen((value) => !value)} /><div className="mld-results"><MockCard index={index} /><MockCard index={index + 1} /></div></> : null}
          {option === 2 ? <><div className="mld-context-row"><button className="is-active" type="button">Want to go</button><button type="button">Visited</button></div><div className="mld-results"><MockCard index={index} /><MockCard index={index + 1} /></div></> : null}
          {option === 3 ? <><div className="mld-results mld-content-first"><MockCard index={index} /><MockCard index={index + 1} /><MockCard index={index + 2} /></div><button className="mld-bottom-dock" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>☷ Filters <b>2</b></button>{open ? <div className="mld-sheet mld-dock-sheet" role="dialog" aria-label="Filter places"><strong>Filter your saves</strong><button className="mld-sheet-option is-selected" type="button">Want to go <span>✓</span></button><button className="mld-apply" type="button" onClick={() => setOpen(false)}>Apply filters</button></div> : null}</> : null}
          {option === 4 ? <div className="mld-results"><MockCard index={index} compact /><MockCard index={index + 1} compact /></div> : null}
          {option === 5 ? <><nav className="mld-icon-rail" aria-label="Categories"><button className="is-active" type="button">◎<small>All</small></button><button type="button">⌂<small>Stay</small></button><button type="button">✦<small>Food</small></button><button type="button">◌<small>Walks</small></button></nav><div className="mld-results"><MockCard index={index} compact /><MockCard index={index + 1} compact /><MockCard index={index + 2} compact /></div></> : null}
          {option === 6 ? <div className="mld-sections"><section><h4>Southern Europe <small>8 saves</small></h4><div className="mld-cover-rail"><div className="mld-cover coral"><strong>Alfama</strong><small>Lisbon</small></div><div className="mld-cover sage"><strong>Kotor Bay</strong><small>Montenegro</small></div></div></section><section><h4>Island notes <small>5 saves</small></h4><div className="mld-cover-rail"><div className="mld-cover gold"><strong>Ubud</strong><small>Bali</small></div></div></section></div> : null}
          {option === 7 ? <><div className="mld-map" role="img" aria-label="Map preview with three saved places"><i /><i /><i /><span>Lisbon · 24 places</span></div><div className="mld-place-tray"><b>Nearby inspiration</b><MockCard index={0} compact /><MockCard index={1} compact /></div></> : null}
          {option === 8 ? <><div className="mld-list-toggle" role="group" aria-label="View mode"><button className="is-active" type="button">List</button><button type="button">Grid</button></div><div className="mld-results mld-dense"><MockCard index={index} compact /><MockCard index={index + 1} compact /><MockCard index={index + 2} compact /><MockCard index={index + 3} compact /></div></> : null}
          {option === 9 ? <><div className="mld-context-row"><button className="is-active" type="button">Coast</button><button type="button">City</button></div><div className="mld-results"><MockCard index={index} /><MockCard index={index + 1} /></div></> : null}
          {option === 10 ? <><div className="mld-immersive"><div className="mld-cover coral"><strong>Alfama</strong><small>Lisbon · save for later</small></div><div className="mld-cover sage"><strong>Kotor Bay</strong><small>Montenegro · coast</small></div></div><div className="mld-overlay-tools"><button type="button" aria-label="Search feed">⌕</button><button type="button" aria-label="Filter feed">☷</button></div></> : null}
        </main>
      </div>
    </article>
  );
}

export function MobileLibraryDesignDemos() {
  return <div className="mld-page"><header className="mld-intro"><a href="/travel">← Back to Travel</a><p className="mld-eyebrow">Mobile-only design gallery</p><h1>Ten smaller ways into the atlas.</h1><p>The selected editorial category rail now shapes the mobile app while preserving Wanderfile’s cream paper, forest ink, coral signal, and editorial serif. Desktop layouts above 760px stay unchanged.</p></header><div className="mld-grid">{demos.map((demo, index) => <Phone key={demo.title} demo={demo} index={index} />)}</div></div>;
}

export default MobileLibraryDesignDemos;
