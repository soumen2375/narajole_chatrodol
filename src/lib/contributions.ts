/**
 * src/lib/contributions.ts
 *
 * Shared helper for pre-creating cswo_monthly_contributions rows BEFORE a
 * gateway checkout opens, so the server-side finalize pipeline
 * (server/lib/finalize-payment.ts) can find them by cashfree_order_id /
 * razorpay_order_id once the payment completes, and so a receipt email can
 * actually be sent. Used by both src/lib/cashfree.ts and src/lib/razorpay.ts
 * — this mirrors the pattern already used for cswo_donations, which did not
 * have this gap.
 */

import { supabase } from './supabase';

export interface ContributionBatch {
  memberId: string;
  year: number;
  months: number[];
}

export interface PreCreateContributionArgs {
  memberId: string;
  year: number;
  months: number[];
  totalAmount: number;
  gateway: 'cashfree' | 'razorpay';
}

/**
 * Upserts one 'created' row per month being paid. Never touches a month
 * that's already 'paid'. Returns the batch descriptor to pass to
 * linkContributionOrderId(), or null if there was nothing left to charge.
 */
export async function preCreateContributionRows(
  args: PreCreateContributionArgs,
): Promise<ContributionBatch | null> {
  if (args.months.length === 0) return null;

  const perMonthAmount = args.totalAmount / args.months.length;

  let monthsToCreate = args.months;
  try {
    const { data: existing } = await supabase
      .from('cswo_monthly_contributions')
      .select('month, status')
      .eq('member_id', args.memberId)
      .eq('year', args.year)
      .in('month', args.months);

    const alreadyPaid = new Set(
      (existing || []).filter((r) => r.status === 'paid').map((r) => r.month),
    );
    monthsToCreate = args.months.filter((m) => !alreadyPaid.has(m));
  } catch {
    // If the pre-check fails, fall through and attempt the full batch —
    // the unique (member_id, year, month) constraint + upsert still protects
    // against duplicates, worst case is a benign no-op update below.
  }

  if (monthsToCreate.length === 0) return null;

  const rows = monthsToCreate.map((m) => ({
    member_id: args.memberId,
    year: args.year,
    month: m,
    amount: perMonthAmount,
    status: 'created' as const,
    payment_gateway: args.gateway,
  }));

  try {
    await supabase
      .from('cswo_monthly_contributions')
      .upsert(rows, { onConflict: 'member_id,year,month' });
  } catch {
    return null;
  }

  return { memberId: args.memberId, year: args.year, months: monthsToCreate };
}

/**
 * Attaches the gateway order id (or marks the batch failed/cancelled) on all
 * rows in the batch. Safe to call even if preCreateContributionRows()
 * returned null-equivalent for some months — it only ever touches rows still
 * in 'created' state via RLS, so an already-paid row can't be clobbered.
 */
export async function linkContributionOrderId(
  batch: ContributionBatch,
  gateway: 'cashfree' | 'razorpay',
  orderId: string | null,
  status: 'created' | 'failed' | 'cancelled',
): Promise<void> {
  const orderColumn = gateway === 'cashfree' ? 'cashfree_order_id' : 'razorpay_order_id';
  try {
    await supabase
      .from('cswo_monthly_contributions')
      .update({ [orderColumn]: orderId, status })
      .eq('member_id', batch.memberId)
      .eq('year', batch.year)
      .in('month', batch.months);
  } catch {
    // ignore — server-side reconciliation will still pick this up later
  }
}
