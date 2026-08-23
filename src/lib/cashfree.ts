import { supabase } from './supabase';
import { preCreateContributionRows, linkContributionOrderId, type ContributionBatch } from './contributions';

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
  receipt_number?: string | null;
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
  receipt_number?: string | null;
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

// ── Payment Verification with Fast Retries ───────────────────────────────────

const VERIFY_RETRY_DELAYS_MS = [1000, 2000, 3000, 4500, 6000]; // Fast 1s, 2s, 3s, 4.5s, 6s

/**
 * Verifies Cashfree order status server-to-server with automatic fast retries.
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

      // Explicitly failed/cancelled states — stop retrying
      if (
        lastResponse.order_status === 'EXPIRED' ||
        lastResponse.order_status === 'CANCELLED' ||
        lastResponse.order_status === 'FAILED' ||
        lastResponse.order_status === 'USER_DROPPED'
      ) {
        return lastResponse;
      }

      // ACTIVE / PENDING — retry after short delay
      if (attempt < VERIFY_RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, VERIFY_RETRY_DELAYS_MS[attempt]));
      }
    } catch (err) {
      if (attempt === VERIFY_RETRY_DELAYS_MS.length) throw err;
      await new Promise((resolve) => setTimeout(resolve, VERIFY_RETRY_DELAYS_MS[attempt]));
    }
  }

  return lastResponse ?? { success: false, message: 'Verification timed out. Please contact support.' };
}

// ── Mobile / in-app-webview aware redirect target ───────────────────────────────
//
// '_modal' renders Cashfree checkout in an iframe overlay. Launching a UPI
// intent (upi://...) for GPay/PhonePe from inside an iframe is blocked by
// many mobile browsers and by in-app webviews (Facebook/Instagram/WhatsApp
// share links), so the "Pay" tap silently does nothing there. '_self' does a
// full-page redirect to Cashfree's hosted checkout and back to
// order_meta.return_url (/payment-return), which works everywhere.

function getCashfreeRedirectTarget(): '_modal' | '_self' {
  if (typeof window === 'undefined') return '_modal';
  const ua = navigator.userAgent || '';
  const isSmallScreen = window.innerWidth < 768;
  const isInAppWebview = /FBAN|FBAV|Instagram|Line\/|WhatsApp|; wv\)|GSA\//i.test(ua);
  return isSmallScreen || isInAppWebview ? '_self' : '_modal';
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
    redirectTarget: getCashfreeRedirectTarget(),
  });

  if (result?.error) {
    const err = new Error(result.error.message || 'Unable to open Cashfree checkout');
    options.onFailure?.(err);
    throw err;
  }

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
  memberId?: string;
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
  let contributionBatch: ContributionBatch | null = null;

  if (args.action === 'create_donation_order') {
    // Generate the row's id client-side and insert without .select() — an
    // anonymous donor has no auth.uid(), so there is deliberately no SELECT
    // RLS policy for the anon role (that would leak every pending donor's
    // name/email/phone to any visitor). Requesting the row back via
    // .select() forces an implicit RETURNING, which needs SELECT visibility
    // and would fail RLS even though the INSERT itself is allowed.
    const generatedId = crypto.randomUUID();
    try {
      const { error } = await supabase.from('cswo_donations').insert({
        id: generatedId,
        donor_name: args.donorName ?? null,
        donor_email: args.donorEmail ?? null,
        donor_phone: args.donorPhone ?? null,
        amount: args.amount,
        purpose: args.purpose ?? null,
        is_anonymous: !!args.isAnonymous,
        is_recurring: !!args.isRecurring,
        status: 'created',
        payment_gateway: 'cashfree',
      });
      if (!error) {
        donationRecordId = generatedId;
      } else {
        console.error('[cashfree] Failed to pre-create donation record:', error);
      }
    } catch (err) {
      console.error('[cashfree] Failed to pre-create donation record:', err);
    }
  }

  if (args.action === 'create_contribution_order' && args.memberId && args.year) {
    contributionBatch = await preCreateContributionRows({
      memberId: args.memberId,
      year: args.year,
      months: args.months && args.months.length > 0 ? args.months : (args.month ? [args.month] : []),
      totalAmount: args.amount,
      gateway: 'cashfree',
    });
  }

  const receipt = donationRecordId
    ? `don_cf_${donationRecordId}`.slice(0, 40)
    : contributionBatch
      ? `con_cf_${contributionBatch.memberId}_${Date.now()}`.slice(0, 40)
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
    if (donationRecordId) {
      try {
        await supabase
          .from('cswo_donations')
          .update({ status: 'failed' })
          .eq('id', donationRecordId);
      } catch { /* ignore */ }
    }
    if (contributionBatch) {
      await linkContributionOrderId(contributionBatch, 'cashfree', null, 'failed');
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

  if (contributionBatch) {
    await linkContributionOrderId(contributionBatch, 'cashfree', orderData.order_id, 'created');
  }

  const mode =
    (import.meta.env.VITE_CASHFREE_MODE as 'sandbox' | 'production' | undefined) || 'production';

  const cashfree = window.Cashfree({ mode });

  // ── Max polling constants ──────────────────────────────────────────────────
  const MAX_VERIFY_ATTEMPTS = 10;
  const VERIFY_POLL_MS = 3000;

  // ── Open the Cashfree checkout (modal on desktop, full-page on mobile/webviews) ──
  const checkoutResult = await cashfree.checkout({
    paymentSessionId: orderData.payment_session_id,
    redirectTarget: getCashfreeRedirectTarget(),
  });

  // ── Handle modal close / error ────────────────────────────────────────────
  // (On '_self' redirects this never returns — the browser has navigated away
  // to Cashfree's hosted page and back to /payment-return on completion.)
  if (checkoutResult?.error) {
    const errorCode = checkoutResult.error.code?.toUpperCase() || '';
    const errorMsg = checkoutResult.error.message || '';
    const isCancelled =
      errorCode.includes('CANCEL') ||
      errorCode.includes('DROP') ||
      errorCode.includes('DISMISS') ||
      errorMsg.toLowerCase().includes('cancel') ||
      errorMsg.toLowerCase().includes('dismiss') ||
      errorMsg.toLowerCase().includes('closed');

    if (donationRecordId) {
      try {
        await supabase
          .from('cswo_donations')
          .update({ status: isCancelled ? 'cancelled' : 'failed' })
          .eq('id', donationRecordId);
      } catch { /* ignore */ }
    }
    if (contributionBatch) {
      await linkContributionOrderId(
        contributionBatch,
        'cashfree',
        orderData.order_id,
        isCancelled ? 'cancelled' : 'failed',
      );
    }

    throw new Error(isCancelled ? 'CANCELLED' : errorMsg || 'Payment failed');
  }

  // ── Poll server to confirm payment (capped at MAX_VERIFY_ATTEMPTS) ────────
  let lastVerification: CashfreeVerifyResponse | null = null;

  for (let attempt = 0; attempt < MAX_VERIFY_ATTEMPTS; attempt++) {
    try {
      const verifyRes = await fetch('/api/cashfree-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderData.order_id }),
      });

      const verifyData = (await verifyRes.json()) as CashfreeVerifyResponse & {
        status?: string;
        receipt_number?: string | null;
      };

      lastVerification = verifyData;

      const resolvedStatus =
        (verifyData as { status?: string }).status ||
        (verifyData.success ? 'paid' : (verifyData.order_status || '').toLowerCase());

      // Payment confirmed
      if (resolvedStatus === 'paid' || verifyData.success || verifyData.order_status === 'PAID') {
        return {
          order: {
            orderId: orderData.order_id,
            orderAmount: args.amount,
            orderCurrency: 'INR',
          },
          payment: {
            paymentId: verifyData.order_id || orderData.order_id,
            paymentStatus: 'SUCCESS',
            paymentAmount: args.amount,
          },
          receipt_number: verifyData.receipt_number || null,
        };
      }

      // Terminal failure states — stop polling immediately
      if (
        resolvedStatus === 'failed' ||
        resolvedStatus === 'cancelled' ||
        resolvedStatus === 'expired' ||
        verifyData.order_status === 'FAILED' ||
        verifyData.order_status === 'CANCELLED' ||
        verifyData.order_status === 'USER_DROPPED' ||
        verifyData.order_status === 'EXPIRED'
      ) {
        const isCancelled =
          resolvedStatus === 'cancelled' ||
          resolvedStatus === 'expired' ||
          verifyData.order_status === 'CANCELLED' ||
          verifyData.order_status === 'EXPIRED' ||
          verifyData.order_status === 'USER_DROPPED';
        throw new Error(isCancelled ? 'CANCELLED' : 'PAYMENT_FAILED');
      }

      // Still pending — wait before next attempt
      if (attempt < MAX_VERIFY_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, VERIFY_POLL_MS));
      }
    } catch (pollErr) {
      if (pollErr instanceof Error && (pollErr.message === 'CANCELLED' || pollErr.message === 'PAYMENT_FAILED')) {
        throw pollErr;
      }
      // Network error — retry
      if (attempt < MAX_VERIFY_ATTEMPTS - 1) {
        await new Promise((resolve) => setTimeout(resolve, VERIFY_POLL_MS));
      }
    }
  }

  // All attempts exhausted — payment still pending
  throw new Error(
    lastVerification?.message || 'Payment verification timed out. Please check your payment status.'
  );
}
