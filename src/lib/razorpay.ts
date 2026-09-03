import { supabase } from './supabase';
import {
  stageContributionBatch,
  linkContributionOrderId,
  updateDonationGatewayLink,
  donationReceiptTag,
  contributionReceiptTag,
  type ContributionBatch,
} from './contributions';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: unknown) => void) => void;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  receipt_number?: string | null;
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id?: string;
  error?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message?: string;
  error?: string;
  order_id?: string;
  payment_id?: string;
  receipt_number?: string | null;
}

const ENV_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;

let scriptPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads the Razorpay Standard Checkout script (checkout.js).
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => {
        scriptPromise = null;
        resolve(false);
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      scriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

/**
 * Step 1: Calls backend endpoint to create a Razorpay order.
 * @param amountInPaise Amount in paise (minimum 100 paise = ₹1.00)
 * @param currency Currency code (default: 'INR')
 * @param receipt Optional receipt identifier
 * @param notes Optional metadata notes
 */
export async function createOrder(
  amountInPaise: number,
  currency = 'INR',
  receipt?: string,
  notes?: Record<string, string>
): Promise<CreateOrderResponse> {
  if (amountInPaise < 100) {
    throw new Error('Minimum order amount is 100 paise (₹1.00)');
  }

  const response = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(amountInPaise),
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Failed to create order (${response.status})`);
  }

  return data as CreateOrderResponse;
}

/**
 * Step 3: Calls backend endpoint to verify Razorpay cryptographic payment signature.
 */
export async function verifyPayment(
  orderId: string,
  paymentId: string,
  signature: string
): Promise<VerifyPaymentResponse> {
  const response = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: orderId,
      payment_id: paymentId,
      razorpay_signature: signature,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Payment signature verification failed');
  }

  return data as VerifyPaymentResponse;
}

export interface StandardCheckoutOptions {
  amountInRupees: number;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  themeColor?: string;
  onSuccess?: (response: RazorpayResponse) => void;
  onFailure?: (error: Error) => void;
  onDismiss?: () => void;
}

/**
 * Step 2 & Full Flow: Initiates the complete Razorpay Standard Web Checkout.
 * 1. Loads script
 * 2. Creates order on backend
 * 3. Opens Razorpay Modal
 * 4. Verifies signature on backend upon payment completion
 */
export async function openStandardCheckout(options: StandardCheckoutOptions): Promise<RazorpayResponse> {
  const isScriptLoaded = await loadRazorpayScript();
  if (!isScriptLoaded || !window.Razorpay) {
    const err = new Error('PAYMENT_GATEWAY_LOAD_FAILED');
    options.onFailure?.(err);
    throw err;
  }

  const amountPaise = Math.round(options.amountInRupees * 100);
  const orderData = await createOrder(
    amountPaise,
    'INR',
    `rcpt_${Date.now()}`,
    options.notes
  );

  const key = orderData.key_id || ENV_KEY_ID || '';
  if (!key) {
    const err = new Error('RAZORPAY_KEY_NOT_CONFIGURED');
    options.onFailure?.(err);
    throw err;
  }

  return new Promise<RazorpayResponse>((resolve, reject) => {
    try {
      const rzp = new window.Razorpay!({
        key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: options.name || 'Chhatradol Social Welfare Organization',
        description: options.description || 'Donation / Contribution',
        order_id: orderData.order_id,
        prefill: options.prefill,
        notes: options.notes,
        theme: { color: options.themeColor || '#c2410c' },
        handler: async (response: RazorpayResponse) => {
          try {
            await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature
            );
            options.onSuccess?.(response);
            resolve(response);
          } catch (verifyErr) {
            const err = verifyErr instanceof Error ? verifyErr : new Error('Verification failed');
            options.onFailure?.(err);
            reject(err);
          }
        },
        modal: {
          ondismiss: () => {
            options.onDismiss?.();
            reject(new Error('CANCELLED'));
          },
        },
      });

      rzp.on('payment.failed', (failData: unknown) => {
        const errorDetail = (failData as { error?: { description?: string } })?.error?.description || 'Payment Failed';
        const err = new Error(errorDetail);
        options.onFailure?.(err);
        reject(err);
      });

      rzp.open();
    } catch (launchErr) {
      const err = launchErr instanceof Error ? launchErr : new Error('Failed to open Razorpay modal');
      options.onFailure?.(err);
      reject(err);
    }
  });
}

/**
 * Application workflow for donations and contributions.
 * Integrates standard checkout with Supabase donation/contribution records when available.
 */
interface StartPaymentArgs {
  action: 'create_donation_order' | 'create_contribution_order';
  amount: number; // in Rupees
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


export async function startRazorpayPayment(args: StartPaymentArgs): Promise<RazorpayResponse> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error('PAYMENT_FAILED');
  }

  let donationRecordId: string | null = null;
  let contributionBatch: ContributionBatch | null = null;

  // If donation, optionally insert pending record into Supabase for audit/history
  if (args.action === 'create_donation_order') {
    try {
      // Generate the row's id client-side and insert without .select() — an
      // anonymous donor has no auth.uid(), so there is deliberately no
      // SELECT RLS policy for the anon role (that would leak every pending
      // donor's name/email/phone to any visitor). Requesting the row back
      // via .select() forces an implicit RETURNING, which needs SELECT
      // visibility and would fail RLS even though the INSERT is allowed.
      const generatedId = crypto.randomUUID();
      const { error } = await supabase.from('cswo_donations').insert({
        id: generatedId,
        donor_name: args.donorName ?? null,
        donor_email: args.donorEmail ?? null,
        donor_phone: args.donorPhone ?? null,
        amount: args.amount,
        purpose: args.purpose ?? null,
        is_anonymous: !!args.isAnonymous,
        is_recurring: !!args.isRecurring,
        payment_gateway: 'razorpay',
        status: 'created',
      });
      if (!error) {
        donationRecordId = generatedId;
      } else {
        console.error('[razorpay] Failed to pre-create donation record:', error);
      }
    } catch (err) {
      console.error('[razorpay] Failed to pre-create donation record:', err);
    }
  }

  if (args.action === 'create_contribution_order' && args.memberId && args.year) {
    // Throws if the rows could not be staged — deliberately not caught, because
    // opening a checkout with no row to reconcile against is how a member ends
    // up paying for a month that still shows as due.
    contributionBatch = await stageContributionBatch({
      memberId: args.memberId,
      year: args.year,
      months: args.months && args.months.length > 0 ? args.months : (args.month ? [args.month] : []),
      totalAmount: args.amount,
      gateway: 'razorpay',
    });

    if (!contributionBatch) {
      throw new Error('These months are already paid. Refresh the page to see the latest status.');
    }
  }

  const perMonthAmount = contributionBatch
    ? args.amount / contributionBatch.months.length
    : args.amount;

  const amountPaise = Math.round(args.amount * 100);
  const receipt = donationRecordId
    ? donationReceiptTag(donationRecordId)
    : contributionBatch
      ? contributionReceiptTag(contributionBatch.memberId)
      : `cswo_${Date.now()}`;

  const orderData = await createOrder(
    amountPaise,
    'INR',
    receipt,
    {
      purpose: args.purpose || 'General Fund',
      action: args.action,
      donor_email: args.donorEmail || '',
      donor_phone: args.donorPhone || '',
    }
  );

  if (donationRecordId) {
    await updateDonationGatewayLink(donationRecordId, orderData.order_id, 'created', 'razorpay');
  }

  if (contributionBatch) {
    await linkContributionOrderId(contributionBatch, 'razorpay', orderData.order_id, 'created', perMonthAmount);
  }

  const key = orderData.key_id || ENV_KEY_ID || '';

  return new Promise<RazorpayResponse>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Chhatradol Social Welfare Organization',
      description: args.description,
      order_id: orderData.order_id,
      prefill: {
        name: args.donorName,
        email: args.donorEmail,
        contact: args.donorPhone,
      },
      theme: { color: '#c2410c' },
      handler: async (response: RazorpayResponse) => {
        try {
          // verifyPayment() checks the cryptographic signature server-side and,
          // on success, calls finalizePayment() there — that's the only place
          // status is allowed to become 'paid' (RLS blocks the client from
          // self-granting it). No client-side status write needed here.
          const verifyResult = await verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );

          resolve({
            ...response,
            receipt_number: verifyResult.receipt_number || null,
          });
        } catch (err) {
          if (donationRecordId) {
            await updateDonationGatewayLink(
              donationRecordId,
              orderData.order_id,
              'failed',
              'razorpay',
            );
          }
          if (contributionBatch) {
            await linkContributionOrderId(contributionBatch, 'razorpay', orderData.order_id, 'failed', perMonthAmount);
          }
          reject(err);
        }
      },
      modal: {
        ondismiss: () => {
          // Update Supabase record to cancelled when user closes/dismisses
          if (donationRecordId) {
            void updateDonationGatewayLink(
              donationRecordId,
              orderData.order_id,
              'cancelled',
              'razorpay',
            );
          }
          if (contributionBatch) {
            void linkContributionOrderId(contributionBatch, 'razorpay', orderData.order_id, 'cancelled', perMonthAmount);
          }
          reject(new Error('CANCELLED'));
        },
      },
    });

    rzp.on('payment.failed', (failData: unknown) => {
      const errorDetail = (failData as { error?: { description?: string } })?.error?.description || 'Payment Failed';
      if (contributionBatch) {
        void linkContributionOrderId(contributionBatch, 'razorpay', orderData.order_id, 'failed', perMonthAmount);
      }
      if (donationRecordId) {
        void updateDonationGatewayLink(
          donationRecordId,
          orderData.order_id,
          'failed',
          'razorpay',
        );
      }
      reject(new Error(errorDetail));
    });

    rzp.open();
  });
}
