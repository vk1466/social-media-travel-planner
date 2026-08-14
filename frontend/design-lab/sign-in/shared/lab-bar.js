/**
 * Sticky review bar injected into every gate option.
 *
 * Reads the current option from the filename so each demo only needs
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

const bar = document.createElement("nav");
bar.className = "lab-bar";
bar.innerHTML = `
  <a href="../index.html">All options</a>
  <span class="lab-sep">·</span>
  <span class="lab-hide">Option ${current ? current.id : "01"} of ${OPTIONS.length}</span>
  <select aria-label="Jump to option">
    ${OPTIONS.map(
      (option) =>
        `<option value="${href(option)}"${option === current ? " selected" : ""}>${option.id} · ${option.title}</option>`,
    ).join("")}
  </select>
  <a href="${href(previous)}" aria-label="Previous option">←</a>
  <a href="${href(next)}" aria-label="Next option">→</a>
`;

bar.querySelector("select").addEventListener("change", (event) => {
  window.location.href = event.target.value;
});

document.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }
  if (event.key === "ArrowLeft") {
    window.location.href = href(previous);
  }
  if (event.key === "ArrowRight") {
    window.location.href = href(next);
  }
});

document.body.appendChild(bar);
