#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGE_CATEGORIES, PAGE_DEMOS } from "./shared/options.js";

const here = dirname(fileURLToPath(import.meta.url));
const demosDir = resolve(here, "demos");
mkdirSync(demosDir, { recursive: true });

for (const demo of PAGE_DEMOS) {
  const designDir = resolve(demosDir, `${demo.id}-${demo.slug}`);
  mkdirSync(designDir, { recursive: true });
  for (const category of PAGE_CATEGORIES) {
    const html = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${category.label} · ${demo.title} · Category Pages Lab</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../shared/pages.css"></head><body data-demo="${demo.id}" data-theme="${demo.slug}" data-category="${category.key}"><div id="pages-demo"></div><script type="module" src="../../shared/pages.js"></script></body></html>`;
    writeFileSync(resolve(designDir, `${category.key}.html`), html);
  }
}

console.log(`Generated ${PAGE_DEMOS.length * PAGE_CATEGORIES.length} category pages.`);
