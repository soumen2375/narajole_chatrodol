/**
 * api/_lib/letter-body-pdf.ts
 *
 * Sets the formatted letter body on the letterhead: styled runs wrapped into
 * lines, headings, bulleted and numbered lists, quotations, rules, clickable
 * links and images, poured across as many sheets as it takes.
 *
 * Two passes, for the same reason the plain-text renderer had two: everything
 * is laid out into atoms of known height before a single one is drawn, so the
 * page a line lands on is decided by measurement rather than by luck. An atom
 * is one line of text, one rule or one image — an image is never split, and a
 * page break is honoured wherever the secretary put it.
 *
 * RICH mirrors src/lib/letter-body.ts. The browser gets those proportions as
 * CSS `em`, this file gets them as multiples of the body size in millimetres;
 * change one, change the other, or the preview and the posted letter drift.
 */

import { PDFString, rgb, type PDFDocument, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { BLACK, MM, PAGE_H, PAGE_W, baselineDrop, sanitize, yDown } from './letterhead-pdf.js';
import type { Align, Block, Run } from './letter-richtext.js';

// ── Proportions (multiples of the body font size) ────────────────────────────

const RICH = {
  lineHeight: 1.2,
  paragraphGap: 1.2,
  heading: {
    1: { size: 1.5, before: 1.2, after: 0.5 },
    2: { size: 1.28, before: 1.1, after: 0.4 },
    3: { size: 1.12, before: 1.0, after: 0.35 },
  },
  list: { indent: 1.8, markerGap: 0.75, itemGap: 0.3, gap: 0.9 },
  quote: { indent: 1.6, rule: 0.13, gap: 0.9 },
  rule: { gap: 0.9, thickness: 0.06 },
  image: { gap: 0.6 },
} as const;

/**
 * How far one tab carries, in points.
 *
 * Half an inch from the left of the body column — Word's default, and the same
 * distance `tab-size` gives the editor and the preview in
 * src/lib/letter-body.ts. Change one, change the other.
 */
const TAB = 12.7 * MM;

const hex = (value: string) =>
  rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  );

/**
 * The ink colours and highlighter colours the editor offers.
 *
 * These mirror LETTER_COLORS and LETTER_HIGHLIGHTS in src/lib/letter-body.ts,
 * which is where the browser reads the same hexes from. Change one, change
 * the other, or a highlighted line will not print the colour it showed.
 */
const INK_COLORS: Record<string, ReturnType<typeof rgb>> = {
  black: hex('000000'),
  grey: hex('57534E'),
  red: hex('C00000'),
  orange: hex('B45309'),
  green: hex('0F7B3F'),
  teal: hex('0C756F'),
  blue: hex('0563C1'),
  purple: hex('7030A0'),
};

const HIGHLIGHTS: Record<string, ReturnType<typeof rgb>> = {
  yellow: hex('FDE68A'),
  green: hex('BBF7D0'),
  cyan: hex('BAE6FD'),
  pink: hex('FBCFE8'),
  grey: hex('E5E5E5'),
};

const LINK_BLUE = rgb(0x05 / 255, 0x63 / 255, 0xc1 / 255);
const QUOTE_INK = rgb(0x57 / 255, 0x53 / 255, 0x4e / 255);
const RULE_GREY = rgb(0xc9 / 255, 0xc5 / 255, 0xc0 / 255);

// ── Input ────────────────────────────────────────────────────────────────────

export interface BodyFonts {
  regular: PDFFont;
  bold: PDFFont;
  italic: PDFFont;
  boldItalic: PDFFont;
}

/**
 * Every face this letter may be set in.
 *
 * `base` is the letterhead's own Times New Roman, used by anything that did
 * not ask for something else — list markers and the "picture missing" note
 * included. `extra` holds only the faces this particular letter actually
 * uses, because each one embedded is a font file carried in the PDF.
 */
export interface Faces {
  base: BodyFonts;
  extra: Map<string, BodyFonts>;
}

/** Sizes a run may be given, in points; outside this it is a paste artefact. */
const MIN_SIZE = 6;
const MAX_SIZE = 72;

const runSize = (run: Run, fallback: number) =>
  (run.size && run.size >= MIN_SIZE && run.size <= MAX_SIZE ? run.size : fallback);

export interface BodyLayoutOptions {
  pdf: PDFDocument;
  faces: Faces;
  /** Body font size, in points. */
  size: number;
  /** Body line height, in millimetres. */
  lineH: number;
  /** Left edge and measure of the body column, in millimetres. */
  x: number;
  width: number;
  /** Embedded images by source URL; a null means the file would not load. */
  images: Map<string, PDFImage | null>;
}

/**
 * One thing that occupies a known height on a sheet: a line of text, a rule,
 * an image. `spaceBefore` is the margin above it, dropped when the atom falls
 * at the top of a page — as a margin at the top of a printed page should be.
 */
interface Atom {
  height: number;
  spaceBefore: number;
  breakBefore?: boolean;
  /**
   * A picture that takes a sheet of its own. It is not poured into the body
   * column at all: it is handed a bare page — no letterhead, no footer — and
   * covers it, as the poster page of the office master deck does.
   */
  fullPage?: boolean;
  /** `avail` is the height left on the sheet; only an image makes use of it. */
  draw: (page: PDFPage, top: number, avail: number) => void;
}

// ── Wrapping styled runs ─────────────────────────────────────────────────────

interface Token {
  text: string;
  width: number;
  font: PDFFont;
  /** Points. A run may carry its own, so one line can hold several. */
  size: number;
  /** The measured whitespace before this token, in points. */
  gap: number;
  /** Whether that gap is spaces, and may therefore take justification slack. */
  elastic: boolean;
  run: Run;
}

interface Line {
  tokens: Token[];
  /** Sum of token widths plus the single spaces between them. */
  width: number;
  gaps: number;
  /** Set on every line of a paragraph but its last. */
  justify: boolean;
  /**
   * The largest size on the line, in points. It sets the line's height and
   * its baseline — the same thing a CSS line box does with the tallest inline
   * box it contains, which is how the preview and this agree.
   */
  size: number;
}

function fontFor(run: Run, faces: Faces): PDFFont {
  // A face the letter names but the renderer could not embed falls back to
  // the letterhead's own, rather than refusing to print the words.
  const cuts = (run.font ? faces.extra.get(run.font) : undefined) ?? faces.base;
  if (run.bold && run.italic) return cuts.boldItalic;
  if (run.bold) return cuts.bold;
  if (run.italic) return cuts.italic;
  return cuts.regular;
}

/**
 * The whitespace before a word, measured where it actually falls.
 *
 * Spaces are spaces. A tab carries to the next stop, counted from the left of
 * the body column — which is why this needs `from`, the width of the line so
 * far, and why it cannot be worked out once and reused.
 */
function measureGap(
  whitespace: string,
  from: number,
  font: PDFFont,
  size: number,
): { width: number; elastic: boolean } {
  let cursor = from;
  let elastic = false;
  for (const ch of whitespace) {
    if (ch === '\t') {
      // A hair is added before rounding up so that a tab landing exactly on a
      // stop moves to the next one rather than standing still.
      cursor = (Math.floor((cursor + 0.01) / TAB) + 1) * TAB;
    } else {
      cursor += font.widthOfTextAtSize(' ', size);
      elastic = true;
    }
  }
  return { width: cursor - from, elastic };
}

/**
 * Breaks runs into lines that fit `maxWidth`.
 *
 * Runs are tokenised across their own boundaries so that "we are <b>very</b>
 * grateful" keeps its spaces where a naive per-run split would lose them, and
 * a bolded word is measured in the bold face rather than the regular one.
 *
 * Each word carries the whitespace that precedes it rather than a bare "there
 * was a space here" flag, so the two spaces after a full stop print as two and
 * a tab prints as a tab. Whitespace pending at a line break is dropped, the
 * way a browser hangs it past the end of the line.
 */
function wrapRuns(runs: Run[], faces: Faces, size: number, maxWidth: number): Line[] {
  const lines: Line[] = [];
  let tokens: Token[] = [];
  /** Where the word being built started; a cluster is never split. */
  let clusterStart = 0;
  /** Whitespace seen since the last word, and the face it was typed in. */
  let pending = '';
  let pendingFont: PDFFont | null = null;
  let pendingSize = size;

  const widthOf = (list: Token[]) =>
    list.reduce((total, token) => total + token.gap + token.width, 0);

  const endLine = (line: Token[], justify: boolean) => {
    lines.push({
      tokens: line,
      width: widthOf(line),
      gaps: line.filter((token, i) => i > 0 && token.elastic).length,
      justify,
      size: line.reduce((tallest, token) => Math.max(tallest, token.size), size),
    });
  };

  const newLine = (kept: Token[]) => {
    // A line always opens hard against the margin, whatever whitespace was
    // pending when it broke.
    tokens = kept.length > 0 ? [{ ...kept[0], gap: 0, elastic: false }, ...kept.slice(1)] : [];
    clusterStart = 0;
    pending = '';
  };

  for (const run of runs) {
    // A <br> arrives as a run holding a single newline.
    if (run.text === '\n') {
      endLine(tokens, false);
      newLine([]);
      continue;
    }

    const font = fontFor(run, faces);
    const points = runSize(run, size);

    for (const chunk of run.text.split(/(\s+)/)) {
      if (!chunk) continue;

      if (/^\s+$/.test(chunk)) {
        pending += chunk;
        pendingFont = font;
        pendingSize = points;
        continue;
      }

      const text = sanitize(chunk, font);
      const width = font.widthOfTextAtSize(text, points);
      const at = widthOf(tokens);
      const gap = pending
        ? measureGap(pending, at, pendingFont ?? font, pendingSize)
        : { width: 0, elastic: false };
      pending = '';

      const token: Token = {
        text,
        width,
        font,
        size: points,
        gap: gap.width,
        elastic: gap.elastic,
        run,
      };

      if (gap.width > 0) clusterStart = tokens.length;

      if (tokens.length > 0 && at + gap.width + width > maxWidth) {
        if (gap.width > 0) {
          // An ordinary word that will not fit: it starts the next line.
          endLine(tokens, true);
          newLine([token]);
          continue;
        }

        const carried = tokens.slice(clusterStart);
        if (carried.length > 0) {
          // This token is glued to the word before it — a full stop typed
          // after an italic word is a separate run but not a separate word —
          // so the whole word moves to the next line rather than being split.
          endLine(tokens.slice(0, clusterStart), true);
          newLine([...carried, token]);
          continue;
        }
        // The line is one unbroken word already; it has nowhere to go and is
        // allowed to run past the measure rather than vanish.
      }

      tokens.push(token);
    }
  }

  endLine(tokens, false);

  // An empty paragraph is one empty line — the blank line somebody left by
  // pressing Enter twice, which the preview leaves room for too.
  if (lines.length === 1) return lines;
  return lines.filter((line, i) => line.tokens.length > 0 || i < lines.length - 1);
}

// ── Drawing one line ─────────────────────────────────────────────────────────

interface DrawLineOptions {
  x: number;
  width: number;
  size: number;
  lineH: number;
  align: Align;
  color: ReturnType<typeof rgb>;
  pdf: PDFDocument;
}

/**
 * Draws a laid-out line, with its underlines, strikes and link hotspots.
 *
 * Justification spreads the slack across the spaces, exactly as the plain-text
 * renderer did; a link's clickable rectangle is measured from where the words
 * actually landed, so it follows the stretched line rather than the ideal one.
 */
function drawRichLine(page: PDFPage, line: Line, top: number, o: DrawLineOptions) {
  if (line.tokens.length === 0) return;

  // The line sits on one baseline whatever sizes it holds, seated under its
  // tallest word — as a line of mixed sizes is set anywhere else.
  const baseline = yDown(top + baselineDrop(o.lineH, line.size / MM));
  const justify = o.align === 'justify' && line.justify && line.gaps > 0;
  const slack = o.width * MM - line.width;
  const extra = justify ? slack / line.gaps : 0;

  let cursor = o.x * MM;
  if (!justify) {
    if (o.align === 'center') cursor += slack / 2;
    else if (o.align === 'right') cursor += slack;
  }

  // Where every word lands is worked out before anything is drawn, because a
  // highlighter has to go down before the words it sits behind.
  const placed: { token: Token; from: number; to: number; gap: number }[] = [];

  line.tokens.forEach((token, i) => {
    // Justification stretches the spaces and leaves the tabs alone, so text
    // tabbed into a column stays in its column.
    const gap = token.gap + (i > 0 && token.elastic ? extra : 0);
    cursor += gap;
    placed.push({ token, from: cursor, to: cursor + token.width, gap });
    cursor += token.width;
  });

  /**
   * Contiguous stretches of the line sharing one value — a highlight, an
   * underline, a link. They run over the spaces inside them, as a word
   * processor draws them, rather than word by word.
   */
  const stretches = (key: (token: Token) => string, coverGaps = false) => {
    const out: { key: string; from: number; to: number; size: number }[] = [];
    for (const item of placed) {
      const value = key(item.token);
      const last = out[out.length - 1];
      if (last && last.key === value) {
        last.to = item.to;
        last.size = Math.max(last.size, item.token.size);
      } else {
        // A highlighter covers the space that opens a stretch, the way a pen
        // drawn across the words would; a rule under them does not.
        out.push({ key: value, from: item.from - (coverGaps ? item.gap : 0), to: item.to, size: item.token.size });
      }
    }
    return out.filter((stretch) => stretch.key !== '');
  };

  // The highlighter, behind everything. Its box is the text's own — from just
  // under the descenders to just over the capitals — so it matches the band
  // the browser paints behind the same words.
  for (const stretch of stretches((token) => token.run.highlight ?? '', true)) {
    const paint = HIGHLIGHTS[stretch.key];
    if (!paint) continue;
    page.drawRectangle({
      x: stretch.from,
      y: baseline - stretch.size * 0.22,
      width: stretch.to - stretch.from,
      height: stretch.size * 1.11,
      color: paint,
    });
  }

  for (const item of placed) {
    const { token } = item;
    page.drawText(token.text, {
      x: item.from,
      y: baseline,
      size: token.size,
      font: token.font,
      color: token.run.href ? LINK_BLUE : (INK_COLORS[token.run.color ?? ''] ?? o.color),
    });
  }

  const decorate = (key: (token: Token) => string, offset: number) => {
    for (const stretch of stretches(key)) {
      page.drawLine({
        start: { x: stretch.from, y: baseline + stretch.size * offset },
        end: { x: stretch.to, y: baseline + stretch.size * offset },
        thickness: stretch.size * 0.045,
        color: stretch.key === 'link' ? LINK_BLUE : (INK_COLORS[stretch.key] ?? o.color),
      });
    }
  };

  // A rule takes the colour of the words it runs under, so a red underlined
  // phrase is underlined in red.
  const marked = (token: Token) => (token.run.href ? 'link' : (token.run.color ?? 'ink'));
  decorate((token) => (token.run.underline || token.run.href ? marked(token) : ''), -0.11);
  decorate((token) => (token.run.strike ? marked(token) : ''), 0.26);

  for (const stretch of stretches((token) => token.run.href ?? '')) {
    addLinkAnnotation(
      o.pdf, page, stretch.key,
      stretch.from, baseline - stretch.size * 0.25,
      stretch.to, baseline + stretch.size * 0.9,
    );
  }
}

/**
 * Makes a stretch of a line clickable.
 *
 * pdf-lib has no link helper, so the annotation dictionary is written by hand
 * and hung off the page. Without it a letter's links would print blue and
 * underlined but do nothing when the addressee reads the PDF on screen —
 * which for an invitation carrying a video link is most of the point.
 */
function addLinkAnnotation(
  pdf: PDFDocument,
  page: PDFPage,
  href: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const annot = pdf.context.obj({
    Type: 'Annot',
    Subtype: 'Link',
    Rect: [x1, y1, x2, y2],
    Border: [0, 0, 0],
    F: 4, // print the annotation
    A: pdf.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(href) }),
  });
  page.node.addAnnot(pdf.context.register(annot));
}

// ── Laying out the blocks ────────────────────────────────────────────────────

/** Turns the parsed body into atoms, in order, with their margins. */
export function layoutBody(blocks: Block[], o: BodyLayoutOptions): Atom[] {
  const atoms: Atom[] = [];
  const sizeMm = o.size / MM;
  const em = (multiple: number) => multiple * sizeMm;

  /** The margin left by the previous block; collapses with the next one's. */
  let pending = 0;

  const push = (atom: Omit<Atom, 'spaceBefore'>, spaceBefore: number) => {
    atoms.push({ ...atom, spaceBefore });
  };

  const textBlock = (
    runs: Run[],
    opts: {
      size: number; lineH: number; align: Align; indent: number;
      before: number; after: number; color?: ReturnType<typeof rgb>;
      quote?: boolean; marker?: { text: string; font: PDFFont; size: number };
    },
  ) => {
    const x = o.x + opts.indent;
    const width = o.width - opts.indent;
    const lines = wrapRuns(runs, o.faces, opts.size, width * MM);
    const color = opts.color ?? BLACK;

    lines.forEach((line, i) => {
      const isFirst = i === 0;
      // A line holding a word larger than the block's own size is taller, by
      // the same rule a CSS line box grows around its tallest inline box; a
      // line of only smaller words keeps the block's height, because the
      // block's own strut is still in it.
      const lineH = line.size > opts.size ? (line.size / MM) * RICH.lineHeight : opts.lineH;
      push(
        {
          height: lineH,
          draw: (page, top) => {
            if (opts.quote) {
              // The quotation rule is drawn line by line, so it survives a
              // page break instead of dangling off the bottom of a sheet.
              page.drawLine({
                start: { x: o.x * MM, y: yDown(top) },
                end: { x: o.x * MM, y: yDown(top + lineH) },
                thickness: em(RICH.quote.rule) * MM,
                color: RULE_GREY,
              });
            }
            if (isFirst && opts.marker) {
              const markerX = (x - RICH.list.markerGap * sizeMm) * MM
                - opts.marker.font.widthOfTextAtSize(opts.marker.text, opts.marker.size);
              page.drawText(opts.marker.text, {
                x: markerX,
                y: yDown(top + baselineDrop(lineH, opts.size / MM)),
                size: opts.marker.size,
                font: opts.marker.font,
                color,
              });
            }
            drawRichLine(page, line, top, {
              x, width, size: opts.size, lineH, align: opts.align, color, pdf: o.pdf,
            });
          },
        },
        isFirst ? Math.max(pending, opts.before) : 0,
      );
    });

    pending = lines.length > 0 ? opts.after : Math.max(pending, opts.after);
  };

  blocks.forEach((block, index) => {
    const next = blocks[index + 1];
    const prev = blocks[index - 1];

    switch (block.kind) {
      case 'paragraph':
        // A quotation is set in italic whatever the runs carry, matching the
        // editor and the preview.
        textBlock(block.quote ? block.runs.map((run) => ({ ...run, italic: true })) : block.runs, {
          size: o.size,
          lineH: o.lineH,
          align: block.align ?? 'justify',
          indent: block.quote ? em(RICH.quote.indent) : 0,
          before: 0,
          after: em(RICH.paragraphGap),
          quote: block.quote,
          color: block.quote ? QUOTE_INK : BLACK,
        });
        break;

      case 'heading': {
        const spec = RICH.heading[block.level];
        const size = o.size * spec.size;
        // A heading is bold whether or not the writer marked it so, exactly
        // as the editor shows it.
        textBlock(block.runs.map((run) => ({ ...run, bold: true })), {
          size,
          lineH: (size / MM) * RICH.lineHeight,
          align: block.align ?? 'left',
          indent: 0,
          before: em(spec.before),
          after: em(spec.after),
        });
        break;
      }

      case 'listItem': {
        const first = prev?.kind !== 'listItem';
        const last = next?.kind !== 'listItem';
        textBlock(block.runs, {
          size: o.size,
          lineH: o.lineH,
          align: 'left',
          indent: em(RICH.list.indent) * block.depth,
          before: em(first ? RICH.list.gap : RICH.list.itemGap),
          after: em(last ? RICH.list.gap : RICH.list.itemGap),
          marker: { text: block.marker, font: o.faces.base.regular, size: o.size },
        });
        break;
      }

      case 'rule': {
        const gap = em(RICH.rule.gap);
        push(
          {
            height: em(RICH.rule.thickness),
            draw: (page, top) => {
              page.drawLine({
                start: { x: o.x * MM, y: yDown(top) },
                end: { x: (o.x + o.width) * MM, y: yDown(top) },
                thickness: em(RICH.rule.thickness) * MM,
                color: RULE_GREY,
              });
            },
          },
          Math.max(pending, gap),
        );
        pending = gap;
        break;
      }

      case 'pageBreak':
        push({ height: 0, breakBefore: true, draw: () => {} }, 0);
        pending = 0;
        break;

      case 'image': {
        const gap = em(RICH.image.gap);
        const image = o.images.get(block.src) ?? null;

        if (block.fullPage) {
          // Its own sheet, edge to edge. "Fit" keeps the whole picture and
          // lets the paper show at two edges; "fill" covers the sheet and
          // lets the page boundary crop what hangs over — which is what the
          // master deck does with the Anandadhara poster.
          push(
            {
              height: 0,
              fullPage: true,
              draw: (sheet) => {
                if (!image) return;
                const pageW = PAGE_W / MM;
                const pageH = PAGE_H / MM;
                const byWidth = pageW / image.width;
                const byHeight = pageH / image.height;
                const scale = block.fit === 'fill'
                  ? Math.max(byWidth, byHeight)
                  : Math.min(byWidth, byHeight);
                const w = image.width * scale;
                const h = image.height * scale;
                sheet.drawImage(image, {
                  x: ((pageW - w) / 2) * MM,
                  y: ((pageH - h) / 2) * MM,
                  width: w * MM,
                  height: h * MM,
                });
              },
            },
            0,
          );
          pending = 0;
          break;
        }

        const width = (o.width * block.widthPct) / 100;
        const height = image ? width * (image.height / image.width) : em(RICH.lineHeight) * 2;

        push(
          {
            height,
            draw: (page, top, avail) => {
              // A picture too tall for a whole sheet is scaled to it rather
              // than clipped or dropped.
              const h = Math.min(height, avail);
              const w = (width * h) / height;
              const left = block.align === 'center'
                ? o.x + (o.width - w) / 2
                : block.align === 'right' ? o.x + o.width - w : o.x;

              if (image) {
                page.drawImage(image, {
                  x: left * MM,
                  y: yDown(top + h),
                  width: w * MM,
                  height: h * MM,
                });
                return;
              }
              // An image that would not download is shown as a marked gap
              // rather than silently dropped: the secretary should see that
              // the letter is incomplete before it is posted.
              page.drawRectangle({
                x: left * MM,
                y: yDown(top + h),
                width: w * MM,
                height: h * MM,
                borderColor: RULE_GREY,
                borderWidth: 0.5,
              });
              page.drawText(sanitize(`[${block.alt || 'image'} could not be loaded]`, o.faces.base.italic), {
                x: (left + 2) * MM,
                y: yDown(top + h / 2),
                size: o.size * 0.85,
                font: o.faces.base.italic,
                color: QUOTE_INK,
              });
            },
          },
          Math.max(pending, gap),
        );
        pending = gap;
        break;
      }

      default:
        break;
    }
  });

  return atoms;
}

// ── Pouring them onto sheets ─────────────────────────────────────────────────

export interface FlowOptions {
  page: PDFPage;
  newPage: () => PDFPage;
  /** A sheet with nothing on it — what a full-page picture is drawn onto. */
  newBarePage: () => PDFPage;
  /** Where the body starts on the first sheet and on a continuation, in mm. */
  firstTop: number;
  contTop: number;
  /** The last millimetre the body may occupy. */
  bottom: number;
}

/**
 * Draws the atoms across as many sheets as they need.
 *
 * Returns the sheet the signature belongs on: the last letterhead page that
 * carried body text, which is not necessarily the last page of the document.
 */
export function flowBody(atoms: Atom[], o: FlowOptions): PDFPage {
  let page = o.page;
  /**
   * The last letterhead sheet that took body text. The signature block goes
   * there, so a letter whose poster pages come last is still signed on the
   * page the letter itself ends on.
   */
  let lastText = o.page;
  let top = o.firstTop;
  let atPageTop = true;
  /** Set when the next thing to be drawn must open a new sheet. */
  let restart = false;

  const windowHeight = o.bottom - o.contTop;

  const fresh = () => {
    page = o.newPage();
    top = o.contTop;
    atPageTop = true;
    restart = false;
  };

  for (const atom of atoms) {
    if (atom.fullPage) {
      atom.draw(o.newBarePage(), 0, 0);
      restart = true;
      continue;
    }

    // A page break, or anything else of no height, only says where the next
    // sheet begins. Acting on it lazily is what stops a break at the end of
    // the body from posting a blank sheet.
    if (atom.height === 0) {
      if (atom.breakBefore && !atPageTop) restart = true;
      continue;
    }

    if (restart) fresh();

    // An image taller than a whole sheet is scaled to the sheet rather than
    // dropped; nothing else can be shrunk, so it simply starts a new page.
    const height = Math.min(atom.height, windowHeight);
    const gap = atPageTop ? 0 : atom.spaceBefore;

    if (top + gap + height > o.bottom) {
      fresh();
      atom.draw(page, top, windowHeight);
      top += height;
    } else {
      atom.draw(page, top + gap, o.bottom - top - gap);
      top += gap + height;
    }

    atPageTop = false;
    lastText = page;
  }

  return lastText;
}
