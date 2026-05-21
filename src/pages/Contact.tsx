import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { ORG } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { toBengaliDigits } from '@/lib/format';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    const { error: err } = await supabase.from('cswo_contact_messages').insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      subject: form.subject || null,
      message: form.message,
    });
    if (err) {
      setStatus('error');
      setError('বার্তা পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      return;
    }
    setStatus('sent');
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <div>
      <PageHeader title="যোগাযোগ" subtitle="আমরা আপনার কথা শুনতে আগ্রহী" />
      <div className="container mx-auto grid grid-cols-1 gap-8 px-4 py-10 md:grid-cols-2 md:px-8">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-blue-700">আমাদের সাথে যোগাযোগ করুন</h2>
          {status === 'sent' && (
            <div className="mb-4 rounded bg-green-100 px-4 py-3 text-green-800">
              সফল! আপনার বার্তা সফলভাবে পাঠানো হয়েছে।
            </div>
          )}
          {status === 'error' && (
            <div className="mb-4 rounded bg-red-100 px-4 py-3 text-red-800">{error}</div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <Field label="নাম" required value={form.name} onChange={update('name')} />
            <Field label="ইমেল" type="email" value={form.email} onChange={update('email')} />
            <Field label="ফোন" value={form.phone} onChange={update('phone')} />
            <Field label="বিষয়" value={form.subject} onChange={update('subject')} />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">আপনার বার্তা *</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={update('message')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {status === 'sending' ? 'পাঠানো হচ্ছে…' : 'বার্তা পাঠান'}
            </button>
          </form>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-2xl font-bold text-blue-700">আমাদের অফিসের ঠিকানা</h2>
          <div className="space-y-2 text-gray-700">
            <p>{ORG.address.line1}</p>
            <p>{ORG.address.line2}</p>
            <p>{ORG.address.line3}</p>
            <p>{ORG.address.line4}</p>
            <p className="pt-2">
              ইমেল: <a href={`mailto:${ORG.email}`} className="text-blue-600 hover:underline">{ORG.email}</a>
            </p>
            <p>
              ফোন:{' '}
              {ORG.phones.map((p, i) => (
                <span key={p}>
                  <a href={`tel:+91${p}`} className="text-blue-600 hover:underline">{toBengaliDigits(p)}</a>
                  {i < ORG.phones.length - 1 ? ', ' : ''}
                </span>
              ))}
            </p>
          </div>
          <div className="mt-6 overflow-hidden rounded-lg">
            <iframe
              title="Narajole map"
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

function Field({
  label,
  type = 'text',
  required,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && '*'}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
