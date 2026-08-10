/**
 * Injects the small review banner at the top of any complete-site page.
 * The page just needs to include this script; it reads window.WF_SITE
 * (set inline before the include) to know which site is active.
 *
 * window.WF_SITE = { id: "01-voyager", title: "Voyager", thesis: "Bright adventure atlas.", page: "home" };
 */
(function () {
  const SITES = [
    { id: "01-voyager", label: "01 · Voyager" },
    { id: "02-almanac", label: "02 · Almanac" },
    { id: "03-memo", label: "03 · Memo" },
  ];

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(() => {
    const meta = window.WF_SITE || { id: "", title: "Site", thesis: "" };
    const banner = document.createElement("header");
    banner.className = "review-banner banner";
    banner.innerHTML = `
      <a href="../../index.html">← Design Lab</a>
      <span class="rb-title">${meta.title}</span>
      <span class="rb-thesis">${meta.thesis || ""}</span>
      <nav class="rb-nav" aria-label="Complete sites">
        ${SITES.map(
          (s) =>
            `<a href="../${s.id}/index.html" ${s.id === meta.id ? 'aria-current="true"' : ""}>${s.label}</a>`,
        ).join("")}
      </nav>
    `;
    document.body.insertBefore(banner, document.body.firstChild);
  });
})();
