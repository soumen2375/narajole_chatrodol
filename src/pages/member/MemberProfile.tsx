import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';

export default function MemberProfile() {
  const { member, refreshMember } = useAuth();
  const { t } = useT();
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('m.profile')}</h1>

      <form onSubmit={save} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {status === 'saved' && <div className="rounded bg-green-100 px-4 py-2 text-green-800">{t('m.profileSaved')}</div>}
        {status === 'error' && <div className="rounded bg-red-100 px-4 py-2 text-red-800">{error}</div>}

        <Row label={`${t('common.fullName')} *`}>
          <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required className="input" />
        </Row>
        <Row label={t('common.email')}>
          <input value={member.email} disabled className="input bg-gray-100" />
        </Row>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Row label={t('common.phone')}>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input" />
          </Row>
          <Row label={t('m.bloodGroup')}>
            <input value={form.blood_group} onChange={(e) => setForm((f) => ({ ...f, blood_group: e.target.value }))} placeholder="O+, B+ …" className="input" />
          </Row>
        </div>
        <Row label={t('common.address')}>
          <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="input" />
        </Row>
        <Row label={t('m.bio')}>
          <textarea rows={3} value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} className="input" />
        </Row>
        <button type="submit" disabled={status === 'saving'} className="btn-primary">
          {status === 'saving' ? t('common.saving') : t('common.save')}
        </button>
      </form>

      <form onSubmit={changePassword} className="mt-6 space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="font-semibold text-gray-800">{t('m.changePassword')}</h2>
        {pwStatus === 'saved' && <div className="rounded bg-green-100 px-4 py-2 text-green-800">{t('m.passwordChanged')}</div>}
        {pwStatus === 'error' && <div className="rounded bg-red-100 px-4 py-2 text-red-800">{t('m.passwordShort')}</div>}
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder={t('m.newPassword')} className="input" />
        <button type="submit" disabled={pwStatus === 'saving'} className="rounded-md bg-gray-800 px-5 py-2 font-semibold text-white hover:bg-gray-900 disabled:opacity-60">
          {t('m.changePassword')}
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
