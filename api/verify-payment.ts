/**
 * api/verify-payment.ts
 *
 * Verifies a Razorpay payment signature and finalizes the payment record.
 * Delegates ALL Supabase record updates to the central finalizePayment() function.
 *
 * POST /api/verify-payment
 * Body: { order_id, payment_id, razorpay_signature }
 *
 * Response: { success, status, type, receipt_number, order_id, payment_id }
 */

import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { finalizePayment } from './lib/finalize-payment';
import { sendPaymentReceipt } from './lib/payment-receipt';

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

async function parseBody(
  req: IncomingMessage,
): Promise<Record<string, unknown>> {
  if ((req as unknown as { body?: unknown }).body) {
    const b = (req as unknown as { body: unknown }).body;
    return typeof b === 'string'
      ? JSON.parse(b)
      : (b as Record<string, unknown>);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getCredentials(): { keyId: string; keySecret: string } {
  let keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.VITE_RAZORPAY_KEY_ID ||
    '';
  let keySecret = process.env.RAZORPAY_KEY_SECRET || '';

  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        const key = k?.trim();
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        if (key === 'RAZORPAY_KEY_ID') keyId = val;
        else if (key === 'VITE_RAZORPAY_KEY_ID' && !keyId) keyId = val;
        else if (key === 'RAZORPAY_KEY_SECRET') keySecret = val;
      }
    }
  } catch {
    // fallback to process.env
  }

  return { keyId, keySecret };
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, {
      success: false,
      error: 'Method Not Allowed. Use POST.',
    });
  }

  const { keySecret } = getCredentials();
  if (!keySecret) {
    return sendJson(res, 500, {
      success: false,
      error:
        'Razorpay secret key not configured. Please set RAZORPAY_KEY_SECRET in environment variables.',
    });
  }

  try {
    const body = await parseBody(req);
    const orderId = (
      (body.order_id as string) || (body.razorpay_order_id as string) || ''
    ).trim();
    const paymentId = (
      (body.payment_id as string) || (body.razorpay_payment_id as string) || ''
    ).trim();
    const signature = ((body.razorpay_signature as string) || '').trim();

    if (!orderId || !paymentId || !signature) {
      return sendJson(res, 400, {
        success: false,
        error:
          'Missing required parameters (order_id, payment_id, razorpay_signature).',
      });
    }

    // ── Cryptographic signature verification ───────────────────────────────
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = timingSafeEqualStr(expectedSignature, signature);

    if (!isValid) {
      return sendJson(res, 400, {
        success: false,
        error: 'Invalid payment signature. Verification failed.',
      });
    }

    // ── Signature is valid → finalize the payment in Supabase ─────────────
    const result = await finalizePayment({
      gateway: 'razorpay',
      orderId,
      paymentId,
      gatewayStatus: 'SUCCESS',
      paymentMethod: 'Razorpay',
    });

    // ── Await receipt email dispatch so serverless runtime doesn't terminate prematurely ──
    if (result.success && result.status === 'paid' && result.shouldSendReceipt) {
      try {
        await sendPaymentReceipt({
          type: result.type!,
          record: result.record!,
          paymentMethod: 'Razorpay',
        });
      } catch (receiptErr) {
        console.error('[verify-payment] Receipt email error:', receiptErr);
      }
    }

    return sendJson(res, 200, {
      success: true,
      status: result.status || 'paid',
      type: result.type,
      receipt_number:
        (result.record as Record<string, unknown> | undefined)
          ?.receipt_number ?? null,
      order_id: orderId,
      payment_id: paymentId,
    });
  } catch (err: unknown) {
    console.error('[verify-payment] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal verification error';
    return sendJson(res, 500, { success: false, error: message });
  }
}
