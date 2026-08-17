import { useState } from 'react';
import { openStandardCheckout, type RazorpayResponse } from '@/lib/razorpay';
import { ShieldCheck, Loader2 } from 'lucide-react';

export interface RazorpayButtonProps {
  amount?: number; // In Rupees (e.g. 500 for ₹500)
  name?: string;
  description?: string;
  buttonText?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  className?: string;
  themeColor?: string;
  onSuccess?: (response: RazorpayResponse) => void;
  onError?: (error: Error) => void;
}

export default function RazorpayButton({
  amount = 500,
  name = 'Chhatradol Social Welfare Organization',
  description = 'Support Community Programs',
  buttonText,
  prefill,
  notes,
  className = '',
  themeColor = '#c2410c',
  onSuccess,
  onError,
}: RazorpayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await openStandardCheckout({
        amountInRupees: amount,
        name,
        description,
        prefill,
        notes,
        themeColor,
        onSuccess: (res) => {
          setLoading(false);
          onSuccess?.(res);
        },
        onFailure: (err) => {
          setLoading(false);
          setErrorMessage(err.message || 'Payment failed');
          onError?.(err);
        },
        onDismiss: () => {
          setLoading(false);
        },
      });

      if (response) {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      const m = err instanceof Error ? err.message : 'Payment error';
      if (m !== 'CANCELLED') {
        setErrorMessage(m);
        onError?.(err instanceof Error ? err : new Error(m));
      }
    }
  };

  const displayText =
    buttonText || (amount > 0 ? `Pay ₹${amount.toLocaleString('en-IN')}` : 'Pay Now');

  return (
    <div className="inline-flex flex-col items-center">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className={`relative inline-flex items-center justify-center gap-2 rounded-xl bg-orange-700 px-6 py-3.5 font-semibold text-white shadow-md transition-all duration-200 hover:bg-orange-800 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-white" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4 text-white/90" />
            <span>{displayText}</span>
          </>
        )}
      </button>

      {errorMessage && (
        <p className="mt-2 text-center text-xs font-medium text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
