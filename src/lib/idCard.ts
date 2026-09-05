/**
 * Printable member ID card (CR80 portrait, 54 × 85.6 mm).
 *
 * The card is built as an HTML string rather than JSX so the on-screen preview
 * and the sheet that goes to the printer come from one source — the preview
 * injects the same markup, and `idCardSheetHtml` wraps it for a print window,
 * the pattern already used by the certificate and receipt sheets.
 */
import { memberDisplayId } from '@/types';
import { getMemberAvatarUrl, getMemberInitials } from '@/lib/avatar';

export interface IdCardMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  blood_group: string | null;
  phone: string | null;
  designation: string | null;
  member_serial: number | null;
  joined_at: string;
  verify_token: string;
}

const ORG_NAME = 'CHHATRADOL SOCIAL WELFARE ORGANIZATION';
const ORG_REG = 'Reg. No. IV-100200047/2026 · DARPAN WB/2026/1138665';
const ORG_SITE = 'www.chhatradol.org';
const LOGO = '/assets/receipt/logo.jpg';

const BRAND = '#0d4d3d';
const BRAND_D = '#0a3b2f';
const GOLD = '#d6a534';
const INK = '#10241d';
const MUTED = '#66756d';
const BLOOD = '#8f2116';
const RULE = '#dfe7e2';

export const ID_CARD_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Noto+Sans+Bengali:wght@500;700&display=swap';

function esc(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Site-relative asset → absolute, so it still resolves inside a print window. */
function asset(path: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}${path}`;
}

function joinedLabel(joined: string): string {
  const d = new Date(`${String(joined).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function idCardCss(): string {
  return `
  .idcard-sheet *, .idcard-sheet *::before, .idcard-sheet *::after {
    box-sizing: border-box; margin: 0; padding: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .idcard-sheet {
    display: flex; flex-wrap: wrap; gap: 4mm; align-content: flex-start;
    font-family: Archivo, 'Noto Sans Bengali', 'Segoe UI', sans-serif; color: ${INK};
  }
  .idcard {
    width: 54mm; height: 85.6mm; border-radius: 3mm; overflow: hidden;
    background: #fff; border: 0.3mm solid ${RULE}; display: flex; flex-direction: column;
    break-inside: avoid; page-break-inside: avoid;
  }

  .idcard .top { background: ${BRAND}; color: #fff; padding: 2.4mm 2.6mm 2mm;
    display: flex; align-items: center; gap: 1.6mm; }
  .idcard .top img { width: 7mm; height: 7mm; border-radius: 50%; object-fit: cover;
    background: #fff; flex: none; }
  .idcard .top .org { font-size: 4.6pt; font-weight: 800; line-height: 1.25;
    letter-spacing: .02em; text-transform: uppercase; }
  .idcard .top .reg { font-size: 3.4pt; font-weight: 500; color: rgba(255,255,255,.78);
    margin-top: .5mm; line-height: 1.2; }
  .idcard .goldrule { height: .8mm; background: ${GOLD}; }

  /* Dark strip the photo sits over. Deliberately wordless - the photo covers
     the middle of it, so the card title lives in the footer instead. */
  .idcard .band { background: ${BRAND_D}; height: 7mm; }

  .idcard .photo { margin: -5.5mm auto 0; width: 21mm; height: 21mm; border-radius: 50%;
    overflow: hidden; border: .9mm solid #fff; background: ${BRAND};
    box-shadow: 0 .4mm 1.2mm rgba(13,77,61,.28); position: relative; }
  .idcard .photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .idcard .photo .initials { width: 100%; height: 100%; display: flex; align-items: center;
    justify-content: center; color: #fff; font-size: 13pt; font-weight: 800; }

  .idcard .name { text-align: center; font-size: 8.6pt; font-weight: 800; line-height: 1.15;
    padding: 1.6mm 2.5mm 0; letter-spacing: -.01em; }
  .idcard .role { text-align: center; font-size: 4.8pt; font-weight: 700; color: ${BRAND};
    text-transform: uppercase; letter-spacing: .12em; margin-top: .7mm; padding: 0 2.5mm; }

  .idcard .rows { margin: 1.8mm 3mm 0; }
  .idcard .row { display: flex; align-items: center; justify-content: space-between;
    gap: 1.5mm; padding: .9mm 0; border-bottom: .2mm solid ${RULE}; }
  .idcard .row:last-child { border-bottom: 0; }
  .idcard .row .k { font-size: 4.2pt; font-weight: 700; color: ${MUTED};
    text-transform: uppercase; letter-spacing: .09em; white-space: nowrap; }
  .idcard .row .v { font-size: 5.6pt; font-weight: 800; text-align: right; }
  .idcard .row .v.blood { color: ${BLOOD}; }
  .idcard .row .v.none { color: ${MUTED}; font-weight: 700; }
  .idcard .row .v.code { font-family: 'Courier New', monospace; letter-spacing: -.01em; }

  .idcard .qrwrap { margin-top: auto; padding: 1.6mm 3mm 2mm; display: flex;
    align-items: center; gap: 2mm; }
  .idcard .qrwrap img { width: 16mm; height: 16mm; display: block; flex: none; }
  .idcard .qrwrap .qt { font-size: 4.2pt; font-weight: 700; color: ${MUTED}; line-height: 1.35; }
  .idcard .qrwrap .qt b { display: block; font-size: 5pt; color: ${INK}; margin-bottom: .5mm; }

  .idcard .foot { background: ${BRAND}; color: #fff; text-align: center;
    font-size: 4.2pt; font-weight: 700; letter-spacing: .08em; padding: 1.3mm 2mm; }
  `;
}

/** One card. `qrDataUrl` comes from a rendered `<QRCodeCanvas>`. */
export function idCardHtml(m: IdCardMember, qrDataUrl: string): string {
  const photo = getMemberAvatarUrl(m);
  const photoHtml = photo
    ? `<img src="${esc(photo.startsWith('/') ? asset(photo) : photo)}" alt="" crossorigin="anonymous">`
    : `<div class="initials">${esc(getMemberInitials(m.full_name))}</div>`;

  return `
  <div class="idcard">
    <div class="top">
      <img src="${asset(LOGO)}" alt="">
      <div>
        <div class="org">${ORG_NAME}</div>
        <div class="reg">${ORG_REG}</div>
      </div>
    </div>
    <div class="goldrule"></div>

    <div class="band"></div>

    <div class="photo">${photoHtml}</div>
    <div class="name">${esc(m.full_name)}</div>
    ${m.designation ? `<div class="role">${esc(m.designation)}</div>` : ''}

    <div class="rows">
      <div class="row"><span class="k">Member ID</span><span class="v code">${esc(memberDisplayId(m))}</span></div>
      <div class="row"><span class="k">Blood Group</span><span class="v ${m.blood_group ? 'blood' : 'none'}">${esc(m.blood_group || '—')}</span></div>
      <div class="row"><span class="k">Mobile</span><span class="v ${m.phone ? '' : 'none'}">${esc(m.phone || '—')}</span></div>
      <div class="row"><span class="k">Joined</span><span class="v">${esc(joinedLabel(m.joined_at))}</span></div>
    </div>

    <div class="qrwrap">
      <img src="${qrDataUrl}" alt="Verification QR">
      <div class="qt">
        <b>Scan to verify</b>
        Opens the official verification page of this membership.
      </div>
    </div>

    <div class="foot">MEMBER ID CARD &nbsp;·&nbsp; ${ORG_SITE}</div>
  </div>`;
}

/** Full A4 document for the print window. */
export function idCardSheetHtml(cards: string[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Member ID Cards</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${ID_CARD_FONTS_HREF}" rel="stylesheet">
<style>
  @page { size: A4 portrait; margin: 10mm; }
  html, body { background: #fff; }
  ${idCardCss()}
  .idcard-sheet { padding: 0; }
  @media screen { body { padding: 10mm; background: #eef2ef; } }
</style>
</head>
<body>
  <div class="idcard-sheet">${cards.join('')}</div>
  <script>
    // Wait for the logo and member photos so nothing prints half-loaded.
    window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 350); });
  </script>
</body>
</html>`;
}

/** Opens the print window for the given cards. Returns false if popups are blocked. */
export function printIdCards(cards: string[]): boolean {
  const w = window.open('', '_blank', 'width=980,height=760');
  if (!w) return false;
  w.document.write(idCardSheetHtml(cards));
  w.document.close();
  w.focus();
  return true;
}
