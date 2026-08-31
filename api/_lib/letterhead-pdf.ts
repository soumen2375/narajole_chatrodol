/**
 * api/_lib/letterhead-pdf.ts
 *
 * The CSWO letterhead as a drawable A4 sheet, plus the typesetting helpers
 * every document built on it needs.
 *
 * Coordinates come from the office master deck,
 * Letterpad/CHHATRADOL_SWO_LETTERPAD.pptx, whose canvas is A4's proportions
 * blown up 2.83x — which is why its point sizes go through pt() rather than
 * being used raw. The same table drives the browser preview in
 * src/lib/letterpad.ts and the printable HTML in src/lib/letterhead.ts.
 *
 * The secretary's letters (letter-pdf.ts) and the donation receipts emailed to
 * donors (receipt-pdf.ts) both render onto this, so a donor's receipt and a
 * letter from the office are visibly the same stationery.
 */

import { PDFDocument, rgb, type PDFFont, type PDFPage, type PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { FONT_BEBAS, FONT_BODY, FONT_BODY_BOLD } from './receipt-assets.js';
import {
  FONT_CHANCERY,
  FONT_SERIF,
  IMG_BAND_TOP,
  IMG_SWOOSH,
  IMG_BAND_FOOTER,
  IMG_DIVIDER,
  IMG_STAR,
  IMG_LETTERHEAD_LOGO,
  IMG_WATERMARK,
  IMG_LETTER_SIGNATURE,
  IMG_LP_ICON_MAIL,
  IMG_LP_ICON_PHONE,
  IMG_LP_ICON_WEB,
  IMG_LP_ICON_MAIL_FOOT,
  IMG_LP_ICON_PHONE_FOOT,
  IMG_LP_ICON_ADDRESS_FOOT,
} from './letterpad-assets.js';


// ── Units ────────────────────────────────────────────────────────────────────

export const MM = 72 / 25.4;
export const PAGE_W = 210 * MM;
export const PAGE_H = 297 * MM;

/** A4 width ÷ the master deck's canvas width — converts its point sizes to ours. */
const SLIDE_SCALE = 8.2677 / 23.3708;

/** Deck point size (as authored) → PDF point size. */
export const pt = (slidePt: number) => slidePt * SLIDE_SCALE;

/** y measured downward from the top edge, as in the deck → pdf-lib's y-up space. */
export const yDown = (mm: number) => PAGE_H - mm * MM;

// ── Palette (sampled from the deck) ──────────────────────────────────────────

const hex = (h: string) =>
  rgb(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );

export const RED = hex('C00000');       // org name, the heavy rules
export const LABEL_RED = hex('B30000'); // "Ref No.:", "Date:", "Subject:", salutation
export const GOLD = hex('F4C168');      // thin rule under each heavy rule
export const GOLD_TICK = hex('E7A641');
export const ORANGE = hex('F79646');    // the flourish under the signature
export const BLACK = hex('000000');
export const WHITE = hex('FFFFFF');

// ── Organisation constants (printed on every sheet) ──────────────────────────

const ORG_NAME = 'Chhatradol social welfare organization';
const ORG_REG = 'Reg. No.: IV-100200047/2026         DARPAN ID: WB/2026/1138665';
const ORG_PHONE_HEAD = '7811073412';
const ORG_MAIL = 'info@chhatradol.org';
const ORG_WEB = 'www.chhatradol.org';
const ORG_PHONES = '7074074110/ 7811073412';
const ORG_ADDRESS = 'Narajole, Daspur, Paschim Medinipur, 721211';


/**
 * The deck writes the leader after each label as ellipsis characters — 13 dots
 * after "Ref No.:", 18 after "Date:" — and overprints the value on top of
 * them. Drawing them as individual periods on a fixed pitch rather than as
 * '…' keeps the run the same length as the master's: Cormorant Garamond's
 * ellipsis is barely a third as wide as Monotype Corsiva's, so the substituted
 * font would otherwise leave a stub where the master has a long dotted rule.
 */
export const REF_DOTS = { startX: 23.10, count: 13, pitch: 1.342 };
export const DATE_DOTS = { startX: 165.38, count: 18, pitch: 1.359 };


// ── Text helpers ─────────────────────────────────────────────────────────────

/**
 * Replaces code points the embedded font cannot encode.
 *
 * The letterhead's faces are Latin-only. Bengali would need both a Bengali
 * font and OpenType shaping, which pdf-lib's drawText does not do — conjuncts
 * and reordered vowels would come out scrambled rather than merely ugly. A
 * visible '?' at least makes the gap honest, and the compose screen warns
 * before it can happen.
 */
export function sanitize(str: string, font: PDFFont): string {
  let out = '';
  for (const ch of String(str ?? '')) {
    if (ch === '\t') { out += ' '; continue; }
    try {
      font.widthOfTextAtSize(ch, 12);
      out += ch;
    } catch {
      out += '?';
    }
  }
  return out;
}

/** Greedy word wrap. Returns one array of words per line. */
export function wrapWords(str: string, font: PDFFont, size: number, maxWidth: number): string[][] {
  const words = sanitize(str, font).split(/\s+/).filter(Boolean);
  const lines: string[][] = [];
  let line: string[] = [];

  for (const word of words) {
    const candidate = [...line, word].join(' ');
    if (line.length > 0 && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = [word];
    } else {
      line.push(word);
    }
  }
  if (line.length > 0) lines.push(line);
  return lines.length > 0 ? lines : [[]];
}

/**
 * Draws one line, spreading the words to both margins when `justify` is set.
 *
 * pdf-lib has no justified text, so the extra space is divided between the
 * gaps and each word is placed individually. A single-word line is never
 * stretched — that would just push one word to the left margin.
 */
export function drawLine(
  page: PDFPage,
  words: string[],
  x: number,
  baselineY: number,
  opts: { font: PDFFont; size: number; color: ReturnType<typeof rgb>; width?: number; justify?: boolean },
) {
  if (words.length === 0) return;
  const { font, size, color } = opts;

  if (!opts.justify || words.length < 2 || opts.width === undefined) {
    page.drawText(words.join(' '), { x, y: baselineY, size, font, color });
    return;
  }

  const wordWidths = words.map((w) => font.widthOfTextAtSize(w, size));
  const slack = opts.width - wordWidths.reduce((a, b) => a + b, 0);
  const gap = slack / (words.length - 1);

  let cursor = x;
  words.forEach((word, i) => {
    page.drawText(word, { x: cursor, y: baselineY, size, font, color });
    cursor += wordWidths[i] + gap;
  });
}

/** Lays a run of leader dots on a fixed pitch, as the master's ellipses fall. */
export function drawDots(
  page: PDFPage,
  spec: { startX: number; count: number; pitch: number },
  labelEndMm: number,
  baselineY: number,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  const start = Math.max(spec.startX, labelEndMm + 0.7);
  for (let i = 0; i < spec.count; i += 1) {
    page.drawText('.', { x: (start + i * spec.pitch) * MM, y: baselineY, size, font, color });
  }
}

/**
 * First-baseline offset below a text box's top edge.
 *
 * Every text box on the master has zero internal inset and an explicit line
 * height in points, so PowerPoint seats the baseline one line down less the
 * font's descender. 0.24em is the descent of both Solway and Tinos.
 */
export const baselineDrop = (lineHeight: number, size: number) => lineHeight - size * 0.24;


// ── Letterhead furniture ─────────────────────────────────────────────────────

export interface Art {
  bandTop: PDFImage;
  swoosh: PDFImage;
  bandFooter: PDFImage;
  divider: PDFImage;
  star: PDFImage;
  logo: PDFImage;
  watermark: PDFImage;
  iconMail: PDFImage;
  iconPhone: PDFImage;
  iconWeb: PDFImage;
  iconMailFoot: PDFImage;
  iconPhoneFoot: PDFImage;
  iconAddressFoot: PDFImage;
}

export interface Fonts {
  bebas: PDFFont;
  solway: PDFFont;
  solwayBold: PDFFont;
  chancery: PDFFont;
  serif: PDFFont;
}

/** Places an image by its top-left corner, in millimetres from the page's top-left. */
export function place(
  page: PDFPage,
  image: PDFImage,
  x: number,
  y: number,
  w: number,
  h: number,
  opacity?: number,
) {
  page.drawImage(image, {
    x: x * MM,
    y: yDown(y + h),
    width: w * MM,
    height: h * MM,
    ...(opacity === undefined ? {} : { opacity }),
  });
}

/** A horizontal rule, given in millimetres and drawn with a point thickness. */
export function rule(page: PDFPage, x1: number, x2: number, y: number, thicknessPt: number, color: ReturnType<typeof rgb>) {
  page.drawLine({
    start: { x: x1 * MM, y: yDown(y) },
    end: { x: x2 * MM, y: yDown(y) },
    thickness: thicknessPt,
    color,
  });
}

/**
 * Draws everything that is on the sheet before a word is typed: the bands,
 * the masthead, the contact strip, the rules, the watermark and the footer.
 * Repeated on every page so a continuation sheet is still letterhead.
 */
export function drawLetterhead(page: PDFPage, art: Art, f: Fonts) {
  // Decorative bands. The watermark goes down first so body text sits over it.
  place(page, art.bandTop, 0, 0, 210, 11.13);
  place(page, art.swoosh, 141.33, 0, 68.67, 107.52);
  place(page, art.bandFooter, 0.07, 263.76, 210, 33.23);
  place(page, art.watermark, 21.01, 67.21, 168.08, 162.56, 0.07);

  // Masthead
  place(page, art.logo, 3.89, 9.07, 33.02, 33.63);
  place(page, art.divider, 36.75, 11.12, 3.55, 31.57);

  const orgSize = pt(68.06);
  page.drawText(sanitize(ORG_NAME, f.bebas), {
    x: 43.76 * MM,
    y: yDown(4.75 + 15.95),
    size: orgSize,
    font: f.bebas,
    color: RED,
  });

  const regSize = pt(23.39);
  page.drawText(sanitize(ORG_REG, f.solway), {
    x: 44.86 * MM,
    y: yDown(21.55 + 4.1),
    size: regSize,
    font: f.solway,
    color: BLACK,
  });
  page.drawLine({
    start: { x: 91.94 * MM, y: yDown(23.58) },
    end: { x: 91.94 * MM, y: yDown(23.58 + 2.48) },
    thickness: 1.06,
    color: GOLD_TICK,
  });

  // Contact strip: phone, email, website
  const contactSize = pt(24.99);
  const contactBaseline = (boxTop: number) => yDown(boxTop + baselineDrop(4.28, contactSize / MM) );

  place(page, art.iconPhone, 45.12, 35.27, 3.77, 3.76);
  page.drawText(sanitize(ORG_PHONE_HEAD, f.solway), {
    x: 49.83 * MM, y: contactBaseline(34.73), size: contactSize, font: f.solway, color: BLACK,
  });

  place(page, art.iconMail, 76.59, 34.76, 4.09, 4.08);
  page.drawText(sanitize(ORG_MAIL, f.solway), {
    x: 81.63 * MM, y: contactBaseline(34.56), size: contactSize, font: f.solway, color: BLACK,
  });

  place(page, art.iconWeb, 123.14, 34.77, 3.87, 3.87);
  page.drawText(sanitize(ORG_WEB, f.solway), {
    x: 127.73 * MM, y: contactBaseline(34.21), size: contactSize, font: f.solway, color: BLACK,
  });

  // The split rule under the masthead, with the star sitting in the gap
  rule(page, -2.09, 96.39, 46.52, 3.45, RED);
  rule(page, -0.59, 96.39, 47.70, 1.33, GOLD);
  rule(page, 113.53, 194.25, 46.52, 3.45, RED);
  rule(page, 113.53, 194.25, 47.93, 1.33, GOLD);
  place(page, art.star, 102.30, 43.90, 5.50, 5.24);

  // Footer strip, white on maroon
  const footSize = pt(24.99);
  const footBase = (boxTop: number) => yDown(boxTop + baselineDrop(4.4, footSize / MM));

  place(page, art.iconPhoneFoot, 15.46, 284.31, 8.42, 8.41);
  page.drawText('Contact No.', { x: 26.88 * MM, y: footBase(283.56), size: footSize, font: f.solwayBold, color: WHITE });
  page.drawText(ORG_PHONES, { x: 27.15 * MM, y: footBase(287.93), size: footSize, font: f.solway, color: WHITE });

  page.drawLine({
    start: { x: 72.57 * MM, y: yDown(284.31) },
    end: { x: 72.57 * MM, y: yDown(284.31 + 11.73) },
    thickness: 0.53, color: WHITE,
  });

  place(page, art.iconMailFoot, 81.48, 285.04, 8.15, 8.13);
  page.drawText('Email', { x: 92.61 * MM, y: footBase(284.51), size: footSize, font: f.solwayBold, color: WHITE });
  page.drawText(ORG_MAIL, { x: 92.61 * MM, y: footBase(287.93), size: footSize, font: f.solway, color: WHITE });

  page.drawLine({
    start: { x: 138.53 * MM, y: yDown(284.31) },
    end: { x: 138.53 * MM, y: yDown(284.31 + 11.73) },
    thickness: 0.53, color: WHITE,
  });

  place(page, art.iconAddressFoot, 147.96, 284.66, 8.07, 8.06);
  page.drawText('Address', { x: 159.02 * MM, y: footBase(281.69), size: footSize, font: f.solwayBold, color: WHITE });

  const addrLineH = pt(33.99) / MM; // mm
  wrapWords(ORG_ADDRESS, f.solway, footSize, 44.59 * MM).forEach((words, i) => {
    drawLine(page, words, 159.02 * MM, yDown(285.80 + baselineDrop(addrLineH, footSize / MM) + i * addrLineH), {
      font: f.solway, size: footSize, color: WHITE,
    });
  });
}


/** Embeds a PNG or JPEG without being told which it is. */
export async function embedAuto(pdf: PDFDocument, bytes: Uint8Array): Promise<PDFImage> {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  return isPng ? pdf.embedPng(bytes) : pdf.embedJpg(bytes);
}

/** dd/mm/yyyy, as the master prints it. */
export function formatDate(iso: string): string {
  const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
  const valid = Number.isNaN(d.getTime()) ? new Date() : d;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(valid.getDate())}/${p(valid.getMonth() + 1)}/${valid.getFullYear()}`;
}
// ── Loading the sheet ────────────────────────────────────────────────────────

export interface LetterheadKit {
  fonts: Fonts;
  art: Art;
  /** The secretary's signature, or an uploaded one when supplied. */
  signature: PDFImage;
}

/**
 * Embeds every font and image the letterhead needs, once per document.
 *
 * An uploaded signature replaces the master's, but a corrupt or unsupported
 * file must not cost the office the whole document — it falls back rather
 * than throwing.
 */
export async function loadLetterheadKit(
  pdf: PDFDocument,
  signatureImage?: Uint8Array | null,
): Promise<LetterheadKit> {
  pdf.registerFontkit(fontkit);
  const dec = (b64: string) => Uint8Array.from(Buffer.from(b64, 'base64'));

  const fonts: Fonts = {
    bebas: await pdf.embedFont(dec(FONT_BEBAS), { subset: true }),
    solway: await pdf.embedFont(dec(FONT_BODY), { subset: true }),
    solwayBold: await pdf.embedFont(dec(FONT_BODY_BOLD), { subset: true }),
    chancery: await pdf.embedFont(dec(FONT_CHANCERY), { subset: true }),
    serif: await pdf.embedFont(dec(FONT_SERIF), { subset: true }),
  };

  const art: Art = {
    bandTop: await pdf.embedPng(dec(IMG_BAND_TOP)),
    swoosh: await pdf.embedPng(dec(IMG_SWOOSH)),
    bandFooter: await pdf.embedPng(dec(IMG_BAND_FOOTER)),
    divider: await pdf.embedPng(dec(IMG_DIVIDER)),
    star: await pdf.embedPng(dec(IMG_STAR)),
    logo: await pdf.embedJpg(dec(IMG_LETTERHEAD_LOGO)),
    watermark: await pdf.embedJpg(dec(IMG_WATERMARK)),
    iconMail: await pdf.embedPng(dec(IMG_LP_ICON_MAIL)),
    iconPhone: await pdf.embedPng(dec(IMG_LP_ICON_PHONE)),
    iconWeb: await pdf.embedPng(dec(IMG_LP_ICON_WEB)),
    iconMailFoot: await pdf.embedPng(dec(IMG_LP_ICON_MAIL_FOOT)),
    iconPhoneFoot: await pdf.embedPng(dec(IMG_LP_ICON_PHONE_FOOT)),
    iconAddressFoot: await pdf.embedPng(dec(IMG_LP_ICON_ADDRESS_FOOT)),
  };

  let signature: PDFImage;
  try {
    signature = signatureImage
      ? await embedAuto(pdf, signatureImage)
      : await pdf.embedPng(dec(IMG_LETTER_SIGNATURE));
  } catch {
    signature = await pdf.embedPng(dec(IMG_LETTER_SIGNATURE));
  }

  return { fonts, art, signature };
}

/** Adds an A4 page with the letterhead already on it. */
export function newLetterheadPage(pdf: PDFDocument, kit: LetterheadKit): PDFPage {
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  drawLetterhead(page, kit.art, kit.fonts);
  return page;
}

/**
 * Draws the Ref No. / Date strip in the master's slots.
 *
 * `refNo` is whatever numbers the document — a letter's register number, a
 * receipt number, a bill number. Omitting it leaves the date alone on the row.
 */
export function drawRefAndDate(
  page: PDFPage,
  f: Fonts,
  refNo: string | null | undefined,
  isoDate: string,
) {
  const labelSize = pt(32.71);
  const labelY = yDown(54.61 + baselineDrop(5.6, labelSize / MM));

  if (refNo) {
    page.drawText('Ref No.:', { x: 9.45 * MM, y: labelY, size: labelSize, font: f.chancery, color: LABEL_RED });
    drawDots(page, REF_DOTS, 9.45 + f.chancery.widthOfTextAtSize('Ref No.:', labelSize) / MM,
      labelY, f.chancery, labelSize, LABEL_RED);
    page.drawText(sanitize(refNo, f.solway), {
      x: 25.83 * MM, y: yDown(55.27 + baselineDrop(4.6, pt(23.31) / MM)), size: pt(23.31), font: f.solway, color: BLACK,
    });
  }

  page.drawText('Date:', { x: 156.03 * MM, y: labelY, size: labelSize, font: f.chancery, color: LABEL_RED });
  drawDots(page, DATE_DOTS, 156.03 + f.chancery.widthOfTextAtSize('Date:', labelSize) / MM,
    labelY, f.chancery, labelSize, LABEL_RED);
  page.drawText(formatDate(isoDate), {
    x: 169.26 * MM, y: yDown(55.35 + baselineDrop(4.35, pt(21.80) / MM)), size: pt(21.80), font: f.solway, color: BLACK,
  });
}
