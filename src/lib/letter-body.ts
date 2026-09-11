/**
 * letter-body.ts — the formatted letter body: its typography, its safe HTML,
 * and the plain-text reading kept alongside it.
 *
 * The body is written in a rich-text editor and stored as HTML. Three places
 * have to agree on what that HTML means:
 *
 *   1. the compose editor          (LetterBodyEditor.tsx)
 *   2. the A4 preview              (LetterpadSheet.tsx)
 *   3. the printed PDF             (api/_lib/letter-richtext.ts + letter-body-pdf.ts)
 *
 * The first two share the stylesheet below, so what the secretary types is
 * already set in the letter's own face at the letter's own measure. The third
 * mirrors the same proportions in pdf-lib — RICH is the table to change if a
 * heading should sit differently, and the server's copy of it carries the same
 * numbers. Change one, change the other.
 *
 * Every length here is in `em`, relative to the body's own 12.79 pt. That is
 * what lets the editor render the same document at a comfortable on-screen
 * size while the sheet renders it at true A4 scale.
 */

// ── Proportions ──────────────────────────────────────────────────────────────

/**
 * Multiples of the body font size. The server's RICH table in
 * api/_lib/letter-body-pdf.ts holds the same numbers.
 */
export const RICH = {
  lineHeight: 1.2,
  /** A blank line between paragraphs, exactly as the plain-text letters had. */
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
  /** Word's hyperlink blue; the office is used to seeing links in it. */
  linkColor: '#0563C1',
  quoteColor: '#57534e',
  ruleColor: '#c9c5c0',
} as const;

/**
 * The widths an image may be given, as a percentage of the body column.
 *
 * A ladder rather than a free drag: the preview and the PDF have to agree on
 * the width to agree on where the page breaks, and a stylesheet can only
 * carry the sizes it knows about.
 */
/**
 * How far one tab carries, in millimetres.
 *
 * Half an inch, Word's own default, measured from the left of the body column
 * — so a tab at the start of a paragraph indents it by the same amount the
 * office is used to, and two tabs land on the second stop rather than twice
 * the width of a space.
 */
export const TAB_STOP_MM = 12.7;

export const IMAGE_WIDTHS = [25, 40, 50, 60, 75, 100] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];

// ── Faces and sizes ──────────────────────────────────────────────────────────

/**
 * The faces a letter may be set in.
 *
 * Each is named for the Microsoft font the office knows, and printed with a
 * metric-compatible clone that can actually be shipped: a letter set in
 * "Calibri" here takes the same space on paper as one set in Calibri in Word.
 * The clone is also what the browser loads, so the editor, the A4 preview and
 * the posted PDF are the same typeface rather than three near-misses.
 *
 * `key` is what travels in the HTML (`<span data-font="calibri">`) and what
 * the PDF renderer looks up; nothing outside this table needs to know which
 * clone stands in for which name.
 */
export const LETTER_FONTS = [
  { key: 'times', label: 'Times New Roman', clone: 'Tinos', stack: "'Tinos','Times New Roman',Times,serif" },
  { key: 'arial', label: 'Arial', clone: 'Arimo', stack: "'Arimo',Arial,Helvetica,sans-serif" },
  { key: 'calibri', label: 'Calibri', clone: 'Carlito', stack: "'Carlito',Calibri,'Segoe UI',sans-serif" },
  { key: 'cambria', label: 'Cambria', clone: 'Caladea', stack: "'Caladea',Cambria,Georgia,serif" },
  { key: 'georgia', label: 'Georgia', clone: 'Gelasio', stack: "'Gelasio',Georgia,serif" },
  { key: 'courier', label: 'Courier New', clone: 'Cousine', stack: "'Cousine','Courier New',monospace" },
] as const;

export type LetterFontKey = (typeof LETTER_FONTS)[number]['key'];

/** The letterhead's own face, used wherever a run does not name one. */
export const DEFAULT_FONT: LetterFontKey = 'times';

/**
 * The sizes on offer, in points.
 *
 * The letter's own body is 12.79 pt — the master deck's size, which is not a
 * round number and is therefore not in this list. A run with no size of its
 * own keeps it, which is why the editor offers "Default" alongside these.
 */
export const LETTER_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36] as const;
export type LetterSize = (typeof LETTER_SIZES)[number];

/**
 * Ink colours for the body.
 *
 * A short list rather than a colour wheel: a letter that goes out under the
 * organisation's name should not be able to arrive in eight shades nobody
 * chose deliberately, and every colour here has been picked to stay legible
 * on white paper in a black-and-white photocopy as well as in print. Red is
 * the letterhead's own #C00000.
 *
 * Black is the default and writes no mark at all — choosing it takes the
 * colour off again.
 */
export const LETTER_COLORS = [
  { key: 'black', label: 'Automatic', hex: '#000000' },
  { key: 'grey', label: 'Grey', hex: '#57534E' },
  { key: 'red', label: 'Red', hex: '#C00000' },
  { key: 'orange', label: 'Orange', hex: '#B45309' },
  { key: 'green', label: 'Green', hex: '#0F7B3F' },
  { key: 'teal', label: 'Teal', hex: '#0C756F' },
  { key: 'blue', label: 'Blue', hex: '#0563C1' },
  { key: 'purple', label: 'Purple', hex: '#7030A0' },
] as const;

export type LetterColorKey = (typeof LETTER_COLORS)[number]['key'];

/**
 * Highlighter colours.
 *
 * Lighter than a screen highlighter's, because these are printed under black
 * text on white paper and have to leave the words readable.
 */
export const LETTER_HIGHLIGHTS = [
  { key: 'yellow', label: 'Yellow', hex: '#FDE68A' },
  { key: 'green', label: 'Green', hex: '#BBF7D0' },
  { key: 'cyan', label: 'Cyan', hex: '#BAE6FD' },
  { key: 'pink', label: 'Pink', hex: '#FBCFE8' },
  { key: 'grey', label: 'Grey', hex: '#E5E5E5' },
] as const;

export type LetterHighlightKey = (typeof LETTER_HIGHLIGHTS)[number]['key'];

export const isLetterColor = (value: string): value is LetterColorKey =>
  LETTER_COLORS.some((colour) => colour.key === value);

export const isLetterHighlight = (value: string): value is LetterHighlightKey =>
  LETTER_HIGHLIGHTS.some((colour) => colour.key === value);

export const isLetterFont = (value: string): value is LetterFontKey =>
  LETTER_FONTS.some((font) => font.key === value);

export const isLetterSize = (value: number): value is LetterSize =>
  (LETTER_SIZES as readonly number[]).includes(value);

// ── The stylesheet the editor and the sheet share ────────────────────────────

/**
 * Typography for a formatted letter body, scoped to `selector`.
 *
 * The caller sets font-size and width on the container: the sheet in
 * millimetres so the preview is true A4, the editor in pixels so it is
 * readable. Everything inside is relative to that.
 */
export function letterBodyCss(selector: string): string {
  const s = selector;
  const h = (level: 1 | 2 | 3) => {
    const spec = RICH.heading[level];
    return `${s} h${level}{font-size:${spec.size}em;font-weight:700;line-height:${RICH.lineHeight};margin:${spec.before / spec.size}em 0 ${spec.after / spec.size}em;text-align:left;}`;
  };

  return [
    // The block itself: justified Times, as the master letter is set.
    // pre-wrap, so that spaces the writer typed are the spaces that print:
    // two after a full stop stay two, and a tab advances to its stop instead
    // of collapsing into a single space the way ordinary HTML would have it.
    `${s}{line-height:${RICH.lineHeight};text-align:justify;text-align-last:left;overflow-wrap:break-word;white-space:pre-wrap;tab-size:${TAB_STOP_MM}mm;-moz-tab-size:${TAB_STOP_MM}mm;}`,
    `${s} > *:first-child{margin-top:0;}`,
    `${s} > *:last-child{margin-bottom:0;}`,
    `${s} p{margin:0 0 ${RICH.paragraphGap}em;}`,
    h(1), h(2), h(3),
    `${s} strong,${s} b{font-weight:700;}`,
    `${s} em,${s} i{font-style:italic;}`,
    `${s} u{text-decoration:underline;}`,
    `${s} s{text-decoration:line-through;}`,
    `${s} a{color:${RICH.linkColor};text-decoration:underline;}`,

    // Lists. The marker is drawn by hand rather than by list-style so that it
    // sits exactly where the PDF puts it — its right edge one markerGap left
    // of the text column — and so a numbered list counts the same in both.
    `${s} ul,${s} ol{margin:${RICH.list.gap}em 0;padding-left:${RICH.list.indent}em;list-style:none;text-align:left;}`,
    `${s} ol{counter-reset:lp-item;}`,
    `${s} li{position:relative;margin:0 0 ${RICH.list.itemGap}em;}`,
    `${s} li > p{margin:0;}`,
    `${s} ol > li{counter-increment:lp-item;}`,
    `${s} li::before{position:absolute;left:-${RICH.list.markerGap}em;transform:translateX(-100%);white-space:nowrap;font-weight:400;font-style:normal;}`,
    `${s} ul > li::before{content:"•";}`,
    `${s} ol > li::before{content:counter(lp-item) ".";}`,

    // A quotation: the rule stands at the column edge and the text is indented
    // past it, so the indent measured from the margin is the same on paper.
    `${s} blockquote{margin:0 0 ${RICH.paragraphGap}em;padding-left:${RICH.quote.indent - RICH.quote.rule}em;border-left:${RICH.quote.rule}em solid ${RICH.ruleColor};color:${RICH.quoteColor};font-style:italic;}`,
    `${s} blockquote p:last-child{margin-bottom:0;}`,

    `${s} hr{margin:${RICH.rule.gap}em 0;border:0;border-top:${RICH.rule.thickness}em solid ${RICH.ruleColor};}`,

    // Images are blocks in the flow: a paragraph can be written above one and
    // another below it, and neither the sheet nor the PDF ever splits one.
    `${s} img{display:block;margin:${RICH.image.gap}em 0;width:100%;height:auto;}`,
    ...IMAGE_WIDTHS.map((pct) => `${s} img[data-width="${pct}"]{width:${pct}%;}`),
    `${s} img[data-align="center"]{margin-left:auto;margin-right:auto;}`,
    `${s} img[data-align="right"]{margin-left:auto;margin-right:0;}`,
    `${s} img[data-align="left"]{margin-left:0;margin-right:auto;}`,

    `${s} [data-page-break]{display:block;height:0;margin:0;border:0;}`,

    // Faces and sizes chosen in the editor. Sizes are absolute points rather
    // than `em` so that a 14 pt word is 14 pt wherever it sits — inside a
    // heading as much as in a paragraph — which is what the PDF prints and
    // what a word processor means by a font size.
    ...LETTER_FONTS.map((font) => `${s} [data-font="${font.key}"]{font-family:${font.stack};}`),
    ...LETTER_SIZES.map((size) => `${s} [data-size="${size}"]{font-size:${size}pt;}`),
    ...LETTER_COLORS.map((colour) => `${s} [data-color="${colour.key}"]{color:${colour.hex};}`),
    ...LETTER_HIGHLIGHTS.map((colour) => `${s} [data-highlight="${colour.key}"]{background-color:${colour.hex};}`),
  ].join('\n');
}

// ── Plain text ↔ HTML ────────────────────────────────────────────────────────

/** Text that is about to be dropped into markup. */
export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * A plain-text body as the editor's own HTML.
 *
 * Letters written before the body became a formatted document are stored as
 * blank-line separated paragraphs; this is how they open in the editor, and
 * how they reach the preview, unchanged in appearance.
 */
export function plainToHtml(text: string): string {
  const paragraphs = String(text ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return '';
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * The words of a formatted body, blank-line separated.
 *
 * Saved next to the HTML so the checks that only care about the words — is
 * there a body at all, does it use characters the letterhead cannot print —
 * never have to parse markup. A link contributes its display text and, when
 * the two differ, the address in brackets, because that is what a reader of
 * the plain copy would need.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  const lines: string[] = [];

  const inline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (!(node instanceof Element)) return '';
    if (node.tagName === 'BR') return '\n';
    const inner = Array.from(node.childNodes).map(inline).join('');
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? '';
      const shown = inner.trim();
      return href && shown && href !== shown && href !== `mailto:${shown}` ? `${inner} (${href})` : inner;
    }
    return inner;
  };

  const walk = (el: Element, prefix = '') => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName;
      if (tag === 'UL' || tag === 'OL') {
        let n = 1;
        for (const li of Array.from(child.children)) {
          const marker = tag === 'OL' ? `${n++}. ` : '• ';
          const text = inline(li).trim();
          if (text) lines.push(`${marker}${text}`);
        }
        continue;
      }
      if (tag === 'BLOCKQUOTE') { walk(child, '  '); continue; }
      if (tag === 'HR') { lines.push('—'); continue; }
      if (tag === 'IMG') {
        const full = child.getAttribute('data-page') === 'full' ? ' — full page' : '';
        lines.push(`[${child.getAttribute('alt') || 'image'}${full}]`);
        continue;
      }
      if (tag === 'DIV' && child.hasAttribute('data-page-break')) continue;
      const text = inline(child).trim();
      if (text) lines.push(prefix + text);
    }
  };

  walk(root);
  return lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Sanitising ───────────────────────────────────────────────────────────────

const ALLOWED_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'HR', 'BR',
  'STRONG', 'B', 'EM', 'I', 'U', 'S', 'A', 'IMG', 'DIV', 'SPAN',
]);

const SAFE_HREF = /^(https?:|mailto:|tel:)/i;

/**
 * A picture must be somewhere the PDF renderer could fetch it from: an
 * uploaded file on the project's storage, or something on this site. A
 * data: URI is refused — it would be carried in the letter row, the preview
 * and the email, and the renderer cannot embed it anyway.
 */
const SAFE_IMAGE_SRC = /^(https?:\/\/|\/)/i;

/**
 * Reduces editor HTML to the subset the letterhead can print.
 *
 * The editor's own output is already this shape; what this guards against is
 * a paste from Word or a web page, which arrives carrying spans, colours,
 * scripts and inline styles that the PDF has no way to honour. Anything not
 * on the list is unwrapped rather than deleted, so pasted words survive even
 * when their formatting does not.
 */
export function sanitizeLetterHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  /** Keeps an element's children, drops the element. */
  const unwrap = (el: Element) => {
    const parent = el.parentNode;
    while (el.firstChild) parent?.insertBefore(el.firstChild, el);
    el.remove();
  };

  const clean = (el: Element) => {
    for (const child of Array.from(el.children)) {
      const tag = child.tagName;

      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT') {
        child.remove();
        continue;
      }

      // Anything else — a pasted span, font, table cell — keeps its words and
      // loses its wrapper.
      if (!ALLOWED_TAGS.has(tag)) {
        clean(child);
        unwrap(child);
        continue;
      }

      // Attributes: only the handful that mean something on the sheet.
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        const keep =
          (name === 'href' && tag === 'A' && SAFE_HREF.test(attr.value.trim())) ||
          (name === 'target' && tag === 'A') ||
          (name === 'rel' && tag === 'A') ||
          (name === 'src' && tag === 'IMG' && SAFE_IMAGE_SRC.test(attr.value.trim())) ||
          (name === 'alt' && tag === 'IMG') ||
          (name === 'data-width' && tag === 'IMG') ||
          (name === 'data-align' && tag === 'IMG') ||
          (name === 'data-page' && tag === 'IMG') ||
          (name === 'data-fit' && tag === 'IMG') ||
          (name === 'data-page-break' && tag === 'DIV') ||
          (name === 'data-font' && tag === 'SPAN' && isLetterFont(attr.value.trim())) ||
          (name === 'data-size' && tag === 'SPAN' && isLetterSize(Number(attr.value))) ||
          (name === 'data-color' && tag === 'SPAN' && isLetterColor(attr.value.trim())) ||
          (name === 'data-highlight' && tag === 'SPAN' && isLetterHighlight(attr.value.trim())) ||
          (name === 'style' && /^text-align:\s*(left|center|right|justify);?$/i.test(attr.value.trim()));
        if (!keep) child.removeAttribute(attr.name);
      }

      // A span that carries neither a face nor a size is a leftover from a
      // paste, or from a mark the editor has just removed.
      if (tag === 'SPAN'
        && !child.hasAttribute('data-font')
        && !child.hasAttribute('data-size')
        && !child.hasAttribute('data-color')
        && !child.hasAttribute('data-highlight')) {
        clean(child);
        unwrap(child);
        continue;
      }

      // A div that is not a page break carries no meaning of its own.
      if (tag === 'DIV' && !child.hasAttribute('data-page-break')) {
        clean(child);
        unwrap(child);
        continue;
      }

      // A picture whose source did not survive is not a picture.
      if (tag === 'IMG' && !child.getAttribute('src')) {
        child.remove();
        continue;
      }

      // A link with no usable address is just text.
      if (tag === 'A' && !child.getAttribute('href')) {
        clean(child);
        unwrap(child);
        continue;
      }

      clean(child);
    }
  };

  clean(root);

  // The editor keeps an empty paragraph at the end of the document for the
  // cursor to sit in — after a picture especially. It is not a blank line
  // anybody asked for, and printing it costs a whole sheet: the letterhead
  // page it opens is where the signature would then have to go.
  while (root.lastElementChild
    && root.lastElementChild.tagName === 'P'
    && !root.lastElementChild.textContent?.trim()
    && root.lastElementChild.querySelector('img,br,hr') === null) {
    root.lastElementChild.remove();
  }

  return root.innerHTML;
}

// ── Reading a stored letter ──────────────────────────────────────────────────

/** True when a body holds nothing that would print. */
export function isBodyEmpty(html: string): boolean {
  if (!html) return true;
  if (/<(img|hr)\b/i.test(html)) return false;
  return htmlToPlainText(html).trim().length === 0;
}

/**
 * The formatted body of a letter, whichever era it was written in.
 *
 * Letters written before the editor arrived have an empty body_html and their
 * paragraphs in body; they open, print and post exactly as they did.
 */
export function letterBodyHtml(letter: { body_html?: string | null; body?: string | null }): string {
  const html = (letter.body_html ?? '').trim();
  return html || plainToHtml(letter.body ?? '');
}

// ── Sheets of a different kind ───────────────────────────────────────────────

export type LetterSegment =
  | { kind: 'flow'; html: string }
  /** A picture that takes a sheet of its own, with no letterhead on it. */
  | { kind: 'picture'; src: string; alt: string; fill: boolean };

/**
 * Splits a body into the runs of flowing text between its full-page pictures.
 *
 * A poster page is not part of the text flow at all — it is a sheet, and the
 * text before it and after it paginate independently of each other. Splitting
 * here is what lets the preview lay each run out on its own and put a bare
 * sheet between them, which is how the PDF renders it too.
 *
 * The first segment is always a flow, even an empty one: the letter's first
 * sheet carries the reference, the addressee and the subject, so it exists
 * whether or not a word was written before the first poster.
 */
export function splitLetterSegments(html: string): LetterSegment[] {
  const segments: LetterSegment[] = [];
  let buffer = '';

  const closeFlow = () => {
    segments.push({ kind: 'flow', html: buffer });
    buffer = '';
  };

  if (html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild;
    for (const child of Array.from(root?.children ?? [])) {
      if (child.tagName === 'IMG' && child.getAttribute('data-page') === 'full') {
        closeFlow();
        segments.push({
          kind: 'picture',
          src: child.getAttribute('src') ?? '',
          alt: child.getAttribute('alt') ?? '',
          fill: child.getAttribute('data-fit') === 'fill',
        });
        continue;
      }
      buffer += child.outerHTML;
    }
  }

  closeFlow();

  // A run with nothing that would print is not a sheet. The editor always
  // leaves an empty paragraph after a picture — somewhere for the cursor to
  // go — and a letter ending in a poster would otherwise be followed by a
  // blank letterhead page that the PDF does not produce. The leading segment
  // stays either way: it is the letter's own first page.
  while (segments.length > 1) {
    const last = segments[segments.length - 1];
    if (last.kind !== 'flow' || !isBodyEmpty(last.html)) break;
    segments.pop();
  }

  return segments;
}
