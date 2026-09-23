/**
 * api/_lib/receipt-pdf.ts
 *
 * Renders the official CSWO donation / contribution receipt as an A4 PDF,
 * matching the approved "Donation Receipt v2" layout: maroon masthead with
 * the logo and registration line, gold rule, receipt/date strip, a labelled
 * detail table, the maroon amount band with the sum in words, the
 * secretary's signature block, and the maroon contact footer.
 *
 * Built with pdf-lib (pure JS — no headless browser, no native binaries), so
 * it runs inside a normal Vercel serverless function. Every font and image is
 * imported from receipt-assets.ts as base64 rather than read from disk, so
 * the bundler always ships them.
 */

import {
  PDFDocument,
  rgb,
  pushGraphicsState,
  popGraphicsState,
  moveTo,
  appendBezierCurve,
  closePath,
  clip,
  endPath,
  type PDFFont,
  type PDFPage,
  type PDFImage,
  type RGB,
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  FONT_BEBAS,
  FONT_BODY,
  FONT_BODY_BOLD,
  FONT_RUPEE,
  IMG_LOGO,
  IMG_SIGNATURE,
  IMG_ICON_PHONE,
  IMG_ICON_MAIL,
  IMG_ICON_WEB,
} from './receipt-assets.js';

// ── Brand palette (from the approved design) ─────────────────────────────────

const MAROON = rgb(0x7b / 255, 0x1e / 255, 0x24 / 255);
const MAROON_DARK = rgb(0x5c / 255, 0x13 / 255, 0x19 / 255);
const GOLD = rgb(0xd9 / 255, 0xb2 / 255, 0x5a / 255);
const GOLD_LIGHT = rgb(0xdf / 255, 0xb6 / 255, 0x58 / 255);
const GOLD_PALE = rgb(0xeb / 255, 0xd6 / 255, 0xa5 / 255);
const AMBER = rgb(0xf9 / 255, 0xc8 / 255, 0x5b / 255);
const INK = rgb(0x1c / 255, 0x1c / 255, 0x1c / 255);
const MUTED = rgb(0x6b / 255, 0x6b / 255, 0x6b / 255);
const FAINT = rgb(0x9a / 255, 0x9a / 255, 0x9a / 255);
const LABEL_GOLD = rgb(0x8b / 255, 0x7a / 255, 0x57 / 255);
const CREAM = rgb(0xfb / 255, 0xf7 / 255, 0xee / 255);
const CREAM_LINE = rgb(0xea / 255, 0xdf / 255, 0xc6 / 255);
const GREEN = rgb(0x1f / 255, 0x7a / 255, 0x45 / 255);
const DASH = rgb(0xcf / 255, 0xcf / 255, 0xcf / 255);
const WHITE = rgb(1, 1, 1);

// A4 in PDF points (72dpi): 595.28 x 841.89
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 42;

export interface ReceiptPdfInput {
  type: 'donation' | 'contribution';
  receiptNumber: string;
  donorName: string;
  donorEmail?: string;
  amount: number;
  purpose: string;
  paymentMethod: string;
  transactionId?: string;
  /** Pre-formatted date string; defaults to now in IST. */
  date?: string;
}

// ── Number → Indian words (for the "Rupees … only" line) ─────────────────────

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const o = ONES[n % 10];
  return o ? `${t} ${o}` : t;
}

/** Indian numbering: crore / lakh / thousand / hundred. */
function numberToWords(n: number): string {
  if (n === 0) return 'Zero';
  const parts: string[] = [];
  const push = (val: number, label: string) => {
    if (val > 0) parts.push(`${twoDigits(val)} ${label}`.trim());
  };
  push(Math.floor(n / 10000000), 'Crore');
  n %= 10000000;
  push(Math.floor(n / 100000), 'Lakh');
  n %= 100000;
  push(Math.floor(n / 1000), 'Thousand');
  n %= 1000;
  push(Math.floor(n / 100), 'Hundred');
  n %= 100;
  if (n > 0) parts.push(twoDigits(n));
  return parts.join(' ');
}

export function amountInWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  const head = `Rupees ${numberToWords(rupees)}`;
  return paise > 0
    ? `${head} and ${numberToWords(paise)} Paise only`
    : `${head} only`;
}

// ── Text helpers ─────────────────────────────────────────────────────────────

/**
 * Replaces characters the embedded latin fonts cannot render.
 *
 * pdf-lib maps unknown code points to .notdef, which prints as a blank or a
 * hollow box — on a financial document that silently corrupts a donor's name.
 * Substituting a visible '?' at least makes the gap honest. (Donor records are
 * latin in practice; wiring in a Bengali face would need an extra font here.)
 */
function sanitize(text: string, font: PDFFont): string {
  let out = '';
  for (const ch of String(text ?? '')) {
    if (ch === '\n' || ch === '\t') { out += ' '; continue; }
    try {
      font.widthOfTextAtSize(ch, 12);
      out += ch;
    } catch {
      out += '?';
    }
  }
  return out;
}

/** Truncates with an ellipsis so long values never collide with the next column. */
function fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
  let s = sanitize(text, font);
  if (font.widthOfTextAtSize(s, size) <= maxWidth) return s;
  while (s.length > 1 && font.widthOfTextAtSize(s + '…', size) > maxWidth) {
    s = s.slice(0, -1);
  }
  return s + '…';
}

interface Ctx {
  page: PDFPage;
  bebas: PDFFont;
  body: PDFFont;
  bodyBold: PDFFont;
  rupee: PDFFont;
}

/** Bezier constant for approximating a circular arc with four curves. */
const KAPPA = 0.5522847498;

/**
 * Draws an image clipped to a circle — a round logo badge.
 *
 * pdf-lib has no clipping helper, so the circle is emitted as a raw path and
 * installed as the clip region between a graphics-state push/pop. Simply
 * drawing the square logo over a white circle (the previous approach) left
 * the artwork's white corners covering the circle, so it rendered as a white
 * box on the maroon masthead.
 *
 * `inset` reproduces the design's padding: the artwork is centred and shrunk
 * inside the badge so it never touches the rim.
 */
function drawCircularImage(
  page: PDFPage,
  image: PDFImage,
  centerX: number,
  centerY: number,
  radius: number,
  inset = 0,
) {
  const r = radius;
  page.drawCircle({ x: centerX, y: centerY, size: r, color: WHITE });

  page.pushOperators(
    pushGraphicsState(),
    moveTo(centerX + r, centerY),
    appendBezierCurve(
      centerX + r, centerY + r * KAPPA,
      centerX + r * KAPPA, centerY + r,
      centerX, centerY + r,
    ),
    appendBezierCurve(
      centerX - r * KAPPA, centerY + r,
      centerX - r, centerY + r * KAPPA,
      centerX - r, centerY,
    ),
    appendBezierCurve(
      centerX - r, centerY - r * KAPPA,
      centerX - r * KAPPA, centerY - r,
      centerX, centerY - r,
    ),
    appendBezierCurve(
      centerX + r * KAPPA, centerY - r,
      centerX + r, centerY - r * KAPPA,
      centerX + r, centerY,
    ),
    closePath(),
    clip(),
    endPath(),
  );

  const size = (r - inset) * 2;
  page.drawImage(image, {
    x: centerX - size / 2,
    y: centerY - size / 2,
    width: size,
    height: size,
  });

  page.pushOperators(popGraphicsState());
}

function text(
  ctx: Ctx,
  str: string,
  x: number,
  y: number,
  opts: { font?: PDFFont; size?: number; color?: RGB; maxWidth?: number } = {},
) {
  const font = opts.font ?? ctx.body;
  const size = opts.size ?? 11;
  const value = opts.maxWidth
    ? fit(str, font, size, opts.maxWidth)
    : sanitize(str, font);
  ctx.page.drawText(value, { x, y, size, font, color: opts.color ?? INK });
}

/**
 * Draws "₹<amount>" using the single-glyph rupee font for the symbol and the
 * display face for the digits, since Bebas Neue has no rupee glyph of its own.
 */
function drawAmount(ctx: Ctx, amount: number, rightX: number, y: number, size: number) {
  const digits = amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbolSize = size * 0.86;
  const digitsW = ctx.bebas.widthOfTextAtSize(digits, size);
  const symbolW = ctx.rupee.widthOfTextAtSize('₹', symbolSize);
  const startX = rightX - digitsW - symbolW - 2;
  ctx.page.drawText('₹', {
    x: startX, y, size: symbolSize, font: ctx.rupee, color: WHITE,
  });
  ctx.page.drawText(digits, {
    x: startX + symbolW + 2, y, size, font: ctx.bebas, color: WHITE,
  });
}

// ── Sheet parts ──────────────────────────────────────────────────────────────
//
// The receipt and the 80G certificate are the same sheet with different
// contents, so the masthead, strip, rows, band, signature and footer are drawn
// by shared helpers and each document only decides what goes between them.

interface Sheet extends Ctx {
  pdf: PDFDocument;
  signature: PDFImage;
  icons: [PDFImage, PDFImage, PDFImage];
}

const HEADER_H = 104;

async function openSheet(meta: { title: string; subject: string }): Promise<Sheet> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const dec = (b64: string) => Uint8Array.from(Buffer.from(b64, 'base64'));

  const bebas = await pdf.embedFont(dec(FONT_BEBAS), { subset: true });
  const body = await pdf.embedFont(dec(FONT_BODY), { subset: true });
  const bodyBold = await pdf.embedFont(dec(FONT_BODY_BOLD), { subset: true });
  const rupee = await pdf.embedFont(dec(FONT_RUPEE), { subset: true });

  const logo = await pdf.embedJpg(dec(IMG_LOGO));
  const signature = await pdf.embedPng(dec(IMG_SIGNATURE));
  const iconPhone = await pdf.embedPng(dec(IMG_ICON_PHONE));
  const iconMail = await pdf.embedPng(dec(IMG_ICON_MAIL));
  const iconWeb = await pdf.embedPng(dec(IMG_ICON_WEB));

  const page = pdf.addPage([PAGE_W, PAGE_H]);

  pdf.setTitle(meta.title);
  pdf.setAuthor('Chhatradol Social Welfare Organization');
  pdf.setSubject(meta.subject);
  pdf.setProducer('CSWO Digital Platform');
  pdf.setCreator('chhatradol.org');

  const sheet: Sheet = {
    pdf, page, bebas, body, bodyBold, rupee, signature,
    icons: [iconPhone, iconMail, iconWeb],
  };
  drawMasthead(sheet, logo);
  drawFooter(sheet);
  return sheet;
}

function drawMasthead(s: Sheet, logo: PDFImage) {
  const { page, bebas, body } = s;
  const y = PAGE_H;
  page.drawRectangle({ x: 0, y: y - HEADER_H, width: PAGE_W, height: HEADER_H, color: MAROON });

  const logoSize = 66;
  const logoX = MARGIN;
  const logoRadius = logoSize / 2;
  // Round white badge with the artwork clipped inside it, matching the design.
  drawCircularImage(page, logo, logoX + logoRadius, y - HEADER_H / 2, logoRadius, 3);

  const titleX = logoX + logoSize + 18;
  const titleW = PAGE_W - titleX - MARGIN;
  // The org name is long; drop a size step rather than let it clip.
  let orgSize = 25;
  const orgName = 'CHHATRADOL SOCIAL WELFARE ORGANIZATION';
  while (orgSize > 14 && bebas.widthOfTextAtSize(orgName, orgSize) > titleW) orgSize -= 0.5;
  text(s, orgName, titleX, y - 52, { font: bebas, size: orgSize, color: WHITE });
  text(
    s,
    'Reg. No.: IV-100200047/2026  ·  DARPAN ID: WB/2026/1138665',
    titleX,
    y - 72,
    { font: body, size: 8.6, color: GOLD_LIGHT, maxWidth: titleW },
  );

  page.drawRectangle({ x: 0, y: y - HEADER_H - 6, width: PAGE_W, height: 6, color: GOLD });
}

/** Centred document title and the cream reference/date strip. Returns the y below it. */
function drawTitleAndStrip(
  s: Sheet,
  docTitle: string,
  refLabel: string,
  refValue: string,
  dateStr: string,
): number {
  const { bebas, body, bodyBold, page } = s;
  let y = PAGE_H - HEADER_H - 6;

  y -= 40;
  const titleSize = 25;
  const tW = bebas.widthOfTextAtSize(docTitle, titleSize);
  text(s, docTitle, (PAGE_W - tW) / 2, y, { font: bebas, size: titleSize, color: MAROON });

  y -= 30;
  const stripH = 46;
  const stripW = PAGE_W - MARGIN * 2;
  page.drawRectangle({
    x: MARGIN, y: y - stripH, width: stripW, height: stripH,
    color: CREAM, borderColor: CREAM_LINE, borderWidth: 1,
  });
  text(s, refLabel, MARGIN + 14, y - 17, { font: body, size: 7.6, color: LABEL_GOLD });
  text(s, refValue, MARGIN + 14, y - 33, {
    font: bodyBold, size: 11, color: INK, maxWidth: stripW / 2 - 24,
  });

  const dateLabelW = body.widthOfTextAtSize('DATE', 7.6);
  const dateRight = MARGIN + stripW - 14;
  text(s, 'DATE', dateRight - dateLabelW, y - 17, { font: body, size: 7.6, color: LABEL_GOLD });
  const dateFitted = fit(dateStr, bodyBold, 11, stripW / 2 - 24);
  text(s, dateFitted, dateRight - bodyBold.widthOfTextAtSize(dateFitted, 11), y - 33, {
    font: bodyBold, size: 11, color: INK,
  });

  return y - stripH;
}

/** Label/value rows. `y` is the first row's baseline; returns the y below the last. */
function drawRows(s: Sheet, rows: Array<[string, string, RGB?]>, y: number, rowH = 27): number {
  const labelX = MARGIN + 4;
  const valueX = MARGIN + 172;
  const valueMaxW = PAGE_W - MARGIN - valueX - 4;

  rows.forEach(([label, value, color], i) => {
    const rowY = y - i * rowH;
    text(s, label, labelX, rowY, { font: s.body, size: 10, color: MUTED });
    text(s, value, valueX, rowY, {
      font: s.bodyBold, size: 11, color: color ?? INK, maxWidth: valueMaxW,
    });
    if (i < rows.length - 1) {
      s.page.drawLine({
        start: { x: MARGIN, y: rowY - 9 },
        end: { x: PAGE_W - MARGIN, y: rowY - 9 },
        thickness: 0.5,
        color: rgb(0.93, 0.91, 0.87),
      });
    }
  });
  return y - rows.length * rowH;
}

/** The maroon amount band, its top edge at `y`. Returns the y below it. */
function drawBand(s: Sheet, amount: number, y: number): number {
  const bandH = 66;
  const stripW = PAGE_W - MARGIN * 2;
  s.page.drawRectangle({
    x: MARGIN, y: y - bandH, width: stripW, height: bandH, color: MAROON,
  });
  text(s, 'AMOUNT RECEIVED', MARGIN + 22, y - 26, { font: s.body, size: 10, color: AMBER });
  text(s, amountInWords(amount), MARGIN + 22, y - 45, {
    font: s.body, size: 10, color: GOLD_PALE, maxWidth: stripW - 200,
  });
  drawAmount(s, amount, MARGIN + stripW - 22, y - 46, 30);
  return y - bandH;
}

/** Signature block and the computer-generated note below it. */
function drawSignatureAndNote(s: Sheet, y: number, note: string) {
  const { page, body, bodyBold } = s;
  const sigW = 132;
  const sigH = 48;
  const sigRight = PAGE_W - MARGIN - 8;
  const sigX = sigRight - sigW;
  const sigY = y - 84;
  page.drawImage(s.signature, { x: sigX, y: sigY, width: sigW, height: sigH });
  page.drawLine({
    start: { x: sigX - 14, y: sigY - 4 },
    end: { x: sigRight + 6, y: sigY - 4 },
    thickness: 0.8,
    color: INK,
  });
  const namePos = sigX + sigW / 2;
  const sigName = 'Sayan Samanta';
  const sigRole = 'Secretary, CSWO';
  text(s, sigName, namePos - bodyBold.widthOfTextAtSize(sigName, 10.5) / 2, sigY - 18, {
    font: bodyBold, size: 10.5, color: INK,
  });
  text(s, sigRole, namePos - body.widthOfTextAtSize(sigRole, 9.5) / 2, sigY - 32, {
    font: body, size: 9.5, color: MUTED,
  });

  const noteY = sigY - 62;
  for (let x = MARGIN; x < PAGE_W - MARGIN; x += 6) {
    page.drawLine({
      start: { x, y: noteY + 14 },
      end: { x: Math.min(x + 3, PAGE_W - MARGIN), y: noteY + 14 },
      thickness: 0.6,
      color: DASH,
    });
  }
  text(s, note, (PAGE_W - body.widthOfTextAtSize(note, 9)) / 2, noteY, {
    font: body, size: 9, color: FAINT,
  });
}

function drawFooter(s: Sheet) {
  const { page, body, bodyBold } = s;
  const footerH = 58;
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: footerH, color: MAROON_DARK });
  page.drawRectangle({ x: 0, y: footerH, width: PAGE_W, height: 6, color: GOLD });

  const [iconPhone, iconMail, iconWeb] = s.icons;
  const cells: Array<[PDFImage, string, string]> = [
    [iconPhone, 'Contact No.', '7811073412 / 7074074110'],
    [iconMail, 'Email', 'info@chhatradol.org'],
    [iconWeb, 'Website', 'www.chhatradol.org'],
  ];
  const cellW = PAGE_W / cells.length;
  cells.forEach(([icon, label, value], i) => {
    const cx = i * cellW;
    const iconSize = 20;
    const labelW = Math.max(
      bodyBold.widthOfTextAtSize(label, 9),
      body.widthOfTextAtSize(value, 9),
    );
    const groupW = iconSize + 9 + labelW;
    const gx = cx + (cellW - groupW) / 2;
    page.drawImage(icon, { x: gx, y: footerH / 2 - iconSize / 2, width: iconSize, height: iconSize });
    text(s, label, gx + iconSize + 9, footerH / 2 + 3, { font: bodyBold, size: 9, color: WHITE });
    text(s, value, gx + iconSize + 9, footerH / 2 - 10, { font: body, size: 9, color: WHITE });
    if (i > 0) {
      page.drawLine({
        start: { x: cx, y: 12 },
        end: { x: cx, y: footerH - 12 },
        thickness: 0.7,
        color: GOLD_LIGHT,
      });
    }
  });
}

/** Greedy word wrap to `maxWidth`. */
function wrap(str: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitize(str, font).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function nowIst(): string {
  return new Date().toLocaleString('en-IN', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

// ── Receipt ──────────────────────────────────────────────────────────────────

export async function generateReceiptPdf(input: ReceiptPdfInput): Promise<Uint8Array> {
  const s = await openSheet({
    title: `Donation Receipt ${input.receiptNumber}`,
    subject: 'Official payment receipt',
  });

  const isContribution = input.type === 'contribution';
  let y = drawTitleAndStrip(
    s,
    isContribution ? 'CONTRIBUTION RECEIPT' : 'DONATION RECEIPT',
    'RECEIPT NO.',
    input.receiptNumber,
    input.date || nowIst(),
  );

  y -= 26;
  const rows: Array<[string, string, RGB?]> = [
    [isContribution ? 'Member Name' : 'Donor Name', input.donorName || '—'],
    ['Email', input.donorEmail || '—'],
    [isContribution ? 'Contribution For' : 'Purpose of Donation', input.purpose || '—'],
    ['Payment Method', input.paymentMethod || '—'],
  ];
  if (input.transactionId) rows.push(['Transaction ID', input.transactionId]);
  rows.push(['Payment Status', 'Paid · Successful', GREEN]);
  y = drawRows(s, rows, y) - 12;

  y = drawBand(s, input.amount, y);
  drawSignatureAndNote(s, y, 'This is a computer-generated receipt and does not require a physical signature.');

  return s.pdf.save();
}

// ── 80G certificate ──────────────────────────────────────────────────────────

export interface CertificatePdfInput {
  receiptNumber: string;
  donorName: string;
  amount: number;
  /** Financial year, e.g. "2026-27". */
  fy: string;
  date: string;
  purpose?: string;
  paymentRef?: string;
  reg80g?: string;
  reg12a?: string;
  orgPan?: string;
}

/**
 * The tax-exemption certificate, mirroring printCertificate() in
 * src/lib/receipt.ts so the emailed copy and the downloaded one agree.
 * The registration numbers get their own strip rather than a footnote: an
 * assessing officer looks for 80G, 12A and the trust PAN first.
 */
export async function generateCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const s = await openSheet({
    title: `80G Certificate ${input.receiptNumber}`,
    subject: 'Donation certificate under Section 80G',
  });

  let y = drawTitleAndStrip(
    s,
    'DONATION CERTIFICATE U/S 80G',
    'CERTIFICATE NO.',
    input.receiptNumber,
    input.date || nowIst(),
  );

  y -= 22;
  const para =
    'This is to certify that the donation detailed below has been received with thanks by ' +
    'Chhatradol Social Welfare Organization. Donations to this organisation are eligible for ' +
    'deduction under Section 80G of the Income Tax Act, 1961.';
  for (const line of wrap(para, s.body, 10, PAGE_W - MARGIN * 2)) {
    text(s, line, MARGIN, y, { font: s.body, size: 10, color: INK });
    y -= 15;
  }

  y -= 14;
  const rows: Array<[string, string, RGB?]> = [
    ['Financial Year', input.fy],
    ['Donor Name', input.donorName || '—'],
  ];
  if (input.purpose) rows.push(['Purpose', input.purpose]);
  if (input.paymentRef) rows.push(['Payment Ref.', input.paymentRef]);
  y = drawRows(s, rows, y, 25) - 10;

  y = drawBand(s, input.amount, y);

  // Registration particulars: one cream strip with a cell per number.
  const regs: Array<[string, string]> = [];
  if (input.reg80g) regs.push(['80G REGISTRATION', input.reg80g]);
  if (input.reg12a) regs.push(['12A REGISTRATION', input.reg12a]);
  if (input.orgPan) regs.push(['TRUST PAN', input.orgPan]);
  if (regs.length) {
    y -= 16;
    const stripH = 44;
    const stripW = PAGE_W - MARGIN * 2;
    s.page.drawRectangle({
      x: MARGIN, y: y - stripH, width: stripW, height: stripH,
      color: CREAM, borderColor: CREAM_LINE, borderWidth: 1,
    });
    const cellW = stripW / regs.length;
    regs.forEach(([label, value], i) => {
      const cx = MARGIN + i * cellW + 14;
      text(s, label, cx, y - 16, { font: s.body, size: 7.6, color: LABEL_GOLD });
      text(s, value, cx, y - 32, { font: s.bodyBold, size: 10.5, color: INK, maxWidth: cellW - 24 });
    });
    y -= stripH;
  }

  y -= 20;
  text(s, 'Place: Narajole, Daspur, Paschim Medinipur - 721211', MARGIN, y, {
    font: s.body, size: 10, color: MUTED,
  });

  drawSignatureAndNote(s, y + 10, 'Computer-generated certificate · www.chhatradol.org');

  return s.pdf.save();
}

export async function generateCertificatePdfBase64(input: CertificatePdfInput): Promise<string> {
  const bytes = await generateCertificatePdf(input);
  return Buffer.from(bytes).toString('base64');
}

/** Convenience wrapper: the PDF as a base64 string, for email attachments. */
export async function generateReceiptPdfBase64(input: ReceiptPdfInput): Promise<string> {
  const bytes = await generateReceiptPdf(input);
  return Buffer.from(bytes).toString('base64');
}

/** Stable, human-meaningful filename for the attachment / download. */
export function receiptFileName(receiptNumber: string): string {
  const safe = String(receiptNumber || 'receipt').replace(/[^A-Za-z0-9._-]/g, '-');
  return `${safe}.pdf`;
}
