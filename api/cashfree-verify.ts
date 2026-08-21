import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
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
  }

  return { appId, secretKey, apiEnv };
}

function getSupabaseClient() {
  try {
    const supabaseUrl = getEnvValue('VITE_SUPABASE_URL', 'https://wzquszbmbpkbhyythdrj.supabase.co');
    const supabaseKey = getEnvValue('VITE_SUPABASE_ANON_KEY', 'sb_publishable_7sZQXGDGxGl9M7yEl0UXpg_o0JLwp-L');
    if (!supabaseUrl || !supabaseKey) return null;
    return createClient(supabaseUrl, supabaseKey);
  } catch {
    return null;
  }
}

async function sendEmailReceipt(data: {
  recipientEmail: string;
  recipientName: string;
  type: 'donation' | 'contribution';
  amount: number;
  receiptNumber: string;
  purpose?: string;
  paymentMethod?: string;
  paymentId?: string;
  date: string;
}) {
  if (!data.recipientEmail) return;
  const siteUrl = getEnvValue('SITE_URL', 'https://www.chhatradol.org');

  try {
    await fetch(`${siteUrl}/api/send-receipt-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) {
    console.warn('[Verify] Failed to send receipt email via API:', err);
  }
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

    const headers = {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': appId,
      'x-client-secret': secretKey,
    };

    const response = await fetch(baseUrl, {
      method: 'GET',
      headers,
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

    let isPaid = data.order_status === 'PAID';
    let paymentId: string | undefined = data.cf_order_id || data.order_id;
    let paymentMethod = 'Cashfree Payments';

    // If order_status is still ACTIVE or PENDING, check payments array directly
    if (!isPaid) {
      try {
        const paymentsUrl =
          apiEnv === 'sandbox'
            ? `https://sandbox.cashfree.com/pg/orders/${orderId}/payments`
            : `https://api.cashfree.com/pg/orders/${orderId}/payments`;

        const pRes = await fetch(paymentsUrl, {
          method: 'GET',
          headers,
        });

        if (pRes.ok) {
          const pList = await pRes.json();
          if (Array.isArray(pList) && pList.length > 0) {
            const successfulPayment = pList.find(
              (p: { payment_status?: string }) => p.payment_status?.toUpperCase() === 'SUCCESS'
            );
            if (successfulPayment) {
              isPaid = true;
              data.order_status = 'PAID';
              if (successfulPayment.cf_payment_id) {
                paymentId = String(successfulPayment.cf_payment_id);
              }
              if (successfulPayment.payment_group) {
                paymentMethod = `Cashfree (${successfulPayment.payment_group.toUpperCase()})`;
              }
            }
          }
        }
      } catch (pErr) {
        console.warn('Error checking Cashfree order payments array:', pErr);
      }
    }

    // If verified as paid, automatically sync to Supabase and send receipt email
    if (isPaid && orderId) {
      const sb = getSupabaseClient();
      if (sb) {
        try {
          // 1. Try match by cashfree_order_id
          let { data: donRec } = await sb
            .from('cswo_donations')
            .select('*')
            .eq('cashfree_order_id', orderId)
            .maybeSingle();

          // 2. Fallback: Extract UUID from don_cf_<uuid>_... pattern if not matched by order_id
          if (!donRec && orderId.includes('don_cf_')) {
            const raw = orderId.replace(/^.*don_cf_/, '');
            const candidateId = raw.split('_')[0];
            if (candidateId && candidateId.length >= 8) {
              const { data: fallbackRec } = await sb
                .from('cswo_donations')
                .select('*')
                .eq('id', candidateId)
                .maybeSingle();
              if (fallbackRec) donRec = fallbackRec;
            }
          }

          if (donRec) {
            const receiptNum = donRec.receipt_number || `CSWO-DON-${Date.now().toString().slice(-8).toUpperCase()}`;
            await sb
              .from('cswo_donations')
              .update({
                status: 'paid',
                receipt_number: receiptNum,
                cashfree_payment_id: paymentId || null,
                cashfree_order_id: orderId,
              })
              .eq('id', donRec.id);

            if (donRec.donor_email) {
              await sendEmailReceipt({
                recipientEmail: donRec.donor_email,
                recipientName: donRec.donor_name || 'Valued Supporter',
                type: 'donation',
                amount: donRec.amount || Number(data.order_amount || 0),
                receiptNumber: receiptNum,
                purpose: donRec.purpose || 'Donation & Social Welfare',
                paymentMethod,
                paymentId,
                date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
              });
            }
          }
        } catch (syncErr) {
          console.warn('[Verify] Supabase sync/email error:', syncErr);
        }
      }
    }

    return sendJson(res, 200, {
      success: isPaid,
      order_id: data.order_id || orderId,
      payment_id: paymentId,
      payment_method: paymentMethod,
      order_status: isPaid ? 'PAID' : data.order_status,
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
