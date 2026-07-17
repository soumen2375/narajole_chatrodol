import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { PageShell, PageHero, SERIF_BN, Icon } from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  Blood Camp Application — Public form to organise a blood camp
// ════════════════════════════════════════════════════════════════════

export default function BloodCampApplication() {
  const { t, lang } = useT();
  const bn = lang === 'bn';
  const [form, setForm] = useState({
    org_name: '',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    proposed_date: '',
    proposed_venue: '',
    expected_donors: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    const { error } = await supabase.from('cswo_blood_camp_applications').insert({
      org_name: form.org_name || null,
      contact_name: form.contact_name,
      contact_phone: form.contact_phone,
      contact_email: form.contact_email || null,
      proposed_date: form.proposed_date || null,
      proposed_venue: form.proposed_venue,
      expected_donors: Number(form.expected_donors) || null,
      message: form.message || null,
      status: 'pending',
    });
    setStatus(error ? 'error' : 'sent');
  };

  const inputCls = `w-full rounded-[3px] border px-4 py-3 font-bengali text-[14px] bg-transparent outline-none transition-colors focus:border-[color:var(--c-brand)]`;
  const inputStyle = { borderColor: 'var(--c-rule)', color: 'var(--c-ink)' };

  return (
    <PageShell>
      <PageHero
        eyebrow={bn ? 'রক্তদান শিবির' : 'Blood Camp'}
        title={t('blood.campTitle')}
        lede={t('blood.campSubtitle')}
      />

      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {status === 'sent' ? (
                <div className="rounded-[3px] border p-10 text-center" style={{ borderColor: 'var(--c-brand)', background: 'rgba(194,65,12,0.04)' }}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--c-brand)' }}>
                    <Icon.Check className="h-7 w-7 text-white" />
                  </div>
                  <p className="font-bengali text-[20px] font-semibold" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                    {bn ? 'আবেদন গৃহীত হয়েছে!' : 'Application Received!'}
                  </p>
                  <p className="mt-2 font-bengali text-[14px]" style={{ color: 'var(--c-ink-2)' }}>
                    {t('blood.submitSuccess')}
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.orgName')}
                      </label>
                      <input value={form.org_name} onChange={set('org_name')} placeholder={bn ? 'সংগঠনের নাম (যদি থাকে)' : 'Organization name (if any)'} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {bn ? 'যোগাযোগের নাম *' : 'Contact Name *'}
                      </label>
                      <input required value={form.contact_name} onChange={set('contact_name')} placeholder={bn ? 'আপনার নাম' : 'Your name'} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.contactPhone')} *
                      </label>
                      <input required type="tel" value={form.contact_phone} onChange={set('contact_phone')} placeholder={bn ? 'ফোন নম্বর' : 'Phone number'} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {bn ? 'ইমেল' : 'Email'}
                      </label>
                      <input type="email" value={form.contact_email} onChange={set('contact_email')} placeholder={bn ? 'ইমেল ঠিকানা' : 'Email address'} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.proposedDate')}
                      </label>
                      <input type="date" value={form.proposed_date} onChange={set('proposed_date')} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.expectedDonors')}
                      </label>
                      <input type="number" min="10" value={form.expected_donors} onChange={set('expected_donors')} placeholder="50" className={inputCls} style={inputStyle} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.proposedVenue')} *
                      </label>
                      <input required value={form.proposed_venue} onChange={set('proposed_venue')} placeholder={bn ? 'প্রস্তাবিত স্থান ও ঠিকানা' : 'Proposed venue and address'} className={inputCls} style={inputStyle} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {bn ? 'অতিরিক্ত বার্তা' : 'Additional Message'}
                      </label>
                      <textarea rows={4} value={form.message} onChange={set('message')} placeholder={bn ? 'যেকোনো তথ্য বা প্রশ্ন…' : 'Any details or questions…'} className={`${inputCls} resize-none`} style={inputStyle} />
                    </div>
                  </div>
                  {status === 'error' && (
                    <p className="font-bengali text-[13px]" style={{ color: '#dc2626' }}>
                      {bn ? 'আবেদন জমা দিতে সমস্যা হয়েছে।' : 'Could not submit your application.'}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-bengali text-[13px] font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{ background: 'var(--c-brand)' }}
                  >
                    {status === 'sending' ? (bn ? 'পাঠানো হচ্ছে…' : 'Submitting…') : <>{t('blood.submitRequest')} <Icon.Arrow className="h-3 w-3" /></>}
                  </button>
                </form>
              )}
            </div>

            <div className="lg:col-span-5">
              <div className="sticky top-8 space-y-5">
                <div className="rounded-[3px] border p-6" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                    {bn ? 'আমরা যা প্রদান করি' : 'What We Provide'}
                  </div>
                  <ul className="mt-4 space-y-3">
                    {[
                      { bn: 'রক্তদাতা নিয়োগ ও ব্যবস্থাপনা', en: 'Donor recruitment & management' },
                      { bn: 'মেডিকেল টিম সহায়তা', en: 'Medical team support' },
                      { bn: 'সার্টিফিকেট ও নিবন্ধন', en: 'Certificates & registration' },
                      { bn: 'প্রচার ও মিডিয়া কভারেজ', en: 'Promotion & media coverage' },
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Icon.Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--c-brand)' }} />
                        <span className="font-bengali text-[14px]" style={{ color: 'var(--c-ink-2)' }}>
                          {bn ? item.bn : item.en}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
