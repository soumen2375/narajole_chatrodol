/**
 * api/cashfree-webhook.ts
 *
 * Secure Webhook handler for Cashfree PG events.
 *
 * Security & Reliability:
 *   1. Verifies Cashfree HMAC-SHA256 signature using x-webhook-signature and x-webhook-timestamp.
 *   2. Delegates ALL payment state logic to central finalizePayment().
 *   3. Awaits receipt email dispatch so serverless runtime doesn't terminate prematurely.
 *   4. Handles all statuses (PAID, FAILED, CANCELLED, USER_DROPPED, EXPIRED, PENDING).
 */

import type { IncomingMessage, ServerResponse } from 'http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { finalizePayment } from '../server/lib/finalize-payment';
import { sendPaymentReceipt } from '../server/lib/payment-receipt';

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-webhook-signature, x-webhook-timestamp',
  );
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

function getEnvValue(key: string, fallback = ''): string {
  if (process.env[key]) return process.env[key] as string;
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k?.trim() === key) {
          return v.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch {
    // fallback
  }
  return fallback;
}

function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk.toString();
    });
    req.on('end', () => {
      resolve(raw);
    });
    req.on('error', reject);
  });
}

function verifyCashfreeSignature(
  rawBody: string,
  signatureHeader?: string,
  timestampHeader?: string,
  secretKey?: string,
): boolean {
  if (!signatureHeader || !timestampHeader || !secretKey) {
    return false;
  }

  try {
    const dataToSign = timestampHeader + rawBody;

    // Cashfree PG v2/v3 Webhooks use HMAC-SHA256 encoded as base64 or hex
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update(dataToSign);
    const expectedBase64 = hmac.digest('base64');

    const hmacHex = crypto.createHmac('sha256', secretKey);
    hmacHex.update(dataToSign);
    const expectedHex = hmacHex.digest('hex');

    const sigBuf = Buffer.from(signatureHeader);
    const base64Buf = Buffer.from(expectedBase64);
    const hexBuf = Buffer.from(expectedHex);

    const matchesBase64 =
      sigBuf.length === base64Buf.length &&
      crypto.timingSafeEqual(sigBuf, base64Buf);

    const matchesHex =
      sigBuf.length === hexBuf.length &&
      crypto.timingSafeEqual(sigBuf, hexBuf);

    return matchesBase64 || matchesHex;
  } catch (err) {
    console.error('[Cashfree Webhook Signature Check Error]:', err);
    return false;
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-webhook-signature, x-webhook-timestamp',
    );
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.statusCode = 200;
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET') {
    return sendJson(res, 200, {
      status: 'ONLINE',
      service: 'Cashfree Webhook Handler',
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  const secretKey = getEnvValue('CASHFREE_SECRET_KEY');

  try {
    const rawBody = await readRawBody(req);
    const signature = (req.headers['x-webhook-signature'] as string) || '';
    const timestamp = (req.headers['x-webhook-timestamp'] as string) || '';

    // ── 1. Cryptographic Signature Verification ─────────────────────────────
    if (!secretKey) {
      console.error('[Cashfree Webhook] ❌ CASHFREE_SECRET_KEY not configured — rejecting webhook.');
      return sendJson(res, 500, {
        success: false,
        error: 'Webhook signing key not configured',
      });
    }

    const isValid = verifyCashfreeSignature(
      rawBody,
      signature,
      timestamp,
      secretKey,
    );

    if (!isValid) {
      console.error('[Cashfree Webhook] ❌ Invalid signature received.');
      return sendJson(res, 401, {
        success: false,
        error: 'Invalid webhook signature',
      });
    }

    // ── 2. Parse payload ───────────────────────────────────────────────────
    let payload: Record<string, unknown> = {};
    try {
      payload = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
    } catch {
      return sendJson(res, 400, { error: 'Invalid JSON payload' });
    }

    const eventType =
      (payload.type as string) || (payload.event as string) || '';

    const eventData =
      (payload.data as Record<string, unknown>) || payload;

    const order = (eventData.order as Record<string, unknown>) || {};
    const payment = (eventData.payment as Record<string, unknown>) || {};

    const orderId =
      (order.order_id as string) ||
      (eventData.order_id as string) ||
      '';

    const paymentId = String(
      payment.cf_payment_id || eventData.cf_payment_id || '',
    ) || undefined;

    const paymentStatus =
      (payment.payment_status as string) ||
      (eventData.payment_status as string) ||
      (order.order_status as string) ||
      '';

    const paymentGroup = payment.payment_group as string | undefined;
    const paymentMethod = paymentGroup
      ? `Cashfree (${paymentGroup.toUpperCase()})`
      : 'Cashfree Payments';

    if (!orderId) {
      console.warn('[Cashfree Webhook] Missing order_id in payload');
      return sendJson(res, 200, {
        received: true,
        warning: 'Order ID missing in payload',
      });
    }

    console.log(
      `[Cashfree Webhook] Event: ${eventType}, Order: ${orderId}, Status: ${paymentStatus}`,
    );

    // ── 3. Central payment update ──────────────────────────────────────────
    const result = await finalizePayment({
      gateway: 'cashfree',
      orderId,
      paymentId: paymentId || undefined,
      gatewayStatus: paymentStatus,
      eventType,
      paymentMethod,
    });

    // ── 4. Await receipt email dispatch before serverless exit ─────────────
    if (result.success && result.status === 'paid' && result.shouldSendReceipt) {
      try {
        await sendPaymentReceipt({
          type: result.type!,
          record: result.record!,
          paymentMethod: result.paymentMethod || 'Cashfree Payments',
        });
      } catch (receiptErr) {
        console.error('[Cashfree Webhook] Receipt email error:', receiptErr);
      }
    }

    return sendJson(res, 200, {
      received: true,
      order_id: orderId,
      status: result.status || 'unknown',
    });
  } catch (err: unknown) {
    console.error('[Cashfree Webhook Error]:', err);
    return sendJson(res, 500, {
      received: false,
      error: 'Webhook processing error',
    });
  }
}
