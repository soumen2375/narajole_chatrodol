import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ORG } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { PageShell, PageHero, SERIF_BN, Icon } from './_field-journal';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function Contact() {
  const { t, lang } = useT();
  const bn = lang === 'bn';
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [bloodGroup, setBloodGroup] = useState('');
  const [bloodHospital, setBloodHospital] = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const isBloodRequest = form.subject === 'Blood required' || form.subject === 'রক্তের প্রয়োজন';
    const fullMessage = isBloodRequest && (bloodGroup || bloodHospital)
      ? `${form.message}\n\nBlood Group: ${bloodGroup || 'Not specified'}\nHospital: ${bloodHospital || 'Not specified'}`
      : form.message;
    const { error } = await supabase.from('cswo_contact_messages').insert([{
      name: form.name, phone: form.phone, email: form.email,
      subject: form.subject, message: fullMessage,
    }]);
    setStatus(error ? 'error' : 'sent');
  }

  const inputCls = `w-full rounded-[3px] border px-4 py-3 font-bengali text-[14px] bg-transparent outline-none transition-colors focus:border-[color:var(--c-brand)]`;
  const inputStyle = { borderColor: 'var(--c-rule)', color: 'var(--c-ink)' };

  const subjectOpts = t('contact.subjectOpts').split(',');

  return (
    <PageShell>
      <PageHero
        eyebrow={bn ? 'যোগাযোগ' : 'Contact'}
        title={t('contact.heroTitle')}
        lede={t('contact.heroLede')}
      />

      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-20 md:px-10">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">

            {/* Form */}
            <div className="lg:col-span-7">
              <div className="mb-8 border-b pb-5" style={{ borderColor: 'var(--c-rule)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                  {bn ? 'বার্তা পাঠান' : 'Send a Message'}
                </div>
                <h2 className="mt-3 font-bengali text-[28px] leading-tight" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>
                  {t('contact.replyTime')}
                </h2>
              </div>

              {/* Dedicated blood forms box */}
              <div className="mb-8 rounded-[4px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: 'rgba(194,65,12,0.04)', border: '1px solid rgba(194,65,12,0.15)' }}>
                <div>
                  <h4 className="font-bengali text-[15px] font-bold" style={{ color: 'var(--c-ink)' }}>
                    {bn ? 'রক্তের প্রয়োজন বা রক্তদান শিবির আয়োজন?' : 'Need Blood or Want to Organise a Camp?'}
                  </h4>
                  <p className="mt-1 font-bengali text-[13px]" style={{ color: 'var(--c-ink-2)' }}>
                    {bn ? 'দ্রুত প্রক্রিয়াকরণের জন্য আমাদের নিবেদিত রক্তের আবেদন এবং শিবিরের ফর্ম ব্যবহার করুন।' : 'Please use our dedicated forms for faster processing and support.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link to="/blood-request" className="rounded-full bg-red-700 px-4 py-2 font-bengali text-[12px] font-bold text-white hover:bg-red-800 transition-colors">
                    {bn ? 'রক্তের আবেদন' : 'Request Blood'}
                  </Link>
                  <Link to="/organise-blood-camp" className="rounded-full border px-4 py-2 font-bengali text-[12px] font-bold transition-colors hover:bg-black/5" style={{ borderColor: 'var(--c-rule)', color: 'var(--c-ink)' }}>
                    {bn ? 'শিবির আয়োজন' : 'Organise Camp'}
                  </Link>
                </div>
              </div>

              {status === 'sent' ? (
                <div className="rounded-[3px] border p-10 text-center" style={{ borderColor: 'var(--c-brand)', background: 'rgba(194,65,12,0.04)' }}>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--c-brand)' }}>
                    <Icon.Check className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-bengali text-[18px] font-medium" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>{t('contact.msgSent')}</p>
                  <p className="mt-2 font-bengali text-[13.5px]" style={{ color: 'var(--c-ink-2)' }}>{t('contact.msgSentSub')}</p>
                  <button
                    type="button"
                    onClick={() => { setForm({ name: '', phone: '', email: '', subject: '', message: '' }); setStatus('idle'); }}
                    className="mt-6 rounded-full px-6 py-2 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors hover:opacity-80"
                    style={{ background: 'var(--c-brand)', color: '#fff' }}
                  >
                    {t('contact.anotherMsg')}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {bn ? 'নাম *' : 'Name *'}
                      </label>
                      <input required value={form.name} onChange={set('name')} placeholder={bn ? 'আপনার নাম' : 'Your name'} className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                        {bn ? 'ফোন' : 'Phone'}
                      </label>
                      <input value={form.phone} onChange={set('phone')} placeholder={bn ? 'মোবাইল নম্বর' : 'Mobile number'} className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                      {bn ? 'ইমেল' : 'Email'}
                    </label>
                    <input type="email" value={form.email} onChange={set('email')} placeholder={bn ? 'আপনার ইমেল ঠিকানা' : 'Your email address'} className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                      {bn ? 'বিষয় *' : 'Subject *'}
                    </label>
                    <select required value={form.subject} onChange={set('subject')} className={inputCls} style={inputStyle}>
                      {subjectOpts.map((opt, i) => (
                        <option key={i} value={i === 0 ? '' : opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                  {(form.subject === 'Blood required' || form.subject === 'রক্তের প্রয়োজন') && (
                    <div className="rounded-[3px] border p-4 space-y-3" style={{ borderColor: 'var(--c-brand)', background: 'rgba(194,65,12,0.04)' }}>
                      <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-brand)' }}>
                        {bn ? 'রক্তের বিবরণ' : 'Blood Details'}
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                            {bn ? 'রক্তের গ্রুপ' : 'Blood Group'}
                          </label>
                          <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className={inputCls} style={inputStyle}>
                            <option value="">{bn ? 'বেছে নিন' : 'Select group'}</option>
                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((g) => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                            {bn ? 'হাসপাতাল' : 'Hospital'}
                          </label>
                          <input value={bloodHospital} onChange={(e) => setBloodHospital(e.target.value)} placeholder={bn ? 'হাসপাতালের নাম' : 'Hospital name'} className={inputCls} style={inputStyle} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                      {bn ? 'বার্তা *' : 'Message *'}
                    </label>
                    <textarea required rows={6} value={form.message} onChange={set('message')} placeholder={bn ? 'আপনার বার্তা এখানে লিখুন…' : 'Write your message here…'} className={`${inputCls} resize-none`} style={inputStyle} />
                  </div>
                  {status === 'error' && (
                    <p className="font-bengali text-[13px]" style={{ color: '#dc2626' }}>{t('contact.error')}</p>
                  )}
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="inline-flex items-center gap-2 rounded-full px-8 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-opacity disabled:opacity-60"
                    style={{ background: 'var(--c-brand)', color: '#fff' }}
                  >
                    {status === 'sending' ? t('contact.sending') : <>{t('contact.send')} <Icon.Arrow className="h-3 w-3" /></>}
                  </button>
                </form>
              )}
            </div>

            {/* Office info */}
            <div className="lg:col-span-5">
              <div className="sticky top-8 space-y-8">
                {/* Address */}
                <div className="rounded-[3px] border p-7" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                    {bn ? 'দফতর' : 'Office'}
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Icon.Map className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: 'var(--c-brand)' }} />
                    <div className="space-y-0.5">
                      {ORG.address[lang].map((line, i) => (
                        <p key={i} className="font-bengali text-[14px] leading-relaxed" style={{ color: i === 0 ? 'var(--c-ink)' : 'var(--c-ink-2)', fontWeight: i === 0 ? 600 : 400 }}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="rounded-[3px] border p-7" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                    {bn ? 'ফোন' : 'Phone'}
                  </div>
                  <div className="mt-4 space-y-2">
                    {ORG.phones.map((ph) => (
                      <a key={ph} href={`tel:+91${ph}`} className="flex items-center gap-3 transition-opacity hover:opacity-70">
                        <Icon.Phone className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--c-brand)' }} />
                        <span className="font-mono text-[15px]" style={{ color: 'var(--c-ink)' }}>+91 {ph}</span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div className="rounded-[3px] border p-7" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                    {bn ? 'ইমেল' : 'Email'}
                  </div>
                  <a href={`mailto:${ORG.email}`} className="mt-4 flex items-center gap-3 transition-opacity hover:opacity-70">
                    <Icon.Mail className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--c-brand)' }} />
                    <span className="font-mono text-[14px]" style={{ color: 'var(--c-ink)' }}>{ORG.email}</span>
                  </a>
                </div>

                {/* Map - Narajole, West Medinipur */}
                <div className="rounded-[3px] overflow-hidden" style={{ border: '1px solid var(--c-rule)' }}>
                  <iframe
                    title="Narajole Location"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=87.2500%2C22.3500%2C87.4500%2C22.5500&layer=mapnik&marker=22.4400%2C87.3200"
                    width="100%"
                    height="250"
                    style={{ border: 0, display: 'block' }}
                    loading="lazy"
                    allowFullScreen
                  />
                  <div className="px-3 py-2 text-center" style={{ background: 'var(--c-bg)' }}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--c-muted)' }}>
                      {bn ? 'নাড়াজোল, দাসপুর, পশ্চিম মেদিনীপুর' : 'Narajole, Daspur, Paschim Medinipur'}
                    </p>
                    <a
                      href="https://www.openstreetmap.org/?mlat=22.44&mlon=87.32#map=13/22.44/87.32"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block font-mono text-[9.5px] transition-opacity hover:opacity-70"
                      style={{ color: 'var(--c-brand)' }}
                    >
                      {bn ? 'বড় মানচিত্রে দেখুন' : 'View larger map'} →
                    </a>
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
