import { useState } from "react";
import "./desktop-quiet-save-demo.css";

type SaveStatus = "waiting" | "organizing" | "ready" | "failed";
type SaveItem = { postUrl: string; label: string; status: SaveStatus };

const INITIAL_ITEMS: SaveItem[] = [
  { postUrl: "https://www.instagram.com/reel/DbcHtcHyBfU/", label: "Kyoto café ideas", status: "organizing" },
  { postUrl: "https://www.tiktok.com/@cook/video/123456789", label: "Sunday pasta", status: "ready" },
];

function validPostUrl(line: string): boolean {
  try {
    const postUrl = new URL(line);
    return postUrl.protocol === "https:" || postUrl.protocol === "http:";
  } catch {
    return false;
  }
}

function urlLabel(postUrl: string): string {
  const parsed = new URL(postUrl);
  const path = parsed.pathname.replace(/\/$/, "");
  return `${parsed.hostname.replace(/^www\./, "")}${path.length > 30 ? `${path.slice(0, 27)}…` : path}`;
}

const STATUS_LABELS: Record<SaveStatus, string> = {
  waiting: "Waiting",
  organizing: "Organizing",
  ready: "Ready",
  failed: "Needs attention",
};

export function DesktopQuietSaveDemo({ option }: { option: { number: string; title: string; principle: string; description: string } }) {
  const [draft, setDraft] = useState("");
  const [items, setItems] = useState<SaveItem[]>(INITIAL_ITEMS);
  const [note, setNote] = useState("Try adding a link, then use the demo controls to change its status.");
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const active = items.find((item) => item.status === "organizing");
  const waitingCount = items.filter((item) => item.status === "waiting").length;
  const failedCount = items.filter((item) => item.status === "failed").length;
  const selected = items.find((item) => item.postUrl === selectedUrl);
  const invalidLines = draft.split("\n").map((line) => line.trim()).filter((line) => line && !validPostUrl(line));
  const validCount = draft.split("\n").map((line) => line.trim()).filter((line) => line && validPostUrl(line)).length;

  const saveLinks = () => {
    const lines = draft.split("\n").map((line) => line.trim()).filter(Boolean);
    const valid = lines.filter(validPostUrl);
    const invalid = lines.filter((line) => !validPostUrl(line));
    const known = new Set(items.map((item) => item.postUrl));
    const newUrls = Array.from(new Set(valid)).filter((postUrl) => !known.has(postUrl));
    const hasActive = Boolean(active);
    const additions = newUrls.map((postUrl, index): SaveItem => ({
      postUrl,
      label: urlLabel(postUrl),
      status: !hasActive && index === 0 ? "organizing" : "waiting",
    }));
    if (additions.length) setItems((current) => [...current, ...additions]);
    setDraft(invalid.join("\n"));
    setNote(additions.length
      ? `${additions.length} ${additions.length === 1 ? "link was" : "links were"} received. Keep browsing while we organize ${additions.length === 1 ? "it" : "them"}.`
      : valid.length ? "Already in this sample library. Open its queue row to review it." : "Paste a valid link to continue.");
  };

  const finishActive = (failed: boolean) => {
    if (!active) return;
    setItems((current) => {
      const nextWaitingIndex = current.findIndex((item) => item.status === "waiting");
      return current.map((item, index) => {
        if (item.postUrl === active.postUrl) return { ...item, status: failed ? "failed" : "ready" };
        if (index === nextWaitingIndex) return { ...item, status: "organizing" };
        return item;
      });
    });
    setNote(failed ? "This link needs attention. Retry it from the queue." : "This save is ready. The next waiting link begins organizing automatically.");
  };

  const retry = (postUrl: string) => {
    setItems((current) => current.map((item) => item.postUrl === postUrl
      ? { ...item, status: current.some((entry) => entry.status === "organizing") ? "waiting" : "organizing" }
      : item));
    setNote("Retry added to the queue.");
  };

  return (
    <article className="msd-desktop-card dqs-option">
      <div className="msd-option-header">
        <div className="msd-option-badge-row">
          <span className="msd-option-tag">Desktop Option {option.number} · Interactive</span>
          <span className="msd-option-principle">{option.principle}</span>
        </div>
        <h2 className="msd-option-title">{option.title}</h2>
        <p className="msd-option-desc">{option.description}</p>
      </div>

      <div className="dqs-demo-tools" aria-label="Demo controls">
        <strong>Demo controls</strong>
        <button type="button" onClick={() => finishActive(false)} disabled={!active}>Finish current save</button>
        <button type="button" onClick={() => finishActive(true)} disabled={!active}>Fail current save</button>
        <button type="button" onClick={() => { setItems(INITIAL_ITEMS); setDraft(""); setSelectedUrl(null); setNote("Demo reset."); }}>Reset demo</button>
        <span>Sample interaction only · no links are sent to the API</span>
      </div>

      <div className="msd-browser-window">
        <div className="msd-browser-topbar">
          <div className="msd-browser-dots" aria-hidden="true"><span className="msd-browser-dot red" /><span className="msd-browser-dot yellow" /><span className="msd-browser-dot green" /></div>
          <div className="msd-browser-address">wanderfile.com/library</div>
        </div>
        <div className="dqs-browser-body">
          <div className="dqs-site-header">
            <span className="dqs-wordmark">Wanderfile<span aria-hidden="true">✳</span></span>
            <span className="dqs-nav-label">Your library</span>
            <span className="dqs-header-note">Saved ideas, all in one place</span>
          </div>
          <div className="dqs-workspace">
            <aside className="dqs-capture">
              <p className="dqs-eyebrow">Save something new</p>
              <h3>Keep the link.<br />Find it later.</h3>
              <p>Paste one or more links. Wanderfile accepts them first, then organizes them while you browse.</p>
              <label htmlFor="dqs-links">Links to save</label>
              <textarea
                id="dqs-links"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") saveLinks(); }}
                placeholder="https://www.instagram.com/reel/…"
                rows={5}
              />
              {invalidLines.length > 0 ? <p className="dqs-validation" role="alert">Check {invalidLines.length} invalid {invalidLines.length === 1 ? "line" : "lines"}. Valid links can still be saved.</p> : null}
              <button className="dqs-save-button" type="button" onClick={saveLinks} disabled={validCount === 0}>Save {validCount || ""} {validCount === 1 ? "link" : "links"}<span aria-hidden="true">→</span></button>
              <small>⌘ / Ctrl + Enter to save · One link per line</small>
            </aside>

            <main className="dqs-library">
              <div className="dqs-main-heading"><div><p className="dqs-eyebrow">Your library</p><h3>Ideas worth keeping.</h3></div><span>Browse while saving</span></div>
              <button type="button" className={`dqs-status-card${failedCount ? " has-issue" : ""}`} onClick={() => document.getElementById("dqs-queue")?.scrollIntoView({ behavior: "smooth", block: "nearest" })}>
                <span className="dqs-status-icon" aria-hidden="true">{failedCount ? "!" : active ? "↻" : "✓"}</span>
                <span><strong>{failedCount ? `${failedCount} ${failedCount === 1 ? "link needs" : "links need"} attention` : active ? "Organizing your saves" : "All links processed"}</strong><small>{active ? `${waitingCount} waiting · You can keep browsing` : "Open the queue to review your links"}</small></span>
                <span aria-hidden="true">View queue →</span>
              </button>
              <p className="dqs-feedback" role="status" aria-live="polite">{note}</p>

              <section className="dqs-queue" id="dqs-queue" aria-label="Save queue">
                <div className="dqs-section-heading"><h4>Save queue</h4><span>{items.length} {items.length === 1 ? "link" : "links"}</span></div>
                {items.map((item) => (
                  <div className="dqs-queue-row" key={item.postUrl}>
                    <span className={`dqs-row-dot is-${item.status}`} aria-hidden="true" />
                    <button type="button" className="dqs-row-main" onClick={() => setSelectedUrl(item.postUrl)} aria-label={`Review ${item.label}`}><strong>{item.label}</strong><small>{urlLabel(item.postUrl)}</small></button>
                    <span className={`dqs-row-status is-${item.status}`}>{STATUS_LABELS[item.status]}</span>
                    {item.status === "failed" ? <button type="button" className="dqs-row-action" onClick={() => retry(item.postUrl)}>Retry</button> : null}
                  </div>
                ))}
                {selected ? <div className="dqs-selected"><strong>{selected.label}</strong><span>{selected.postUrl}</span><span>{STATUS_LABELS[selected.status]}</span></div> : null}
              </section>

              <section className="dqs-recent" aria-label="Recent saves"><div className="dqs-section-heading"><h4>Recently saved</h4><span>Explore your library</span></div><div className="dqs-recent-grid"><div><span className="dqs-recent-art travel" aria-hidden="true" /><strong>Amalfi coast notes</strong><small>Travel · Yesterday</small></div><div><span className="dqs-recent-art food" aria-hidden="true" /><strong>Sunday pasta</strong><small>Food · Monday</small></div><div><span className="dqs-recent-art film" aria-hidden="true" /><strong>The Grand Budapest Hotel</strong><small>Watch · Last week</small></div></div></section>
            </main>
          </div>
        </div>
      </div>
    </article>
  );
}
