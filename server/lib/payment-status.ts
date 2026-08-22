/**
 * server/lib/payment-status.ts
 *
 * Single source of truth for internal payment status values.
 * All gateways (Cashfree, Razorpay) normalize through `normalizePaymentStatus`.
 */

export type PaymentStatus =
  | 'starting'
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired';

/**
 * Maps raw gateway status strings (order_status, payment_status, event type)
 * into our internal PaymentStatus type.
 *
 * Rules (evaluated in order):
 *   SUCCESS / PAID / event includes SUCCESS → paid
 *   FAILED / event includes FAILED          → failed
 *   CANCELLED / USER_DROPPED / event CANCEL → cancelled
 *   EXPIRED / event includes EXPIRED        → expired
 *   anything else                           → pending
 */
export function normalizePaymentStatus(
  gatewayStatus?: string,
  eventType?: string,
): PaymentStatus {
  const status = String(gatewayStatus || '').toUpperCase().trim();
  const event = String(eventType || '').toUpperCase().trim();

  if (
    status === 'SUCCESS' ||
    status === 'PAID' ||
    event.includes('SUCCESS')
  ) {
    return 'paid';
  }

  if (
    status === 'FAILED' ||
    event.includes('FAILED')
  ) {
    return 'failed';
  }

  if (
    status === 'CANCELLED' ||
    status === 'USER_DROPPED' ||
    event.includes('CANCEL')
  ) {
    return 'cancelled';
  }

  if (
    status === 'EXPIRED' ||
    event.includes('EXPIRED')
  ) {
    return 'expired';
  }

  return 'pending';
}
