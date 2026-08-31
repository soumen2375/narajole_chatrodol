/**
 * api/_lib/letter-pdf.ts
 *
 * Renders a secretary's letter on the official CSWO letterhead as an A4 PDF.
 *
 * The sheet itself — bands, masthead, contact strip, rules, watermark, footer
 * — lives in letterhead-pdf.ts, shared with the donation receipt so the two
 * cannot drift apart. What remains here is what makes a letter a letter: the
 * addressee, the subject, justified body copy that flows across continuation
 * sheets, and the signature block.
 */

import { PDFDocument } from 'pdf-lib';
import {
  BLACK, LABEL_RED, MM, ORANGE,
  baselineDrop, drawLine, drawRefAndDate, loadLetterheadKit,
  newLetterheadPage, place, pt, rule, sanitize, wrapWords, yDown,
} from './letterhead-pdf.js';

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
  /** Paragraphs separated by a blank line, as typed in the compose box. */
  body: string;
  closing: string;
  signatoryName: string;
  signatoryRole: string;
  signatoryPhone: string;
  /** PNG/JPEG bytes of an uploaded signature; the master's is used when absent. */
  signatureImage?: Uint8Array | null;
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
  // Every line is laid out first, then poured into pages, so the point where
  // the text overruns page 1 is known before anything is drawn.
  const bodySize = pt(36.15);
  const bodyLineH = pt(43.39) / MM;
  const bodyDrop = baselineDrop(bodyLineH, bodySize / MM);

  interface BodyLine { words: string[]; justify: boolean }
  const bodyLines: BodyLine[] = [];
  for (const para of input.body.split(/\n\s*\n/)) {
    const trimmed = para.trim();
    if (!trimmed) { bodyLines.push({ words: [], justify: false }); continue; }
    const wrapped = wrapWords(trimmed, f.serif, bodySize, BODY_W * MM);
    wrapped.forEach((words, i) => {
      bodyLines.push({ words, justify: i < wrapped.length - 1 });
    });
    bodyLines.push({ words: [], justify: false }); // blank line between paragraphs
  }
  while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].words.length === 0) bodyLines.pop();

  let cursorTop = BODY_TOP_FIRST;
  for (const line of bodyLines) {
    if (cursorTop + bodyLineH > BODY_BOTTOM) {
      page = newPage();
      cursorTop = BODY_TOP_CONT;
    }
    drawLine(page, line.words, BODY_X * MM, yDown(cursorTop + bodyDrop), {
      font: f.serif, size: bodySize, color: BLACK, width: BODY_W * MM, justify: line.justify,
    });
    cursorTop += bodyLineH;
  }

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
