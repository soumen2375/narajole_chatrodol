import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { PageShell } from './_field-journal';
import { useT } from '@/i18n';
import { printReceipt } from '@/lib/receipt';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

type PaymentStatus = 'verifying' | 'success' | 'failed' | 'cancelled' | 'expired' | 'timeout';

interface VerifiedOrderData {
  order_id: string;
  payment_id?: string;
  payment_method?: string;
  status: string;
  order_amount: number;
  order_currency?: string;
  donor_name?: string;
  donor_email?: string;
  purpose?: string;
  receipt_number?: string;
  type?: 'donation' | 'contribution';
}

const MAX_POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 3000;

/** Brand palette for the celebration — teal, green, gold, cream. */
const CELEBRATION_COLORS = ['#0c756f', '#00a35c', '#f5c518', '#f8b400', '#fdfcf5'];

/**
 * Fires a short "party" celebration: one big centre burst, then a couple of
 * seconds of side cannons streaming inward.
 *
 * Skipped entirely for visitors who have asked for reduced motion — a full
 * screen of moving particles is exactly what that setting exists to prevent.
 * Returns a cleanup function so an unmount mid-animation stops the loop
 * instead of leaving a rAF chain running against a dead component.
 */
function fireCelebration(): () => void {
  let cancelled = false;

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) return () => {};

  try {
    // Opening burst
    confetti({
      particleCount: 140,
      spread: 95,
      startVelocity: 45,
      origin: { y: 0.6 },
      colors: CELEBRATION_COLORS,
      zIndex: 9999,
      disableForReducedMotion: true,
    });

    // Side cannons for ~2.2s
    const end = Date.now() + 2200;
    const frame = () => {
      if (cancelled) return;
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 62,
        origin: { x: 0, y: 0.72 },
        colors: CELEBRATION_COLORS,
        zIndex: 9999,
        disableForReducedMotion: true,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 62,
        origin: { x: 1, y: 0.72 },
        colors: CELEBRATION_COLORS,
        zIndex: 9999,
        disableForReducedMotion: true,
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  } catch {
    // Confetti is decorative — never let it break the confirmation screen.
  }

  return () => {
    cancelled = true;
  };
}

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const { lang } = useT();
  const tr = (bn: string, en: string) => (lang === 'en' ? en : bn);

  const orderId =
    searchParams.get('order_id') ||
    searchParams.get('orderId') ||
    '';

  const [status, setStatus] = useState<PaymentStatus>('verifying');
  const [orderData, setOrderData] = useState<VerifiedOrderData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!orderId) {
      setStatus('failed');
      setErrorMessage(
        tr(
          'কোনো অর্ডার আইডি পাওয়া যায়নি।',
          'No order ID provided in payment return.',
        ),
      );
      return;
    }

    let isMounted = true;
    let attempts = 0;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let stopCelebration: (() => void) | null = null;

    async function checkPayment(): Promise<void> {
      if (!isMounted) return;
      attempts++;

      try {
        const response = await fetch('/api/cashfree-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId }),
        });

        const data = (await response.json()) as {
          success?: boolean;
          status?: string;
          order_id?: string;
          payment_id?: string;
          payment_method?: string;
          order_amount?: number;
          order_currency?: string;
          receipt_number?: string;
          type?: 'donation' | 'contribution';
        };

        if (!isMounted) return;

        const payStatus = data.status || (data.success ? 'paid' : 'pending');

        if (payStatus === 'paid') {
          setOrderData({
            order_id: data.order_id || orderId,
            payment_id: data.payment_id,
            payment_method: data.payment_method || 'Cashfree Payments',
            status: 'paid',
            order_amount: Number(data.order_amount || 0),
            receipt_number: data.receipt_number || undefined,
            type: data.type,
          });
          setStatus('success');
          stopCelebration = fireCelebration();
          return;
        }

        if (payStatus === 'failed') {
          setStatus('failed');
          setErrorMessage(
            tr('পেমেন্ট ব্যর্থ হয়েছে।', 'Payment failed.'),
          );
          return;
        }

        if (payStatus === 'cancelled' || payStatus === 'expired') {
          setStatus(payStatus === 'expired' ? 'cancelled' : 'cancelled');
          return;
        }

        // Still pending — retry if within limit
        if (attempts >= MAX_POLL_ATTEMPTS) {
          setStatus('timeout');
          setErrorMessage(
            tr(
              'আপনার পেমেন্ট স্বয়ংক্রিয়ভাবে নিশ্চিত করা সম্ভব হয়নি। পরবর্তীতে পেমেন্ট স্ট্যাটাস যাচাই করুন।',
              'We could not automatically confirm your payment. Please check your payment status later.',
            ),
          );
          return;
        }

        // Schedule next check
        timeoutHandle = setTimeout(checkPayment, POLL_INTERVAL_MS);
      } catch {
        if (!isMounted) return;

        if (attempts >= MAX_POLL_ATTEMPTS) {
          setStatus('timeout');
          setErrorMessage(
            tr(
              'নেটওয়ার্ক সমস্যার কারণে পেমেন্ট যাচাই করা যায়নি।',
              'Unable to verify payment due to a network error. Please try again.',
            ),
          );
          return;
        }

        // Retry on network error
        timeoutHandle = setTimeout(checkPayment, POLL_INTERVAL_MS);
      }
    }

    checkPayment();

    return () => {
      isMounted = false;
      if (timeoutHandle) clearTimeout(timeoutHandle);
      stopCelebration?.();
    };
  }, [orderId]);

  return (
    <PageShell>
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-lg bg-white rounded-panel border border-site-line p-6 sm:p-8 text-center animate-fade-in">

          {/* ── VERIFYING SPINNER ── */}
          {status === 'verifying' && (
            <div className="py-12 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-site-cream text-[#0c756f]">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-site-ink">
                {tr('পেমেন্ট যাচাই করা হচ্ছে...', 'Verifying Your Payment...')}
              </h2>
              <p className="text-xs sm:text-sm text-site-muted font-medium max-w-sm mx-auto">
                {tr(
                  'অনুগ্রহ করে অপেক্ষা করুন, আপনার ট্রানজাকশন নিশ্চিত করা হচ্ছে।',
                  'Please wait while we confirm your transaction securely.',
                )}
              </p>
              <p className="text-[11px] text-site-faint">
                {tr(
                  `যাচাই চেষ্টা: ${Math.min(0, MAX_POLL_ATTEMPTS)}/10`,
                  `Checking... (up to ${MAX_POLL_ATTEMPTS} attempts)`,
                )}
              </p>
            </div>
          )}

          {/* ── SUCCESS STATE ── */}
          {status === 'success' && orderData && (
            <div className="space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-site-cream text-site-green ring-8 ring-site-green/10">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <span className="inline-block rounded-full bg-site-cream border border-site-line px-3 py-1 text-[11px] font-black uppercase tracking-wider text-site-green mb-2">
                  ✓ {tr('পেমেন্ট সফল হয়েছে', 'Payment Confirmed')}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-site-ink tracking-tight">
                  {tr('আপনাকে আন্তরিক ধন্যবাদ!', 'Thank You for Your Support!')}
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-site-muted font-medium">
                  {tr(
                    'আপনার অনুদান সফলভাবে গৃহীত হয়েছে। রসিদ শীঘ্রই আপনার ইমেলে পাঠানো হবে।',
                    'Your contribution has been received. A receipt is being sent to your email.',
                  )}
                </p>
              </div>

              {/* Receipt Snapshot Box */}
              <div className="rounded-card bg-site-cream border border-site-line p-4 sm:p-5 text-left space-y-3">
                <div className="flex items-center justify-between border-b border-site-line pb-2.5">
                  <span className="text-xs text-site-muted font-bold uppercase tracking-wider">
                    {tr('পরিমাণ', 'Amount Received')}
                  </span>
                  <span className="text-lg sm:text-xl font-black text-[#0c756f]">
                    ₹{orderData.order_amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {orderData.receipt_number && (
                    <div>
                      <span className="text-[10.5px] font-bold text-site-faint block uppercase">
                        {tr('রসিদ নম্বর', 'Receipt No.')}
                      </span>
                      <span className="font-dmmono font-bold text-site-ink">
                        {orderData.receipt_number}
                      </span>
                    </div>
                  )}

                  <div>
                    <span className="text-[10.5px] font-bold text-site-faint block uppercase">
                      {tr('তারিখ', 'Date')}
                    </span>
                    <span className="font-semibold text-site-ink">
                      {new Date().toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {orderData.payment_id && (
                    <div className="col-span-2">
                      <span className="text-[10.5px] font-bold text-site-faint block uppercase">
                        {tr('ট্রানজাকশন আইডি', 'Transaction ID')}
                      </span>
                      <span className="font-dmmono text-[11px] text-site-soft break-all block">
                        {orderData.payment_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {orderData.receipt_number && (
                  <button
                    type="button"
                    onClick={() =>
                      printReceipt(
                        {
                          receiptNumber: orderData.receipt_number || 'CSWO-DON',
                          type: orderData.type || 'donation',
                          name: orderData.donor_name || 'Supporter',
                          email: orderData.donor_email,
                          amount: orderData.order_amount,
                          purpose: orderData.purpose || 'Donation & Social Welfare',
                          date: new Date().toLocaleDateString('en-IN'),
                          paymentMethod:
                            orderData.payment_method || 'Cashfree',
                          paymentId: orderData.payment_id,
                        },
                        lang,
                      )
                    }
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-soft bg-site-green hover:bg-site-green-2 text-white px-4 py-3 text-xs sm:text-sm font-bold transition-all cursor-pointer touch-manipulation"
                  >
                    <Download className="h-4 w-4" />
                    {tr('রসিদ ডাউনলোড / প্রিন্ট করুন', 'Download / Print Receipt')}
                  </button>
                )}

                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-1.5 rounded-soft border border-site-line hover:bg-site-cream text-site-soft px-4 py-3 text-xs sm:text-sm font-bold transition-all"
                >
                  {tr('হোমপেজে ফিরুন', 'Back to Home')}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {/* ── CANCELLED STATE ── */}
          {status === 'cancelled' && (
            <div className="py-6 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-site-cream text-site-red">
                <XCircle className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-site-ink">
                  {tr('পেমেন্ট বাতিল করা হয়েছে', 'Payment Cancelled')}
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-site-muted font-medium">
                  {tr(
                    'আপনি চেকআউট প্রক্রিয়াটি বাতিল করেছেন। কোনো টাকা কাটা হয়নি।',
                    'The checkout session was cancelled. No charges were made.',
                  )}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/donate"
                  className="inline-flex items-center justify-center gap-2 rounded-soft bg-[#0c756f] text-white px-5 py-2.5 text-xs sm:text-sm font-bold hover:bg-[#095753] transition-all"
                >
                  {tr('আবার চেষ্টা করুন', 'Try Donating Again')}
                </Link>
              </div>
            </div>
          )}

          {/* ── FAILED STATE ── */}
          {status === 'failed' && (
            <div className="py-6 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-site-cream text-site-blood">
                <XCircle className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-site-ink">
                  {tr('পেমেন্ট সম্পন্ন হয়নি', 'Payment Incomplete')}
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-site-blood font-medium">
                  {errorMessage ||
                    tr(
                      'পেমেন্ট প্রক্রিয়াটি সম্পন্ন করা সম্ভব হয়নি।',
                      'The transaction could not be completed.',
                    )}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/donate"
                  className="inline-flex items-center justify-center gap-2 rounded-soft bg-[#0c756f] text-white px-5 py-2.5 text-xs sm:text-sm font-bold hover:bg-[#095753] transition-all"
                >
                  {tr('আবার চেষ্টা করুন', 'Try Again')}
                </Link>
              </div>
            </div>
          )}

          {/* ── TIMEOUT STATE (new) ── */}
          {status === 'timeout' && (
            <div className="py-6 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-site-cream text-site-red">
                <AlertCircle className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-site-ink">
                  {tr('যাচাই করা সম্ভব হয়নি', 'Verification Timed Out')}
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-site-muted font-medium max-w-sm mx-auto">
                  {errorMessage ||
                    tr(
                      'স্বয়ংক্রিয় যাচাই সম্ভব হয়নি। পরবর্তীতে পেমেন্ট স্ট্যাটাস যাচাই করুন।',
                      'We could not confirm your payment automatically. Please check your payment status later.',
                    )}
                </p>
                {orderId && (
                  <p className="mt-2 text-[11px] text-site-faint">
                    {tr('অর্ডার আইডি:', 'Order ID:')} <span className="font-dmmono">{orderId}</span>
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link
                  to="/donate"
                  className="inline-flex items-center justify-center gap-2 rounded-soft bg-[#0c756f] text-white px-5 py-2.5 text-xs sm:text-sm font-bold hover:bg-[#095753] transition-all"
                >
                  {tr('হোমপেজে ফিরুন', 'Back to Home')}
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </PageShell>
  );
}
