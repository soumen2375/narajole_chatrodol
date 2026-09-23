/**
 * api/_lib/letter-pdf.ts
 *
 * Renders a secretary's letter on the official CSWO letterhead as an A4 PDF.
 *
 * The sheet itself — bands, masthead, contact strip, rules, watermark, footer
 * — lives in letterhead-pdf.ts, shared with the donation receipt so the two
 * cannot drift apart. The body — headings, styled runs, lists, links and
 * images — is set by letter-body-pdf.ts. What remains here is what makes a
 * letter a letter: the addressee, the subject, and the signature block that
 * follows the body onto whichever sheet it ended on.
 */

import { PDFDocument, type PDFImage } from 'pdf-lib';
import {
  BLACK, LABEL_RED, MM, ORANGE,
  PAGE_H, PAGE_W,
  baselineDrop, drawLine, drawRefAndDate, embedAuto, loadLetterheadKit,
  newLetterheadPage, place, pt, rule, sanitize, wrapWords, yDown,
} from './letterhead-pdf.js';
import { flowBody, layoutBody, type BodyFonts } from './letter-body-pdf.js';
import { fontFamilies, imageSources, parseLetterHtml } from './letter-richtext.js';

// ── The body column, and where it may run to ─────────────────────────────────
const BODY_X = 22.44;
const BODY_W = 169.21;
const BODY_TOP_FIRST = 122.86; // below the salutation on page 1
const BODY_TOP_CONT = 55.0;    // continuation sheets start under the rules
const BODY_BOTTOM = 240.0;     // the closing block begins at 245.83

// ── Input ────────────────────────────────────────────────────────────────────

export interface LetterPdfInput {
  refNo: string;
  /** ISO date (yyyy-mm-dd); printed dd/mm/yyyy as on the master. */
  letterDate: string;
  toName: string;
  /** Free text; newlines become separate lines under the addressee's name. */
  toAddress: string;
  salutation: string;
  subject: string;
  /** Paragraphs separated by a blank line — the plain-text reading. */
  body: string;
  /**
   * The formatted body as the editor saved it. Empty on letters written
   * before the editor arrived, which fall back to `body`.
   */
  bodyHtml?: string;
  closing: string;
  signatoryName: string;
  signatoryRole: string;
  signatoryPhone: string;
  /** PNG/JPEG bytes of an uploaded signature; the master's is used when absent. */
  signatureImage?: Uint8Array | null;
  /**
   * Fetches an image the body refers to. Left out, images print as a marked
   * gap: what may be downloaded onto the organisation's letterhead is a
   * decision for the endpoint, not for the renderer.
   */
  fetchImage?: (src: string) => Promise<Uint8Array | null>;
}

/**
 * A pre-editor letter's paragraphs as the editor would have written them.
 *
 * Letters filed before the body became a formatted document hold blank-line
 * separated text and nothing else; rendering them through the same path as
 * everything else is what keeps their appearance unchanged.
 */
function plainToHtml(text: string): string {
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return String(text ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

// ── Main renderer ────────────────────────────────────────────────────────────

export async function generateLetterPdf(input: LetterPdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const kit = await loadLetterheadKit(pdf, input.signatureImage);
  const f = kit.fonts;
  const signature = kit.signature;

  pdf.setTitle(`CSWO Letter ${input.refNo}`);
  pdf.setAuthor('Chhatradol Social Welfare Organization');
  pdf.setSubject(input.subject || 'Official letter');
  pdf.setProducer('CSWO Digital Platform');
  pdf.setCreator('chhatradol.org');

  const newPage = () => newLetterheadPage(pdf, kit);
  /** A sheet with no letterhead on it, for a full-page picture. */
  const newBarePage = () => pdf.addPage([PAGE_W, PAGE_H]);

  let page = newPage();

  drawRefAndDate(page, f, input.refNo, input.letterDate);

  // ── Addressee ──
  const toSize = pt(34.03);
  const toLineH = pt(39.49) / MM;
  const toLines = ['To', input.toName, ...input.toAddress.split('\n')]
    .map((l) => l.trim())
    .filter((l, i) => i < 2 || l.length > 0);

  toLines.forEach((line, i) => {
    page.drawText(sanitize(line, f.solway), {
      x: 22.89 * MM,
      y: yDown(70.31 + baselineDrop(toLineH, toSize / MM) + i * toLineH),
      size: toSize,
      font: f.solway,
      color: BLACK,
    });
  });

  // ── Subject ──
  page.drawText('Subject:', {
    x: 22.89 * MM, y: yDown(97.82 + baselineDrop(4.9, toSize / MM)), size: toSize, font: f.solwayBold, color: LABEL_RED,
  });
  const subjSize = pt(31.90);
  const subjLineH = (subjSize * 1.2) / MM;
  wrapWords(input.subject, f.solwayBold, subjSize, 150.79 * MM).forEach((words, i) => {
    drawLine(page, words, 41.76 * MM, yDown(96.75 + baselineDrop(subjLineH, subjSize / MM) + i * subjLineH), {
      font: f.solwayBold, size: subjSize, color: BLACK,
    });
  });

  // ── Salutation ──
  page.drawText(sanitize(input.salutation, f.solwayBold), {
    x: 22.89 * MM, y: yDown(114.97 + baselineDrop(4.9, toSize / MM)), size: toSize, font: f.solwayBold, color: LABEL_RED,
  });

  // ── Body ──
  // Laid out in full before anything is drawn, so a line, an image or a page
  // break lands on the sheet measurement says it does — and the signature
  // block knows which sheet that was.
  const bodyHtml = (input.bodyHtml ?? '').trim() || plainToHtml(input.body);
  const blocks = parseLetterHtml(bodyHtml);

  const images = new Map<string, PDFImage | null>();
  for (const src of imageSources(blocks)) {
    let embedded: PDFImage | null = null;
    try {
      const bytes = input.fetchImage ? await input.fetchImage(src) : null;
      if (bytes) embedded = await embedAuto(pdf, bytes);
    } catch {
      // A picture that will not embed must not cost the office the letter;
      // the renderer prints a marked gap in its place.
      embedded = null;
    }
    images.set(src, embedded);
  }

  // Only the faces this letter names are embedded, and the file holding them
  // is only read when there is one — a letter in the letterhead's own Times
  // New Roman loads none of it.
  const extra = new Map<string, BodyFonts>();
  const asked = fontFamilies(blocks).filter((key) => key !== 'times');
  if (asked.length > 0) {
    const { EXTRA_FONTS } = await import('./letter-font-assets.js');
    for (const key of asked) {
      const cuts = EXTRA_FONTS[key];
      if (!cuts) continue;
      const bytes = (value: string) => Buffer.from(value, 'base64');
      extra.set(key, {
        regular: await pdf.embedFont(bytes(cuts.regular), { subset: true }),
        bold: await pdf.embedFont(bytes(cuts.bold), { subset: true }),
        italic: await pdf.embedFont(bytes(cuts.italic), { subset: true }),
        boldItalic: await pdf.embedFont(bytes(cuts.boldItalic), { subset: true }),
      });
    }
  }

  const atoms = layoutBody(blocks, {
    pdf,
    faces: {
      base: {
        regular: f.serif,
        bold: f.serifBold,
        italic: f.serifItalic,
        boldItalic: f.serifBoldItalic,
      },
      extra,
    },
    size: pt(36.15),
    lineH: pt(43.39) / MM,
    x: BODY_X,
    width: BODY_W,
    images,
  });

  // What comes back is the sheet the letter's words ended on, which is where
  // the signature goes — poster pages may follow it.
  page = flowBody(atoms, {
    page,
    newPage,
    newBarePage,
    firstTop: BODY_TOP_FIRST,
    contTop: BODY_TOP_CONT,
    bottom: BODY_BOTTOM,
  });

  // ── Signature block, on the last page ──
  const signW = 51.08;
  const signH = signW * (signature.height / signature.width);
  place(page, signature, 14.2, 247.68 + (16.08 - signH) / 2, signW, signH);
  rule(page, 25.09, 56.41, 251.42, 0.27, ORANGE);

  const closeSize = pt(34.03);
  const closeLineH = pt(40.83) / MM;
  const closeDrop = baselineDrop(closeLineH, closeSize / MM);
  const closeLines = [input.closing, '', '', input.signatoryName, input.signatoryRole,
    input.signatoryPhone ? `Mob. : ${input.signatoryPhone}` : ''];

  closeLines.forEach((line, i) => {
    if (!line) return;
    page.drawText(sanitize(line, f.solway), {
      x: 22.41 * MM,
      y: yDown(245.83 + closeDrop + i * closeLineH),
      size: closeSize,
      font: f.solway,
      color: BLACK,
    });
  });

  return pdf.save();
}



export async function generateLetterPdfBase64(input: LetterPdfInput): Promise<string> {
  return Buffer.from(await generateLetterPdf(input)).toString('base64');
}

/** "CSWO-Letter-3A-83.pdf" — slashes are not legal in a filename. */
export function letterFileName(refNo: string): string {
  const safe = String(refNo || 'draft').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `CSWO-Letter-${safe || 'draft'}.pdf`;
}
