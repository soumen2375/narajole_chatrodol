/**
 * api/cashfree-webhook.ts
 *
 * Webhook handler for Cashfree PG events (e.g. PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK).
 * Automatically updates Supabase records and dispatches Resend email receipts.
 */

import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

function sendJson(res: ServerResponse, statusCode: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-webhook-signature, x-webhook-timestamp');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
    console.warn('[Webhook] Failed to send receipt email via API:', err);
  }
}
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-webhook-signature, x-webhook-timestamp');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const payload = await parseBody(req);
    const eventType = (payload.type as string) || (payload.event as string) || '';
    const eventData = (payload.data as Record<string, unknown>) || payload;

    const order = (eventData.order as Record<string, unknown>) || {};
    const payment = (eventData.payment as Record<string, unknown>) || {};
    const customer = (eventData.customer_details as Record<string, unknown>) || {};

    const orderId = (order.order_id as string) || (eventData.order_id as string) || '';
    const paymentStatus =
      (payment.payment_status as string) ||
      (eventData.payment_status as string) ||
      (order.order_status as string) ||
      '';
    const cfPaymentId =
      String(payment.cf_payment_id || eventData.cf_payment_id || orderId || '');
    const amount = Number(payment.payment_amount || order.order_amount || eventData.order_amount || 0);

    const customerEmail =
      (customer.customer_email as string) || (eventData.customer_email as string) || '';
    const customerName =
      (customer.customer_name as string) || (eventData.customer_name as string) || 'Valued Supporter';

    const isSuccess =
      eventType.toUpperCase().includes('SUCCESS') ||
      paymentStatus.toUpperCase() === 'SUCCESS' ||
      paymentStatus.toUpperCase() === 'PAID';

    console.log(`[Cashfree Webhook] Event: ${eventType}, Order: ${orderId}, Status: ${paymentStatus}, Success: ${isSuccess}`);

    if (isSuccess && orderId) {
      const sb = getSupabaseClient();
      if (sb) {
        // 1. Check cswo_donations
        try {
          const { data: donRec } = await sb
            .from('cswo_donations')
            .select('*')
            .eq('cashfree_order_id', orderId)
            .maybeSingle();

          if (donRec) {
            const receiptNum = donRec.receipt_number || `CSWO-DON-${Date.now().toString().slice(-8).toUpperCase()}`;
            await sb
              .from('cswo_donations')
              .update({
                status: 'paid',
                receipt_number: receiptNum,
                cashfree_payment_id: cfPaymentId || null,
              })
              .eq('id', donRec.id);

            const emailToUse = donRec.donor_email || customerEmail;
            if (emailToUse) {
              await sendEmailReceipt({
                recipientEmail: emailToUse,
                recipientName: donRec.donor_name || customerName,
                type: 'donation',
                amount: donRec.amount || amount,
                receiptNumber: receiptNum,
                purpose: donRec.purpose || 'Donation & Social Welfare',
                paymentMethod: 'Cashfree Payments',
                paymentId: cfPaymentId,
                date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
              });
            }
          }
        } catch (donErr) {
          console.warn('[Webhook] cswo_donations update failed:', donErr);
        }

        // 2. Check cswo_contributions
        try {
          const { data: contRec } = await sb
            .from('cswo_contributions')
            .select('*')
            .eq('cashfree_order_id', orderId)
            .maybeSingle();

          if (contRec) {
            const receiptNum = contRec.receipt_number || `CSWO-MBR-${Date.now().toString().slice(-8).toUpperCase()}`;
            await sb
              .from('cswo_contributions')
              .update({
                status: 'paid',
                receipt_number: receiptNum,
                cashfree_payment_id: cfPaymentId || null,
              })
              .eq('id', contRec.id);
          }
        } catch (contErr) {
          console.warn('[Webhook] cswo_contributions update failed:', contErr);
        }
      }
    }

    return sendJson(res, 200, {
      status: 'OK',
      received: true,
      order_id: orderId,
    });
  } catch (err: unknown) {
    console.error('[Cashfree Webhook Error]:', err);
    return sendJson(res, 200, { status: 'OK', error: 'Handled with fallback' });
  }
}
