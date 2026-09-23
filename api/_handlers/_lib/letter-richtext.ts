/**
 * api/_lib/letter-richtext.ts
 *
 * Reads the letter body's HTML into the handful of shapes a sheet of paper
 * can actually hold: paragraphs, headings, list items, quotations, rules,
 * images and page breaks, each carrying runs of styled words.
 *
 * Written by hand rather than pulled from a DOM library because this runs in
 * a serverless function whose whole job is to draw one PDF, and because the
 * input is not the open web: it is the editor's own output, already reduced
 * to a whitelist by sanitizeLetterHtml() before it was saved. Anything
 * unexpected is unwrapped — its words survive, its markup does not — which is
 * the same rule the browser side applies.
 *
 * The typesetting lives next door in letter-body-pdf.ts; this file has no
 * opinion about millimetres.
 */

export type Align = 'left' | 'center' | 'right' | 'justify';

/** A stretch of text sharing one appearance. */
export interface Run {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  /** Set when the run is inside a link; drawn blue, underlined and clickable. */
  href?: string;
  /** A face from LETTER_FONTS, when the writer chose one. */
  font?: string;
  /** A size in points, when the writer chose one. */
  size?: number;
  /** An ink colour from LETTER_COLORS, when the writer chose one. */
  color?: string;
  /** A highlighter colour from LETTER_HIGHLIGHTS, when the writer chose one. */
  highlight?: string;
}

export type Block =
  | { kind: 'paragraph'; runs: Run[]; align: Align | null; quote: boolean }
  | { kind: 'heading'; level: 1 | 2 | 3; runs: Run[]; align: Align | null }
  | { kind: 'listItem'; runs: Run[]; marker: string; depth: number; ordered: boolean }
  | {
      kind: 'image';
      src: string;
      alt: string;
      widthPct: number;
      align: Align;
      /**
       * A picture that takes a sheet of its own, with no letterhead on it —
       * the poster page the office already keeps as slide 2 of the master
       * deck. `widthPct` and `align` mean nothing to one of these.
       */
      fullPage: boolean;
      /** How it meets the edges of that sheet: fitted whole, or filling it. */
      fit: 'fit' | 'fill';
    }
  | { kind: 'rule' }
  | { kind: 'pageBreak' };

// ── Entities ─────────────────────────────────────────────────────────────────

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’',
  mdash: '—', ndash: '–', hellip: '…', middot: '·',
  rupee: '₹', deg: '°', times: '×', copy: '©',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
    }
    return NAMED[body.toLowerCase()] ?? whole;
  });
}

// ── Attributes ───────────────────────────────────────────────────────────────

function attributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? m[5] ?? '');
  }
  return out;
}

function alignOf(attrs: Record<string, string>): Align | null {
  const found = /text-align:\s*(left|center|right|justify)/i.exec(attrs.style ?? '');
  return found ? (found[1].toLowerCase() as Align) : null;
}

// ── The parser ───────────────────────────────────────────────────────────────

const BLOCK_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ul', 'ol',
  'blockquote', 'div', 'hr', 'img', 'figure', 'figcaption', 'table', 'tr', 'td', 'th',
]);

interface InlineStyle { bold: number; italic: number; underline: number; strike: number; href: string | null }

/** Points a size may sensibly be given in; anything else is a typo or a paste. */
const MIN_SIZE = 6;
const MAX_SIZE = 72;

/**
 * Parses editor HTML into blocks.
 *
 * Text that arrives outside any block tag still prints: it opens a paragraph
 * of its own, so a letter pasted as bare text is not silently dropped.
 */
export function parseLetterHtml(html: string): Block[] {
  const blocks: Block[] = [];
  const style: InlineStyle = { bold: 0, italic: 0, underline: 0, strike: 0, href: null };

  /** The block being filled, if any. */
  let open:
    | { kind: 'paragraph'; align: Align | null; quote: boolean }
    | { kind: 'heading'; level: 1 | 2 | 3; align: Align | null }
    | { kind: 'listItem'; marker: string; depth: number; ordered: boolean }
    | null = null;
  let runs: Run[] = [];

  /**
   * Faces and sizes, as stacks.
   *
   * They arrive as nested spans — `<span data-font="calibri"><span
   * data-size="14">…` — and a closing tag says only that *a* span ended, so
   * what each one pushed is remembered alongside it.
   */
  const fonts: string[] = [];
  const sizes: number[] = [];
  const colors: string[] = [];
  const highlights: string[] = [];
  const spans: { font: boolean; size: boolean; color: boolean; highlight: boolean }[] = [];

  let quoteDepth = 0;
  const lists: { ordered: boolean; count: number }[] = [];
  /**
   * The list item being filled, if any.
   *
   * The editor writes a list item as `<li><p>…</p></li>`, so the paragraph
   * inside has to inherit the item's marker and indent rather than start a
   * paragraph of its own. `marked` records that the bullet has already been
   * printed: a second paragraph in the same item is indented under it but
   * carries no second bullet, exactly as a word processor sets it.
   */
  const items: { marker: string; depth: number; ordered: boolean; marked: boolean }[] = [];

  const hasWords = () => runs.some((r) => r.text.trim().length > 0);

  /**
   * Closes the open block.
   *
   * Nothing is trimmed: whitespace at the start of a paragraph is the indent
   * the writer tabbed in, not an artefact of how the HTML was laid out — the
   * editor writes its document on one line, so there is no indentation here
   * that anybody but the writer put in.
   *
   * `keepEmpty` is set when a `</p>` closed a paragraph with nothing in it.
   * That is somebody pressing Enter twice, and it prints as the blank line
   * they meant — the same line the preview leaves for it.
   */
  const flush = (keepEmpty = false) => {
    if (!open) { runs = []; return; }

    if (runs.length === 0 && keepEmpty && open.kind === 'paragraph') {
      blocks.push({ kind: 'paragraph', runs: [], align: open.align, quote: open.quote });
    }

    if (runs.length) {
      if (open.kind === 'paragraph') blocks.push({ kind: 'paragraph', runs, align: open.align, quote: open.quote });
      else if (open.kind === 'heading') blocks.push({ kind: 'heading', level: open.level, runs, align: open.align });
      else blocks.push({ kind: 'listItem', runs, marker: open.marker, depth: open.depth, ordered: open.ordered });
    }
    open = null;
    runs = [];
  };

  /** Starts a paragraph for text that turned up without one. */
  const ensureOpen = () => {
    if (!open) open = { kind: 'paragraph', align: null, quote: quoteDepth > 0 };
  };

  const pushText = (text: string) => {
    if (!text) return;
    // Spaces and tabs are kept exactly as they were typed — the editor stores
    // them that way and the preview prints them that way, so two spaces after
    // a full stop stay two and a tab still finds its stop. Only line endings
    // are folded away: a deliberate break arrives as <br>.
    const kept = text.replace(/[\r\n\f\v]+/g, ' ');
    if (!kept) return;
    if (!kept.trim() && !hasWords() && !open) return;
    ensureOpen();
    runs.push({
      text: kept,
      bold: style.bold > 0,
      italic: style.italic > 0,
      underline: style.underline > 0,
      strike: style.strike > 0,
      ...(style.href ? { href: style.href } : {}),
      ...(fonts.length ? { font: fonts[fonts.length - 1] } : {}),
      ...(sizes.length ? { size: sizes[sizes.length - 1] } : {}),
      ...(colors.length ? { color: colors[colors.length - 1] } : {}),
      ...(highlights.length ? { highlight: highlights[highlights.length - 1] } : {}),
    });
  };

  const token = /<!--[\s\S]*?-->|<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>])*?)\/?>|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = token.exec(html)) !== null) {
    const [whole, rawTag, rawAttrs, text] = m;

    if (text !== undefined) { pushText(decodeEntities(text)); continue; }
    if (rawTag === undefined) continue; // a comment
    const tag = rawTag.toLowerCase();
    const closing = whole.startsWith('</');
    const attrs = closing ? {} : attributes(rawAttrs ?? '');

    if (BLOCK_TAGS.has(tag) && tag !== 'img') flush(closing && tag === 'p');

    if (closing) {
      switch (tag) {
        case 'strong': case 'b': style.bold = Math.max(0, style.bold - 1); break;
        case 'em': case 'i': style.italic = Math.max(0, style.italic - 1); break;
        case 'u': style.underline = Math.max(0, style.underline - 1); break;
        case 's': case 'strike': case 'del': style.strike = Math.max(0, style.strike - 1); break;
        case 'a': style.href = null; break;
        case 'blockquote': quoteDepth = Math.max(0, quoteDepth - 1); break;
        case 'span': {
          const span = spans.pop();
          if (span?.font) fonts.pop();
          if (span?.size) sizes.pop();
          if (span?.color) colors.pop();
          if (span?.highlight) highlights.pop();
          break;
        }
        case 'li': items.pop(); break;
        case 'ul': case 'ol': lists.pop(); break;
        default: break;
      }
      continue;
    }

    switch (tag) {
      case 'strong': case 'b': style.bold += 1; break;
      case 'em': case 'i': style.italic += 1; break;
      case 'u': style.underline += 1; break;
      case 's': case 'strike': case 'del': style.strike += 1; break;
      case 'a': style.href = (attrs.href ?? '').trim() || null; break;

      case 'span': {
        // A span the editor did not write — from a paste that slipped past
        // the sanitiser — carries neither, and simply passes its words on.
        const font = (attrs['data-font'] ?? '').trim();
        const size = Number(attrs['data-size']);
        const sized = Number.isFinite(size) && size >= MIN_SIZE && size <= MAX_SIZE;
        const color = (attrs['data-color'] ?? '').trim();
        const highlight = (attrs['data-highlight'] ?? '').trim();
        if (font) fonts.push(font);
        if (sized) sizes.push(size);
        if (color) colors.push(color);
        if (highlight) highlights.push(highlight);
        spans.push({
          font: Boolean(font),
          size: sized,
          color: Boolean(color),
          highlight: Boolean(highlight),
        });
        break;
      }

      case 'br':
        // A hard break ends the line but not the paragraph: it becomes an
        // empty run the typesetter reads as "start a new line here".
        ensureOpen();
        runs.push({ text: '\n', bold: false, italic: false, underline: false, strike: false });
        break;

      case 'p': {
        const item = items[items.length - 1];
        if (item) {
          open = {
            kind: 'listItem',
            ordered: item.ordered,
            marker: item.marked ? '' : item.marker,
            depth: item.depth,
          };
          item.marked = true;
        } else {
          open = { kind: 'paragraph', align: alignOf(attrs), quote: quoteDepth > 0 };
        }
        break;
      }

      case 'h1': case 'h2': case 'h3':
        open = { kind: 'heading', level: Number(tag[1]) as 1 | 2 | 3, align: alignOf(attrs) };
        break;

      // Anything deeper than h3 is a small heading rather than nothing.
      case 'h4': case 'h5': case 'h6':
        open = { kind: 'heading', level: 3, align: alignOf(attrs) };
        break;

      case 'blockquote':
        quoteDepth += 1;
        break;

      case 'ul': case 'ol':
        lists.push({ ordered: tag === 'ol', count: 0 });
        break;

      case 'li': {
        const list = lists[lists.length - 1] ?? { ordered: false, count: 0 };
        list.count += 1;
        const item = {
          ordered: list.ordered,
          marker: list.ordered ? `${list.count}.` : '•',
          depth: Math.max(1, lists.length),
          marked: false,
        };
        items.push(item);
        // An item written as bare text rather than as a paragraph still
        // prints. `marked` stays false: if a paragraph follows, it is the one
        // that will carry the bullet, and this empty block is dropped.
        open = { kind: 'listItem', ordered: item.ordered, marker: item.marker, depth: item.depth };
        break;
      }

      case 'hr':
        blocks.push({ kind: 'rule' });
        break;

      case 'img': {
        const src = (attrs.src ?? '').trim();
        if (!src) break;
        const width = Number(attrs['data-width']);
        const align = (attrs['data-align'] ?? 'center').toLowerCase();
        blocks.push({
          kind: 'image',
          src,
          alt: attrs.alt ?? '',
          widthPct: Number.isFinite(width) ? Math.min(100, Math.max(10, width)) : 100,
          align: align === 'left' || align === 'right' ? align : 'center',
          fullPage: (attrs['data-page'] ?? '').toLowerCase() === 'full',
          fit: (attrs['data-fit'] ?? '').toLowerCase() === 'fill' ? 'fill' : 'fit',
        });
        break;
      }

      case 'div':
        if (attrs['data-page-break'] !== undefined) blocks.push({ kind: 'pageBreak' });
        break;

      default:
        break;
    }
  }

  flush();

  // A letter filed before the editor stopped saving it — or one whose HTML
  // came from anywhere else — can still end with the empty paragraph the
  // cursor was parked in. Printing it opens a sheet the letter does not need,
  // and the signature would follow it there.
  while (blocks.length > 0) {
    const last = blocks[blocks.length - 1];
    if (last.kind !== 'paragraph' || last.runs.length > 0) break;
    blocks.pop();
  }

  return blocks;
}

/** Every image the letter needs, in the order it needs them. */
/**
 * The faces this letter asks for, beyond the letterhead's own.
 *
 * The renderer embeds these and no others: a font file is carried in every
 * copy of the PDF, so a letter written entirely in Times New Roman should not
 * be posting five typefaces it never used.
 */
export function fontFamilies(blocks: Block[]): string[] {
  const used = new Set<string>();
  for (const block of blocks) {
    if (!('runs' in block)) continue;
    for (const run of block.runs) if (run.font) used.add(run.font);
  }
  return [...used];
}

export function imageSources(blocks: Block[]): string[] {
  const seen = new Set<string>();
  for (const block of blocks) {
    if (block.kind === 'image') seen.add(block.src);
  }
  return [...seen];
}
