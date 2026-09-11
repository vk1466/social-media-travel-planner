const sources = [
  { id: "instagram", label: "Instagram", cls: "ig", path: "M7.03.084c-1.277.06-2.149.264-2.911.563-.789.308-1.458.72-2.123 1.388S.922 3.37.617 4.161C.322 4.925.122 5.798.065 7.076.009 8.353-.004 8.764.002 12.023c.006 3.259.021 3.667.083 4.947.061 1.277.264 2.149.563 2.911.308.789.72 1.457 1.388 2.123.668.665 1.337 1.074 2.129 1.38.763.295 1.636.496 2.913.552 1.277.056 1.688.069 4.946.063 3.258-.006 3.668-.021 4.948-.081 1.28-.061 2.147-.265 2.91-.563.789-.309 1.458-.72 2.123-1.388.665-.668 1.074-1.338 1.379-2.129.296-.763.497-1.636.552-2.912.056-1.281.069-1.69.063-4.948-.006-3.258-.021-3.667-.082-4.947-.061-1.28-.264-2.149-.563-2.912-.308-.789-.72-1.457-1.388-2.123C21.298 1.33 20.628.921 19.838.617 19.074.321 18.202.12 16.924.065 15.647.009 15.236-.005 11.977.001 8.718.008 8.31.022 7.03.084m.14 21.693c-1.17-.051-1.805-.245-2.229-.408-.561-.216-.96-.477-1.382-.895-.422-.418-.681-.819-.9-1.378-.164-.424-.362-1.058-.417-2.228-.06-1.265-.072-1.645-.079-4.848-.007-3.204.005-3.583.061-4.848.05-1.169.245-1.805.408-2.228.216-.561.476-.96.895-1.382.419-.422.818-.681 1.378-.9.423-.165 1.058-.361 2.227-.417 1.266-.06 1.645-.072 4.848-.079 3.203-.007 3.584.005 4.85.061 1.169.051 1.805.245 2.228.408.561.216.96.475 1.382.895.422.419.682.817.901 1.379.165.422.362 1.056.417 2.226.06 1.266.074 1.645.08 4.848.006 3.203-.006 3.583-.061 4.848-.051 1.17-.245 1.806-.408 2.23-.216.56-.476.96-.895 1.381-.419.422-.818.681-1.378.9-.423.165-1.058.362-2.227.417-1.266.06-1.645.072-4.849.079-3.204.007-3.583-.006-4.848-.061M16.953 5.586a1.44 1.44 0 1 0 1.437-1.442 1.44 1.44 0 0 0-1.437 1.442M5.839 12.012c.006 3.403 2.77 6.156 6.173 6.149 3.402-.006 6.157-2.77 6.15-6.173-.006-3.403-2.77-6.157-6.174-6.15-3.403.007-6.156 2.771-6.15 6.174M8 12.008a4 4 0 1 1 4.008 3.992A4 4 0 0 1 8 12.008" },
  { id: "tiktok", label: "TikTok", cls: "tk", path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" },
  { id: "youtube", label: "YouTube", cls: "yt", path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
  { id: "web", label: "Web", cls: "web", path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.92 6h-3.01a15.7 15.7 0 0 0-1.38-3.56A8.03 8.03 0 0 1 18.92 8ZM12 4c.83 1.2 1.48 2.53 1.88 4h-3.76A13.7 13.7 0 0 1 12 4ZM4.26 14a7.8 7.8 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4h-3.4Zm.82 2h3.01c.3 1.26.76 2.45 1.38 3.56A8.03 8.03 0 0 1 5.08 16ZM8.09 8H5.08a8.03 8.03 0 0 1 4.39-3.56A15.7 15.7 0 0 0 8.09 8ZM12 20a13.7 13.7 0 0 1-1.88-4h3.76A13.7 13.7 0 0 1 12 20Zm2.32-6H9.68a14.4 14.4 0 0 1 0-4h4.64a14.4 14.4 0 0 1 0 4Zm.21 5.56A15.7 15.7 0 0 0 15.91 16h3.01a8.03 8.03 0 0 1-4.39 3.56ZM16.34 14a16.5 16.5 0 0 0 0-4h3.4a7.8 7.8 0 0 1 0 4h-3.4Z" },
];
const concepts = [
  ["Logo constellation", "Overlapping logos with a plain-language count; icons carry the visual identity, text carries the meaning.", "pill"],
  ["Segmented source tabs", "Four direct tabs make the filter visible at a glance and keep the active state close to the title.", "segmented"],
  ["Labeled source tiles", "Friendly rectangular tiles combine logo, name, and count for confident scanning.", "tile"],
  ["Icon rail", "A very compact icon rail works when horizontal space is precious; each icon retains a tooltip and selected label.", "rail"],
  ["Stacked source menu", "The title stays quiet while a list-like menu makes multi-selection and Everything explicit.", "stack"],
  ["Split control", "A self-contained title-and-filter card creates a strong, balanced action-rail unit.", "split"],
  ["Selection badge", "A soft green badge turns the current filter into a calm status object beside the page title.", "badge"],
  ["Popover trigger", "The control is a familiar compact trigger; its open menu exposes every source without taking permanent space.", "menu"],
  ["Coral stamp", "A branded vertical rule and compact source line make the selection feel editorial rather than purely utilitarian.", "stamp"],
  ["Night mosaic", "A high-contrast action rail treats source logos as a small, tactile control surface.", "mosaic"],
];
let selected = new Set(sources.map((source) => source.id));
let menuOpen = false;
let current = Math.max(0, Math.min(concepts.length - 1, Number(location.hash.slice(1)) - 1 || 0));
const options = document.querySelector("#options");
const switcher = document.querySelector("#switcher");
const resultCount = document.querySelector("#result-count");
const number = document.querySelector("#option-number");
const name = document.querySelector("#option-name");
const note = document.querySelector("#option-note");
options.innerHTML = concepts.map((concept, index) => `<button type="button" data-index="${index}"><span>${String(index + 1).padStart(2, "0")}</span><b>${concept[0]}</b><small>${index === 0 ? "Recommended" : "Direction"}</small></button>`).join("");
function logo(source) { return `<span class="logo ${source.cls}" title="${source.label}" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${source.path}" /></svg></span>`; }
function logos(ids = [...selected]) { return ids.map((id) => logo(sources.find((item) => item.id === id))).join(""); }
function label() { if (selected.size === sources.length) return "All apps"; if (!selected.size) return "No apps"; if (selected.size === 1) return sources.find((source) => selected.has(source.id)).label; return `${selected.size} apps`; }
function choices() { return `<div class="control-grid${menuOpen ? " is-open" : ""}" role="group" aria-label="Filter saved posts by app"><button aria-pressed="${selected.size === sources.length}" class="choice ${selected.size === sources.length ? "is-on" : ""}" data-source="all"><span>Everything</span></button>${sources.map((source) => `<button aria-pressed="${selected.has(source.id)}" class="choice ${selected.has(source.id) ? "is-on" : ""}" data-source="${source.id}">${logo(source)}<span>${source.label}</span></button>`).join("")}</div>`; }
function control() { return `<button class="control" type="button" aria-label="Filter by app: ${label()}" aria-expanded="${menuOpen}"><span class="logos">${logos()}</span><span class="selection">${label()}</span><span class="chev">⌄</span></button>`; }
function markup(style) {
  if (style === "segmented") return `<header class="switcher segmented"><h1>Saved posts</h1>${choices()}</header>`;
  if (style === "tile") return `<header class="switcher tile"><h1>Saved posts</h1>${choices()}</header>`;
  if (style === "rail") return `<header class="switcher rail"><h1>Saved posts</h1><div class="icon-rail">${choices()}</div></header>`;
  if (style === "stack") return `<header class="switcher stack"><h1>Saved posts</h1>${choices()}</header>`;
  if (style === "split") return `<header class="switcher split"><h1>Saved posts</h1><div>${control()}</div>${choices()}</header>`;
  if (style === "badge") return `<header class="switcher badge"><h1>Saved posts</h1>${control()}${choices()}</header>`;
  if (style === "menu") return `<header class="switcher menu"><h1>Saved posts</h1>${control()}${choices()}</header>`;
  if (style === "stamp") return `<header class="switcher stamp"><h1>Saved posts</h1>${choices()}</header>`;
  if (style === "mosaic") return `<header class="switcher mosaic"><h1>Saved posts</h1>${choices()}</header>`;
  return `<header class="switcher dotline"><h1>Saved posts</h1>${control()}${choices()}</header>`;
}
function render(index) { current = (index + concepts.length) % concepts.length; const concept = concepts[current]; switcher.innerHTML = markup(concept[2]); number.textContent = `Option ${String(current + 1).padStart(2, "0")}`; name.textContent = concept[0]; note.textContent = concept[1]; options.querySelectorAll("button").forEach((button, index) => { button.classList.toggle("is-active", index === current); button.setAttribute("aria-current", index === current ? "true" : "false"); }); resultCount.textContent = selected.size === sources.length ? "148 saves" : `${Math.max(0, selected.size * 29 - 2)} saves`; history.replaceState(null, "", `#${current + 1}`); }
switcher.addEventListener("click", (event) => { const sourceButton = event.target.closest("[data-source]"); if (!sourceButton) { const trigger = event.target.closest(".control"); if (trigger) { menuOpen = !menuOpen; render(current); } return; } if (sourceButton.dataset.source === "all") selected = new Set(sources.map((source) => source.id)); else if (selected.has(sourceButton.dataset.source)) selected.delete(sourceButton.dataset.source); else selected.add(sourceButton.dataset.source); render(current); });
options.addEventListener("click", (event) => { const button = event.target.closest("button"); if (button) { menuOpen = false; render(Number(button.dataset.index)); } });
window.addEventListener("keydown", (event) => { if (event.key === "ArrowLeft") render(current - 1); if (event.key === "ArrowRight") render(current + 1); });
render(current);
