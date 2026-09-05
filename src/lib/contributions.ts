/**
 * src/lib/contributions.ts
 *
 * Shared helper for pre-creating cswo_monthly_contributions rows BEFORE a
 * gateway checkout opens, so the server-side finalize pipeline
 * (api/_lib/finalize-payment.ts) can find them by cashfree_order_id /
 * razorpay_order_id once the payment completes, and so a receipt email can
 * actually be sent. Used by both src/lib/cashfree.ts and src/lib/razorpay.ts
 * — this mirrors the pattern already used for cswo_donations, which did not
 * have this gap.
 */

import { supabase } from './supabase';

/**
 * Builds the gateway receipt/order-id prefix for a donation.
 *
 * Cashfree caps order_id at 50 chars, and api/cashfree-order.ts appends
 * `_${Date.now()}` (14 more chars). The old `don_cf_<uuid>` form was 43
 * chars and got sliced to 40, lopping the last 3 characters off the UUID —
 * so the order id no longer contained a recoverable donation id. Stripping
 * the dashes fits the whole UUID with room to spare (2 + 32 + 1 + 13 = 48),
 * which lets the server recover the donation from the order id alone if the
 * client-side link write is ever lost. Keep in sync with
 * parseDonationIdFromOrderId() in api/_lib/finalize-payment.ts.
 */
export function donationReceiptTag(donationId: string): string {
  return `d_${donationId.replace(/-/g, '')}`;
}

/**
 * Attaches the gateway order id to a donation row, and/or moves it to a
 * terminal client-observable state (failed/cancelled).
 *
 * Goes through the cswo_update_donation_gateway_link RPC rather than a plain
 * table .update(): PostgREST needs a SELECT policy to compute the
 * affected-row count for any PATCH, and anonymous donors deliberately have
 * no SELECT policy (it would expose every pending donor's contact details).
 * A raw update therefore silently no-ops for exactly the users who matter.
 * The RPC is SECURITY DEFINER but far narrower than table UPDATE — it can
 * only touch the order-id/status columns and can never set 'paid'.
 */
export async function updateDonationGatewayLink(
  donationId: string,
  orderId: string | null,
  status: 'created' | 'failed' | 'cancelled',
  gateway: 'cashfree' | 'razorpay' = 'cashfree',
): Promise<void> {
  const { error } = await supabase.rpc('cswo_update_donation_gateway_link', {
    p_donation_id: donationId,
    p_gateway: gateway,
    p_order_id: orderId,
    p_status: status,
  });
  if (error) {
    console.error('[payment] Failed to link donation to gateway order:', error);
  }
}

/**
 * Builds the gateway receipt/order-id prefix for a monthly-dues batch.
 *
 * Same reasoning as donationReceiptTag(): api/cashfree-order.ts appends
 * `_${Date.now()}` and caps the result at 50 chars, so the old
 * `con_cf_<uuid>` form (43 chars) was sliced to 40 and lost the tail of the
 * member's UUID — leaving an order id nothing could be matched back to.
 * Stripping the dashes fits the whole UUID (2 + 32 + 1 + 13 = 48), so the
 * server can recover the payer from the order id alone if the link write is
 * ever lost. Keep in sync with parseMemberIdFromOrderId() in
 * api/_lib/finalize-payment.ts.
 */
export function contributionReceiptTag(memberId: string): string {
  return `c_${memberId.replace(/-/g, '')}`;
}

export interface ContributionBatch {
  memberId: string;
  year: number;
  months: number[];
}

export interface StageContributionArgs {
  memberId: string;
  year: number;
  months: number[];
  totalAmount: number;
  gateway: 'cashfree' | 'razorpay';
  /** Attach the gateway order id in the same write, once it exists. */
  orderId?: string | null;
  status?: 'created' | 'failed' | 'cancelled';
}

/**
 * Creates (or restages) one row per month being paid and, when an order id is
 * supplied, attaches it in the same statement.
 *
 * Goes through the cswo_stage_contribution_batch RPC rather than a client
 * upsert. The upsert could not work: a due month normally already has a row in
 * the 'unpaid' state, and the member UPDATE policy's USING clause matched only
 * created/failed/cancelled, so the write was rejected for exactly the months
 * members actually pay. Nothing then carried the order id, and finalizePayment()
 * had no record to mark paid — the gateway collected the money and Monthly
 * still showed the month as due. The RPC is SECURITY DEFINER but strictly
 * narrower than table UPDATE: it only touches its own member's rows, refuses
 * any status other than created/failed/cancelled, and skips months already paid.
 *
 * Throws on failure. Callers must let that propagate rather than opening a
 * checkout there would be no row to reconcile against.
 */
export async function stageContributionBatch(
  args: StageContributionArgs,
): Promise<ContributionBatch | null> {
  if (args.months.length === 0) return null;

  const { data, error } = await supabase.rpc('cswo_stage_contribution_batch', {
    p_member_id: args.memberId,
    p_year: args.year,
    p_months: args.months,
    p_amount: args.totalAmount / args.months.length,
    p_gateway: args.gateway,
    p_order_id: args.orderId ?? null,
    p_status: args.status ?? 'created',
  });

  if (error) {
    console.error('[payment] Failed to stage contribution batch:', error);
    throw new Error(
      'Could not prepare your monthly dues for payment. Please try again, or contact the treasurer if this keeps happening.',
    );
  }

  const months = (data as number[] | null) ?? [];
  if (months.length === 0) return null;

  return { memberId: args.memberId, year: args.year, months };
}

/**
 * Attaches the gateway order id, or moves the batch to failed/cancelled.
 *
 * Best-effort by design: it runs on paths where the payment is already over
 * (checkout dismissed, order creation threw), so a failure here must not mask
 * the original error. The webhook and the reconciler still settle the row.
 */
export async function linkContributionOrderId(
  batch: ContributionBatch,
  gateway: 'cashfree' | 'razorpay',
  orderId: string | null,
  status: 'created' | 'failed' | 'cancelled',
  perMonthAmount: number,
): Promise<void> {
  const { error } = await supabase.rpc('cswo_stage_contribution_batch', {
    p_member_id: batch.memberId,
    p_year: batch.year,
    p_months: batch.months,
    p_amount: perMonthAmount,
    p_gateway: gateway,
    p_order_id: orderId,
    p_status: status,
  });
  if (error) {
    console.error('[payment] Failed to link contribution batch to gateway order:', error);
  }
}

/**
 * Re-asks the server about dues rows that carry a gateway order id but never
 * reached a terminal state.
 *
 * A member whose browser closed, lost signal, or timed out mid-checkout leaves
 * a row sitting at `created` while the gateway holds a real payment. Nothing
 * used to revisit those except a once-a-day reconcile cron, so the month showed
 * "processing" indefinitely. Verify is idempotent and service-role, so calling
 * it again is safe: an already-settled order simply comes back `paid`.
 *
 * Cashfree only — a Razorpay order needs the signature the checkout handler
 * returns, which is gone once that page is closed.
 *
 * @returns how many orders came back settled, so the caller can refresh.
 */
export async function settleStrandedContributionOrders(
  rows: Array<{ status?: string | null; cashfree_order_id?: string | null }>,
): Promise<number> {
  const orderIds = [
    ...new Set(
      rows
        .filter((r) => r.cashfree_order_id && (r.status === 'created' || r.status === 'pending'))
        .map((r) => r.cashfree_order_id as string),
    ),
  ];
  if (orderIds.length === 0) return 0;

  const results = await Promise.all(
    orderIds.map(async (orderId) => {
      try {
        const res = await fetch('/api/cashfree-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { status?: string };
        return data.status === 'paid';
      } catch {
        return false;
      }
    }),
  );

  return results.filter(Boolean).length;
}
