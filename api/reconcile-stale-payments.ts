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
 *      - If it has razorpay_order_id: Queries Razorpay API and calls finalizePayment().
 *      - If it has NO gateway order ID: Marks as 'cancelled' (session abandoned before order creation).
 *
 * Security:
 *   Protected by `x-cron-secret` header matching CRON_SECRET env var,
 *   or an authenticated admin Bearer token.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import { finalizePayment } from './_lib/finalize-payment';
import { sendPaymentReceipt } from './_lib/payment-receipt';
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

function getRazorpayCredentials(): {
  keyId: string;
  keySecret: string;
} {
  let keyId =
    getEnvValue('RAZORPAY_KEY_ID') ||
    getEnvValue('VITE_RAZORPAY_KEY_ID');
  let keySecret = getEnvValue('RAZORPAY_KEY_SECRET');

  return { keyId, keySecret };
}

const CASHFREE_TERMINAL_STATUSES = new Set([
  'PAID',
  'SUCCESS',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'USER_DROPPED',
]);

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

async function verifyRazorpayOrder(orderId: string, keyId: string, keySecret: string) {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}/payments`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  return (await res.json()) as {
    count?: number;
    items?: Array<{
      id?: string;
      status?: string;
      method?: string;
    }>;
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
    const token = authHeader.slice(7).trim();
    if (cronSecret && token === cronSecret) {
      isAuthorized = true;
    } else {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) isAuthorized = true;
      } catch {
        // not authorized
      }
    }
  }

  if (!isAuthorized) {
    return sendJson(res, 401, { success: false, error: 'Unauthorized: Valid x-cron-secret, CRON_SECRET Bearer token, or admin session required' });
  }

  const supabase = getSupabaseClient();
  const { appId, secretKey, apiEnv } = getCashfreeCredentials();
  const { keyId: rzpKeyId, keySecret: rzpSecretKey } = getRazorpayCredentials();

  const results = {
    reconciledDonations: 0,
    cancelledAbandonedDonations: 0,
    reconciledContributions: 0,
    cancelledAbandonedContributions: 0,
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
              // Cashfree orders stay ACTIVE until their own expiry — that's
              // not a terminal state, so don't just relay it (it would only
              // ever normalize to 'pending' and the row would never resolve).
              // A stale, still-non-terminal order past our 20-min window is
              // treated as abandoned and explicitly cancelled.
              const effectiveStatus = CASHFREE_TERMINAL_STATUSES.has(cfOrder.order_status.toUpperCase())
                ? cfOrder.order_status
                : 'CANCELLED';

              const finResult = await finalizePayment({
                gateway: 'cashfree',
                orderId: don.cashfree_order_id,
                paymentId: cfOrder.cf_order_id,
                gatewayStatus: effectiveStatus,
                paymentMethod: 'Cashfree Payments',
              });

              if (finResult.success && finResult.status === 'paid' && finResult.shouldSendReceipt) {
                void sendPaymentReceipt({
                  type: 'donation',
                  record: finResult.record!,
                  paymentMethod: 'Cashfree Payments',
                }).catch(() => {});
              }
              if (effectiveStatus === 'CANCELLED') {
                results.cancelledAbandonedDonations++;
              } else {
                results.reconciledDonations++;
              }
            }
          } else if (don.razorpay_order_id && rzpKeyId && rzpSecretKey) {
            // Verify with Razorpay
            const rzpPayments = await verifyRazorpayOrder(
              don.razorpay_order_id,
              rzpKeyId,
              rzpSecretKey,
            );

            if (rzpPayments) {
              const paidPayment = rzpPayments.items?.find(
                (p) => p.status === 'captured' || p.status === 'authorized',
              );

              if (paidPayment) {
                const finResult = await finalizePayment({
                  gateway: 'razorpay',
                  orderId: don.razorpay_order_id,
                  paymentId: paidPayment.id,
                  gatewayStatus: 'SUCCESS',
                  paymentMethod: paidPayment.method ? `Razorpay (${paidPayment.method.toUpperCase()})` : 'Razorpay',
                });

                if (finResult.success && finResult.status === 'paid' && finResult.shouldSendReceipt) {
                  void sendPaymentReceipt({
                    type: 'donation',
                    record: finResult.record!,
                    paymentMethod: 'Razorpay',
                  }).catch(() => {});
                }
                results.reconciledDonations++;
              } else {
                // No captured payment and older than 20 mins -> mark cancelled
                await supabase
                  .from('cswo_donations')
                  .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', don.id);
                results.cancelledAbandonedDonations++;
              }
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

    // ── 3. Sweep Stale Monthly Contributions (> 20 mins old) ────────────────
    const { data: staleContributions, error: conErr } = await supabase
      .from('cswo_monthly_contributions')
      .select('*')
      .in('status', ['created', 'starting', 'pending'])
      .lt('created_at', twentyMinsAgo)
      .limit(50);

    if (conErr) {
      results.errors.push(`Error fetching stale contributions: ${conErr.message}`);
    }

    if (staleContributions && staleContributions.length > 0) {
      for (const con of staleContributions) {
        try {
          if (con.cashfree_order_id && appId && secretKey) {
            const cfOrder = await verifyCashfreeOrder(
              con.cashfree_order_id,
              appId,
              secretKey,
              apiEnv,
            );

            if (cfOrder && cfOrder.order_status) {
              const effectiveStatus = CASHFREE_TERMINAL_STATUSES.has(cfOrder.order_status.toUpperCase())
                ? cfOrder.order_status
                : 'CANCELLED';

              const finResult = await finalizePayment({
                gateway: 'cashfree',
                orderId: con.cashfree_order_id,
                paymentId: cfOrder.cf_order_id,
                gatewayStatus: effectiveStatus,
                paymentMethod: 'Cashfree Payments',
              });

              if (finResult.success && finResult.status === 'paid' && finResult.shouldSendReceipt) {
                void sendPaymentReceipt({
                  type: 'contribution',
                  record: finResult.record!,
                  linkedRecordIds: finResult.linkedRecordIds,
                  paymentMethod: 'Cashfree Payments',
                }).catch(() => {});
              }
              if (effectiveStatus === 'CANCELLED') {
                results.cancelledAbandonedContributions++;
              } else {
                results.reconciledContributions++;
              }
            }
          } else if (con.razorpay_order_id && rzpKeyId && rzpSecretKey) {
            const rzpPayments = await verifyRazorpayOrder(
              con.razorpay_order_id,
              rzpKeyId,
              rzpSecretKey,
            );

            if (rzpPayments) {
              const paidPayment = rzpPayments.items?.find(
                (p) => p.status === 'captured' || p.status === 'authorized',
              );

              if (paidPayment) {
                const finResult = await finalizePayment({
                  gateway: 'razorpay',
                  orderId: con.razorpay_order_id,
                  paymentId: paidPayment.id,
                  gatewayStatus: 'SUCCESS',
                  paymentMethod: paidPayment.method ? `Razorpay (${paidPayment.method.toUpperCase()})` : 'Razorpay',
                });

                if (finResult.success && finResult.status === 'paid' && finResult.shouldSendReceipt) {
                  void sendPaymentReceipt({
                    type: 'contribution',
                    record: finResult.record!,
                    linkedRecordIds: finResult.linkedRecordIds,
                    paymentMethod: 'Razorpay',
                  }).catch(() => {});
                }
                results.reconciledContributions++;
              } else {
                await supabase
                  .from('cswo_monthly_contributions')
                  .update({
                    status: 'cancelled',
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', con.id);
                results.cancelledAbandonedContributions++;
              }
            }
          } else if (!con.cashfree_order_id && !con.razorpay_order_id) {
            await supabase
              .from('cswo_monthly_contributions')
              .update({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
              })
              .eq('id', con.id);

            results.cancelledAbandonedContributions++;
          }
        } catch (itemErr) {
          const msg = itemErr instanceof Error ? itemErr.message : String(itemErr);
          results.errors.push(`Contribution ${con.id}: ${msg}`);
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
