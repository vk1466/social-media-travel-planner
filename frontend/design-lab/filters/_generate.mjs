#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const demosDir = resolve(__dirname, "demos");
mkdirSync(demosDir, { recursive: true });

const DEMOS = [
  ["01", "airbnb-toolbar", "Compact toolbar + chips", "Primary filters as dropdown triggers in one slim row. Active choices become removable chips underneath — never a wall of pills.", "Airbnb filter bar"],
  ["02", "shopify-index", "Search-first index filters", "Search owns the row. Add Filter buttons open popovers. Promoted filters stay quiet until used.", "Shopify Polaris IndexFilters"],
  ["03", "command-palette", "Command palette filters", "A quiet search field and ⌘K. Typing applies status, type, or place name without laying every option out.", "Linear / Notion command palette"],
  ["04", "filter-drawer", "Single Filter drawer", "One Filter button with a badge. All facets live in a side drawer; the page stays calm.", "E-commerce filter drawers"],
  ["05", "bottom-sheet", "Bottom sheet refine", "A Refine control opens a sheet with Apply and a live count. Same pattern desktop and mobile.", "Airbnb / Maps mobile filters"],
  ["06", "sidebar-accordion", "Sidebar accordion facets", "Desktop catalog pattern. Facets collapse by default; only headings show until opened.", "Shopify vertical sidebar filters"],
  ["07", "segment-overflow", "Segmented + overflow menu", "Status as a segmented control. Types hide behind a single Type menu with search.", "Apple / Maps compact controls"],
  ["08", "scroll-chips", "Single scroll chip row", "One horizontal scroller — no section labels. Search sits left; chips are primary categories only.", "Google Maps category chips"],
  ["09", "filter-builder", "Where filter builder", "Add rules as Field · is · Value. Structured property filters instead of pill sprawl.", "Notion / Airtable filters"],
  ["10", "add-filter", "Add filter only", "Empty by default. Press + Add filter, pick a dimension, then a value. Only active chips remain.", "GitHub issues / Linear filters"],
  ["11", "top-n-more", "Top types + More", "Show the five most common types. Everything else lives behind +N more.", "Faceted search progressive disclosure"],
  ["12", "type-combobox", "Searchable type combobox", "Types never become a wrap row. A combobox with counts replaces the pill strip.", "Stripe / SaaS combobox filters"],
  ["13", "icon-rail", "Icon type rail", "Types as a compact icon strip with labels on hover. Status and group stay as tiny segments.", "Maps / travel category icons"],
  ["14", "tabs-plus-drawer", "Status tabs + Filters", "Status as understated text tabs. Grouping, type, and search sit behind one Filters control.", "Spotify / media library filters"],
  ["15", "token-search", "Tokenized smart search", "One field. Suggestions become filter tokens (status / type) that live inside the input as chips.", "GitHub search / Gmail operators"],
  ["16", "mega-popover", "Refine mega-popover", "A single Refine button opens a multi-column popover. Close it and only a summary remains.", "Airbnb desktop Filters panel"],
  ["17", "sentence-filters", "Editable filter sentence", "Showing everything · grouped by Region · all types — underlined words open pickers. Near-zero chrome.", "Natural-language summary filters"],
  ["18", "edge-rail", "Slim edge filter rail", "A narrow left icon rail for Group, Status, Type, Search. Panels expand on click, then collapse.", "Figma / design-tool side rails"],
  ["19", "one-row-dropdowns", "One-row dropdown bar", "Search + four dropdowns on a single line. Counts on the Type trigger. Clear when anything is active.", "Enterprise index tables"],
  ["20", "view-toggle-sheet", "View toggles + filter sheet", "Group-by as icon toggles beside the title. Status and type open in a focused filter sheet.", "Modern atlas / photo library UIs"],
];

const COMMON_CSS = `
.f-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.search-pill {
  display: flex; align-items: center; gap: 0.4rem;
  border: 1px solid var(--line); border-radius: 999px; padding: 0.45rem 0.85rem; background: #fbfaf7;
  flex: 1; min-width: 160px;
}
.search-pill input { border: 0; outline: 0; background: transparent; width: 100%; font: inherit; font-size: 0.88rem; }
.btn {
  border: 1px solid var(--line); background: #fff; border-radius: 999px;
  padding: 0.45rem 0.85rem; font: inherit; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: var(--ink);
}
.btn.is-on { border-color: var(--accent); background: var(--soft); color: var(--accent); }
.btn.solid { border: 0; background: var(--accent); color: var(--accent-ink); }
.btn.ghost { border-style: dashed; color: var(--muted); }
.btn.sq { border-radius: 10px; }
.chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.7rem; }
.chip {
  display: inline-flex; align-items: center; gap: 0.3rem;
  background: var(--accent); color: var(--accent-ink); border-radius: 999px;
  padding: 0.25rem 0.45rem 0.25rem 0.7rem; font-size: 0.74rem; font-weight: 600;
}
.chip.soft { background: var(--soft); color: var(--accent); }
.chip button { border: 0; background: transparent; color: inherit; cursor: pointer; font-size: 1rem; line-height: 1; }
.menu {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: 40;
  min-width: 200px; max-height: 280px; overflow: auto;
  background: #fff; border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); padding: 0.35rem;
}
.menu button, .opt {
  display: flex; width: 100%; justify-content: space-between; gap: 1rem; align-items: center;
  border: 0; background: transparent; text-align: left; padding: 0.5rem 0.65rem;
  border-radius: 8px; font: inherit; font-size: 0.82rem; cursor: pointer; color: var(--ink);
}
.menu button:hover, .menu button.is-active, .opt:hover, .opt.is-active { background: var(--soft); color: var(--accent); }
.wrap { position: relative; }
.seg {
  display: inline-flex; padding: 3px; border: 1px solid var(--line); border-radius: 999px; background: #fbfaf7;
}
.seg button {
  border: 0; background: transparent; border-radius: 999px; padding: 0.35rem 0.7rem;
  font: inherit; font-size: 0.76rem; font-weight: 600; color: var(--muted); cursor: pointer;
}
.seg button.is-active { background: var(--accent); color: var(--accent-ink); }
.overlay { position: fixed; inset: 0; background: rgb(12 15 14 / 0.4); z-index: 70; }
.overlay[hidden] { display: none; }
.hint { margin: 0.5rem 0 0; font-size: 0.78rem; color: var(--muted); }
`;

function shell(meta, styles, markup, script) {
  const [id, slug, title, blurb, inspired] = meta;
  const idx = DEMOS.findIndex((d) => d[0] === id);
  const prev = idx > 0 ? `${DEMOS[idx - 1][0]}-${DEMOS[idx - 1][1]}.html` : null;
  const next = idx < DEMOS.length - 1 ? `${DEMOS[idx + 1][0]}-${DEMOS[idx + 1][1]}.html` : null;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${id} · ${title} — Filter Lab</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../shared/shell.css" />
  <style>${COMMON_CSS}\n${styles}</style>
</head>
<body>
  <header class="demo-top">
    <a href="../index.html">← Filter Lab</a>
    <span class="pattern">Pattern ${id}</span>
    <a href="../../index.html">Design Lab</a>
  </header>
  <main class="demo-shell">
    <div class="demo-intro">
      <h1>${title}</h1>
      <p>${blurb}</p>
      <p class="demo-inspired">Inspired by <strong>${inspired}</strong></p>
    </div>
    <section class="demo-stage" id="stage">
${markup}
      <div class="demo-results">
        <div class="demo-results-meta" data-results-meta></div>
        <div class="demo-grid" data-results-grid></div>
      </div>
    </section>
    <nav class="demo-nav">
      ${prev ? `<a href="${prev}">← Previous</a>` : "<span></span>"}
      ${next ? `<a href="${next}">Next →</a>` : "<span></span>"}
    </nav>
  </main>
  <script type="module">
    import {
      createState, renderResults, toggleType, TYPES, STATUSES, GROUPINGS,
      typeLabel, statusLabel, groupingLabel, activeCount, escapeHtml
    } from "../shared/shell.js";
    const state = createState();
    const stage = document.getElementById("stage");
    const refresh = () => renderResults(stage, state);
    const closeMenus = () => stage.querySelectorAll("[data-menu]").forEach((m) => (m.hidden = true));
    function renderActiveChips(el, soft = false) {
      const chips = [];
      if (state.grouping !== "region") chips.push({ k: "g", t: "Group · " + groupingLabel(state.grouping) });
      if (state.status !== "all") chips.push({ k: "s", t: statusLabel(state.status) });
      state.types.forEach((id) => chips.push({ k: "t:" + id, t: typeLabel(id) }));
      if (state.query.trim()) chips.push({ k: "q", t: "“" + state.query.trim() + "”" });
      el.innerHTML = chips.map((c) =>
        '<span class="chip' + (soft ? " soft" : "") + '">' + escapeHtml(c.t) +
        '<button type="button" data-x="' + c.k + '" aria-label="Remove">×</button></span>'
      ).join("");
    }
    function handleChipRemove(e) {
      const x = e.target.closest("[data-x]");
      if (!x) return false;
      const k = x.dataset.x;
      if (k === "g") state.grouping = "region";
      else if (k === "s") state.status = "all";
      else if (k === "q") { state.query = ""; const inp = stage.querySelector("[data-search]"); if (inp) inp.value = ""; }
      else if (k.startsWith("t:")) state.types = state.types.filter((id) => id !== k.slice(2));
      return true;
    }
${script}
  </script>
</body>
</html>
`;
}

const P = {};

P["01"] = {
  styles: ``,
  markup: `
      <div class="f-row">
        <label class="search-pill"><input type="search" placeholder="Search places…" data-search /></label>
        <div class="wrap" data-dd="grouping"><button type="button" class="btn" data-trigger>Group ▾</button><div class="menu" hidden data-menu></div></div>
        <div class="wrap" data-dd="status"><button type="button" class="btn" data-trigger>Status ▾</button><div class="menu" hidden data-menu></div></div>
        <div class="wrap" data-dd="type"><button type="button" class="btn" data-trigger>Type ▾</button><div class="menu" hidden data-menu></div></div>
      </div>
      <div class="chips" data-chips></div>`,
  script: `
    function paint() {
      const g = stage.querySelector('[data-dd="grouping"] [data-trigger]');
      const s = stage.querySelector('[data-dd="status"] [data-trigger]');
      const t = stage.querySelector('[data-dd="type"] [data-trigger]');
      g.textContent = "Group: " + groupingLabel(state.grouping) + " ▾";
      s.textContent = "Status: " + statusLabel(state.status) + " ▾";
      t.textContent = (state.types.length ? "Type · " + state.types.length : "Type") + " ▾";
      g.classList.toggle("is-on", state.grouping !== "region");
      s.classList.toggle("is-on", state.status !== "all");
      t.classList.toggle("is-on", !!state.types.length);
      stage.querySelector('[data-dd="grouping"] [data-menu]').innerHTML = GROUPINGS.map((x) =>
        '<button type="button" class="' + (state.grouping===x.id?"is-active":"") + '" data-set-g="' + x.id + '">' + x.label + '</button>').join("");
      stage.querySelector('[data-dd="status"] [data-menu]').innerHTML = STATUSES.map((x) =>
        '<button type="button" class="' + (state.status===x.id?"is-active":"") + '" data-set-s="' + x.id + '">' + x.label + '</button>').join("");
      stage.querySelector('[data-dd="type"] [data-menu]').innerHTML = TYPES.map((x) =>
        '<button type="button" class="' + (state.types.includes(x.id)?"is-active":"") + '" data-toggle-t="' + x.id + '"><span>' + x.label + '</span><span>' + x.count + '</span></button>').join("");
      renderActiveChips(stage.querySelector("[data-chips]"));
      refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input", (e) => { state.query = e.target.value; paint(); });
    stage.addEventListener("click", (e) => {
      if (handleChipRemove(e)) { paint(); return; }
      const trig = e.target.closest("[data-trigger]");
      if (trig) { const m = trig.closest("[data-dd]").querySelector("[data-menu]"); const open = m.hidden; closeMenus(); m.hidden = !open; return; }
      const g = e.target.closest("[data-set-g]"); if (g) { state.grouping = g.dataset.setG; closeMenus(); paint(); return; }
      const s = e.target.closest("[data-set-s]"); if (s) { state.status = s.dataset.setS; closeMenus(); paint(); return; }
      const t = e.target.closest("[data-toggle-t]"); if (t) { toggleType(state, t.dataset.toggleT); paint(); }
    });
    document.addEventListener("click", (e) => { if (!e.target.closest("[data-dd]")) closeMenus(); });
    paint();
`,
};

P["02"] = {
  styles: `.row-box{display:flex;flex-wrap:wrap;gap:.45rem;align-items:center;padding:.45rem;border:1px solid var(--line);border-radius:12px;background:#fbfaf7}
.row-box input{flex:1;min-width:140px;border:0;outline:0;background:transparent;font:inherit;font-size:.9rem;padding:.35rem .5rem}`,
  markup: `
      <div class="row-box">
        <input type="search" placeholder="Filter places…" data-search />
        <div class="wrap" data-dd="status"><button type="button" class="btn sq" data-trigger>Status</button><div class="menu" hidden data-menu></div></div>
        <div class="wrap" data-dd="type"><button type="button" class="btn sq" data-trigger>Type</button><div class="menu" hidden data-menu></div></div>
        <div class="wrap" data-dd="grouping"><button type="button" class="btn sq" data-trigger>Group by</button><div class="menu" hidden data-menu></div></div>
        <button type="button" class="btn sq ghost" data-clear hidden>Clear</button>
      </div>
      <div class="chips" data-chips></div>`,
  script: `
    function paint() {
      stage.querySelector('[data-dd="status"] [data-trigger]').classList.toggle("is-on", state.status !== "all");
      stage.querySelector('[data-dd="type"] [data-trigger]').classList.toggle("is-on", !!state.types.length);
      stage.querySelector('[data-dd="grouping"] [data-trigger]').classList.toggle("is-on", state.grouping !== "region");
      stage.querySelector("[data-clear]").hidden = activeCount(state) === 0;
      stage.querySelector('[data-dd="status"] [data-menu]').innerHTML = STATUSES.map((x)=>'<button type="button" class="'+(state.status===x.id?"is-active":"")+'" data-set-s="'+x.id+'">'+x.label+'</button>').join("");
      stage.querySelector('[data-dd="type"] [data-menu]').innerHTML = TYPES.map((x)=>'<button type="button" class="'+(state.types.includes(x.id)?"is-active":"")+'" data-toggle-t="'+x.id+'"><span>'+x.label+'</span><span>'+x.count+'</span></button>').join("");
      stage.querySelector('[data-dd="grouping"] [data-menu]').innerHTML = GROUPINGS.map((x)=>'<button type="button" class="'+(state.grouping===x.id?"is-active":"")+'" data-set-g="'+x.id+'">'+x.label+'</button>').join("");
      renderActiveChips(stage.querySelector("[data-chips]"), true);
      refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.addEventListener("click",(e)=>{
      if(e.target.closest("[data-clear]")){Object.assign(state,createState());stage.querySelector("[data-search]").value="";closeMenus();paint();return;}
      if(handleChipRemove(e)){paint();return;}
      const trig=e.target.closest("[data-trigger]");
      if(trig){const m=trig.closest("[data-dd]").querySelector("[data-menu]");const open=m.hidden;closeMenus();m.hidden=!open;return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;closeMenus();paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;closeMenus();paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    document.addEventListener("click",(e)=>{if(!e.target.closest("[data-dd]"))closeMenus();});
    paint();
`,
};

P["03"] = {
  styles: `.kbd{font-size:.72rem;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:.15rem .4rem;background:#fff;cursor:pointer}
.palette{position:fixed;inset:0;z-index:80;display:grid;place-items:start center;padding-top:12vh;background:rgb(12 15 14/.4)}
.palette[hidden]{display:none}
.box{width:min(520px,calc(100% - 2rem));background:#fff;border-radius:16px;box-shadow:0 20px 60px rgb(0 0 0/.25);overflow:hidden;border:1px solid var(--line)}
.box>input{width:100%;border:0;border-bottom:1px solid var(--line);padding:1rem 1.1rem;font:inherit;font-size:1rem;outline:0}
.plist{max-height:320px;overflow:auto;padding:.4rem}
.plist .group{padding:.55rem .75rem .25rem;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:700}
.plist button{display:flex;width:100%;justify-content:space-between;gap:1rem;border:0;background:transparent;text-align:left;padding:.65rem .75rem;border-radius:10px;font:inherit;font-size:.88rem;cursor:pointer}
.plist button:hover,.plist button.is-active{background:var(--soft)}`,
  markup: `
      <div class="f-row">
        <label class="search-pill" style="flex:1"><input type="search" placeholder="Find a place or press ⌘K to filter…" data-search /><button type="button" class="kbd" data-open-pal>⌘K</button></label>
      </div>
      <p class="hint">Open the palette to set status, type, or grouping without a chip wall.</p>
      <div class="chips" data-chips></div>
      <div class="palette" hidden data-palette>
        <div class="box" role="dialog" aria-label="Filter palette">
          <input type="search" placeholder="Filter by status, type, group…" data-pq />
          <div class="plist" data-pl></div>
        </div>
      </div>`,
  script: `
    const palette=stage.querySelector("[data-palette]"); const pq=stage.querySelector("[data-pq]"); const pl=stage.querySelector("[data-pl]");
    let items=[], activeIdx=0;
    function openPal(){palette.hidden=false;pq.value="";activeIdx=0;renderPal();pq.focus();}
    function closePal(){palette.hidden=true;}
    function build(q){
      const query=q.trim().toLowerCase(); const out=[];
      const push=(group,label,action,meta="")=>{ if(!query||label.toLowerCase().includes(query)||group.toLowerCase().includes(query)) out.push({group,label,action,meta}); };
      STATUSES.forEach(s=>push("Status",s.label,()=>{state.status=s.id;}));
      TYPES.forEach(t=>push("Type",t.label,()=>toggleType(state,t.id),String(t.count)));
      GROUPINGS.forEach(g=>push("Group by",g.label,()=>{state.grouping=g.id;}));
      push("Actions","Clear all filters",()=>Object.assign(state,createState()));
      return out;
    }
    function renderPal(){
      items=build(pq.value); let last="";
      pl.innerHTML=items.map((item,i)=>{
        const head=item.group!==last?'<div class="group">'+item.group+'</div>':""; last=item.group;
        return head+'<button type="button" class="'+(i===activeIdx?"is-active":"")+'" data-idx="'+i+'"><span>'+escapeHtml(item.label)+'</span><span>'+escapeHtml(item.meta)+'</span></button>';
      }).join("")||'<div class="group">No matches</div>';
    }
    function paint(){ renderActiveChips(stage.querySelector("[data-chips]")); refresh(); }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.querySelector("[data-open-pal]").addEventListener("click",openPal);
    stage.addEventListener("click",(e)=>{ if(handleChipRemove(e)) paint(); });
    palette.addEventListener("click",(e)=>{ if(e.target===palette) closePal(); const b=e.target.closest("[data-idx]"); if(b){items[+b.dataset.idx]?.action();closePal();paint();} });
    pq.addEventListener("input",()=>{activeIdx=0;renderPal();});
    pq.addEventListener("keydown",(e)=>{
      if(e.key==="ArrowDown"){e.preventDefault();activeIdx=Math.min(items.length-1,activeIdx+1);renderPal();}
      if(e.key==="ArrowUp"){e.preventDefault();activeIdx=Math.max(0,activeIdx-1);renderPal();}
      if(e.key==="Enter"&&items[activeIdx]){items[activeIdx].action();closePal();paint();}
      if(e.key==="Escape") closePal();
    });
    document.addEventListener("keydown",(e)=>{
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openPal();}
      if(e.key==="Escape"&&!palette.hidden) closePal();
    });
    paint();
`,
};

P["04"] = {
  styles: `.badge{min-width:1.2rem;height:1.2rem;border-radius:999px;background:#fff;color:var(--accent);font-size:.7rem;display:grid;place-items:center;font-weight:700}
.drawer{position:fixed;top:0;right:0;bottom:0;width:min(360px,92vw);z-index:80;background:#fff;border-left:1px solid var(--line);box-shadow:-20px 0 50px rgb(0 0 0/.12);display:flex;flex-direction:column}
.drawer[hidden]{display:none}
.drawer header{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.1rem;border-bottom:1px solid var(--line)}
.drawer header h2{margin:0;font-size:1rem}
.drawer header button{border:0;background:transparent;font-size:1.2rem;cursor:pointer;color:var(--muted)}
.drawer .body{flex:1;overflow:auto;padding:1rem 1.1rem}
.section{margin-bottom:1.25rem}
.section h3{margin:0 0 .5rem;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.opt{border:1px solid var(--line)!important;border-radius:10px;margin-bottom:.35rem;padding:.55rem .7rem}
.drawer footer{padding:.85rem 1.1rem;border-top:1px solid var(--line);display:flex;gap:.5rem}
.drawer footer button{flex:1;border-radius:10px;padding:.65rem;font:inherit;font-weight:700;cursor:pointer}
.drawer footer .clear{border:1px solid var(--line);background:#fff}
.drawer footer .done{border:0;background:var(--accent);color:var(--accent-ink)}`,
  markup: `
      <div class="f-row">
        <label class="search-pill"><input type="search" placeholder="Find a place…" data-search /></label>
        <button type="button" class="btn solid" data-open>Filters <span class="badge" data-badge>0</span></button>
      </div>
      <div class="chips" data-chips></div>
      <div class="overlay" hidden data-bg></div>
      <aside class="drawer" hidden data-drawer>
        <header><h2>Filters</h2><button type="button" data-close aria-label="Close">×</button></header>
        <div class="body" data-body></div>
        <footer><button type="button" class="clear" data-clear>Clear</button><button type="button" class="done" data-close>Done</button></footer>
      </aside>`,
  script: `
    const drawer=stage.querySelector("[data-drawer]"); const bg=stage.querySelector("[data-bg]");
    function open(){drawer.hidden=false;bg.hidden=false;paintDrawer();}
    function close(){drawer.hidden=true;bg.hidden=true;}
    function paintDrawer(){
      stage.querySelector("[data-body]").innerHTML =
        '<div class="section"><h3>Group by</h3>'+GROUPINGS.map(g=>'<button type="button" class="opt '+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("")+'</div>'+
        '<div class="section"><h3>Status</h3>'+STATUSES.map(s=>'<button type="button" class="opt '+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("")+'</div>'+
        '<div class="section"><h3>Type</h3>'+TYPES.map(t=>'<button type="button" class="opt '+(state.types.includes(t.id)?"is-active":"")+'" data-toggle-t="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>').join("")+'</div>';
    }
    function paint(){ stage.querySelector("[data-badge]").textContent=String(activeCount(state)); renderActiveChips(stage.querySelector("[data-chips]"),true); refresh(); }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.querySelector("[data-open]").addEventListener("click",open);
    bg.addEventListener("click",close);
    stage.addEventListener("click",(e)=>{
      if(e.target.closest("[data-close]")) close();
      if(e.target.closest("[data-clear]")){Object.assign(state,createState());stage.querySelector("[data-search]").value="";paintDrawer();paint();}
      if(handleChipRemove(e)) paint();
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paintDrawer();paint();}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paintDrawer();paint();}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paintDrawer();paint();}
    });
    paint();
`,
};

// Continue writing remaining patterns in this same object via a second file append approach -
// Actually keep going in this write.

P["05"] = {
  styles: `.sheet{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(520px,100%);z-index:80;background:#fff;border-radius:20px 20px 0 0;box-shadow:0 -20px 50px rgb(0 0 0/.18);max-height:80vh;display:flex;flex-direction:column}
.sheet[hidden]{display:none}
.sheet .grab{width:40px;height:4px;border-radius:999px;background:#ddd;margin:.7rem auto .2rem}
.sheet header{padding:.5rem 1.1rem .8rem;display:flex;justify-content:space-between;align-items:center}
.sheet header h2{margin:0;font-size:1.05rem}
.sheet .body{overflow:auto;padding:0 1.1rem 1rem}
.sheet footer{padding:.85rem 1.1rem 1.1rem;border-top:1px solid var(--line)}
.sheet footer button{width:100%;border:0;border-radius:12px;padding:.85rem;background:var(--accent);color:var(--accent-ink);font:inherit;font-weight:700;cursor:pointer}
.section{margin-bottom:1rem}
.section h3{margin:0 0 .45rem;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.opt{border:1px solid var(--line)!important;border-radius:10px;margin-bottom:.35rem}`,
  markup: `
      <div class="f-row">
        <label class="search-pill"><input type="search" placeholder="Find a place…" data-search /></label>
        <button type="button" class="btn solid" data-open>Refine</button>
      </div>
      <div class="chips" data-chips></div>
      <div class="overlay" hidden data-bg></div>
      <div class="sheet" hidden data-sheet role="dialog" aria-label="Refine">
        <div class="grab"></div>
        <header><h2>Refine</h2><button type="button" class="btn ghost" data-clear>Reset</button></header>
        <div class="body" data-body></div>
        <footer><button type="button" data-apply>Show results</button></footer>
      </div>`,
  script: `
    const sheet=stage.querySelector("[data-sheet]"); const bg=stage.querySelector("[data-bg]");
    const draft=()=>({grouping:state.grouping,status:state.status,types:[...state.types]});
    let d=draft();
    function open(){d=draft();sheet.hidden=false;bg.hidden=false;paintSheet();}
    function close(){sheet.hidden=true;bg.hidden=true;}
    function paintSheet(){
      const countPlaceholder = "Apply";
      stage.querySelector("[data-body]").innerHTML=
        '<div class="section"><h3>Group by</h3>'+GROUPINGS.map(g=>'<button type="button" class="opt '+(d.grouping===g.id?"is-active":"")+'" data-dg="'+g.id+'">'+g.label+'</button>').join("")+'</div>'+
        '<div class="section"><h3>Status</h3>'+STATUSES.map(s=>'<button type="button" class="opt '+(d.status===s.id?"is-active":"")+'" data-ds="'+s.id+'">'+s.label+'</button>').join("")+'</div>'+
        '<div class="section"><h3>Type</h3>'+TYPES.map(t=>'<button type="button" class="opt '+(d.types.includes(t.id)?"is-active":"")+'" data-dt="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>').join("")+'</div>';
      stage.querySelector("[data-apply]").textContent="Show filtered places";
    }
    function paint(){renderActiveChips(stage.querySelector("[data-chips]"),true);refresh();}
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.querySelector("[data-open]").addEventListener("click",open);
    bg.addEventListener("click",close);
    stage.addEventListener("click",(e)=>{
      if(handleChipRemove(e)) paint();
      if(e.target.closest("[data-clear]")){d={grouping:"region",status:"all",types:[]};paintSheet();}
      if(e.target.closest("[data-apply]")){state.grouping=d.grouping;state.status=d.status;state.types=[...d.types];close();paint();}
      const g=e.target.closest("[data-dg]"); if(g){d.grouping=g.dataset.dg;paintSheet();}
      const s=e.target.closest("[data-ds]"); if(s){d.status=s.dataset.ds;paintSheet();}
      const t=e.target.closest("[data-dt]"); if(t){ const id=t.dataset.dt; d.types=d.types.includes(id)?d.types.filter(x=>x!==id):[...d.types,id]; paintSheet(); }
    });
    paint();
`,
};

P["06"] = {
  styles: `.layout{display:grid;grid-template-columns:220px 1fr;gap:1.25rem}
@media(max-width:760px){.layout{grid-template-columns:1fr}}
.side{border-right:1px solid var(--line);padding-right:1rem}
@media(max-width:760px){.side{border:0;padding:0}}
.acc{border-bottom:1px solid var(--line)}
.acc summary{list-style:none;cursor:pointer;padding:.7rem 0;font-size:.78rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);display:flex;justify-content:space-between}
.acc summary::-webkit-details-marker{display:none}
.acc[open] summary{color:var(--ink)}
.acc .opts{padding:0 0 .75rem}
.main-search{margin-bottom:.75rem}`,
  markup: `
      <div class="layout">
        <aside class="side" data-side></aside>
        <div>
          <label class="search-pill main-search"><input type="search" placeholder="Search in results…" data-search /></label>
          <div class="chips" data-chips></div>
          <div data-main-slot></div>
        </div>
      </div>`,
  script: `
    // Move results under main column
    const mainSlot=stage.querySelector("[data-main-slot]");
    const results=stage.querySelector(".demo-results");
    mainSlot.appendChild(results);
    function paintSide(){
      stage.querySelector("[data-side]").innerHTML=
        '<details class="acc" open><summary>Group by</summary><div class="opts">'+GROUPINGS.map(g=>'<button type="button" class="opt '+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("")+'</div></details>'+
        '<details class="acc" open><summary>Status</summary><div class="opts">'+STATUSES.map(s=>'<button type="button" class="opt '+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("")+'</div></details>'+
        '<details class="acc"><summary>Type <span>'+(state.types.length||"")+'</span></summary><div class="opts">'+TYPES.map(t=>'<button type="button" class="opt '+(state.types.includes(t.id)?"is-active":"")+'" data-toggle-t="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>').join("")+'</div></details>';
    }
    function paint(){paintSide();renderActiveChips(stage.querySelector("[data-chips]"),true);refresh();}
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.addEventListener("click",(e)=>{
      if(handleChipRemove(e)){paint();return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    paint();
`,
};

P["07"] = {
  styles: `.type-search{width:100%;border:0;border-bottom:1px solid var(--line);padding:.5rem .65rem;font:inherit;font-size:.8rem;outline:0;margin-bottom:.25rem}`,
  markup: `
      <div class="f-row">
        <label class="search-pill"><input type="search" placeholder="Find a place…" data-search /></label>
        <div class="seg" role="group" aria-label="Status" data-status-seg></div>
        <div class="wrap" data-dd="grouping"><button type="button" class="btn" data-trigger>Group ▾</button><div class="menu" hidden data-menu></div></div>
        <div class="wrap" data-dd="type"><button type="button" class="btn" data-trigger>Type ▾</button><div class="menu" hidden data-menu style="min-width:240px"></div></div>
      </div>
      <div class="chips" data-chips></div>`,
  script: `
    let typeQ="";
    function paint(){
      stage.querySelector("[data-status-seg]").innerHTML=STATUSES.map(s=>'<button type="button" class="'+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("");
      const gTrig=stage.querySelector('[data-dd="grouping"] [data-trigger]');
      gTrig.textContent="Group: "+groupingLabel(state.grouping)+" ▾";
      gTrig.classList.toggle("is-on", state.grouping!=="region");
      const tTrig=stage.querySelector('[data-dd="type"] [data-trigger]');
      tTrig.textContent=(state.types.length?"Type · "+state.types.length:"Type")+" ▾";
      tTrig.classList.toggle("is-on", !!state.types.length);
      stage.querySelector('[data-dd="grouping"] [data-menu]').innerHTML=GROUPINGS.map(g=>'<button type="button" class="'+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("");
      const filtered=TYPES.filter(t=>!typeQ||t.label.toLowerCase().includes(typeQ.toLowerCase()));
      stage.querySelector('[data-dd="type"] [data-menu]').innerHTML=
        '<input class="type-search" placeholder="Filter types…" data-type-q value="'+escapeHtml(typeQ)+'" />'+
        filtered.map(t=>'<button type="button" class="'+(state.types.includes(t.id)?"is-active":"")+'" data-toggle-t="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>').join("");
      renderActiveChips(stage.querySelector("[data-chips]"),true); refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.addEventListener("input",(e)=>{ if(e.target.matches("[data-type-q]")){ typeQ=e.target.value; paint(); stage.querySelector("[data-type-q]")?.focus(); }});
    stage.addEventListener("click",(e)=>{
      if(handleChipRemove(e)){paint();return;}
      const trig=e.target.closest("[data-trigger]");
      if(trig){const m=trig.closest("[data-dd]").querySelector("[data-menu]");const open=m.hidden;closeMenus();m.hidden=!open;return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;closeMenus();paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    document.addEventListener("click",(e)=>{if(!e.target.closest("[data-dd]"))closeMenus();});
    paint();
`,
};

P["08"] = {
  styles: `.scroller{display:flex;gap:.4rem;overflow-x:auto;padding-bottom:.25rem;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.scroller::-webkit-scrollbar{height:4px}
.scroller .btn{flex:0 0 auto;white-space:nowrap}
.scroller .btn .n{opacity:.55;margin-left:.3rem;font-weight:500}`,
  markup: `
      <div class="f-row" style="margin-bottom:.65rem">
        <label class="search-pill"><input type="search" placeholder="Search…" data-search /></label>
        <div class="seg" data-status-seg></div>
        <div class="seg" data-group-seg></div>
      </div>
      <div class="scroller" data-types></div>
      <div class="chips" data-chips></div>`,
  script: `
    function paint(){
      stage.querySelector("[data-status-seg]").innerHTML=STATUSES.map(s=>'<button type="button" class="'+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("");
      stage.querySelector("[data-group-seg]").innerHTML=GROUPINGS.map(g=>'<button type="button" class="'+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("");
      stage.querySelector("[data-types]").innerHTML=
        '<button type="button" class="btn '+(state.types.length===0?"is-on":"")+'" data-type-all>All</button>'+
        TYPES.map(t=>'<button type="button" class="btn '+(state.types.includes(t.id)?"is-on":"")+'" data-toggle-t="'+t.id+'">'+t.label+'<span class="n">'+t.count+'</span></button>').join("");
      renderActiveChips(stage.querySelector("[data-chips]"),true); refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.addEventListener("click",(e)=>{
      if(handleChipRemove(e)){paint();return;}
      if(e.target.closest("[data-type-all]")){state.types=[];paint();return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    paint();
`,
};

P["09"] = {
  styles: `.rules{display:flex;flex-direction:column;gap:.45rem}
.rule{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;padding:.55rem .65rem;border:1px dashed var(--line);border-radius:10px;background:#fbfaf7}
.rule select,.rule input{border:1px solid var(--line);border-radius:8px;padding:.4rem .55rem;font:inherit;font-size:.8rem;background:#fff}
.rule .is{color:var(--muted);font-size:.78rem}
.rule button.x{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:1rem}`,
  markup: `
      <div class="f-row" style="margin-bottom:.75rem">
        <label class="search-pill"><input type="search" placeholder="Search places…" data-search /></label>
        <button type="button" class="btn ghost" data-add>+ Add filter</button>
      </div>
      <div class="rules" data-rules></div>`,
  script: `
    // Represent filters as rule rows; sync to state
    let rules = [];
    function syncFromRules(){
      state.status="all"; state.types=[]; state.grouping="region";
      rules.forEach(r=>{
        if(r.field==="status") state.status=r.value||"all";
        if(r.field==="type" && r.value) { if(!state.types.includes(r.value)) state.types.push(r.value); }
        if(r.field==="grouping") state.grouping=r.value||"region";
      });
    }
    function paint(){
      syncFromRules();
      stage.querySelector("[data-rules]").innerHTML = rules.length ? rules.map((r,i)=>\`
        <div class="rule" data-i="\${i}">
          <select data-field>
            <option value="status" \${r.field==="status"?"selected":""}>Status</option>
            <option value="type" \${r.field==="type"?"selected":""}>Type</option>
            <option value="grouping" \${r.field==="grouping"?"selected":""}>Group by</option>
          </select>
          <span class="is">is</span>
          <select data-value>\${valueOptions(r)}</select>
          <button type="button" class="x" data-del aria-label="Remove">×</button>
        </div>\`).join("") : '<p class="hint" style="margin:0">No filters yet — add a rule to narrow the atlas.</p>';
      refresh();
    }
    function valueOptions(r){
      const list = r.field==="status" ? STATUSES : r.field==="grouping" ? GROUPINGS : TYPES.map(t=>({id:t.id,label:t.label}));
      return list.map(x=>'<option value="'+x.id+'" '+(r.value===x.id?"selected":"")+'>'+x.label+'</option>').join("");
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;refresh();});
    stage.querySelector("[data-add]").addEventListener("click",()=>{ rules.push({field:"status",value:"visited"}); paint(); });
    stage.addEventListener("change",(e)=>{
      const rule=e.target.closest(".rule"); if(!rule) return;
      const i=+rule.dataset.i;
      if(e.target.matches("[data-field]")){ rules[i].field=e.target.value; rules[i].value = rules[i].field==="status"?"visited":rules[i].field==="grouping"?"type":TYPES[0].id; }
      if(e.target.matches("[data-value]")) rules[i].value=e.target.value;
      paint();
    });
    stage.addEventListener("click",(e)=>{
      const del=e.target.closest("[data-del]"); if(!del) return;
      const i=+del.closest(".rule").dataset.i; rules.splice(i,1); paint();
    });
    paint();
`,
};

P["10"] = {
  styles: `.picker{position:absolute;top:calc(100% + 6px);left:0;z-index:40;width:220px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:.35rem}
.picker[hidden]{display:none}
.picker button{display:block;width:100%;text-align:left;border:0;background:transparent;padding:.5rem .65rem;border-radius:8px;font:inherit;font-size:.82rem;cursor:pointer}
.picker button:hover{background:var(--soft)}`,
  markup: `
      <div class="f-row">
        <label class="search-pill"><input type="search" placeholder="Search…" data-search /></label>
        <div class="chips" data-chips style="margin:0"></div>
        <div class="wrap">
          <button type="button" class="btn ghost" data-add>+ Add filter</button>
          <div class="picker" hidden data-picker></div>
        </div>
      </div>
      <p class="hint">Start empty. Only chosen filters appear as chips.</p>`,
  script: `
    const picker=stage.querySelector("[data-picker]");
    let step="dim"; // dim | status | type | grouping
    function paintPicker(){
      if(step==="dim"){
        picker.innerHTML='<button type="button" data-dim="status">Status</button><button type="button" data-dim="type">Type</button><button type="button" data-dim="grouping">Group by</button>';
      } else if(step==="status"){
        picker.innerHTML=STATUSES.filter(s=>s.id!=="all").map(s=>'<button type="button" data-set-s="'+s.id+'">'+s.label+'</button>').join("");
      } else if(step==="type"){
        picker.innerHTML=TYPES.map(t=>'<button type="button" data-toggle-t="'+t.id+'">'+t.label+'</button>').join("");
      } else {
        picker.innerHTML=GROUPINGS.map(g=>'<button type="button" data-set-g="'+g.id+'">'+g.label+'</button>').join("");
      }
    }
    function paint(){ renderActiveChips(stage.querySelector("[data-chips]")); refresh(); }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.querySelector("[data-add]").addEventListener("click",(e)=>{e.stopPropagation();step="dim";picker.hidden=false;paintPicker();});
    stage.addEventListener("click",(e)=>{
      if(handleChipRemove(e)){paint();return;}
      const dim=e.target.closest("[data-dim]"); if(dim){step=dim.dataset.dim;paintPicker();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;picker.hidden=true;paint();return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;picker.hidden=true;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);picker.hidden=true;paint();}
    });
    document.addEventListener("click",(e)=>{ if(!e.target.closest(".wrap")) picker.hidden=true; });
    paint();
`,
};

P["11"] = {
  styles: `.type-row{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}`,
  markup: `
      <div class="f-row" style="margin-bottom:.65rem">
        <label class="search-pill"><input type="search" placeholder="Find a place…" data-search /></label>
        <div class="seg" data-status-seg></div>
        <div class="seg" data-group-seg></div>
      </div>
      <div class="type-row" data-types></div>
      <div class="chips" data-chips></div>`,
  script: `
    let expanded=false;
    const TOP=5;
    function paint(){
      stage.querySelector("[data-status-seg]").innerHTML=STATUSES.map(s=>'<button type="button" class="'+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("");
      stage.querySelector("[data-group-seg]").innerHTML=GROUPINGS.map(g=>'<button type="button" class="'+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("");
      const shown = expanded ? TYPES : TYPES.slice(0, TOP);
      const rest = TYPES.length - TOP;
      stage.querySelector("[data-types]").innerHTML =
        '<button type="button" class="btn '+(state.types.length===0?"is-on":"")+'" data-type-all>All types</button>'+
        shown.map(t=>'<button type="button" class="btn '+(state.types.includes(t.id)?"is-on":"")+'" data-toggle-t="'+t.id+'">'+t.label+' <span style="opacity:.55">'+t.count+'</span></button>').join("")+
        (!expanded && rest>0 ? '<button type="button" class="btn ghost" data-more>+'+rest+' more</button>' : '')+
        (expanded ? '<button type="button" class="btn ghost" data-less>Show less</button>' : '');
      renderActiveChips(stage.querySelector("[data-chips]"),true); refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.addEventListener("click",(e)=>{
      if(handleChipRemove(e)){paint();return;}
      if(e.target.closest("[data-more]")){expanded=true;paint();return;}
      if(e.target.closest("[data-less]")){expanded=false;paint();return;}
      if(e.target.closest("[data-type-all]")){state.types=[];paint();return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    paint();
`,
};

P["12"] = {
  styles: `.combo-panel{position:absolute;top:calc(100% + 6px);left:0;z-index:40;width:260px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);overflow:hidden}
.combo-panel[hidden]{display:none}
.combo-panel input{width:100%;border:0;border-bottom:1px solid var(--line);padding:.55rem .7rem;font:inherit;font-size:.82rem;outline:0}
.combo-list{max-height:240px;overflow:auto;padding:.3rem}`,
  markup: `
      <div class="f-row">
        <label class="search-pill"><input type="search" placeholder="Find a place…" data-search /></label>
        <div class="seg" data-status-seg></div>
        <div class="seg" data-group-seg></div>
        <div class="wrap">
          <button type="button" class="btn" data-combo-open>Type ▾</button>
          <div class="combo-panel" hidden data-combo>
            <input type="search" placeholder="Search types…" data-combo-q />
            <div class="combo-list" data-combo-list></div>
          </div>
        </div>
      </div>
      <div class="chips" data-chips></div>`,
  script: `
    const combo=stage.querySelector("[data-combo]"); let cq="";
    function paintCombo(){
      const list=TYPES.filter(t=>!cq||t.label.toLowerCase().includes(cq.toLowerCase()));
      stage.querySelector("[data-combo-list]").innerHTML=list.map(t=>
        '<button type="button" class="opt '+(state.types.includes(t.id)?"is-active":"")+'" data-toggle-t="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>'
      ).join("")||'<p class="hint" style="padding:.5rem">No types</p>';
    }
    function paint(){
      stage.querySelector("[data-status-seg]").innerHTML=STATUSES.map(s=>'<button type="button" class="'+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("");
      stage.querySelector("[data-group-seg]").innerHTML=GROUPINGS.map(g=>'<button type="button" class="'+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("");
      const openBtn=stage.querySelector("[data-combo-open]");
      openBtn.textContent=(state.types.length?"Type · "+state.types.length:"All types")+" ▾";
      openBtn.classList.toggle("is-on", !!state.types.length);
      paintCombo(); renderActiveChips(stage.querySelector("[data-chips]"),true); refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.querySelector("[data-combo-q]").addEventListener("input",(e)=>{cq=e.target.value;paintCombo();});
    stage.querySelector("[data-combo-open]").addEventListener("click",(e)=>{e.stopPropagation();combo.hidden=!combo.hidden; if(!combo.hidden) stage.querySelector("[data-combo-q]").focus();});
    stage.addEventListener("click",(e)=>{
      if(handleChipRemove(e)){paint();return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    document.addEventListener("click",(e)=>{ if(!e.target.closest(".wrap")) combo.hidden=true; });
    paint();
`,
};

P["13"] = {
  styles: `.icons{display:flex;flex-wrap:wrap;gap:.35rem}
.icon-btn{width:42px;height:42px;border:1px solid var(--line);border-radius:12px;background:#fff;cursor:pointer;font-size:1.05rem;display:grid;place-items:center;position:relative}
.icon-btn.is-on{border-color:var(--accent);background:var(--soft)}
.icon-btn:hover::after,.icon-btn:focus-visible::after{
  content:attr(data-tip); position:absolute; bottom:calc(100% + 6px); left:50%; transform:translateX(-50%);
  background:var(--ink); color:#fff; font-size:.68rem; padding:.25rem .45rem; border-radius:6px; white-space:nowrap; font-family:var(--sans);
}`,
  markup: `
      <div class="f-row" style="margin-bottom:.75rem">
        <label class="search-pill"><input type="search" placeholder="Find a place…" data-search /></label>
        <div class="seg" data-status-seg></div>
        <div class="seg" data-group-seg></div>
      </div>
      <div class="icons" data-icons></div>
      <div class="chips" data-chips></div>`,
  script: `
    const ICONS={restaurant:"🍽",other:"•",landmark:"🏛",cafe:"☕",hotel:"🛏",park:"🌳",viewpoint:"👁",hike:"🥾",lake:"💧",city:"🏙",waterfall:"💦",beach:"🏖",market:"🧺"};
    function paint(){
      stage.querySelector("[data-status-seg]").innerHTML=STATUSES.map(s=>'<button type="button" class="'+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("");
      stage.querySelector("[data-group-seg]").innerHTML=GROUPINGS.map(g=>'<button type="button" class="'+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("");
      stage.querySelector("[data-icons]").innerHTML=TYPES.map(t=>
        '<button type="button" class="icon-btn '+(state.types.includes(t.id)?"is-on":"")+'" data-toggle-t="'+t.id+'" data-tip="'+escapeHtml(t.label)+' · '+t.count+'" aria-label="'+escapeHtml(t.label)+'">'+(ICONS[t.id]||"•")+'</button>'
      ).join("");
      renderActiveChips(stage.querySelector("[data-chips]"),true); refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.addEventListener("click",(e)=>{
      if(handleChipRemove(e)){paint();return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    paint();
`,
};

P["14"] = {
  styles: `.tabs{display:flex;gap:1rem;border-bottom:1px solid var(--line);margin-bottom:.9rem}
.tabs button{border:0;background:transparent;padding:.55rem 0;font:inherit;font-size:.9rem;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px}
.tabs button.is-active{color:var(--ink);border-bottom-color:var(--accent)}
.panel{position:absolute;top:calc(100% + 8px);right:0;z-index:40;width:min(320px,90vw);background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:.85rem}
.panel[hidden]{display:none}
.panel h3{margin:0 0 .4rem;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.panel .block{margin-bottom:.85rem}`,
  markup: `
      <div class="tabs" data-tabs></div>
      <div class="f-row">
        <label class="search-pill"><input type="search" placeholder="Search…" data-search /></label>
        <div class="wrap" style="margin-left:auto">
          <button type="button" class="btn" data-filters>Filters</button>
          <div class="panel" hidden data-panel></div>
        </div>
      </div>
      <div class="chips" data-chips></div>`,
  script: `
    const panel=stage.querySelector("[data-panel]");
    function paintPanel(){
      panel.innerHTML=
        '<div class="block"><h3>Group by</h3>'+GROUPINGS.map(g=>'<button type="button" class="opt '+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("")+'</div>'+
        '<div class="block"><h3>Type</h3>'+TYPES.map(t=>'<button type="button" class="opt '+(state.types.includes(t.id)?"is-active":"")+'" data-toggle-t="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>').join("")+'</div>';
    }
    function paint(){
      stage.querySelector("[data-tabs]").innerHTML=STATUSES.map(s=>'<button type="button" class="'+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("");
      stage.querySelector("[data-filters]").classList.toggle("is-on", state.grouping!=="region"||state.types.length>0);
      paintPanel(); renderActiveChips(stage.querySelector("[data-chips]"),true); refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.querySelector("[data-filters]").addEventListener("click",(e)=>{e.stopPropagation();panel.hidden=!panel.hidden;});
    stage.addEventListener("click",(e)=>{
      if(handleChipRemove(e)){paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paint();return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    document.addEventListener("click",(e)=>{ if(!e.target.closest(".wrap")) panel.hidden=true; });
    paint();
`,
};

P["15"] = {
  styles: `.token-field{display:flex;flex-wrap:wrap;gap:.35rem;align-items:center;border:1px solid var(--line);border-radius:12px;padding:.45rem .6rem;background:#fbfaf7;min-height:46px}
.token-field input{border:0;outline:0;background:transparent;flex:1;min-width:120px;font:inherit;font-size:.9rem}
.suggest{margin-top:.45rem;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:var(--shadow);overflow:hidden}
.suggest[hidden]{display:none}
.suggest button{display:flex;width:100%;justify-content:space-between;border:0;background:transparent;padding:.55rem .75rem;font:inherit;font-size:.82rem;cursor:pointer;text-align:left}
.suggest button:hover{background:var(--soft)}`,
  markup: `
      <div class="token-field" data-field>
        <span data-tokens></span>
        <input type="search" placeholder="Search or type status: / type:" data-search />
      </div>
      <div class="suggest" hidden data-suggest></div>
      <p class="hint">Try <strong>type:cafe</strong> or pick a suggestion. Tokens live inside the field.</p>
      <div class="f-row" style="margin-top:.75rem">
        <div class="seg" data-group-seg></div>
      </div>`,
  script: `
    const suggest=stage.querySelector("[data-suggest]");
    function paintTokens(){
      const parts=[];
      if(state.status!=="all") parts.push({k:"s",t:"status:"+statusLabel(state.status)});
      state.types.forEach(id=>parts.push({k:"t:"+id,t:"type:"+typeLabel(id)}));
      stage.querySelector("[data-tokens]").innerHTML=parts.map(p=>
        '<span class="chip soft">'+escapeHtml(p.t)+'<button type="button" data-x="'+p.k+'">×</button></span>'
      ).join("");
    }
    function paintSuggest(q){
      const query=q.trim().toLowerCase();
      if(!query){suggest.hidden=true;return;}
      const items=[];
      STATUSES.filter(s=>s.id!=="all"&&s.label.toLowerCase().includes(query.replace(/^status:/,""))).forEach(s=>items.push({label:"status:"+s.label,run:()=>{state.status=s.id;}}));
      TYPES.filter(t=>t.label.toLowerCase().includes(query.replace(/^type:/,""))||("type:"+t.id).includes(query)).forEach(t=>items.push({label:"type:"+t.label,run:()=>toggleType(state,t.id)}));
      if(!items.length){suggest.hidden=true;return;}
      suggest.hidden=false;
      suggest.innerHTML=items.slice(0,8).map((it,i)=>'<button type="button" data-sug="'+i+'"><span>'+escapeHtml(it.label)+'</span><span>Add</span></button>').join("");
      suggest._items=items;
    }
    function paint(){
      paintTokens();
      stage.querySelector("[data-group-seg]").innerHTML=GROUPINGS.map(g=>'<button type="button" class="'+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("");
      refresh();
    }
    const input=stage.querySelector("[data-search]");
    input.addEventListener("input",(e)=>{
      const v=e.target.value;
      state.query = /^(type|status):/i.test(v) ? "" : v;
      paintSuggest(v); paint();
    });
    input.addEventListener("keydown",(e)=>{
      if(e.key==="Enter"){
        const v=input.value.trim();
        const typeHit=TYPES.find(t=>v.toLowerCase()==="type:"+t.id || v.toLowerCase()==="type:"+t.label.toLowerCase());
        const statusHit=STATUSES.find(s=>v.toLowerCase()==="status:"+s.id || v.toLowerCase()==="status:"+s.label.toLowerCase());
        if(typeHit){toggleType(state,typeHit.id); input.value=""; state.query=""; suggest.hidden=true; paint(); e.preventDefault();}
        if(statusHit){state.status=statusHit.id; input.value=""; state.query=""; suggest.hidden=true; paint(); e.preventDefault();}
      }
    });
    suggest.addEventListener("click",(e)=>{
      const b=e.target.closest("[data-sug]"); if(!b) return;
      suggest._items[+b.dataset.sug]?.run(); input.value=""; state.query=""; suggest.hidden=true; paint();
    });
    stage.addEventListener("click",(e)=>{
      if(handleChipRemove(e)){paint();return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paint();}
    });
    paint();
`,
};

P["16"] = {
  styles: `.mega{position:absolute;top:calc(100% + 8px);right:0;z-index:40;width:min(560px,94vw);background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:1rem;display:grid;grid-template-columns:1fr 1.4fr;gap:1rem}
.mega[hidden]{display:none}
@media(max-width:640px){.mega{grid-template-columns:1fr}}
.mega h3{margin:0 0 .45rem;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.summary{margin-top:.65rem;font-size:.82rem;color:var(--muted)}
.summary strong{color:var(--ink);font-weight:600}`,
  markup: `
      <div class="f-row">
        <label class="search-pill"><input type="search" placeholder="Search places…" data-search /></label>
        <div class="wrap" style="margin-left:auto">
          <button type="button" class="btn solid" data-open>Refine</button>
          <div class="mega" hidden data-mega></div>
        </div>
      </div>
      <p class="summary" data-summary></p>`,
  script: `
    const mega=stage.querySelector("[data-mega]");
    function paintMega(){
      mega.innerHTML=
        '<div><h3>Group by</h3>'+GROUPINGS.map(g=>'<button type="button" class="opt '+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("")+
        '<h3 style="margin-top:.85rem">Status</h3>'+STATUSES.map(s=>'<button type="button" class="opt '+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("")+'</div>'+
        '<div><h3>Type</h3><div style="max-height:280px;overflow:auto">'+TYPES.map(t=>'<button type="button" class="opt '+(state.types.includes(t.id)?"is-active":"")+'" data-toggle-t="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>').join("")+'</div></div>';
    }
    function paint(){
      paintMega();
      const bits=[];
      bits.push(statusLabel(state.status));
      bits.push("grouped by "+groupingLabel(state.grouping));
      bits.push(state.types.length ? state.types.map(typeLabel).join(", ") : "all types");
      stage.querySelector("[data-summary]").innerHTML="Showing <strong>"+escapeHtml(bits.join(" · "))+"</strong>";
      stage.querySelector("[data-open]").classList.toggle("is-on", activeCount(state)>0);
      refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.querySelector("[data-open]").addEventListener("click",(e)=>{e.stopPropagation();mega.hidden=!mega.hidden;});
    stage.addEventListener("click",(e)=>{
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    document.addEventListener("click",(e)=>{ if(!e.target.closest(".wrap")) mega.hidden=true; });
    paint();
`,
};

P["17"] = {
  styles: `.sentence{font-family:var(--serif);font-size:clamp(1.25rem,2.5vw,1.65rem);line-height:1.45;color:var(--ink)}
.sentence button{
  border:0;background:transparent;font:inherit;color:var(--accent);text-decoration:underline;
  text-decoration-style:dotted;text-underline-offset:4px;cursor:pointer;padding:0;
}
.sentence button:hover{text-decoration-style:solid}
.pop{position:absolute;z-index:40;margin-top:.35rem;min-width:180px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:.35rem}
.pop[hidden]{display:none}`,
  markup: `
      <div class="sentence" data-sentence></div>
      <div class="f-row" style="margin-top:1rem">
        <label class="search-pill"><input type="search" placeholder="Or search by name…" data-search /></label>
      </div>`,
  script: `
    let openKey=null;
    function paint(){
      const typeText = state.types.length===0 ? "all types" : state.types.length===1 ? typeLabel(state.types[0]) : state.types.length+" types";
      stage.querySelector("[data-sentence]").innerHTML =
        'Showing <span class="wrap"><button type="button" data-open="status">'+escapeHtml(statusLabel(state.status).toLowerCase())+'</button>'+
        (openKey==="status"?'<div class="pop">'+STATUSES.map(s=>'<button type="button" class="opt '+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("")+'</div>':'')+
        '</span> · grouped by <span class="wrap"><button type="button" data-open="grouping">'+escapeHtml(groupingLabel(state.grouping))+'</button>'+
        (openKey==="grouping"?'<div class="pop">'+GROUPINGS.map(g=>'<button type="button" class="opt '+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("")+'</div>':'')+
        '</span> · <span class="wrap"><button type="button" data-open="type">'+escapeHtml(typeText)+'</button>'+
        (openKey==="type"?'<div class="pop" style="max-height:240px;overflow:auto">'+TYPES.map(t=>'<button type="button" class="opt '+(state.types.includes(t.id)?"is-active":"")+'" data-toggle-t="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>').join("")+'</div>':'')+
        '</span>';
      refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;refresh();});
    stage.addEventListener("click",(e)=>{
      const open=e.target.closest("[data-open]");
      if(open){e.stopPropagation(); openKey = openKey===open.dataset.open ? null : open.dataset.open; paint(); return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;openKey=null;paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;openKey=null;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    document.addEventListener("click",(e)=>{ if(!e.target.closest("[data-sentence]")){ openKey=null; paint(); }});
    paint();
`,
};

P["18"] = {
  styles: `.rail-layout{display:flex;gap:0;min-height:320px;align-items:stretch}
.rail{display:flex;flex-direction:column;gap:.35rem;padding:.25rem .25rem .25rem 0;border-right:1px solid var(--line);flex:0 0 52px}
.rail button{width:40px;height:40px;border:1px solid transparent;border-radius:10px;background:transparent;cursor:pointer;font-size:.95rem;color:var(--muted)}
.rail button.is-on,.rail button:hover{background:var(--soft);color:var(--accent);border-color:var(--line)}
.rail-panel{border-right:1px solid var(--line);padding:0 1rem 0 .75rem;width:220px;flex:0 0 220px}
.rail-panel[hidden]{display:none}
.rail-main{padding-left:1rem;flex:1;min-width:0}
@media(max-width:700px){.rail-layout{flex-direction:column}.rail{flex-direction:row;flex:none;border:0;border-bottom:1px solid var(--line);padding:0 0 .75rem;margin-bottom:.75rem;width:100%}.rail-panel{width:auto;flex:none;border:0;padding:0 0 .75rem}.rail-main{padding:0}}`,
  markup: `
      <div class="rail-layout">
        <div class="rail" data-rail>
          <button type="button" data-panel="search" title="Search" aria-label="Search">⌕</button>
          <button type="button" data-panel="status" title="Status" aria-label="Status">◎</button>
          <button type="button" data-panel="type" title="Type" aria-label="Type">◫</button>
          <button type="button" data-panel="grouping" title="Group" aria-label="Group">☰</button>
        </div>
        <div class="rail-panel" hidden data-panel-body></div>
        <div class="rail-main">
          <div class="chips" data-chips style="margin-top:0"></div>
          <div data-main-slot></div>
        </div>
      </div>`,
  script: `
    const panelBody=stage.querySelector("[data-panel-body]");
    const mainSlot=stage.querySelector("[data-main-slot]");
    mainSlot.appendChild(stage.querySelector(".demo-results"));
    let active=null;
    function paintPanel(){
      stage.querySelectorAll("[data-rail] button").forEach(b=>b.classList.toggle("is-on", b.dataset.panel===active));
      if(!active){panelBody.hidden=true;return;}
      panelBody.hidden=false;
      if(active==="search"){
        panelBody.innerHTML='<h3 style="margin:0 0 .5rem;font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Search</h3><label class="search-pill"><input type="search" placeholder="Find…" data-search value="'+escapeHtml(state.query)+'" /></label>';
        panelBody.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
      } else if(active==="status"){
        panelBody.innerHTML='<h3 style="margin:0 0 .5rem;font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Status</h3>'+STATUSES.map(s=>'<button type="button" class="opt '+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("");
      } else if(active==="type"){
        panelBody.innerHTML='<h3 style="margin:0 0 .5rem;font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Type</h3>'+TYPES.map(t=>'<button type="button" class="opt '+(state.types.includes(t.id)?"is-active":"")+'" data-toggle-t="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>').join("");
      } else {
        panelBody.innerHTML='<h3 style="margin:0 0 .5rem;font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)">Group by</h3>'+GROUPINGS.map(g=>'<button type="button" class="opt '+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("");
      }
    }
    function paint(){paintPanel();renderActiveChips(stage.querySelector("[data-chips]"),true);refresh();}
    stage.addEventListener("click",(e)=>{
      const tab=e.target.closest("[data-panel]");
      if(tab && tab.closest("[data-rail]")){ active = active===tab.dataset.panel ? null : tab.dataset.panel; paint(); return; }
      if(handleChipRemove(e)){paint();return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    paint();
`,
};

P["19"] = {
  styles: ``,
  markup: `
      <div class="f-row">
        <label class="search-pill"><input type="search" placeholder="Search…" data-search /></label>
        <div class="wrap" data-dd="grouping"><button type="button" class="btn sq" data-trigger>Group</button><div class="menu" hidden data-menu></div></div>
        <div class="wrap" data-dd="status"><button type="button" class="btn sq" data-trigger>Status</button><div class="menu" hidden data-menu></div></div>
        <div class="wrap" data-dd="type"><button type="button" class="btn sq" data-trigger>Type</button><div class="menu" hidden data-menu></div></div>
        <button type="button" class="btn sq ghost" data-clear hidden>Clear all</button>
      </div>`,
  script: `
    function paint(){
      const map={
        grouping:{label:"Group: "+groupingLabel(state.grouping), on:state.grouping!=="region"},
        status:{label:"Status: "+statusLabel(state.status), on:state.status!=="all"},
        type:{label:state.types.length?"Type ("+state.types.length+")":"Type", on:!!state.types.length},
      };
      Object.entries(map).forEach(([k,v])=>{
        const b=stage.querySelector('[data-dd="'+k+'"] [data-trigger]');
        b.textContent=v.label+" ▾"; b.classList.toggle("is-on", v.on);
      });
      stage.querySelector("[data-clear]").hidden=activeCount(state)===0;
      stage.querySelector('[data-dd="grouping"] [data-menu]').innerHTML=GROUPINGS.map(g=>'<button type="button" class="'+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("");
      stage.querySelector('[data-dd="status"] [data-menu]').innerHTML=STATUSES.map(s=>'<button type="button" class="'+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("");
      stage.querySelector('[data-dd="type"] [data-menu]').innerHTML=TYPES.map(t=>'<button type="button" class="'+(state.types.includes(t.id)?"is-active":"")+'" data-toggle-t="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>').join("");
      refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.addEventListener("click",(e)=>{
      if(e.target.closest("[data-clear]")){Object.assign(state,createState());stage.querySelector("[data-search]").value="";closeMenus();paint();return;}
      const trig=e.target.closest("[data-trigger]");
      if(trig){const m=trig.closest("[data-dd]").querySelector("[data-menu]");const open=m.hidden;closeMenus();m.hidden=!open;return;}
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;closeMenus();paint();return;}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;closeMenus();paint();return;}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paint();}
    });
    document.addEventListener("click",(e)=>{if(!e.target.closest("[data-dd]"))closeMenus();});
    paint();
`,
};

P["20"] = {
  styles: `.mast{display:flex;justify-content:space-between;align-items:flex-end;gap:1rem;margin-bottom:1rem;flex-wrap:wrap}
.mast h2{margin:0;font-family:var(--serif);font-size:1.5rem;font-weight:400;font-style:italic}
.sheet{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(420px,92vw);z-index:80;background:#fff;border-radius:18px;box-shadow:0 24px 60px rgb(0 0 0/.22);border:1px solid var(--line);max-height:80vh;display:flex;flex-direction:column}
.sheet[hidden]{display:none}
.sheet header{display:flex;justify-content:space-between;align-items:center;padding:1rem 1.1rem;border-bottom:1px solid var(--line)}
.sheet header h3{margin:0;font-size:1rem}
.sheet .body{overflow:auto;padding:1rem 1.1rem}
.sheet footer{padding:.85rem 1.1rem;border-top:1px solid var(--line)}
.sheet footer button{width:100%;border:0;border-radius:12px;padding:.75rem;background:var(--accent);color:var(--accent-ink);font:inherit;font-weight:700;cursor:pointer}
.section{margin-bottom:1rem}
.section h4{margin:0 0 .4rem;font-size:.68rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}`,
  markup: `
      <div class="mast">
        <h2>Places atlas</h2>
        <div class="f-row">
          <div class="seg" data-group-seg></div>
          <button type="button" class="btn" data-open>Filters</button>
        </div>
      </div>
      <label class="search-pill" style="margin-bottom:.75rem"><input type="search" placeholder="Find a place…" data-search /></label>
      <div class="chips" data-chips></div>
      <div class="overlay" hidden data-bg></div>
      <div class="sheet" hidden data-sheet role="dialog">
        <header><h3>Filters</h3><button type="button" class="btn ghost" data-close>Close</button></header>
        <div class="body" data-body></div>
        <footer><button type="button" data-close>Apply</button></footer>
      </div>`,
  script: `
    const sheet=stage.querySelector("[data-sheet]"); const bg=stage.querySelector("[data-bg]");
    function open(){sheet.hidden=false;bg.hidden=false;paintSheet();}
    function close(){sheet.hidden=true;bg.hidden=true;}
    function paintSheet(){
      stage.querySelector("[data-body]").innerHTML=
        '<div class="section"><h4>Status</h4>'+STATUSES.map(s=>'<button type="button" class="opt '+(state.status===s.id?"is-active":"")+'" data-set-s="'+s.id+'">'+s.label+'</button>').join("")+'</div>'+
        '<div class="section"><h4>Type</h4>'+TYPES.map(t=>'<button type="button" class="opt '+(state.types.includes(t.id)?"is-active":"")+'" data-toggle-t="'+t.id+'"><span>'+t.label+'</span><span>'+t.count+'</span></button>').join("")+'</div>';
    }
    function paint(){
      stage.querySelector("[data-group-seg]").innerHTML=GROUPINGS.map(g=>'<button type="button" class="'+(state.grouping===g.id?"is-active":"")+'" data-set-g="'+g.id+'">'+g.label+'</button>').join("");
      stage.querySelector("[data-open]").classList.toggle("is-on", state.status!=="all"||state.types.length>0);
      renderActiveChips(stage.querySelector("[data-chips]"),true); refresh();
    }
    stage.querySelector("[data-search]").addEventListener("input",(e)=>{state.query=e.target.value;paint();});
    stage.querySelector("[data-open]").addEventListener("click",open);
    bg.addEventListener("click",close);
    stage.addEventListener("click",(e)=>{
      if(e.target.closest("[data-close]")) close();
      if(handleChipRemove(e)) paint();
      const g=e.target.closest("[data-set-g]"); if(g){state.grouping=g.dataset.setG;paint();}
      const s=e.target.closest("[data-set-s]"); if(s){state.status=s.dataset.setS;paintSheet();paint();}
      const t=e.target.closest("[data-toggle-t]"); if(t){toggleType(state,t.dataset.toggleT);paintSheet();paint();}
    });
    paint();
`,
};

for (const meta of DEMOS) {
  const id = meta[0];
  const p = P[id];
  if (!p) throw new Error("Missing pattern " + id);
  const html = shell(meta, p.styles, p.markup, p.script);
  const file = resolve(demosDir, `${id}-${meta[1]}.html`);
  writeFileSync(file, html);
  console.log("wrote", file);
}

console.log("Done:", DEMOS.length, "demos");
