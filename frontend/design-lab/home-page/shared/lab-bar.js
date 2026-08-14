/**
 * Sticky review bar injected into every home skin.
 *
 * Reads the current skin from the filename so each demo only needs
 * <script type="module" src="../shared/lab-bar.js"></script>.
 */
import { OPTIONS } from "./options.js";

const currentSlug = window.location.pathname
  .split("/")
  .pop()
  .replace(/\.html$/, "");

const current = OPTIONS.find((option) => `${option.id}-${option.slug}` === currentSlug);
const index = current ? OPTIONS.indexOf(current) : 0;
const previous = OPTIONS[(index - 1 + OPTIONS.length) % OPTIONS.length];
const next = OPTIONS[(index + 1) % OPTIONS.length];

const href = (option) => `${option.id}-${option.slug}.html`;

const bar = document.createElement("header");
bar.className = "lab-bar";
bar.innerHTML = `
  <a href="../index.html">← Home Skins</a>
  <span class="lab-title">${current ? current.title : "Skin"}</span>
  <span class="lab-note">${current ? current.note : ""}</span>
  <nav class="lab-pager" aria-label="Skin pager">
    <span class="lab-count">Skin ${current ? current.id : "01"} / ${OPTIONS.length}</span>
    <select aria-label="Jump to skin">
      ${OPTIONS.map(
        (option) =>
          `<option value="${href(option)}"${option === current ? " selected" : ""}>${option.id} · ${option.title}</option>`,
      ).join("")}
    </select>
    <a class="lab-step" href="${href(previous)}" aria-label="Previous skin">←</a>
    <a class="lab-step" href="${href(next)}" aria-label="Next skin">→</a>
    <a href="../../sites/04-volume/index.html">Live site</a>
  </nav>
`;

bar.querySelector("select").addEventListener("change", (event) => {
  window.location.href = event.target.value;
});

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  const tag = event.target?.tagName || "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (event.target?.isContentEditable) return;
  if (event.key === "ArrowLeft") window.location.href = href(previous);
  if (event.key === "ArrowRight") window.location.href = href(next);
});

document.body.insertBefore(bar, document.body.firstChild);
