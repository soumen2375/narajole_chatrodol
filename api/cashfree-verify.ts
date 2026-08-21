/**
 * api/cashfree-verify.ts
 *
 * Server-side endpoint to verify a Cashfree order status directly against Cashfree REST APIs.
 * Ensures payment is officially marked 'PAID' before returning success.
 */

import type { IncomingMessage, ServerResponse } from 'http';
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
    // fallback
  }

  if (!apiEnv) {
    if (secretKey.includes('_prod_')) {
      apiEnv = 'production';
    } else if (secretKey.includes('_test_')) {
      apiEnv = 'sandbox';
    } else {
      apiEnv = 'production';
    }
  }

  return { appId, secretKey, apiEnv };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
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
      error: 'Cashfree API credentials not configured.',
    });
  }

  try {
    let orderId = '';
    if (req.method === 'POST') {
      const body = await parseBody(req);
      orderId = (body.order_id as string)?.trim();
    } else if (req.method === 'GET') {
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      orderId = url.searchParams.get('order_id') || '';
    }

    if (!orderId) {
      return sendJson(res, 400, {
        success: false,
        error: 'Missing order_id parameter.',
      });
    }

    const baseUrl =
      apiEnv === 'sandbox'
        ? `https://sandbox.cashfree.com/pg/orders/${orderId}`
        : `https://api.cashfree.com/pg/orders/${orderId}`;

    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': appId,
        'x-client-secret': secretKey,
      },
    });

    const data = (await response.json()) as {
      order_id?: string;
      order_status?: string;
      order_amount?: number;
      order_currency?: string;
      cf_order_id?: string;
      message?: string;
    };

    if (!response.ok) {
      return sendJson(res, response.status, {
        success: false,
        error: data.message || 'Failed to fetch order status from Cashfree.',
      });
    }

    const isPaid = data.order_status === 'PAID';

    return sendJson(res, 200, {
      success: isPaid,
      order_id: data.order_id || orderId,
      order_status: data.order_status,
      order_amount: data.order_amount,
      order_currency: data.order_currency,
      message: isPaid ? 'Payment verified successfully.' : `Order is currently ${data.order_status}.`,
    });
  } catch (err: unknown) {
    console.error('Error verifying Cashfree order:', err);
    const errObj = err as { message?: string };
    return sendJson(res, 500, { success: false, error: errObj?.message || 'Verification error' });
  }
}
