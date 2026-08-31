/**
 * LetterpadSheet — the CSWO letterhead drawn in the browser, at true A4 scale.
 *
 * This is the compose-time preview, not the artifact: what gets printed,
 * downloaded and emailed is rendered on the server by api/_lib/letter-pdf.ts.
 * Both work off the same layout table in src/lib/letterpad.ts and the same
 * fonts, so what the secretary sees here is what the addressee receives.
 *
 * The body flows across sheets exactly as the PDF paginates it: the text is
 * laid out once, then each sheet shows a window onto it whose height is a
 * whole number of lines — the same rule the renderer applies.
 */

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import {
  ART,
  COLORS,
  FONT_STACK,
  LAYOUT,
  LETTERPAD_FONTS_HREF,
  ORG,
  PAGE,
  type LetterDraft,
} from '@/lib/letterpad';

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

/** Loads the letterhead's four faces once, only for the screens that show it. */
function useLetterpadFonts() {
  useEffect(() => {
    const existing = document.querySelector(`link[href="${LETTERPAD_FONTS_HREF}"]`);
    if (existing) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = LETTERPAD_FONTS_HREF;
    document.head.appendChild(link);
  }, []);
}

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

// ── Where the body may run to, in whole lines, exactly as the renderer flows it

const BODY_BOTTOM = 240;
const linesPerWindow = (top: number) => Math.floor((BODY_BOTTOM - top) / (LAYOUT.body.lineH * PT_TO_MM));

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

  const bodyRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [bodyLines, setBodyLines] = useState(0);
  const [scale, setScale] = useState(maxScale);

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

  const lineHmm = LAYOUT.body.lineH * PT_TO_MM;
  const firstWindow = linesPerWindow(LAYOUT.body.y);
  const contWindow = linesPerWindow(55);

  // Measure the laid-out body once the fonts and the text have settled, so the
  // sheet count follows what the reader will actually see.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      // offsetWidth, not getBoundingClientRect: the sheet sits inside a
      // scale() transform, and the rect would be the shrunken width while
      // scrollHeight stays in layout pixels — enough of a mismatch to invent
      // a second sheet for a letter that fits on one.
      if (!el.offsetWidth) return;
      const mmPerPx = LAYOUT.body.w / el.offsetWidth;
      setBodyLines(Math.round((el.scrollHeight * mmPerPx) / lineHmm));
    };
    measure();
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [draft.body, lineHmm]);

  const overflowLines = Math.max(0, bodyLines - firstWindow);
  const pageCount = 1 + Math.ceil(overflowLines / contWindow);

  useEffect(() => { onPageCount?.(pageCount); }, [pageCount, onPageCount]);

  const toLines = ['To', draft.to_name, ...draft.to_address.split('\n')]
    .map((l) => l.trim())
    .filter((l, i) => i < 2 || l.length > 0);

  /** One sheet: the letterhead, plus its window onto the body. */
  const sheet = (pageIndex: number) => {
    const isFirst = pageIndex === 0;
    const windowTop = isFirst ? LAYOUT.body.y : 55;
    const windowLines = isFirst ? firstWindow : contWindow;
    const skipped = isFirst ? 0 : firstWindow + (pageIndex - 1) * contWindow;

    return (
      <div
        key={pageIndex}
        ref={isFirst ? sheetRef : undefined}
        style={{
          position: 'relative',
          width: mm(PAGE.w),
          height: mm(PAGE.h),
          background: '#ffffff',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)',
          flex: 'none',
        }}
      >
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

        {/* The body window. The full text is laid out once inside every sheet
            and shifted up by the lines already shown, so line breaks and the
            page boundaries match the PDF's. */}
        <div
          style={{
            position: 'absolute',
            left: mm(LAYOUT.body.x),
            top: mm(windowTop),
            width: mm(LAYOUT.body.w),
            height: mm(windowLines * lineHmm),
            overflow: 'hidden',
          }}
        >
          <div
            ref={pageIndex === 0 ? bodyRef : undefined}
            style={textStyle(LAYOUT.body.size, LAYOUT.body.lineH, FONT_STACK.serif, {
              position: 'relative',
              top: mm(-skipped * lineHmm),
              width: mm(LAYOUT.body.w),
              textAlign: 'justify',
              textAlignLast: 'left',
            })}
          >
            {draft.body}
          </div>
        </div>

        {/* Signature block, on the last sheet only */}
        {pageIndex === pageCount - 1 && (
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
          {Array.from({ length: pageCount }, (_, i) => sheet(i))}
        </div>
      </div>
    </div>
  );
}
