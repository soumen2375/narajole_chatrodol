import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Member } from '@/types';
import { memberDisplayId } from '@/types';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';

const PAGE_SIZE = 20;
const emptyForm = {
  full_name: '', email: '', password: '', phone: '', designation: '', role: 'member',
  can_manage_posts: false, can_manage_events: false, can_manage_finance: false,
};
type CapabilityPreset = 'none' | 'content' | 'events' | 'finance' | 'all';
function applyPreset(preset: CapabilityPreset) {
  return {
    can_manage_posts:   preset === 'content' || preset === 'all',
    can_manage_events:  preset === 'events'  || preset === 'all',
    can_manage_finance: preset === 'finance' || preset === 'all',
  };
}
type SortKey = 'full_name' | 'joined_at' | 'created_at';
type SortDir = 'asc' | 'desc';

function exportCsv(members: Member[], lang: string) {
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const headers = [
    tr('ID', 'আইডি'), tr('Name', 'নাম'), tr('Email', 'ইমেল'),
    tr('Phone', 'ফোন'), tr('Designation', 'পদবি'),
    tr('Role', 'ভূমিকা'), tr('Status', 'অবস্থা'), tr('Joined', 'যোগ দিয়েছেন'),
  ];
  const rows = members.map((m) =>
    [memberDisplayId(m), m.full_name, m.email, m.phone ?? '', m.designation ?? '', m.role, m.status, m.joined_at?.slice(0, 10) ?? '']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  const csv = '﻿' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'members.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function AdminMembers() {
  const { member: me } = useAuth();
  const { t, lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cswo_members').select('*').order('created_at', { ascending: false });
    setMembers((data ?? []) as Member[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { data, error } = await supabase.functions.invoke('cswo-admin-create-member', {
      body: { full_name: form.full_name, email: form.email, password: form.password, phone: form.phone, designation: form.designation, role: form.role },
    });
    setSaving(false);
    if (error || (data && data.error)) {
      let text = data?.error || error?.message || tr('Failed to create member.', 'সদস্য তৈরি ব্যর্থ হয়েছে।');
      const ctx = (error as { context?: { json?: () => Promise<{ error?: string }> } } | null)?.context;
      if (ctx && typeof ctx.json === 'function') {
        try { const j = await ctx.json(); if (j?.error) text = j.error; } catch { /* ignore */ }
      }
      setMsg({ type: 'err', text });
      return;
    }
    // Apply capability flags
    if (form.can_manage_posts || form.can_manage_events || form.can_manage_finance) {
      await supabase.from('cswo_members').update({
        can_manage_posts: form.can_manage_posts,
        can_manage_events: form.can_manage_events,
        can_manage_finance: form.can_manage_finance,
      }).eq('email', form.email.trim());
    }
    setMsg({ type: 'ok', text: `${tr('Member created', 'সদস্য তৈরি হয়েছে')}: ${form.email}` });
    setForm(emptyForm);
    setShowForm(false);
    await load();
  };

  const setStatus = async (id: string, status: Member['status']) => {
    await supabase.from('cswo_members').update({ status }).eq('id', id);
    await load();
  };
  const setRole = async (id: string, role: Member['role']) => {
    await supabase.from('cswo_members').update({ role }).eq('id', id);
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm(tr('Remove this member profile?', 'এই সদস্য প্রোফাইল মুছে ফেলবেন?'))) return;
    await supabase.from('cswo_members').delete().eq('id', id);
    await load();
  };

  const bulkApprove = async () => {
    if (!selected.size) return;
    await Promise.all([...selected].map((id) => supabase.from('cswo_members').update({ status: 'approved' }).eq('id', id)));
    setSelected(new Set());
    await load();
  };
  const bulkSuspend = async () => {
    if (!selected.size) return;
    const ids = [...selected].filter((id) => id !== me?.id);
    await Promise.all(ids.map((id) => supabase.from('cswo_members').update({ status: 'suspended' }).eq('id', id)));
    setSelected(new Set());
    await load();
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const q = search.trim().toLowerCase();
  const filtered = members.filter((m) => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (q && !m.full_name.toLowerCase().includes(q) && !m.email.toLowerCase().includes(q) && !(m.designation ?? '').toLowerCase().includes(q)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number = (a[sortKey] ?? '') as string;
    let bv: string | number = (b[sortKey] ?? '') as string;
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const shown = sorted.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const allShownSelected = shown.length > 0 && shown.every((m) => selected.has(m.id));
  const toggleSelectAll = () => {
    if (allShownSelected) setSelected((p) => { const n = new Set(p); shown.forEach((m) => n.delete(m.id)); return n; });
    else setSelected((p) => { const n = new Set(p); shown.forEach((m) => n.add(m.id)); return n; });
  };

  const cycleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
    setPage(0);
  };
  const sortIndicator = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('a.members')}</h1>
        <div className="flex gap-2">
          <button onClick={() => exportCsv(sorted, lang)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            {tr('Export CSV', 'CSV এক্সপোর্ট')}
          </button>
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary">{t('a.newMember')}</button>
        </div>
      </div>

      {msg && <div className={`mb-4 rounded px-4 py-2 ${msg.type === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{msg.text}</div>}

      {showForm && (
        <form onSubmit={create} className="mb-6 grid grid-cols-1 gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 sm:grid-cols-2">
          <input className="input" placeholder={t('common.fullName')} required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          <input className="input" type="email" placeholder={t('common.email')} required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <input className="input" type="text" placeholder={`${t('a.tempPassword')} (min 6)`} required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          <input className="input" placeholder={t('common.phone')} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <input className="input" placeholder={t('common.designation')} value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
          <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            <option value="member">{t('common.member')}</option>
            <option value="admin">{t('common.admin')}</option>
          </select>
          <div className="sm:col-span-2 space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                {tr('Management capabilities (preset)', 'ব্যবস্থাপনা ক্ষমতা (প্রিসেট)')}
              </p>
              <div className="flex flex-wrap gap-2">
                {([
                  ['none',    tr('Normal Member', 'সাধারণ সদস্য')],
                  ['content', tr('Digital Media', 'ডিজিটাল মিডিয়া')],
                  ['events',  tr('Secretary', 'সেক্রেটারি')],
                  ['finance', tr('Treasurer', 'কোষাধ্যক্ষ')],
                  ['all',     tr('All Roles', 'সব ভূমিকা')],
                ] as [CapabilityPreset, string][]).map(([p, label]) => {
                  const caps = applyPreset(p);
                  const active = p === 'none'
                    ? !form.can_manage_posts && !form.can_manage_events && !form.can_manage_finance
                    : caps.can_manage_posts === form.can_manage_posts &&
                      caps.can_manage_events === form.can_manage_events &&
                      caps.can_manage_finance === form.can_manage_finance;
                  return (
                    <button
                      key={p} type="button"
                      onClick={() => setForm((f) => ({ ...f, ...applyPreset(p) }))}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              {([
                ['can_manage_posts',   tr('Digital Media (Posts, Gallery)', 'ডিজিটাল মিডিয়া (পোস্ট, গ্যালারি)')],
                ['can_manage_events',  tr('Secretary (Events, Attendance)', 'সেক্রেটারি (অনুষ্ঠান, উপস্থিতি)')],
                ['can_manage_finance', tr('Treasurer (Finance, Dues, Donations)', 'কোষাধ্যক্ষ (অর্থ, চাঁদা, দান)')],
              ] as [keyof typeof form, string][]).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={saving} className="btn-primary">{saving ? tr('Creating…', 'তৈরি হচ্ছে…') : tr('Create account', 'অ্যাকাউন্ট তৈরি করুন')}</button>
            <p className="mt-2 text-xs text-gray-500">{tr('The account is created already-approved. Share the email and temporary password with the member.', 'অ্যাকাউন্ট সরাসরি অনুমোদিত অবস্থায় তৈরি হবে। সদস্যকে ইমেল ও অস্থায়ী পাসওয়ার্ড জানিয়ে দিন।')}</p>
          </div>
        </form>
      )}

      {/* Toolbar: search + status filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input min-w-[200px] flex-1 max-w-xs"
          placeholder={tr('Search name, email, designation…', 'নাম, ইমেল, পদবি খুঁজুন…')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button key={f} onClick={() => { setFilter(f); setPage(0); }} className={`rounded-full px-4 py-1.5 text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {f === 'all' ? tr('All', 'সব') : f === 'pending' ? tr('Pending', 'অপেক্ষমাণ') : tr('Approved', 'অনুমোদিত')}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-2.5 ring-1 ring-blue-200">
          <span className="text-sm font-medium text-blue-800">{selected.size} {tr('selected', 'নির্বাচিত')}</span>
          <button onClick={bulkApprove} className="rounded px-3 py-1 text-xs font-medium bg-green-600 text-white hover:bg-green-700">{tr('Approve all', 'সব অনুমোদন')}</button>
          <button onClick={bulkSuspend} className="rounded px-3 py-1 text-xs font-medium bg-amber-600 text-white hover:bg-amber-700">{tr('Suspend all', 'সব স্থগিত')}</button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-blue-600 hover:underline">{tr('Clear', 'বাতিল')}</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="w-8 px-4 py-3">
                <input type="checkbox" checked={allShownSelected} onChange={toggleSelectAll} className="h-4 w-4 rounded border-gray-300" />
              </th>
              <th className="cursor-pointer select-none px-4 py-3" onClick={() => cycleSort('full_name')}>
                {t('common.name')}{sortIndicator('full_name')}
              </th>
              <th className="px-4 py-3">{t('common.email')}</th>
              <th className="px-4 py-3">{t('common.designation')}</th>
              <th className="px-4 py-3">{tr('Capabilities', 'ক্ষমতা')}</th>
              <th className="px-4 py-3">{t('common.role')}</th>
              <th className="px-4 py-3">{t('common.status')}</th>
              <th className="cursor-pointer select-none px-4 py-3" onClick={() => cycleSort('joined_at')}>
                {tr('Joined', 'যোগ দিয়েছেন')}{sortIndicator('joined_at')}
              </th>
              <th className="px-4 py-3">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {shown.map((m) => (
              <tr key={m.id} className={selected.has(m.id) ? 'bg-blue-50/50' : undefined}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleSelect(m.id)} className="h-4 w-4 rounded border-gray-300" />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  <div><Link to={`/admin/members/${m.id}`} className="hover:text-blue-600 hover:underline">{m.full_name}</Link></div>
                  <div className="font-mono text-[11px] text-gray-400">{memberDisplayId(m)}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{m.email}</td>
                <td className="px-4 py-3 text-gray-600">{m.designation || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {m.can_manage_posts   && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">{tr('Digital Media', 'ডিজিটাল মিডিয়া')}</span>}
                    {m.can_manage_events  && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">{tr('Secretary', 'সেক্রেটারি')}</span>}
                    {m.can_manage_finance && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">{tr('Treasurer', 'কোষাধ্যক্ষ')}</span>}
                    {!m.can_manage_posts && !m.can_manage_events && !m.can_manage_finance && <span className="text-[10px] text-gray-400">—</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select value={m.role} disabled={m.id === me?.id} onChange={(e) => setRole(m.id, e.target.value as Member['role'])} className="rounded border border-gray-300 px-2 py-1 text-xs">
                    <option value="member">{t('common.member')}</option>
                    <option value="admin">{t('common.admin')}</option>
                  </select>
                </td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">{m.joined_at?.slice(0, 10) ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/admin/members/${m.id}`} className="text-xs font-medium text-blue-600 hover:underline">{t('common.view')}</Link>
                    {m.status !== 'approved' && <button onClick={() => setStatus(m.id, 'approved')} className="text-xs font-medium text-green-600 hover:underline">{t('common.approve')}</button>}
                    {m.status === 'approved' && m.id !== me?.id && <button onClick={() => setStatus(m.id, 'suspended')} className="text-xs font-medium text-amber-600 hover:underline">{t('common.suspend')}</button>}
                    {m.status === 'pending' && <button onClick={() => setStatus(m.id, 'rejected')} className="text-xs font-medium text-red-600 hover:underline">{t('common.reject')}</button>}
                    {m.id !== me?.id && <button onClick={() => remove(m.id)} className="text-xs font-medium text-red-600 hover:underline">{t('common.delete')}</button>}
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">{tr('No members found.', 'কোনো সদস্য পাওয়া যায়নি।')}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>{tr('Showing', 'দেখাচ্ছে')} {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, sorted.length)} {tr('of', 'মোট')} {sorted.length}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="rounded px-3 py-1 bg-gray-100 disabled:opacity-40">←</button>
            <span>{tr('Page', 'পাতা')} {safePage + 1}/{totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} className="rounded px-3 py-1 bg-gray-100 disabled:opacity-40">→</button>
          </div>
        </div>
      )}
    </div>
  );
}
