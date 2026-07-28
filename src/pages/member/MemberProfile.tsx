import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import { compressImage, validateImageUpload } from '@/lib/imageCompression';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function initials(name: string) {
  return name.split(' ').filter(Boolean).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export default function MemberProfile() {
  const { member, refreshMember } = useAuth();
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    full_name:   member?.full_name   ?? '',
    phone:       member?.phone       ?? '',
    address:     member?.address     ?? '',
    blood_group: member?.blood_group ?? '',
    bio:         member?.bio         ?? '',
  });
  const [status,   setStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error,    setError]    = useState('');
  const [pw,       setPw]       = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(member?.avatar_url ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  if (!member) return null;

  /* ── Avatar upload ─────────────────────────────────────────── */
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Pre-upload validation — check file type and maximum size before trying to compress
    setAvatarError('');
    try {
      validateImageUpload(file, 'avatar');
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Invalid file.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setAvatarUploading(true);
    try {
      // 1. List files starting with member ID to clean up
      const { data: files } = await supabase.storage
        .from('avatars')
        .list('', { search: member.id });
      
      if (files && files.length > 0) {
        const pathsToDelete = files.map((f) => f.name);
        await supabase.storage.from('avatars').remove(pathsToDelete);
      }

      // 2. Upload timestamped avatar
      const compressed = await compressImage(file, 'avatar');
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${member.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

      const { error: dbErr } = await supabase
        .from('cswo_members')
        .update({ avatar_url: publicUrl })
        .eq('id', member.id);
      if (dbErr) throw dbErr;

      setAvatarUrl(publicUrl);
      await refreshMember();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setAvatarUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  /* ── Profile save ──────────────────────────────────────────── */
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('saving');
    setError('');
    const { error: err } = await supabase
      .from('cswo_members')
      .update({
        full_name:   form.full_name,
        phone:       form.phone        || null,
        address:     form.address      || null,
        blood_group: form.blood_group  || null,
        bio:         form.bio          || null,
      })
      .eq('id', member.id);
    if (err) { setStatus('error'); setError(err.message); return; }
    await refreshMember();
    setStatus('saved');
  };

  /* ── Password change ───────────────────────────────────────── */
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) { setPwStatus('error'); return; }
    setPwStatus('saving');
    const { error: err } = await supabase.auth.updateUser({ password: pw });
    setPwStatus(err ? 'error' : 'saved');
    if (!err) setPw('');
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('m.profile')}</h1>

      {/* ── Avatar card ─────────────────────────────────────── */}
      <div className="flex items-center gap-6 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={member.full_name}
              className="h-24 w-24 rounded-full object-cover ring-2 ring-gray-200"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-teal-700 text-2xl font-bold text-white ring-2 ring-gray-200">
              {initials(member.full_name)}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow ring-1 ring-gray-200 hover:bg-gray-50 disabled:opacity-50"
            title="Change photo"
          >
            {avatarUploading
              ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              : <Camera className="h-4 w-4 text-gray-600" />
            }
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div>
          <p className="font-semibold text-gray-900">{member.full_name}</p>
          <p className="text-sm text-gray-500">{member.email}</p>
          <p className="mt-1 text-xs text-gray-400">Click the camera icon to upload a new photo (max 2 MB)</p>
          {avatarError && (
            <div className="mt-2 rounded bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              ⚠ {avatarError}
            </div>
          )}
        </div>
      </div>

      {/* ── Profile form ─────────────────────────────────────── */}
      <form onSubmit={save} className="space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {status === 'saved'  && <div className="rounded bg-green-100 px-4 py-2 text-green-800">{t('m.profileSaved')}</div>}
        {status === 'error'  && <div className="rounded bg-red-100   px-4 py-2 text-red-800">{error}</div>}

        <Row label={`${t('common.fullName')} *`}>
          <input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required className="input" />
        </Row>
        <Row label={t('common.email')}>
          <input value={member.email} disabled className="input bg-gray-50" />
        </Row>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Row label={t('common.phone')}>
            <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className="input" />
          </Row>
          <Row label={t('m.bloodGroup')}>
            <select value={form.blood_group} onChange={(e) => setForm((f) => ({ ...f, blood_group: e.target.value }))} className="input">
              <option value="">— Select —</option>
              {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
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

      {/* ── Password change ───────────────────────────────────── */}
      <form onSubmit={changePassword} className="space-y-3 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="font-semibold text-gray-800">{t('m.changePassword')}</h2>
        {pwStatus === 'saved' && <div className="rounded bg-green-100 px-4 py-2 text-green-800">{t('m.passwordChanged')}</div>}
        {pwStatus === 'error' && <div className="rounded bg-red-100   px-4 py-2 text-red-800">{t('m.passwordShort')}</div>}
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder={t('m.newPassword')}
          className="input"
        />
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
