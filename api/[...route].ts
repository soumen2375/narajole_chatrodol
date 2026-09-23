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
  const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
  const route = pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
  const routeHandler = handlers[route];

  if (!routeHandler) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'API route not found' }));
    return;
  }

  await routeHandler(req, res);
}