import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { PageShell } from './_field-journal';
import { useT } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { sendReceiptInvoiceEmail } from '@/lib/email';
import { printReceipt } from '@/lib/receipt';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  ArrowRight,
} from 'lucide-react';

interface VerifiedOrderData {
  order_id: string;
  payment_id?: string;
  payment_method?: string;
  order_status: string;
  order_amount: number;
  order_currency?: string;
  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;
  purpose?: string;
  receipt_number?: string;
}

export default function PaymentReturn() {
  const [searchParams] = useSearchParams();
  const { lang } = useT();
  const tr = (bn: string, en: string) => (lang === 'en' ? en : bn);

  const orderId = searchParams.get('order_id') || searchParams.get('orderId') || '';

  const [status, setStatus] = useState<'verifying' | 'success' | 'failed' | 'cancelled'>('verifying');
  const [orderData, setOrderData] = useState<VerifiedOrderData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!orderId) {
      setStatus('failed');
      setErrorMessage(tr('কোনো অর্ডার আইডি পাওয়া যায়নি।', 'No order ID provided in payment return.'));
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const res = await fetch('/api/cashfree-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId }),
        });

        const data = await res.json();

        if (!isMounted) return;

        if (data.success || data.order_status === 'PAID') {
          // Fetch existing donation record from Supabase to enrich receipt details
          let donorName = 'Valued Supporter';
          let donorEmail = '';
          let purpose = 'Donation Support & Social Welfare';
          const receiptNum = `CSWO-DON-${Date.now().toString().slice(-8).toUpperCase()}`;

          try {
            const { data: dbRec } = await supabase
              .from('cswo_donations')
              .select('*')
              .eq('cashfree_order_id', orderId)
              .maybeSingle();

            if (dbRec) {
              donorName = dbRec.donor_name || donorName;
              donorEmail = dbRec.donor_email || '';
              purpose = dbRec.purpose || purpose;

              // Update status to paid if not already
              await supabase
                .from('cswo_donations')
                .update({
                  status: 'paid',
                  receipt_number: dbRec.receipt_number || receiptNum,
                  cashfree_payment_id: data.payment_id || null,
                })
                .eq('id', dbRec.id);
            }
          } catch (dbErr) {
            console.warn('DB lookup error in return url:', dbErr);
          }

          const resolvedData: VerifiedOrderData = {
            order_id: data.order_id || orderId,
            payment_id: data.payment_id || data.order_id || orderId,
            payment_method: data.payment_method || 'Cashfree Payments',
            order_status: 'PAID',
            order_amount: Number(data.order_amount || 0),
            donor_name: donorName,
            donor_email: donorEmail,
            purpose,
            receipt_number: receiptNum,
          };

          setOrderData(resolvedData);
          setStatus('success');

          // Send confirmation receipt email
          if (donorEmail) {
            sendReceiptInvoiceEmail({
              recipientEmail: donorEmail,
              recipientName: donorName,
              type: 'donation',
              amount: resolvedData.order_amount,
              receiptNumber: receiptNum,
              purpose,
              paymentMethod: resolvedData.payment_method || 'Cashfree Payments',
              paymentId: resolvedData.payment_id,
              date: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            });
          }

          // Trigger victory celebration confetti
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          } catch {
            // ignore
          }
        } else if (
          data.order_status === 'CANCELLED' ||
          data.order_status === 'EXPIRED' ||
          data.order_status === 'USER_DROPPED'
        ) {
          setStatus('cancelled');
        } else {
          setStatus('failed');
          setErrorMessage(data.message || tr('পেমেন্ট সফল হয়নি।', 'Payment could not be verified.'));
        }
      } catch (err) {
        if (!isMounted) return;
        setStatus('failed');
        setErrorMessage(tr('পেমেন্ট যাচাইকরণে ত্রুটি হয়েছে।', 'Network error verifying payment.'));
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  return (
    <PageShell>
      <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-lg bg-white rounded-3xl border border-stone-200/80 shadow-xl p-6 sm:p-8 text-center animate-fade-in">

          {/* ── VERIFYING SPINNER ── */}
          {status === 'verifying' && (
            <div className="py-12 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-[#0c756f]">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                {tr('পেমেন্ট যাচাই করা হচ্ছে...', 'Verifying Your Payment...')}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-medium max-w-sm mx-auto">
                {tr(
                  'অনুগ্রহ করে অপেক্ষা করুন, ক্যাশফ্রি থেকে আপনার ট্রানজাকশন নিশ্চিত করা হচ্ছে।',
                  'Please wait while we confirm your transaction securely with Cashfree.'
                )}
              </p>
            </div>
          )}

          {/* ── SUCCESS STATE ── */}
          {status === 'success' && orderData && (
            <div className="space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-md ring-8 ring-emerald-50">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 mb-2">
                  ✓ {tr('পেমেন্ট সফল হয়েছে', 'Payment Confirmed')}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                  {tr('আপনাকে আন্তরিক ধন্যবাদ!', 'Thank You for Your Support!')}
                </h1>
                <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-medium">
                  {tr('আপনার অনুদান সফলভাবে গৃহীত হয়েছে। রসিদ আপনার ইমেলে পাঠানো হয়েছে।', 'Your donation has been successfully received and receipt dispatched.')}
                </p>
              </div>

              {/* Receipt Snapshot Box */}
              <div className="rounded-2xl bg-stone-50 border border-stone-200/90 p-4 sm:p-5 text-left space-y-3">
                <div className="flex items-center justify-between border-b border-stone-200/80 pb-2.5">
                  <span className="text-xs text-stone-500 font-bold uppercase tracking-wider">
                    {tr('অনুদানের পরিমাণ', 'Amount Received')}
                  </span>
                  <span className="text-lg sm:text-xl font-black text-[#0c756f]">
                    ₹{orderData.order_amount.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10.5px] font-bold text-stone-400 block uppercase">
                      {tr('রসিদ নম্বর', 'Receipt No.')}
                    </span>
                    <span className="font-mono font-bold text-stone-800">
                      {orderData.receipt_number}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10.5px] font-bold text-stone-400 block uppercase">
                      {tr('তারিখ', 'Date')}
                    </span>
                    <span className="font-semibold text-stone-800">
                      {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10.5px] font-bold text-stone-400 block uppercase">
                      {tr('উদ্দেশ্য', 'Purpose')}
                    </span>
                    <span className="font-semibold text-stone-800 truncate block">
                      {orderData.purpose}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-[10.5px] font-bold text-stone-400 block uppercase">
                      {tr('ট্রানজাকশন আইডি', 'Transaction ID')}
                    </span>
                    <span className="font-mono text-[11px] text-stone-600 break-all block">
                      {orderData.payment_id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    printReceipt(
                      {
                        receiptNumber: orderData.receipt_number || 'CSWO-DON',
                        type: 'donation',
                        name: orderData.donor_name || 'Supporter',
                        email: orderData.donor_email,
                        amount: orderData.order_amount,
                        purpose: orderData.purpose || 'Donation Support',
                        date: new Date().toLocaleDateString('en-IN'),
                        paymentMethod: orderData.payment_method || 'Cashfree',
                        paymentId: orderData.payment_id,
                      },
                      lang,
                    )
                  }
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white px-4 py-3 text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  {tr('রসিদ ডাউনলোড / প্রিন্ট করুন', 'Download / Print Receipt')}
                </button>

                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 px-4 py-3 text-xs sm:text-sm font-bold transition-all"
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <XCircle className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                  {tr('পেমেন্ট বাতিল করা হয়েছে', 'Payment Cancelled')}
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-stone-500 font-medium">
                  {tr(
                    'আপনি চেকআউট প্রক্রিয়াটি বাতিল করেছেন। কোনো টাকা কাটা হয়নি।',
                    'The checkout session was cancelled. No charges were made.'
                  )}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/donate"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c756f] text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow hover:bg-[#095753] transition-all"
                >
                  {tr('আবার চেষ্টা করুন', 'Try Donating Again')}
                </Link>
              </div>
            </div>
          )}

          {/* ── FAILED STATE ── */}
          {status === 'failed' && (
            <div className="py-6 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                <XCircle className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-stone-900">
                  {tr('পেমেন্ট সম্পন্ন হয়নি', 'Payment Incomplete')}
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-red-600 font-medium">
                  {errorMessage || tr('পেমেন্ট প্রক্রিয়াটি সম্পন্ন করা সম্ভব হয়নি।', 'The transaction could not be completed.')}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/donate"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0c756f] text-white px-5 py-2.5 text-xs sm:text-sm font-bold shadow hover:bg-[#095753] transition-all"
                >
                  {tr('আবার চেষ্টা করুন', 'Try Again')}
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </PageShell>
  );
}
