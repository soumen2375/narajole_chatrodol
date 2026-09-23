/**
 * api/cashfree-order.ts
 *
 * Backend API endpoint to create a Cashfree payment order.
 * Called by src/lib/cashfree.ts → createCashfreeOrder().
 *
 * Environment variables required:
 *   CASHFREE_APP_ID     — Your Cashfree App ID (from Cashfree dashboard)
 *   CASHFREE_SECRET_KEY — Your Cashfree Secret Key (NEVER expose on client)
 *   CASHFREE_API_ENV    — 'sandbox' or 'production' (default: 'production')
 */

import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'node:fs';
import path from 'node:path';

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.statusCode = statusCode;
  res.end(JSON.stringify(data));
}

/**
 * Resolves the public origin to build return_url/notify_url from.
 *
 * Priority:
 *   1. The incoming request's own Host header — this is always the exact
 *      domain the paying user's browser is actually talking to, so it's
 *      correct in every environment (production, a Vercel preview deploy,
 *      local dev, an ngrok tunnel for pre-launch testing) with zero config.
 *   2. An explicitly configured SITE_URL (env var or .env), only used when
 *      no request host is available at all (e.g. some non-HTTP invocation).
 *   3. Hardcoded production URL, as a last-resort fallback.
 *
 * Getting this wrong sends the gateway's redirect/webhook to the wrong
 * domain — on a full-page ('_self') mobile checkout redirect, that strands
 * the browser on a different site entirely and looks like the payment is
 * stuck "processing" forever on the page the user is actually watching.
 * (SITE_URL is deliberately NOT given priority here: a stale/unrelated
 * value left in .env — e.g. the production domain, during ngrok testing —
 * would otherwise silently redirect Cashfree away from the host actually
 * being tested, which is exactly this bug.)
 */
function resolveSiteOrigin(req: IncomingMessage): string {
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  if (host) {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || 'https';
    return `${proto}://${host}`;
  }

  let explicitSiteUrl = process.env.SITE_URL || '';
  if (!explicitSiteUrl) {
    try {
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const [k, ...v] = trimmed.split('=');
          if (k?.trim() === 'SITE_URL') {
            explicitSiteUrl = v.join('=').trim().replace(/^["']|["']$/g, '');
            break;
          }
        }
      }
    } catch {
      // fallback below
    }
  }
  if (explicitSiteUrl) return explicitSiteUrl.replace(/\/$/, '');

  return 'https://www.chhatradol.org';
}

async function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if ((req as unknown as { body?: unknown }).body) {
    const b = (req as unknown as { body: unknown }).body;
    return typeof b === 'string' ? JSON.parse(b) : (b as Record<string, unknown>);
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch (err) { reject(err); }
    });
    req.on('error', reject);
  });
}

function getCashfreeCredentials(): {
  appId: string;
  secretKey: string;
  apiEnv: string;
} {
  let appId = process.env.CASHFREE_APP_ID || '';
  let secretKey = process.env.CASHFREE_SECRET_KEY || '';
  let apiEnv = process.env.CASHFREE_API_ENV || '';

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
        if (key === 'CASHFREE_APP_ID') appId = val;
        else if (key === 'CASHFREE_SECRET_KEY') secretKey = val;
        else if (key === 'CASHFREE_API_ENV') apiEnv = val;
      }
    }
  } catch {
    // fallback to process.env
  }

  // Auto-detect from key prefix if secretKey has _prod_ or _test_
  if (!apiEnv) {
    if (secretKey.includes('_prod_')) {
      apiEnv = 'production';
    } else if (secretKey.includes('_test_')) {
      apiEnv = 'sandbox';
    } else {
      apiEnv = 'production';
    }
  } else if (apiEnv === 'sandbox' && secretKey.includes('_prod_')) {
    // Correct mismatch: user provided production key but wrote sandbox in env
    apiEnv = 'production';
  } else if (apiEnv === 'production' && secretKey.includes('_test_')) {
    apiEnv = 'sandbox';
  }

  return { appId, secretKey, apiEnv };
}


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
    return sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  const { appId, secretKey, apiEnv } = getCashfreeCredentials();

  if (!appId || !secretKey) {
    return sendJson(res, 401, {
      error:
        'Cashfree API credentials not configured. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in environment variables.',
    });
  }

  try {
    const body = await parseBody(req);
    const amount = Number(body.amount);
    const currency = (body.currency as string) || 'INR';
    const customerName = (body.customer_name as string) || 'Anonymous';
    const customerEmail = (body.customer_email as string) || 'noreply@cswo.in';
    const customerPhone = (body.customer_phone as string) || '9999999999';
    const orderNote = (body.order_note as string) || 'Donation / Contribution';
    const receipt = (body.receipt as string) || `cswo_cf_${Date.now()}`;

    if (!amount || isNaN(amount) || amount < 1) {
      return sendJson(res, 400, {
        error: 'Invalid amount. Minimum amount is ₹1.00.',
      });
    }

    // Cashfree API base URL
    const baseUrl =
      apiEnv === 'sandbox'
        ? 'https://sandbox.cashfree.com/pg/orders'
        : 'https://api.cashfree.com/pg/orders';

    const orderId = `${receipt}_${Date.now()}`.slice(0, 50).replace(/[^a-zA-Z0-9_-]/g, '_');

    const orderPayload = {
      order_id: orderId,
      order_amount: amount,
      order_currency: currency.toUpperCase(),
      order_note: orderNote,
      customer_details: {
        customer_id: `cust_${Date.now()}`,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone.replace(/\D/g, '').slice(-10) || '9999999999',
      },
      order_meta: {
        return_url: `${resolveSiteOrigin(req)}/payment-return?order_id={order_id}`,
        notify_url: `${resolveSiteOrigin(req)}/api/cashfree-webhook`,
      },
    };

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
      body: JSON.stringify(orderPayload),
      signal: AbortSignal.timeout(10000),
    });

    const data = await response.json() as {
      cf_order_id?: string;
      order_id?: string;
      payment_session_id?: string;
      order_status?: string;
      order_amount?: number;
      order_currency?: string;
      message?: string;
    };

    if (!response.ok) {
      console.error('Cashfree order creation failed:', data);
      return sendJson(res, response.status, {
        error: data.message || 'Failed to create Cashfree order',
      });
    }

    return sendJson(res, 200, {
      order_id: data.order_id || orderId,
      payment_session_id: data.payment_session_id,
      order_status: data.order_status,
      order_amount: data.order_amount || amount,
      order_currency: data.order_currency || currency,
    });
  } catch (err: unknown) {
    console.error('Error creating Cashfree order:', err);
    const errObj = err as { message?: string };
    return sendJson(res, 500, { error: errObj?.message || 'Internal server error' });
  }
}
