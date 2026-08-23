/**
 * payments.ts — Unified Payment Router
 *
 * Single entry point for all payment flows. Routes to Cashfree or Razorpay
 * based on the `gateway` argument, keeping pages/components gateway-agnostic.
 */

import type { PaymentGateway } from '@/types';
import { startRazorpayPayment, type RazorpayResponse } from './razorpay';
import { startCashfreePayment, type CashfreeSuccessResponse } from './cashfree';

// ── Admin-controlled gateway mode ─────────────────────────────────────────────

const STORAGE_KEY = 'cswo_gateway_mode';

/**
 * Returns the admin-configured gateway mode.
 * Reads from localStorage (set by Admin panel) or falls back to 'both'.
 */
export type GatewayMode = 'both' | 'razorpay' | 'cashfree';

export function getGatewayMode(): GatewayMode {
  if (typeof window === 'undefined') return 'cashfree';
  const stored = localStorage.getItem(STORAGE_KEY) as GatewayMode | null;
  return stored ?? 'cashfree';
}

export function setGatewayMode(mode: GatewayMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent('cswo:gateway-mode-change', { detail: { mode } }));
}

// ── Unified payment args ───────────────────────────────────────────────────────

export interface UnifiedPaymentArgs {
  gateway: PaymentGateway;
  action: 'create_donation_order' | 'create_contribution_order';
  amount: number; // In Rupees
  purpose?: string;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  isAnonymous?: boolean;
  isRecurring?: boolean;
  /** Required for create_contribution_order — links the pre-created row(s) to the paying member */
  memberId?: string;
  year?: number;
  month?: number;
  months?: number[];
  description: string;
}


export type UnifiedPaymentResult =
  | { gateway: 'razorpay'; result: RazorpayResponse }
  | { gateway: 'cashfree'; result: CashfreeSuccessResponse };

/**
 * Routes to the correct gateway and returns a unified result.
 * Throws on failure (including user cancellation with message 'CANCELLED').
 */
export async function startPayment(args: UnifiedPaymentArgs): Promise<UnifiedPaymentResult> {
  if (args.gateway === 'cashfree') {
    const result = await startCashfreePayment({
      action: args.action,
      amount: args.amount,
      purpose: args.purpose,
      donorName: args.donorName,
      donorEmail: args.donorEmail,
      donorPhone: args.donorPhone,
      isAnonymous: args.isAnonymous,
      isRecurring: args.isRecurring,
      memberId: args.memberId,
      year: args.year,
      month: args.month,
      months: args.months,
      description: args.description,
    });

    return { gateway: 'cashfree', result };
  }

  // Default: Razorpay
  const result = await startRazorpayPayment({
    action: args.action,
    amount: args.amount,
    purpose: args.purpose,
    donorName: args.donorName,
    donorEmail: args.donorEmail,
    donorPhone: args.donorPhone,
    isAnonymous: args.isAnonymous,
    isRecurring: args.isRecurring,
    memberId: args.memberId,
    year: args.year,
    month: args.month,
    months: args.months,
    description: args.description,
  });

  return { gateway: 'razorpay', result };
}

// ── Gateway label helpers ──────────────────────────────────────────────────────

export function gatewayLabel(gateway: PaymentGateway | string | null | undefined): string {
  switch (gateway) {
    case 'cashfree':
      return 'Cashfree';
    case 'razorpay':
      return 'Razorpay';
    case 'offline':
      return 'Offline';
    default:
      return 'Online';
  }
}

export function gatewayBadgeColor(gateway: PaymentGateway | string | null | undefined): string {
  switch (gateway) {
    case 'cashfree':
      return '#1a73e8'; // Cashfree blue
    case 'razorpay':
      return '#c2410c'; // Razorpay orange
    default:
      return '#6b7280'; // Gray for offline / unknown
  }
}
