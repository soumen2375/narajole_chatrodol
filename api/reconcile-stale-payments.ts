/**
 * api/reconcile-stale-payments.ts
 *
 * Automated Payment & Receipt Reconciliation Worker.
 *
 * Runs periodically (e.g. via Vercel Cron, GitHub Actions, or cron-job.org).
 *
 * Responsibilities:
 *   1. Sweeps records stuck in `receipt_email_status = 'sending'` for > 15 mins → resets to 'pending'
 *      so uncompleted / killed background sends are eligible for automatic retry / resend.
 *   2. Sweeps donations & monthly contributions older than 20 mins in 'created' / 'starting' / 'pending':
 *      - If it has cashfree_order_id: Queries Cashfree API and calls finalizePayment().
 *      - If it has NO gateway order ID: Marks as 'cancelled' (session abandoned before order creation).
 *
 * Security:
 *   Protected by `x-cron-secret` header matching CRON_SECRET env var,
 *   or an authenticated admin Bearer token.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import { finalizePayment } from '../server/lib/finalize-payment';
import { sendPaymentReceipt } from '../server/lib/payment-receipt';
import fs from 'node:fs';
import path from 'node:path';

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

function getSupabaseClient() {
  const url =
    getEnvValue('SUPABASE_URL') ||
    getEnvValue('VITE_SUPABASE_URL', 'https://wzquszbmbpkbhyythdrj.supabase.co');

  const key = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for payment reconciliation');
  }

  return createClient(url, key);
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
    if (secretKey.includes('_prod_')) apiEnv = 'production';
    else if (secretKey.includes('_test_')) apiEnv = 'sandbox';
    else apiEnv = 'production';
  }

  return { appId, secretKey, apiEnv };
}

async function verifyCashfreeOrder(orderId: string, appId: string, secretKey: string, apiEnv: string) {
  const baseUrl =
    apiEnv === 'sandbox'
      ? `https://sandbox.cashfree.com/pg/orders/${orderId}`
      : `https://api.cashfree.com/pg/orders/${orderId}`;

  const res = await fetch(baseUrl, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-version': '2023-08-01',
      'x-client-id': appId,
      'x-client-secret': secretKey,
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  return (await res.json()) as {
    order_id?: string;
    order_status?: string;
    cf_order_id?: string;
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-cron-secret');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.statusCode = 200;
    res.end();
    return;
  }

  // ── Authorization Check ───────────────────────────────────────────────────
  const cronSecret = getEnvValue('CRON_SECRET');
  const incomingCronSecret = req.headers['x-cron-secret'] as string | undefined;
  const authHeader = req.headers.authorization || '';

  let isAuthorized = false;

  if (cronSecret && incomingCronSecret === cronSecret) {
    isAuthorized = true;
  } else if (authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7).trim();
      const supabase = getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) isAuthorized = true;
    } catch {
      // not authorized
    }
  } else if (!cronSecret) {
    // If no CRON_SECRET configured yet, allow manual invocation
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return sendJson(res, 401, { success: false, error: 'Unauthorized: Invalid cron secret or token' });
  }

  const supabase = getSupabaseClient();
  const { appId, secretKey, apiEnv } = getCashfreeCredentials();

  const results = {
    reconciledDonations: 0,
    cancelledAbandonedDonations: 0,
    resetSendingStatus: 0,
    errors: [] as string[],
  };

  try {
    // ── 1. Unstick records stuck in 'sending' for > 15 mins ──────────────────
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: stuckDonations } = await supabase
      .from('cswo_donations')
      .update({ receipt_email_status: 'pending' })
      .eq('receipt_email_status', 'sending')
      .lt('updated_at', fifteenMinsAgo)
      .select('id');

    const { data: stuckContributions } = await supabase
      .from('cswo_monthly_contributions')
      .update({ receipt_email_status: 'pending' })
      .eq('receipt_email_status', 'sending')
      .lt('updated_at', fifteenMinsAgo)
      .select('id');

    results.resetSendingStatus =
      (stuckDonations?.length || 0) + (stuckContributions?.length || 0);

    // ── 2. Sweep Stale Donations (> 20 mins old in created/starting/pending) ─
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000).toISOString();

    const { data: staleDonations, error: donErr } = await supabase
      .from('cswo_donations')
      .select('*')
      .in('status', ['created', 'starting', 'pending'])
      .lt('created_at', twentyMinsAgo)
      .limit(50);

    if (donErr) {
      results.errors.push(`Error fetching stale donations: ${donErr.message}`);
    }

    if (staleDonations && staleDonations.length > 0) {
      for (const don of staleDonations) {
        try {
          if (don.cashfree_order_id && appId && secretKey) {
            // Verify with Cashfree
            const cfOrder = await verifyCashfreeOrder(
              don.cashfree_order_id,
              appId,
              secretKey,
              apiEnv,
            );

            if (cfOrder && cfOrder.order_status) {
              const finResult = await finalizePayment({
                gateway: 'cashfree',
                orderId: don.cashfree_order_id,
                paymentId: cfOrder.cf_order_id,
                gatewayStatus: cfOrder.order_status,
                paymentMethod: 'Cashfree Payments',
              });

              if (finResult.success && finResult.status === 'paid' && finResult.shouldSendReceipt) {
                await sendPaymentReceipt({
                  type: 'donation',
                  record: finResult.record!,
                  paymentMethod: 'Cashfree Payments',
                });
              }
              results.reconciledDonations++;
            }
          } else if (!don.cashfree_order_id && !don.razorpay_order_id) {
            // No gateway order was ever generated (user closed / abandoned early)
            await supabase
              .from('cswo_donations')
              .update({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
              })
              .eq('id', don.id);

            results.cancelledAbandonedDonations++;
          }
        } catch (itemErr) {
          const msg = itemErr instanceof Error ? itemErr.message : String(itemErr);
          results.errors.push(`Donation ${don.id}: ${msg}`);
        }
      }
    }

    return sendJson(res, 200, {
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error during reconciliation';
    console.error('[Payment Reconciliation Error]:', err);
    return sendJson(res, 500, { success: false, error: msg });
  }
}
