/**
 * api/send-newsletter.ts
 *
 * Posts the monthly newsletter from info@chhatradol.org.
 *
 * POST /api/send-newsletter  { subject, html, audience }  Authorization: Bearer <token>
 *
 *   audience = 'test'     → only the signed-in sender's own address
 *            | 'members'  → every approved member with an email
 *            | 'donors'   → every distinct email on a paid donation
 *            | 'all'      → members and donors, de-duplicated
 *
 * The HTML comes from the request because the editor builds it in the
 * browser, so the recipient list must not: it is resolved here, under the
 * service role, from our own tables. The caller can choose which of our
 * lists to write to but never add an address to one, which keeps this from
 * being a relay for anything else carrying the organisation's name.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  handledPreflight,
  parseBody,
  readEnv,
  sendJson,
  serviceClient,
} from './_lib/letter-context.js';

const OFFICE_MAILBOX = 'info@chhatradol.org';
/** Resend's batch endpoint takes at most 100 messages per call. */
const BATCH_SIZE = 100;
const AUDIENCES = ['test', 'members', 'donors', 'all'] as const;
type Audience = (typeof AUDIENCES)[number];

function fromAddress(): string {
  return readEnv('NEWSLETTER_FROM_EMAIL', `Chhatradol Newsletter <${OFFICE_MAILBOX}>`);
}

function bearerToken(req: IncomingMessage): string {
  const header = req.headers.authorization as string | undefined;
  const [scheme, token] = (header ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' ? (token ?? '') : '';
}

/** Admins and the digital-media / secretary roles may send the newsletter. */
async function authenticateEditor(
  supabase: SupabaseClient,
  req: IncomingMessage,
): Promise<{ member: { name: string; email: string } } | { error: string; status: number }> {
  const token = bearerToken(req);
  if (!token) return { error: 'Sign in required', status: 401 };

  const { data: userData, error } = await supabase.auth.getUser(token);
  if (error || !userData?.user) return { error: 'Session is not valid', status: 401 };

  const { data: member } = await supabase
    .from('cswo_members')
    .select('id, full_name, email, role, status, can_manage_posts, can_manage_events')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (!member || member.status !== 'approved') return { error: 'Account is not approved', status: 403 };
  if (member.role !== 'admin' && !member.can_manage_posts && !member.can_manage_events) {
    return { error: 'Only an admin, the secretary or digital media may send the newsletter', status: 403 };
  }
  return { member: { name: String(member.full_name ?? ''), email: String(member.email ?? userData.user.email ?? '') } };
}

function validEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function resolveRecipients(supabase: SupabaseClient, audience: Audience): Promise<string[]> {
  const found = new Map<string, string>();
  const add = (email: unknown) => {
    if (validEmail(email)) found.set(email.trim().toLowerCase(), email.trim());
  };

  if (audience === 'members' || audience === 'all') {
    const { data, error } = await supabase.from('cswo_members').select('email').eq('status', 'approved');
    if (error) throw new Error(`Could not read members: ${error.message}`);
    (data ?? []).forEach((r) => add(r.email));
  }
  if (audience === 'donors' || audience === 'all') {
    const { data, error } = await supabase.from('cswo_donations').select('donor_email').eq('status', 'paid');
    if (error) throw new Error(`Could not read donors: ${error.message}`);
    (data ?? []).forEach((r) => add(r.donor_email));
  }
  return [...found.values()];
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (handledPreflight(req, res)) return;
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });

  try {
    const supabase = serviceClient();
    if (!supabase) return sendJson(res, 500, { error: 'Server is not configured for Supabase access' });

    const auth = await authenticateEditor(supabase, req);
    if ('error' in auth) return sendJson(res, auth.status, { error: auth.error });

    const body = await parseBody(req);
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const html = typeof body.html === 'string' ? body.html : '';
    const audience = body.audience as Audience;

    if (!subject) return sendJson(res, 400, { error: 'A subject is required' });
    if (!html.includes('<html')) return sendJson(res, 400, { error: 'The newsletter body is empty' });
    if (!(AUDIENCES as readonly string[]).includes(audience)) return sendJson(res, 400, { error: 'Unknown audience' });

    const resendApiKey = readEnv('RESEND_API_KEY');
    if (!resendApiKey) return sendJson(res, 500, { error: 'Email is not configured (RESEND_API_KEY missing)' });

    let recipients: string[];
    if (audience === 'test') {
      if (!validEmail(auth.member.email)) return sendJson(res, 400, { error: 'Your account has no email address' });
      recipients = [auth.member.email];
    } else {
      recipients = await resolveRecipients(supabase, audience);
    }
    if (!recipients.length) return sendJson(res, 400, { error: 'No one on that list has an email address' });

    const finalSubject = audience === 'test' ? `[TEST] ${subject}` : subject;
    const headers = { 'List-Unsubscribe': `<mailto:${OFFICE_MAILBOX}?subject=Unsubscribe>` };

    // One message per recipient so no one sees anyone else's address.
    let sent = 0;
    const failures: string[] = [];
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const chunk = recipients.slice(i, i + BATCH_SIZE);
      const response = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(
          chunk.map((to) => ({
            from: fromAddress(),
            to: [to],
            reply_to: OFFICE_MAILBOX,
            subject: finalSubject,
            html,
            headers,
            tags: [{ name: 'category', value: 'newsletter' }],
          })),
        ),
      });
      if (response.ok) {
        sent += chunk.length;
      } else {
        const detail = (await response.json().catch(() => ({}))) as { message?: string; name?: string };
        const msg = detail.message || detail.name || `Resend API error (${response.status})`;
        console.error(`[Newsletter] batch ${i / BATCH_SIZE + 1} failed: ${msg}`);
        failures.push(msg);
      }
    }

    console.log(`[Newsletter] "${finalSubject}" → ${audience}: ${sent}/${recipients.length} sent by ${auth.member.email}`);

    if (!sent) return sendJson(res, 502, { error: failures[0] || 'Nothing was sent' });
    return sendJson(res, 200, {
      success: true,
      audience,
      sent,
      total: recipients.length,
      failed: recipients.length - sent,
      error: failures[0],
    });
  } catch (err: unknown) {
    console.error('[Newsletter] Handler error:', err);
    return sendJson(res, 500, { error: err instanceof Error ? err.message : 'Failed to send the newsletter' });
  }
}
