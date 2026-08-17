import { supabase } from './supabase';

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

  // If donation, optionally insert pending record into Supabase for audit/history
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
          status: 'created',
        })
        .select('id')
        .single();
      if (rec?.id) donationRecordId = rec.id;
    } catch {
      // Continue even if Supabase is offline
    }
  }

  const amountPaise = Math.round(args.amount * 100);
  const receipt = donationRecordId ? `don_${donationRecordId}`.slice(0, 40) : `cswo_${Date.now()}`;

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
    try {
      await supabase
        .from('cswo_donations')
        .update({ razorpay_order_id: orderData.order_id })
        .eq('id', donationRecordId);
    } catch {
      // ignore
    }
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
          await verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );

          if (donationRecordId) {
            try {
              await supabase
                .from('cswo_donations')
                .update({
                  status: 'paid',
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                })
                .eq('id', donationRecordId);
            } catch {
              // ignore
            }
          }

          resolve(response);
        } catch (err) {
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
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('CANCELLED')),
      },
    });

    rzp.on('payment.failed', (failData: unknown) => {
      const errorDetail = (failData as { error?: { description?: string } })?.error?.description || 'Payment Failed';
      reject(new Error(errorDetail));
    });

    rzp.open();
  });
}
