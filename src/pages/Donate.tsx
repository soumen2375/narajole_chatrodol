import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { PageShell, PageHero } from './_field-journal';
import { startPayment, type UnifiedPaymentResult } from '@/lib/payments';
import { loadRazorpayScript } from '@/lib/razorpay';
import { loadCashfreeScript } from '@/lib/cashfree';
import type { PaymentGateway } from '@/types';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';
import Breadcrumb from '@/components/ui/Breadcrumb';
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
  ShieldCheck,
  Info,
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

// Each tier doubles as an amount picker: tapping a card fills the form in.
const TIERS = [
  {
    v: 300, causeKey: 'education', catEn: 'Education', catBn: 'শিক্ষা',
    en: 'Provide a School Kit', bn: 'একটি শিশুর জন্য নতুন স্কুল কিট',
    descEn: 'Give a child the essentials needed for school notebooks, pens, educational supplies and a school bag so they can begin their studies with confidence.',
    descBn: 'খাতা, কলম আর ব্যাগ — একটি শিশু যেন প্রস্তুত হয়ে বছর শুরু করতে পারে।',
    img: '/assets/images/service/post-34-students-book-support.jpg',
  },
  {
    v: 500, causeKey: 'environment', catEn: 'Environment', catBn: 'পরিবেশ',
    en: 'Support a Community Clean Up', bn: '২০ কেজি বর্জ্য সংগ্রহ',
    descEn: 'Support a local clean up initiative, helping collect and responsibly dispose of approximately 20 kg of waste while promoting cleaner and healthier communities.',
    descBn: 'একটি পাড়া পরিচ্ছন্নতা অভিযান — সংগ্রহ থেকে নিরাপদ নিষ্কাশন পর্যন্ত।',
    img: '/assets/images/service/post-clean-up.jpg',
  },
  {
    v: 1000, causeKey: 'environment', catEn: 'Environment', catBn: 'পরিবেশ',
    en: 'Plant 10 Trees', bn: '১০টি গাছ রোপণ',
    descEn: 'Help us plant and nurture 10 trees in local communities. Your contribution supports saplings, tree guards and essential care to help them grow.',
    descBn: 'চারা, বেড়া আর এক মরসুমের পরিচর্যা — গ্রামের পুকুরপাড় ঘিরে।',
    img: '/assets/images/service/tree_plantations.jpg',
  },
  {
    v: 2000, causeKey: 'education', catEn: 'Education', catBn: 'শিক্ষা',
    en: 'Support a Student’s Education', bn: 'মাসিক শিক্ষা সহায়তা',
    descEn: 'Help provide a student with one month of educational support, including learning materials, guidance and mentoring.',
    descBn: 'একজন শিক্ষার্থীর এক মাসের কোচিং, শিক্ষাসামগ্রী ও দিকনির্দেশনা।',
    img: '/assets/images/impacts/education.jpg',
  },
  {
    v: 5000, causeKey: 'healthcare', catEn: 'Health', catBn: 'স্বাস্থ্য',
    en: 'Support a Blood Donation Camp', bn: 'একটি রক্তদান শিবিরে সহায়তা',
    descEn: 'Your contribution can help us organize a blood donation camp by supporting essential requirements such as screening kits, medical supplies, refreshments and other logistics.',
    descBn: 'আপনার অনুদানে একটি রক্তদান শিবিরের স্ক্রিনিং কিট, চিকিৎসা সামগ্রী, জলখাবার ও অন্যান্য আয়োজনের খরচ বহন করা সম্ভব হয়।',
    img: '/assets/images/service/post-blood-donation-camp.jpg',
  },
  {
    v: 10000, causeKey: 'food', catEn: 'Relief', catBn: 'ত্রাণ',
    en: 'Provide Essential Relief to a Family', bn: 'একটি পরিবারকে জরুরি ত্রাণ সহায়তা',
    descEn: 'Your contribution can help us provide a comprehensive relief package to a family facing hardship, including essential food items, household necessities and other urgent support based on their needs.',
    descBn: 'সংকটে থাকা একটি পরিবারের জন্য চাল, ডাল, তেল সহ প্রয়োজনীয় খাদ্য, গৃহস্থালি সামগ্রী ও জরুরি সহায়তার সম্পূর্ণ ত্রাণ প্যাকেজ।',
    img: '/assets/images/service/post-30-tarpaulin-distribution.jpg',
  },
];

export const BANK_DETAILS = {
  accountName: 'CHHATRADOL SOCIAL WELFARE ORGANIZATION',
  accountNumber: '50200123995352',
  ifsc: 'HDFC0002593',
  bankName: 'HDFC Bank',
  branch: 'Medinipur',
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
  const routerLocation = useLocation();
  useSEO(SEO['/donate']);
  const tr = (bn: string, en: string) => (lang === 'en' ? en : bn);

  // Start on a real tier so the summary panel and the pre-selected amount agree.
  const DEFAULT_TIER = TIERS.find((t) => t.v === 1000) || TIERS[0];
  const [causeKey, setCauseKey] = useState(DEFAULT_TIER.causeKey);
  const [picked, setPicked] = useState<number>(DEFAULT_TIER.v);
  const [custom, setCustom] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('once');
  // The reference form has no anonymity/receipt toggles; the payload still reads this.
  const [anonymous] = useState(false);
  const [donor, setDonor] = useState({ name: '', email: '', phone: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [formNotice, setFormNotice] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState('');
  
  // Payment Method Selection
  // Checkout runs through the gateway only — the QR/UTR flow was removed from the UI.
  const [payOption] = useState<PaymentOption>('gateway');
  const [gateway] = useState<PaymentGateway>('cashfree');

  const [utrRef] = useState('');
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
    /** Real gateway transaction id (Cashfree cf_payment_id / Razorpay payment id) */
    transactionId?: string;
  } | null>(null);

  // Preload gateway SDK scripts on page mount so user clicks open instantly
  useEffect(() => {
    void loadRazorpayScript();
    void loadCashfreeScript();
  }, []);

  // Payment completed inside the entry popup (WelcomePopup): it hands the
  // verified receipt over in router state so the donor gets this page's real
  // success modal — confetti, printable receipt, "email me a copy" — instead
  // of a second, thinner copy of it living in the popup. Consumed once; the
  // history entry is scrubbed so a refresh does not replay it.
  useEffect(() => {
    const handed = (routerLocation.state as { cswoReceipt?: typeof completedReceipt } | null)?.cswoReceipt;
    if (!handed) return;
    setCompletedReceipt(handed);
    setStatus('done');
    setShowSuccessModal(true);
    window.history.replaceState({}, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefill from ?amount/&name/&phone/&email — the entry popup (WelcomePopup)
  // collects these on the poster card and hands them over so the donor never
  // types the same thing twice. An amount that matches a tier selects that
  // tier; anything else lands in the custom field.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const rawAmount = parseInt((q.get('amount') || '').replace(/\D/g, ''), 10);
    if (rawAmount > 0) {
      const tier = TIERS.find((t) => t.v === rawAmount);
      if (tier) { setPicked(tier.v); setCustom(''); setCauseKey(tier.causeKey); }
      else { setCustom(String(rawAmount)); }
    }
    const name = (q.get('name') || '').trim();
    const phone = (q.get('phone') || '').trim();
    const email = (q.get('email') || '').trim();
    if (name || phone || email) {
      setDonor((prev) => ({
        name: name || prev.name,
        phone: phone || prev.phone,
        email: email || prev.email,
      }));
    }
  }, []);

  const timedOutRef = useRef(false);

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

  // Tapping a cause card fills the amount in, then drops the donor straight
  // into the name field so they can keep going without hunting for the form.
  const pickTier = (tier: { v: number; causeKey: string }) => {
    setPicked(tier.v);
    setCustom('');
    setCauseKey(tier.causeKey);
    // setTimeout, not rAF: rAF never fires in a backgrounded tab, which would
    // leave the donor stranded on the card they just tapped.
    window.setTimeout(() => {
      const nameField = document.getElementById('donor-name') as HTMLInputElement | null;
      if (!nameField) return;
      nameField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      nameField.focus({ preventScroll: true });
    }, 0);
  };

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

  /**
   * Pulls the real gateway transaction id out of a unified payment result.
   * This is the id the donor can match against their bank/UPI statement and
   * the gateway dashboard — distinct from our own receipt number.
   */
  const extractTransactionId = (res: UnifiedPaymentResult): string | undefined =>
    res.gateway === 'cashfree'
      ? res.result.payment?.paymentId || undefined
      : res.result.razorpay_payment_id || undefined;

  /**
   * Prefers the method the gateway actually reported (e.g. "Cashfree (UPI)")
   * over a generic label, so the on-screen receipt matches the emailed one.
   */
  const extractPaymentMethod = (res: UnifiedPaymentResult): string =>
    res.gateway === 'cashfree'
      ? res.result.payment_method || 'Cashfree Payments'
      : 'Razorpay';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required basic details
    const errors: { name?: string; email?: string; phone?: string; amount?: string } = {};

    if (!donor.name.trim()) {
      errors.name = tr('অনুগ্রহ করে আপনার পুরো নাম লিখুন।', 'Please enter your full name.');
    }
    if (!donor.phone.trim()) {
      errors.phone = tr('অনুগ্রহ করে আপনার মোবাইল নম্বর লিখুন।', 'Please enter your mobile number.');
    } else if (!phoneOk) {
      errors.phone = tr('অনুগ্রহ করে একটি সঠিক মোবাইল নম্বর লিখুন।', 'Please enter a valid mobile number.');
    }
    // Email is optional — only validated when the donor actually fills it in,
    // since it is used solely to email the 80G receipt.
    if (donor.email.trim() && !emailOk) {
      errors.email = tr('অনুগ্রহ করে একটি সঠিক ইমেল লিখুন।', 'Please enter a valid email address.');
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
      } else if (errors.phone) {
        document.getElementById('donor-phone')?.focus();
      } else if (errors.email) {
        document.getElementById('donor-email')?.focus();
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
    timedOutRef.current = false;

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
      // Must exceed the gateway polling window in src/lib/cashfree.ts (~3 min),
      // or this race aborts a payment that is still legitimately being approved
      // in the donor's UPI app.
      const PAYMENT_TIMEOUT_MS = 200_000;
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
      }).then((r) => {
        if (timedOutRef.current) {
          // Late success after timeout: update modal and clear error
          const lateReceiptNumber =
            r.result.receipt_number || `CSWO-DON-${Date.now().toString().slice(-8).toUpperCase()}`;
          const lateDateStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
          setCompletedReceipt({
            receiptNumber: lateReceiptNumber,
            amount,
            date: lateDateStr,
            name: anonymous ? 'Anonymous' : (donor.name || 'Anonymous'),
            purpose: cause.purpose,
            paymentMethod: extractPaymentMethod(r),
            transactionId: extractTransactionId(r),
          });
          setStatus('done');
          setShowSuccessModal(true);
        }
        return r;
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => {
          timedOutRef.current = true;
          reject(new Error(
            lang === 'bn'
              ? 'পেমেন্ট যাচাইকরণে অনেক সময় লাগছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
              : 'Payment verification is taking too long. Please try again.'
          ));
        }, PAYMENT_TIMEOUT_MS)
      );

      const res = await Promise.race([paymentPromise, timeoutPromise]);

      // Thread through the real receipt number generated by the backend
      const receiptNumber =
        res.result.receipt_number || `CSWO-DON-${Date.now().toString().slice(-8).toUpperCase()}`;
      const dateStr = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

      setCompletedReceipt({
        receiptNumber,
        amount,
        date: dateStr,
        name: anonymous ? 'Anonymous' : (donor.name || 'Anonymous'),
        purpose: cause.purpose,
        paymentMethod: extractPaymentMethod(res),
        transactionId: extractTransactionId(res),
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

  return (
    <PageShell>
      {/* ── Breadcrumb (Clean Single Root) ── */}
      <Breadcrumb title={tr('অনুদান দিন', 'Donate')} />

      <PageHero
        eyebrow={tr('অনুদান দিন', 'Donate')}
        title={
          <>
            {tr('একবার দিন।', 'Give once.')}
            <br />
            {tr('এক বছর বদলান।', 'Change a year.')}
          </>
        }
        lede={
          <>
            {/* The design runs a shorter lede on phones so it still sets in two
                lines; the full sentence returns from sm up. */}
            <span className="sm:hidden">
              {tr(
                'আপনার অনুদানে চলে রক্তদান শিবির, স্কুল কিট ও স্বাস্থ্য শিবির — পশ্চিম মেদিনীপুর জুড়ে।',
                'Every contribution carries the power to make a difference. Your generosity helps us bring care, opportunity, dignity, and hope to people and communities who need a helping hand.'
              )}
            </span>
            <span className="hidden sm:inline">
              {tr(
                'আপনার অনুদানে চলে রক্তদান শিবির, স্কুল কিট, স্বাস্থ্য শিবির এবং পশ্চিম মেদিনীপুর জুড়ে সমাজ উন্নয়নের কাজ।',
                'Every contribution carries the power to make a difference. Your generosity helps us bring care, opportunity, dignity, and hope to people and communities who need a helping hand.'
              )}
            </span>
          </>
        }
        image="/assets/images/service/donate-hero2.jpg"
        imageAlt={tr('ত্রাণ সামগ্রী হাতে একটি শিশু', 'A child holding a relief kit at a Chhatradol distribution')}
      >
        <p className="mt-5 flex items-center gap-2.5 font-dmsans text-[12px] font-medium text-white/80 sm:mt-6 sm:text-[13.5px]">
          {/* <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#7FD3A3]" aria-hidden="true" />
           <span>
            {tr('৮০জি রসিদ তাৎক্ষণিক', '80G receipt issued instantly')}
             <span className="hidden sm:inline">
              {tr(' · Cashfree-এর সুরক্ষিত পেমেন্ট', ' · Secure payment via Cashfree')}
            </span> 
          </span> */}
        </p>
      </PageHero>

      {/* ── Top Stepper (Clean & High Contrast - Fully Visible on Mobile & Desktop) ── */}
      <div className="bg-white border-b border-site-line py-3 sm:py-4">
        <div className="mx-auto max-w-[880px] px-2 sm:px-4">
          <div className="flex items-center justify-between gap-1 sm:gap-3">
            {/* Step 1 */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink min-w-0">
              <div className="flex h-6 w-6 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-site-green text-white font-bold text-[10px] sm:text-sm">
                1
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] sm:text-[13.5px] font-black text-site-ink leading-tight truncate">
                  {tr('আপনার বিবরণ', 'Your Details')}
                </p>
                <p className="text-[8.5px] sm:text-[11px] font-semibold text-site-muted truncate">
                  {tr('বিবরণ পূরণ করুন', 'Fill in your details')}
                </p>
              </div>
            </div>

            <div className="h-[2px] flex-1 rounded-full bg-site-yellow mx-1 sm:mx-2.5 min-w-[6px]" />

            {/* Step 2 */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink min-w-0">
              <div className={`flex h-6 w-6 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full font-bold text-[10px] sm:text-sm transition-all ${
                donor.name.trim() && phoneOk && amount > 0 ? 'bg-site-green text-white' : 'bg-site-cream text-site-soft border border-site-line'
              }`}>
                2
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] sm:text-[13.5px] font-black text-site-ink leading-tight truncate">
                  {tr('পেমেন্ট', 'Payment')}
                </p>
                <p className="text-[8.5px] sm:text-[11px] font-semibold text-site-muted truncate">
                  {tr('পেমেন্টের মাধ্যম বাছুন', 'Choose payment method')}
                </p>
              </div>
            </div>

            <div className="h-[2px] flex-1 rounded-full bg-site-line-2 mx-1 sm:mx-2.5 min-w-[6px]" />

            {/* Step 3 */}
            <div className="flex items-center gap-1 sm:gap-2.5 shrink min-w-0">
              <div className="flex h-6 w-6 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-site-cream text-site-faint font-black text-[10px] sm:text-sm border border-site-line">
                3
              </div>
              <div className="text-left min-w-0">
                <p className="text-[10px] sm:text-[13.5px] font-black text-site-faint leading-tight truncate">
                  {tr('নিশ্চিতকরণ', 'Confirmation')}
                </p>
                <p className="text-[8.5px] sm:text-[11px] font-medium text-site-faint truncate">
                  {tr('ধন্যবাদ!', 'Thank you!')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Donation Form (Responsive 2-Column Layout) ── */}
      <section className="mx-auto max-w-[1340px] px-5 pb-[70px] pt-10 sm:px-8 lg:pb-[90px] lg:pt-[60px]">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 items-start gap-x-8 gap-y-6 lg:grid-cols-[1.35fr_1fr] lg:gap-x-12 lg:gap-y-7">

          {/* ══════════════════════════════════════════════════════════════════
              LEFT: pick a cause — tapping a card fills the amount in
             ══════════════════════════════════════════════════════════════════ */}
          {/* Section heading spans both columns so the cards and the donation
              panel still start on the same line. */}
          <div className="order-2 max-w-[760px] lg:order-1 lg:col-span-2">
            <div className="eyebrow">{tr('একটি উদ্দেশ্য বাছুন', 'Choose a cause')}</div>
            <h2 className="mt-3 font-archivo text-[clamp(22px,2.2vw,27px)] font-bold leading-[1.2] tracking-[-0.02em] text-site-ink">
              {tr('আপনার অনুদান সত্যিকারের পরিবর্তন আনে', 'Your Donation Makes a Real Difference')}
            </h2>
            <p className="mt-3 font-dmsans text-[13.5px] font-medium leading-[1.7] text-site-muted sm:text-[14px]">
              {tr(
                'ছোট বা বড় — প্রতিটি অনুদানই আমাদের সেই মানুষদের পাশে দাঁড়াতে সাহায্য করে যাঁদের সহায়তা সবচেয়ে বেশি প্রয়োজন। একটি উদ্দেশ্য বেছে নিন, পরিবর্তনের অংশ হন।',
                'Every contribution, big or small, helps us reach people who need support the most. Choose a cause and be a part of change.'
              )}
            </p>
          </div>

          <div className="order-3 lg:order-2">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
              {TIERS.map((t) => {
                const active = picked === t.v && !custom;
                return (
                  <button
                    key={`tier-${t.v}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pickTier(t)}
                    className={`relative flex h-full flex-col overflow-hidden rounded-[18px] bg-white text-left transition-all duration-200 hover:-translate-y-1 ${
                      active ? 'border-2 border-site-green' : 'border border-site-line'
                    }`}
                  >
                    {/* Selected flag — mirrors the SELECTED ✓ pill in the design */}
                    {active && (
                      <span className="absolute right-3.5 top-3.5 z-[2] inline-flex items-center gap-1.5 rounded-full bg-site-green px-3 py-[7px] font-dmsans text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                        {tr('নির্বাচিত', 'Selected')}
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}

                    <div className="img-zoom relative h-[168px] w-full shrink-0 overflow-hidden bg-[#eef4e7] sm:h-[190px]">
                      <img
                        src={t.img}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => { e.currentTarget.src = '/assets/images/Chhatradol.jpg'; }}
                      />
                      <span className="pointer-events-none absolute left-3.5 top-3.5 rounded-md bg-white/95 px-3 py-1.5 font-dmsans text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-site-soft">
                        {lang === 'en' ? t.catEn : t.catBn}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col gap-3.5 px-5 pb-5 pt-5 sm:px-[22px] sm:pb-[22px]">
                      <div className="flex items-baseline justify-between gap-3.5">
                        <h3 className="min-w-0 flex-1 font-archivo text-[17px] font-bold leading-[1.3] text-site-ink sm:text-[19px]">
                          {lang === 'en' ? t.en : t.bn}
                        </h3>
                        <span className="shrink-0 font-archivo text-[22px] font-bold leading-none text-site-red sm:text-[24px]">
                          ₹{t.v.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <p className="font-dmsans text-[13px] leading-[1.65] text-site-muted sm:text-[13.5px]">
                        {lang === 'en' ? t.descEn : t.descBn}
                      </p>

                      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-site-line pt-4">
                        <span className="font-dmsans text-[11.5px] font-medium text-site-faint">
                          {frequency === 'monthly' ? tr('মাসিক দান', 'Monthly gift') : tr('একবারের দান', 'One-time gift')}
                        </span>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-[22px] py-3 font-dmsans text-[12.5px] font-bold ${
                            active ? 'bg-site-green text-white' : 'bg-site-yellow text-site-ink'
                          }`}
                        >
                          {active ? (
                            <>
                              {tr('নির্বাচিত', 'Selected')} <Check className="h-3 w-3 stroke-[3]" />
                            </>
                          ) : (
                            tr('দান করুন', 'Donate Now')
                          )}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT: your donation — summary + form + bank details (aligned to bottom)
             ══════════════════════════════════════════════════════════════════ */}
          {/* `contents` on mobile lets the form panel and the bank card be ordered
              independently around the gift cards; on lg they snap into a sticky right column. */}
          <div className="contents lg:block lg:order-3 lg:sticky lg:top-[100px] lg:self-start">

            <div id="donate-form" className="order-1 scroll-mt-24 rounded-[44px] border border-site-line bg-white p-6 sm:p-8 lg:order-none">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-archivo text-[22px] font-bold leading-[1.2] text-site-ink">
                  {tr('আপনার অনুদান', 'Your donation')}
                </h3>
                <span className="inline-flex items-center gap-1.5 font-dmsans text-[10.5px] font-bold uppercase tracking-[0.14em] text-site-green">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {tr('নিরাপদ', 'Secure')}
                </span>
              </div>

              {/* Live summary of what is about to be paid */}
              <div className="mt-4 rounded-[26px] bg-site-cream px-6 py-4">
                <div className="font-dmsans text-[12px] font-medium text-site-faint">
                  {tr('যেখানে যাচ্ছে', 'Supporting')}
                </div>
                <div className="mt-2 font-archivo text-[16px] font-bold leading-[1.35] text-site-ink">
                  {lang === 'en' ? cause.en : cause.bn}
                </div>
                <div className="mt-3.5 flex flex-wrap items-baseline gap-2">
                  <span className="font-archivo text-[34px] font-bold leading-none text-site-green">
                    ₹{amountFmt}
                  </span>
                  <span className="font-dmsans text-[13px] font-medium text-site-faint">
                    {frequency === 'monthly' ? tr('মাসিক', 'monthly') : tr('একবার', 'one-time')}
                  </span>
                </div>
              </div>

              {/* Frequency */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFrequency('once')}
                  className={`rounded-full border py-3 font-dmsans text-[13px] font-semibold transition-all ${
                    frequency === 'once'
                      ? 'border-site-green bg-site-green text-white'
                      : 'border-site-line bg-white text-site-ink hover:border-site-green'
                  }`}
                >
                  {tr('একবার', 'One-time')}
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency('monthly')}
                  className={`rounded-full border py-3 font-dmsans text-[13px] font-semibold transition-all ${
                    frequency === 'monthly'
                      ? 'border-site-green bg-site-green text-white'
                      : 'border-site-line bg-white text-site-ink hover:border-site-green'
                  }`}
                >
                  {tr('মাসিক', 'Monthly')}
                </button>
              </div>

              {/* Amount chips */}
              <div className="mb-2 mt-4 font-dmsans text-[12px] font-semibold text-[#33443c]">
                {tr('অথবা পরিমাণ বাছুন', 'Or choose an amount')}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TIERS.map((t) => {
                  const active = picked === t.v && !custom;
                  return (
                    <button
                      key={`chip-${t.v}`}
                      type="button"
                      aria-pressed={active}
                      onClick={() => { setPicked(t.v); setCustom(''); setCauseKey(t.causeKey); }}
                      className={`rounded-[16px] border px-1 py-3.5 font-archivo text-[14px] font-bold transition-all ${
                        active
                          ? 'border-site-green bg-site-green text-white'
                          : 'border-site-line bg-white text-site-ink hover:border-site-green'
                      }`}
                    >
                      ₹{t.v.toLocaleString('en-IN')}
                    </button>
                  );
                })}
              </div>

              {/* Custom amount */}
              <div className="mt-2.5 flex items-center rounded-full border border-site-line bg-site-field px-[22px] py-[13px] transition-colors focus-within:border-site-green">
                {/* <span className="mr-2 shrink-0 font-dmsans text-[15px] font-bold text-site-muted">₹</span> */}
                <label htmlFor="donate-custom" className="sr-only">
                  {tr('নিজের ইচ্ছেমতো পরিমাণ লিখুন', 'Other amount')}
                </label>
                <input
                  id="donate-custom"
                  type="number"
                  min="10"
                  placeholder={tr('নিজের ইচ্ছেমতো পরিমাণ', 'Other amount (₹)')}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="w-full min-w-0 bg-transparent font-dmsans text-[14px] font-bold text-site-ink placeholder:font-medium placeholder:text-[#9aa9a0] focus:outline-none"
                />
              </div>

              {/* Donor details */}
              <div id="details-section" className="mt-4 grid gap-2">
                <div>
                  <label htmlFor="donor-name" className="sr-only">{tr('পুরো নাম', 'Full name')}</label>
                  <input
                    id="donor-name"
                    type="text"
                    placeholder={tr('পুরো নাম *', 'Full name *')}
                    value={donor.name}
                    onChange={setField('name')}
                    className={`site-input min-h-0 px-[22px] py-[13px] text-[14px] ${formErrors.name ? 'border-site-blood' : ''}`}
                  />
                  {formErrors.name && <p className="field-error">{formErrors.name}</p>}
                </div>

                <div>
                  <label htmlFor="donor-phone" className="sr-only">{tr('মোবাইল নম্বর', 'Mobile number')}</label>
                  <input
                    id="donor-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder={tr('মোবাইল নম্বর *', 'Mobile number *')}
                    value={donor.phone}
                    onChange={setField('phone')}
                    className={`site-input min-h-0 px-[22px] py-[13px] text-[14px] ${formErrors.phone ? 'border-site-blood' : ''}`}
                  />
                  {formErrors.phone && <p className="field-error">{formErrors.phone}</p>}
                </div>

                <div>
                  <label htmlFor="donor-email" className="sr-only">{tr('ইমেল ঠিকানা', 'Email address')}</label>
                  <input
                    id="donor-email"
                    type="email"
                    placeholder={tr('ইমেল (ঐচ্ছিক — ৮০জি রসিদের জন্য)', 'Email (optional — for 80G receipt)')}
                    value={donor.email}
                    onChange={setField('email')}
                    className={`site-input min-h-0 px-[22px] py-[13px] text-[14px] ${formErrors.email ? 'border-site-blood' : ''}`}
                  />
                  {formErrors.email && <p className="field-error">{formErrors.email}</p>}
                </div>

                {formNotice && (
                  <div className="error-panel flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>{formNotice}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'processing'}
                  className="btn-yellow mt-4 w-full py-4 text-[15px]"
                >
                  {status === 'processing' ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-site-ink border-t-transparent" />
                      {tr('প্রসেস হচ্ছে…', 'Processing…')}
                    </>
                  ) : (
                    <span>{tr(`দান করুন ₹${amountFmt}`, `Donate ₹${amountFmt}`)}</span>
                  )}
                </button>

                <p className="mt-3 text-center font-dmsans text-[11.5px] leading-[1.6] text-site-faint">
                  {tr('পেমেন্ট সুরক্ষিত · রসিদ ইমেলে পাঠানো হবে', 'Payments secured by the gateway · receipt emailed within 48 hours')}
                </p>
              </div>
            </div>

            {/* Bank transfer — compact height */}
            <div className="order-4 mt-5 rounded-[40px] bg-site-green px-6 py-5 text-white sm:px-8 lg:order-none lg:mt-5">
              <div className="font-dmsans text-[12px] font-bold uppercase tracking-[0.14em] text-site-yellow">
                {tr('ব্যাংক ট্রান্সফার', 'Bank Transfer')}
              </div>
              <p className="mb-3 mt-2 font-dmsans text-[13px] leading-[1.6] text-white/70">
                {tr('সরাসরি ব্যাংকে পাঠাতে চাইলে নিচের তথ্য ব্যবহার করুন।', 'Prefer to transfer directly? Use the details below.')}
              </p>

              <dl className="grid gap-0.5">
                {[
                  { k: 'name', label: tr('অ্যাকাউন্টের নাম', 'Account Name'), value: BANK_DETAILS.accountName, mono: false },
                  { k: 'acc', label: tr('অ্যাকাউন্ট নম্বর', 'Account Number'), value: BANK_DETAILS.accountNumber, mono: true },
                  { k: 'ifsc', label: tr('IFSC কোড', 'IFSC Code'), value: BANK_DETAILS.ifsc, mono: true },
                  { k: 'bank', label: tr('ব্যাংক ও শাখা', 'Branch'), value: `${BANK_DETAILS.branch}`, mono: false },
                ].map((row) => (
                  <div
                    key={row.k}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-white/15 py-2.5 last:border-0 sm:grid-cols-[86px_minmax(0,1fr)_auto] sm:gap-x-4"
                  >
                    <dt className="col-span-2 font-dmsans text-[10.5px] font-semibold uppercase leading-[1.4] tracking-[0.1em] text-white/50 sm:col-span-1">
                      {row.label}
                    </dt>
                    <dd className={`${row.mono ? 'font-dmmono' : 'font-dmsans'} min-w-0 break-words text-[13px] font-bold leading-[1.45] text-white sm:text-right`}>
                      {row.value}
                    </dd>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(row.k, row.value)}
                      className="inline-flex w-[92px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-white/[0.28] px-3 py-2 font-dmsans text-[11.5px] font-semibold text-white transition-colors hover:border-site-yellow hover:text-site-yellow"
                    >
                      {copiedKey === row.k ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === row.k ? tr('কপি হয়েছে!', 'Copied') : tr('কপি', 'Copy')}</span>
                    </button>
                  </div>
                ))}
              </dl>

              <p className="mt-4 font-dmsans text-[11.5px] leading-[1.6] text-white/55">
                {tr('ট্রান্সফারের পর রসিদের জন্য আমাদের সাথে যোগাযোগ করুন।', 'After transferring, contact us to receive your receipt.')}
              </p>
            </div>

            {/* Every Contribution Matters — sits beneath bank details in the right column */}
            <div className="order-5 mt-5 rounded-[18px] border border-site-line bg-white px-5 py-5 sm:px-7 sm:py-6 lg:order-none lg:mt-5">
              <div className="flex items-center gap-2.5">
                <Heart className="h-[18px] w-[18px] shrink-0 fill-site-red text-site-red" />
                <h3 className="font-archivo text-[17px] font-bold leading-[1.3] text-site-ink sm:text-[19px]">
                  {tr('প্রতিটি অনুদানই গুরুত্বপূর্ণ', 'Every Contribution Matters')}
                </h3>
              </div>
              <p className="mt-2.5 font-dmsans text-[13px] leading-[1.75] text-site-muted sm:text-[13.5px]">
                {tr(
                  'একটি শিশুর পড়াশোনা চালিয়ে যাওয়া, একটি গাছ রোপণ, শিক্ষাসামগ্রী পৌঁছে দেওয়া কিংবা পরিচ্ছন্ন পরিবেশ গড়া — আপনার অনুদান পরিবর্তনের এক অর্থবহ পদক্ষেপ হয়ে উঠতে পারে।',
                  'Whether you help a child continue their education, plant a tree, provide essential learning materials or support a cleaner community, your contribution can become a meaningful act of change.'
                )}
              </p>
            </div>
          </div>
        </form>

        {/* FAQs + accepted methods sit full width under the two columns */}
        <div className="mt-10 space-y-6">
          {/* ── 5. Frequently Asked Questions ── */}
          <div className="space-y-5 sm:space-y-6 pt-6 sm:pt-8 mt-2 sm:mt-4">
            <h2 className="mb-4 px-1 font-archivo text-[22px] font-bold tracking-[-0.02em] text-site-ink sm:text-[26px]">
              {tr('সাধারণ জিজ্ঞাসা', 'Frequently Asked Questions')}
            </h2>

            <div className="overflow-hidden rounded-[24px] border border-site-line bg-white divide-y divide-site-line">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="transition-colors">
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="flex w-full cursor-pointer items-start justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-site-cream/60 sm:px-8 sm:py-6"
                    >
                      <span className="font-dmsans text-[14px] font-bold leading-[1.5] text-site-ink sm:text-[15px]">
                        {lang === 'en' ? faq.qEn : faq.qBn}
                      </span>
                      <span className={`shrink-0 text-[20px] leading-none transition-colors ${isOpen ? 'font-bold text-site-red' : 'text-site-faint'}`}>
                        {isOpen ? '×' : '+'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="animate-fade-in px-6 pb-6 pt-0 font-dmsans text-[13.5px] leading-[1.8] text-site-soft sm:px-8 sm:pb-7 sm:text-[14px]">
                        {lang === 'en' ? faq.aEn : faq.aBn}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── We Accept Infinite Looping Ticker Marquee ── */}
            <div className="rounded-card border border-site-line bg-white p-3.5 sm:p-5 overflow-hidden relative">
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-site-faint mb-3 text-center">
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

      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          ERROR / CANCELLED POPUP MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {status === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-[420px] rounded-[24px] bg-white p-6 sm:p-8 border border-site-line text-center animate-scale-up my-auto">
            
            {/* Top Graphics (Concentric Red Rings) */}
            <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-site-cream animate-ping opacity-30" />
              <div className="absolute inset-2 rounded-full bg-site-cream border border-site-blood/40" />
              
              {/* Center X mark */}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[var(--blood)] text-white">
                <X className="h-6 w-6 stroke-[3]" />
              </div>
            </div>

            {/* Headings */}
            <h3 className="text-xl sm:text-[22px] font-black text-site-ink tracking-tight leading-snug px-2">
              {errMsg === 'CANCELLED' ? tr('পেমেন্ট বাতিল করা হয়েছে।', 'Payment was cancelled.') : tr('পেমেন্ট ব্যর্থ হয়েছে।', 'Payment Failed.')}
            </h3>

            {errMsg && errMsg !== 'CANCELLED' && (
              <div className="mt-3 mx-4 rounded-soft bg-site-cream border border-site-blood/40 p-3">
                <p className="text-[12px] font-bold text-site-blood break-words leading-relaxed">
                  {errMsg}
                </p>
              </div>
            )}

            <p className="text-[13px] font-medium text-site-muted mt-3 px-2 leading-relaxed">
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
                className="flex flex-1 items-center justify-center gap-2 rounded-soft bg-[var(--blood)] py-3 text-[13px] font-bold text-white hover:bg-[var(--blood)] transition-colors"
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
                className="flex flex-1 items-center justify-center gap-2 rounded-soft bg-white py-3 text-[13px] font-bold text-site-soft border border-site-line hover:bg-site-cream transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                {tr('ফিরে যান', 'Go Back')}
              </button>
            </div>

            {/* Footer Trust Banner */}
            <div className="mt-6 border-t border-site-line pt-5">
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-site-cream text-site-blood shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[12px] font-bold text-site-soft">
                    {tr('আপনার নিরাপত্তা আমাদের অগ্রাধিকার।', 'Your security is our priority.')}
                  </p>
                  <p className="text-[11px] font-medium text-site-faint">
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
          <div className="relative w-full max-w-xl rounded-panel bg-white p-5 sm:p-8 border border-site-line text-center animate-scale-up my-auto max-h-[94vh] overflow-y-auto">
            
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 rounded-full p-2 text-site-faint hover:text-site-soft hover:bg-site-cream transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Top Celebration Graphics (Concentric Mint Rings) */}
            <div className="relative mx-auto mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-site-cream animate-ping opacity-25" />
              <div className="absolute inset-1.5 rounded-full bg-site-cream border border-site-line" />
              
              {/* Center Checkmark */}
              <div className="relative flex h-11 w-11 sm:h-13 sm:w-13 items-center justify-center rounded-full bg-[var(--green)] text-white">
                <Check className="h-6 w-6 sm:h-7 sm:w-7 stroke-[3]" />
              </div>
            </div>

            {/* Headings */}
            <h3 className="text-lg sm:text-2xl font-black text-site-ink tracking-tight leading-snug px-2">
              {tr('ধন্যবাদ! আপনার অনুদান সফলভাবে নিশ্চিত হয়েছে।', 'Thank You! Your contribution is confirmed.')}
            </h3>
            <p className="text-xs sm:text-sm font-semibold text-site-muted mt-1 px-2">
              {tr('আপনার সহায়তা একটি সুন্দর আগামী গড়ে তুলতে সাহায্য করবে।', 'Your support helps us create a better tomorrow.')}
            </p>

            {/* Official Email Invoice Banner */}
            <div className="mt-4 flex items-center gap-3 rounded-card bg-site-cream border border-site-line p-3 sm:p-3.5 text-left">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-soft bg-site-cream text-site-green shrink-0">
                <Mail className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-[13px] font-black text-site-ink leading-tight">
                  {tr('অফিশিয়াল রসিদ ও ইনভয়েস আপনার ইমেলে পাঠানো হয়েছে।', 'Official receipt & invoice has been sent to your email.')}
                </p>
                <p className="text-[10.5px] sm:text-[11px] font-semibold text-site-muted mt-0.5">
                  {tr('বিস্তারিত জানতে আপনার ইনবক্স (বা স্প্যাম ফোল্ডার) চেক করুন।', 'Please check your inbox (and spam folder) for the details.')}
                </p>
              </div>
            </div>

            {/* Payment Details
                Long identifiers get their own full-width row and are allowed to
                wrap — squeezing them into a 3-up grid with whitespace-nowrap
                clipped the receipt number on narrow screens. Date and amount are
                short, so they sit side by side even on mobile. */}
            <div className="mt-4 rounded-card border border-site-line bg-site-cream/70 p-3 sm:p-3.5 text-left space-y-2.5">
              {/* Receipt number (our own reference) */}
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-[18px] bg-site-cream text-site-green shrink-0">
                  <Bookmark className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider text-site-faint">
                    {tr('রসিদ নম্বর', 'Receipt No.')}
                  </p>
                  <p className="font-dmmono text-xs sm:text-[12.5px] font-black text-site-ink select-all break-all leading-snug">
                    {completedReceipt.receiptNumber}
                  </p>
                </div>
              </div>

              {/* Gateway transaction id — what the donor sees on their bank/UPI
                  statement. Only rendered when the gateway actually returned one. */}
              {completedReceipt.transactionId && (
                <div className="flex items-start gap-2.5 border-t border-site-line pt-2.5">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-[18px] bg-site-cream text-site-green shrink-0">
                    <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider text-site-faint">
                      {tr('ট্রানজাকশন আইডি', 'Transaction ID')}
                    </p>
                    <p className="font-dmmono text-xs sm:text-[12.5px] font-black text-site-ink select-all break-all leading-snug">
                      {completedReceipt.transactionId}
                    </p>
                  </div>
                </div>
              )}

              {/* Date + Amount */}
              <div className="grid grid-cols-2 gap-2 border-t border-site-line pt-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-[18px] bg-site-cream text-site-green shrink-0">
                    <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider text-site-faint">
                      {tr('তারিখ', 'Date')}
                    </p>
                    <p className="text-xs sm:text-[12.5px] font-black text-site-ink leading-snug">
                      {completedReceipt.date.split(',')[0]}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 min-w-0 border-l border-site-line pl-2 sm:pl-3">
                  <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-[18px] bg-site-cream text-site-green shrink-0">
                    <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider text-site-faint">
                      {tr('পরিমাণ', 'Amount')}
                    </p>
                    <p className="text-xs sm:text-[15px] font-black text-[var(--green)] leading-snug">
                      ₹{completedReceipt.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
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
                      paymentId: completedReceipt.transactionId,
                      email: donor.email,
                    },
                    lang as 'en' | 'bn',
                  )
                }
                className="flex w-full items-center justify-center gap-2.5 rounded-card bg-site-green hover:bg-site-green-2 py-3.5 sm:py-4 text-xs sm:text-sm font-black text-white active:scale-[0.98] transition-all cursor-pointer"
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
