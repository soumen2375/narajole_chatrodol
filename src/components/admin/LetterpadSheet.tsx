/**
 * LetterpadSheet — the CSWO letterhead drawn in the browser, at true A4 scale.
 *
 * This is the compose-time preview, not the artifact: what gets printed,
 * downloaded and emailed is rendered on the server by api/_lib/letter-pdf.ts.
 * Both work off the same layout table in src/lib/letterpad.ts, the same
 * proportions in src/lib/letter-body.ts and the same fonts, so what the
 * secretary sees here is what the addressee receives.
 *
 * The body is a formatted document — headings, lists, links, pictures — laid
 * out once and then shown through a window on each sheet. Where those windows
 * end is measured from the laid-out document itself: a sheet may end at any
 * line of a paragraph, never inside a picture, and always at a page break the
 * secretary asked for. That is the rule the PDF renderer applies too.
 *
 * A full-page picture is not part of that flow at all. It is a sheet — bare
 * paper, no letterhead — exactly as slide 2 of the office master deck is, so
 * the text before it and the text after it are laid out independently and the
 * poster sits between them.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ART,
  COLORS,
  FONT_STACK,
  LAYOUT,
  ORG,
  PAGE,
  type LetterDraft,
} from '@/lib/letterpad';
import { letterBodyCss, letterBodyHtml, sanitizeLetterHtml, splitLetterSegments } from '@/lib/letter-body';
import { useInjectedCss, useLetterpadFonts } from '@/components/admin/letterpad-styles';

/** pdf-lib works in points; CSS is happy with millimetres, so mm it is. */
const mm = (v: number) => `${v}mm`;
const PT_TO_MM = 25.4 / 72;

/**
 * Nudges a text box so its first baseline lands where the PDF puts it.
 *
 * PowerPoint (and the renderer) seat the baseline one line height down less
 * the descender; a CSS line box centres the leading instead. The difference is
 * half a line minus half the font size.
 */
function boxTop(top: number, lineHeightPt: number, sizePt: number): number {
  return top + (lineHeightPt / 2 - sizePt / 2) * PT_TO_MM;
}

const textStyle = (
  sizePt: number,
  lineHeightPt: number,
  font: string,
  extra: CSSProperties = {},
): CSSProperties => ({
  position: 'absolute',
  fontFamily: font,
  fontSize: mm(sizePt * PT_TO_MM),
  lineHeight: mm(lineHeightPt * PT_TO_MM),
  color: COLORS.ink,
  whiteSpace: 'pre-wrap',
  margin: 0,
  ...extra,
});

/** dd/mm/yyyy, as the master prints it. */
function printedDate(iso: string): string {
  const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
  const valid = Number.isNaN(d.getTime()) ? new Date() : d;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(valid.getDate())}/${p(valid.getMonth() + 1)}/${valid.getFullYear()}`;
}

function Dots({ spec, y, size }: { spec: { startX: number; count: number; pitch: number }; y: number; size: number }) {
  return (
    <>
      {Array.from({ length: spec.count }, (_, i) => (
        <span
          key={i}
          style={textStyle(size, size * 1.2, FONT_STACK.chancery, {
            left: mm(spec.startX + i * spec.pitch),
            top: mm(boxTop(y, size * 1.2, size)),
            color: COLORS.labelRed,
            fontWeight: 700,
          })}
        >
          .
        </span>
      ))}
    </>
  );
}

/** Everything on the sheet before a word is typed. Repeated on every page. */
function Letterhead() {
  const M = LAYOUT.masthead;
  const F = LAYOUT.footer;
  const img = (src: string, box: { x: number; y: number; w: number; h: number }, extra: CSSProperties = {}) => (
    <img
      src={src}
      alt=""
      aria-hidden
      style={{ position: 'absolute', left: mm(box.x), top: mm(box.y), width: mm(box.w), height: mm(box.h), ...extra }}
    />
  );

  return (
    <>
      {img(ART.watermark, LAYOUT.art.watermark, { opacity: LAYOUT.art.watermark.opacity })}
      {img(ART.bandTop, LAYOUT.art.bandTop)}
      {img(ART.swoosh, LAYOUT.art.swoosh)}
      {img(ART.bandFooter, LAYOUT.art.bandFooter)}
      {img(ART.logo, LAYOUT.art.logo)}
      {img(ART.divider, LAYOUT.art.divider)}
      {img(ART.star, LAYOUT.art.star)}

      <div
        style={textStyle(M.orgName.size, M.orgName.size, FONT_STACK.display, {
          left: mm(M.orgName.x),
          top: mm(M.orgName.y + 0.4),
          color: COLORS.red,
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
        })}
      >
        {ORG.name}
      </div>
      <div
        style={textStyle(M.reg.size, M.reg.size * 1.2, FONT_STACK.sans, {
          left: mm(M.reg.x),
          top: mm(M.reg.y + 0.6),
        })}
      >
        {ORG.reg}
      </div>
      <div style={{ position: 'absolute', left: mm(M.tick.x), top: mm(M.tick.y), width: '0.37mm', height: mm(M.tick.h), background: COLORS.goldTick }} />

      {img(ART.iconPhone, { ...M.phone.icon, w: M.phone.icon.s, h: M.phone.icon.s })}
      <div style={textStyle(M.contactSize, M.contactSize * 1.2, FONT_STACK.sans, { left: mm(M.phone.text.x), top: mm(boxTop(M.phone.text.y, M.contactSize * 1.2, M.contactSize)) })}>{ORG.headPhone}</div>

      {img(ART.iconMail, { ...M.mail.icon, w: M.mail.icon.s, h: M.mail.icon.s })}
      <div style={textStyle(M.contactSize, M.contactSize * 1.2, FONT_STACK.sans, { left: mm(M.mail.text.x), top: mm(boxTop(M.mail.text.y, M.contactSize * 1.2, M.contactSize)) })}>{ORG.mail}</div>

      {img(ART.iconWeb, { ...M.web.icon, w: M.web.icon.s, h: M.web.icon.s })}
      <div style={textStyle(M.contactSize, M.contactSize * 1.2, FONT_STACK.sans, { left: mm(M.web.text.x), top: mm(boxTop(M.web.text.y, M.contactSize * 1.2, M.contactSize)) })}>{ORG.web}</div>

      {/* The split rule under the masthead. Thicknesses are the deck's, in points. */}
      {([LAYOUT.rules.left, LAYOUT.rules.right] as const).map((r, i) => (
        <div key={i}>
          <div style={{ position: 'absolute', left: mm(r.x1), top: mm(r.y - 3.45 * PT_TO_MM / 2), width: mm(r.x2 - r.x1), height: mm(3.45 * PT_TO_MM), background: COLORS.red }} />
          <div style={{ position: 'absolute', left: mm(r.gold.x1), top: mm(r.gold.y - 1.33 * PT_TO_MM / 2), width: mm(r.gold.x2 - r.gold.x1), height: mm(1.33 * PT_TO_MM), background: COLORS.gold }} />
        </div>
      ))}

      {/* Footer strip */}
      {img(ART.iconPhoneFoot, { ...F.phone.icon, w: F.phone.icon.s, h: F.phone.icon.s })}
      <div style={textStyle(F.size, F.size * 1.2, FONT_STACK.sans, { left: mm(F.phone.label.x), top: mm(boxTop(F.phone.label.y, F.size * 1.2, F.size)), color: COLORS.white, fontWeight: 700 })}>Contact No.</div>
      <div style={textStyle(F.size, F.size * 1.2, FONT_STACK.sans, { left: mm(F.phone.value.x), top: mm(boxTop(F.phone.value.y, F.size * 1.2, F.size)), color: COLORS.white })}>{ORG.phones}</div>

      {F.separators.map((x) => (
        <div key={x} style={{ position: 'absolute', left: mm(x), top: mm(F.separatorY), width: '0.19mm', height: mm(F.separatorH), background: COLORS.white }} />
      ))}

      {img(ART.iconMailFoot, { ...F.mail.icon, w: F.mail.icon.s, h: F.mail.icon.s })}
      <div style={textStyle(F.size, F.size * 1.2, FONT_STACK.sans, { left: mm(F.mail.label.x), top: mm(boxTop(F.mail.label.y, F.size * 1.2, F.size)), color: COLORS.white, fontWeight: 700 })}>Email</div>
      <div style={textStyle(F.size, F.size * 1.2, FONT_STACK.sans, { left: mm(F.mail.value.x), top: mm(boxTop(F.mail.value.y, F.size * 1.2, F.size)), color: COLORS.white })}>{ORG.mail}</div>

      {img(ART.iconAddressFoot, { ...F.address.icon, w: F.address.icon.s, h: F.address.icon.s })}
      <div style={textStyle(F.size, F.size * 1.2, FONT_STACK.sans, { left: mm(F.address.label.x), top: mm(boxTop(F.address.label.y, F.size * 1.2, F.size)), color: COLORS.white, fontWeight: 700 })}>Address</div>
      <div style={textStyle(F.size, F.size * 1.2, FONT_STACK.sans, { left: mm(F.address.value.x), top: mm(boxTop(F.address.value.y, F.size * 1.2, F.size)), width: mm(F.address.value.w), color: COLORS.white })}>{ORG.address}</div>
    </>
  );
}

// ── Where the body may run to, exactly as the renderer flows it ──────────────

const BODY_BOTTOM = 240;      // the closing block begins at 245.83
const BODY_TOP_CONT = 55;     // a continuation sheet starts under the rules

/** The body's typography, plus the one rule that only the sheet needs. */
const SHEET_CSS = [
  letterBodyCss('.lp-sheet-body'),
  // A picture taller than a whole sheet is scaled down to one rather than
  // clipped — the same thing letter-body-pdf.ts does with an oversized image.
  // The width follows, because a replaced element keeps its aspect ratio.
  `.lp-sheet-body img{max-height:${BODY_BOTTOM - BODY_TOP_CONT}mm;}`,
].join('\n');

/** Blocks that hold other blocks rather than lines of their own. */
const BLOCKISH = /^(P|H[1-3]|LI|HR|IMG|DIV|UL|OL|BLOCKQUOTE)$/;
const WRAPPERS = new Set(['BLOCKQUOTE', 'UL', 'OL', 'LI']);
const TEXTISH = /^(P|H1|H2|H3|LI)$/;

interface Leaf {
  top: number;
  bottom: number;
  lineH: number;
  lines: number;
  /** A picture, a rule or a page break: it goes on one sheet or the next. */
  atomic: boolean;
  forced: boolean;
}

/**
 * Reads the laid-out body back out of the DOM, in millimetres.
 *
 * Positions are accumulated up the offset chain rather than taken from
 * getBoundingClientRect, because the sheet sits inside a scale() transform:
 * rectangles would come back shrunk while computed line heights would not,
 * and the two cannot be mixed.
 */
function leavesOf(flow: HTMLElement, mmPerPx: number): Leaf[] {
  const leaves: Leaf[] = [];

  const topOf = (el: HTMLElement) => {
    let y = 0;
    let node: HTMLElement | null = el;
    while (node && node !== flow) {
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return y;
  };

  const walk = (parent: Element) => {
    for (const child of Array.from(parent.children)) {
      if (!(child instanceof HTMLElement)) continue;

      const holdsBlocks = Array.from(child.children).some((c) => BLOCKISH.test(c.tagName));
      if (WRAPPERS.has(child.tagName) && holdsBlocks) { walk(child); continue; }

      const top = topOf(child) * mmPerPx;
      const textish = TEXTISH.test(child.tagName);
      const lineHpx = textish ? parseFloat(getComputedStyle(child).lineHeight) : 0;
      const lines = textish && lineHpx > 0 ? Math.max(1, Math.round(child.clientHeight / lineHpx)) : 1;

      leaves.push({
        top,
        bottom: top + child.offsetHeight * mmPerPx,
        lineH: lineHpx * mmPerPx,
        lines,
        atomic: !textish,
        forced: child.hasAttribute('data-page-break'),
      });
    }
  };

  walk(flow);
  return leaves;
}

/**
 * Where each sheet's window onto the body starts, in millimetres.
 *
 * A sheet is filled to the last place a break is allowed: the end of a line
 * inside a paragraph, or the start of the next block — never the middle of a
 * picture. A page break the secretary inserted wins over both.
 */
function pageOffsets(leaves: Leaf[], firstTop: number): { offsets: number[]; total: number } {
  const total = leaves.reduce((max, leaf) => Math.max(max, leaf.bottom), 0);
  if (total <= 0) return { offsets: [0], total: 0 };

  const candidates: number[] = [];
  const forced: number[] = [];

  leaves.forEach((leaf, i) => {
    if (leaf.forced) forced.push(leaf.top);
    if (!leaf.atomic && leaf.lineH > 0) {
      for (let line = 1; line < leaf.lines; line += 1) candidates.push(leaf.top + line * leaf.lineH);
    }
    // Breaking at the *next* block's top rather than this one's bottom leaves
    // the margin between them on the sheet that is ending, so a continuation
    // sheet never opens with a blank strip.
    candidates.push(leaves[i + 1] ? leaves[i + 1].top : leaf.bottom);
  });

  const offsets = [0];
  let start = 0;

  // Nothing sane runs past a hundred sheets; the bound is only here so a
  // measurement that comes back nonsense cannot spin.
  for (let guard = 0; guard < 100; guard += 1) {
    const limit = start + BODY_BOTTOM - (offsets.length === 1 ? firstTop : BODY_TOP_CONT);

    // A page break the secretary asked for is honoured even when everything
    // after it would have fitted on this sheet — that is the whole point of
    // having asked.
    const asked = forced.find((f) => f > start + 0.01 && f <= limit + 0.01);
    if (!asked && total <= limit + 0.01) break;

    const fits = asked ?? [...candidates].reverse().find((c) => c > start + 0.01 && c <= limit + 0.01);
    const breakAt = fits ?? limit;

    offsets.push(breakAt);
    start = breakAt;
  }

  return { offsets, total };
}

export interface LetterpadSheetProps {
  draft: LetterDraft;
  refNo: string;
  /** An uploaded signature; the master's is used when blank. */
  signatureUrl?: string;
  /**
   * Ceiling on the zoom. The sheet always shrinks to fit the width it is given
   * — on a phone that lands around 0.38 — and only grows to this when there is
   * room. 1 is physical A4 size.
   */
  maxScale?: number;
  /** Called with the number of sheets the letter runs to. */
  onPageCount?: (pages: number) => void;
}

export default function LetterpadSheet({
  draft,
  refNo,
  signatureUrl,
  maxScale = 1,
  onPageCount,
}: LetterpadSheetProps) {
  useLetterpadFonts();
  useInjectedCss('letter-body-sheet', SHEET_CSS);

  const flowEls = useRef(new Map<number, HTMLDivElement>());
  const hostRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [flows, setFlows] = useState<Record<number, { offsets: number[]; total: number }>>({});
  const [scale, setScale] = useState(maxScale);

  const bodyHtml = useMemo(
    () => sanitizeLetterHtml(letterBodyHtml({ body_html: draft.body_html, body: draft.body })),
    [draft.body_html, draft.body],
  );

  /**
   * The runs of text between the letter's full-page pictures. Each run
   * paginates on its own, because a poster page is a sheet, not a paragraph.
   */
  const segments = useMemo(() => splitLetterSegments(bodyHtml), [bodyHtml]);

  /**
   * An A4 sheet is 794 CSS pixels wide, which overflows every phone and most
   * tablet columns. Rather than let the page scroll sideways, the sheet is
   * scaled to whatever width its container offers.
   *
   * The host is a plain full-width block, so its clientWidth is the space
   * available — the fixed-width sheet inside overflows it rather than
   * stretching it, which is what makes the measurement stable instead of
   * feeding back on itself.
   */
  useLayoutEffect(() => {
    const host = hostRef.current;
    const sheetEl = sheetRef.current;
    if (!host || !sheetEl) return;
    const fit = () => {
      // offsetWidth is the pre-transform layout width, so this stays correct
      // no matter what scale is currently applied.
      const sheetPx = sheetEl.offsetWidth;
      const available = host.clientWidth;
      if (!sheetPx || !available) return;
      setScale(Math.min(maxScale, available / sheetPx));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => ro.disconnect();
  }, [maxScale]);

  // Measure each run of text once the fonts, the words and any pictures have
  // settled, so the sheet count follows what the reader will actually see.
  useLayoutEffect(() => {
    const measure = () => {
      const next: Record<number, { offsets: number[]; total: number }> = {};
      flowEls.current.forEach((el, index) => {
        if (!el.offsetWidth) return;
        next[index] = pageOffsets(
          leavesOf(el, LAYOUT.body.w / el.offsetWidth),
          // Only the letter's own first sheet starts below the salutation; a
          // run of text that follows a poster page opens under the rules.
          index === 0 ? LAYOUT.body.y : BODY_TOP_CONT,
        );
      });

      setFlows((prev) => {
        const keys = Object.keys(next);
        const unchanged = keys.length === Object.keys(prev).length
          && keys.every((key) => {
            const before = prev[Number(key)];
            const after = next[Number(key)];
            return before && before.total === after.total && before.offsets.join() === after.offsets.join();
          });
        return unchanged ? prev : next;
      });
    };

    measure();
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});

    const observed = [...flowEls.current.values()];
    const ro = new ResizeObserver(measure);
    // A picture that has only just arrived changes every offset below it.
    observed.forEach((el) => { ro.observe(el); el.addEventListener('load', measure, true); });
    return () => {
      ro.disconnect();
      observed.forEach((el) => el.removeEventListener('load', measure, true));
    };
  }, [bodyHtml, segments]);

  /** Every sheet the letter runs to, in order. */
  const sheets = useMemo(() => {
    const list: ({ kind: 'flow'; segment: number; window: number } | { kind: 'picture'; segment: number })[] = [];
    segments.forEach((segment, index) => {
      if (segment.kind === 'picture') { list.push({ kind: 'picture', segment: index }); return; }
      const windows = flows[index]?.offsets.length ?? 1;
      for (let window = 0; window < windows; window += 1) list.push({ kind: 'flow', segment: index, window });
    });
    return list;
  }, [segments, flows]);

  const pageCount = sheets.length;
  useEffect(() => { onPageCount?.(pageCount); }, [pageCount, onPageCount]);

  /** The signature goes on the last sheet that carried words, not on a poster. */
  const lastFlowSheet = sheets.reduce((found, sheet, index) => (sheet.kind === 'flow' ? index : found), 0);

  const toLines = ['To', draft.to_name, ...draft.to_address.split('\n')]
    .map((l) => l.trim())
    .filter((l, i) => i < 2 || l.length > 0);

  const paper: CSSProperties = {
    position: 'relative',
    width: mm(PAGE.w),
    height: mm(PAGE.h),
    background: '#ffffff',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)',
    flex: 'none',
  };

  /** A picture on a sheet of its own — no letterhead, as the master deck has it. */
  const pictureSheet = (index: number, segment: { src: string; alt: string; fill: boolean }) => (
    <div key={index} style={paper}>
      <img
        src={segment.src}
        alt={segment.alt}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: segment.fill ? 'cover' : 'contain',
        }}
      />
    </div>
  );

  /** One letterhead sheet, showing its window onto a run of the body. */
  const flowSheet = (index: number, spec: { segment: number; window: number }) => {
    const isFirst = index === 0;
    const windowTop = spec.segment === 0 && spec.window === 0 ? LAYOUT.body.y : BODY_TOP_CONT;
    const measured = flows[spec.segment];
    const start = measured?.offsets[spec.window] ?? 0;
    const end = measured
      ? measured.offsets[spec.window + 1] ?? Math.max(measured.total, start)
      : start + (BODY_BOTTOM - windowTop);

    return (
      <div key={index} ref={isFirst ? sheetRef : undefined} style={paper}>
        <Letterhead />

        {isFirst && (
          <>
            <div style={textStyle(LAYOUT.ref.label.size, LAYOUT.ref.label.size * 1.2, FONT_STACK.chancery, { left: mm(LAYOUT.ref.label.x), top: mm(boxTop(LAYOUT.ref.label.y + 0.4, LAYOUT.ref.label.size * 1.2, LAYOUT.ref.label.size)), color: COLORS.labelRed, fontWeight: 700 })}>Ref No.:</div>
            <Dots spec={LAYOUT.ref.dots} y={LAYOUT.ref.label.y + 0.4} size={LAYOUT.ref.label.size} />
            <div style={textStyle(LAYOUT.ref.value.size, LAYOUT.ref.value.size * 1.2, FONT_STACK.sans, { left: mm(LAYOUT.ref.value.x), top: mm(boxTop(LAYOUT.ref.value.y, LAYOUT.ref.value.size * 1.2, LAYOUT.ref.value.size)) })}>{refNo}</div>

            <div style={textStyle(LAYOUT.date.label.size, LAYOUT.date.label.size * 1.2, FONT_STACK.chancery, { left: mm(LAYOUT.date.label.x), top: mm(boxTop(LAYOUT.date.label.y + 0.4, LAYOUT.date.label.size * 1.2, LAYOUT.date.label.size)), color: COLORS.labelRed, fontWeight: 700 })}>Date:</div>
            <Dots spec={LAYOUT.date.dots} y={LAYOUT.date.label.y + 0.4} size={LAYOUT.date.label.size} />
            <div style={textStyle(LAYOUT.date.value.size, LAYOUT.date.value.size * 1.2, FONT_STACK.sans, { left: mm(LAYOUT.date.value.x), top: mm(boxTop(LAYOUT.date.value.y, LAYOUT.date.value.size * 1.2, LAYOUT.date.value.size)) })}>{printedDate(draft.letter_date)}</div>

            <div style={textStyle(LAYOUT.to.size, LAYOUT.to.lineH, FONT_STACK.sans, { left: mm(LAYOUT.to.x), top: mm(boxTop(LAYOUT.to.y, LAYOUT.to.lineH, LAYOUT.to.size)), width: mm(LAYOUT.to.w) })}>
              {toLines.join('\n')}
            </div>

            <div style={textStyle(LAYOUT.subject.label.size, LAYOUT.subject.label.size * 1.2, FONT_STACK.sans, { left: mm(LAYOUT.subject.label.x), top: mm(boxTop(LAYOUT.subject.label.y, LAYOUT.subject.label.size * 1.2, LAYOUT.subject.label.size)), color: COLORS.labelRed, fontWeight: 700 })}>Subject:</div>
            <div style={textStyle(LAYOUT.subject.text.size, LAYOUT.subject.text.size * 1.2, FONT_STACK.sans, { left: mm(LAYOUT.subject.text.x), top: mm(boxTop(LAYOUT.subject.text.y, LAYOUT.subject.text.size * 1.2, LAYOUT.subject.text.size)), width: mm(LAYOUT.subject.text.w), fontWeight: 700 })}>
              {draft.subject}
            </div>

            <div style={textStyle(LAYOUT.salutation.size, LAYOUT.salutation.size * 1.2, FONT_STACK.sans, { left: mm(LAYOUT.salutation.x), top: mm(boxTop(LAYOUT.salutation.y, LAYOUT.salutation.size * 1.2, LAYOUT.salutation.size)), color: COLORS.labelRed, fontWeight: 700 })}>
              {draft.salutation}
            </div>
          </>
        )}

        {/* The body window. The whole run is laid out inside every sheet that
            shows part of it and shifted up by the millimetres already shown,
            so line breaks and page boundaries match the PDF's. */}
        <div
          style={{
            position: 'absolute',
            left: mm(LAYOUT.body.x),
            top: mm(windowTop),
            width: mm(LAYOUT.body.w),
            height: mm(Math.max(0, end - start)),
            overflow: 'hidden',
          }}
        >
          <div
            ref={spec.window === 0
              ? (el) => {
                  if (el) flowEls.current.set(spec.segment, el);
                  else flowEls.current.delete(spec.segment);
                }
              : undefined}
            className="lp-sheet-body"
            style={{
              position: 'relative',
              top: mm(-start),
              width: mm(LAYOUT.body.w),
              fontFamily: FONT_STACK.serif,
              fontSize: mm(LAYOUT.body.size * PT_TO_MM),
              color: COLORS.ink,
            }}
            dangerouslySetInnerHTML={{ __html: (segments[spec.segment] as { html: string }).html }}
          />
        </div>

        {/* Signature block, on the last sheet the letter's words reach */}
        {index === lastFlowSheet && (
          <>
            <img
              src={signatureUrl || ART.signature}
              alt=""
              aria-hidden
              style={{ position: 'absolute', left: mm(LAYOUT.art.signature.x), top: mm(LAYOUT.art.signature.y), width: mm(LAYOUT.art.signature.w), objectFit: 'contain' }}
            />
            <div style={{ position: 'absolute', left: mm(LAYOUT.signRule.x1), top: mm(LAYOUT.signRule.y), width: mm(LAYOUT.signRule.x2 - LAYOUT.signRule.x1), height: '0.1mm', background: COLORS.orange }} />
            <div style={textStyle(LAYOUT.closing.size, LAYOUT.closing.lineH, FONT_STACK.sans, { left: mm(LAYOUT.closing.x), top: mm(boxTop(LAYOUT.closing.y, LAYOUT.closing.lineH, LAYOUT.closing.size)), width: mm(LAYOUT.closing.w) })}>
              {[draft.closing, '', '', draft.signatory_name, draft.signatory_role,
                draft.signatory_phone ? `Mob. : ${draft.signatory_phone}` : ''].join('\n')}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    // The host measures the width on offer; the box inside it reserves the
    // space the scaled sheets actually occupy, since a transform does not
    // affect layout and the sheets would otherwise overlap what follows.
    <div ref={hostRef} style={{ width: '100%', overflow: 'hidden' }}>
      <div
        style={{
          width: mm(PAGE.w * scale),
          height: mm((PAGE.h * pageCount + 8 * (pageCount - 1)) * scale),
          maxWidth: '100%',
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            display: 'flex',
            flexDirection: 'column',
            gap: mm(8),
            width: mm(PAGE.w),
          }}
        >
          {sheets.map((sheet, index) => (sheet.kind === 'picture'
            ? pictureSheet(index, segments[sheet.segment] as { src: string; alt: string; fill: boolean })
            : flowSheet(index, sheet)))}
        </div>
      </div>
    </div>
  );
}
