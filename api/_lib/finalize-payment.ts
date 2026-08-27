/**
 * api/_lib/finalize-payment.ts
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
import { normalizePaymentStatus } from './payment-status.js';
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
  /** For a bulk "Pay All" contribution batch: sibling row ids sharing this
   *  receipt, beyond record.id, that also need marking 'sent'. */
  linkedRecordIds?: string[];
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

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Recovers the donation id embedded in a gateway order id.
 *
 * Order ids are built client-side as `d_<uuid-without-dashes>_<timestamp>`
 * (see donationReceiptTag() in src/lib/contributions.ts). Because the full
 * UUID is carried in the order id itself, a payment can still be matched to
 * its donation even if the client-side "attach the order id" write never
 * landed — which is exactly the failure that left real paid donations
 * stranded as 'created'. Returns null when the order id predates this
 * scheme or isn't a donation order.
 */
function parseDonationIdFromOrderId(orderId: string): string | null {
  const match = /^d_([0-9a-f]{32})(?:_|$)/i.exec(orderId);
  if (!match) return null;
  const hex = match[1].toLowerCase();
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
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

  let { data: donation, error: donFetchError } = await supabase
    .from('cswo_donations')
    .select('*')
    .eq(orderColumn, orderId)
    .maybeSingle();

  if (donFetchError) {
    console.error('[finalizePayment] Error fetching donation:', donFetchError);
  }

  // Fallback: the order id itself carries the donation's UUID, so a payment
  // can still be matched even if the client never managed to write the
  // order id onto the row. Also backfills the link so later lookups hit
  // the fast path.
  if (!donation) {
    const embeddedId = parseDonationIdFromOrderId(orderId);
    if (embeddedId) {
      const { data: byId } = await supabase
        .from('cswo_donations')
        .select('*')
        .eq('id', embeddedId)
        .maybeSingle();

      if (byId) {
        console.warn(
          `[finalizePayment] Donation ${embeddedId} was not linked to order ${orderId}; recovered via embedded id and backfilling.`,
        );
        const { data: relinked } = await supabase
          .from('cswo_donations')
          .update({ [orderColumn]: orderId })
          .eq('id', embeddedId)
          .select()
          .single();

        donation = relinked || byId;
      }
    }
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
  // A single gateway order can cover multiple months at once ("Pay All"), so
  // several rows may share the same order id — fetch all of them, not just one.

  const { data: contributions, error: conFetchError } = await supabase
    .from('cswo_monthly_contributions')
    .select('*, member:cswo_members(id, full_name, email, phone)')
    .eq(orderColumn, orderId);

  if (conFetchError) {
    console.error('[finalizePayment] Error fetching contribution:', conFetchError);
  }

  if (contributions && contributions.length > 0) {
    const first = contributions[0];
    const memberObj = first.member as { full_name?: string; email?: string; phone?: string } | null;
    const memberName = memberObj?.full_name || 'Member';
    const memberEmail = memberObj?.email || '';

    const monthsLabel = contributions
      .map((c) => `${MONTH_NAMES[(c.month as number) - 1] || c.month}/${c.year}`)
      .join(', ');
    const totalAmount = contributions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    // Never downgrade already-paid rows; only act on the ones still pending.
    const unpaid = contributions.filter((c) => c.status !== 'paid');

    if (unpaid.length === 0) {
      return {
        success: true,
        alreadyProcessed: true,
        type: 'contribution',
        status: 'paid',
        record: {
          ...first,
          member_name: memberName,
          member_email: memberEmail,
          amount: totalAmount,
          purpose: `Monthly Dues — ${monthsLabel}`,
        },
        shouldSendReceipt:
          first.receipt_email_status !== 'sent' && !!first.receipt_number,
        paymentMethod,
      };
    }

    const sharedReceiptNumber =
      contributions.find((c) => c.receipt_number)?.receipt_number ||
      generateContributionReceipt();

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (paymentId) {
      updateData[paymentColumn] = paymentId;
    }

    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString();
      updateData.payment_method = paymentMethod || (gateway === 'cashfree' ? 'cashfree' : 'razorpay');
      updateData.receipt_number = sharedReceiptNumber;
      updateData.receipt_email_status = 'pending';
    }

    const { data: updatedRows, error } = await supabase
      .from('cswo_monthly_contributions')
      .update(updateData)
      .in('id', unpaid.map((c) => c.id))
      .select('*, member:cswo_members(id, full_name, email, phone)');

    if (error) throw error;

    const updatedFirst = (updatedRows && updatedRows[0]) || first;
    const updatedMember = updatedFirst.member as { full_name?: string; email?: string } | null;

    return {
      success: true,
      type: 'contribution',
      status,
      record: {
        ...updatedFirst,
        member_name: updatedMember?.full_name || memberName,
        member_email: updatedMember?.email || memberEmail,
        amount: totalAmount,
        purpose: `Monthly Dues — ${monthsLabel}`,
        receipt_number: sharedReceiptNumber,
        receipt_email_status: status === 'paid' ? 'pending' : updatedFirst.receipt_email_status,
      },
      linkedRecordIds: unpaid.slice(1).map((c) => c.id as string),
      shouldSendReceipt: status === 'paid',
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
