import { useState } from 'react';
import { PageShell, PageHero, SERIF_BN, Icon } from './_field-journal';
import { startRazorpayPayment } from '@/lib/razorpay';
import { useT } from '@/i18n';
import RazorpayButton from '@/components/ui/RazorpayButton';

// ════════════════════════════════════════════════════════════════════
//  Donate — অনুদান দিন
// ════════════════════════════════════════════════════════════════════

const TIERS = [
  { amount: 500,   bn: 'একজন শিক্ষার্থীর বইপত্র',           en: "Student's books & supplies" },
  { amount: 1000,  bn: 'একটি রক্তদান শিবিরে অংশগ্রহণ',      en: 'Blood donation camp' },
  { amount: 2500,  bn: 'একজন রোগীর প্রাথমিক চিকিৎসা',       en: 'Primary care for one patient' },
  { amount: 5000,  bn: 'একটি পরিবারের শীতবস্ত্র',           en: 'Winter clothing for a family' },
  { amount: 10000, bn: 'একটি গ্রামের স্বাস্থ্য শিবির',      en: 'Village health camp' },
];

const FAQ_ITEMS = [
  {
    q: { bn: 'অনুদান কি কর-ছাড় যোগ্য?',        en: 'Is the donation tax-deductible?' },
    a: { bn: 'হ্যাঁ। আমরা একটি রেজিস্টার্ড পাবলিক চ্যারিটেবল ট্রাস্ট এবং 80G সার্টিফিকেট রয়েছে। PAN দিলে রসিদ ইমেলে পাঠানো হবে।', en: 'Yes. We are a registered Public Charitable Trust with an 80G certificate. Provide your PAN and a receipt will be emailed to you.' },
  },
  {
    q: { bn: 'অনুদান কিভাবে কাজে লাগে?',        en: 'How is my donation used?' },
    a: { bn: '৮৫% সরাসরি মাঠ-পর্যায়ের কর্মসূচিতে যায় — শিক্ষা, স্বাস্থ্য শিবির, ত্রাণ ও পরিবেশ। বাকি ১৫% অপারেশনস ও অডিট।', en: '85% goes directly to field programmes — education, health camps, relief, and environment. The remaining 15% covers operations and audit.' },
  },
  {
    q: { bn: 'মাসিক অনুদান বাতিল করা যাবে?',   en: 'Can I cancel my monthly donation?' },
    a: { bn: 'যেকোনো সময়। আপনার সদস্য পোর্টাল থেকে এক ক্লিকে বন্ধ করতে পারবেন।', en: 'Any time. Cancel with one click from your member portal.' },
  },
  {
    q: { bn: 'পেমেন্ট কতটা নিরাপদ?',            en: 'How secure is the payment?' },
    a: { bn: 'সমস্ত লেনদেন Razorpay-এর PCI-DSS কম্প্লায়েন্ট সিস্টেমের মাধ্যমে এনক্রিপ্টেড। আমরা কার্ডের তথ্য সংরক্ষণ করি না।', en: 'All transactions are encrypted through Razorpay\'s PCI-DSS compliant system. We never store card details.' },
  },
];

type Frequency = 'once' | 'monthly';

export default function Donate() {
  const { lang } = useT();
  const tr = (bn: string, en: string) => (lang === 'en' ? en : bn);

  const [picked, setPicked] = useState<number>(2500);
  const [custom, setCustom] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [anonymous, setAnonymous] = useState(false);
  const [donor, setDonor] = useState({ name: '', email: '', phone: '', pan: '', message: '' });

  const setField = (k: keyof typeof donor) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDonor({ ...donor, [k]: e.target.value });

  const amount = custom ? Number(custom) : picked;
  const tier = TIERS.find((t) => t.amount === picked);
  const amountFmt = (amount || 0).toLocaleString('en-IN');
  const ready =
    amount > 0 &&
    /\S+@\S+\.\S+/.test(donor.email) &&
    donor.phone.replace(/\D/g, '').length >= 8;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    startRazorpayPayment({
      action: 'create_donation_order',
      amount,
      description: 'Donation to Narajol Chhatradol',
      donorName: anonymous ? 'অজ্ঞাতনামা' : (donor.name || 'Anonymous'),
      donorEmail: donor.email,
      donorPhone: donor.phone,
      isAnonymous: anonymous,
    });
  };

  return (
    <PageShell>
      <PageHero
        eyebrow={tr('Donate · অনুদান দিন', 'Donate · অনুদান দিন')}
        title={tr('ছোট অনুদান, বড় পরিবর্তন।', 'Small donation, big change.')}
        lede={tr(
          'প্রতিটি অনুদান সরাসরি মাঠ-পর্যায়ের কর্মসূচিতে যায়। তিনটি ধাপে শেষ করুন — পরিমাণ বাছুন, বিবরণ দিন, নিরাপদ পেমেন্টে এগিয়ে যান।',
          'Every donation goes directly to field programmes. Complete three steps — choose amount, add your details, proceed to secure payment.'
        )}
      />

      {/* Stepper */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1100px] px-6 pt-12 md:px-10">
          <ol className="flex flex-wrap items-center gap-3 font-mono text-[12px] uppercase tracking-[0.22em]">
            {[
              { n: '01', label: tr('পরিমাণ', 'Amount'),          en: 'Amount' },
              { n: '02', label: tr('আপনার বিবরণ', 'Your Details'), en: 'Your details' },
              { n: '03', label: tr('পেমেন্ট', 'Payment'),          en: 'Payment' },
            ].map((s, i) => (
              <StepItem key={s.n} {...s} isLast={i === 2} />
            ))}
          </ol>
        </div>
      </section>

      <section style={{ background: 'var(--c-paper)' }}>
        <form onSubmit={handleSubmit} className="mx-auto max-w-[1100px] px-6 py-12 md:px-10 md:py-16">
          <div className="grid grid-cols-12 gap-8">
            {/* LEFT */}
            <div className="col-span-12 space-y-6 lg:col-span-7">
              {/* 01 Amount */}
              <DonateCard title={tr('১. অনুদানের পরিমাণ', '1. Donation Amount')} en="Amount">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                  {TIERS.map((t) => {
                    const active = picked === t.amount && !custom;
                    return (
                      <button
                        key={t.amount}
                        type="button"
                        onClick={() => { setPicked(t.amount); setCustom(''); }}
                        className="flex flex-col items-start gap-1 rounded-[3px] border p-3 text-left transition-all"
                        style={{
                          borderColor: active ? 'var(--c-brand)' : 'var(--c-rule)',
                          background:  active ? 'var(--c-brand)' : 'var(--c-paper)',
                          color:       active ? '#fff' : 'var(--c-ink)',
                          boxShadow:   active ? '0 6px 18px -8px var(--c-brand)' : 'none',
                        }}
                      >
                        <span className="font-bengali text-[20px] leading-none" style={SERIF_BN}>₹{t.amount.toLocaleString('en-IN')}</span>
                        <span className="font-bengali text-[11px] leading-tight" style={{ opacity: 0.85 }}>
                          {lang === 'en' ? t.en : t.bn}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <label
                  className="mt-5 flex items-center gap-3 rounded-[3px] border p-4"
                  style={{ borderColor: custom ? 'var(--c-brand)' : 'var(--c-rule)', background: 'var(--c-bg)' }}
                >
                  <span className="font-bengali text-[13px] font-medium" style={{ color: 'var(--c-muted)' }}>
                    {tr('অন্য পরিমাণ:', 'Custom amount:')}
                  </span>
                  <span className="font-bengali text-[22px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>₹</span>
                  <input
                    type="number"
                    placeholder={tr('অন্য একটি পরিমাণ লিখুন', 'Enter a custom amount')}
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    className="w-full bg-transparent font-bengali text-[22px] focus:outline-none"
                    style={{ ...SERIF_BN, color: 'var(--c-ink)' }}
                  />
                </label>
              </DonateCard>

              {/* 02 Donor details */}
              <DonateCard title={tr('২. আপনার বিবরণ', '2. Your Details')} en="Your details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DonorField
                    label={tr('পুরো নাম', 'Full name')}
                    placeholder={tr('রাহুল দাস', 'Rahul Das')}
                    value={donor.name}
                    onChange={setField('name')}
                    full
                  />
                  <DonorField
                    label={tr('ইমেল *', 'Email *')}
                    placeholder="name@example.com"
                    value={donor.email}
                    onChange={setField('email')}
                    type="email"
                  />
                  <DonorField
                    label={tr('ফোন *', 'Phone *')}
                    placeholder="98XXXXXXXX"
                    value={donor.phone}
                    onChange={setField('phone')}
                    type="tel"
                  />
                  <DonorField
                    label={tr('PAN নম্বর', 'PAN number')}
                    sub={tr('80G কর-ছাড়ের জন্য (ঐচ্ছিক)', 'For 80G tax exemption (optional)')}
                    placeholder="ABCDE1234F"
                    value={donor.pan}
                    onChange={setField('pan')}
                    full
                  />
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="font-bengali text-[12.5px] font-medium" style={{ color: 'var(--c-muted)' }}>
                      {tr('একটি বার্তা (ঐচ্ছিক)', 'A message (optional)')}
                    </span>
                    <textarea
                      rows={3}
                      placeholder={tr('আপনার শুভেচ্ছা বা কোনো বিশেষ ভাবনা...', 'Your wishes or any special thoughts...')}
                      value={donor.message}
                      onChange={setField('message')}
                      className="rounded-[3px] border bg-transparent px-3.5 py-2.5 font-bengali text-[14px] transition-colors focus:outline-none"
                      style={{ borderColor: 'var(--c-rule)', color: 'var(--c-ink)' }}
                      onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--c-brand)')}
                      onBlur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--c-rule)')}
                    />
                  </label>
                  <label className="flex cursor-pointer items-center gap-2.5 sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={anonymous}
                      onChange={(e) => setAnonymous(e.target.checked)}
                      className="h-4 w-4 rounded-sm"
                      style={{ accentColor: 'var(--c-brand)' }}
                    />
                    <span className="font-bengali text-[13.5px]" style={{ color: 'var(--c-ink-2)' }}>
                      {tr(
                        'নাম প্রকাশ না করে অনুদান দিন —',
                        'Donate anonymously —'
                      )}{' '}
                      <span style={{ color: 'var(--c-muted)' }}>
                        {tr('আপনার নাম পাবলিক তালিকায় দেখানো হবে না।', 'Your name will not appear in public lists.')}
                      </span>
                    </span>
                  </label>
                </div>
              </DonateCard>

              {/* 03 Frequency */}
              <DonateCard title={tr('৩. অনুদানের ধরন', '3. Frequency')} en="Frequency">
                <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--c-rule)' }}>
                  {([
                    { v: 'once',    bn: 'একবার', en: 'Once',    sub_bn: 'এককালীন অনুদান',        sub_en: 'One-time donation' },
                    { v: 'monthly', bn: 'মাসিক',  en: 'Monthly', sub_bn: 'প্রতি মাসে স্বয়ংক্রিয়', sub_en: 'Auto-renewed every month' },
                  ] as const).map((f) => {
                    const active = frequency === f.v;
                    return (
                      <button
                        key={f.v}
                        type="button"
                        onClick={() => setFrequency(f.v)}
                        className="rounded-[3px] p-4 text-left transition-colors"
                        style={{ background: active ? 'var(--c-brand)' : 'var(--c-paper)', color: active ? '#fff' : 'var(--c-ink)' }}
                      >
                        <div className="font-bengali text-[20px]" style={SERIF_BN}>{lang === 'en' ? f.en : f.bn}</div>
                        <div className="mt-1 font-bengali text-[12px]" style={{ opacity: 0.85 }}>{lang === 'en' ? f.sub_en : f.sub_bn}</div>
                      </button>
                    );
                  })}
                </div>
              </DonateCard>
            </div>

            {/* RIGHT sticky summary */}
            <aside className="col-span-12 lg:col-span-5">
              <div className="lg:sticky lg:top-24 space-y-4">
                <div className="overflow-hidden rounded-[3px]" style={{ background: 'var(--c-ink)', color: '#fff' }}>
                  <div className="p-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">
                      {tr('আপনার অনুদান', 'Your contribution')}
                    </div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="font-bengali text-[56px] leading-none" style={SERIF_BN}>₹{amountFmt}</span>
                      {frequency === 'monthly' && (
                        <span className="font-bengali text-[14px] text-white/70">
                          {tr('/ মাসে', '/ month')}
                        </span>
                      )}
                    </div>
                    {tier && !custom && (
                      <p className="mt-3 font-bengali text-[13.5px] text-white/85">
                        ≈ {lang === 'en' ? tier.en : tier.bn}
                      </p>
                    )}

                    <dl className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-[13px]">
                      <SummaryRow
                        label={donor.name ? (anonymous ? tr('অজ্ঞাতনামা', 'Anonymous') : donor.name) : tr('নাম', 'Name')}
                        value={donor.name ? '✓' : '—'}
                      />
                      <SummaryRow label={donor.email || tr('ইমেল', 'Email')} value={/\S+@\S+\.\S+/.test(donor.email) ? '✓' : '—'} />
                      <SummaryRow label={donor.phone || tr('ফোন', 'Phone')} value={donor.phone.replace(/\D/g, '').length >= 8 ? '✓' : '—'} />
                      <SummaryRow label={tr('ধরন', 'Type')} value={frequency === 'once' ? tr('একবার', 'Once') : tr('মাসিক', 'Monthly')} />
                      {donor.pan && <SummaryRow label="80G PAN" value={tr('✓ যুক্ত হয়েছে', '✓ Added')} />}
                    </dl>

                    <button
                      type="submit"
                      disabled={!ready}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 font-bengali text-[14px] font-semibold transition-all"
                      style={{
                        background: ready ? 'var(--c-brand)' : 'rgba(194,65,12,0.35)',
                        color: '#fff',
                        cursor: ready ? 'pointer' : 'not-allowed',
                        boxShadow: ready ? '0 10px 28px -10px var(--c-brand)' : 'none',
                      }}
                    >
                      ₹{amountFmt} {frequency === 'monthly' ? tr('মাসিক', 'monthly') : ''} {tr('অনুদান করুন', 'Donate')}
                      <Icon.Arrow className="h-3.5 w-3.5" />
                    </button>
                    <p className="mt-3 text-center font-bengali text-[11.5px] text-white/60">
                      🔒 {tr('নিরাপদ পেমেন্ট · Razorpay দ্বারা পরিচালিত', 'Secure payment · Powered by Razorpay')}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 border-t border-white/10 text-center">
                    {[{ t: '80G', s: tr('কর-ছাড়', 'Tax exempt') }, { t: 'TRUST', s: tr('রেজিস্টার্ড', 'Registered') }, { t: 'SSL', s: tr('এনক্রিপ্টেড', 'Encrypted') }].map((b, i) => (
                      <div key={b.t} className="p-4" style={{ borderLeft: i ? '1px solid rgba(255,255,255,0.10)' : 'none' }}>
                        <div className="font-bengali text-[17px]" style={SERIF_BN}>{b.t}</div>
                        <div className="mt-0.5 font-bengali text-[11px] text-white/60">{b.s}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Razorpay Quick Pay button */}
                <div className="rounded-[3px] border p-5 text-center" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-paper)' }}>
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                    {tr('সরাসরি পেমেন্ট', 'Quick Pay')}
                  </div>
                  <RazorpayButton />
                </div>

                <div className="rounded-[3px] border p-5" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-paper)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                    {tr('আপনার অর্থ যেখানে যায়', 'Where your money goes')}
                  </div>
                  <div className="mt-4 flex h-2 overflow-hidden rounded-full" style={{ background: 'var(--c-rule)' }}>
                    <span style={{ width: '85%', background: 'var(--c-brand)' }} />
                    <span style={{ width: '10%', background: 'var(--c-accent)' }} />
                    <span style={{ width: '5%',  background: 'var(--c-ink-2)' }} />
                  </div>
                  <ul className="mt-4 space-y-2 font-bengali text-[12.5px]" style={{ color: 'var(--c-ink-2)' }}>
                    <li className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><Dot c="var(--c-brand)" /> {tr('সরাসরি কর্মসূচিতে', 'Direct programmes')}</span>
                      <span className="font-mono">85%</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><Dot c="var(--c-accent)" /> {tr('অপারেশনস', 'Operations')}</span>
                      <span className="font-mono">10%</span>
                    </li>
                    <li className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><Dot c="var(--c-ink-2)" /> {tr('অডিট ও কমপ্লায়েন্স', 'Audit & compliance')}</span>
                      <span className="font-mono">5%</span>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </section>

      {/* FAQ */}
      <section style={{ background: 'var(--c-bg)' }}>
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:px-10">
          <div className="mb-10">
            <div className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
              FAQ · {tr('প্রশ্নোত্তর', 'Questions & Answers')}
            </div>
            <h2 className="mt-3 font-bengali text-[36px] leading-[1.1] md:text-[44px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
              {tr('অনুদান সম্পর্কে সচরাচর জিজ্ঞাসা', 'Frequently asked questions')}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px md:grid-cols-2" style={{ background: 'var(--c-rule)' }}>
            {FAQ_ITEMS.map((f, i) => (
              <details key={i} className="group p-6" style={{ background: 'var(--c-bg)' }}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>0{i + 1}</span>
                    <span className="font-bengali text-[18px] leading-snug" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                      {lang === 'en' ? f.q.en : f.q.bn}
                    </span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 transition-transform group-open:rotate-45" style={{ color: 'var(--c-brand)' }}>
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p className="mt-3 pl-8 font-bengali text-[14px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>
                  {lang === 'en' ? f.a.en : f.a.bn}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

// ─────────────────── helpers ───────────────────

function StepItem({ n, label, isLast }: { n: string; label: string; en: string; isLast: boolean }) {
  return (
    <>
      <li className="flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px]" style={{ background: 'var(--c-brand)', color: '#fff' }}>{n}</span>
        <span className="font-bengali" style={{ color: 'var(--c-ink)' }}>{label}</span>
      </li>
      {!isLast && <li className="h-px w-8" style={{ background: 'var(--c-rule)' }} />}
    </>
  );
}

function DonateCard({ title, en, children }: { title: string; en: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[3px] border" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-paper)' }}>
      <header className="flex items-center justify-between border-b p-5" style={{ borderColor: 'var(--c-rule)' }}>
        <h3 className="font-bengali text-[20px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{title}</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>{en}</span>
      </header>
      <div className="p-5">{children}</div>
    </div>
  );
}

function DonorField({ label, sub, placeholder, value, onChange, type = 'text', full = false }: {
  label: string; sub?: string; placeholder?: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? 'sm:col-span-2' : ''}`}>
      <span className="font-bengali text-[12.5px] font-medium" style={{ color: 'var(--c-muted)' }}>
        {label}
        {sub && <span className="ml-1.5 font-normal" style={{ opacity: 0.7 }}> · {sub}</span>}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="rounded-[3px] border bg-transparent px-3.5 py-2.5 font-bengali text-[14px] transition-colors focus:outline-none"
        style={{ borderColor: 'var(--c-rule)', color: 'var(--c-ink)' }}
        onFocus={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--c-brand)')}
        onBlur={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--c-rule)')}
      />
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-bengali text-white/75">{label}</span>
      <span className="font-mono text-[11.5px] text-white/85">{value}</span>
    </div>
  );
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />;
}
