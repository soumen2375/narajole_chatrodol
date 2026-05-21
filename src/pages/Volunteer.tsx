import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { VOLUNTEER_PROGRAM_OPTIONS } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';

export default function Volunteer() {
  const { t, lang } = useT();
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
    if (!form.agree) {
      setError(t('volunteer.agreeError'));
      return;
    }
    setStatus('sending');
    setError('');
    const { error: err } = await supabase.from('cswo_volunteer_applications').insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      area_of_interest: form.area,
      message: form.message || null,
    });
    if (err) {
      setStatus('error');
      setError(t('volunteer.error'));
      return;
    }
    setStatus('sent');
    setForm({ name: '', email: '', phone: '', area: VOLUNTEER_PROGRAM_OPTIONS[0].en, message: '', agree: false });
  };

  return (
    <div>
      <PageHeader title={t('volunteer.title')} subtitle={t('volunteer.subtitle')} />
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-xl bg-white p-6 shadow-md ring-1 ring-gray-100">
          {status === 'sent' && <div className="mb-4 rounded bg-green-100 px-4 py-3 text-green-800">{t('volunteer.success')}</div>}
          {error && <div className="mb-4 rounded bg-red-100 px-4 py-3 text-red-800">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('common.fullName')} *</label>
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('common.email')}</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t('common.phone')} *</label>
                <input required value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('volunteer.interest')}</label>
              <select value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} className="input">
                {VOLUNTEER_PROGRAM_OPTIONS.map((o) => (
                  <option key={o.en} value={o.en}>{o[lang]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t('volunteer.motivation')}</label>
              <textarea rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="input" />
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.agree} onChange={(e) => setForm((f) => ({ ...f, agree: e.target.checked }))} className="mt-1" />
              {t('volunteer.agree')}
            </label>
            <button type="submit" disabled={status === 'sending'} className="w-full rounded-md bg-green-600 px-4 py-2.5 font-semibold text-white transition hover:bg-green-700 disabled:opacity-60">
              {status === 'sending' ? t('volunteer.submitting') : t('volunteer.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
