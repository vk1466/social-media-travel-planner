#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { TRAVEL_DEMOS } from "./shared/options.js";

const here = dirname(fileURLToPath(import.meta.url));
const demosDir = resolve(here, "demos");
mkdirSync(demosDir, { recursive: true });

for (const demo of TRAVEL_DEMOS) {
  const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${demo.id} ${demo.title} · Travel Section Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="../../sites/shared/places-browse.css"><link rel="stylesheet" href="../../sites/shared/posts-browse.css">
<link rel="stylesheet" href="../../sites/04-volume/styles.css"><link rel="stylesheet" href="../shared/shell.css">
</head><body data-demo="${demo.id}" data-theme="${demo.slug}"><div id="travel-demo"></div>
<script>window.WF_SITE_BASE="../../sites/02-almanac/";</script><script src="../../sites/shared/mock.js"></script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script type="module" src="../shared/mount.js"></script>
</body></html>`;
  writeFileSync(resolve(demosDir, `${demo.id}-${demo.slug}.html`), html);
}

console.log(`Generated ${TRAVEL_DEMOS.length} travel-section demos.`);
