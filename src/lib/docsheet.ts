/**
 * docsheet.ts — the house sheet every document the organisation issues is
 * printed on.
 *
 * The design is the payment receipt's: maroon masthead with the round logo and
 * the registration line, a gold rule, a centred document title, the cream
 * reference strip, the detail table, the maroon figure band, the signature
 * block, and the dark maroon contact footer. That sheet was already the most
 * finished thing the site produced and the one donors actually see, so it is
 * the house style rather than one document's private styling.
 *
 * Everything issued as a record goes through here: receipts, the 80G
 * certificate, bills, event reports, the finance statements and the blood-bank
 * request. The secretary's letterpad is deliberately separate — that is
 * correspondence on the printed stationery the office already uses, and it has
 * to stay a facsimile of CHHATRADOL_SWO_LETTERPAD.pptx.
 *
 * Palette and metrics are lifted verbatim from the original receipt so the
 * document donors have been receiving is unchanged by the consolidation.
 */

// ── Brand ────────────────────────────────────────────────────────────────────

export const DOC = {
  maroon: '#7B1E24',
  maroonDark: '#5C1319',
  gold: '#D9B25A',
  goldLight: '#DFB658',
  goldPale: '#EBD6A5',
  amber: '#F9C85B',
  cream: '#FBF7EE',
  creamLine: '#EADFC6',
  ink: '#1C1C1C',
  muted: '#6B6B6B',
  faint: '#9A9A9A',
  hair: '#EFEDE7',
  green: '#1F7A45',
  labelGold: '#8B7A57',
} as const;

export const DOC_ASSETS = {
  logo: '/assets/receipt/logo.jpg',
  signature: '/assets/receipt/signature.png',
  phone: '/assets/receipt/icon-phone-gold.png',
  mail: '/assets/receipt/icon-mail-gold.png',
  web: '/assets/receipt/icon-web-gold.png',
} as const;

const ORG = {
  name: 'CHHATRADOL SOCIAL WELFARE ORGANIZATION',
  reg: 'Reg. No.: IV-100200047/2026 &nbsp;&middot;&nbsp; DARPAN ID: WB/2026/1138665',
  phones: '7811073412 / 7074074110',
  mail: 'info@chhatradol.org',
  web: 'www.chhatradol.org',
} as const;

/** The two faces the sheet is set in. */
export const DOC_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Solway:wght@400;700;800&display=swap';

export const DEFAULT_SIGNATORY = { name: 'Sayan Samanta', role: 'Secretary, CSWO' } as const;

// ── Helpers callers build their content with ─────────────────────────────────

/** Escapes text destined for HTML. Every untrusted value must go through it. */
export function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes, then turns newlines into <br> for multi-line fields. */
export function escLines(value: string | null | undefined): string {
  return esc(value).replace(/\r?\n/g, '<br>');
}

export function printedDate(value?: string | Date | null): string {
  const d = value ? new Date(value) : new Date();
  const valid = Number.isNaN(d.getTime()) ? new Date() : d;
  return valid.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function rupees(amount: number, paise = true): string {
  return `&#8377;${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: paise ? 2 : 0,
    maximumFractionDigits: paise ? 2 : 0,
  })}`;
}

/** The label/value table the receipt uses. Values must already be escaped. */
export function detailTable(rows: Array<[string, string, ('ok' | 'strong')?]>): string {
  const body = rows
    .map(([k, v, mark]) => `<tr><td class="k">${esc(k)}</td><td class="v${mark ? ` ${mark}` : ''}">${v}</td></tr>`)
    .join('');
  return `<table class="detail">${body}</table>`;
}

/** The maroon band that states the headline figure. */
export function amountBand(label: string, value: string, words?: string | null): string {
  return `<div class="band">
    <div><div class="lbl">${esc(label)}</div>${words ? `<div class="words">${esc(words)}</div>` : ''}</div>
    <div class="amt">${value}</div>
  </div>`;
}

/** A section heading between blocks of a longer document. */
export function section(title: string): string {
  return `<div class="section">${esc(title)}</div>`;
}

export function para(html: string): string {
  return `<p class="para">${html}</p>`;
}

/**
 * A wide multi-column table — line items, ledger rows, budget breakdowns.
 * Cells given the `num` class are right-aligned with tabular figures.
 */
export function dataGrid(opts: {
  head: Array<{ label: string; num?: boolean; width?: string }>;
  rows: string;
  foot?: string;
}): string {
  const head = opts.head
    .map((h) => `<th class="${h.num ? 'num' : ''}"${h.width ? ` style="width:${h.width}"` : ''}>${esc(h.label)}</th>`)
    .join('');
  return `<table class="grid">
    <thead><tr>${head}</tr></thead>
    <tbody>${opts.rows}</tbody>
    ${opts.foot ? `<tfoot>${opts.foot}</tfoot>` : ''}
  </table>`;
}

// ── The sheet ────────────────────────────────────────────────────────────────

export interface DocSheetSignature {
  name?: string;
  role?: string;
  /** Defaults to the secretary's signature image. */
  imageUrl?: string | null;
}

export interface DocSheet {
  /** Browser tab title, and what the browser suggests on Save as PDF. */
  title: string;
  /** The centred maroon title, e.g. "DONATION RECEIPT". */
  docTitle: string;
  /** Left cell of the cream strip — usually the document's number. */
  refLabel?: string;
  refValue?: string;
  /** Right cell of the cream strip. Defaults to today's date. */
  dateLabel?: string;
  dateValue?: string;
  /** The document's own markup, built from the helpers above. */
  bodyHtml: string;
  /** Signature block. Pass null for documents nobody signs. */
  signature?: DocSheetSignature | null;
  /** Small print under the dashed rule. */
  note?: string | null;
}

/** The print window is written into about:blank, so URLs must be absolute. */
export function docAsset(path: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}${path}`;
}

function styles(): string {
  return `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Solway', Georgia, serif; color: ${DOC.ink}; background: #fff; }
  .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; display: flex; flex-direction: column; }

  .masthead { background: ${DOC.maroon}; color: #fff; display: flex; align-items: center;
    gap: 18px; padding: 20px 34px; }
  .masthead img { width: 74px; height: 74px; border-radius: 50%; background: #fff;
    object-fit: contain; padding: 4px; flex: none; }
  .org { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 32px; line-height: 1.08;
    letter-spacing: .03em; }
  .reg { font-size: 11px; color: ${DOC.goldLight}; margin-top: 5px; }
  .goldrule { height: 6px; background: ${DOC.gold}; }

  .main { flex: 1; padding: 30px 34px 0; display: flex; flex-direction: column; }
  .doctitle { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 30px; letter-spacing: .14em;
    color: ${DOC.maroon}; text-align: center; line-height: 1; }
  .docsub { text-align: center; font-size: 11.5px; color: ${DOC.muted}; margin-top: 6px; }

  .strip { margin-top: 22px; display: flex; justify-content: space-between; gap: 20px;
    padding: 13px 17px; border: 1px solid ${DOC.creamLine}; border-radius: 6px; background: ${DOC.cream}; }
  .strip .lbl { font-size: 9.5px; letter-spacing: .1em; text-transform: uppercase; color: ${DOC.labelGold}; }
  .strip .val { font-size: 13px; font-weight: 700; margin-top: 3px; }
  .strip .right { text-align: right; }

  table.detail { width: 100%; border-collapse: collapse; margin-top: 24px; }
  .detail .k { padding: 13px 4px; color: ${DOC.muted}; font-size: 12px; width: 38%;
    border-bottom: 1px solid ${DOC.hair}; vertical-align: top; }
  .detail .v { padding: 13px 4px; font-weight: 700; font-size: 13.5px; word-break: break-word;
    border-bottom: 1px solid ${DOC.hair}; vertical-align: top; }
  .detail tr:last-child .k, .detail tr:last-child .v { border-bottom: none; }
  .detail .v.ok { color: ${DOC.green}; }
  .detail .v.strong { color: ${DOC.maroon}; }

  /* Wide tables: line items, ledger rows, budget breakdowns. */
  table.grid { width: 100%; border-collapse: collapse; margin-top: 14px; }
  .grid th { text-align: left; padding: 9px 8px; font-size: 9.5px; letter-spacing: .1em;
    text-transform: uppercase; color: ${DOC.labelGold}; background: ${DOC.cream};
    border-bottom: 2px solid ${DOC.gold}; }
  .grid td { padding: 8px; font-size: 12px; border-bottom: 1px solid ${DOC.hair}; vertical-align: top; }
  .grid tr { break-inside: avoid; }
  .grid .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .grid tfoot td { font-weight: 700; border-bottom: none; }
  .grid tfoot tr:first-child td { border-top: 2px solid ${DOC.maroon}; }
  .grid tfoot tr:last-child td { color: ${DOC.maroon}; }

  .band { margin-top: 22px; background: ${DOC.maroon}; color: #fff; border-radius: 5px;
    padding: 19px 22px; display: flex; align-items: center; justify-content: space-between; gap: 20px;
    break-inside: avoid; }
  .band .lbl { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: ${DOC.amber}; }
  .band .words { font-size: 12px; color: ${DOC.goldPale}; margin-top: 3px; }
  .band .amt { font-family: 'Bebas Neue', Impact, sans-serif; font-size: 40px; line-height: 1;
    white-space: nowrap; }

  .section { margin-top: 26px; font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
    color: ${DOC.maroon}; font-weight: 700; padding-bottom: 5px; border-bottom: 1px solid ${DOC.creamLine}; }
  .para { font-size: 12.5px; line-height: 1.65; color: #333; margin-top: 14px; text-align: justify; }
  .to { font-size: 13px; line-height: 1.55; margin-top: 20px; }
  .subject { font-size: 13px; font-weight: 700; line-height: 1.5; margin-top: 14px; }
  .subject span { color: ${DOC.maroon}; }

  .sign { margin-top: 34px; display: flex; justify-content: flex-end; break-inside: avoid; }
  .sign .box { text-align: center; min-width: 200px; }
  .sign img { width: 140px; height: 52px; object-fit: contain; margin-bottom: -4px; }
  .sign .rule { border-top: 1px solid ${DOC.ink}; padding-top: 6px; font-size: 12px; font-weight: 700; }
  .sign .role { font-size: 11px; color: ${DOC.muted}; margin-top: 2px; }

  .note { margin-top: 20px; padding-top: 15px; border-top: 1px dashed #CFCFCF;
    text-align: center; font-size: 11px; color: ${DOC.faint}; padding-bottom: 22px; }

  .footer { background: ${DOC.maroonDark}; color: #fff; display: flex; align-items: center;
    padding: 13px 26px; gap: 18px; margin-top: auto; }
  .footer .cell { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .footer img { width: 26px; height: 26px; flex: none; object-fit: contain; }
  .footer .ct { display: flex; flex-direction: column; gap: 1px; white-space: nowrap; }
  .footer .ct b { font-size: 11.5px; }
  .footer .ct span { font-size: 11.5px; }
  .footer .div { width: 1px; align-self: stretch; background: rgba(223,182,88,.55); flex: none; }

  @page { size: A4; margin: 0; }
  @media print {
    .sheet { width: auto; min-height: 100vh; }
  }
  `;
}

export function docSheetHtml(doc: DocSheet): string {
  const sign = doc.signature === null ? null : (doc.signature ?? {});

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(doc.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${DOC_FONTS_HREF}" rel="stylesheet">
<style>${styles()}</style>
</head>
<body>
  <div class="sheet">
    <div class="masthead">
      <img src="${docAsset(DOC_ASSETS.logo)}" alt="">
      <div>
        <div class="org">${ORG.name}</div>
        <div class="reg">${ORG.reg}</div>
      </div>
    </div>
    <div class="goldrule"></div>

    <div class="main">
      <div class="doctitle">${esc(doc.docTitle)}</div>

      <div class="strip">
        <div>
          <div class="lbl">${esc(doc.refLabel || 'Reference No.')}</div>
          <div class="val">${esc(doc.refValue || '—')}</div>
        </div>
        <div class="right">
          <div class="lbl">${esc(doc.dateLabel || 'Date')}</div>
          <div class="val">${esc(doc.dateValue || printedDate())}</div>
        </div>
      </div>

      ${doc.bodyHtml}

      ${sign ? `<div class="sign">
        <div class="box">
          <img src="${docAsset(sign.imageUrl || DOC_ASSETS.signature)}" alt="">
          <div class="rule">${esc(sign.name || DEFAULT_SIGNATORY.name)}</div>
          <div class="role">${esc(sign.role || DEFAULT_SIGNATORY.role)}</div>
        </div>
      </div>` : ''}

      ${doc.note ? `<div class="note">${esc(doc.note)}</div>` : '<div class="note" style="border:none">&nbsp;</div>'}
    </div>

    <div class="goldrule"></div>
    <div class="footer">
      <div class="cell">
        <img src="${docAsset(DOC_ASSETS.phone)}" alt="">
        <div class="ct"><b>Contact No.</b><span>${ORG.phones}</span></div>
      </div>
      <div class="div"></div>
      <div class="cell">
        <img src="${docAsset(DOC_ASSETS.mail)}" alt="">
        <div class="ct"><b>Email</b><span>${ORG.mail}</span></div>
      </div>
      <div class="div"></div>
      <div class="cell">
        <img src="${docAsset(DOC_ASSETS.web)}" alt="">
        <div class="ct"><b>Website</b><span>${ORG.web}</span></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Opens the document in its own window and raises the print dialog.
 *
 * Printing is held until the webfonts and the masthead imagery have loaded —
 * without the wait the print snapshot can go out in fallback type with a
 * missing logo — but never longer than 2.5s, so a slow font CDN cannot leave
 * the user staring at a window that will not print.
 */
export function printDocSheet(doc: DocSheet) {
  const w = window.open('', '_blank', 'width=860,height=1000');
  if (!w) return;
  w.document.write(docSheetHtml(doc));
  w.document.close();
  w.focus();

  const go = () => setTimeout(() => w.print(), 250);
  const fonts = (w.document as Document & { fonts?: FontFaceSet }).fonts;
  if (fonts?.ready) {
    Promise.race([
      Promise.all([
        fonts.ready,
        new Promise<void>((r) => {
          if (w.document.readyState === 'complete') r();
          else w.addEventListener('load', () => r(), { once: true });
        }),
      ]),
      new Promise<void>((r) => setTimeout(r, 2500)),
    ]).then(go);
  } else {
    setTimeout(go, 900);
  }
}
