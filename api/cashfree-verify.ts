/**
 * api/cashfree-verify.ts
 *
 * Verifies a Cashfree order status server-to-server.
 * Delegates ALL Supabase record updates to the central finalizePayment() function.
 * Fires receipt email non-blocking so the customer gets an instant response.
 *
 * Response shape:
 *   { success: boolean; status: string; order_id: string; payment_id?: string }
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { finalizePayment } from '../server/lib/finalize-payment';
import { sendPaymentReceipt } from '../server/lib/payment-receipt';
import fs from 'node:fs';
import path from 'node:path';

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
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

function getCashfreeCredentials(): {
  appId: string;
  secretKey: string;
  apiEnv: string;
} {
  let appId = getEnvValue('CASHFREE_APP_ID');
  let secretKey = getEnvValue('CASHFREE_SECRET_KEY');
  let apiEnv = getEnvValue('CASHFREE_API_ENV');

  if (!apiEnv) {
    if (secretKey.includes('_prod_')) {
      apiEnv = 'production';
    } else if (secretKey.includes('_test_')) {
      apiEnv = 'sandbox';
    } else {
      apiEnv = 'production';
    }
  } else if (apiEnv === 'sandbox' && secretKey.includes('_prod_')) {
    apiEnv = 'production';
  } else if (apiEnv === 'production' && secretKey.includes('_test_')) {
    apiEnv = 'sandbox';
  }

  return { appId, secretKey, apiEnv };
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.statusCode = 200;
    res.end();
    return;
  }

  const { appId, secretKey, apiEnv } = getCashfreeCredentials();

  if (!appId || !secretKey) {
    return sendJson(res, 401, {
      success: false,
      status: 'error',
      error: 'Cashfree API credentials not configured.',
    });
  }

  try {
    let orderId = '';
    if (req.method === 'POST') {
      const body = await parseBody(req);
      orderId = ((body.order_id as string) || '').trim();
    } else if (req.method === 'GET') {
      const url = new URL(
        req.url || '',
        `http://${req.headers.host || 'localhost'}`,
      );
      orderId = url.searchParams.get('order_id') || '';
    }

    if (!orderId) {
      return sendJson(res, 400, {
        success: false,
        status: 'error',
        error: 'Missing order_id parameter.',
      });
    }

    const baseHeaders = {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': appId,
      'x-client-secret': secretKey,
    };

    const baseUrl =
      apiEnv === 'sandbox'
        ? `https://sandbox.cashfree.com/pg/orders/${orderId}`
        : `https://api.cashfree.com/pg/orders/${orderId}`;

    // ── Fetch order from Cashfree ──────────────────────────────────────────
    const orderRes = await fetch(baseUrl, {
      method: 'GET',
      headers: baseHeaders,
      signal: AbortSignal.timeout(10000),
    });

    const orderData = (await orderRes.json()) as {
      order_id?: string;
      order_status?: string;
      order_amount?: number;
      order_currency?: string;
      cf_order_id?: string;
      message?: string;
    };

    if (!orderRes.ok) {
      return sendJson(res, orderRes.status, {
        success: false,
        status: 'error',
        error:
          orderData.message || 'Failed to fetch order status from Cashfree.',
      });
    }

    let isPaid = orderData.order_status === 'PAID';
    let paymentId: string | undefined = orderData.cf_order_id || orderData.order_id;
    let paymentMethod = 'Cashfree Payments';
    let rawStatus = orderData.order_status || 'PENDING';

    // ── If order is ACTIVE/PENDING, check payments list for a SUCCESS ──────
    if (!isPaid) {
      try {
        const paymentsUrl =
          apiEnv === 'sandbox'
            ? `https://sandbox.cashfree.com/pg/orders/${orderId}/payments`
            : `https://api.cashfree.com/pg/orders/${orderId}/payments`;

        const pRes = await fetch(paymentsUrl, {
          method: 'GET',
          headers: baseHeaders,
          signal: AbortSignal.timeout(10000),
        });

        if (pRes.ok) {
          const pList = (await pRes.json()) as Array<{
            payment_status?: string;
            cf_payment_id?: string;
            payment_group?: string;
          }>;

          if (Array.isArray(pList) && pList.length > 0) {
            const successPayment = pList.find(
              (p) => p.payment_status?.toUpperCase() === 'SUCCESS',
            );

            if (successPayment) {
              isPaid = true;
              rawStatus = 'SUCCESS';
              if (successPayment.cf_payment_id) {
                paymentId = String(successPayment.cf_payment_id);
              }
              if (successPayment.payment_group) {
                paymentMethod = `Cashfree (${successPayment.payment_group.toUpperCase()})`;
              }
            } else {
              // Use the most recent payment's status for accurate reporting
              const latest = pList[0];
              if (latest?.payment_status) {
                rawStatus = latest.payment_status.toUpperCase();
              }
            }
          }
        }
      } catch (pErr) {
        console.warn('[cashfree-verify] Error checking payments list:', pErr);
      }
    }

    // ── Centrally update Supabase ──────────────────────────────────────────
    const result = await finalizePayment({
      gateway: 'cashfree',
      orderId,
      paymentId,
      gatewayStatus: rawStatus,
      paymentMethod,
    });

    // ── Dispatch receipt email asynchronously (fire-and-forget) to keep verification polling fast ──
    if (result.success && result.status === 'paid' && result.shouldSendReceipt) {
      void sendPaymentReceipt({
        type: result.type!,
        record: result.record!,
        paymentMethod: result.paymentMethod || paymentMethod,
      }).catch((err) => {
        console.error('[cashfree-verify] Receipt email dispatch error:', err);
      });
    }

    const finalStatus = result.status || (isPaid ? 'paid' : 'pending');

    return sendJson(res, 200, {
      success: finalStatus === 'paid',
      status: finalStatus,
      order_id: orderData.order_id || orderId,
      payment_id: paymentId,
      payment_method: paymentMethod,
      order_amount: orderData.order_amount,
      order_currency: orderData.order_currency,
      // Include type and receipt_number so frontend can display them
      type: result.type,
      receipt_number:
        (result.record as Record<string, unknown> | undefined)
          ?.receipt_number ?? null,
    });
  } catch (err: unknown) {
    console.error('[cashfree-verify] Error:', err);
    const errObj = err as { message?: string };
    return sendJson(res, 500, {
      success: false,
      status: 'error',
      error: errObj?.message || 'Verification error',
    });
  }
}
