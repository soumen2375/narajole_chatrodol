/**
 * api/partnership-letter-pdf.ts
 *
 * Generates and serves the Anandadhara 2026 official invitation letter
 * rendered on the CSWO letterhead as an A4 PDF, personalized for each company.
 *
 * GET /api/partnership-letter-pdf?company=Tata%20Steel&name=Mr.%20Sharma&email=csr@tatasteel.com
 */

import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { generateLetterPdf } from './_lib/letter-pdf.js';
import { fetchLetterImage, handledPreflight, sendJson } from './_lib/letter-context.js';

const ANANDADHARA_POSTER_STORAGE_URL =
  'https://wzquszbmbpkbhyythdrj.supabase.co/storage/v1/object/public/cswo-media/letter-templates/anandadhara-2026-en.jpg';

const ANANDADHARA_BODY_HTML = [
  '<p>Greetings from CHHATRADOL SOCIAL WELFARE ORGANIZATION.</p>',
  '<p>We are reaching out with a humble request for your support for our 7th-year initiative, \u201cAnandadhara \u2013 2026,\u201d through which we aim to bring the joy of the festive season to underprivileged children in <strong>Paschim Medinipur</strong> and <strong>Jhargram</strong> by providing new clothes, educational materials and food.</p>',
  "<p>Your support whether through a donation, sponsoring a few children\\'s clothes, or simply sharing our campaign can help us reach more children and make their celebrations brighter.</p>",
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
  `<img src="${ANANDADHARA_POSTER_STORAGE_URL}" alt="Anandadhara 2026 poster" data-page="full" data-fit="fit">`,
].join('');

/** Generates a unique reference number for each request. */
function makeRefNo(): string {
  const start = new Date('2026-01-01').getTime();
  const days = Math.floor((Date.now() - start) / (1000 * 60 * 60 * 24));
  const rand = Math.floor(Math.random() * 900) + 100;
  return `3A/${days}${rand}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (handledPreflight(req, res)) return;

  try {
    const rawUrl = req.url ?? '';
    const parsedUrl = new URL(rawUrl, 'https://localhost');
    const company = (parsedUrl.searchParams.get('company') ?? '').trim();
    const name = (parsedUrl.searchParams.get('name') ?? '').trim();
    const email = (parsedUrl.searchParams.get('email') ?? '').trim();

    // Build the "To" block: name on first line, then company + email
    const toNameLine = name || company || 'Respected Sir';
    const toAddressParts = [company, email].filter(Boolean);
    const toAddressBlock = toAddressParts.join('\n');

    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await generateLetterPdf({
        refNo: makeRefNo(),
        letterDate: new Date().toISOString().slice(0, 10),
        toName: toNameLine,
        toAddress: toAddressBlock,
        salutation: 'Respected Sir,',
        subject: 'An Invitation to Be Part of Anandadhara 2026',
        body: 'Greetings from CHHATRADOL SOCIAL WELFARE ORGANIZATION.\n\nWe are reaching out with a humble request for your support for our 7th-year initiative, \u201cAnandadhara \u2013 2026\u201d.',
        bodyHtml: ANANDADHARA_BODY_HTML,
        fetchImage: fetchLetterImage,
        closing: 'Yours faithfully,',
        signatoryName: 'Sayan Samanta',
        signatoryRole: 'Chhatradol Social Welfare Organization',
        signatoryPhone: '7811073412',
      });
    } catch (genError) {
      console.warn('[Partnership Letter PDF] Dynamic generation error, serving static copy:', genError);
      const staticPath = path.resolve(process.cwd(), 'public/assets/partnership/anandadhara-2026-invitation-letter.pdf');
      if (fs.existsSync(staticPath)) {
        pdfBytes = fs.readFileSync(staticPath);
      } else {
        throw genError;
      }
    }

    const safeCompany = company ? `_${company.replace(/[^a-zA-Z0-9_-]/g, '_')}` : '';
    const filename = `Anandadhara_2026_Invitation_Letter${safeCompany}.pdf`;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', String(pdfBytes.length));
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(Buffer.from(pdfBytes));
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to render invitation letter';
    console.error('[Partnership Letter PDF] Handler error:', err);
    return sendJson(res, 500, { error: msg });
  }
}
