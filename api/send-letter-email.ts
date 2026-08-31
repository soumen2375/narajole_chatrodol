/**
 * api/send-letter-email.ts
 *
 * Posts a secretary's letter to its addressee from info@chhatradol.org, with
 * the letterhead PDF attached, and files a blind copy back to info@ so the
 * office register matches what went out.
 *
 * POST /api/send-letter-email  { letterId }  Authorization: Bearer <token>
 *
 * The request carries an id and nothing else: the recipient, the subject and
 * every printed word are read back from the letter's own row.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { generateLetterPdf, letterFileName } from './_lib/letter-pdf.js';
import {
  authenticateSecretary,
  fetchSignature,
  handledPreflight,
  loadLetter,
  parseBody,
  readEnv,
  sendJson,
  serviceClient,
} from './_lib/letter-context.js';

const OFFICE_MAILBOX = 'info@chhatradol.org';

/** The official mailbox, not the donations sender the receipts go out from. */
function fromAddress(): string {
  return readEnv('LETTER_FROM_EMAIL', `Chhatradol Social Welfare Organization <${OFFICE_MAILBOX}>`);
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * The covering note. The letter itself is the attachment — this is only what a
 * clerk would write on the envelope, so the addressee knows what they have
 * before opening the PDF.
 */
function buildCoveringHtml(letter: {
  ref_no: string;
  subject: string;
  to_name: string;
  signatory_name: string;
  signatory_role: string;
  signatory_phone: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(letter.subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f5f3f0;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:10px;overflow:hidden;">
    <tr>
      <td style="background:#8b0000;padding:18px 24px;color:#ffffff;font-size:15px;font-weight:bold;letter-spacing:0.4px;">
        Chhatradol Social Welfare Organization
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;">
          Respected ${escapeHtml(letter.to_name || 'Sir / Madam')},
        </p>
        <p style="margin:0 0 14px;font-size:14px;line-height:1.6;">
          Please find attached our official letter, reference
          <strong>${escapeHtml(letter.ref_no)}</strong>, regarding
          &ldquo;${escapeHtml(letter.subject)}&rdquo;.
        </p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;">
          We would be grateful for your kind consideration. Any reply to this
          email reaches our office directly.
        </p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#44403c;">
          Yours faithfully,<br>
          <strong>${escapeHtml(letter.signatory_name)}</strong><br>
          ${escapeHtml(letter.signatory_role)}<br>
          ${letter.signatory_phone ? `Mob. : ${escapeHtml(letter.signatory_phone)}` : ''}
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#faf8f5;padding:14px 24px;font-size:11px;line-height:1.6;color:#78716c;">
        Narajole, Daspur, Paschim Medinipur, 721211 &middot; ${OFFICE_MAILBOX} &middot; www.chhatradol.org<br>
        Reg. No.: IV-100200047/2026 &middot; DARPAN ID: WB/2026/1138665
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    const letterId = typeof body.letterId === 'string' ? body.letterId : '';
    if (!letterId) return sendJson(res, 400, { error: 'letterId is required' });

    const letter = await loadLetter(supabase, letterId);
    if (!letter) return sendJson(res, 404, { error: 'Letter not found' });

    const recipient = (letter.to_email || '').trim();
    if (!recipient.includes('@')) {
      return sendJson(res, 400, {
        error: 'This letter has no recipient email address. Add one before sending.',
      });
    }
    if (!letter.subject.trim() || !letter.body.trim()) {
      return sendJson(res, 400, { error: 'A letter needs a subject and a body before it can be sent.' });
    }

    const resendApiKey = readEnv('RESEND_API_KEY');
    if (!resendApiKey) return sendJson(res, 500, { error: 'Email is not configured (RESEND_API_KEY missing)' });

    const pdf = await generateLetterPdf({
      refNo: letter.ref_no,
      letterDate: letter.letter_date,
      toName: letter.to_name,
      toAddress: letter.to_address,
      salutation: letter.salutation,
      subject: letter.subject,
      body: letter.body,
      closing: letter.closing,
      signatoryName: letter.signatory_name,
      signatoryRole: letter.signatory_role,
      signatoryPhone: letter.signatory_phone,
      signatureImage: await fetchSignature(letter.signature_url),
    });

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [letter.to_name ? `${letter.to_name} <${recipient}>` : recipient],
        // The office keeps its own copy of every letter that leaves.
        bcc: [OFFICE_MAILBOX],
        reply_to: OFFICE_MAILBOX,
        subject: `${letter.subject} (Ref: ${letter.ref_no})`,
        html: buildCoveringHtml(letter),
        attachments: [
          {
            filename: letterFileName(letter.ref_no),
            content: Buffer.from(pdf).toString('base64'),
            content_type: 'application/pdf',
          },
        ],
        tags: [{ name: 'category', value: 'secretary-letter' }],
      }),
    });

    const result = (await response.json()) as { id?: string; message?: string; name?: string };

    if (!response.ok) {
      const errMsg = result.message || result.name || `Resend API error (${response.status})`;
      console.error(`[Letter Email] ${letter.ref_no} → ${recipient} failed: ${errMsg}`);
      return sendJson(res, 502, { error: errMsg });
    }

    await supabase
      .from('cswo_event_letters')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_to: recipient,
        email_message_id: result.id ?? '',
      })
      .eq('id', letter.id);

    console.log(`[Letter Email] ✓ ${letter.ref_no} → ${recipient} (Resend ${result.id})`);

    return sendJson(res, 200, {
      success: true,
      sentTo: recipient,
      refNo: letter.ref_no,
      messageId: result.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send the letter';
    console.error('[Letter Email] Handler error:', err);
    return sendJson(res, 500, { error: msg });
  }
}
