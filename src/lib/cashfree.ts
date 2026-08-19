import { supabase } from './supabase';

// ── Cashfree SDK v3 type declarations ─────────────────────────────────────────

declare global {
  interface Window {
    // Cashfree JS SDK v3 is loaded as `window.Cashfree`
    Cashfree?: (config: { mode: 'sandbox' | 'production' }) => CashfreeInstance;
  }
}

export interface CashfreeInstance {
  checkout: (options: CashfreeCheckoutOptions) => void;
}

export interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget?: '_modal' | '_self' | '_blank';
  onSuccess?: (data: CashfreeSuccessResponse) => void;
  onFailure?: (data: CashfreeFailureResponse) => void;
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

export interface CashfreeFailureResponse {
  order: {
    orderId: string;
    orderAmount: number;
    orderCurrency: string;
    orderStatus: string;
  };
  payment: {
    paymentMessage: string;
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
  payment_id?: string;
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
 * Calls the backend edge function to create a Cashfree order.
 * Returns order_id and payment_session_id needed for checkout.
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

// ── Checkout Launcher ──────────────────────────────────────────────────────────

export interface OpenCashfreeCheckoutOptions {
  amountInRupees: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
  onSuccess?: (data: CashfreeSuccessResponse) => void;
  onFailure?: (data: CashfreeFailureResponse) => void;
  onDismiss?: () => void;
}

/**
 * Full Cashfree checkout flow:
 * 1. Loads SDK
 * 2. Creates order via backend
 * 3. Opens Cashfree drop-in checkout modal
 */
export async function openCashfreeCheckout(
  options: OpenCashfreeCheckoutOptions,
): Promise<CashfreeSuccessResponse> {
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

  return new Promise<CashfreeSuccessResponse>((resolve, reject) => {
    cashfree.checkout({
      paymentSessionId: orderData.payment_session_id,
      redirectTarget: '_modal',
      onSuccess: (data) => {
        options.onSuccess?.(data);
        resolve(data);
      },
      onFailure: (data) => {
        const failMsg = data.payment?.paymentMessage || 'Payment Failed';
        const err = new Error(failMsg);
        options.onFailure?.(data);
        reject(err);
      },
    });
  });
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

  // Optionally insert a pending record in Supabase for audit trail
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

  const orderData = await createCashfreeOrder(
    args.amount,
    args.donorName || 'Anonymous',
    args.donorEmail || 'noreply@cswo.in',
    args.donorPhone || '9999999999',
    args.description,
    receipt,
  );

  // Update Supabase record with cashfree order id
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

  return new Promise<CashfreeSuccessResponse>((resolve, reject) => {
    cashfree.checkout({
      paymentSessionId: orderData.payment_session_id,
      redirectTarget: '_modal',
      onSuccess: async (data) => {
        // Update Supabase record as paid
        if (donationRecordId) {
          try {
            await supabase
              .from('cswo_donations')
              .update({
                status: 'paid',
                cashfree_payment_id: data.payment.paymentId,
              })
              .eq('id', donationRecordId);
          } catch {
            // ignore
          }
        }
        resolve(data);
      },
      onFailure: async (data) => {
        if (donationRecordId) {
          try {
            await supabase
              .from('cswo_donations')
              .update({ status: 'failed' })
              .eq('id', donationRecordId);
          } catch {
            // ignore
          }
        }
        reject(new Error(data.payment?.paymentMessage || 'Payment Failed'));
      },
    });
  });
}
