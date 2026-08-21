import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { PageShell } from './_field-journal';
import { startPayment } from '@/lib/payments';
import type { PaymentGateway } from '@/types';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { sendReceiptInvoiceEmail } from '@/lib/email';
import { supabase } from '@/lib/supabase';
import { printReceipt } from '@/lib/receipt';
import {
  BookOpen,
  HeartPulse,
  UtensilsCrossed,
  Trees,
  Users2,
  Heart,
  Check,
  Copy,
  ArrowRight,
  Info,
  Smartphone,
  Mail,
  Calendar,
  Bookmark,
  FileText,
  X
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════
//  Donate — Ultra-Premium, 100% Mobile & Desktop Responsive
// ════════════════════════════════════════════════════════════════════

type Cause = { key: string; icon: React.ComponentType<{ className?: string }>; bn: string; en: string; purpose: string; desc: string };
const CAUSES: Cause[] = [
  { key: 'education', icon: BookOpen, bn: 'শিক্ষা সহায়তা', en: 'Education', purpose: 'Education Support', desc: 'Books, fees & school supplies' },
  { key: 'healthcare', icon: HeartPulse, bn: 'চিকিৎসা সেবা', en: 'Healthcare', purpose: 'Medical Aid & Health Care', desc: 'Emergency aid & treatments' },
  { key: 'food', icon: UtensilsCrossed, bn: 'খাদ্য ও পুষ্টি', en: 'Food & Hunger', purpose: 'Food & Nutrition Relief', desc: 'Nutritious meals & rations' },
  { key: 'environment', icon: Trees, bn: 'পরিবেশ রক্ষা', en: 'Environment', purpose: 'Environmental Welfare', desc: 'Tree planting & clean drives' },
  { key: 'community', icon: Users2, bn: 'সমাজকল্যাণ', en: 'Community', purpose: 'Community Development', desc: 'Youth & women empowerment' },
  { key: 'general', icon: Heart, bn: 'সাধারণ তহবিল', en: 'General Fund', purpose: 'General Fund', desc: 'Where help is needed most' },
];

const AMOUNTS = [
  { v: 500, bn: 'একজন শিশুর জন্য', en: 'Support a child' },
  { v: 1000, bn: 'প্রয়োজনীয় সামগ্রী', en: 'Provide essentials' },
  { v: 2500, bn: 'পরিবর্তন আনুন', en: 'Make a difference' },
  { v: 5000, bn: 'পরিবর্তনে শক্তি', en: 'Empower change' },
  { v: 10000, bn: 'একটি পরিবারকে', en: 'Support a family' },
  { v: 20000, bn: 'বড় প্রভাব', en: 'Create big impact' },
];

export const BANK_DETAILS = {
  accountName: 'CHHATRADOL SOCIAL WELFARE ORGANIZATION',
  accountNumber: '50200123995352',
  ifsc: 'HDFC0002593',
  bankName: 'HDFC Bank',
  branch: 'Daspur / Narajole Branch',
  accountType: 'Current Account',
  upiId: '50200123995352@hdfcbank',
};

const FAQS = [
  {
    qEn: '1. Is my donation secure?',
    qBn: '১. আমার অনুদান কি নিরাপদ?',
    aEn: 'Yes. Your donation is processed through secure payment methods. We use trusted payment gateways and encrypted connections to help protect your payment information.',
    aBn: 'হ্যাঁ। আপনার অনুদান সম্পূর্ণ নিরাপদ পেমেন্ট পদ্ধতির মাধ্যমে সম্পন্ন হয়। আমরা বিশ্বস্ত পেমেন্ট গেটওয়ে এবং সুরক্ষিত এনক্রিপশন ব্যবহার করি।'
  },
  {
    qEn: '2. Which payment methods can I use?',
    qBn: '২. আমি কোন কোন মাধ্যমে অনুদান দিতে পারি?',
    aEn: 'You can choose from Online Payment Gateway, Direct UPI QR, or Bank Transfer, depending on which option is most convenient for you.',
    aBn: 'আপনি অনলাইন পেমেন্ট গেটওয়ে, সরাসরি UPI QR স্ক্যান বা ব্যাংক ট্রান্সফারের মাধ্যমে সহজেই অনুদান দিতে পারেন।'
  },
  {
    qEn: '3. Will I receive a donation receipt?',
    qBn: '৩. আমি কি অনুদানের রসিদ পাব?',
    aEn: 'Yes. After your donation is successfully confirmed, an official receipt or donation confirmation will be sent to the email address you provide.',
    aBn: 'হ্যাঁ। অনুদান সফলভাবে সম্পন্ন হওয়ার পর আপনার দেওয়া ইমেল ঠিকানায় তাৎক্ষণিক অফিসিয়াল রসিদ ও ইনভয়েস পাঠানো হবে।'
  },
  {
    qEn: '4. Can I donate anonymously?',
    qBn: '৪. আমি কি নাম গোপন রেখে অনুদান দিতে পারি?',
    aEn: 'Yes. Simply select the “Donate anonymously” option while filling in your details. Your name will not be displayed publicly.',
    aBn: 'হ্যাঁ। আপনার বিবরণ পূরণ করার সময় কেবল "নাম প্রকাশ না করে দান করুন" বিকল্পটি নির্বাচন করুন। আপনার নাম কোথাও প্রকাশ করা হবে না।'
  },
  {
    qEn: '5. Can I donate a custom amount?',
    qBn: '৫. আমি কি নিজের ইচ্ছেমতো পরিমাণ অর্থ দান করতে পারি?',
    aEn: 'Yes. Along with the suggested donation amounts, you can enter your own amount using the Custom Amount option.',
    aBn: 'হ্যাঁ। প্রস্তাবিত পরিমাণের পাশাপাশি আপনি "Enter custom amount" বিকল্পে নিজের পছন্দমতো যেকোনো পরিমাণ লিখতে পারেন।'
  },
  {
    qEn: '6. What if my payment is successful but I don’t receive confirmation?',
    qBn: '৬. পেমেন্ট সফল হওয়ার পরেও কনফার্মেশন না পেলে কী করব?',
    aEn: 'Please check your email inbox and spam folder. If you still do not receive confirmation, contact us with your Transaction ID or payment reference number, and our team will assist you.',
    aBn: 'অনুগ্রহ করে আপনার ইমেল ইনবক্স ও স্প্যাম ফোল্ডার দেখুন। তাও না পেলে আপনার ট্রানজাকশন আইডি বা ইউটিআর নম্বর সহ আমাদের সাথে যোগাযোগ করুন, আমাদের টিম সাহায্য করবে।'
  },
];

type Frequency = 'once' | 'monthly';
type Status = 'idle' | 'processing' | 'done' | 'error';
type PaymentOption = 'gateway' | 'qr' | 'bank';

export default function Donate() {
  const { lang } = useT();
  useSEO(SEO['/donate']);
  const tr = (bn: string, en: string) => (lang === 'en' ? en : bn);

  const [causeKey, setCauseKey] = useState('general');
  const [picked, setPicked] = useState<number>(2500);
  const [custom, setCustom] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [anonymous, setAnonymous] = useState(false);
  const [wantReceipt, setWantReceipt] = useState(false);
  const [donor, setDonor] = useState({ name: '', email: '', phone: '', pan: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [formNotice, setFormNotice] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState('');
  
  // Payment Method Selection
  const [payOption, setPayOption] = useState<PaymentOption>('gateway');
  const [gateway] = useState<PaymentGateway>('cashfree');

  const [utrRef, setUtrRef] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<{
    receiptNumber: string;
    amount: number;
    date: string;
    name: string;
    purpose: string;
    paymentMethod: string;
  } | null>(null);

  // Trigger celebration party & flower confetti animation on payment success
  useEffect(() => {
    if (showSuccessModal) {
      try {
        const count = 180;
        const defaults = { origin: { y: 0.65 }, zIndex: 99999 };

        const fire = (particleRatio: number, opts: confetti.Options) => {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
          });
        };

        fire(0.25, {
          spread: 26,
          startVelocity: 55,
          colors: ['#10B981', '#059669', '#F59E0B', '#3B82F6', '#EC4899'],
        });
        fire(0.2, {
          spread: 60,
          colors: ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
        });
        fire(0.35, {
          spread: 100,
          decay: 0.91,
          scalar: 0.85,
          colors: ['#F59E0B', '#EF4444', '#10B981', '#6366F1', '#EC4899'],
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          scalar: 1.2,
          colors: ['#EC4899', '#F43F5E', '#10B981'],
        });
        fire(0.1, {
          spread: 120,
          startVelocity: 45,
          colors: ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B'],
        });
      } catch (confettiErr) {
        console.warn('Confetti animation error:', confettiErr);
      }
    }
  }, [showSuccessModal]);

  const cause = CAUSES.find((c) => c.key === causeKey) || CAUSES[5];

  const setField = (k: keyof typeof donor) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDonor({ ...donor, [k]: e.target.value });
    if (formErrors[k]) setFormErrors((prev) => ({ ...prev, [k]: undefined }));
    if (formNotice) setFormNotice('');
  };

  const amount = custom ? Number(custom) : picked;
  const amountFmt = (amount || 0).toLocaleString('en-IN');
  const emailOk = /\S+@\S+\.\S+/.test(donor.email);
  const phoneOk = donor.phone.replace(/\D/g, '').length >= 8;

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required basic details
    const errors: { name?: string; email?: string; phone?: string; amount?: string } = {};

    if (!donor.name.trim()) {
      errors.name = tr('অনুগ্রহ করে আপনার পুরো নাম লিখুন।', 'Please enter your full name.');
    }
    if (!donor.email.trim()) {
      errors.email = tr('অনুগ্রহ করে আপনার ইমেল ঠিকানা লিখুন।', 'Please enter your email address.');
    } else if (!emailOk) {
      errors.email = tr('অনুগ্রহ করে একটি সঠিক ইমেল লিখুন।', 'Please enter a valid email address.');
    }
    if (!donor.phone.trim()) {
      errors.phone = tr('অনুগ্রহ করে আপনার ফোন নম্বর লিখুন।', 'Please enter your phone number.');
    } else if (!phoneOk) {
      errors.phone = tr('অনুগ্রহ করে একটি সঠিক ফোন নম্বর লিখুন।', 'Please enter a valid phone number.');
    }
    if (!amount || amount <= 0) {
      errors.amount = tr('অনুগ্রহ করে অনুদানের পরিমাণ বাছুন।', 'Please choose a donation amount.');
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormNotice(
        lang === 'bn'
          ? 'পেমেন্টে এগিয়ে যাওয়ার আগে অনুগ্রহ করে আপনার বিবরণ পূরণ করুন।'
          : 'Please fill in your basic details first to proceed.'
      );
      scrollTo('details-section');

      // Focus first missing field
      if (errors.name) {
        document.getElementById('donor-name')?.focus();
      } else if (errors.email) {
        document.getElementById('donor-email')?.focus();
      } else if (errors.phone) {
        document.getElementById('donor-phone')?.focus();
      }
      return;
    }

    setFormErrors({});
    setFormNotice('');

    if ((payOption === 'qr' || payOption === 'bank') && !utrRef.trim()) {
      setErrMsg(lang === 'bn' ? 'অনুগ্রহ করে আপনার UTR বা ট্রানজাকশন রেফারেন্স নম্বরটি লিখুন।' : 'Please enter your payment UTR / Transaction reference number.');
      setStatus('error');
      return;
    }

    setStatus('processing');
    setErrMsg('');

    try {
      if (payOption === 'qr' || payOption === 'bank') {
        const receiptNumber = `CSWO-DON-${Date.now().toString().slice(-8).toUpperCase()}`;
        const payMethodName = payOption === 'qr' ? 'Direct UPI QR' : 'Direct Bank Transfer';
        const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

        try {
          await supabase.from('cswo_donations').insert({
            donor_name: anonymous ? 'Anonymous' : (donor.name || 'Anonymous'),
            donor_email: donor.email,
            donor_phone: donor.phone,
            amount,
            purpose: cause.purpose,
            status: 'paid',
            payment_gateway: payOption === 'qr' ? 'upi_qr' : 'bank_transfer',
            receipt_number: receiptNumber,
            message: `UTR: ${utrRef}`,
            is_anonymous: anonymous,
            is_recurring: frequency === 'monthly',
          });
        } catch (dbErr) {
          console.warn('DB record error:', dbErr);
        }

        if (donor.email) {
          sendReceiptInvoiceEmail({
            recipientEmail: donor.email,
            recipientName: anonymous ? 'Valued Supporter' : (donor.name || 'Valued Supporter'),
            type: 'donation',
            amount,
            receiptNumber,
            purpose: cause.purpose,
            paymentMethod: payMethodName,
            paymentId: utrRef.trim(),
            date: dateStr,
          });
        }

        setCompletedReceipt({
          receiptNumber,
          amount,
          date: dateStr,
          name: anonymous ? 'Anonymous' : (donor.name || 'Anonymous'),
          purpose: cause.purpose,
          paymentMethod: payMethodName,
        });

        setStatus('done');
        setShowSuccessModal(true);
        return;
      }

      // Online Gateway Flow — wrap in 90s timeout to prevent infinite processing
      const PAYMENT_TIMEOUT_MS = 90_000;
      const paymentPromise = startPayment({
        gateway,
        action: 'create_donation_order',
        amount,
        purpose: cause.purpose,
        description: `${cause.en}${frequency === 'monthly' ? ' (Monthly)' : ''} — Narajole Chhatradol`,
        donorName: anonymous ? 'Anonymous' : (donor.name || 'Anonymous'),
        donorEmail: donor.email,
        donorPhone: donor.phone,
        isAnonymous: anonymous,
        isRecurring: frequency === 'monthly',
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(
          lang === 'bn'
            ? 'পেমেন্ট যাচাইকরণে অনেক সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
            : 'Payment verification is taking too long. Please try again.'
        )), PAYMENT_TIMEOUT_MS)
      );

      const res = await Promise.race([paymentPromise, timeoutPromise]);

      const receiptNumber = `CSWO-DON-${Date.now().toString().slice(-8).toUpperCase()}`;
      const payId = res.gateway === 'cashfree' ? res.result.payment?.paymentId : res.result.razorpay_payment_id;
      const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

      if (donor.email) {
        sendReceiptInvoiceEmail({
          recipientEmail: donor.email,
          recipientName: anonymous ? 'Valued Supporter' : (donor.name || 'Valued Supporter'),
          type: 'donation',
          amount,
          receiptNumber,
          purpose: cause.purpose,
          paymentMethod: res.gateway === 'cashfree' ? 'Cashfree Payments' : 'Razorpay',
          paymentId: payId,
          date: dateStr,
        });
      }

      setCompletedReceipt({
        receiptNumber,
        amount,
        date: dateStr,
        name: anonymous ? 'Anonymous' : (donor.name || 'Anonymous'),
        purpose: cause.purpose,
        paymentMethod: res.gateway === 'cashfree' ? 'Cashfree Payments' : 'Razorpay',
      });

      setStatus('done');
      setShowSuccessModal(true);
    } catch (err: unknown) {
      console.error('Payment failure:', err);
      const msg = err instanceof Error ? err.message : 'Payment error';
      setErrMsg(msg === 'CANCELLED' ? (lang === 'bn' ? 'পেমেন্ট বাতিল করা হয়েছে।' : 'Payment was cancelled.') : msg);
      setStatus('error');
    }
  };

  const upiDeepLink = `upi://pay?pa=${BANK_DETAILS.accountNumber}@hdfcbank&pn=CHHATRADOL%20SOCIAL%20WELFARE%20ORGANIZATION&am=${amount || 100}&cu=INR&tn=Donation`;

  return (
    <PageShell>
      {/* ── Breadcrumb (Clean Single Root) ── */}
      <Breadcrumb title={tr('অনুদান দিন', 'Donate')} />

      {/* ── Top Stepper (Clean & High Contrast - Fully Visible on Mobile & Desktop) ── */}
      <div className="bg-gradient-to-b from-[#fcfdfa] to-white border-b border-stone-200/70 py-2.5 sm:py-4 shadow-2xs">
        <div className="mx-auto max-w-[880px] px-2 sm:px-4">
          <div className="flex items-center justify-between gap-1 sm:gap-3">
            {/* Step 1 */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink min-w-0">
              <div className="flex h-6 w-6 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-[#0c756f] text-white font-black text-[10px] sm:text-sm shadow-md ring-2 sm:ring-4 ring-emerald-500/10">
                1
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] sm:text-[13.5px] font-black text-stone-900 leading-tight truncate">
                  {tr('আপনার বিবরণ', 'Your Details')}
                </p>
                <p className="text-[8.5px] sm:text-[11px] font-semibold text-stone-500 truncate">
                  {tr('বিবরণ পূরণ করুন', 'Fill in your details')}
                </p>
              </div>
            </div>

            <div className="h-[2px] flex-1 bg-emerald-300 rounded-full mx-1 sm:mx-2.5 min-w-[6px]" />

            {/* Step 2 */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink min-w-0">
              <div className={`flex h-6 w-6 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full font-black text-[10px] sm:text-sm transition-all ${
                donor.name.trim() && emailOk && phoneOk && amount > 0 ? 'bg-[#0c756f] text-white shadow-md' : 'bg-stone-100 text-stone-600 border border-stone-200'
              }`}>
                2
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] sm:text-[13.5px] font-black text-stone-900 leading-tight truncate">
                  {tr('পেমেন্ট', 'Payment')}
                </p>
                <p className="text-[8.5px] sm:text-[11px] font-semibold text-stone-500 truncate">
                  {tr('পেমেন্টের মাধ্যম বাছুন', 'Choose payment method')}
                </p>
              </div>
            </div>

            <div className="h-[2px] flex-1 bg-stone-200 rounded-full mx-1 sm:mx-2.5 min-w-[6px]" />

            {/* Step 3 */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink min-w-0">
              <div className="flex h-6 w-6 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-400 font-black text-[10px] sm:text-sm border border-stone-200">
                3
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] sm:text-[13.5px] font-black text-stone-400 leading-tight truncate">
                  {tr('নিশ্চিতকরণ', 'Confirmation')}
                </p>
                <p className="text-[8.5px] sm:text-[11px] font-medium text-stone-400 truncate">
                  {tr('ধন্যবাদ!', 'Thank you!')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Donation Form (Responsive 2-Column Layout) ── */}
      <section className="mx-auto max-w-[1240px] px-3 sm:px-6 py-6 sm:py-8 lg:py-10">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12 items-start">
          
          {/* ══════════════════════════════════════════════════════════════════
              LEFT COLUMN: 1. Purpose, 2. Amount, 3. Your Details
             ══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-5 sm:space-y-6 lg:col-span-6 xl:col-span-6">
            
            {/* 1. Select Donation Purpose */}
            <div className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                    <span className="text-[#0c756f]">1.</span>
                    <span>{tr('অনুদানের উদ্দেশ্য নির্বাচন করুন', 'Select Donation Purpose')}</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-500 font-semibold mt-0.5">
                    {tr('যে ক্ষেত্রে আপনার সাহায্য সরাসরি পৌঁছাবে', 'Choose the cause you want to support directly')}
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-stone-400 bg-stone-50 px-2.5 py-1 rounded-full border border-stone-200/60">
                  {cause.purpose}
                </span>
              </div>

              {/* Purpose Cards: 2-cols on mobile, 3-cols on tablet/desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {CAUSES.map((c) => {
                  const active = causeKey === c.key;
                  const IconComp = c.icon;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCauseKey(c.key)}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 p-2.5 sm:p-3 text-center transition-all duration-200 cursor-pointer active:scale-95 min-h-[82px] sm:min-h-[90px] ${
                        active
                          ? 'border-[#00a35c] bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/10'
                          : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                      }`}
                    >
                      {active && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded-full bg-[#00a35c] text-white shadow-xs">
                          <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[3]" />
                        </span>
                      )}
                      <div className={`mb-1 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl transition-colors ${
                        active ? 'bg-emerald-100/80 text-[#00a35c]' : 'bg-stone-100 text-stone-600'
                      }`}>
                        <IconComp className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                      </div>
                      <span className={`text-[11.5px] sm:text-[12.5px] font-black leading-tight px-0.5 text-center ${active ? 'text-stone-900' : 'text-stone-700'}`}>
                        {lang === 'en' ? c.en : c.bn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Choose Amount */}
            <div className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                    <span className="text-[#0c756f]">2.</span>
                    <span>{tr('পরিমাণ নির্বাচন করুন', 'Choose Amount')}</span>
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-500 font-semibold mt-0.5">
                    {tr('যেকোনো পরিমাণের সাহায্য অত্যন্ত মূল্যবান', 'Every contribution creates real impact')}
                  </p>
                </div>

                {/* Frequency Pill Switcher */}
                <div className="flex items-center rounded-xl bg-stone-100 p-1 border border-stone-200/70 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFrequency('once')}
                    className={`rounded-lg px-2.5 sm:px-3 py-1 text-[10.5px] sm:text-[11.5px] font-black transition-all cursor-pointer ${
                      frequency === 'once' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {tr('একবার', 'One-time')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequency('monthly')}
                    className={`rounded-lg px-2.5 sm:px-3 py-1 text-[10.5px] sm:text-[11.5px] font-black transition-all cursor-pointer ${
                      frequency === 'monthly' ? 'bg-[#0c756f] text-white shadow-xs' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    {tr('মাসিক', 'Monthly')}
                  </button>
                </div>
              </div>

              {/* 6 Preset Cards */}
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                {AMOUNTS.map((a) => {
                  const active = picked === a.v && !custom;
                  return (
                    <button
                      key={a.v}
                      type="button"
                      onClick={() => {
                        setPicked(a.v);
                        setCustom('');
                      }}
                      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 p-2 sm:p-3 text-center transition-all duration-200 cursor-pointer active:scale-95 ${
                        active
                          ? 'border-[#00a35c] bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/10'
                          : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/50'
                      }`}
                    >
                      {active && (
                        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 sm:h-4.5 sm:w-4.5 items-center justify-center rounded-full bg-[#00a35c] text-white shadow-xs">
                          <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[3]" />
                        </span>
                      )}
                      <span className={`font-arvo font-bold text-[16px] sm:text-[18px] tracking-tight ${active ? 'text-[#00a35c]' : 'text-stone-900'}`}>
                        ₹{a.v.toLocaleString('en-IN')}
                      </span>
                      <span className="font-sans font-semibold text-[10px] sm:text-[11px] text-stone-500 mt-0.5 leading-tight truncate w-full px-0.5">
                        {lang === 'en' ? a.en : a.bn}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Input (No wrapping on INR tag) */}
              <div className="mt-3 flex items-center rounded-2xl border-2 border-stone-200 bg-stone-50/60 px-3.5 py-2.5 sm:py-3 focus-within:border-[#00a35c] focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                <span className="text-base font-black text-stone-500 mr-2 shrink-0">₹</span>
                <input
                  type="number"
                  placeholder={tr('নিজের ইচ্ছেমতো পরিমাণ লিখুন', 'Enter custom amount')}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  min="10"
                  className="w-full bg-transparent text-xs sm:text-sm font-black text-stone-900 placeholder:text-stone-400 focus:outline-none min-w-0"
                />
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider shrink-0 whitespace-nowrap ml-2">
                  INR
                </span>
              </div>
            </div>

            {/* 3. Your Details */}
            <div id="details-section" className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                <span className="text-[#0c756f]">3.</span>
                <span>{tr('আপনার বিবরণ', 'Your Details')}</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-stone-500 font-semibold mt-0.5 mb-3.5">
                {tr('রসিদ ও নিশ্চিতকরণের জন্য আপনার তথ্য দিন', 'Enter your contact details for official invoice & receipt')}
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {tr('পুরো নাম *', 'Full Name *')}
                  </label>
                  <input
                    id="donor-name"
                    type="text"
                    placeholder={tr('আপনার পুরো নাম', 'Enter your full name')}
                    value={donor.name}
                    onChange={setField('name')}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                      formErrors.name
                        ? 'border-rose-400 bg-rose-50/20 text-stone-900 focus:ring-2 focus:ring-rose-400'
                        : 'border-stone-300 bg-stone-50/40 text-stone-800 focus:bg-white focus:ring-2 focus:ring-[#00a35c]'
                    }`}
                  />
                  {formErrors.name && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 animate-fade-in">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {tr('ইমেল ঠিকানা *', 'Email Address *')}
                  </label>
                  <input
                    id="donor-email"
                    type="email"
                    placeholder={tr('আপনার ইমেল (রসিদ পাঠানোর জন্য)', 'Enter your email')}
                    value={donor.email}
                    onChange={setField('email')}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                      formErrors.email
                        ? 'border-rose-400 bg-rose-50/20 text-stone-900 focus:ring-2 focus:ring-rose-400'
                        : 'border-stone-300 bg-stone-50/40 text-stone-800 focus:bg-white focus:ring-2 focus:ring-[#00a35c]'
                    }`}
                  />
                  {formErrors.email && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 animate-fade-in">{formErrors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {tr('ফোন নম্বর *', 'Phone Number *')}
                  </label>
                  <input
                    id="donor-phone"
                    type="tel"
                    placeholder={tr('আপনার ফোন নম্বর', 'Enter your phone number')}
                    value={donor.phone}
                    onChange={setField('phone')}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                      formErrors.phone
                        ? 'border-rose-400 bg-rose-50/20 text-stone-900 focus:ring-2 focus:ring-rose-400'
                        : 'border-stone-300 bg-stone-50/40 text-stone-800 focus:bg-white focus:ring-2 focus:ring-[#00a35c]'
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 animate-fade-in">{formErrors.phone}</p>
                  )}
                </div>

                {/* Checkboxes */}
                <div className="pt-1.5 space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wantReceipt}
                      onChange={(e) => setWantReceipt(e.target.checked)}
                      className="h-4 w-4 rounded text-[#00a35c] focus:ring-[#00a35c]"
                    />
                    <span className="text-xs font-bold text-stone-700 flex items-center gap-1">
                      {tr('আমি ৮০জি কর-রসিদ চাই', 'I want 80G tax receipt')}
                      <span className="text-[10.5px] font-normal text-stone-400">({tr('শীঘ্রই', 'Coming Soon')})</span>
                      <Info className="h-3.5 w-3.5 text-stone-400" />
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="h-4 w-4 rounded text-[#00a35c] focus:ring-[#00a35c] mt-0.5"
                    />
                    <span className="text-xs font-bold text-stone-700">
                      {tr('নাম প্রকাশ না করে দান করুন', 'Donate anonymously')}
                      <span className="block text-[10.5px] font-normal text-stone-400">
                        {tr('আপনার নাম পাবলিক তালিকায় দেখা যাবে না।', 'Your name will not appear in public lists.')}
                      </span>
                    </span>
                  </label>
                </div>

                {/* Fill-Details Prompt Banner */}
                {formNotice && (
                  <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-xs font-bold text-amber-900 flex items-center gap-2 animate-fade-in shadow-2xs">
                    <Info className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>{formNotice}</span>
                  </div>
                )}

                {/* Primary CTA Submit Button (Always Active & Responsive) */}
                <button
                  type="submit"
                  disabled={status === 'processing'}
                  className="mt-3 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#0c756f] to-[#095a55] hover:from-[#095a55] hover:to-[#074743] py-3.5 sm:py-4 text-xs sm:text-base font-black text-white shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'processing' ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      {tr('প্রসেস হচ্ছে…', 'Processing…')}
                    </span>
                  ) : (
                    <>
                      <span>{tr(`পেমেন্টে এগিয়ে যান (₹${amountFmt})`, `Proceed to Payment ₹${amountFmt}`)}</span>
                      <ArrowRight className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT COLUMN: 4. Choose Payment Method & 5. Frequently Asked Questions
             ══════════════════════════════════════════════════════════════════ */}
          <div className="space-y-5 sm:space-y-6 lg:col-span-6 xl:col-span-6">
            
            {/* 4. Choose Payment Method Card */}
            <div className="rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-white p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-3.5">
                <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                  <span className="text-[#0c756f]">4.</span>
                  <span>{tr('পেমেন্ট মাধ্যম বেছে নিন', 'Choose Payment Method')}</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-stone-500 font-semibold mt-0.5">
                  {tr('আপনার পছন্দের সুবিধাজনক মাধ্যমটি নির্বাচন করুন', 'Select your preferred payment option')}
                </p>
              </div>

              <div className="space-y-3">
                {/* ── Option 1: Pay Securely Online ── */}
                <button
                  type="button"
                  onClick={() => setPayOption('gateway')}
                  className={`w-full text-left rounded-2xl border-2 p-3.5 sm:p-4 cursor-pointer transition-all duration-200 ${
                    payOption === 'gateway'
                      ? 'border-[#00a35c] bg-white shadow-md ring-2 ring-emerald-500/10'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      {/* Radio */}
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          payOption === 'gateway' ? 'border-[#00a35c]' : 'border-stone-300'
                        }`}
                      >
                        {payOption === 'gateway' && <span className="h-2.5 w-2.5 rounded-full bg-[#00a35c]" />}
                      </span>

                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-[13.5px] font-black text-stone-900 truncate">
                          {tr('অনলাইনে নিরাপদে পে করুন', 'Pay Securely Online')}
                        </h4>
                        <p className="text-[10.5px] sm:text-[11px] font-semibold text-stone-500 truncate">
                          {tr('UPI, Cards, NetBanking ও Wallets', 'UPI, Cards, NetBanking & Wallets')}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-black text-emerald-800 uppercase tracking-wider shrink-0 whitespace-nowrap">
                      {tr('প্রস্তাবিত', 'Recommended')}
                    </span>
                  </div>

                  {/* Payment Brands Row */}
                  <div className="mt-2.5 flex items-center gap-2 pt-2 border-t border-stone-100 overflow-x-auto no-scrollbar">
                    <img src="/assets/payment/upi.svg" alt="UPI" className="h-3.5 w-auto object-contain shrink-0" />
                    <img src="/assets/payment/visa.svg" alt="VISA" className="h-3.5 w-auto object-contain shrink-0" />
                    <img src="/assets/payment/mastercard.svg" alt="Mastercard" className="h-3.5 w-auto object-contain shrink-0" />
                    <img src="/assets/payment/rupay.svg" alt="RuPay" className="h-3.5 w-auto object-contain shrink-0" />
                    <img src="/assets/payment/paytm.svg" alt="Paytm" className="h-3.5 w-auto object-contain shrink-0" />
                  </div>
                </button>

                {/* ── Option 2: Scan & Pay (UPI QR) ── */}
                <button
                  type="button"
                  onClick={() => setPayOption('qr')}
                  className={`w-full text-left rounded-2xl border-2 p-3.5 sm:p-4 cursor-pointer transition-all duration-200 ${
                    payOption === 'qr'
                      ? 'border-[#00a35c] bg-white shadow-md ring-2 ring-emerald-500/10'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    {/* Radio */}
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        payOption === 'qr' ? 'border-[#00a35c]' : 'border-stone-300'
                      }`}
                    >
                      {payOption === 'qr' && <span className="h-2.5 w-2.5 rounded-full bg-[#00a35c]" />}
                    </span>

                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-[13.5px] font-black text-stone-900">
                        {tr('স্ক্যান করে পে করুন (UPI QR)', 'Scan & Pay (UPI QR)')}
                      </h4>
                      <p className="text-[10.5px] sm:text-[11px] font-semibold text-stone-500">
                        {tr('যেকোনো UPI অ্যাপ দিয়ে স্ক্যান করুন', 'Scan using any UPI app')}
                      </p>
                    </div>
                  </div>

                  {/* UPI Apps Row */}
                  <div className="mt-2.5 flex items-center gap-3 pl-7 sm:pl-8 overflow-x-auto no-scrollbar">
                    <img src="/assets/payment/gpay.svg" alt="GPay" className="h-3.5 w-auto object-contain shrink-0" />
                    <img src="/assets/payment/phonepe.svg" alt="PhonePe" className="h-3.5 w-auto object-contain shrink-0" />
                    <img src="/assets/payment/paytm.svg" alt="Paytm" className="h-3.5 w-auto object-contain shrink-0" />
                    <img src="/assets/payment/upi.svg" alt="BHIM UPI" className="h-3.5 w-auto object-contain shrink-0" />
                  </div>

                  {/* Expanded QR Box when active */}
                  {payOption === 'qr' && (
                    <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col items-center text-center animate-fade-in">
                      <div className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
                        <img
                          src="/assets/payment/cswo-qr.png"
                          alt="CSWO UPI QR"
                          className="h-40 w-40 sm:h-44 sm:w-44 object-contain rounded-xl"
                        />
                      </div>
                      <p className="mt-2.5 font-mono text-xs font-black text-stone-800 break-all px-2">
                        UPI ID: <span className="text-[#0c756f]">{BANK_DETAILS.accountNumber}@hdfcbank</span>
                      </p>
                      <p className="text-[10.5px] sm:text-[11px] font-semibold text-stone-400 mt-0.5">
                        {tr('স্ক্যান করে আপনার পেমেন্ট সম্পন্ন করুন', 'Scan and complete your payment')}
                      </p>

                      <div className="mt-2.5 block sm:hidden w-full">
                        <a
                          href={upiDeepLink}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#0c756f] py-2 text-xs font-extrabold text-white shadow-sm"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          {tr('UPI অ্যাপে খুলুন', 'Open in UPI App')}
                        </a>
                      </div>

                      {/* UTR Input */}
                      <div className="mt-3.5 w-full text-left">
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          {tr('পেমেন্ট রেফারেন্স / UTR নম্বর *', 'Payment Reference / UTR Number *')}
                        </label>
                        <input
                          type="text"
                          placeholder={tr('১২-সংখ্যার UTR বা ট্রানজাকশন আইডি লিখুন', 'Enter 12-digit UTR or Txn ID')}
                          value={utrRef}
                          onChange={(e) => setUtrRef(e.target.value)}
                          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00a35c]"
                        />
                      </div>
                    </div>
                  )}
                </button>

                {/* ── Option 3: Bank Transfer ── */}
                <button
                  type="button"
                  onClick={() => setPayOption('bank')}
                  className={`w-full text-left rounded-2xl border-2 p-3.5 sm:p-4 cursor-pointer transition-all duration-200 ${
                    payOption === 'bank'
                      ? 'border-[#00a35c] bg-white shadow-md ring-2 ring-emerald-500/10'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    {/* Radio */}
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        payOption === 'bank' ? 'border-[#00a35c]' : 'border-stone-300'
                      }`}
                    >
                      {payOption === 'bank' && <span className="h-2.5 w-2.5 rounded-full bg-[#00a35c]" />}
                    </span>

                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-[13.5px] font-black text-stone-900">
                        {tr('ব্যাংক ট্রান্সফার', 'Bank Transfer')}
                      </h4>
                      <p className="text-[10.5px] sm:text-[11px] font-semibold text-stone-500">
                        {tr('সরাসরি আমাদের ব্যাংক অ্যাকাউন্টে ট্রান্সফার করুন', 'Transfer directly to our bank account')}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Bank Box when active */}
                  {payOption === 'bank' && (
                    <div className="mt-4 pt-3 border-t border-stone-100 animate-fade-in">
                      <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3.5 sm:p-4 text-xs font-semibold space-y-2.5">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-200/60 gap-2">
                          <span className="text-stone-400 uppercase text-[9px] sm:text-[9.5px] font-bold tracking-wider shrink-0">{tr('অ্যাকাউন্টের নাম', 'Account Name')}</span>
                          <span className="font-mono font-black text-stone-900 text-right text-[11px] sm:text-[11.5px] break-words">{BANK_DETAILS.accountName}</span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-stone-200/60 gap-2">
                          <span className="text-stone-400 uppercase text-[9px] sm:text-[9.5px] font-bold tracking-wider shrink-0">{tr('ব্যাংকের নাম', 'Bank Name')}</span>
                          <span className="font-bold text-stone-800 text-right">{BANK_DETAILS.bankName}</span>
                        </div>

                        <div className="flex justify-between items-center pb-2 border-b border-stone-200/60 gap-2">
                          <span className="text-stone-400 uppercase text-[9px] sm:text-[9.5px] font-bold tracking-wider shrink-0">{tr('অ্যাকাউন্ট নম্বর', 'Account Number')}</span>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="font-mono font-black text-[#0c756f] text-xs sm:text-[13px]">{BANK_DETAILS.accountNumber}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard('acc', BANK_DETAILS.accountNumber)}
                              className="flex items-center gap-1 rounded-md bg-stone-200/70 px-2 py-0.5 text-[9.5px] sm:text-[10px] font-black text-stone-700 hover:bg-stone-300 cursor-pointer shrink-0"
                            >
                              {copiedKey === 'acc' ? <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedKey === 'acc' ? tr('কপি হয়েছে!', 'Copied!') : tr('কপি', 'Copy')}</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex justify-between items-center gap-2">
                          <span className="text-stone-400 uppercase text-[9px] sm:text-[9.5px] font-bold tracking-wider shrink-0">{tr('IFSC কোড', 'IFSC Code')}</span>
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span className="font-mono font-black text-stone-900 text-xs sm:text-[13px]">{BANK_DETAILS.ifsc}</span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard('ifsc', BANK_DETAILS.ifsc)}
                              className="flex items-center gap-1 rounded-md bg-stone-200/70 px-2 py-0.5 text-[9.5px] sm:text-[10px] font-black text-stone-700 hover:bg-stone-300 cursor-pointer shrink-0"
                            >
                              {copiedKey === 'ifsc' ? <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> : <Copy className="h-3 w-3" />}
                              <span>{copiedKey === 'ifsc' ? tr('কপি হয়েছে!', 'Copied!') : tr('কপি', 'Copy')}</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* UTR Input */}
                      <div className="mt-3.5">
                        <label className="block text-xs font-bold text-stone-700 mb-1">
                          {tr('ব্যাংক ট্রানজাকশন / UTR নম্বর *', 'Bank Transaction / UTR Number *')}
                        </label>
                        <input
                          type="text"
                          placeholder={tr('ট্রান্সফারের পর ব্যাংক থেকে প্রাপ্ত UTR নম্বর লিখুন', 'Enter UTR number received from bank')}
                          value={utrRef}
                          onChange={(e) => setUtrRef(e.target.value)}
                          className="w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00a35c]"
                        />
                      </div>
                    </div>
                  )}
                </button>
              </div>

              {/* Removed Inline Error Alert - Now replaced by a Modal */}
            </div>

            {/* ── 5. Frequently Asked Questions ── */}
            <div className="space-y-5 sm:space-y-6 pt-6 sm:pt-8 mt-2 sm:mt-4">
              <h2 className="font-serif text-xl sm:text-[26px] font-normal text-stone-900 tracking-tight px-1 mb-2">
                {tr('সাধারণ জিজ্ঞাসা', 'Frequently Asked Questions')}
              </h2>

              <div className="rounded-2xl border border-stone-200/90 bg-white shadow-2xs divide-y divide-stone-200/80 overflow-hidden">
                {FAQS.map((faq, idx) => {
                  const isOpen = openFaq === idx;
                  return (
                    <div key={idx} className="transition-colors">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : idx)}
                        className="flex w-full items-start justify-between p-3.5 sm:p-4.5 text-left transition-colors hover:bg-stone-50/50 gap-2.5 cursor-pointer"
                      >
                        <span className="font-sans text-xs sm:text-[13.5px] font-semibold text-stone-900 leading-snug">
                          {lang === 'en' ? faq.qEn : faq.qBn}
                        </span>
                        <span className={`text-base font-normal transition-colors shrink-0 ${isOpen ? 'text-amber-700 font-bold' : 'text-stone-400'}`}>
                          {isOpen ? '×' : '+'}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-3.5 pb-3.5 sm:px-4.5 sm:pb-4.5 pt-0 text-xs sm:text-[13px] text-stone-600 leading-relaxed animate-fade-in font-sans">
                          {lang === 'en' ? faq.aEn : faq.aBn}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── We Accept Infinite Looping Ticker Marquee ── */}
              <div className="rounded-2xl border border-stone-200/90 bg-white p-3.5 sm:p-5 shadow-2xs overflow-hidden relative">
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-3 text-center">
                  {tr('আমরা গ্রহণ করি', 'WE ACCEPT')}
                </p>

                {/* Left & Right Gradient Fade Masks */}
                <div className="pointer-events-none absolute left-0 top-8 bottom-0 w-8 sm:w-10 bg-gradient-to-r from-white to-transparent z-10" />
                <div className="pointer-events-none absolute right-0 top-8 bottom-0 w-8 sm:w-10 bg-gradient-to-l from-white to-transparent z-10" />

                <div className="flex overflow-hidden select-none w-full">
                  <div className="animate-marquee flex items-center gap-5 sm:gap-8 shrink-0">
                    {[
                      { name: 'UPI', src: '/assets/payment/upi.svg', h: 'h-4 sm:h-5' },
                      { name: 'Google Pay', src: '/assets/payment/gpay.svg', h: 'h-4 sm:h-5' },
                      { name: 'PhonePe', src: '/assets/payment/phonepe.svg', h: 'h-4 sm:h-5' },
                      { name: 'Paytm', src: '/assets/payment/paytm.svg', h: 'h-4 sm:h-5' },
                      { name: 'VISA', src: '/assets/payment/visa.svg', h: 'h-4 sm:h-5' },
                      { name: 'Mastercard', src: '/assets/payment/mastercard.svg', h: 'h-4 sm:h-5' },
                      { name: 'RuPay', src: '/assets/payment/rupay.svg', h: 'h-4 sm:h-5' },
                      { name: 'Cashfree', src: '/assets/payment/cashfree.svg', h: 'h-3.5 sm:h-4' },
                      { name: 'Razorpay', src: '/assets/payment/razorpay.svg', h: 'h-3.5 sm:h-4' },
                      { name: 'UPI', src: '/assets/payment/upi.svg', h: 'h-4 sm:h-5' },
                      { name: 'Google Pay', src: '/assets/payment/gpay.svg', h: 'h-4 sm:h-5' },
                      { name: 'PhonePe', src: '/assets/payment/phonepe.svg', h: 'h-4 sm:h-5' },
                      { name: 'Paytm', src: '/assets/payment/paytm.svg', h: 'h-4 sm:h-5' },
                      { name: 'VISA', src: '/assets/payment/visa.svg', h: 'h-4 sm:h-5' },
                      { name: 'Mastercard', src: '/assets/payment/mastercard.svg', h: 'h-4 sm:h-5' },
                      { name: 'RuPay', src: '/assets/payment/rupay.svg', h: 'h-4 sm:h-5' },
                      { name: 'Cashfree', src: '/assets/payment/cashfree.svg', h: 'h-3.5 sm:h-4' },
                      { name: 'Razorpay', src: '/assets/payment/razorpay.svg', h: 'h-3.5 sm:h-4' }
                    ].map((logo, idx) => (
                      <div key={idx} className="flex items-center justify-center shrink-0 px-1.5 sm:px-2">
                        <img
                          src={logo.src}
                          alt={logo.name}
                          className={`${logo.h} w-auto object-contain max-w-[75px] sm:max-w-[85px] opacity-85 hover:opacity-100 transition-opacity`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </form>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ERROR / CANCELLED POPUP MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {status === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-[420px] rounded-[24px] bg-white p-6 sm:p-8 shadow-2xl border border-stone-100 text-center animate-scale-up my-auto">
            
            {/* Top Graphics (Concentric Red Rings) */}
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-red-100/60 animate-ping opacity-30" />
              <div className="absolute inset-2 rounded-full bg-red-50 border border-red-100" />
              
              {/* Center X mark */}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#c81e1e] text-white shadow-md">
                <X className="h-6 w-6 stroke-[3]" />
              </div>
            </div>

            {/* Headings */}
            <h3 className="text-xl sm:text-[22px] font-black text-stone-900 tracking-tight leading-snug px-2">
              {errMsg === 'CANCELLED' ? tr('পেমেন্ট বাতিল করা হয়েছে।', 'Payment was cancelled.') : tr('পেমেন্ট ব্যর্থ হয়েছে।', 'Payment Failed.')}
            </h3>

            {errMsg && errMsg !== 'CANCELLED' && (
              <div className="mt-3 mx-4 rounded-xl bg-red-50 border border-red-100 p-3">
                <p className="text-[12px] font-bold text-red-800 break-words leading-relaxed">
                  {errMsg}
                </p>
              </div>
            )}

            <p className="text-[13px] font-medium text-stone-500 mt-3 px-2 leading-relaxed">
              {tr('কোনো চিন্তা নেই! আপনার পেমেন্ট সম্পন্ন হয়নি। আপনি যেকোনো সময় আবার চেষ্টা করতে পারেন।', 'No worries! Your payment was not completed. You can try again anytime.')}
            </p>

            {/* Buttons */}
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatus('idle');
                  setErrMsg('');
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#c81e1e] py-3 text-[13px] font-bold text-white shadow-sm hover:bg-[#a51515] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                {tr('আবার চেষ্টা করুন', 'Try Again')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('idle');
                  setErrMsg('');
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white py-3 text-[13px] font-bold text-stone-700 shadow-sm border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                {tr('ফিরে যান', 'Go Back')}
              </button>
            </div>

            {/* Footer Trust Banner */}
            <div className="mt-6 border-t border-stone-100 pt-5">
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-500 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[12px] font-bold text-stone-700">
                    {tr('আপনার নিরাপত্তা আমাদের অগ্রাধিকার।', 'Your security is our priority.')}
                  </p>
                  <p className="text-[11px] font-medium text-stone-400">
                    {tr('আপনার সমস্ত তথ্য আমাদের কাছে নিরাপদ।', 'All your details are safe with us.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUCCESS POPUP MODAL (Clean, Professional, Confetti Animated)
         ══════════════════════════════════════════════════════════════════════ */}
      {showSuccessModal && completedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-3xl bg-white p-5 sm:p-8 shadow-2xl border border-stone-100 text-center animate-scale-up my-auto max-h-[94vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 rounded-full p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Top Celebration Graphics (Concentric Mint Rings) */}
            <div className="relative mx-auto mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-100/70 animate-ping opacity-25" />
              <div className="absolute inset-1.5 rounded-full bg-emerald-50 border border-emerald-200" />
              
              {/* Center Checkmark */}
              <div className="relative flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-[#00a35c] text-white shadow-md">
                <Check className="h-6 w-6 sm:h-7 sm:w-7 stroke-[3]" />
              </div>
            </div>

            {/* Headings */}
            <h3 className="text-lg sm:text-2xl font-black text-stone-900 tracking-tight leading-snug px-2">
              {tr('ধন্যবাদ! আপনার অনুদান সফলভাবে নিশ্চিত হয়েছে।', 'Thank You! Your contribution is confirmed.')}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-stone-500 mt-1 px-2">
              {tr('আপনার সহায়তা একটি সুন্দর আগামী গড়ে তুলতে সাহায্য করবে।', 'Your support helps us create a better tomorrow.')}
            </p>

            {/* Official Email Invoice Banner */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50/90 border border-emerald-200/80 p-3 sm:p-3.5 text-left">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                <Mail className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-[13px] font-black text-stone-900 leading-tight">
                  {tr('অফিশিয়াল রসিদ ও ইনভয়েস আপনার ইমেলে পাঠানো হয়েছে।', 'Official receipt & invoice has been sent to your email.')}
                </p>
                <p className="text-[10.5px] sm:text-[11px] font-semibold text-stone-500 mt-0.5">
                  {tr('বিস্তারিত জানতে আপনার ইনবক্স (বা স্প্যাম ফোল্ডার) চেক করুন।', 'Please check your inbox (and spam folder) for the details.')}
                </p>
              </div>
            </div>

            {/* Transaction Details 3-Column Responsive Card (Fully Visible, No Truncation) */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 rounded-2xl border border-stone-200/90 bg-stone-50/70 p-3 sm:p-3.5 text-left">
              {/* Col 1: Transaction ID */}
              <div className="flex items-center gap-2.5 p-1">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                  <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider text-stone-400">
                    {tr('ট্রানজাকশন আইডি', 'Transaction ID')}
                  </p>
                  <p className="font-mono text-xs sm:text-[12.5px] font-black text-stone-900 select-all whitespace-nowrap">
                    {completedReceipt.receiptNumber}
                  </p>
                </div>
              </div>

              {/* Col 2: Date */}
              <div className="flex items-center gap-2.5 p-1 border-t sm:border-t-0 sm:border-l border-stone-200/60 pt-2 sm:pt-0 sm:pl-3">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider text-stone-400">
                    {tr('তারিখ', 'Date')}
                  </p>
                  <p className="text-xs sm:text-[12.5px] font-black text-stone-900 whitespace-nowrap">
                    {completedReceipt.date.split(',')[0]}
                  </p>
                </div>
              </div>

              {/* Col 3: Amount */}
              <div className="flex items-center gap-2.5 p-1 border-t sm:border-t-0 sm:border-l border-stone-200/60 pt-2 sm:pt-0 sm:pl-3">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                  <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider text-stone-400">
                    {tr('পরিমাণ', 'Amount')}
                  </p>
                  <p className="text-xs sm:text-[15px] font-black text-[#00a35c] whitespace-nowrap">
                    ₹{completedReceipt.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Single Prominent Action Button: Download / Print Receipt */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() =>
                  printReceipt(
                    {
                      receiptNumber: completedReceipt.receiptNumber,
                      type: 'donation',
                      name: completedReceipt.name,
                      amount: completedReceipt.amount,
                      date: completedReceipt.date,
                      purpose: completedReceipt.purpose,
                      paymentMethod: completedReceipt.paymentMethod,
                      email: donor.email,
                    },
                    lang as 'en' | 'bn',
                  )
                }
                className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#0c756f] to-[#095a55] hover:from-[#095a55] hover:to-[#074743] py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white shadow-lg hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer"
              >
                <FileText className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                <span>{tr('অফিশিয়াল রসিদ ডাউনলোড / প্রিন্ট করুন', 'Download / Print Official Receipt')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
