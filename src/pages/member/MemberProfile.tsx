import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function MemberProfile() {
  const { member, refreshMember } = useAuth();
  const [form, setForm] = useState({
    full_name: member?.full_name ?? '',
    phone: member?.phone ?? '',
    address: member?.address ?? '',
    blood_group: member?.blood_group ?? '',
    bio: member?.bio ?? '',
  });
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');
  const [pw, setPw] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  if (!member) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    setError('');
    const { error: err } = await supabase
      .from('cswo_members')
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        address: form.address || null,
        blood_group: form.blood_group || null,
        bio: form.bio || null,
      })
      .eq('id', member.id);
    if (err) {
      setStatus('error');
      setError(err.message);
      return;
    }
    await refreshMember();
    setStatus('saved');
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) {
      setPwStatus('error');
      return;
    }
    setPwStatus('saving');
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setPwStatus(err ? 'error' : 'saved');
    if (!err) setPw('');
  };

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">আমার প্রোফাইল</h1>

      <form onSubmit={save} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
        {status === 'saved' && <div className="rounded bg-green-100 px-4 py-2 text-green-800">প্রোফাইল সংরক্ষিত হয়েছে।</div>}
        {status === 'error' && <div className="rounded bg-red-100 px-4 py-2 text-red-800">{error}</div>}

        <Row label="পূর্ণ নাম">
          <input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            required
            className="input"
          />
        </Row>
        <Row label="ইমেল">
          <input value={member.email} disabled className="input bg-gray-100" />
        </Row>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Row label="ফোন">
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input" />
          </Row>
          <Row label="রক্তের গ্রুপ">
            <input
              value={form.blood_group}
              onChange={(e) => setForm((f) => ({ ...f, blood_group: e.target.value }))}
              placeholder="যেমন: O+"
              className="input"
            />
          </Row>
        </div>
        <Row label="ঠিকানা">
          <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" />
        </Row>
        <Row label="পরিচিতি">
          <textarea rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} className="input" />
        </Row>
        <button
          type="submit"
          disabled={status === 'saving'}
          className="rounded-md bg-blue-600 px-5 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {status === 'saving' ? 'সংরক্ষণ হচ্ছে…' : 'সংরক্ষণ করুন'}
        </button>
      </form>

      <form onSubmit={changePassword} className="mt-6 space-y-3 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-800">পাসওয়ার্ড পরিবর্তন</h2>
        {pwStatus === 'saved' && <div className="rounded bg-green-100 px-4 py-2 text-green-800">পাসওয়ার্ড পরিবর্তিত হয়েছে।</div>}
        {pwStatus === 'error' && <div className="rounded bg-red-100 px-4 py-2 text-red-800">পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।</div>}
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="নতুন পাসওয়ার্ড"
          className="input"
        />
        <button
          type="submit"
          disabled={pwStatus === 'saving'}
          className="rounded-md bg-gray-800 px-5 py-2 font-semibold text-white hover:bg-gray-900 disabled:opacity-60"
        >
          পাসওয়ার্ড পরিবর্তন করুন
        </button>
      </form>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
