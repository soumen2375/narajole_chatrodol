/**
 * scripts/generate-receipt-assets.mjs
 *
 * Regenerates api/_lib/receipt-assets.ts — the base64-inlined fonts and
 * imagery used by the PDF donation receipt.
 *
 * Run when the logo, signature, footer icons, or fonts change:
 *   node scripts/generate-receipt-assets.mjs
 *
 * Why base64 rather than reading files at runtime: Vercel's TypeScript
 * builder only ships what it can statically trace from a function's imports.
 * A runtime fs.readFileSync of a .ttf that isn't in the bundle fails in
 * production while working perfectly in local dev — the same failure mode
 * that took every payment endpoint offline when the shared lib lived outside
 * api/. A string literal is part of the module, so it always ships.
 *
 * Fonts are Google Fonts TTFs. Google serves woff2 to modern user agents
 * (which fontkit cannot read), so the legacy `Mozilla/4.0` UA is used to get
 * TrueType. The rupee font is a deliberate single-glyph subset fetched with
 * `text=₹`: neither Bebas Neue nor Solway includes U+20B9, and PDF standard
 * fonts cannot encode it, so the amount would print as a blank box without it.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'api/_lib/receipt-assets.ts');
const IMG_DIR = path.join(ROOT, 'public/assets/receipt');

const LEGACY_UA = 'Mozilla/4.0';

const FONT_SPECS = [
  ['FONT_BEBAS', 'Bebas+Neue', ''],
  ['FONT_BODY', 'Solway', ''],
  ['FONT_BODY_BOLD', 'Solway:700', ''],
  ['FONT_RUPEE', 'Roboto', '&text=%E2%82%B9'],
];

const IMAGE_SPECS = [
  ['IMG_LOGO', 'logo.jpg'],
  ['IMG_SIGNATURE', 'signature.png'],
  ['IMG_ICON_PHONE', 'icon-phone-gold.png'],
  ['IMG_ICON_MAIL', 'icon-mail-gold.png'],
  ['IMG_ICON_WEB', 'icon-web-gold.png'],
];

async function fetchFontTtf(family, extra) {
  const cssUrl = `https://fonts.googleapis.com/css?family=${family}${extra}`;
  const css = await fetch(cssUrl, { headers: { 'User-Agent': LEGACY_UA } }).then((r) => r.text());
  const match = /url\((https:\/\/[^)]+)\)/.exec(css);
  if (!match) throw new Error(`No font URL found for ${family}`);
  const buf = await fetch(match[1], { headers: { 'User-Agent': LEGACY_UA } })
    .then((r) => r.arrayBuffer());
  return Buffer.from(buf);
}

const header = `/**
 * api/_lib/receipt-assets.ts
 *
 * Fonts and imagery for the PDF donation receipt, inlined as base64.
 *
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: node scripts/generate-receipt-assets.mjs
 *
 * These are embedded rather than read from disk on purpose. Vercel's
 * TypeScript builder only bundles what it can statically trace from a
 * function's imports; a runtime fs read of a file outside the bundle
 * silently fails in production. A base64 literal is part of the module.
 *
 * Fonts (Google Fonts latin subsets, kept small on purpose):
 *   Bebas Neue - display (org name, "DONATION RECEIPT", amount)
 *   Solway     - body copy, regular + bold
 *   Rupee      - single-glyph subset carrying U+20B9 only. Neither Bebas Neue
 *                nor Solway ships the rupee sign, and PDF standard fonts
 *                cannot encode it, so the amount would render as a blank box.
 */

`;

const chunks = [header];

for (const [name, family, extra] of FONT_SPECS) {
  const buf = await fetchFontTtf(family, extra);
  console.log(`${name.padEnd(16)} ${family.padEnd(14)} ${(buf.length / 1024).toFixed(1)}KB`);
  chunks.push(`export const ${name} = '${buf.toString('base64')}';\n\n`);
}

for (const [name, file] of IMAGE_SPECS) {
  const buf = fs.readFileSync(path.join(IMG_DIR, file));
  console.log(`${name.padEnd(16)} ${file.padEnd(14)} ${(buf.length / 1024).toFixed(1)}KB`);
  chunks.push(`export const ${name} = '${buf.toString('base64')}';\n\n`);
}

fs.writeFileSync(OUT, chunks.join(''));
console.log(`\nwrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)}KB)`);
