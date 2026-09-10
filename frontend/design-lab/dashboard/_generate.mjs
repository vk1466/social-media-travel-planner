#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DASHBOARD_DEMOS } from "./shared/options.js";

const here = dirname(fileURLToPath(import.meta.url));
const demosDir = resolve(here, "demos");
mkdirSync(demosDir, { recursive: true });

for (const demo of DASHBOARD_DEMOS) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${demo.id} ${demo.title} · Dashboard Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../shared/dashboard.css"></head>
<body data-demo="${demo.id}" data-theme="${demo.slug}"><div id="dashboard-demo"></div><script type="module" src="../shared/dashboard.js"></script></body></html>`;
  writeFileSync(resolve(demosDir, `${demo.id}-${demo.slug}.html`), html);
}

console.log(`Generated ${DASHBOARD_DEMOS.length} dashboard demos.`);
