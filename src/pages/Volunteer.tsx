import { useState } from 'react';
import { VOLUNTEER_PROGRAM_OPTIONS } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { PageShell, PageHero, SERIF_BN, Icon } from './_field-journal';
import Breadcrumb from '@/components/ui/Breadcrumb';

export default function Volunteer() {
  const { t, lang } = useT();
  const bn = lang === 'bn';
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    area: VOLUNTEER_PROGRAM_OPTIONS[0].en,
    message: '',
    agree: false,
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agree) { setError(t('volunteer.agreeError')); return; }
    setStatus('sending');
    setError('');
    const { error: err } = await supabase.from('cswo_volunteer_applications').insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      area_of_interest: form.area,
      message: form.message || null,
    });
    if (err) { setStatus('error'); setError(t('volunteer.error')); return; }

    // Send confirmation email to user if email provided
    if (form.email) {
      try {
        await supabase.functions.invoke('send-volunteer-confirmation', {
          body: {
            name: form.name,
            email: form.email,
            area: form.area,
          },
        });
      } catch {
        // Email sending failure should not block success state
        console.warn('Confirmation email could not be sent');
      }
    }

    setStatus('sent');
    setForm({ name: '', email: '', phone: '', area: VOLUNTEER_PROGRAM_OPTIONS[0].en, message: '', agree: false });
  };

  const inputCls = `w-full rounded-[3px] border px-4 py-3 font-bengali text-[14px] bg-transparent outline-none transition-colors focus:border-[color:var(--c-brand)]`;
  const inputStyle = { borderColor: 'var(--c-rule)', color: 'var(--c-ink)' };

  return (
    <PageShell>
      <Breadcrumb title="Become a Volunteer" />
      <PageHero
        eyebrow={bn ? 'স্বেচ্ছাসেবক' : 'Volunteer'}
        title={t('volunteer.title')}
        lede={t('volunteer.subtitle')}
      />

      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-20 md:px-10">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">

            {/* Form */}
            <div className="lg:col-span-7">
              <div className="mb-8 border-b pb-5" style={{ borderColor: 'var(--c-rule)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                  {bn ? 'আবেদন ফর্ম' : 'Application Form'}
                </div>
                <h2 className="mt-3 font-bengali text-[28px] leading-tight" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                  {bn ? 'আপনার তথ্য পূরণ করুন।' : 'Fill in your details.'}
                </h2>
              </div>

              {status === 'sent' ? (
                <div className="rounded-[3px] border p-10 text-center" style={{ borderColor: 'var(--c-brand)', background: 'rgba(194,65,12,0.04)' }}>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--c-brand)' }}>
                    <Icon.Check className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-bengali text-[18px] font-medium" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                    {bn ? 'আবেদন জমা হয়েছে।' : 'Application submitted.'}
                  </p>
                  <p className="mt-2 font-bengali text-[13.5px]" style={{ color: 'var(--c-ink-2)' }}>{t('volunteer.success')}</p>
                  {form.email === '' && (
                    <p className="mt-2 font-bengali text-[12px]" style={{ color: 'var(--c-muted)' }}>
                      {bn ? '\u0987\u09ae\u09c7\u09b2 \u09a6\u09bf\u09b2\u09c7 \u09a8\u09bf\u09b6\u09cd\u099a\u09bf\u09a4\u0995\u09b0\u09a3 \u099c\u09be\u09a8\u09be\u09a8\u09cb \u09b9\u09a4\u09cb\u0964' : 'Provide your email to receive a confirmation.'}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setStatus('idle')}
                    className="mt-6 rounded-full px-6 py-2 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors hover:opacity-80"
                    style={{ background: 'var(--c-brand)', color: '#fff' }}
                  >
                    {bn ? 'আরেকটি আবেদন' : 'Apply again'}
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                      {bn ? 'পূর্ণ নাম *' : 'Full Name *'}
                    </label>
                    <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={bn ? 'আপনার পূর্ণ নাম' : 'Your full name'} className={inputCls} style={inputStyle} />
                  </div>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {bn ? 'ইমেল' : 'Email'}
                      </label>
                      <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder={bn ? 'আপনার ইমেল' : 'Your email'} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {bn ? 'ফোন *' : 'Phone *'}
                      </label>
                      <input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder={bn ? 'মোবাইল নম্বর' : 'Mobile number'} className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                      {t('volunteer.interest')}
                    </label>
                    <select value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} className={inputCls} style={inputStyle}>
                      {VOLUNTEER_PROGRAM_OPTIONS.map((o) => (
                        <option key={o.en} value={o.en}>{o[lang]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                      {t('volunteer.motivation')}
                    </label>
                    <textarea rows={5} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} placeholder={bn ? 'আপনার প্রেরণা ও অভিজ্ঞতা লিখুন…' : 'Share your motivation and experience…'} className={`${inputCls} resize-none`} style={inputStyle} />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={form.agree}
                      onChange={(e) => setForm((f) => ({ ...f, agree: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded accent-[#c2410c]"
                    />
                    <span className="font-bengali text-[13.5px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{t('volunteer.agree')}</span>
                  </label>
                  {error && (
                    <p className="font-bengali text-[13px]" style={{ color: '#dc2626' }}>{error}</p>
                  )}
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="inline-flex items-center gap-2 rounded-full px-8 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-opacity disabled:opacity-60"
                    style={{ background: 'var(--c-brand)', color: '#fff' }}
                  >
                    {status === 'sending' ? t('volunteer.submitting') : <>{t('volunteer.submit')} <Icon.Arrow className="h-3 w-3" /></>}
                  </button>
                </form>
              )}
            </div>

            {/* Why volunteer panel */}
            <div className="lg:col-span-5">
              <div className="sticky top-8 space-y-6">
                <div className="rounded-[3px] border p-7" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                    {bn ? 'কেন স্বেচ্ছাসেবক হবেন?' : 'Why Volunteer?'}
                  </div>
                  <ul className="mt-5 space-y-4">
                    {[
                      { icon: Icon.Heart, bn: 'সরাসরি সমাজের উপকারে আসুন', en: 'Make a direct impact on the community' },
                      { icon: Icon.Grad,  bn: 'নতুন দক্ষতা ও অভিজ্ঞতা অর্জন করুন', en: 'Gain new skills and experiences' },
                      { icon: Icon.Users, bn: 'একটি উৎসাহী দলের অংশ হোন', en: 'Be part of a passionate team' },
                      { icon: Icon.Tree,  bn: 'পরিবেশ ও সমাজ রক্ষায় অবদান রাখুন', en: 'Contribute to a greener, stronger society' },
                    ].map(({ icon: IIcon, bn: bnText, en }) => (
                      <li key={en} className="flex items-start gap-3">
                        <IIcon className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: 'var(--c-brand)' }} />
                        <span className="font-bengali text-[14px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>{bn ? bnText : en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[3px] border p-7" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                    {bn ? 'কার্যক্রম' : 'Programme Areas'}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {VOLUNTEER_PROGRAM_OPTIONS.map((o) => (
                      <span key={o.en} className="rounded-full px-3 py-1 font-bengali text-[12px]" style={{ background: 'rgba(194,65,12,0.08)', color: 'var(--c-brand)' }}>
                        {o[lang]}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>
    </PageShell>
  );
}
