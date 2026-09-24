import type { IncomingMessage, ServerResponse } from 'http';

import cashfreeOrder from './_handlers/cashfree-order.js';
import cashfreeVerify from './_handlers/cashfree-verify.js';
import cashfreeWebhook from './_handlers/cashfree-webhook.js';
import createOrder from './_handlers/create-order.js';
import letterPdf from './_handlers/letter-pdf.js';
import ogImage from './_handlers/og-image.js';
import partnershipLetterPdf from './_handlers/partnership-letter-pdf.js';
import resendPaymentReceipt from './_handlers/resend-payment-receipt.js';
import sendLetterEmail from './_handlers/send-letter-email.js';
import sendNewsletter from './_handlers/send-newsletter.js';
import sendPartnership from './_handlers/send-partnership.js';
import sendReceiptEmail from './_handlers/send-receipt-email.js';
import share from './_handlers/share.js';
import sitemap from './_handlers/sitemap.js';
import verifyPayment from './_handlers/verify-payment.js';

type ApiHandler = (req: IncomingMessage, res: ServerResponse) => unknown;

const handlers: Record<string, ApiHandler> = {
  'cashfree-order': cashfreeOrder,
  'cashfree-verify': cashfreeVerify,
  'cashfree-webhook': cashfreeWebhook,
  'create-order': createOrder,
  'letter-pdf': letterPdf,
  'og-image': ogImage,
  'partnership-letter-pdf': partnershipLetterPdf,
  'resend-payment-receipt': resendPaymentReceipt,
  'send-letter-email': sendLetterEmail,
  'send-newsletter': sendNewsletter,
  'send-partnership': sendPartnership,
  'send-receipt-email': sendReceiptEmail,
  share,
  sitemap,
  'verify-payment': verifyPayment,
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const host = req.headers.host || 'localhost';
  const rawUrl = (req.headers['x-matched-path'] as string | undefined) || req.url || '/';
  const parsed = new URL(rawUrl, `http://${host}`);

  let route = parsed.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');

  // If route is empty or the literal token '[...route]', check query params
  if (!route || route === '[...route]' || route.startsWith('[')) {
    const qMatch = parsed.searchParams.get('match') || parsed.searchParams.get('route');
    if (qMatch) {
      route = qMatch.replace(/^\/api\/?/, '').replace(/\/$/, '');
    } else {
      const q = (req as unknown as { query?: Record<string, unknown> }).query;
      const m = q?.match || q?.route;
      if (typeof m === 'string') route = m.replace(/^\/api\/?/, '').replace(/\/$/, '');
      else if (Array.isArray(m)) route = m.join('/');
    }
  }

  const routeHandler = handlers[route];

  if (!routeHandler) {
    console.error(`[API Router] Route "${route}" not found. Available: ${Object.keys(handlers).join(', ')}`);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `API route not found: "${route}"` }));
    return;
  }

  await routeHandler(req, res);
}