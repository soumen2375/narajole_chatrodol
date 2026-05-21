import { useState } from 'react';
import { PageShell, PageHero, SERIF_BN, Icon } from './_field-journal';
import { startRazorpayPayment } from '@/lib/razorpay';

// ════════════════════════════════════════════════════════════════════
//  Donate — অনুদান দিন
// ════════════════════════════════════════════════════════════════════

const TIERS = [
  { amount: 500,   label: 'একজন শিক্ষার্থীর বইপত্র' },
  { amount: 1000,  label: 'একটি রক্তদান শিবিরে অংশগ্রহণ' },
  { amount: 2500,  label: 'একজন রোগীর প্রাথমিক চিকিৎসা' },
  { amount: 5000,  label: 'একটি পরিবারের শীতবস্ত্র' },
  { amount: 10000, label: 'একটি গ্রামের স্বাস্থ্য শিবির' },
];

type Frequency = 'once' | 'monthly';

export default function Donate() {
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
    donor.name.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(donor.email) &&
    donor.phone.replace(/\D/g, '').length >= 8;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    startRazorpayPayment({
      action: 'create_donation_order',
      amount,
      description: 'Donation to Narajol Chhatradol',
      donorName: anonymous ? 'অজ্ঞাতনামা' : donor.name,
      donorEmail: donor.email,
      donorPhone: donor.phone,
      isAnonymous: anonymous,
    });
  };

  return (
    <PageShell>
      <PageHero
        eyebrow="Donate · অনুদান দিন"
        title="ছোট অনুদান, বড় পরিবর্তন।"
        lede="প্রতিটি অনুদান সরাসরি মাঠ-পর্যায়ের কর্মসূচিতে যায়। তিনটি ধাপে শেষ করুন — পরিমাণ বাছুন, বিবরণ দিন, নিরাপদ পেমেন্টে এগিয়ে যান।"
      />

      {/* Stepper */}
      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1100px] px-6 pt-12 md:px-10">
          <ol className="flex flex-wrap items-center gap-3 font-mono text-[12px] uppercase tracking-[0.22em]">
            {[
              { n: '01', label: 'পরিমাণ',      en: 'Amount' },
              { n: '02', label: 'আপনার বিবরণ', en: 'Your details' },
              { n: '03', label: 'পেমেন্ট',      en: 'Payment' },
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
              <DonateCard title="১. অনুদানের পরিমাণ" en="Amount">
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
                          {t.label.split(' ').slice(0, 4).join(' ')}…
                        </span>
                      </button>
                    );
                  })}
                </div>
                <label
                  className="mt-5 flex items-center gap-3 rounded-[3px] border p-4"
                  style={{ borderColor: custom ? 'var(--c-brand)' : 'var(--c-rule)', background: 'var(--c-bg)' }}
                >
                  <span className="font-bengali text-[13px] font-medium" style={{ color: 'var(--c-muted)' }}>অন্য পরিমাণ:</span>
                  <span className="font-bengali text-[22px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>₹</span>
                  <input
                    type="number"
                    placeholder="অন্য একটি পরিমাণ লিখুন"
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    className="w-full bg-transparent font-bengali text-[22px] focus:outline-none"
                    style={{ ...SERIF_BN, color: 'var(--c-ink)' }}
                  />
                </label>
              </DonateCard>

              {/* 02 Donor details */}
              <DonateCard title="২. আপনার বিবরণ" en="Your details">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <DonorField label="পুরো নাম *"  placeholder="Soumen Maity"    value={donor.name}  onChange={setField('name')}  full />
                  <DonorField label="ইমেল *"      placeholder="name@example.com" value={donor.email} onChange={setField('email')} type="email" />
                  <DonorField label="ফোন *"       placeholder="9749852865"       value={donor.phone} onChange={setField('phone')} type="tel" />
                  <DonorField label="PAN নম্বর" sub="80G কর-ছাড়ের জন্য (ঐচ্ছিক)" placeholder="ABCDE1234F" value={donor.pan} onChange={setField('pan')} full />
                  <label className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="font-bengali text-[12.5px] font-medium" style={{ color: 'var(--c-muted)' }}>একটি বার্তা (ঐচ্ছিক)</span>
                    <textarea
                      rows={3}
                      placeholder="আপনার শুভেচ্ছা বা কোনো বিশেষ ভাবনা..."
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
                      নাম প্রকাশ না করে অনুদান দিন —{' '}
                      <span style={{ color: 'var(--c-muted)' }}>আপনার নাম পাবলিক তালিকায় দেখানো হবে না।</span>
                    </span>
                  </label>
                </div>
              </DonateCard>

              {/* 03 Frequency */}
              <DonateCard title="৩. অনুদানের ধরন" en="Frequency">
                <div className="grid grid-cols-2 gap-px" style={{ background: 'var(--c-rule)' }}>
                  {([
                    { v: 'once',    title: 'একবার', sub: 'এককালীন অনুদান' },
                    { v: 'monthly', title: 'মাসিক',  sub: 'প্রতি মাসে স্বয়ংক্রিয়' },
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
                        <div className="font-bengali text-[20px]" style={SERIF_BN}>{f.title}</div>
                        <div className="mt-1 font-bengali text-[12px]" style={{ opacity: 0.85 }}>{f.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </DonateCard>
            </div>

            {/* RIGHT sticky summary */}
            <aside className="col-span-12 lg:col-span-5">
              <div className="lg:sticky lg:top-24">
                <div className="overflow-hidden rounded-[3px]" style={{ background: 'var(--c-ink)', color: '#fff' }}>
                  <div className="p-6">
                    <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/60">Your contribution</div>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="font-bengali text-[56px] leading-none" style={SERIF_BN}>₹{amountFmt}</span>
                      {frequency === 'monthly' && <span className="font-bengali text-[14px] text-white/70">/ মাসে</span>}
                    </div>
                    {tier && !custom && (
                      <p className="mt-3 font-bengali text-[13.5px] text-white/85">≈ {tier.label}</p>
                    )}

                    <dl className="mt-6 space-y-2.5 border-t border-white/10 pt-5 text-[13px]">
                      <SummaryRow label={donor.name ? (anonymous ? 'অজ্ঞাতনামা' : donor.name) : 'নাম'} value={donor.name ? '✓' : '—'} />
                      <SummaryRow label={donor.email || 'ইমেল'} value={/\S+@\S+\.\S+/.test(donor.email) ? '✓' : '—'} />
                      <SummaryRow label={donor.phone || 'ফোন'}  value={donor.phone.replace(/\D/g, '').length >= 8 ? '✓' : '—'} />
                      <SummaryRow label="ধরন" value={frequency === 'once' ? 'একবার' : 'মাসিক'} />
                      {donor.pan && <SummaryRow label="80G PAN" value="✓ যুক্ত হয়েছে" />}
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
                      ₹{amountFmt} {frequency === 'monthly' ? 'মাসিক' : ''} অনুদান করুন
                      <Icon.Arrow className="h-3.5 w-3.5" />
                    </button>
                    <p className="mt-3 text-center font-bengali text-[11.5px] text-white/60">
                      🔒 নিরাপদ পেমেন্ট · Razorpay দ্বারা পরিচালিত
                    </p>
                  </div>

                  <div className="grid grid-cols-3 border-t border-white/10 text-center">
                    {[{ t: '80G', s: 'কর-ছাড়' }, { t: 'TRUST', s: 'রেজিস্টার্ড' }, { t: 'SSL', s: 'এনক্রিপ্টেড' }].map((b, i) => (
                      <div key={b.t} className="p-4" style={{ borderLeft: i ? '1px solid rgba(255,255,255,0.10)' : 'none' }}>
                        <div className="font-bengali text-[17px]" style={SERIF_BN}>{b.t}</div>
                        <div className="mt-0.5 font-bengali text-[11px] text-white/60">{b.s}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-[3px] border p-5" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-paper)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Where your money goes</div>
                  <div className="mt-4 flex h-2 overflow-hidden rounded-full" style={{ background: 'var(--c-rule)' }}>
                    <span style={{ width: '85%', background: 'var(--c-brand)' }} />
                    <span style={{ width: '10%', background: 'var(--c-accent)' }} />
                    <span style={{ width: '5%',  background: 'var(--c-ink-2)' }} />
                  </div>
                  <ul className="mt-4 space-y-2 font-bengali text-[12.5px]" style={{ color: 'var(--c-ink-2)' }}>
                    <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Dot c="var(--c-brand)" /> সরাসরি কর্মসূচিতে</span><span className="font-mono">৮৫%</span></li>
                    <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Dot c="var(--c-accent)" /> অপারেশনস</span><span className="font-mono">১০%</span></li>
                    <li className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Dot c="var(--c-ink-2)" /> অডিট ও কমপ্লায়েন্স</span><span className="font-mono">৫%</span></li>
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
            <div className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>FAQ · প্রশ্নোত্তর</div>
            <h2 className="mt-3 font-bengali text-[36px] leading-[1.1] md:text-[44px]" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
              অনুদান সম্পর্কে সচরাচর জিজ্ঞাসা
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px md:grid-cols-2" style={{ background: 'var(--c-rule)' }}>
            {[
              { q: 'অনুদান কি কর-ছাড় যোগ্য?',        a: 'হ্যাঁ। আমরা একটি রেজিস্টার্ড পাবলিক চ্যারিটেবল ট্রাস্ট, এবং 80G সার্টিফিকেট রয়েছে। PAN দিলে রসিদ ইমেলে পাঠানো হবে।' },
              { q: 'অনুদান কিভাবে কাজে লাগে?',        a: '৮৫% সরাসরি মাঠ-পর্যায়ের কর্মসূচিতে যায় — শিক্ষা, স্বাস্থ্য শিবির, ত্রাণ ও পরিবেশ। বাকি ১৫% অপারেশনস ও অডিট।' },
              { q: 'মাসিক অনুদান বাতিল করা যাবে?',   a: 'যেকোনো সময়। আপনার সদস্য পোর্টাল থেকে এক ক্লিকে বন্ধ করতে পারবেন।' },
              { q: 'পেমেন্ট কতটা নিরাপদ?',            a: 'সমস্ত লেনদেন Razorpay-এর PCI-DSS কম্প্লায়েন্ট সিস্টেমের মাধ্যমে এনক্রিপ্টেড। আমরা কার্ডের তথ্য সংরক্ষণ করি না।' },
            ].map((f, i) => (
              <details key={f.q} className="group p-6" style={{ background: 'var(--c-bg)' }}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>0{i + 1}</span>
                    <span className="font-bengali text-[18px] leading-snug" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{f.q}</span>
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 transition-transform group-open:rotate-45" style={{ color: 'var(--c-brand)' }}>
                    <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <p className="mt-3 pl-8 font-bengali text-[14px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

// ─────────────────── helpers ───────────────────

function StepItem({ n, label, en, isLast }: { n: string; label: string; en: string; isLast: boolean }) {
  return (
    <>
      <li className="flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[11px]" style={{ background: 'var(--c-brand)', color: '#fff' }}>{n}</span>
        <span className="font-bengali" style={{ color: 'var(--c-ink)' }}>{label}</span>
        <span style={{ color: 'var(--c-muted)' }}>· {en}</span>
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
