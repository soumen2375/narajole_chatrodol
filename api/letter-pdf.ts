/**
 * api/letter-pdf.ts
 *
 * Returns a saved letter rendered on the CSWO letterhead as an A4 PDF.
 *
 * The download and the emailed attachment come off the same renderer and the
 * same database row, so what the secretary files is byte-for-byte what the
 * addressee received.
 *
 * POST /api/letter-pdf  { letterId }   Authorization: Bearer <supabase token>
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { generateLetterPdf, letterFileName } from './_lib/letter-pdf.js';
import {
  authenticateSecretary,
  fetchSignature,
  handledPreflight,
  loadLetter,
  parseBody,
  sendJson,
  serviceClient,
} from './_lib/letter-context.js';

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

    const filename = letterFileName(letter.ref_no);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdf.length));
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(Buffer.from(pdf));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to render the letter';
    console.error('[Letter PDF] Handler error:', err);
    return sendJson(res, 500, { error: msg });
  }
}
