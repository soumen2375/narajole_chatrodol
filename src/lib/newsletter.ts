/**
 * src/lib/newsletter.ts
 *
 * Builds the monthly Chhatradol newsletter as one email-safe HTML document.
 *
 * The layout follows the university-bulletin pattern the committee liked:
 * a masthead strip, a hero photo under the logo panel, an "In this issue"
 * index, a grid of coloured teaser cards (one per section), then each
 * section in full — header bar, headline, photo, paragraph, divider — and a
 * contact block.
 *
 * Mail clients are the constraint on every choice here:
 *
 *  - Tables and inline styles only; Gmail drops most of <head>.
 *  - The card grid is "hybrid": inline-block columns with a max-width, so
 *    they sit three across on a desktop and fall onto their own lines on a
 *    phone even where media queries are stripped. Outlook for Windows, which
 *    ignores max-width, gets ghost tables in conditional comments.
 *  - Gmail and Outlook ignore object-fit, so a photo is only guaranteed to
 *    fill its frame if the file itself already has the frame's shape. The
 *    editor crops every photo to the exact size before sending and passes
 *    the cropped URLs in `crops`; object-fit/aspect-ratio are kept only so
 *    the in-browser preview looks right before that happens.
 *  - Icons are PNG. No mail client that matters renders inline SVG. They and
 *    the logo are served from Supabase storage rather than the website, so an
 *    email never shows broken images because a deploy is pending. The source
 *    files are kept in public/assets/images/newsletter/.
 */

export const SITE_URL = 'https://www.chhatradol.org';

/** Public storage folder holding the newsletter's logo and icon PNGs. */
export const ICON_BASE =
  'https://wzquszbmbpkbhyythdrj.supabase.co/storage/v1/object/public/post-images/newsletter/icons';

/** Words a story may run to before it is cut and left to "Read the full story". */
export const DEFAULT_WORD_LIMIT = 90;

export type NewsletterSectionKey =
  | 'cover'
  | 'highlights'
  | 'community'
  | 'programs'
  | 'members'
  | 'upcoming';

export interface NewsletterSection {
  key: NewsletterSectionKey;
  title: string;
  /** Teaser card background. */
  color: string;
}

/** Order here is the order they print in. */
export const NEWSLETTER_SECTIONS: NewsletterSection[] = [
  { key: 'cover', title: 'Cover Story', color: '#8f2116' },
  { key: 'highlights', title: 'Highlights of the Month', color: '#0d4d3d' },
  { key: 'community', title: 'Community Connect', color: '#1e3a5f' },
  { key: 'programs', title: 'Programmes & Campaigns', color: '#5b2a86' },
  { key: 'members', title: "Members' Corner", color: '#9a4a07' },
  { key: 'upcoming', title: 'Upcoming Events', color: '#0f5e75' },
];

/** Short card titles — the full ones wrap at card width. */
const CARD_TITLES: Record<NewsletterSectionKey, string> = {
  cover: 'Cover Story',
  highlights: 'Highlights',
  community: 'Community Connect',
  programs: 'Programmes',
  members: "Members' Corner",
  upcoming: 'Upcoming',
};

export interface NewsletterItem {
  id: string;
  section: NewsletterSectionKey;
  title: string;
  /** Plain text; blank lines start new paragraphs. */
  body: string;
  image: string;
  /** "Read more" target. Relative paths are resolved against the site. */
  link: string;
}

/** Pre-cropped copies of one source photo, keyed by frame. */
export interface NewsletterCrop {
  hero?: string;
  card?: string;
  story?: string;
  poster?: string;
}

/**
 * The month's campaign poster. When set it is the first picture in the
 * email, shown whole (never cropped) in a framed band above the logo panel,
 * and its words carry the donate appeal at the foot of the email.
 */
export interface NewsletterPoster {
  image: string;
  title: string;
  text: string;
  link: string;
}

export interface NewsletterIssue {
  issueNo: string;
  /** "September-2026" — printed in the masthead strip. */
  monthLabel: string;
  subject: string;
  /** Landscape photo above the logo panel; unused while a poster is set. */
  heroImage: string;
  poster?: NewsletterPoster | null;
  /** Optional note from the secretary, printed above the card grid. */
  intro: string;
  items: NewsletterItem[];
  /** Source photo URL → its cropped copies. Filled in by the editor. */
  crops?: Record<string, NewsletterCrop>;
  /** Longest a story may run in the email, in words. */
  wordLimit?: number;
}

export interface BuildOptions {
  /**
   * Where relative photo paths (/assets/...) resolve. The sent email must use
   * the public site; the editor's preview passes its own origin so photos
   * that are only on this machine still show.
   */
  assetBase?: string;
}

// ── Frame sizes (display px; crops are made at 2× for sharp phones) ─────────

export const FRAMES = {
  hero: { w: 568, h: 320 },
  card: { w: 158, h: 100 },
  story: { w: 544, h: 340 },
  /** h 0: keep the file's own proportions — a poster is resized, never cropped. */
  poster: { w: 512, h: 0 },
} as const;
export type FrameKey = keyof typeof FRAMES;

/** The campaign poster's colours: a warm brown band with cream and gold. */
export const P = {
  band: '#7a3a14',
  bandHi: '#9a4f1f',
  mat: '#f6e7cf',
  text: '#fbeedd',
  gold: '#ffc800',
  ink: '#3b1a06',
};

// ── Palette (the public site's green system) ───────────────────────────────

export const C = {
  green: '#0d4d3d',
  greenDeep: '#083528',
  cream: '#f4f9ea',
  page: '#e9efe1',
  yellow: '#ffc800',
  red: '#e2492e',
  ink: '#1f2a24',
  muted: '#5b6b62',
  rule: '#c9d6c4',
};

export const FONT = 'Arial, Helvetica, sans-serif';

// ── Helpers ─────────────────────────────────────────────────────────────────

export function esc(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Mail clients have no base URL, so every link and image must be absolute. */
export function absoluteUrl(src: string, base = SITE_URL): string {
  const s = String(src ?? '').trim();
  if (!s) return '';
  if (/^(https?:|mailto:|tel:|data:)/i.test(s)) return s;
  return `${base.replace(/\/$/, '')}${s.startsWith('/') ? '' : '/'}${s}`;
}

export function paragraphs(body: string, style: string): string {
  return String(body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="${style}">${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** First `max` characters, cut at a word. */
export function teaser(body: string, max = 150): string {
  const flat = String(body ?? '').replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).trim()}…`;
}

/**
 * Keeps whole paragraphs until the story reaches `limit` words, then ends the
 * last one at a sentence if that keeps most of it, else at a word with "…".
 * The full text stays on the website behind "Read the full story".
 */
export function limitWords(body: string, limit: number): string {
  const paras = String(body ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  let used = 0;
  for (const p of paras) {
    const words = p.split(/\s+/);
    if (used + words.length <= limit) {
      out.push(p);
      used += words.length;
      continue;
    }
    const room = limit - used;
    if (room >= 12) {
      const cut = words.slice(0, room).join(' ');
      const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('।'), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
      out.push(stop > cut.length * 0.6 ? cut.slice(0, stop + 1) : `${cut.replace(/[,;:\s]+$/, '')}…`);
    } else if (out.length) {
      out[out.length - 1] = out[out.length - 1].replace(/([^.!?।…])$/, '$1…');
    }
    break;
  }
  return out.join('\n\n');
}

/**
 * What a story prints in the email: its first paragraph only, and no more
 * than `limit` words of that. The rest waits behind "Read the full story".
 */
export function storyText(body: string, limit: number): string {
  const first = String(body ?? '').split(/\n\s*\n/).map((p) => p.trim()).find(Boolean) ?? '';
  return limitWords(first, limit);
}

function anchor(key: NewsletterSectionKey): string {
  return `nl-${key}`;
}

export function pillButton(href: string, label: string, bg: string, fg: string, size = 12, pad = '7px 18px'): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr>
<td bgcolor="${bg}" style="border-radius:999px;background:${bg};mso-padding-alt:${pad};">
<a href="${esc(href)}" target="_blank" style="display:inline-block;padding:${pad};font-family:${FONT};font-size:${size}px;line-height:1.2;font-weight:bold;color:${fg};text-decoration:none;border-radius:999px;">${esc(label)}</a>
</td></tr></table>`;
}

/** A photo that fills its frame whether or not the file was cropped yet. */
export function framedImage(src: string, frame: FrameKey, alt: string, extra = ''): string {
  const { w, h } = FRAMES[frame];
  if (!h) {
    return `<img src="${esc(src)}" width="${w}" alt="${esc(alt)}" class="nl-img" style="display:block;width:100%;max-width:${w}px;height:auto;border:0;outline:none;text-decoration:none;${extra}">`;
  }
  return `<img src="${esc(src)}" width="${w}" height="${h}" alt="${esc(alt)}" class="nl-img" style="display:block;width:100%;max-width:${w}px;height:auto;aspect-ratio:${w}/${h};object-fit:cover;border:0;outline:none;text-decoration:none;${extra}">`;
}

// ── Blocks ──────────────────────────────────────────────────────────────────

interface Ctx {
  issue: NewsletterIssue;
  asset: (src: string) => string;
  photo: (src: string, frame: FrameKey) => string;
}

function masthead({ issue }: Ctx): string {
  const parts = [
    issue.issueNo ? `Issue-${esc(issue.issueNo)}` : '',
    'Newsletter for Members, Donors and Friends',
    esc(issue.monthLabel),
  ].filter(Boolean);
  // Separator travels with the part before it, so a wrap never strands a "|".
  const line = parts
    .map((p, i) => `<span style="white-space:nowrap;">${p}${i < parts.length - 1 ? '&nbsp;&nbsp;|' : ''}</span>`)
    .join(' &nbsp;');
  return `<tr><td bgcolor="${C.greenDeep}" class="nl-mast" style="background:${C.greenDeep};padding:10px 16px;text-align:center;font-family:${FONT};font-size:13px;line-height:1.6;font-weight:bold;color:#ffffff;">${line}</td></tr>`;
}

/**
 * The campaign poster, whole, on a cream mat inside a warm brown band taken
 * from the poster's own palette, with its appeal and a sponsor button.
 */
function posterBand(poster: NewsletterPoster, img: string): string {
  return `<tr><td bgcolor="${P.band}" class="nl-poster-pad" style="background:${P.band};background-image:linear-gradient(165deg,${P.bandHi} 0%,${P.band} 55%,#5e2a0c 100%);border-radius:24px 24px 0 0;padding:18px 22px 24px;text-align:center;">
      <div class="nl-poster-kicker" style="font-family:${FONT};font-size:11px;line-height:1.4;font-weight:bold;letter-spacing:3px;color:${P.gold};margin:0 0 14px;">&#10022;&nbsp; FEATURED CAMPAIGN &nbsp;&#10022;</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td bgcolor="${P.mat}" style="background:${P.mat};border-radius:16px;padding:7px;box-shadow:0 8px 22px rgba(40,15,0,0.45);line-height:0;font-size:0;">
          <a href="${esc(absoluteUrl(poster.link || '/donate'))}" target="_blank" style="text-decoration:none;">${framedImage(img, 'poster', poster.title, 'margin:0 auto;border-radius:11px;')}</a>
        </td>
      </tr></table>
      ${poster.title ? `<div class="nl-poster-title" style="font-family:${FONT};font-size:21px;line-height:1.3;font-weight:bold;color:#ffffff;margin:18px 0 8px;">${esc(poster.title)}</div>` : ''}
      ${poster.text ? paragraphs(poster.text, `margin:0 0 16px;font-family:${FONT};font-size:14px;line-height:1.65;color:${P.text};text-align:justify;`) : ''}
      ${pillButton(absoluteUrl(poster.link || '/donate'), 'Sponsor a Child — Donate', P.gold, P.ink, 14, '10px 24px')}
    </td></tr>`;
}

function hero(ctx: Ctx, sectionsUsed: NewsletterSection[]): string {
  const { issue, photo } = ctx;
  const poster = issue.poster?.image.trim() ? issue.poster : null;
  const posterImg = poster ? photo(poster.image, 'poster') : '';
  const heroImg = posterImg ? '' : photo(issue.heroImage, 'hero');
  // Each link carries its own separator and never wraps inside itself, so a
  // line break can only fall between whole entries.
  const entries = sectionsUsed
    .map((s) => ({ href: `#${anchor(s.key)}`, label: CARD_TITLES[s.key] }))
    .concat({ href: '#nl-contact', label: 'Contact' });
  const index = entries
    .map((e, i) => `<span style="white-space:nowrap;"><a href="${e.href}" style="color:#ffffff;text-decoration:underline;">${esc(e.label)}</a>${i < entries.length - 1 ? '&nbsp;&nbsp;&middot;' : ''}</span>`)
    .join(' &nbsp;');

  // Photo and logo panel share one padded column so their edges line up
  // exactly, like one card: rounded top on the photo, rounded foot on the panel.
  return `<tr><td class="nl-hero-pad" style="padding:16px 16px 0;background:${C.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    ${posterImg && poster ? posterBand(poster, posterImg) : ''}
    ${heroImg ? `<tr><td style="padding:0;line-height:0;font-size:0;border-radius:24px 24px 0 0;overflow:hidden;">${framedImage(heroImg, 'hero', 'Chhatradol Social Welfare Organization', 'max-width:100%;border-radius:24px 24px 0 0;')}</td></tr>` : ''}
    <tr><td bgcolor="${C.green}" style="background:${C.green};border-radius:${heroImg || posterImg ? '0 0 24px 24px' : '24px'};padding:22px 18px 20px;text-align:center;">
      <img src="${ICON_BASE}/logo.png" width="84" height="84" alt="Chhatradol logo" style="display:inline-block;width:84px;height:84px;border-radius:50%;background:#ffffff;border:3px solid ${C.yellow};">
      <div style="font-family:${FONT};font-size:24px;line-height:1.15;font-weight:bold;color:#ffffff;letter-spacing:1px;margin-top:10px;">CHHATRADOL</div>
      <div style="font-family:${FONT};font-size:12px;line-height:1.4;letter-spacing:2px;color:${C.yellow};margin-top:3px;">SOCIAL WELFARE ORGANIZATION</div>
      <table role="presentation" width="80%" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto;"><tr><td style="border-top:1px solid #4f8373;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <div style="font-family:${FONT};font-size:12px;line-height:1.7;color:#e7efe3;">Blood Donation &bull; Education &bull; Clothing Distribution<br>Tree Plantation &bull; Health Camps &bull; Relief</div>
      <table role="presentation" width="80%" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:14px auto;"><tr><td style="border-top:1px solid #4f8373;font-size:0;line-height:0;">&nbsp;</td></tr></table>
      <div style="font-family:${FONT};font-size:12px;line-height:2;color:#ffffff;"><span style="color:${C.yellow};font-weight:bold;">In this issue:</span> ${index}</div>
    </td></tr>
  </table>
</td></tr>`;
}

function intro({ issue }: Ctx): string {
  if (!issue.intro.trim()) return '';
  return `<tr><td class="nl-pad" style="padding:22px 32px 0;background:${C.cream};">
${paragraphs(issue.intro, `margin:0 0 10px;font-family:${FONT};font-size:14px;line-height:1.65;color:${C.ink};text-align:justify;`)}
</td></tr>`;
}

function card(ctx: Ctx, section: NewsletterSection, item: NewsletterItem): string {
  const img = ctx.photo(item.image, 'card');
  // Every part has a fixed height so all cards in a row are the same size
  // and the buttons line up. The phone stylesheet shrinks each part in step
  // rather than stacking the cards, so a phone shows the same 3-across grid.
  return `<div class="nl-card-in" style="background:${section.color};border-radius:16px;padding:14px 11px 16px;text-align:center;">
    <div class="nl-card-title" style="font-family:${FONT};font-size:15px;line-height:20px;height:20px;overflow:hidden;white-space:nowrap;font-weight:bold;color:#ffffff;margin:0 0 10px;">${esc(CARD_TITLES[section.key])}</div>
    ${img ? `<div style="border-radius:8px;overflow:hidden;line-height:0;font-size:0;">${framedImage(img, 'card', item.title, 'margin:0 auto;')}</div>` : `<div style="height:${FRAMES.card.h}px;"></div>`}
    <div class="nl-card-text" style="font-family:${FONT};font-size:12px;line-height:17px;height:85px;overflow:hidden;color:#f3f3f3;margin:10px 0 12px;text-align:justify;">${esc(teaser(item.body || item.title, 105))}</div>
    <div class="nl-card-btn">${pillButton(`#${anchor(section.key)}`, 'Read more', '#ffffff', section.color)}</div>
  </div>`;
}

function cardGrid(ctx: Ctx, pairs: { section: NewsletterSection; item: NewsletterItem }[]): string {
  if (!pairs.length) return '';
  // A real table with percentage columns: three across in every client and at
  // every width, the way a printed bulletin reads. A short last row gets a
  // narrower centred table so its cards keep the same width as the others.
  const rows: string[] = [];
  for (let i = 0; i < pairs.length; i += 3) {
    const row = pairs.slice(i, i + 3);
    const width = `${Math.round((row.length / 3) * 1000) / 10}%`;
    const cellWidth = `${Math.round(1000 / row.length) / 10}%`;
    rows.push(`<table role="presentation" width="${width}" align="center" cellpadding="0" cellspacing="0" border="0" style="width:${width};margin:0 auto;table-layout:fixed;"><tr>${row
      .map((p) => `<td class="nl-cell" width="${cellWidth}" valign="top" style="width:${cellWidth};padding:5px;">${card(ctx, p.section, p.item)}</td>`)
      .join('')}</tr></table>`);
  }
  return `<tr><td class="nl-grid" align="center" style="padding:18px 10px 6px;background:${C.cream};">${rows.join('')}</td></tr>`;
}

function sectionBar(section: NewsletterSection): string {
  return `<tr><td id="${anchor(section.key)}" class="nl-bar-pad" style="padding:30px 16px 0;background:${C.cream};">
  <a name="${anchor(section.key)}"></a>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td bgcolor="${C.green}" class="nl-bar" style="background:${C.green};border-bottom:3px solid ${C.yellow};border-radius:6px 6px 0 0;padding:10px 12px;text-align:center;font-family:${FONT};font-size:17px;line-height:1.3;font-weight:bold;letter-spacing:0.6px;color:#ffffff;text-transform:uppercase;">${esc(section.title)}</td>
  </tr></table>
</td></tr>`;
}

function story(ctx: Ctx, item: NewsletterItem, last: boolean): string {
  const img = ctx.photo(item.image, 'story');
  const link = absoluteUrl(item.link);
  return `<tr><td class="nl-pad" style="padding:18px 28px 0;background:${C.cream};">
  <h2 class="nl-h2" style="margin:0 0 14px;font-family:${FONT};font-size:18px;line-height:1.35;font-weight:bold;color:${C.ink};text-align:center;">${esc(item.title)}</h2>
  ${img ? `<div style="border-radius:8px;overflow:hidden;line-height:0;font-size:0;margin:0 0 16px;">${framedImage(img, 'story', item.title)}</div>` : ''}
  ${paragraphs(storyText(item.body, ctx.issue.wordLimit ?? DEFAULT_WORD_LIMIT), `margin:0 0 12px;font-family:${FONT};font-size:14px;line-height:1.7;color:${C.ink};text-align:justify;`).replace(/<p /g, '<p class="nl-p" ')}
  ${link ? `<div style="padding:6px 0 0;">${pillButton(link, 'Read the full story →', C.green, '#ffffff', 13)}</div>` : ''}
  ${last ? '' : `<table role="presentation" width="70%" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:22px auto 0;"><tr><td style="border-top:1px solid ${C.rule};font-size:0;line-height:0;">&nbsp;</td></tr></table>`}
</td></tr>`;
}

/**
 * The closing appeal: the last thing a reader meets is one large Donate
 * button, dressed in the campaign's colours when there is a poster.
 */
function donateBand(poster: NewsletterPoster | null): string {
  const heading = poster?.title || 'Be the reason a child smiles';
  const text = poster
    ? 'Sponsor a few sets of new clothes, educational materials or a meal for an underprivileged child. Every contribution, however small, reaches a child directly.'
    : 'Every rupee you give goes straight into blood camps, education, clothing and relief for families across Paschim Medinipur.';
  const link = absoluteUrl(poster?.link || '/donate');
  return `<tr><td class="nl-bar-pad" style="padding:26px 16px 0;background:${C.cream};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td bgcolor="${P.band}" class="nl-donate-pad" style="background:${P.band};background-image:linear-gradient(165deg,${P.bandHi} 0%,${P.band} 55%,#5e2a0c 100%);border-radius:20px;padding:28px 30px 26px;text-align:center;">
      <div style="font-family:${FONT};font-size:11px;line-height:1.4;font-weight:bold;letter-spacing:3px;color:${P.gold};margin:0 0 10px;">SUPPORT CHHATRADOL</div>
      <div class="nl-donate-title" style="font-family:${FONT};font-size:22px;line-height:1.3;font-weight:bold;color:#ffffff;margin:0 0 10px;">${esc(heading)}</div>
      <p style="margin:0 0 20px;font-family:${FONT};font-size:14px;line-height:1.65;color:${P.text};text-align:justify;">${esc(text)}</p>
      <div class="nl-donate-btn">${pillButton(link, 'DONATE NOW  →', P.gold, P.ink, 17, '14px 40px')}</div>
      <p style="margin:18px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${P.text};text-align:center;">UPI: <b style="color:#ffffff;">chhatradol@ybl</b> &nbsp;&middot;&nbsp; Call: <a href="tel:+917811073412" style="color:#ffffff;font-weight:bold;text-decoration:none;">78110 73412</a></p>
      <p style="margin:8px 0 0;font-family:${FONT};font-size:11px;line-height:1.55;color:#e9cfae;text-align:center;">Eligible donations qualify for tax deduction under Section 80G of the Income Tax Act, 1961, subject to applicable terms and conditions.</p>
    </td>
  </tr></table>
</td></tr>`;
}

/** Address, phone, email, website and social icons, under a CONTACT US bar. */
export function contactCard(): string {
  const row = (icon: string, label: string, html: string) => `<tr>
    <td width="40" valign="top" style="padding:7px 12px 7px 0;"><img src="${ICON_BASE}/${icon}.png" width="30" height="30" alt="${esc(label)}" style="display:block;width:30px;height:30px;border:0;"></td>
    <td valign="middle" style="padding:7px 0;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.ink};text-align:left;"><span style="display:block;font-size:11px;line-height:1.3;color:${C.muted};text-transform:uppercase;letter-spacing:0.8px;">${esc(label)}</span>${html}</td>
  </tr>`;
  const social = (icon: string, label: string, href: string) =>
    `<td style="padding:0 5px;"><a href="${href}" target="_blank" style="text-decoration:none;"><img src="${ICON_BASE}/${icon}.png" width="36" height="36" alt="${esc(label)}" style="display:block;width:36px;height:36px;border:0;"></a></td>`;
  const link = `color:${C.green};font-weight:bold;text-decoration:none;`;

  return `<tr><td class="nl-bar-pad" style="padding:34px 16px 0;background:${C.cream};">
  <a name="nl-contact"></a>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
    <td id="nl-contact" bgcolor="${C.green}" style="background:${C.green};border-bottom:3px solid ${C.yellow};border-radius:6px 6px 0 0;padding:10px 12px;text-align:center;font-family:${FONT};font-size:17px;line-height:1.3;font-weight:bold;letter-spacing:0.6px;color:#ffffff;">CONTACT US</td>
  </tr></table>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff;border:1px solid #dfe8d8;border-top:0;border-radius:0 0 12px 12px;">
    <tr><td class="nl-contact-pad" align="center" style="padding:20px 24px 22px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;max-width:420px;">
        ${row('location', 'Office', 'Vill. &amp; P.O.: Nij Narajole, P.S.: Daspur,<br>Paschim Medinipur, West Bengal 721211')}
        ${row('phone', 'Call / WhatsApp', `<a href="tel:+917811073412" style="${link}">+91 78110 73412</a>`)}
        ${row('mail', 'Email', `<a href="mailto:info@chhatradol.org" style="${link}">info@chhatradol.org</a>`)}
        ${row('web', 'Website', `<a href="${SITE_URL}" target="_blank" style="${link}">www.chhatradol.org</a>`)}
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 16px;"><tr><td style="border-top:1px solid #e3eadc;font-size:0;line-height:0;">&nbsp;</td></tr></table>
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

function contact({ issue }: Ctx): string {
  const poster = issue.poster?.image.trim() ? issue.poster : null;
  return `${contactCard()}
${donateBand(poster)}
<tr><td style="padding:24px 0 0;background:${C.cream};font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td bgcolor="${C.greenDeep}" style="background:${C.greenDeep};padding:16px 24px;text-align:center;font-family:${FONT};font-size:11px;line-height:1.7;color:#c8d6cc;">
  <b style="color:#ffffff;">Chhatradol Social Welfare Organization</b><br>
  Reg. No.: IV-100200047/2026 &nbsp;&middot;&nbsp; DARPAN ID: WB/2026/1138665<br>
  You are receiving this because you are a member or supporter of Chhatradol.<br>
  To stop these emails, reply with &ldquo;Unsubscribe&rdquo;.
</td></tr>`;
}

// ── Public ──────────────────────────────────────────────────────────────────

/** Sections that actually have items, in print order. */
export function sectionsInUse(items: NewsletterItem[]): NewsletterSection[] {
  return NEWSLETTER_SECTIONS.filter((s) => items.some((i) => i.section === s.key));
}

/** Every distinct photo in the issue with the frames it appears in. */
export function photoFrames(issue: NewsletterIssue): Map<string, Set<FrameKey>> {
  const out = new Map<string, Set<FrameKey>>();
  const add = (src: string, f: FrameKey) => {
    if (!src.trim()) return;
    if (!out.has(src)) out.set(src, new Set());
    out.get(src)!.add(f);
  };
  if (issue.poster?.image.trim()) add(issue.poster.image, 'poster');
  else add(issue.heroImage, 'hero');
  const firsts = new Set(sectionsInUse(issue.items).map((s) => issue.items.find((i) => i.section === s.key)!.id));
  issue.items.forEach((it) => {
    add(it.image, 'story');
    if (firsts.has(it.id)) add(it.image, 'card');
  });
  return out;
}

export function buildNewsletterHtml(issue: NewsletterIssue, options: BuildOptions = {}): string {
  const assetBase = options.assetBase ?? SITE_URL;
  const ctx: Ctx = {
    issue,
    asset: (src) => absoluteUrl(src, assetBase),
    photo: (src, frame) => {
      if (!src.trim()) return '';
      // Use a crop only if it was made at the frame's current size.
      const crop = issue.crops?.[src]?.[frame];
      const { w, h } = FRAMES[frame];
      return crop && crop.includes(`-${frame}-${w}x${h}.jpg`) ? crop : absoluteUrl(src, assetBase);
    },
  };

  const used = sectionsInUse(issue.items);
  const teasers = used.map((section) => ({
    section,
    item: issue.items.find((i) => i.section === section.key)!,
  }));

  const body = used
    .map((section) => {
      const items = issue.items.filter((i) => i.section === section.key);
      return sectionBar(section) + items.map((it, n) => story(ctx, it, n === items.length - 1)).join('');
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, address=no, email=no">
<title>${esc(issue.subject)}</title>
<!--[if mso]><style>table,td,div,p,a,h2{font-family:Arial,Helvetica,sans-serif !important;}</style><![endif]-->
<style>
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  img { -ms-interpolation-mode:bicubic; }
  @media only screen and (max-width: 620px) {
    .nl-outer { padding:0 !important; }
    .nl-wrap { width:100% !important; }
    .nl-mast { font-size:11px !important; padding:8px 10px !important; }
    .nl-hero-pad { padding:10px 10px 0 !important; }
    .nl-pad { padding:14px 14px 0 !important; }
    .nl-bar-pad { padding:20px 10px 0 !important; }
    .nl-bar { font-size:14px !important; padding:8px 10px !important; }
    .nl-h2 { font-size:15px !important; margin:0 0 10px !important; }
    .nl-p { font-size:13px !important; line-height:1.6 !important; margin:0 0 10px !important; }
    .nl-poster-pad { padding:14px 12px 18px !important; }
    .nl-poster-title { font-size:17px !important; margin:14px 0 6px !important; }
    .nl-donate-pad { padding:22px 16px 20px !important; }
    .nl-donate-title { font-size:18px !important; }
    .nl-donate-btn a { font-size:15px !important; padding:12px 30px !important; }
    .nl-grid { padding-left:6px !important; padding-right:6px !important; }
    .nl-cell { padding:3px !important; }
    .nl-card-in { border-radius:12px !important; padding:9px 6px 10px !important; }
    .nl-card-title { font-size:11px !important; line-height:13px !important; height:26px !important; white-space:normal !important; margin:0 0 6px !important; }
    .nl-card-in .nl-img { max-width:100% !important; }
    .nl-card-text { font-size:10px !important; line-height:13px !important; height:65px !important; margin:7px 0 8px !important; }
    .nl-card-btn a { padding:5px 9px !important; font-size:10px !important; }
    .nl-contact-pad { padding:18px 14px 20px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(teaser(issue.intro || issue.items[0]?.title || issue.subject, 110))}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td class="nl-outer" align="center" style="padding:20px 8px;">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
<table role="presentation" class="nl-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.cream};margin:0 auto;">
${masthead(ctx)}
${hero(ctx, used)}
${intro(ctx)}
${cardGrid(ctx, teasers)}
${body}
${contact(ctx)}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

/** "chhatradol-newsletter-september-2026.html" */
export function newsletterFileName(issue: NewsletterIssue): string {
  const slug = issue.monthLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `chhatradol-newsletter-${slug || 'issue'}.html`;
}
