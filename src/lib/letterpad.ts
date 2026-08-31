/**
 * letterpad.ts — the CSWO letterhead, its geometry, and the calls that turn a
 * saved letter into a PDF or an email.
 *
 * Every measurement in LAYOUT is a millimetre offset from the top-left corner
 * of the A4 sheet, lifted from the office master deck
 * (Letterpad/CHHATRADOL_SWO_LETTERPAD.pptx). The same table drives the PDF in
 * api/_lib/letter-pdf.ts — change one, change the other, or the preview and
 * the posted letter drift apart.
 *
 * Font sizes are already converted: the deck's canvas is 2.83× A4, so a 36.15
 * pt run there prints at 12.79 pt here.
 */

import { supabase } from '@/lib/supabase';

// ── The sheet ────────────────────────────────────────────────────────────────

export const PAGE = { w: 210, h: 297 } as const;

/** Deck point size → printed point size. */
const dpt = (slidePt: number) => Number((slidePt * (8.2677 / 23.3708)).toFixed(2));

export const LAYOUT = {
  art: {
    bandTop: { x: 0, y: 0, w: 210, h: 11.13 },
    swoosh: { x: 141.33, y: 0, w: 68.67, h: 107.52 },
    logo: { x: 3.89, y: 9.07, w: 33.02, h: 33.63 },
    divider: { x: 36.75, y: 11.12, w: 3.55, h: 31.57 },
    watermark: { x: 21.01, y: 67.21, w: 168.08, h: 162.56, opacity: 0.07 },
    star: { x: 102.3, y: 43.9, w: 5.5, h: 5.24 },
    bandFooter: { x: 0, y: 263.76, w: 210, h: 33.23 },
    signature: { x: 14.2, y: 247.68, w: 51.08, h: 16.08 },
  },
  masthead: {
    orgName: { x: 43.76, y: 4.75, size: dpt(68.06) },
    reg: { x: 44.86, y: 21.55, size: dpt(23.39) },
    tick: { x: 91.94, y: 23.58, h: 2.48 },
    phone: { icon: { x: 45.12, y: 35.27, s: 3.77 }, text: { x: 49.83, y: 34.73 } },
    mail: { icon: { x: 76.59, y: 34.76, s: 4.08 }, text: { x: 81.63, y: 34.56 } },
    web: { icon: { x: 123.14, y: 34.77, s: 3.87 }, text: { x: 127.73, y: 34.21 } },
    contactSize: dpt(24.99),
  },
  rules: {
    left: { x1: -2.09, x2: 96.39, y: 46.52, gold: { x1: -0.59, x2: 96.39, y: 47.7 } },
    right: { x1: 113.53, x2: 194.25, y: 46.52, gold: { x1: 113.53, x2: 194.25, y: 47.93 } },
  },
  ref: {
    label: { x: 9.45, y: 54.61, size: dpt(32.71) },
    value: { x: 25.83, y: 55.27, size: dpt(23.31) },
    dots: { startX: 23.1, count: 13, pitch: 1.342 },
  },
  date: {
    label: { x: 156.03, y: 54.61, size: dpt(32.71) },
    value: { x: 169.26, y: 55.35, size: dpt(21.8) },
    dots: { startX: 165.38, count: 18, pitch: 1.359 },
  },
  to: { x: 22.89, y: 70.31, w: 114.59, size: dpt(34.03), lineH: dpt(39.49) },
  subject: {
    label: { x: 22.89, y: 97.82, size: dpt(34.03) },
    text: { x: 41.76, y: 96.75, w: 150.79, size: dpt(31.9) },
  },
  salutation: { x: 22.89, y: 114.97, size: dpt(34.03) },
  body: { x: 22.44, y: 122.86, w: 169.21, size: dpt(36.15), lineH: dpt(43.39) },
  closing: { x: 22.41, y: 245.83, w: 72.05, size: dpt(34.03), lineH: dpt(40.83) },
  signRule: { x1: 25.09, x2: 56.41, y: 251.42 },
  footer: {
    size: dpt(24.99),
    phone: { icon: { x: 15.46, y: 284.31, s: 8.41 }, label: { x: 26.88, y: 283.56 }, value: { x: 27.15, y: 287.93 } },
    mail: { icon: { x: 81.48, y: 285.04, s: 8.13 }, label: { x: 92.61, y: 284.51 }, value: { x: 92.61, y: 287.93 } },
    address: { icon: { x: 147.96, y: 284.66, s: 8.06 }, label: { x: 159.02, y: 281.69 }, value: { x: 159.02, y: 285.8, w: 44.59 } },
    separators: [72.57, 138.53],
    separatorY: 284.31,
    separatorH: 11.73,
  },
} as const;

export const COLORS = {
  red: '#C00000',
  labelRed: '#B30000',
  gold: '#F4C168',
  goldTick: '#E7A641',
  orange: '#F79646',
  ink: '#000000',
  white: '#FFFFFF',
} as const;

export const ORG = {
  name: 'Chhatradol social welfare organization',
  reg: 'Reg. No.: IV-100200047/2026         DARPAN ID: WB/2026/1138665',
  headPhone: '7811073412',
  mail: 'info@chhatradol.org',
  web: 'www.chhatradol.org',
  phones: '7074074110/ 7811073412',
  address: 'Narajole, Daspur, Paschim Medinipur, 721211',
} as const;

export const ART = {
  bandTop: '/assets/letterpad/band-top.png',
  swoosh: '/assets/letterpad/swoosh-right.png',
  bandFooter: '/assets/letterpad/band-footer.png',
  divider: '/assets/letterpad/divider.png',
  star: '/assets/letterpad/star.png',
  logo: '/assets/letterpad/logo.jpg',
  watermark: '/assets/letterpad/watermark.jpg',
  signature: '/assets/letterpad/signature.png',
  iconPhone: '/assets/letterpad/icon-phone.png',
  iconMail: '/assets/letterpad/icon-mail.png',
  iconWeb: '/assets/letterpad/icon-web.png',
  iconPhoneFoot: '/assets/letterpad/icon-phone-footer.png',
  iconMailFoot: '/assets/letterpad/icon-mail-footer.png',
  iconAddressFoot: '/assets/letterpad/icon-address-footer.png',
} as const;

/**
 * The typefaces the preview needs, none of which the app loads globally.
 * Bebas Neue and Solway carry the masthead, Tinos is the metric-compatible
 * Times New Roman the body is set in, and Cormorant Garamond bold italic
 * stands in for the master's Monotype Corsiva.
 */
export const LETTERPAD_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@1,700&family=Solway:wght@400;700&family=Tinos:ital,wght@0,400;0,700;1,400&display=swap';

export const FONT_STACK = {
  display: "'Bebas Neue', Impact, sans-serif",
  sans: "'Solway', Georgia, serif",
  serif: "'Tinos', 'Times New Roman', Times, serif",
  chancery: "'Monotype Corsiva', 'Cormorant Garamond', cursive",
} as const;

// ── Defaults for a new letter ────────────────────────────────────────────────

export const DEFAULT_SIGNATORY = {
  name: 'Sayan Samanta',
  role: 'Secretary of CSWO',
  phone: '7811073412',
} as const;

export interface LetterDraft {
  letter_date: string;
  to_name: string;
  to_address: string;
  to_email: string;
  salutation: string;
  subject: string;
  body: string;
  closing: string;
  signatory_name: string;
  signatory_role: string;
  signatory_phone: string;
}

export function emptyDraft(): LetterDraft {
  return {
    letter_date: new Date().toISOString().slice(0, 10),
    to_name: '',
    to_address: '',
    to_email: '',
    salutation: 'Respected Sir,',
    subject: '',
    body: '',
    closing: 'Yours faithfully,',
    signatory_name: DEFAULT_SIGNATORY.name,
    signatory_role: DEFAULT_SIGNATORY.role,
    signatory_phone: DEFAULT_SIGNATORY.phone,
  };
}

/**
 * Opening drafts for the letters the office actually writes, worded the way
 * the master letter is. `{event}`, `{date}` and `{venue}` are filled from the
 * event before the text reaches the compose box.
 */
export interface LetterTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

export const LETTER_TEMPLATES: LetterTemplate[] = [
  {
    id: 'permission',
    label: 'Permission request',
    subject: 'Prayer for permission to organize {event}',
    body: [
      'We, CHHATRADOL SOCIAL WELFARE ORGANIZATION, respectfully submit this application seeking your kind permission to organize {event} on {date} at {venue}.',
      'The objective of this initiative is to serve the community and to encourage participation in social welfare work. We believe the programme will be of real benefit to the people of the locality.',
      'We would be grateful if you kindly permit our organization to conduct the programme on a suitable date and time as per your convenience. Our representatives will coordinate with your office and ensure that the programme is conducted in an orderly manner without causing any disruption to regular activities.',
      'We sincerely hope that you will consider our request favourably and extend your kind cooperation and support towards this initiative.',
      'Thank You',
    ].join('\n\n'),
  },
  {
    id: 'invitation',
    label: 'Invitation',
    subject: 'Invitation to attend {event}',
    body: [
      'We, CHHATRADOL SOCIAL WELFARE ORGANIZATION, have the honour to invite you to {event}, to be held on {date} at {venue}.',
      'Your presence would be a source of great encouragement to our volunteers and to the beneficiaries of the programme, and would lend the occasion the dignity it deserves.',
      'We shall be grateful if you kindly confirm your availability so that we may make the necessary arrangements.',
      'Thank You',
    ].join('\n\n'),
  },
  {
    id: 'sponsorship',
    label: 'Request for support',
    subject: 'Request for kind support towards {event}',
    body: [
      'We, CHHATRADOL SOCIAL WELFARE ORGANIZATION, are organizing {event} on {date} at {venue}, and respectfully seek your kind support towards it.',
      'The programme is being conducted entirely for the benefit of the community, and any assistance you are able to extend — in cash, in kind, or by way of your good offices — will be gratefully acknowledged in our records and in our public report of the event.',
      'We shall remain thankful for your consideration of this request.',
      'Thank You',
    ].join('\n\n'),
  },
  {
    id: 'thanks',
    label: 'Letter of thanks',
    subject: 'Sincere thanks for your support towards {event}',
    body: [
      'We, CHHATRADOL SOCIAL WELFARE ORGANIZATION, write to record our sincere thanks for the kind cooperation and support you extended towards {event}, held on {date} at {venue}.',
      'The programme was completed successfully, and the goodwill you showed contributed materially to that outcome. Our volunteers and the beneficiaries of the programme remain grateful.',
      'We look forward to your continued association with our work in the days ahead.',
      'Thank You',
    ].join('\n\n'),
  },
];

/** Fills a template's placeholders from the event it is being written for. */
export function fillTemplate(
  text: string,
  event: { title?: string | null; event_date?: string | null; location?: string | null; district?: string | null },
): string {
  const date = event.event_date
    ? new Date(`${event.event_date}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : '__________';
  const venue = [event.location, event.district].filter(Boolean).join(', ') || '__________';
  return text
    .replace(/\{event\}/g, event.title || '__________')
    .replace(/\{date\}/g, date)
    .replace(/\{venue\}/g, venue);
}

/**
 * Reports characters the letterhead's Latin faces cannot print.
 *
 * The PDF substitutes '?' for them rather than failing, which on an official
 * letter is worse than being told beforehand — so the compose screen checks
 * first. Bengali is the realistic case: the app is bilingual, the letterpad
 * is not.
 */
export function unsupportedCharacters(text: string): string[] {
  // Basic Latin through Latin Extended-B, the general punctuation the office
  // types (dashes, curly quotes, the ellipsis) and the rupee sign.
  const printable = /[\s -ɏ‐-›₹]/;
  const found = new Set<string>();
  for (const ch of text) {
    if (!printable.test(ch)) found.add(ch);
  }
  return [...found];
}

// ── Talking to the server ────────────────────────────────────────────────────

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/**
 * Fetches the rendered letter as a blob URL.
 *
 * Rendered on the server rather than printed from the preview so the filed
 * copy, the printed copy and the emailed attachment are the same document.
 * The caller owns the URL and must revoke it.
 */
export async function fetchLetterPdfUrl(letterId: string): Promise<string> {
  const res = await fetch('/api/letter-pdf', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ letterId }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({ error: '' }));
    throw new Error(detail.error || `Could not render the letter (${res.status})`);
  }
  return URL.createObjectURL(await res.blob());
}

export interface SendLetterResult {
  sentTo: string;
  refNo: string;
  messageId?: string;
}

/** Posts the letter to its addressee from info@chhatradol.org. */
export async function sendLetterEmail(letterId: string): Promise<SendLetterResult> {
  const res = await fetch('/api/send-letter-email', {
    method: 'POST',
    headers: await authHeader(),
    body: JSON.stringify({ letterId }),
  });
  const data = await res.json().catch(() => ({ error: 'Could not read the server response' }));
  if (!res.ok) throw new Error(data.error || `Could not send the letter (${res.status})`);
  return data as SendLetterResult;
}

/** "CSWO-Letter-3A-83.pdf" — mirrors letterFileName() on the server. */
export function letterFileName(refNo: string): string {
  const safe = String(refNo || 'draft').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `CSWO-Letter-${safe || 'draft'}.pdf`;
}
