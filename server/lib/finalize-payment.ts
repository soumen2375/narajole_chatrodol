/**
 * server/lib/finalize-payment.ts
 *
 * Central payment finalizer — the single place that updates Supabase
 * when a payment completes, fails, is cancelled, or expires.
 *
 * Called by:
 *   - cashfree-webhook.ts  (server-initiated)
 *   - cashfree-verify.ts   (customer-initiated polling)
 *   - verify-payment.ts    (Razorpay signature verified)
 *
 * Guarantees:
 *   - Requires SUPABASE_SERVICE_ROLE_KEY for secure server-side execution.
 *   - Never downgrades a 'paid' record to failed/cancelled.
 *   - Generates collision-resistant receipt_number exactly once using UUID.
 *   - Sets receipt_email_status = 'pending' only when email hasn't been sent yet.
 *   - Returns shouldSendReceipt flag so callers can fire email.
 */

import { createClient } from '@supabase/supabase-js';
import { normalizePaymentStatus } from './payment-status';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// ── Supabase (service role — bypasses RLS for server-side writes) ──────────────

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

  if (!url) {
    throw new Error('SUPABASE_URL is not configured');
  }

  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for backend payment finalization');
  }

  return createClient(url, key);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Gateway = 'cashfree' | 'razorpay';

export interface FinalizePaymentInput {
  gateway: Gateway;
  /** The gateway order ID (cashfree_order_id or razorpay_order_id) */
  orderId: string;
  /** The gateway payment/transaction ID */
  paymentId?: string;
  /** Raw status string from the gateway */
  gatewayStatus?: string;
  /** Raw event type string from a webhook payload */
  eventType?: string;
  /** Human-readable payment method label */
  paymentMethod?: string;
}

export interface FinalizePaymentResult {
  success: boolean;
  alreadyProcessed?: boolean;
  type?: 'donation' | 'contribution';
  status?: string;
  record?: Record<string, unknown>;
  shouldSendReceipt?: boolean;
  paymentMethod?: string;
  error?: string;
  orderId?: string;
}

// ── Receipt number generators (collision-safe) ────────────────────────────────

function generateDonationReceipt(): string {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `CSWO-DON-${Date.now().toString().slice(-6)}-${rand}`;
}

function generateContributionReceipt(): string {
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `CSWO-MBR-${Date.now().toString().slice(-6)}-${rand}`;
}

// ── Main finalizer ────────────────────────────────────────────────────────────

export async function finalizePayment(
  input: FinalizePaymentInput,
): Promise<FinalizePaymentResult> {
  const { gateway, orderId, paymentId, gatewayStatus, eventType, paymentMethod } = input;

  const status = normalizePaymentStatus(gatewayStatus, eventType);

  const supabase = getSupabaseClient();

  // Column names vary by gateway
  const orderColumn =
    gateway === 'cashfree' ? 'cashfree_order_id' : 'razorpay_order_id';
  const paymentColumn =
    gateway === 'cashfree' ? 'cashfree_payment_id' : 'razorpay_payment_id';

  // ── 1. Try donations first ─────────────────────────────────────────────────

  const { data: donation, error: donFetchError } = await supabase
    .from('cswo_donations')
    .select('*')
    .eq(orderColumn, orderId)
    .maybeSingle();

  if (donFetchError) {
    console.error('[finalizePayment] Error fetching donation:', donFetchError);
  }

  if (donation) {
    // Never downgrade a paid record
    if (donation.status === 'paid') {
      return {
        success: true,
        alreadyProcessed: true,
        type: 'donation',
        status: 'paid',
        record: donation,
        shouldSendReceipt:
          donation.receipt_email_status !== 'sent' && !!donation.receipt_number,
        paymentMethod,
      };
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (paymentId) {
      updateData[paymentColumn] = paymentId;
    }

    if (status === 'paid') {
      updateData.receipt_number =
        donation.receipt_number || generateDonationReceipt();

      // Only set to 'pending' if the email has not been sent yet
      updateData.receipt_email_status =
        donation.receipt_email_status === 'sent' ? 'sent' : 'pending';
    }

    const { data: updated, error } = await supabase
      .from('cswo_donations')
      .update(updateData)
      .eq('id', donation.id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      type: 'donation',
      status,
      record: updated,
      shouldSendReceipt:
        status === 'paid' &&
        (updated as Record<string, unknown>).receipt_email_status !== 'sent',
      paymentMethod,
    };
  }

  // ── 2. Try monthly contributions ──────────────────────────────────────────

  const { data: contribution, error: conFetchError } = await supabase
    .from('cswo_monthly_contributions')
    .select('*, member:cswo_members(id, full_name, email, phone)')
    .eq(orderColumn, orderId)
    .maybeSingle();

  if (conFetchError) {
    console.error('[finalizePayment] Error fetching contribution:', conFetchError);
  }

  if (contribution) {
    // Extract member data for receipt payload
    const memberObj = contribution.member as { full_name?: string; email?: string; phone?: string } | null;
    const memberName = memberObj?.full_name || 'Member';
    const memberEmail = memberObj?.email || '';

    // Never downgrade a paid record
    if (contribution.status === 'paid') {
      return {
        success: true,
        alreadyProcessed: true,
        type: 'contribution',
        status: 'paid',
        record: {
          ...contribution,
          member_name: memberName,
          member_email: memberEmail,
        },
        shouldSendReceipt:
          contribution.receipt_email_status !== 'sent' &&
          !!contribution.receipt_number,
        paymentMethod,
      };
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (paymentId) {
      updateData[paymentColumn] = paymentId;
    }

    if (status === 'paid') {
      updateData.paid_at = contribution.paid_at || new Date().toISOString();
      updateData.payment_method = paymentMethod || (gateway === 'cashfree' ? 'cashfree' : 'razorpay');
      updateData.receipt_number =
        contribution.receipt_number || generateContributionReceipt();

      updateData.receipt_email_status =
        contribution.receipt_email_status === 'sent' ? 'sent' : 'pending';
    }

    const { data: updated, error } = await supabase
      .from('cswo_monthly_contributions')
      .update(updateData)
      .eq('id', contribution.id)
      .select('*, member:cswo_members(id, full_name, email, phone)')
      .single();

    if (error) throw error;

    const updatedMember = updated.member as { full_name?: string; email?: string } | null;

    return {
      success: true,
      type: 'contribution',
      status,
      record: {
        ...updated,
        member_name: updatedMember?.full_name || memberName,
        member_email: updatedMember?.email || memberEmail,
      },
      shouldSendReceipt:
        status === 'paid' &&
        (updated as Record<string, unknown>).receipt_email_status !== 'sent',
      paymentMethod,
    };
  }

  // ── Record not found ───────────────────────────────────────────────────────

  return {
    success: false,
    error: 'Payment record not found in donations or monthly contributions',
    orderId,
  };
}
