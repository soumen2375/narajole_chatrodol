import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { ORG } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';

export default function Contact() {
  const { t, lang } = useT();
  const fmt = useFmt();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    const { error } = await supabase.from('cswo_contact_messages').insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      subject: form.subject || null,
      message: form.message,
    });
    if (error) {
      setStatus('error');
      return;
    }
    setStatus('sent');
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <div>
      <PageHeader title={t('contact.title')} subtitle={t('contact.subtitle')} />
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-10 md:grid-cols-2 md:px-8">
        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
          <h2 className="mb-4 text-2xl font-bold text-blue-700">{t('contact.formTitle')}</h2>
          {status === 'sent' && <div className="mb-4 rounded bg-green-100 px-4 py-3 text-green-800">{t('contact.success')}</div>}
          {status === 'error' && <div className="mb-4 rounded bg-red-100 px-4 py-3 text-red-800">{t('contact.error')}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('common.name')} *</label>
              <input required value={form.name} onChange={update('name')} className="input" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('common.email')}</label>
                <input type="email" value={form.email} onChange={update('email')} className="input" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('common.phone')}</label>
                <input value={form.phone} onChange={update('phone')} className="input" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('contact.subject')}</label>
              <input value={form.subject} onChange={update('subject')} className="input" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('contact.message')} *</label>
              <textarea required rows={5} value={form.message} onChange={update('message')} className="input" />
            </div>
            <button type="submit" disabled={status === 'sending'} className="btn-primary w-full py-2.5">
              {status === 'sending' ? t('contact.sending') : t('contact.send')}
            </button>
          </form>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
          <h2 className="mb-4 text-2xl font-bold text-blue-700">{t('contact.addressTitle')}</h2>
          <div className="space-y-2 text-gray-700">
            {ORG.address[lang].map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p className="pt-2">
              {t('common.email')}: <a href={`mailto:${ORG.email}`} className="text-blue-600 hover:underline">{ORG.email}</a>
            </p>
            <p>
              {t('common.phone')}:{' '}
              {ORG.phones.map((p, i) => (
                <span key={p}>
                  <a href={`tel:+91${p}`} className="text-blue-600 hover:underline">{fmt.num(p)}</a>
                  {i < ORG.phones.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </div>
          <div className="mt-6 overflow-hidden rounded-lg">
            <iframe
              title="map"
              src="https://www.google.com/maps?q=Nij+Narajole,+Daspur,+Paschim+Medinipur&output=embed"
              className="h-64 w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
