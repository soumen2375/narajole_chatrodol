import { supabase } from './supabase';

// ── Cashfree SDK v3 type declarations ─────────────────────────────────────────

declare global {
  interface Window {
    // Cashfree JS SDK v3 is loaded as `window.Cashfree`
    Cashfree?: (config: { mode: 'sandbox' | 'production' }) => CashfreeInstance;
  }
}

export interface CashfreeCheckoutResult {
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
  redirect?: boolean;
  paymentDetails?: {
    paymentMessage?: string;
  };
}

export interface CashfreeInstance {
  checkout: (options: CashfreeCheckoutOptions) => Promise<CashfreeCheckoutResult>;
}

export interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget?: '_modal' | '_self' | '_blank' | '_top';
}

export interface CashfreeSuccessResponse {
  order: {
    orderId: string;
    orderAmount: number;
    orderCurrency: string;
  };
  payment: {
    paymentId: string;
    paymentStatus: string;
    paymentAmount: number;
  };
}

export interface CashfreeOrderResponse {
  order_id: string;
  payment_session_id: string;
  order_status: string;
  order_amount: number;
  order_currency: string;
  error?: string;
}

export interface CashfreeVerifyResponse {
  success: boolean;
  message?: string;
  error?: string;
  order_id?: string;
  order_status?: string;
  order_amount?: number;
  order_currency?: string;
}

// ── SDK Loader ─────────────────────────────────────────────────────────────────

const CF_SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';

let cfScriptPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads the Cashfree JS SDK v3 script.
 */
export function loadCashfreeScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Cashfree) return Promise.resolve(true);
  if (cfScriptPromise) return cfScriptPromise;

  cfScriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector(`script[src="${CF_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => {
        cfScriptPromise = null;
        resolve(false);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = CF_SDK_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      cfScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return cfScriptPromise;
}

// ── Order Creation ─────────────────────────────────────────────────────────────

/**
 * Calls the backend API endpoint to create a Cashfree order.
 */
export async function createCashfreeOrder(
  amountInRupees: number,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  orderNote?: string,
  receipt?: string,
): Promise<CashfreeOrderResponse> {
  if (amountInRupees < 1) {
    throw new Error('Minimum order amount is ₹1.00');
  }

  const response = await fetch('/api/cashfree-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: amountInRupees,
      currency: 'INR',
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      order_note: orderNote || 'Donation / Contribution',
      receipt: receipt || `cswo_cf_${Date.now()}`,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Failed to create Cashfree order (${response.status})`);
  }

  return data as CashfreeOrderResponse;
}

// ── Payment Verification with Retry ──────────────────────────────────────────

const VERIFY_RETRY_DELAYS_MS = [3000, 6000, 10000]; // 3s, 6s, 10s retries

/**
 * Verifies Cashfree order status server-to-server with automatic retries.
 * Cashfree order status can be ACTIVE for a few seconds after payment before
 * switching to PAID — retries handle this race condition.
 */
export async function verifyCashfreePayment(orderId: string): Promise<CashfreeVerifyResponse> {
  let lastResponse: CashfreeVerifyResponse | null = null;

  for (let attempt = 0; attempt <= VERIFY_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await fetch('/api/cashfree-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify Cashfree payment');
      }

      lastResponse = data as CashfreeVerifyResponse;

      // Payment confirmed — return immediately
      if (lastResponse.success || lastResponse.order_status === 'PAID') {
        return { ...lastResponse, success: true };
      }

      // Explicitly failed states — no point retrying
      if (
        lastResponse.order_status === 'EXPIRED' ||
        lastResponse.order_status === 'CANCELLED' ||
        lastResponse.order_status === 'FAILED'
      ) {
        return lastResponse;
      }

      // ACTIVE / PENDING — retry after delay if we have retries left
      if (attempt < VERIFY_RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, VERIFY_RETRY_DELAYS_MS[attempt]));
      }
    } catch (err) {
      if (attempt === VERIFY_RETRY_DELAYS_MS.length) throw err;
      await new Promise((resolve) => setTimeout(resolve, VERIFY_RETRY_DELAYS_MS[attempt]));
    }
  }

  // All retries exhausted — return last known response
  return lastResponse ?? { success: false, message: 'Verification timed out. Please contact support.' };
}

// ── Checkout Launcher ──────────────────────────────────────────────────────────

export interface OpenCashfreeCheckoutOptions {
  amountInRupees: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
  onSuccess?: (data: CashfreeVerifyResponse) => void;
  onFailure?: (error: Error) => void;
}

/**
 * Full Cashfree checkout flow using SDK v3 Promises & Backend Verification.
 */
export async function openCashfreeCheckout(
  options: OpenCashfreeCheckoutOptions,
): Promise<CashfreeVerifyResponse> {
  const loaded = await loadCashfreeScript();
  if (!loaded || !window.Cashfree) {
    throw new Error('CASHFREE_LOAD_FAILED');
  }

  const orderData = await createCashfreeOrder(
    options.amountInRupees,
    options.customerName,
    options.customerEmail,
    options.customerPhone,
    options.description,
  );

  const mode =
    (import.meta.env.VITE_CASHFREE_MODE as 'sandbox' | 'production' | undefined) || 'production';

  const cashfree = window.Cashfree({ mode });

  const result = await cashfree.checkout({
    paymentSessionId: orderData.payment_session_id,
    redirectTarget: '_modal',
  });

  if (result?.error) {
    const err = new Error(result.error.message || 'Unable to open Cashfree checkout');
    options.onFailure?.(err);
    throw err;
  }

  // Server-side verification with retry for ACTIVE → PAID race condition
  const verification = await verifyCashfreePayment(orderData.order_id);
  if (!verification.success) {
    const err = new Error(verification.message || 'Payment not completed or failed.');
    options.onFailure?.(err);
    throw err;
  }

  options.onSuccess?.(verification);
  return verification;
}

// ── Application-level startCashfreePayment ────────────────────────────────────

interface StartCashfreePaymentArgs {
  action: 'create_donation_order' | 'create_contribution_order';
  amount: number; // In Rupees
  purpose?: string;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  isAnonymous?: boolean;
  isRecurring?: boolean;
  year?: number;
  month?: number;
  months?: number[];
  description: string;
}

export async function startCashfreePayment(
  args: StartCashfreePaymentArgs,
): Promise<CashfreeSuccessResponse> {
  const loaded = await loadCashfreeScript();
  if (!loaded || !window.Cashfree) {
    throw new Error('PAYMENT_FAILED');
  }

  let donationRecordId: string | null = null;

  if (args.action === 'create_donation_order') {
    try {
      const { data: rec } = await supabase
        .from('cswo_donations')
        .insert({
          donor_name: args.donorName ?? null,
          donor_email: args.donorEmail ?? null,
          donor_phone: args.donorPhone ?? null,
          amount: args.amount,
          purpose: args.purpose ?? null,
          is_anonymous: !!args.isAnonymous,
          is_recurring: !!args.isRecurring,
          status: 'created',
          payment_gateway: 'cashfree',
        })
        .select('id')
        .single();
      if (rec?.id) donationRecordId = rec.id;
    } catch {
      // Continue even if Supabase is temporarily offline
    }
  }

  const receipt = donationRecordId
    ? `don_cf_${donationRecordId}`.slice(0, 40)
    : `cswo_cf_${Date.now()}`;

  let orderData: CashfreeOrderResponse;
  try {
    orderData = await createCashfreeOrder(
      args.amount,
      args.donorName || 'Anonymous',
      args.donorEmail || 'noreply@cswo.in',
      args.donorPhone || '9999999999',
      args.description,
      receipt,
    );
  } catch (orderErr) {
    // Order creation failed — mark DB record as failed
    if (donationRecordId) {
      try {
        await supabase
          .from('cswo_donations')
          .update({ status: 'failed' })
          .eq('id', donationRecordId);
      } catch { /* ignore */ }
    }
    throw orderErr;
  }

  if (donationRecordId) {
    try {
      await supabase
        .from('cswo_donations')
        .update({ cashfree_order_id: orderData.order_id })
        .eq('id', donationRecordId);
    } catch {
      // ignore
    }
  }

  const mode =
    (import.meta.env.VITE_CASHFREE_MODE as 'sandbox' | 'production' | undefined) || 'production';

  const cashfree = window.Cashfree({ mode });

  let checkoutResult: CashfreeCheckoutResult;
  try {
    checkoutResult = await cashfree.checkout({
      paymentSessionId: orderData.payment_session_id,
      redirectTarget: '_modal',
    });
  } catch {
    // Checkout threw (e.g. network error) — mark as failed
    if (donationRecordId) {
      try {
        await supabase
          .from('cswo_donations')
          .update({ status: 'failed' })
          .eq('id', donationRecordId);
      } catch { /* ignore */ }
    }
    throw new Error('Payment checkout encountered an error. Please try again.');
  }

  // ── Handle explicit error / cancellation from checkout ──────────────────────
  if (checkoutResult?.error) {
    const errorCode = checkoutResult.error.code?.toUpperCase() || '';
    const errorMsg = checkoutResult.error.message || '';

    // Detect user cancellation: Cashfree returns code like 'payment_cancelled', 'user_drop' etc.
    const isCancelled =
      errorCode.includes('CANCEL') ||
      errorCode.includes('DROP') ||
      errorCode.includes('DISMISS') ||
      errorMsg.toLowerCase().includes('cancel') ||
      errorMsg.toLowerCase().includes('dismiss') ||
      errorMsg.toLowerCase().includes('closed');

    const newStatus = isCancelled ? 'cancelled' : 'failed';

    if (donationRecordId) {
      try {
        await supabase
          .from('cswo_donations')
          .update({ status: newStatus })
          .eq('id', donationRecordId);
      } catch { /* ignore */ }
    }

    throw new Error(isCancelled ? 'CANCELLED' : (errorMsg || 'Payment was cancelled or failed.'));
  }

  // ── Server-side verification with retry (ACTIVE → PAID race condition fix) ──
  const verification = await verifyCashfreePayment(orderData.order_id);

  if (donationRecordId) {
    try {
      // Map Cashfree order_status to our internal status
      let finalStatus = 'failed';
      if (verification.success || verification.order_status === 'PAID') {
        finalStatus = 'paid';
      } else if (
        verification.order_status === 'CANCELLED' ||
        verification.order_status === 'EXPIRED'
      ) {
        finalStatus = 'cancelled';
      }

      await supabase
        .from('cswo_donations')
        .update({ status: finalStatus })
        .eq('id', donationRecordId);
    } catch {
      // ignore
    }
  }

  if (!verification.success) {
    const status = verification.order_status;
    const isCancelled = status === 'CANCELLED' || status === 'EXPIRED';
    throw new Error(
      isCancelled ? 'CANCELLED' : (verification.message || 'Payment was not completed.')
    );
  }

  return {
    order: {
      orderId: orderData.order_id,
      orderAmount: args.amount,
      orderCurrency: 'INR',
    },
    payment: {
      paymentId: verification.order_id || orderData.order_id,
      paymentStatus: 'SUCCESS',
      paymentAmount: args.amount,
    },
  };
}
