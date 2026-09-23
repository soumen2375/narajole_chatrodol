/**
 * src/lib/partnership.ts
 *
 * The Anandadhara 2026 partnership invitation: an email to a company or
 * brand's CSR / marketing team asking them to sponsor children in the
 * programme. Its content is the Corporate CSR Proposal, condensed — the
 * programme at a glance, the ₹1,000 package, the partner levels and the ways
 * to take part — with the full PDF linked (and optionally attached).
 *
 * One HTML document is built for the whole send. It carries two
 * placeholders, {{name}} and {{company}}, which api/send-partnership.ts fills
 * per recipient (HTML-escaped) so each company reads a letter addressed to it.
 *
 * Mail-client rules are the newsletter's: tables, inline styles, PNG icons
 * from storage, percentage columns that shrink instead of stacking.
 */

import {
  C,
  FONT,
  ICON_BASE,
  P,
  SITE_URL,
  absoluteUrl,
  esc,
  framedImage,
  paragraphs,
  pillButton,
} from './newsletter';

export const PARTNER_CAMPAIGN = 'anandadhara-2026';

/** Where the proposal PDF lives; the server attaches it from here and only here. */
export const PROPOSAL_PDF_URL =
  'https://wzquszbmbpkbhyythdrj.supabase.co/storage/v1/object/public/cswo-media/partnership/anandadhara-2026-invitation-letter.pdf';

export const ANANDADHARA_VIDEO_URL = 'https://youtu.be/gF6ErpbRXJo';

export interface PartnershipPitch {
  subject: string;
  /** Poster shown whole at the top. Should be a storage URL so inboxes can load it. */
  poster: string;
  /** The letter's opening; may use {{company}}. Blank line = new paragraph. */
  opening: string;
  senderName: string;
  senderRole: string;
  senderPhone: string;
  senderEmail: string;
  /** Attach the proposal PDF as well as linking to it. */
  attachProposal: boolean;
}

export interface PartnerRecipient {
  company: string;
  name: string;
  email: string;
}

export const DEFAULT_PITCH: PartnershipPitch = {
  subject: 'Partnership invitation: Anandadhara 2026 — help 1,000+ children celebrate Durga Puja',
  poster: '/assets/images/anandadhara-2026-poster-en.jpg',
  opening:
    'On behalf of Chhatradol Social Welfare Organization, I am writing to invite {{company}} to partner with Anandadhara 2026, the 7th year of our Durga Puja initiative for children from financially vulnerable families in Medinipur and Jhargram, West Bengal.\n\n' +
    'From 10 to 16 October 2026 we aim to reach 1,000+ children with new Puja clothing, books and reading materials, and food and festive treats, so that every child can feel part of the celebration. A partnership with {{company}} would let us reach more children, and every contribution is tied to a clear, countable outcome: ₹1,000 supports one child completely.',
  senderName: 'Sayan Samanta',
  senderRole: 'Secretary of CSWO',
  senderPhone: '+91 7811073412',
  senderEmail: 'info@chhatradol.org',
  attachProposal: true,
};

const LEVELS: [string, string, string][] = [
  ['Community Partner', '25', '₹25,000'],
  ['Supporting Partner', '50', '₹50,000'],
  ['Impact Partner', '100', '₹1,00,000'],
  ['Programme Partner', '250', '₹2,50,000'],
  ['Major Partner', '500', '₹5,00,000'],
  ['Principal Programme Partner', '1,000', '₹10,00,000'],
];

const WAYS: [string, string][] = [
  ['Programme Sponsorship', 'Support Anandadhara for a defined number of children through a financial contribution.'],
  ['Clothing Partnership', 'Provide new Puja clothing for children through an in-kind partnership.'],
  ['Educational Partnership', 'Books, reading materials, stationery or other educational resources.'],
  ['Food & Festive Partnership', 'Food, dry fruits, sweets, chocolates and other festive components.'],
  ['Complete Child Support', 'Sponsor the full ₹1,000 package for a defined number of children.'],
  ['Employee Engagement', 'Employee giving, volunteering or other engagement initiatives.'],
];

// ── Blocks ──────────────────────────────────────────────────────────────────

const pad = (inner: string, top = 26) =>
  `<tr><td class="pp-pad" style="padding:${top}px 22px 0;background:${C.cream};">${inner}</td></tr>`;

function heading(kicker: string, title: string): string {
  return `<div style="font-family:${FONT};font-size:11px;line-height:1.4;font-weight:bold;letter-spacing:2.5px;color:${P.band};text-transform:uppercase;margin:0 0 4px;text-align:center;">${esc(kicker)}</div>
  <div class="pp-h" style="font-family:${FONT};font-size:20px;line-height:1.3;font-weight:bold;color:${C.ink};margin:0 0 14px;text-align:center;">${esc(title)}</div>`;
}

function masthead(): string {
  return `<tr><td bgcolor="#42091b" class="pp-mast" style="background:#42091b;background-image:linear-gradient(135deg,#58181D 0%,#42091b 60%,#300612 100%);padding:11px 16px;text-align:center;font-family:${FONT};font-size:13px;line-height:1.6;font-weight:bold;color:#ffffff;border-bottom:2px solid ${P.gold};">
  <span style="white-space:nowrap;letter-spacing:0.5px;">CSR &amp; Corporate Partnership Invitation&nbsp;&nbsp;|</span> &nbsp;<span style="white-space:nowrap;color:${P.gold};">Anandadhara &ndash; 2026</span>
</td></tr>`;
}

function posterBand(pitch: PartnershipPitch, assetBase: string, replyHref: string): string {
  const img = absoluteUrl(pitch.poster, assetBase);
  return `<tr><td class="pp-top" style="padding:16px 16px 0;background:${C.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td bgcolor="${P.band}" class="pp-poster-pad" style="background:${P.band};background-image:linear-gradient(165deg,${P.bandHi} 0%,${P.band} 55%,#5e2a0c 100%);border-radius:24px;padding:18px 22px 24px;text-align:center;">
      <div style="font-family:${FONT};font-size:11px;line-height:1.4;font-weight:bold;letter-spacing:3px;color:${P.gold};margin:0 0 14px;">&#10022;&nbsp; 7TH YEAR OF ANANDADHARA &nbsp;&#10022;</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="${P.mat}" style="background:${P.mat};border-radius:16px;padding:7px;box-shadow:0 8px 22px rgba(40,15,0,0.45);line-height:0;font-size:0;">
          ${framedImage(img, 'poster', 'Anandadhara 2026 — Chhatradol Social Welfare Organization', 'margin:0 auto;border-radius:11px;')}
        </td>
      </tr></table>
      <div class="pp-poster-title" style="font-family:${FONT};font-size:21px;line-height:1.3;font-weight:bold;color:#ffffff;margin:18px 0 4px;">Spreading the Joy of Puja,<br>Sharing the Gift of Hope</div>
      <div style="font-family:${FONT};font-size:13px;line-height:1.5;color:${P.text};margin:0 0 16px;">A CSR &amp; Corporate Partnership Initiative</div>
      ${pillButton(replyHref, 'Become a Partner', P.gold, P.ink, 14, '10px 26px')}
    </td>
  </tr></table>
</td></tr>`;
}

function letter(pitch: PartnershipPitch): string {
  const p = `margin:0 0 12px;font-family:${FONT};font-size:14px;line-height:1.7;color:${C.ink};text-align:justify;`;
  return pad(`<p class="pp-p" style="${p}">Dear {{name}},</p>
  ${paragraphs(pitch.opening, p).replace(/<p /g, '<p class="pp-p" ')}`, 24);
}

function tile(value: string, label: string, bg: string, fg = '#ffffff'): string {
  // Colour sits on the cell itself so every tile in the row is equally tall.
  return `<td class="pp-tile" width="33.3%" valign="middle" bgcolor="${bg}" style="width:33.3%;background:${bg};border-radius:14px;padding:16px 8px;text-align:center;">
      <div class="pp-tile-v" style="font-family:${FONT};font-size:19px;line-height:1.2;font-weight:bold;color:${fg};">${value}</div>
      <div class="pp-tile-l" style="font-family:${FONT};font-size:11px;line-height:1.4;color:${fg};opacity:0.9;margin-top:6px;text-transform:uppercase;letter-spacing:0.8px;">${label}</div>
  </td>`;
}

function atAGlance(): string {
  return pad(`${heading('Anandadhara 2026', 'The programme at a glance')}
  <table role="presentation" class="pp-grid" width="100%" cellpadding="0" cellspacing="8" border="0" style="table-layout:fixed;border-collapse:separate;border-spacing:8px;margin:0 -8px;width:calc(100% + 16px);"><tr>
    ${tile('10&ndash;16 Oct', 'Programme period 2026', C.green)}
    ${tile('Medinipur &amp; Jhargram', 'West Bengal', '#1e3a5f')}
    ${tile('1,000+', 'Children to reach', '#8f2116')}
  </tr></table>`);
}

function packageBlock(): string {
  const part = (amount: string, what: string) => `<td class="pp-tile" width="33.3%" valign="middle" bgcolor="#ffffff" style="width:33.3%;background:#ffffff;border:1px solid #ecd9bf;border-radius:14px;padding:14px 8px;text-align:center;">
      <div class="pp-tile-v" style="font-family:${FONT};font-size:20px;line-height:1.2;font-weight:bold;color:${P.band};">${amount}</div>
      <div class="pp-tile-l" style="font-family:${FONT};font-size:12px;line-height:1.4;color:${C.ink};margin-top:6px;">${what}</div>
  </td>`;
  return pad(`${heading('One child. One complete package.', '₹1,000 = One Child’s Anandadhara Support')}
  <table role="presentation" class="pp-grid" width="100%" cellpadding="0" cellspacing="8" border="0" style="table-layout:fixed;border-collapse:separate;border-spacing:8px;margin:0 -8px;width:calc(100% + 16px);"><tr>
    ${part('₹500', 'New Puja clothing')}
    ${part('₹200', 'Books &amp; reading materials')}
    ${part('₹300', 'Food, dry fruits, sweets &amp; chocolate')}
  </tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;"><tr>
    <td bgcolor="${P.mat}" style="background:${P.mat};border-radius:12px;padding:12px 16px;text-align:center;font-family:${FONT};font-size:14px;line-height:1.5;color:${P.ink};">
      Estimated direct programme support: <b>₹10,00,000</b> for 1,000 children
    </td>
  </tr></table>`);
}

function levelsBlock(): string {
  const rows = LEVELS.map(([name, kids, amt], i) => {
    const top = i === LEVELS.length - 1;
    const bg = top ? P.mat : i % 2 ? '#ffffff' : '#fbf6ee';
    return `<tr>
      <td class="pp-td" style="background:${bg};padding:10px 12px;font-family:${FONT};font-size:13px;line-height:1.4;color:${C.ink};border-top:1px solid #efe1cc;${top ? 'font-weight:bold;' : ''}">${top ? '&#9733; ' : ''}${esc(name)}</td>
      <td class="pp-td" align="center" style="background:${bg};padding:10px 8px;font-family:${FONT};font-size:13px;line-height:1.4;color:${C.ink};border-top:1px solid #efe1cc;text-align:center;">${kids}</td>
      <td class="pp-td" align="right" style="background:${bg};padding:10px 12px;font-family:${FONT};font-size:13px;line-height:1.4;font-weight:bold;color:${P.band};border-top:1px solid #efe1cc;text-align:right;white-space:nowrap;">${amt}</td>
    </tr>`;
  }).join('');
  return pad(`${heading('Your support. Their celebration.', 'Partnership opportunities')}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:12px;overflow:hidden;border:1px solid #ecd9bf;border-collapse:separate;">
    <tr>
      <td bgcolor="${P.band}" style="background:${P.band};padding:10px 12px;font-family:${FONT};font-size:11px;letter-spacing:1px;font-weight:bold;color:#ffffff;text-transform:uppercase;">Partnership</td>
      <td bgcolor="${P.band}" align="center" style="background:${P.band};padding:10px 8px;font-family:${FONT};font-size:11px;letter-spacing:1px;font-weight:bold;color:#ffffff;text-transform:uppercase;text-align:center;">Children</td>
      <td bgcolor="${P.band}" align="right" style="background:${P.band};padding:10px 12px;font-family:${FONT};font-size:11px;letter-spacing:1px;font-weight:bold;color:#ffffff;text-transform:uppercase;text-align:right;">Support</td>
    </tr>
    ${rows}
  </table>
  <p class="pp-note" style="margin:10px 0 0;font-family:${FONT};font-size:11px;line-height:1.55;color:${C.muted};text-align:justify;">Support beyond the initial 1,000-child target is welcome. These are indicative programme-support amounts and do not by themselves mean a contribution qualifies as statutory CSR expenditure.</p>`);
}

function waysBlock(): string {
  const cell = ([title, text]: [string, string], n: number) => `<td class="pp-way" width="50%" valign="top" bgcolor="#ffffff" style="width:50%;background:#ffffff;border:1px solid #dfe8d8;border-radius:14px;padding:14px;">
      <div style="font-family:${FONT};font-size:11px;line-height:1;font-weight:bold;color:${C.yellow};background:${C.green};display:inline-block;border-radius:999px;padding:5px 8px;margin:0 0 8px;">0${n}</div>
      <div class="pp-way-t" style="font-family:${FONT};font-size:14px;line-height:1.3;font-weight:bold;color:${C.ink};margin:0 0 4px;">${esc(title)}</div>
      <div class="pp-way-d" style="font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted};text-align:justify;">${esc(text)}</div>
  </td>`;
  const rows: string[] = [];
  for (let i = 0; i < WAYS.length; i += 2) {
    rows.push(`<tr>${cell(WAYS[i], i + 1)}${cell(WAYS[i + 1], i + 2)}</tr>`);
  }
  return pad(`${heading('How corporate partners can help', 'Six ways to be part of Anandadhara')}
  <table role="presentation" class="pp-grid" width="100%" cellpadding="0" cellspacing="8" border="0" style="table-layout:fixed;border-collapse:separate;border-spacing:8px;margin:0 -8px;width:calc(100% + 16px);">${rows.join('')}</table>
  <p class="pp-note" style="margin:8px 0 0;font-family:${FONT};font-size:12px;line-height:1.55;color:${C.muted};text-align:center;">Every partnership can be structured around your organisation’s requirements and policies.</p>`);
}

function credentialsBlock(): string {
  const badge = (t: string) =>
    `<td class="pp-badge" style="padding:3px;"><span style="display:inline-block;background:#ffffff;border:1px solid #e0c8ab;border-radius:999px;padding:6px 12px;font-family:${FONT};font-size:12px;font-weight:bold;color:${P.band};white-space:nowrap;">&#10003; ${t}</span></td>`;
  return pad(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td bgcolor="${P.mat}" style="background:${P.mat};border-radius:16px;padding:18px 14px;text-align:center;">
      <div style="font-family:${FONT};font-size:11px;line-height:1.4;font-weight:bold;letter-spacing:2.5px;color:${P.band};text-transform:uppercase;margin:0 0 10px;">Organisational credentials</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>
        ${badge('Registered')}${badge('PAN')}${badge('12A')}${badge('80G')}
      </tr></table>
      <div style="font-family:${FONT};font-size:12px;line-height:1.6;color:${P.ink};margin-top:10px;">Reg. No.: IV-100200047/2026 &nbsp;&middot;&nbsp; DARPAN ID: WB/2026/1138665<br>Registration and statutory documents are available on request.</div>
    </td>
  </tr></table>`);
}

function videoBlock(): string {
  const thumb = 'https://img.youtube.com/vi/gF6ErpbRXJo/hqdefault.jpg';
  return pad(`${heading('Experience Anandadhara 2025', 'See last year’s programme')}
  <a href="${ANANDADHARA_VIDEO_URL}" target="_blank" style="text-decoration:none;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:14px;overflow:hidden;line-height:0;font-size:0;background:#000000;">
        <img src="${thumb}" width="556" alt="Watch the Anandadhara 2025 video" class="pp-img" style="display:block;width:100%;max-width:556px;height:auto;aspect-ratio:16/9;object-fit:cover;border:0;border-radius:14px;">
      </td>
    </tr></table>
  </a>
  <div style="padding:12px 0 0;">${pillButton(ANANDADHARA_VIDEO_URL, '▶  Watch the 2025 video', '#ff0000', '#ffffff', 13)}</div>
  <p class="pp-note" style="margin:10px 0 0;font-family:${FONT};font-size:12px;line-height:1.55;color:${C.muted};text-align:center;">We believe transparency begins by showing the work we do.</p>`);
}

function ctaBand(replyHref: string, _assetBase: string): string {
  // Link to the static PDF in Supabase storage — always reachable in production.
  // (The /api/partnership-letter-pdf route is dev-only middleware and 404s when deployed.)
  const letterPdfLink = PROPOSAL_PDF_URL;
  return pad(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td bgcolor="${P.band}" class="pp-cta-pad" style="background:${P.band};background-image:linear-gradient(165deg,${P.bandHi} 0%,${P.band} 55%,#5e2a0c 100%);border-radius:20px;padding:26px 26px 24px;text-align:center;">
      <div style="font-family:${FONT};font-size:11px;line-height:1.4;font-weight:bold;letter-spacing:3px;color:${P.gold};margin:0 0 10px;">&#10022;&nbsp; PARTNER WITH ANANDADHARA 2026 &nbsp;&#10022;</div>
      <div class="pp-cta-title" style="font-family:${FONT};font-size:21px;line-height:1.3;font-weight:bold;color:#ffffff;margin:0 0 10px;">Together, we can make the celebration bigger</div>
      <p style="margin:0 0 18px;font-family:${FONT};font-size:14px;line-height:1.65;color:${P.text};text-align:justify;">A new Puja outfit, a new book, a festive meal and a moment of happiness &mdash; and most importantly, a child’s feeling of being included. We would be glad to set up a short call to shape a partnership that suits {{company}}.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>
        <td class="pp-btn" style="padding:4px;">${pillButton(replyHref, 'Reply to discuss a partnership', P.gold, P.ink, 14, '12px 22px')}</td>
      </tr><tr>
        <td class="pp-btn" style="padding:4px;">${pillButton(letterPdfLink, 'Download the letter (PDF)', '#ffffff', P.band, 13, '10px 22px')}</td>
      </tr></table>
    </td>
  </tr></table>`);
}

function signOff(pitch: PartnershipPitch): string {
  const phone = pitch.senderPhone.replace(/[^\d+]/g, '');
  return pad(`<p class="pp-p" style="margin:0 0 4px;font-family:${FONT};font-size:14px;line-height:1.7;color:${C.ink};">With warm regards,</p>
  <p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.ink};">
    <b>${esc(pitch.senderName)}</b><br>
    ${esc(pitch.senderRole)}<br>
    ${pitch.senderPhone ? `<a href="tel:${esc(phone)}" style="color:${P.band};font-weight:bold;text-decoration:none;">${esc(pitch.senderPhone)}</a>` : ''}${pitch.senderPhone && pitch.senderEmail ? '&nbsp; | ' : ''}${pitch.senderEmail ? `<a href="mailto:${esc(pitch.senderEmail)}" style="color:${P.band};font-weight:bold;text-decoration:none;">${esc(pitch.senderEmail)}</a>` : ''}
  </p>`, 24);
}

function partnershipContactCard(): string {
  const row = (icon: string, label: string, html: string) => `<tr>
    <td width="40" valign="top" style="padding:7px 12px 7px 0;"><img src="${ICON_BASE}/${icon}.png" width="30" height="30" alt="${esc(label)}" style="display:block;width:30px;height:30px;border:0;"></td>
    <td valign="middle" style="padding:7px 0;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.ink};text-align:left;"><span style="display:block;font-size:11px;line-height:1.3;color:${C.muted};text-transform:uppercase;letter-spacing:0.8px;">${esc(label)}</span>${html}</td>
  </tr>`;
  const social = (icon: string, label: string, href: string) =>
    `<td style="padding:0 5px;"><a href="${href}" target="_blank" style="text-decoration:none;"><img src="${ICON_BASE}/${icon}.png" width="36" height="36" alt="${esc(label)}" style="display:block;width:36px;height:36px;border:0;"></a></td>`;
  const link = `color:${P.band};font-weight:bold;text-decoration:none;`;

  return `<tr><td class="nl-bar-pad" style="padding:34px 16px 0;background:${C.cream};">
  <a name="pp-contact"></a>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td id="pp-contact" bgcolor="${P.band}" style="background:${P.band};background-image:linear-gradient(165deg,${P.bandHi} 0%,${P.band} 55%,#5e2a0c 100%);border-bottom:3px solid ${P.gold};border-radius:6px 6px 0 0;padding:10px 12px;text-align:center;font-family:${FONT};font-size:17px;line-height:1.3;font-weight:bold;letter-spacing:0.6px;color:#ffffff;">CONTACT US</td>
  </tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border:1px solid #ecd9bf;border-top:0;border-radius:0 0 12px 12px;">
    <tr><td class="nl-contact-pad" align="center" style="padding:20px 24px 22px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;max-width:420px;">
        ${row('location', 'Office', 'Vill. &amp; P.O.: Nij Narajole, P.S.: Daspur,<br>Paschim Medinipur, West Bengal 721211')}
        ${row('phone', 'Call / WhatsApp', `<a href="tel:+917811073412" style="${link}">+91 78110 73412</a>`)}
        ${row('mail', 'Email', `<a href="mailto:info@chhatradol.org" style="${link}">info@chhatradol.org</a>`)}
        ${row('web', 'Website', `<a href="${SITE_URL}" target="_blank" style="${link}">www.chhatradol.org</a>`)}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 16px;"><tr><td style="border-top:1px solid #ecd9bf;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <div style="font-family:${FONT};font-size:11px;line-height:1.3;letter-spacing:1.5px;color:${C.muted};text-transform:uppercase;margin:0 0 10px;">Follow us</div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>
        ${social('facebook', 'Facebook', 'https://facebook.com/chhatradolswo')}
        ${social('instagram', 'Instagram', 'https://instagram.com/chhatradolswo')}
        ${social('x', 'X', 'https://x.com/Chhatradolswo')}
        ${social('youtube', 'YouTube', 'https://youtube.com/@Chhatradolswo')}
        ${social('whatsapp', 'WhatsApp', 'https://wa.me/917811073412')}
      </tr></table>
    </td></tr>
  </table>
</td></tr>`;
}

function footer(): string {
  return `<tr><td style="padding:28px 0 0;background:${C.cream};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="border-top:2px solid ${P.gold};font-size:0;line-height:0;background:${C.cream};"></td></tr>
<tr><td style="background:#fdf8f2;padding:18px 24px 22px;text-align:center;font-family:${FONT};font-size:11px;line-height:1.8;color:#7a6050;">
  <span style="display:block;font-weight:bold;font-size:12px;color:#42091b;letter-spacing:0.3px;margin-bottom:4px;">Chhatradol Social Welfare Organization</span>
  Vill. &amp; P.O.: Nij Narajole, Paschim Medinipur, WB 721211 &nbsp;&middot;&nbsp; <a href="mailto:info@chhatradol.org" style="color:#7a3515;text-decoration:none;">info@chhatradol.org</a><br>
  <span style="color:#b0967e;font-size:10px;">This is a one-time invitation sent to {{company}}. Reply &ldquo;Unsubscribe&rdquo; to opt out.</span>
</td></tr>`;
}

// ── Public ──────────────────────────────────────────────────────────────────

export interface PartnershipBuildOptions {
  /** Where relative image paths resolve; the preview passes its own origin. */
  assetBase?: string;
}

/**
 * The invitation with {{name}} and {{company}} still in it. Use
 * personalisePartnership() to fill them for a preview; the server fills them
 * for each real recipient.
 */
export function buildPartnershipHtml(pitch: PartnershipPitch, options: PartnershipBuildOptions = {}): string {
  const assetBase = options.assetBase ?? SITE_URL;
  const reply = `mailto:${pitch.senderEmail || 'info@chhatradol.org'}?subject=${encodeURIComponent('Anandadhara 2026 partnership — {{company}}')}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, address=no, email=no">
<title>${esc(pitch.subject)}</title>
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  @media only screen and (max-width: 620px) {
    .pp-outer { padding:0 !important; }
    .pp-mast { font-size:11px !important; padding:8px 10px !important; }
    .pp-top { padding:10px 10px 0 !important; }
    .pp-poster-pad { padding:14px 12px 18px !important; }
    .pp-poster-title { font-size:17px !important; }
    .pp-pad { padding:20px 12px 0 !important; }
    .pp-h { font-size:16px !important; margin:0 0 10px !important; }
    .pp-p { font-size:13px !important; line-height:1.6 !important; }
    .pp-grid { border-spacing:5px !important; margin:0 -5px !important; width:calc(100% + 10px) !important; }
    .pp-tile { padding:11px 4px !important; border-radius:10px !important; }
    .pp-tile-v { font-size:14px !important; }
    .pp-tile-l { font-size:9px !important; letter-spacing:0.3px !important; }
    .pp-td { font-size:12px !important; padding:8px 7px !important; }
    .pp-way { padding:10px !important; }
    .pp-way-t { font-size:12px !important; }
    .pp-way-d { font-size:11px !important; line-height:1.45 !important; }
    .pp-badge span { font-size:10px !important; padding:5px 8px !important; }
    .pp-cta-pad { padding:20px 14px 18px !important; }
    .pp-cta-title { font-size:17px !important; }
    .pp-btn a { font-size:12px !important; padding:10px 14px !important; }
    .nl-bar-pad { padding:20px 10px 0 !important; }
    .nl-contact-pad { padding:18px 14px 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">Help 1,000+ children celebrate Durga Puja — ₹1,000 supports one child completely.&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="pp-outer" align="center" style="padding:20px 8px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.cream};margin:0 auto;">
${masthead()}
${posterBand(pitch, assetBase, reply)}
${letter(pitch)}
${atAGlance()}
${packageBlock()}
${levelsBlock()}
${waysBlock()}
${credentialsBlock()}
${videoBlock()}
${ctaBand(reply, assetBase)}
${signOff(pitch)}
${partnershipContactCard()}
${footer()}
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Fills {{name}} / {{company}} the way the server does, for the preview and tests. */
export function personalisePartnership(html: string, r: Pick<PartnerRecipient, 'name' | 'company'>): string {
  const name = r.name.trim() || (r.company.trim() ? `${r.company.trim()} Team` : 'Sir / Madam');
  const company = r.company.trim() || 'your organisation';
  const safe = (s: string) => esc(s);
  return html
    .replace(/\{\{name\}\}/g, safe(name))
    .replace(/%7B%7Bcompany%7D%7D/g, encodeURIComponent(company))
    .replace(/\{\{company\}\}/g, safe(company));
}

/**
 * Reads recipients pasted one per line as "Company, Contact name, email" (any
 * order of the first two; the email is found wherever it is).
 */
export function parseRecipients(text: string): PartnerRecipient[] {
  const out: PartnerRecipient[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const email = line.match(/[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/)?.[0];
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    const rest = line.replace(email, '').replace(/[<>]/g, '').split(/[,;\t]/).map((s) => s.trim()).filter(Boolean);
    out.push({ company: rest[0] ?? '', name: rest[1] ?? '', email });
  }
  return out;
}
