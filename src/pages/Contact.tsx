import { useState } from 'react';
import { ORG } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { PageShell, PageHero, SERIF_BN, Icon } from './_field-journal';

// ════════════════════════════════════════════════════════════════════
//  Contact — যোগাযোগ
// ════════════════════════════════════════════════════════════════════

type Status = 'idle' | 'sending' | 'sent' | 'error';

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    const { error } = await supabase.from('cswo_messages').insert([{
      name: form.name, phone: form.phone, email: form.email,
      subject: form.subject, message: form.message,
    }]);
    setStatus(error ? 'error' : 'sent');
  }

  const inputCls = `w-full rounded-[3px] border px-4 py-3 font-bengali text-[14px] bg-transparent outline-none transition-colors focus:border-[color:var(--c-brand)]`;
  const inputStyle = { borderColor: 'var(--c-rule)', color: 'var(--c-ink)' };

  return (
    <PageShell>
      <PageHero
        eyebrow="Contact · যোগাযোগ"
        title="আমাদের সাথে কথা বলুন।"
        lede="প্রশ্ন, পরামর্শ, স্বেচ্ছাসেবী হওয়ার আগ্রহ — যেকোনো কারণে নির্দ্বিধায় যোগাযোগ করুন।"
      />

      <section style={{ background: 'var(--c-paper)' }}>
        <div className="mx-auto max-w-[1320px] px-6 py-20 md:px-10">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12">

            {/* Form — col-span-7 */}
            <div className="lg:col-span-7">
              <div className="mb-8 border-b pb-5" style={{ borderColor: 'var(--c-rule)' }}>
                <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Send a Message · বার্তা পাঠান</div>
                <h2 className="mt-3 font-bengali text-[28px] leading-tight" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>আমরা সাড়া দিই ২৪ ঘণ্টার মধ্যে।</h2>
              </div>

              {status === 'sent' ? (
                <div className="rounded-[3px] border p-10 text-center" style={{ borderColor: 'var(--c-brand)', background: 'rgba(194,65,12,0.04)' }}>
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--c-brand)' }}>
                    <Icon.Check className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-bengali text-[18px] font-medium" style={{ ...SERIF_BN, color: 'var(--c-ink)' }}>বার্তা পৌঁছে গেছে।</p>
                  <p className="mt-2 font-bengali text-[13.5px]" style={{ color: 'var(--c-ink-2)' }}>শীঘ্রই আমরা যোগাযোগ করব।</p>
                  <button
                    type="button"
                    onClick={() => { setForm({ name: '', phone: '', email: '', subject: '', message: '' }); setStatus('idle'); }}
                    className="mt-6 rounded-full px-6 py-2 font-mono text-[11px] uppercase tracking-[0.22em] transition-colors hover:opacity-80"
                    style={{ background: 'var(--c-brand)', color: '#fff' }}
                  >
                    আরেকটি বার্তা
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Name · নাম *</label>
                      <input required value={form.name} onChange={set('name')} placeholder="আপনার নাম" className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Phone · ফোন</label>
                      <input value={form.phone} onChange={set('phone')} placeholder="মোবাইল নম্বর" className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Email · ইমেল</label>
                    <input type="email" value={form.email} onChange={set('email')} placeholder="আপনার ইমেল ঠিকানা" className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Subject · বিষয় *</label>
                    <select required value={form.subject} onChange={set('subject')} className={inputCls} style={inputStyle}>
                      <option value="">বিষয় বেছে নিন…</option>
                      <option value="volunteer">স্বেচ্ছাসেবী হতে চাই</option>
                      <option value="donate">দান সংক্রান্ত জিজ্ঞাসা</option>
                      <option value="program">কর্মসূচি সম্পর্কে</option>
                      <option value="media">মিডিয়া / সংবাদ</option>
                      <option value="other">অন্যান্য</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Message · বার্তা *</label>
                    <textarea required rows={6} value={form.message} onChange={set('message')} placeholder="আপনার বার্তা এখানে লিখুন…" className={`${inputCls} resize-none`} style={inputStyle} />
                  </div>
                  {status === 'error' && (
                    <p className="font-bengali text-[13px]" style={{ color: '#dc2626' }}>কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।</p>
                  )}
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="inline-flex items-center gap-2 rounded-full px-8 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-opacity disabled:opacity-60"
                    style={{ background: 'var(--c-brand)', color: '#fff' }}
                  >
                    {status === 'sending' ? 'পাঠানো হচ্ছে…' : <>বার্তা পাঠান <Icon.Arrow className="h-3 w-3" /></>}
                  </button>
                </form>
              )}
            </div>

            {/* Office info — col-span-5 */}
            <div className="lg:col-span-5">
              <div className="sticky top-8 space-y-8">
                {/* Address */}
                <div className="rounded-[3px] border p-7" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Office · দফতর</div>
                  <div className="mt-4 flex gap-3">
                    <Icon.Map className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: 'var(--c-brand)' }} />
                    <div className="space-y-0.5">
                      {ORG.address.bn.map((line, i) => (
                        <p key={i} className="font-bengali text-[14px] leading-relaxed" style={{ color: i === 0 ? 'var(--c-ink)' : 'var(--c-ink-2)', fontWeight: i === 0 ? 600 : 400 }}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="rounded-[3px] border p-7" style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)' }}>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Phone · ফোন</div>
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
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>Email · ইমেল</div>
                  <a href={`mailto:${ORG.email}`} className="mt-4 flex items-center gap-3 transition-opacity hover:opacity-70">
                    <Icon.Mail className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--c-brand)' }} />
                    <span className="font-mono text-[14px]" style={{ color: 'var(--c-ink)' }}>{ORG.email}</span>
                  </a>
                </div>

                {/* Map placeholder */}
                <div
                  className="flex items-center justify-center rounded-[3px] border"
                  style={{ borderColor: 'var(--c-rule)', background: 'var(--c-bg)', minHeight: '220px' }}
                >
                  <div className="text-center">
                    <Icon.Map className="mx-auto h-8 w-8 opacity-20" style={{ color: 'var(--c-ink)' }} />
                    <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--c-muted)' }}>
                      Narajole, Daspur<br />Paschim Medinipur
                    </p>
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
