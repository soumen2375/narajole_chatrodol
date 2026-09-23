/**
 * api/send-partnership.ts
 *
 * Sends the Anandadhara 2026 partnership invitation to companies and brands,
 * one personal email per recipient, from info@chhatradol.org, and records each
 * one in cswo_partner_outreach.
 *
 * POST /api/send-partnership  Authorization: Bearer <token>
 *   { subject, html, recipients: [{ company, name, email }], attachProposal, test, allowRepeat }
 *
 * Unlike the newsletter, the addressees here are typed in by the secretary —
 * companies are not on any list of ours — so the guard is who may send and
 * how much: an approved admin or secretary only, at most MAX_RECIPIENTS per
 * send, every send logged against the sender, a blind copy to the office,
 * and a company already invited is skipped unless the sender asks otherwise.
 * The proposal PDF is fetched from our own storage only, never from a URL in
 * the request.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchLetterImage,
  handledPreflight,
  parseBody,
  readEnv,
  sendJson,
  serviceClient,
} from './_lib/letter-context.js';
import { generateLetterPdf } from './_lib/letter-pdf.js';

const OFFICE_MAILBOX = 'info@chhatradol.org';
const CAMPAIGN = 'anandadhara-2026';
const MAX_RECIPIENTS = 50;
const PROPOSAL_PDF_URL =
  'https://wzquszbmbpkbhyythdrj.supabase.co/storage/v1/object/public/cswo-media/partnership/anandadhara-2026-invitation-letter.pdf';
const PROPOSAL_FILENAME = 'Anandadhara_2026_Invitation_Letter.pdf';

const ANANDADHARA_BODY_HTML = [
  '<p>Greetings from CHHATRADOL SOCIAL WELFARE ORGANIZATION.</p>',
  '<p>We are reaching out with a humble request for your support for our 7th-year initiative, “Anandadhara – 2026,” through which we aim to bring the joy of the festive season to underprivileged children in <strong>Paschim Medinipur</strong> and <strong>Jhargram</strong> by providing new clothes, educational materials and food.</p>',
  '<p>Your support whether through a donation, sponsoring a few children\'s clothes, or simply sharing our campaign can help us reach more children and make their celebrations brighter.</p>',
  '<p><strong><span data-size="12">HOW YOU CAN HELP</span></strong></p>',
  '<ul>',
  '<li><p><strong><span data-size="10"><span data-highlight="yellow">Glimpse of last year\'s Anandadhara: </span></span></strong>',
  '<a target="_blank" rel="noreferrer" href="https://youtu.be/gF6ErpbRXJo"><strong><u><span data-size="10"><span data-highlight="yellow">View the gallery</span></span></u></strong></a></p></li>',
  '<li><p><strong><span data-size="10"><span data-highlight="yellow">Donate online: </span></span></strong>',
  '<a target="_blank" rel="noreferrer" href="https://www.chhatradol.org/donate"><strong><u><span data-size="10"><span data-highlight="yellow">www.chhatradol.org/donate</span></span></u></strong></a></p></li>',
  '<li><p><strong><span data-size="10"><span data-highlight="yellow">Or simply scan the QR code below to contribute instantly.</span></span></strong></p></li>',
  '</ul>',
  '<p>We sincerely hope you will consider becoming a part of this journey. Together, we can make the festive season a little brighter, a little warmer and a little more joyful for children who need it most.</p>',
  '<p>With regards,</p>',
  '<img src="https://wzquszbmbpkbhyythdrj.supabase.co/storage/v1/object/public/cswo-media/letter-templates/anandadhara-2026-en.jpg" alt="Anandadhara 2026 poster" data-page="full" data-fit="fit">',
].join('');

interface Recipient { company: string; name: string; email: string }

function fromAddress(): string {
  // Use a personal name — org-name senders are flagged as promotional by Gmail.
  return readEnv('PARTNERSHIP_FROM_EMAIL', `Sayan Samanta <${OFFICE_MAILBOX}>`);
}

function bearerToken(req: IncomingMessage): string {
  const header = req.headers.authorization as string | undefined;
  const [scheme, token] = (header ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' ? (token ?? '') : '';
}

function validEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(value.trim());
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Mirrors personalisePartnership() in src/lib/partnership.ts. */
function personalise(text: string, r: Recipient): string {
  const name = r.name.trim() || (r.company.trim() ? `${r.company.trim()} Team` : 'Sir / Madam');
  const company = r.company.trim() || 'your organisation';
  return text
    .replace(/\{\{name\}\}/g, esc(name))
    .replace(/%7B%7Bcompany%7D%7D/g, encodeURIComponent(company))
    .replace(/\{\{company\}\}/g, esc(company));
}

/** Plain-text header values must not carry markup entities. */
function personaliseSubject(subject: string, r: Recipient): string {
  return subject
    .replace(/\{\{name\}\}/g, r.name.trim() || 'Sir / Madam')
    .replace(/\{\{company\}\}/g, r.company.trim() || 'your organisation');
}

/**
 * Build a plain-text version of the invitation.
 * Gmail uses the presence of a text/plain part (multipart/alternative) as
 * a strong signal that the message is personal correspondence, not bulk mail.
 */
function buildPlainText(r: Recipient): string {
  const name = r.name.trim() || (r.company.trim() ? `${r.company.trim()} Team` : 'Sir / Madam');
  const company = r.company.trim() || 'your organisation';
  return [
    `Dear ${name},`,
    '',
    `Greetings from Chhatradol Social Welfare Organization.`,
    '',
    `I am writing to invite ${company} to partner with Anandadhara 2026, the 7th year of our Durga Puja initiative for children from financially vulnerable families in Medinipur and Jhargram, West Bengal.`,
    '',
    `From 10 to 16 October 2026, we aim to reach 1,000+ children with new Puja clothing, books, and food — so that every child can feel part of the celebration. A partnership with ${company} would let us reach more children; every ₹1,000 supports one child completely.`,
    '',
    'We would be glad to share our full invitation letter (attached) and answer any questions you may have.',
    '',
    'With warm regards,',
    'Sayan Samanta',
    'Secretary, Chhatradol Social Welfare Organization',
    'Phone / WhatsApp: +91 78110 73412',
    'Email: info@chhatradol.org',
    'Website: https://www.chhatradol.org',
    '',
    '---',
    'Chhatradol Social Welfare Organization',
    'Vill. & P.O.: Nij Narajole, Paschim Medinipur, West Bengal 721211',
    `This message was sent to ${r.email}. Reply "Unsubscribe" and we will not write again.`,
  ].join('\n');
}

async function authenticateSecretary(supabase: SupabaseClient, req: IncomingMessage): Promise<
  { member: { id: string; name: string; email: string } } | { error: string; status: number }
> {
  const token = bearerToken(req);
  if (!token) return { error: 'Sign in required', status: 401 };
  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return { error: 'Session is not valid', status: 401 };
  const { data: member } = await supabase
    .from('cswo_members')
    .select('id, full_name, email, role, status, can_manage_events')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (!member || member.status !== 'approved') return { error: 'Account is not approved', status: 403 };
  if (member.role !== 'admin' && !member.can_manage_events) {
    return { error: 'Only an admin or the secretary may send partnership invitations', status: 403 };
  }
  return {
    member: {
      id: String(member.id),
      name: String(member.full_name ?? ''),
      email: String(member.email ?? userData.user.email ?? ''),
    },
  };
}

function cleanRecipients(raw: unknown): Recipient[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Recipient[] = [];
  for (const r of raw) {
    const email = typeof r?.email === 'string' ? r.email.trim() : '';
    if (!validEmail(email) || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    out.push({
      email,
      company: typeof r.company === 'string' ? r.company.trim().slice(0, 120) : '',
      name: typeof r.name === 'string' ? r.name.trim().slice(0, 120) : '',
    });
  }
  return out;
}

async function sendOne(
  apiKey: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
  if (!response.ok) return { ok: false, error: result.message || result.name || `Resend API error (${response.status})` };
  return { ok: true, id: result.id ?? '' };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (handledPreflight(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });

  try {
    const supabase = serviceClient();
    if (!supabase) return sendJson(res, 500, { error: 'Server is not configured for Supabase access' });

    const auth = await authenticateSecretary(supabase, req);
    if ('error' in auth) return sendJson(res, auth.status, { error: auth.error });

    const body = await parseBody(req);
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const html = typeof body.html === 'string' ? body.html : '';
    const test = body.test === true;
    const allowRepeat = body.allowRepeat === true;
    const attach = body.attachProposal === true;

    if (!subject) return sendJson(res, 400, { error: 'A subject is required' });
    if (!html.includes('<html')) return sendJson(res, 400, { error: 'The invitation body is empty' });

    let recipients = cleanRecipients(body.recipients);
    if (test) {
      if (!validEmail(auth.member.email)) return sendJson(res, 400, { error: 'Your account has no email address' });
      const sample = recipients[0] ?? { company: 'Sample Company Ltd.', name: '', email: '' };
      recipients = [{ ...sample, email: auth.member.email }];
    }
    if (!recipients.length) return sendJson(res, 400, { error: 'Add at least one company with a valid email' });
    if (recipients.length > MAX_RECIPIENTS) {
      return sendJson(res, 400, { error: `Send to at most ${MAX_RECIPIENTS} companies at a time` });
    }

    const resendApiKey = readEnv('RESEND_API_KEY');
    if (!resendApiKey) return sendJson(res, 500, { error: 'Email is not configured (RESEND_API_KEY missing)' });

    // Skip anyone this campaign has already reached, unless asked not to.
    let skipped: string[] = [];
    if (!test && !allowRepeat) {
      const { data: prior } = await supabase
        .from('cswo_partner_outreach')
        .select('email')
        .eq('campaign', CAMPAIGN)
        .neq('status', 'failed');
      const already = new Set((prior ?? []).map((r) => String(r.email).toLowerCase()));
      skipped = recipients.filter((r) => already.has(r.email.toLowerCase())).map((r) => r.email);
      recipients = recipients.filter((r) => !already.has(r.email.toLowerCase()));
      if (!recipients.length) {
        return sendJson(res, 409, { error: 'Every company on this list has already been invited', skipped });
      }
    }

    // Pre-fetch fallback base letter in case dynamic rendering encounters issues
    let baseLetterBuffer: Buffer | null = null;
    if (attach) {
      try {
        const pdf = await fetch(PROPOSAL_PDF_URL);
        if (pdf.ok) baseLetterBuffer = Buffer.from(await pdf.arrayBuffer());
      } catch {
        /* will generate dynamically */
      }
    }

    const getRecipientAttachment = async (r: Recipient) => {
      try {
        const bytes = await generateLetterPdf({
          refNo: '3A/125',
          letterDate: '2026-09-23',
          toName: r.name,
          toAddress: r.company,
          salutation: 'Respected Sir,',
          subject: 'An Invitation to Support Anandadhara – 2026',
          body: 'Greetings from CHHATRADOL SOCIAL WELFARE ORGANIZATION.\n\nWe are reaching out with a humble request for your support for our 7th-year initiative, “Anandadhara – 2026”.',
          bodyHtml: ANANDADHARA_BODY_HTML,
          fetchImage: fetchLetterImage,
          closing: 'Yours faithfully,',
          signatoryName: 'Sayan Samanta',
          signatoryRole: 'Secretary of CSWO',
          signatoryPhone: '7811073412',
        });
        const safeCompany = r.company ? `_${r.company.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
        return [{
          filename: `Anandadhara_2026_Invitation_Letter${safeCompany}.pdf`,
          content: Buffer.from(bytes).toString('base64'),
          content_type: 'application/pdf',
        }];
      } catch (err) {
        console.warn(`[Partnership] Dynamic letter generation failed for ${r.company || r.email}:`, err);
        if (baseLetterBuffer) {
          return [{
            filename: PROPOSAL_FILENAME,
            content: baseLetterBuffer.toString('base64'),
            content_type: 'application/pdf',
          }];
        }
        return undefined;
      }
    };

    const results: { email: string; company: string; ok: boolean; error?: string }[] = [];
    // A few at a time: fast enough for 50, gentle on Resend's rate limit.
    const queue = [...recipients];
    const worker = async () => {
      for (let r = queue.shift(); r; r = queue.shift()) {
        const recipientAttachments = attach ? await getRecipientAttachment(r) : undefined;
        const outcome = await sendOne(resendApiKey, {
          from: fromAddress(),
          to: [r.name ? `${r.name.replace(/[<>",]/g, '')} <${r.email}>` : r.email],
          bcc: test ? undefined : [OFFICE_MAILBOX],
          // Named reply-to — personal reply address, not a mailing-list address.
          reply_to: `Sayan Samanta <${OFFICE_MAILBOX}>`,
          subject: test ? `[TEST] ${personaliseSubject(subject, r)}` : personaliseSubject(subject, r),
          html: personalise(html, r),
          // Plain-text body: Gmail uses multipart/alternative as a strong
          // signal that this is personal correspondence, not bulk mail.
          text: buildPlainText(r),
          attachments: recipientAttachments,
          // No List-Unsubscribe / no tags — both flag messages as bulk to Gmail.
          headers: {
            'X-Mailer': 'Chhatradol Outreach v1',
            'Importance': 'high',
            'X-Priority': '1',
          },
        });
        results.push({ email: r.email, company: r.company, ok: outcome.ok, error: outcome.ok ? undefined : outcome.error });
        if (!test) {
          await supabase.from('cswo_partner_outreach').insert({
            campaign: CAMPAIGN,
            company: r.company,
            contact_name: r.name,
            email: r.email,
            status: outcome.ok ? 'sent' : 'failed',
            message_id: outcome.ok ? outcome.id : '',
            error: outcome.ok ? '' : outcome.error,
            sent_by: auth.member.id,
          });
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);

    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok);
    console.log(`[Partnership] ${test ? 'TEST ' : ''}${sent}/${results.length} sent by ${auth.member.email}; ${skipped.length} skipped`);

    if (!sent) return sendJson(res, 502, { error: failed[0]?.error || 'Nothing was sent', failed, skipped });
    return sendJson(res, 200, { success: true, sent, failed, skipped });
  } catch (err: unknown) {
    console.error('[Partnership] Handler error:', err);
    return sendJson(res, 500, { error: err instanceof Error ? err.message : 'Failed to send the invitations' });
  }
}
