import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { VOLUNTEER_PROGRAM_OPTIONS } from '@/data/content';
import { supabase } from '@/lib/supabase';

export default function Volunteer() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    area: VOLUNTEER_PROGRAM_OPTIONS[0],
    message: '',
    agree: false,
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agree) {
      setError('অনুগ্রহ করে নীতিমালায় সম্মতি দিন।');
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
      setError('আবেদন জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      return;
    }
    setStatus('sent');
    setForm({ name: '', email: '', phone: '', area: VOLUNTEER_PROGRAM_OPTIONS[0], message: '', agree: false });
  };

  return (
    <div>
      <PageHeader
        title="স্বেচ্ছাসেবক হোন"
        subtitle="নাড়াজোল ছাত্রদলের একজন মূল্যবান স্বেচ্ছাসেবক হিসেবে সমাজ গঠনে অংশ নিন"
      />
      <div className="container mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-lg bg-white p-6 shadow-md">
          {status === 'sent' && (
            <div className="mb-4 rounded bg-green-100 px-4 py-3 text-green-800">
              ধন্যবাদ! আপনার আবেদন সফলভাবে জমা হয়েছে। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।
            </div>
          )}
          {error && <div className="mb-4 rounded bg-red-100 px-4 py-3 text-red-800">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <Input label="পূর্ণ নাম" required value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="ইমেল" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
              <Input label="ফোন" required value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">আগ্রহের ক্ষেত্র</label>
              <select
                value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                {VOLUNTEER_PROGRAM_OPTIONS.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">আপনার প্রেরণা / অভিজ্ঞতা</label>
              <textarea
                rows={4}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => setForm((f) => ({ ...f, agree: e.target.checked }))}
                className="mt-1"
              />
              আমি নাড়াজোল ছাত্রদলের নীতিমালা ও নির্দেশিকা মেনে চলতে সম্মত।
            </label>
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full rounded-md bg-green-600 px-4 py-2.5 font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
            >
              {status === 'sending' ? 'জমা হচ্ছে…' : 'আবেদন জমা দিন'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Input({
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
  onChange: (v: string) => void;
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
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
}
