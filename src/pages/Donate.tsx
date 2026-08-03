import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageShell, SERIF_BN, Icon, FJ } from './_field-journal';
import { startRazorpayPayment } from '@/lib/razorpay';
import { useT } from '@/i18n';
import Breadcrumb from '@/components/ui/Breadcrumb';

// ════════════════════════════════════════════════════════════════════
//  Donate — অনুদান দিন  (conversion-focused donation page)
// ════════════════════════════════════════════════════════════════════

const CYAN = '#27c4e1';
const HERO_IMG = '/assets/images/impacts/education.jpg';

type Cause = { key: string; icon: typeof Icon.Heart; bn: string; en: string; purpose: string };
const CAUSES: Cause[] = [
  { key: 'education', icon: Icon.Book,    bn: 'শিক্ষা সহায়তা',        en: 'Education Support',       purpose: 'Education Support' },
  { key: 'blood',     icon: Icon.Droplet, bn: 'রক্তদান শিবির',         en: 'Blood Donation Camps',    purpose: 'Blood Donation Camps' },
  { key: 'medical',   icon: Icon.Stetho,  bn: 'চিকিৎসা ও স্বাস্থ্য',   en: 'Medical Aid & Health Care', purpose: 'Medical Aid & Health Care' },
  { key: 'student',   icon: Icon.Users,   bn: 'শিক্ষার্থী কল্যাণ',     en: 'Student Welfare',         purpose: 'Student Welfare' },
  { key: 'relief',    icon: Icon.Package, bn: 'জরুরি ত্রাণ',           en: 'Emergency Relief',        purpose: 'Emergency Relief' },
  { key: 'general',   icon: Icon.Heart,   bn: 'সাধারণ তহবিল',          en: 'General Fund',            purpose: 'General Fund' },
];

const AMOUNTS = [
  { v: 100,  bn: 'একজন শিশুর জন্য',   en: 'Support a child' },
  { v: 250,  bn: 'প্রয়োজনীয় জিনিস',  en: 'Provide essentials' },
  { v: 500,  bn: 'পরিবর্তন আনুন',     en: 'Make a difference' },
  { v: 1000, bn: 'পরিবর্তনে শক্তি',   en: 'Empower change' },
  { v: 2500, bn: 'একটি পরিবারকে',     en: 'Support a family' },
  { v: 5000, bn: 'বড় প্রভাব',         en: 'Create big impact' },
];

const PAY_METHODS = [
  { key: 'UPI', label: 'UPI', src: '/assets/payment/upi.svg' },
  { key: 'GPay', label: 'GPay', src: '/assets/payment/gpay.svg' },
  { key: 'PhonePe', label: 'PhonePe', src: '/assets/payment/phonepe.svg' },
  { key: 'Paytm', label: 'Paytm', src: '/assets/payment/paytm.svg' },
  { key: 'VISA', label: 'VISA', src: '/assets/payment/visa.svg' },
  { key: 'Mastercard', label: 'Mastercard', src: '/assets/payment/mastercard.svg' },
  { key: 'RuPay', label: 'RuPay', src: '/assets/payment/rupay.svg' },
  { key: 'NetBanking', label: 'Net Banking', src: '/assets/payment/razorpay.svg' },
];

const FAQ_ITEMS = [
  { q: { bn: 'আমার অনুদান কি নিরাপদ?', en: 'Is my donation secure?' },
    a: { bn: 'সম্পূর্ণ নিরাপদ। সমস্ত লেনদেন Razorpay-এর PCI-DSS কম্প্লায়েন্ট, এনক্রিপ্টেড সিস্টেমের মাধ্যমে হয়। আমরা কার্ডের তথ্য সংরক্ষণ করি না।', en: 'Completely. All transactions go through Razorpay\'s PCI-DSS compliant, encrypted system. We never store your card details.' } },
  { q: { bn: 'আমি কি কর-রসিদ পাব?', en: 'Will I get a tax receipt?' },
    a: { bn: 'আমরা একটি রেজিস্টার্ড ট্রাস্ট। 80G রসিদ সুবিধা শীঘ্রই আসছে — PAN দিলে চালু হওয়ার সাথে সাথে রসিদ ইমেলে পাঠানো হবে।', en: 'We are a registered trust. 80G receipts are coming soon — add your PAN and a receipt will be emailed once it goes live.' } },
  { q: { bn: 'মাসিক অনুদান কি বাতিল করা যায়?', en: 'Can I cancel my monthly donation?' },
    a: { bn: 'হ্যাঁ, যেকোনো সময়। আপনার সদস্য পোর্টাল থেকে এক ক্লিকে বন্ধ করতে পারবেন।', en: 'Yes, any time. Cancel with one click from your member portal.' } },
  { q: { bn: 'আমার অর্থ কোথায় ব্যবহৃত হয়?', en: 'Where is my money used?' },
    a: { bn: '৮৫% সরাসরি মাঠ-পর্যায়ের কর্মসূচিতে যায়, ১০% অপারেশনস ও ৫% অডিট-কমপ্লায়েন্সে। সম্পূর্ণ হিসাব আমাদের ইমপ্যাক্ট পেজে দেখুন।', en: '85% goes directly to field programmes, 10% to operations and 5% to audit & compliance. See the full breakdown on our Impacts page.' } },
];

type Frequency = 'once' | 'monthly';
type Status = 'idle' | 'processing' | 'done' | 'error';

export default function Donate() {
  const { lang } = useT();
  const tr = (bn: string, en: string) => (lang === 'en' ? en : bn);

  const [causeKey, setCauseKey] = useState('general');
  const [picked, setPicked] = useState<number>(2500);
  const [custom, setCustom] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [anonymous, setAnonymous] = useState(false);
  const [wantReceipt, setWantReceipt] = useState(false);
  const [donor, setDonor] = useState({ name: '', email: '', phone: '', pan: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState('');

  const cause = CAUSES.find((c) => c.key === causeKey)!;
  const setField = (k: keyof typeof donor) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDonor({ ...donor, [k]: e.target.value });

  const amount = custom ? Number(custom) : picked;
  const amountFmt = (amount || 0).toLocaleString('en-IN');
  const emailOk = /\S+@\S+\.\S+/.test(donor.email);
  const phoneOk = donor.phone.replace(/\D/g, '').length >= 8;
  const ready = amount > 0 && emailOk && phoneOk && status !== 'processing';

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) { if (!emailOk || !phoneOk) scrollTo('details'); return; }
    setStatus('processing'); setErrMsg('');
    try {
      await startRazorpayPayment({
        action: 'create_donation_order',
        amount,
        purpose: cause.purpose,
        description: `${cause.en}${frequency === 'monthly' ? ' (Monthly)' : ''} — Narajole Chhatradol`,
        donorName: anonymous ? 'Anonymous' : (donor.name || 'Anonymous'),
        donorEmail: donor.email,
        donorPhone: donor.phone,
        isAnonymous: anonymous,
      });
      setStatus('done');
    } catch (err) {
      const m = err instanceof Error ? err.message : 'PAYMENT_FAILED';
      if (m === 'CANCELLED') { setStatus('idle'); return; }
      // Translate internal error codes to user-friendly messages
      const displayMsg = m === 'PAYMENT_FAILED'
        ? (lang === 'bn'
          ? 'পেমেন্ট গেটওয়ে লোড হয়নি। ইন্টারনেট সংযোগ চেক করুন।'
          : 'Payment gateway could not load. Please check your internet connection.')
        : m;
      setErrMsg(displayMsg); setStatus('error');
    }
  };

  return (
    <PageShell>
      <Breadcrumb title="Donate & Support" />
      {/* ════ HERO ════ */}
      <section style={{ background: FJ.bg }}>
        <div className="mx-auto grid max-w-[1320px] grid-cols-12 items-center gap-8 px-6 pb-10 pt-12 md:px-10 md:pt-16">
          <div className="col-span-12 lg:col-span-7">
            <h1 className="font-bengali text-[40px] leading-[1.05] md:text-[58px]" style={{ ...SERIF_BN, color: FJ.ink }}>
              {tr('আপনার সহানুভূতি ', 'Your kindness creates ')}
              <span style={{ color: FJ.brand }}>{tr('সত্যিকারের পরিবর্তন আনে', 'real change')}</span>
            </h1>
            <p className="mt-5 max-w-xl font-bengali text-[16px] leading-[1.7]" style={{ color: FJ.ink2 }}>
              {tr('শিক্ষা, স্বাস্থ্যসেবা, রক্তদান শিবির ও সমাজকল্যাণ কর্মসূচিতে সহায়তা করুন।', 'Support education, healthcare, blood donation camps, and community welfare programs.')}
            </p>

            {/* trust badges */}
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
              <TrustBadge icon={Icon.Shield} color={FJ.brand} title={tr('৮০জি কর সুবিধা', '80G Tax Benefit')} sub={tr('(শীঘ্রই)', '(Coming Soon)')} />
              <TrustBadge icon={Icon.Check} color={CYAN} title={tr('নিরাপদ পেমেন্ট', 'Secure Payment')} sub={tr('Razorpay সুরক্ষিত', 'Razorpay Secured')} />
              <TrustBadge icon={Icon.Award} color={FJ.brand} title={tr('বিশ্বস্ত এনজিও', 'Trusted NGO')} sub={tr('২০১৯ থেকে', 'Since 2019')} />
              <TrustBadge icon={Icon.Shield} color={CYAN} title={tr('১০০% স্বচ্ছ', '100% Transparent')} sub={tr('তহবিল ব্যবহার', 'Fund Utilization')} />
            </div>

            {/* social proof */}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['pabitra', 'prabal', 'sayan', 'soumen'].map((m) => (
                    <img key={m} src={`/assets/images/members/${m}.jpg`} alt="" className="h-8 w-8 rounded-full object-cover" style={{ border: `2px solid ${FJ.bg}` }} />
                  ))}
                </div>
                <span className="font-bengali text-[13px] font-semibold" style={{ color: FJ.ink }}>
                  {tr('১,২৪৮+ জন এই বছর দান করেছেন', '1,248+ people donated this year')}
                </span>
              </div>
              <span className="flex items-center gap-2 font-bengali text-[13px]" style={{ color: FJ.muted }}>
                <span className="h-2 w-2 rounded-full" style={{ background: '#4d7c0f' }} />
                {tr('গত ৭ দিনে ২৮টি অনুদান', '28 donations in last 7 days')}
              </span>
            </div>
          </div>

          {/* hero image + floating quote */}
          <div className="relative col-span-12 lg:col-span-5">
            <div className="overflow-hidden rounded-[14px]" style={{ aspectRatio: '3/2' }}>
              <img src={HERO_IMG} alt={tr('শিক্ষার্থী', 'Student')} className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-5 left-2 max-w-[220px] sm:max-w-[240px] rounded-[12px] p-3.5 sm:p-4 shadow-lg sm:-left-6" style={{ background: FJ.paper }}>
              <Icon.Quote className="h-4 w-4" style={{ color: FJ.ink }} />
              <p className="mt-1.5 font-bengali text-[13px] sm:text-[14px] font-semibold leading-snug" style={{ color: FJ.ink }}>
                {tr('আজকের প্রতিটি অবদান গড়ে তোলে এক উন্নত আগামী।', 'Every contribution today builds a better tomorrow.')}
              </p>
              <Icon.Heart className="mt-1.5 h-3.5 w-3.5" style={{ color: FJ.brand }} />
            </div>
          </div>
        </div>

        {/* impact ribbon */}
        <div style={{ background: '#f6ecdd' }}>
          <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-y-6 px-6 py-6 md:grid-cols-4 md:px-10">
            <RibbonStat icon={Icon.Users}   n="500+" label={tr('পরিবার সহায়তা', 'Families Supported')} />
            <RibbonStat icon={Icon.Droplet} n="100+" label={tr('রক্তদান শিবির', 'Blood Donation Camps')} />
            <RibbonStat icon={Icon.Grad}    n="300+" label={tr('শিক্ষার্থী সহায়তা', 'Students Supported')} />
            <RibbonStat icon={Icon.Heart}   n="50+"  label={tr('সক্রিয় স্বেচ্ছাসেবক', 'Active Volunteers')} />
          </div>
        </div>
      </section>

      {/* ════ FORM + SUMMARY ════ */}
      <section style={{ background: FJ.paper }}>
        <form onSubmit={handleSubmit}
          className="mx-auto grid max-w-[1320px] grid-cols-12 gap-8 rounded-[28px] border border-slate-200/70 bg-white shadow-sm px-6 py-12 transition-shadow duration-300 hover:shadow-2xl md:px-10 md:py-16">
          {/* LEFT */}
          <div className="col-span-12 space-y-9 lg:col-span-7">
            {/* 1. Cause */}
            <div>
              <StepHead n="1" title={tr('একটি কারণ বাছুন', 'Choose a Cause')} />
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {CAUSES.map((c) => {
                  const active = c.key === causeKey;
                  const I = c.icon;
                  return (
                    <button key={c.key} type="button" onClick={() => setCauseKey(c.key)}
                      className="flex flex-col items-center gap-2 rounded-[10px] border px-3 py-4 text-center transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
                      style={{ borderColor: active ? FJ.brand : FJ.rule, background: active ? 'rgba(194,65,12,0.05)' : FJ.paper, boxShadow: active ? `0 6px 18px -10px ${FJ.brand}` : 'none' }}>
                      <I className="h-5 w-5" style={{ color: active ? FJ.brand : FJ.ink2 }} />
                      <span className="font-bengali text-[12.5px] font-medium leading-tight" style={{ color: FJ.ink }}>{lang === 'en' ? c.en : c.bn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Amount */}
            <div id="amount">
              <StepHead n="2" title={tr('পরিমাণ নির্বাচন করুন', 'Select Amount')} />
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {AMOUNTS.map((a) => {
                  const active = picked === a.v && !custom;
                  return (
                    <button key={a.v} type="button" onClick={() => { setPicked(a.v); setCustom(''); }}
                      className="relative flex flex-col items-start gap-0.5 rounded-[10px] border px-3.5 py-3 text-left transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
                      style={{ borderColor: active ? FJ.brand : FJ.rule, background: active ? 'rgba(194,65,12,0.05)' : FJ.paper }}>
                      {active && <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full" style={{ background: FJ.brand }}><Icon.Check className="h-3 w-3 text-white" /></span>}
                      <span className="font-bengali text-[19px] leading-none" style={{ ...SERIF_BN, color: active ? FJ.brand : FJ.ink }}>₹{a.v.toLocaleString('en-IN')}</span>
                      <span className="font-bengali text-[11px]" style={{ color: FJ.muted }}>{lang === 'en' ? a.en : a.bn}</span>
                    </button>
                  );
                })}
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-[10px] border px-4 py-3" style={{ borderColor: custom ? FJ.brand : FJ.rule, background: FJ.bg }}>
                <span className="font-bengali text-[18px]" style={{ ...SERIF_BN, color: FJ.ink }}>₹</span>
                <input type="number" placeholder={tr('নিজের পরিমাণ লিখুন', 'Enter your own amount')} value={custom} onChange={(e) => setCustom(e.target.value)}
                  onFocus={(e) => { if (e.target.value === '0') setCustom(''); }}
                  onWheel={(e) => e.currentTarget.blur()}
                  min="10"
                  className="w-full bg-transparent font-bengali text-[15px] focus:outline-none" style={{ color: FJ.ink }} />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: FJ.muted }}>{tr('কাস্টম', 'Custom Amount')}</span>
              </label>
            </div>

            {/* 3. Frequency */}
            <div>
              <StepHead n="3" title={tr('অনুদানের ধরন', 'Donation Frequency')} />
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {([
                  { v: 'once',    icon: Icon.Heart, bn: 'একবার', en: 'One-time Donation', sb: 'একবার অবদান', se: 'Contribute once' },
                  { v: 'monthly', icon: Icon.Heart, bn: 'মাসিক সমর্থক', en: 'Monthly Supporter', sb: 'টেকসই সহায়তা', se: 'Help us sustain our work' },
                ] as const).map((f) => {
                  const active = frequency === f.v;
                  return (
                    <button key={f.v} type="button" onClick={() => setFrequency(f.v)}
                      className="flex items-center gap-3 rounded-[10px] border px-4 py-3.5 text-left transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
                      style={{ borderColor: active ? FJ.brand : FJ.rule, background: active ? 'rgba(194,65,12,0.05)' : FJ.paper }}>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ border: `2px solid ${active ? FJ.brand : FJ.rule}` }}>
                        {active && <span className="h-2.5 w-2.5 rounded-full" style={{ background: FJ.brand }} />}
                      </span>
                      <span>
                        <span className="block font-bengali text-[14.5px] font-semibold" style={{ color: FJ.ink }}>{lang === 'en' ? f.en : f.bn}</span>
                        <span className="block font-bengali text-[12px]" style={{ color: FJ.muted }}>{lang === 'en' ? f.se : f.sb}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {frequency === 'monthly' && (
                <p className="mt-2.5 flex items-center gap-2 rounded-[8px] px-3 py-2 font-bengali text-[12.5px]" style={{ background: 'rgba(77,124,15,0.08)', color: '#4d7c0f' }}>
                  <Icon.Check className="h-3.5 w-3.5" /> {tr('মাসিক দাতারা আমাদের আরও ভালো পরিকল্পনায় সাহায্য করেন।', 'Monthly donors help us plan better and create a lasting impact.')}
                </p>
              )}
            </div>

            {/* 4. Details */}
            <div id="details">
              <StepHead n="4" title={tr('আপনার বিবরণ', 'Your Details')} />
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field full label={tr('পুরো নাম *', 'Full Name *')} placeholder={tr('আপনার পুরো নাম', 'Enter your full name')} value={donor.name} onChange={setField('name')} />
                <Field label={tr('ইমেল ঠিকানা *', 'Email Address *')} placeholder={tr('আপনার ইমেল', 'Enter your email')} value={donor.email} onChange={setField('email')} type="email" invalid={donor.email.length > 0 && !emailOk} />
                <Field label={tr('ফোন নম্বর *', 'Phone Number *')} placeholder={tr('আপনার ফোন নম্বর', 'Enter your phone number')} value={donor.phone} onChange={setField('phone')} type="tel" invalid={donor.phone.length > 0 && !phoneOk} />

                <label className="flex cursor-pointer items-center gap-2.5 sm:col-span-2">
                  <input type="checkbox" checked={wantReceipt} onChange={(e) => setWantReceipt(e.target.checked)} className="h-4 w-4" style={{ accentColor: FJ.brand }} />
                  <span className="font-bengali text-[13.5px]" style={{ color: FJ.ink2 }}>
                    {tr('আমি ৮০জি কর-রসিদ চাই', 'I want 80G tax receipt')} <span style={{ color: FJ.muted }}>{tr('(শীঘ্রই)', '(Coming Soon)')}</span>
                  </span>
                </label>
                {wantReceipt && (
                  <div className="sm:col-span-2">
                    <Field full label={tr('PAN নম্বর', 'PAN Number')} placeholder={tr('আপনার PAN নম্বর', 'Enter your PAN number')} value={donor.pan} onChange={setField('pan')} />
                  </div>
                )}

                <label className="flex cursor-pointer items-center gap-2.5 sm:col-span-2">
                  <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-4 w-4" style={{ accentColor: FJ.brand }} />
                  <span className="font-bengali text-[13.5px]" style={{ color: FJ.ink2 }}>
                    {tr('নাম প্রকাশ না করে দান করুন', 'Donate anonymously')} <span style={{ color: FJ.muted }}>{tr('আপনার নাম পাবলিক তালিকায় দেখা যাবে না।', 'Your name will not appear in public lists.')}</span>
                  </span>
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="font-bengali text-[12.5px] font-medium" style={{ color: FJ.muted }}>{tr('বার্তা (ঐচ্ছিক)', 'Message (Optional)')}</span>
                  <textarea rows={3} placeholder={tr('আপনার শুভেচ্ছা বা বিশেষ ভাবনা...', 'Your wishes or any special thoughts...')} value={donor.message} onChange={setField('message')}
                    className="rounded-[8px] border bg-transparent px-3.5 py-2.5 font-bengali text-[14px] focus:outline-none" style={{ borderColor: FJ.rule, color: FJ.ink }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = FJ.brand)} onBlur={(e) => (e.currentTarget.style.borderColor = FJ.rule)} />
                </label>
              </div>
            </div>
          </div>

          {/* RIGHT sticky */}
          <aside className="col-span-12 lg:col-span-5">
            <div className="space-y-4 lg:sticky lg:top-24">
              {/* dark summary */}
              <div className="rounded-[12px] p-6" style={{ background: '#1f2937', color: '#fff' }}>
                <div className="flex items-center justify-between">
                  <span className="font-bengali text-[14px] font-semibold">{tr('আপনার অবদান', 'Your Contribution')}</span>
                  <button type="button" onClick={() => scrollTo('amount')} className="font-bengali text-[12px]" style={{ color: '#fca47e' }}>{tr('পরিমাণ বদলান', 'Edit Amount')}</button>
                </div>
                <div className="mt-3 font-bengali text-[44px] leading-none" style={SERIF_BN}>₹{amountFmt}{frequency === 'monthly' && <span className="text-[16px] text-white/60"> /{tr('মাস', 'mo')}</span>}</div>
                <div className="mt-1.5 font-bengali text-[13px] text-white/70">{tr('লক্ষ্য', 'to')} {lang === 'en' ? cause.en : cause.bn}</div>

                <dl className="mt-5 space-y-3 border-t border-white/10 pt-5">
                  <SumRow label={tr('নাম', 'Name')} value={donor.name ? (anonymous ? tr('অজ্ঞাতনামা', 'Anonymous') : donor.name) : '—'} />
                  <SumRow label={tr('ইমেল', 'Email')} value={donor.email || '—'} />
                  <SumRow label={tr('ফোন', 'Phone')} value={donor.phone || '—'} />
                  <SumRow label={tr('ধরন', 'Frequency')} value={frequency === 'once' ? tr('একবার', 'One-time') : tr('মাসিক', 'Monthly')} />
                </dl>

                <button type="submit" disabled={!ready}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-[8px] px-6 py-3.5 font-bengali text-[15px] font-semibold transition-all"
                  style={{ background: ready ? FJ.brand : 'rgba(194,65,12,0.4)', color: '#fff', cursor: ready ? 'pointer' : 'not-allowed' }}>
                  {status === 'processing'
                    ? tr('প্রসেস হচ্ছে…', 'Processing…')
                    : <>{tr(`₹${amountFmt} নিরাপদে দান করুন`, `Donate ₹${amountFmt} Securely`)}<Icon.Arrow className="h-3.5 w-3.5" /></>}
                </button>
                {status === 'done' && <p className="mt-2.5 text-center font-bengali text-[12.5px]" style={{ color: '#86efac' }}>✓ {tr('ধন্যবাদ! আপনার অনুদান সম্পন্ন হয়েছে।', 'Thank you! Your donation was successful.')}</p>}
                {status === 'error' && (
                  <div className="mt-2.5 text-center">
                    <p className="font-bengali text-[12.5px]" style={{ color: '#fca5a5' }}>
                      {tr('পেমেন্ট সম্পন্ন হয়নি।', 'Payment could not be completed.')}{errMsg ? ` (${errMsg})` : ''}
                    </p>
                    <button
                      type="button"
                      onClick={() => { setStatus('idle'); setErrMsg(''); }}
                      className="mt-2 font-bengali text-[12px] font-semibold underline"
                      style={{ color: '#fbbf24' }}
                    >
                      {tr('আবার চেষ্টা করুন', 'Try Again')}
                    </button>
                  </div>
                )}
                <p className="mt-3 text-center font-bengali text-[11.5px] text-white/55">🔒 {tr('Razorpay দ্বারা সুরক্ষিত পেমেন্ট', 'Secure payment powered by Razorpay')}</p>
              </div>

              {/* payment methods */}
              <div className="rounded-[12px] border p-5 transition-shadow duration-300 hover:shadow-lg hover:border-transparent hover:bg-white/90" style={{ borderColor: FJ.rule, background: FJ.paper }}>
                <div className="font-bengali text-[12.5px] font-semibold" style={{ color: FJ.ink2 }}>{tr('আমরা গ্রহণ করি', 'We accept')}</div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {PAY_METHODS.map((p) => (
                    <div key={p.key} className="group flex items-center justify-center rounded-[12px] border bg-white p-3 transition-all duration-300 hover:border-transparent hover:shadow-lg"
                      style={{ borderColor: FJ.rule }}>
                      <img src={p.src} alt={p.label} className="h-8 w-auto object-contain" />
                    </div>
                  ))}
                </div>
              </div>

              {/* where money goes */}
              <div className="rounded-[12px] border p-5" style={{ borderColor: FJ.rule, background: FJ.paper }}>
                <div className="flex items-center justify-between">
                  <span className="font-bengali text-[13.5px] font-semibold" style={{ color: FJ.ink }}>{tr('আপনার অর্থ যেখানে যায়', 'Where your money goes')}</span>
                  <Link to="/impacts" className="inline-flex items-center gap-1 font-bengali text-[12px] font-medium" style={{ color: FJ.brand }}>{tr('প্রভাব দেখুন', 'View Impact')} <Icon.Arrow className="h-2.5 w-2.5" /></Link>
                </div>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full" style={{ background: FJ.rule }}>
                  <span style={{ width: '85%', background: FJ.brand }} />
                  <span style={{ width: '10%', background: FJ.accent }} />
                  <span style={{ width: '5%', background: FJ.ink2 }} />
                </div>
                <ul className="mt-4 space-y-2 font-bengali text-[12.5px]" style={{ color: FJ.ink2 }}>
                  <li className="flex items-center justify-between"><span className="flex items-center gap-2"><Dot c={FJ.brand} /> {tr('সরাসরি কর্মসূচি ও কার্যক্রম', 'Direct Programs & Activities')}</span><span className="font-mono">85%</span></li>
                  <li className="flex items-center justify-between"><span className="flex items-center gap-2"><Dot c={FJ.accent} /> {tr('অপারেশনস ও প্রশাসন', 'Operations & Administration')}</span><span className="font-mono">10%</span></li>
                  <li className="flex items-center justify-between"><span className="flex items-center gap-2"><Dot c={FJ.ink2} /> {tr('অডিট ও কমপ্লায়েন্স', 'Audit & Compliance')}</span><span className="font-mono">5%</span></li>
                </ul>
              </div>

              <div className="flex items-start gap-3 rounded-[12px] p-4" style={{ background: 'rgba(77,124,15,0.08)' }}>
                <Icon.Shield className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#4d7c0f' }} />
                <div>
                  <div className="font-bengali text-[13.5px] font-semibold" style={{ color: FJ.ink }}>{tr('স্বচ্ছ। জবাবদিহিমূলক। বিশ্বস্ত।', 'Transparent. Accountable. Trusted.')}</div>
                  <div className="font-bengali text-[12.5px]" style={{ color: FJ.ink2 }}>{tr('প্রতিটি টাকা যেন সত্যিকারের পরিবর্তন আনে তা আমরা নিশ্চিত করি।', 'We ensure every rupee makes a real difference.')}</div>
                </div>
              </div>
            </div>
          </aside>
        </form>
      </section>

      {/* trust strip */}
      <section style={{ background: '#f6ecdd' }}>
        <div className="mx-auto grid max-w-[1320px] grid-cols-2 gap-y-5 px-6 py-6 md:grid-cols-5 md:px-10">
          <StripItem icon={Icon.Shield} color={FJ.brand} bn="নিরাপদ ও এনক্রিপ্টেড লেনদেন" en="Secure & Encrypted Transactions" />
          <StripItem icon={Icon.Mail}   color={CYAN}     bn="ইমেলে তাৎক্ষণিক রসিদ" en="Instant Receipt via Email" />
          <StripItem icon={Icon.Shield} color={FJ.brand} bn="আপনার তথ্য সর্বদা নিরাপদ" en="Your Data is Always Safe" />
          <StripItem icon={Icon.Users}  color={CYAN}     bn="সমাজকল্যাণে নিবেদিত" en="Dedicated to Community Welfare" />
          <StripItem icon={Icon.Award}  color={FJ.brand} bn="সম্পূর্ণ আর্থিক স্বচ্ছতা" en="Complete Financial Transparency" />
        </div>
      </section>

      {/* testimonials + FAQ */}
      <section style={{ background: FJ.paper }}>
        <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-10 px-6 py-16 md:px-10 lg:grid-cols-2">
          <div>
            <h2 className="font-bengali text-[24px]" style={{ ...SERIF_BN, color: FJ.ink }}>{tr('সমর্থকেরা যা বলেন', 'What our supporters say')}</h2>
            <div className="mt-5 space-y-4">
              <Testimonial name={tr('রোহিত শর্মা', 'Rohit Sharma')} role={tr('দাতা', 'Donor')} quote={tr('এমন একটি স্বচ্ছ ও প্রভাবশালী সংগঠনের সাথে যুক্ত থাকতে পেরে গর্বিত।', 'Proud to be associated with such a transparent and impactful organization.')} />
              <Testimonial name={tr('অনন্যা ঘোষ', 'Ananya Ghosh')} role={tr('স্বেচ্ছাসেবক', 'Volunteer')} quote={tr('রক্তদান শিবিরে তাদের কাজ সত্যিই জীবন রক্ষাকারী। চালিয়ে যান!', 'Their work in blood donation camps is truly life-saving. Keep it up!')} />
            </div>
          </div>
          <div>
            <h2 className="font-bengali text-[24px]" style={{ ...SERIF_BN, color: FJ.ink }}>{tr('সচরাচর জিজ্ঞাসা', 'Frequently Asked Questions')}</h2>
            <div className="mt-5 divide-y rounded-[10px] border" style={{ borderColor: FJ.rule }}>
              {FAQ_ITEMS.map((f, i) => (
                <details key={i} className="group p-4" style={{ borderColor: FJ.rule }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                    <span className="font-bengali text-[14.5px] font-medium" style={{ color: FJ.ink }}>{lang === 'en' ? f.q.en : f.q.bn}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 shrink-0 transition-transform group-open:rotate-45" style={{ color: FJ.brand }}><path d="M12 5v14M5 12h14" strokeLinecap="round" /></svg>
                  </summary>
                  <p className="mt-2.5 font-bengali text-[13.5px] leading-relaxed" style={{ color: FJ.ink2 }}>{lang === 'en' ? f.a.en : f.a.bn}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

    </PageShell>
  );
}

// ─────────────────── helpers ───────────────────

function StepHead({ n, title }: { n: string; title: string }) {
  return (
    <h2 className="font-bengali text-[19px] font-semibold" style={{ ...SERIF_BN, color: FJ.ink }}>
      <span style={{ color: FJ.brand }}>{n}.</span> {title}
    </h2>
  );
}

function TrustBadge({ icon: I, color, title, sub }: { icon: typeof Icon.Heart; color: string; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.04)' }}><I className="h-3.5 w-3.5" style={{ color }} /></span>
      <span>
        <span className="block font-bengali text-[12.5px] font-semibold leading-tight" style={{ color: FJ.ink }}>{title}</span>
        <span className="block font-bengali text-[10.5px] leading-tight" style={{ color: FJ.muted }}>{sub}</span>
      </span>
    </div>
  );
}

function RibbonStat({ icon: I, n, label }: { icon: typeof Icon.Heart; n: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: FJ.paper }}><I className="h-4 w-4" style={{ color: FJ.brand }} /></span>
      <span>
        <span className="block font-bengali text-[22px] font-extrabold leading-none" style={{ ...SERIF_BN, color: FJ.ink }}>{n}</span>
        <span className="block font-bengali text-[12px]" style={{ color: FJ.ink2 }}>{label}</span>
      </span>
    </div>
  );
}

function StripItem({ icon: I, color, bn, en }: { icon: typeof Icon.Heart; color: string; bn: string; en: string }) {
  const { lang } = useT();
  return (
    <div className="flex items-center gap-2.5">
      <I className="h-4 w-4 shrink-0" style={{ color }} />
      <span className="font-bengali text-[12.5px] leading-tight" style={{ color: FJ.ink2 }}>{lang === 'en' ? en : bn}</span>
    </div>
  );
}

function Field({ label, placeholder, value, onChange, type = 'text', full = false, invalid = false }: {
  label: string; placeholder?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; full?: boolean; invalid?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="font-bengali text-[12.5px] font-medium" style={{ color: FJ.muted }}>{label}</span>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        className="rounded-[8px] border bg-transparent px-3.5 py-2.5 font-bengali text-[14px] focus:outline-none"
        style={{ borderColor: invalid ? '#dc2626' : FJ.rule, color: FJ.ink }}
        onFocus={(e) => (e.currentTarget.style.borderColor = FJ.brand)}
        onBlur={(e) => (e.currentTarget.style.borderColor = invalid ? '#dc2626' : FJ.rule)} />
    </label>
  );
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-bengali text-[13px] text-white/55">{label}</span>
      <span className="max-w-[60%] truncate font-bengali text-[13px] font-medium text-white/90">{value}</span>
    </div>
  );
}

function Testimonial({ name, role, quote }: { name: string; role: string; quote: string }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return (
    <div className="rounded-[10px] border p-4" style={{ borderColor: FJ.rule, background: FJ.bg }}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full font-bengali text-[14px] font-bold text-white" style={{ background: FJ.brand }}>{initials}</span>
        <div>
          <div className="font-bengali text-[14px] font-semibold" style={{ color: FJ.ink }}>{name}</div>
          <div className="font-bengali text-[11.5px]" style={{ color: FJ.muted }}>{role}</div>
        </div>
        <span className="ml-auto text-[13px]" style={{ color: '#f59e0b' }}>★★★★★</span>
      </div>
      <p className="mt-3 font-bengali text-[13.5px] leading-relaxed" style={{ color: FJ.ink2 }}>“{quote}”</p>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />;
}
