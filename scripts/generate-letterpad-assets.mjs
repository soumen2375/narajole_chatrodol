/**
 * scripts/generate-letterpad-assets.mjs
 *
 * Regenerates api/_lib/letterpad-assets.ts — the base64-inlined artwork and
 * chancery font for the secretary's letterhead PDF.
 *
 * Run when the letterhead artwork changes:
 *   node scripts/generate-letterpad-assets.mjs
 *
 * The artwork in public/assets/letterpad/ was extracted from the office
 * master, Letterpad/CHHATRADOL_SWO_LETTERPAD.pptx, so the generated PDF is the
 * same sheet the secretary already prints. Icons and the watermark were
 * downscaled on extraction — they render at 4mm and 7% opacity respectively,
 * so the originals' 960px and 3000px were pure payload.
 *
 * Bebas Neue and Solway are NOT duplicated here: letter-pdf.ts imports them
 * from receipt-assets.ts, which already ships both.
 *
 * Base64 rather than a runtime fs read, for the same reason as the receipt
 * assets: Vercel's TypeScript builder only bundles what it can statically
 * trace from a function's imports.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'api/_lib/letterpad-assets.ts');
const FAMILY_OUT = path.join(ROOT, 'api/_lib/letter-font-assets.ts');
const IMG_DIR = path.join(ROOT, 'public/assets/letterpad');

const LEGACY_UA = 'Mozilla/4.0';

/**
 * The letterhead sets "Ref No.:" and "Date:" in Monotype Corsiva Bold and the
 * body in Times New Roman — both Microsoft fonts that cannot be redistributed
 * in a web app.
 *
 * Cormorant Garamond Bold Italic is the closest freely licensed chancery
 * italic for the two labels. Tinos is a metric-compatible Times New Roman
 * clone, so body copy wraps identically to the Word original. Both are used in
 * the PDF and in the browser preview, so the two never diverge.
 */
const FONT_SPECS = [
  ['FONT_CHANCERY', 'Cormorant+Garamond:700italic', ''],
  ['FONT_SERIF', 'Tinos', ''],
  ['FONT_SERIF_BOLD', 'Tinos:700', ''],
  ['FONT_SERIF_ITALIC', 'Tinos:italic', ''],
  ['FONT_SERIF_BOLD_ITALIC', 'Tinos:700italic', ''],
];

/**
 * The faces the secretary can choose from in the body editor, beyond the
 * letterhead's own Times New Roman.
 *
 * Each is a metric-compatible clone of the Microsoft font the office knows by
 * name, so a letter set in "Calibri" here occupies the same space as one set
 * in Calibri in Word — and the browser preview loads the very same families
 * from Google Fonts, so what is composed is what is posted.
 */
const FAMILY_SPECS = [
  ['arial', 'Arimo', 'Arial'],
  ['calibri', 'Carlito', 'Calibri'],
  ['cambria', 'Caladea', 'Cambria'],
  ['georgia', 'Gelasio', 'Georgia'],
  ['courier', 'Cousine', 'Courier New'],
];

const CUTS = [['regular', ''], ['bold', ':700'], ['italic', ':italic'], ['boldItalic', ':700italic']];

const IMAGE_SPECS = [
  ['IMG_BAND_TOP', 'band-top.png'],
  ['IMG_SWOOSH', 'swoosh-right.png'],
  ['IMG_BAND_FOOTER', 'band-footer.png'],
  ['IMG_DIVIDER', 'divider.png'],
  ['IMG_STAR', 'star.png'],
  ['IMG_LETTERHEAD_LOGO', 'logo.jpg'],
  ['IMG_WATERMARK', 'watermark.jpg'],
  ['IMG_LETTER_SIGNATURE', 'signature.png'],
  ['IMG_LP_ICON_MAIL', 'icon-mail.png'],
  ['IMG_LP_ICON_PHONE', 'icon-phone.png'],
  ['IMG_LP_ICON_WEB', 'icon-web.png'],
  ['IMG_LP_ICON_MAIL_FOOT', 'icon-mail-footer.png'],
  ['IMG_LP_ICON_PHONE_FOOT', 'icon-phone-footer.png'],
  ['IMG_LP_ICON_ADDRESS_FOOT', 'icon-address-footer.png'],
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
 * api/_lib/letterpad-assets.ts
 *
 * Letterhead artwork and the chancery font for the secretary's letter PDF,
 * inlined as base64.
 *
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: node scripts/generate-letterpad-assets.mjs
 *
 * The artwork is extracted from the office master letterpad deck, so a
 * generated letter is the same sheet the secretary already prints. Bebas Neue
 * and Solway live in receipt-assets.ts and are imported from there rather than
 * duplicated.
 *
 * FONT_CHANCERY is Cormorant Garamond Bold Italic, standing in for the
 * letterhead's Monotype Corsiva Bold — an Office font that cannot be shipped.
 * FONT_SERIF is Tinos, which is metrically identical to Times New Roman (the
 * letterhead's body face) and Apache licensed, so a letter drafted in Word on
 * the office machine and one generated here break lines in the same places.
 * Its bold, italic and bold-italic cuts ship alongside it because the letter
 * body is written in a rich-text editor: a bolded word has to print bold, not
 * merely wider-spaced.
 */

`;

const chunks = [header];

for (const [name, family, extra] of FONT_SPECS) {
  const buf = await fetchFontTtf(family, extra);
  console.log(`${name.padEnd(26)} ${family.padEnd(30)} ${(buf.length / 1024).toFixed(1)}KB`);
  chunks.push(`export const ${name} = '${buf.toString('base64')}';\n\n`);
}

for (const [name, file] of IMAGE_SPECS) {
  const buf = fs.readFileSync(path.join(IMG_DIR, file));
  console.log(`${name.padEnd(26)} ${file.padEnd(30)} ${(buf.length / 1024).toFixed(1)}KB`);
  chunks.push(`export const ${name} = '${buf.toString('base64')}';\n\n`);
}

fs.writeFileSync(OUT, chunks.join(''));
console.log(`\nwrote ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)}KB)`);

// ── The body editor's other faces ────────────────────────────────────────────

const familyHeader = `/**
 * api/_lib/letter-font-assets.ts
 *
 * The faces a letter body can be set in besides the letterhead's own Times
 * New Roman, inlined as base64.
 *
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: node scripts/generate-letterpad-assets.mjs
 *
 * Every one is a metric-compatible clone of the Microsoft font the office
 * names it by, and freely licensed where the original is not:
 * ${FAMILY_SPECS.map(([, clone, ms]) => `${clone} for ${ms}`).join(', ')}.
 * The browser preview loads those same families from Google Fonts, so a
 * letter looks in the editor the way it will print.
 *
 * letter-pdf.ts imports this file dynamically, and only when a letter
 * actually uses one of these faces — most letters are set in Times New Roman
 * and never pay for it.
 */

export interface FontCutsBase64 {
  regular: string;
  bold: string;
  italic: string;
  boldItalic: string;
}

export const EXTRA_FONTS: Record<string, FontCutsBase64> = {
`;

const familyChunks = [familyHeader];

for (const [key, clone] of FAMILY_SPECS) {
  familyChunks.push(`  ${key}: {\n`);
  for (const [cut, extra] of CUTS) {
    const buf = await fetchFontTtf(clone.replace(/ /g, '+'), extra);
    console.log(`${`${key}.${cut}`.padEnd(26)} ${(clone + extra).padEnd(30)} ${(buf.length / 1024).toFixed(1)}KB`);
    familyChunks.push(`    ${cut}: '${buf.toString('base64')}',\n`);
  }
  familyChunks.push('  },\n');
}

familyChunks.push('};\n');

fs.writeFileSync(FAMILY_OUT, familyChunks.join(''));
console.log(`wrote ${path.relative(ROOT, FAMILY_OUT)} (${(fs.statSync(FAMILY_OUT).size / 1024).toFixed(0)}KB)`);
