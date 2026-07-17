import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { PageShell, PageHero, SERIF_BN, Icon } from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  Blood Request — Public form for urgent blood requests
// ════════════════════════════════════════════════════════════════════

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

export default function BloodRequest() {
  const { t, lang } = useT();
  const bn = lang === 'bn';
  const [form, setForm] = useState({
    patient_name: '',
    blood_group: '',
    hospital: '',
    contact_phone: '',
    units_needed: '1',
    required_by: '',
    requester_name: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrMsg('');
    const { error } = await supabase.from('cswo_blood_requests').insert({
      patient_name: form.patient_name,
      blood_group: form.blood_group,
      hospital: form.hospital,
      contact_phone: form.contact_phone,
      units_needed: Number(form.units_needed) || 1,
      required_by: form.required_by || null,
      requester_name: form.requester_name || null,
      message: form.message || null,
      status: 'open',
    });
    if (error) {
      setErrMsg(error.message || (bn ? 'আবেদন জমা দিতে সমস্যা হয়েছে।' : 'Could not submit your request. Please try again.'));
    }
    setStatus(error ? 'error' : 'sent');
  };

  const inputCls = `w-full rounded-[3px] border px-4 py-3 font-bengali text-[14px] bg-transparent outline-none transition-colors focus:border-[color:var(--c-brand)]`;
  const inputStyle = { borderColor: 'var(--c-rule)', color: 'var(--c-ink)' };

  return (
    <PageShell>
      <PageHero
        eyebrow={bn ? 'জরুরি রক্ত' : 'Emergency Blood'}
        title={t('blood.requestTitle')}
        lede={t('blood.requestSubtitle')}
      />

      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-16 md:px-10">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            {/* Form */}
            <div className="lg:col-span-7">
              {status === 'sent' ? (
                <div className="rounded-[3px] border p-10 text-center" style={{ borderColor: 'var(--c-brand)', background: 'rgba(194,65,12,0.04)' }}>
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'var(--c-brand)' }}>
                    <Icon.Heart className="h-7 w-7 text-white" />
                  </div>
                  <p className="font-bengali text-[20px] font-semibold" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                    {bn ? 'আবেদন গৃহীত হয়েছে' : 'Request Submitted'}
                  </p>
                  <p className="mt-2 font-bengali text-[14px]" style={{ color: 'var(--c-ink-2)' }}>
                    {t('blood.submitSuccess')}
                  </p>
                  <button
                    onClick={() => { setStatus('idle'); setForm({ patient_name: '', blood_group: '', hospital: '', contact_phone: '', units_needed: '1', required_by: '', requester_name: '', message: '' }); }}
                    className="mt-6 rounded-full px-6 py-2.5 font-bengali text-[12px] font-semibold text-white"
                    style={{ background: 'var(--c-brand)' }}
                  >
                    {bn ? 'আরেকটি আবেদন' : 'Submit Another'}
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.patientName')} *
                      </label>
                      <input required value={form.patient_name} onChange={set('patient_name')} placeholder={bn ? 'রোগীর পুরো নাম' : "Patient's full name"} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.bloodGroup')} *
                      </label>
                      <select required value={form.blood_group} onChange={set('blood_group')} className={inputCls} style={inputStyle}>
                        <option value="">{bn ? 'রক্তের গ্রুপ বেছে নিন' : 'Select blood group'}</option>
                        {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.unitsNeeded')}
                      </label>
                      <input type="number" min="1" max="10" value={form.units_needed} onChange={set('units_needed')} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.hospital')} *
                      </label>
                      <input required value={form.hospital} onChange={set('hospital')} placeholder={bn ? 'হাসপাতালের নাম ও জায়গা' : 'Hospital name and location'} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.contactPhone')} *
                      </label>
                      <input required type="tel" value={form.contact_phone} onChange={set('contact_phone')} placeholder={bn ? 'যোগাযোগের নম্বর' : 'Contact number'} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {t('blood.requiredDate')}
                      </label>
                      <input type="date" value={form.required_by} onChange={set('required_by')} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {bn ? 'আবেদনকারীর নাম' : 'Requester Name'}
                      </label>
                      <input value={form.requester_name} onChange={set('requester_name')} placeholder={bn ? 'আপনার নাম' : 'Your name'} className={inputCls} style={inputStyle} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {bn ? 'অতিরিক্ত তথ্য' : 'Additional Info'}
                      </label>
                      <textarea rows={3} value={form.message} onChange={set('message')} placeholder={bn ? 'যেকোনো গুরুত্বপূর্ণ তথ্য…' : 'Any important details…'} className={`${inputCls} resize-none`} style={inputStyle} />
                    </div>
                  </div>
                  {status === 'error' && (
                    <div className="rounded-[3px] border px-4 py-3" style={{ borderColor: '#fca5a5', background: '#fef2f2' }}>
                      <p className="font-bengali text-[13px] font-semibold" style={{ color: '#dc2626' }}>
                        {bn ? '⚠ আবেদন জমা দিতে সমস্যা হয়েছে।' : '⚠ Could not submit your request.'}
                      </p>
                      {errMsg && (
                        <p className="mt-1 font-mono text-[11px]" style={{ color: '#b91c1c' }}>{errMsg}</p>
                      )}
                      <p className="mt-1.5 font-bengali text-[12px]" style={{ color: '#7f1d1d' }}>
                        {bn ? 'অনুগ্রহ করে আবার চেষ্টা করুন বা সরাসরি যোগাযোগ করুন।' : 'Please try again or contact us directly.'}
                      </p>
                    </div>
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

            {/* Info panel */}
            <div className="lg:col-span-5">
              <div className="sticky top-8 space-y-5">
                <div className="rounded-[3px] border p-6" style={{ borderColor: 'rgba(194,65,12,0.3)', background: 'rgba(194,65,12,0.04)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-brand)' }}>
                    {bn ? 'জরুরি যোগাযোগ' : 'Emergency Contact'}
                  </div>
                  <p className="mt-3 font-bengali text-[14px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>
                    {bn
                      ? 'আবেদন পাওয়ার পর আমরা আমাদের রক্তদাতা তালিকা থেকে উপযুক্ত দাতাদের সাথে যোগাযোগ করব।'
                      : 'After receiving your request, we will contact suitable donors from our blood donor registry.'}
                  </p>
                  <p className="mt-3 font-bengali text-[13px]" style={{ color: 'var(--c-muted)' }}>
                    {bn ? '⏱ সাধারণত ২-৪ ঘণ্টার মধ্যে সাড়া দেওয়া হয়।' : '⏱ We typically respond within 2-4 hours.'}
                  </p>
                </div>
                <div className="rounded-[3px] border p-6" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                    {bn ? 'রক্তদাতা হোন' : 'Become a Blood Donor'}
                  </div>
                  <p className="mt-2 font-bengali text-[13.5px] leading-relaxed" style={{ color: 'var(--c-ink-2)' }}>
                    {bn
                      ? 'রক্তদান করে একজনের জীবন বাঁচান। আমাদের পরবর্তী রক্তদান শিবিরে অংশ নিন।'
                      : 'Save a life by donating blood. Join our next blood donation camp.'}
                  </p>
                  <a href="/events" className="mt-3 inline-flex items-center gap-1 font-bengali text-[12.5px] font-semibold" style={{ color: 'var(--c-brand)' }}>
                    {bn ? 'অনুষ্ঠান দেখুন' : 'View Events'} →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
