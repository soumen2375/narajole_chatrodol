/**
 * api/send-receipt-email.ts
 *
 * Sends official payment receipt emails via Resend API.
 * Called after every successful donation or monthly contribution payment.
 *
 * Fully optimized for all email clients (Gmail, Apple Mail, Outlook) in both Light & Dark Mode.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

// ── Optional Supabase client (for in-app notification logging) ────────────────
function getSupabaseClient() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wzquszbmbpkbhyythdrj.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
  } catch {
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-internal-secret');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if ((req as unknown as { body?: unknown }).body) {
    const b = (req as unknown as { body: unknown }).body;
    return Promise.resolve(typeof b === 'string' ? JSON.parse(b) : (b as Record<string, unknown>));
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

/** Read RESEND_API_KEY from process.env or .env file */
function getResendApiKey(): string {
  let key = process.env.RESEND_API_KEY || '';
  if (key) return key;

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k?.trim() === 'RESEND_API_KEY') {
          key = v.join('=').trim().replace(/^["']|["']$/g, '');
          break;
        }
      }
    }
  } catch { /* fallback */ }

  return key;
}

/**
 * Read RESEND_FROM_EMAIL from env or .env file.
 * Default: "Chhatradol Social Welfare Organization <donations@chhatradol.org>"
 */
function getResendFromEmail(): string {
  let from = process.env.RESEND_FROM_EMAIL || '';
  if (from) return from;

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k?.trim() === 'RESEND_FROM_EMAIL') {
          from = v.join('=').trim().replace(/^["']|["']$/g, '');
          break;
        }
      }
    }
  } catch { /* fallback */ }

  return from || 'Chhatradol Social Welfare Organization <donations@chhatradol.org>';
}

/**
 * Read RESEND_REPLY_TO from env or .env file.
 * Default: "info@chhatradol.org"
 */
function getResendReplyTo(): string {
  let replyTo = process.env.RESEND_REPLY_TO || '';
  if (replyTo) return replyTo;

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k?.trim() === 'RESEND_REPLY_TO') {
          replyTo = v.join('=').trim().replace(/^["']|["']$/g, '');
          break;
        }
      }
    }
  } catch { /* fallback */ }

  return replyTo || 'info@chhatradol.org';
}

/**
 * Read INTERNAL_API_SECRET from env or .env file.
 */
function getInternalApiSecret(): string {
  let secret = process.env.INTERNAL_API_SECRET || '';
  if (secret) return secret;

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k?.trim() === 'INTERNAL_API_SECRET') {
          secret = v.join('=').trim().replace(/^["']|["']$/g, '');
          break;
        }
      }
    }
  } catch { /* fallback */ }

  return secret;
}

// ── Payload type ──────────────────────────────────────────────────────────────

export interface SendReceiptEmailPayload {
  recipientEmail: string;
  recipientName: string;
  type: 'donation' | 'contribution';
  amount: number;
  receiptNumber: string;
  date: string;
  purpose?: string;
  month?: string;
  year?: number;
  paymentMethod?: string;
  paymentId?: string;
}

// ── HTML Receipt Builder ──────────────────────────────────────────────────────

export function buildReceiptHtml(data: SendReceiptEmailPayload): string {
  const typeTitle = data.type === 'contribution'
    ? 'Chhatradol Social Welfare Organization - Monthly Donation Successful'
    : 'Chhatradol Social Welfare Organization - Donation Successful';

  const amountFormatted = `₹${Number(data.amount).toLocaleString('en-IN')}`;
  const displayDate = data.date || new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>${typeTitle}</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      font-family: Arial, Helvetica, sans-serif;
      color: #1f2937;
    }

    .wrapper {
      width: 100%;
      padding: 24px 10px;
    }

    .card {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid #d9dde3;
      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
    }

    /* ================= HEADER ================= */

    .header {
      background: #2F69F8;
      text-align: center;
      padding: 24px 20px 42px;
    }

    .logo {
      width: 72px;
      height: 72px;
      object-fit: contain;
      display: block;
      margin: 0 auto 12px;
    }

    .org-name {
      margin: 0;
      color: #ffffff;
      font-size: 20px;
      line-height: 1.3;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    /* ================= PAYMENT BADGE ================= */

    .success-badge {
      display: inline-block;
      margin-top: 14px;
      background: #ffffff;
      border-radius: 6px;
      padding: 7px 14px;
      color: #374151;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.15);
    }

    .success-icon {
      display: inline-block;
      width: 15px;
      height: 15px;
      line-height: 15px;
      margin-left: 5px;
      background: #16a34a;
      color: #ffffff;
      border-radius: 50%;
      font-size: 10px;
      text-align: center;
      vertical-align: middle;
    }

    /* ================= CONTENT ================= */

    .content {
      padding: 0 26px 26px;
    }

    /* ================= AMOUNT CARD ================= */

    .receipt-box {
      position: relative;
      margin-top: -24px;
      background: #ffffff;
      border: 1px solid #d7dce3;
      border-radius: 8px;
      padding: 18px 14px 14px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.10);
    }

    .amount-title {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      color: #1f2937;
      text-transform: uppercase;
      margin-bottom: 16px;
      letter-spacing: 0.3px;
    }

    /* ================= DETAILS TABLE ================= */

    .details-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .details-table td {
      border: 1px solid #d6dbe2;
      padding: 9px 10px;
    }

    .label {
      width: 38%;
      background: #f3f4f6;
      color: #374151;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
    }

    .value {
      color: #374151;
      font-weight: 500;
      word-break: break-word;
    }

    /* ================= THANK YOU ================= */

    .thank-you {
      text-align: center;
      padding: 18px 12px 4px;
      font-size: 13px;
      color: #374151;
      line-height: 1.55;
    }

    /* ================= LARGE VERIFIED ICON ================= */

    .verified-section {
      text-align: center;
      padding: 18px 0 4px;
    }

    .verified-icon {
      width: 70px;
      height: 70px;
      display: inline-block;
    }

    /* ================= FOOTER ================= */

    .footer {
      background: #eef0f3;
      text-align: center;
      padding: 16px 20px 18px;
      border-top: 1px solid #d9dde3;
    }

    .footer-org {
      margin: 0;
      color: #374151;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .registration {
      margin-top: 6px;
      color: #6b7280;
      font-size: 11px;
    }

    /* ================= SOCIAL ICONS ================= */

    .social-links {
      margin-top: 14px;
      text-align: center;
    }

    .social-link {
      display: inline-block;
      width: 32px;
      height: 32px;
      line-height: 32px;
      margin: 0 4px;
      border-radius: 50%;
      background: #ffffff;
      border: 1px solid #d5d9df;
      text-decoration: none;
      text-align: center;
      vertical-align: middle;
    }

    .social-link img {
      width: 17px;
      height: 17px;
      vertical-align: middle;
      display: inline-block;
    }

    /* ================= MOBILE ================= */

    @media only screen and (max-width: 600px) {

      .wrapper {
        padding: 0;
      }

      .card {
        border-radius: 0;
        border-left: none;
        border-right: none;
      }

      .header {
        padding: 22px 15px 40px;
      }

      .content {
        padding-left: 14px;
        padding-right: 14px;
      }

      .org-name {
        font-size: 17px;
      }

      .amount-title {
        font-size: 16px;
      }

      .details-table td {
        padding: 8px 7px;
      }

      .label {
        width: 42%;
        font-size: 10px;
      }
    }

  </style>
</head>

<body>

  <div class="wrapper">

    <div class="card">

      <!-- ================= HEADER ================= -->

      <div class="header">

        <img
          src="https://www.chhatradol.org/logo.png"
          alt="Chhatradol Social Welfare Organization"
          class="logo"
        >

        <h1 class="org-name">
          Chhatradol Social Welfare Organization
        </h1>

        <div class="success-badge">
          Payment Successful
          <span class="success-icon">✓</span>
        </div>

      </div>


      <!-- ================= CONTENT ================= -->

      <div class="content">

        <div class="receipt-box">

          <div class="amount-title">
            Amount Received ${amountFormatted}
          </div>


          <!-- PAYMENT DETAILS -->

          <table class="details-table">

            <tr>
              <td class="label">
                Receipt Number
              </td>

              <td class="value">
                ${data.receiptNumber || '—'}
              </td>
            </tr>


            <tr>
              <td class="label">
                Date & Time
              </td>

              <td class="value">
                ${displayDate}
              </td>
            </tr>


            <tr>
              <td class="label">
                ${data.type === 'contribution' ? 'Member' : 'Donor'}
              </td>

              <td class="value">
                ${data.recipientName || '—'}
              </td>
            </tr>


            ${data.purpose ? `
            <tr>
              <td class="label">
                Purpose
              </td>

              <td class="value">
                ${data.purpose}
              </td>
            </tr>
            ` : ''}


            ${data.month ? `
            <tr>
              <td class="label">
                Period
              </td>

              <td class="value">
                ${data.month}${data.year ? ' ' + data.year : ''}
              </td>
            </tr>
            ` : ''}


            ${data.paymentMethod ? `
            <tr>
              <td class="label">
                Payment Method
              </td>

              <td class="value">
                ${data.paymentMethod}
              </td>
            </tr>
            ` : ''}


            ${data.paymentId ? `
            <tr>
              <td class="label">
                Transaction ID
              </td>

              <td class="value">
                ${data.paymentId}
              </td>
            </tr>
            ` : ''}

          </table>


          <!-- THANK YOU MESSAGE -->

          <div class="thank-you">

            Thank you for your support. Your contribution enables us
            to continue our social welfare and community development
            initiatives.

          </div>


          <!-- LARGE VERIFIED SVG -->

          <div class="verified-section">

            <svg
              class="verified-icon"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >

              <path
                d="M50 5
                C57 5 61 10 68 10
                C75 10 79 7 85 13
                C91 19 88 24 91 31
                C94 38 100 41 100 50
                C100 59 94 62 91 69
                C88 76 91 81 85 87
                C79 93 75 90 68 90
                C61 90 57 95 50 95
                C43 95 39 90 32 90
                C25 90 21 93 15 87
                C9 81 12 76 9 69
                C6 62 0 59 0 50
                C0 41 6 38 9 31
                C12 24 9 19 15 13
                C21 7 25 10 32 10
                C39 10 43 5 50 5Z"
                fill="#16a34a"
              />

              <path
                d="M29 50
                L43 64
                L72 34"
                fill="none"
                stroke="#ffffff"
                stroke-width="10"
                stroke-linecap="round"
                stroke-linejoin="round"
              />

            </svg>

          </div>

        </div>

      </div>


      <!-- ================= FOOTER ================= -->

      <div class="footer">

        <div class="footer-org">
          Chhatradol Social Welfare Organization
        </div>

        <div class="registration">
          Registration No: IV-100200047/2026
        </div>


        <!-- SOCIAL MEDIA ICONS ONLY -->

        <div class="social-links">

          <!-- Facebook -->

          <a
            href="https://facebook.com/chhatradolswo"
            class="social-link"
            target="_blank"
          >
            <img
              src="https://cdn.simpleicons.org/facebook/1877F2"
              alt="Facebook"
            >
          </a>


          <!-- Instagram -->

          <a
            href="https://instagram.com/chhatradolswo"
            class="social-link"
            target="_blank"
          >
            <img
              src="https://cdn.simpleicons.org/instagram/E4405F"
              alt="Instagram"
            >
          </a>


          <!-- X -->

          <a
            href="https://x.com/Chhatradolswo"
            class="social-link"
            target="_blank"
          >
            <img
              src="https://cdn.simpleicons.org/x/000000"
              alt="X"
            >
          </a>


          <!-- YouTube -->

          <a
            href="https://www.youtube.com/@Chhatradolswo"
            class="social-link"
            target="_blank"
          >
            <img
              src="https://cdn.simpleicons.org/youtube/FF0000"
              alt="YouTube"
            >
          </a>

        </div>

      </div>

    </div>

  </div>

</body>
</html>`;
}

// ── Resend email dispatcher ───────────────────────────────────────────────────

async function sendViaResend(
  resendApiKey: string,
  toEmail: string,
  toName: string,
  subject: string,
  htmlContent: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const fromAddress = getResendFromEmail();
    const replyToAddress = getResendReplyTo();

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [`${toName} <${toEmail}>`],
        subject,
        html: htmlContent,
        reply_to: replyToAddress,
        tags: [
          { name: 'category', value: 'payment-receipt' },
        ],
      }),
    });

    const result = await response.json() as { id?: string; message?: string; name?: string };

    if (!response.ok) {
      const errMsg = result.message || result.name || `Resend API error (${response.status})`;
      console.error('[Receipt Email] Resend dispatch failed:', errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true, messageId: result.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error calling Resend API';
    console.error('[Receipt Email] Resend fetch error:', msg);
    return { success: false, error: msg };
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  // ── Authorization: ensure only internal backend calls this endpoint ───────
  const expectedSecret = getInternalApiSecret();
  if (expectedSecret) {
    const internalSecret =
      (req.headers['x-internal-secret'] as string | undefined) ||
      ((req.headers as Record<string, unknown>)['X-Internal-Secret'] as string | undefined);

    if (internalSecret !== expectedSecret) {
      console.warn('[Receipt Email] Unauthorized attempt to invoke /api/send-receipt-email directly');
      return sendJson(res, 401, { error: 'Unauthorized: internal secret required' });
    }
  }

  try {
    const body = (await parseBody(req)) as unknown as SendReceiptEmailPayload;

    if (!body.recipientEmail || !body.recipientEmail.includes('@')) {
      return sendJson(res, 400, { error: 'recipientEmail is required and must be valid' });
    }
    if (!body.receiptNumber || !body.amount) {
      return sendJson(res, 400, { error: 'receiptNumber and amount are required' });
    }

    const htmlContent = buildReceiptHtml(body);

    const typeLabel = body.type === 'contribution'
      ? 'Chhatradol Social Welfare Organization - Monthly Donation Successful'
      : 'Chhatradol Social Welfare Organization - Donation Successful';
    const subject = `${typeLabel}`;

    // ── Save in-app notification to Supabase (non-blocking, deduped) ──────────
    try {
      const client = getSupabaseClient();
      if (client) {
        const notifTitle = `Payment Receipt: ${body.receiptNumber}`;
        const { data: existingNotif } = await client
          .from('cswo_notifications')
          .select('id')
          .eq('title', notifTitle)
          .maybeSingle();

        if (!existingNotif) {
          await client.from('cswo_notifications').insert({
            title: notifTitle,
            body: `Your payment of ₹${body.amount} for ${body.purpose || body.month || 'CSWO'} was confirmed. Receipt: ${body.receiptNumber}`,
            kind: 'payment',
            link: '/member/contributions',
          });
        }
      }
    } catch {
      // Non-critical — continue even if notification save fails
    }

    // ── Dispatch email via Resend ─────────────────────────────────────────────
    const resendApiKey = getResendApiKey();

    if (!resendApiKey) {
      console.warn('[Receipt Email] RESEND_API_KEY not configured — email not sent, but receipt HTML generated.');
      return sendJson(res, 200, {
        success: false,
        warning: 'RESEND_API_KEY not configured. Email was not sent.',
        receiptNumber: body.receiptNumber,
        previewHtml: htmlContent,
      });
    }

    const emailResult = await sendViaResend(
      resendApiKey,
      body.recipientEmail,
      body.recipientName || 'Valued Supporter',
      subject,
      htmlContent,
    );

    if (!emailResult.success) {
      console.error(`[Receipt Email] Failed to send to ${body.recipientEmail}: ${emailResult.error}`);
      return sendJson(res, 200, {
        success: false,
        warning: `Email dispatch failed: ${emailResult.error}`,
        receiptNumber: body.receiptNumber,
      });
    }

    console.log(`[Receipt Email] ✓ Sent to ${body.recipientEmail} (${body.receiptNumber}) — Resend ID: ${emailResult.messageId}`);

    return sendJson(res, 200, {
      success: true,
      message: `Receipt email sent to ${body.recipientEmail}`,
      receiptNumber: body.receiptNumber,
      messageId: emailResult.messageId,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to process receipt email request';
    console.error('[Receipt Email] Handler error:', err);
    return sendJson(res, 500, { error: msg });
  }
}
