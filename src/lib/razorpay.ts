import { supabase } from './supabase';

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface CreateOrderResult {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  record_id: string;
}

const ENV_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined;

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('cswo-razorpay', { body });
  if (error) {
    // Try to surface the function's JSON error message
    let detail = error.message;
    const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const j = await ctx.json();
        if (j?.error) detail = j.error;
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail);
  }
  return data as T;
}

interface StartPaymentArgs {
  action: 'create_donation_order' | 'create_contribution_order';
  amount: number;
  purpose?: string;
  donorName?: string;
  donorEmail?: string;
  donorPhone?: string;
  isAnonymous?: boolean;
  year?: number;
  month?: number;
  description: string;
}

export async function startRazorpayPayment(args: StartPaymentArgs): Promise<void> {
  if (!window.Razorpay) {
    throw new Error('পেমেন্ট গেটওয়ে লোড হয়নি। অনুগ্রহ করে পৃষ্ঠা রিফ্রেশ করুন।');
  }

  const order = await invoke<CreateOrderResult>({
    action: args.action,
    amount: args.amount,
    purpose: args.purpose,
    donor_name: args.donorName,
    donor_email: args.donorEmail,
    donor_phone: args.donorPhone,
    is_anonymous: args.isAnonymous,
    year: args.year,
    month: args.month,
  });

  const verifyAction =
    args.action === 'create_donation_order' ? 'verify_donation' : 'verify_contribution';

  return new Promise<void>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: order.key_id || ENV_KEY_ID || '',
      amount: order.amount,
      currency: order.currency,
      name: 'Chhatradol Social Welfare Organisation',
      description: args.description,
      order_id: order.order_id,
      prefill: {
        name: args.donorName,
        email: args.donorEmail,
        contact: args.donorPhone,
      },
      theme: { color: '#1e40af' },
      handler: async (response: RazorpayResponse) => {
        try {
          await invoke({
            action: verifyAction,
            record_id: order.record_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => reject(new Error('পেমেন্ট বাতিল করা হয়েছে।')),
      },
    });
    rzp.open();
  });
}
