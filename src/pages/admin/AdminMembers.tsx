import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaEllipsis, FaPlus, FaDownload, FaCheck, FaUsers, FaUserClock,
  FaUserCheck, FaUserPlus, FaMagnifyingGlass, FaEye, FaPen,
} from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Member } from '@/types';
import { memberDisplayId } from '@/types';
import { useT } from '@/i18n';
import { useFmt } from '@/lib/format';
import { TableSkeleton } from '@/components/ui/Skeleton';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const GREEN = '#4d7c0f';
const PAPER = '#ffffff';
const CREAM = '#faf6ef';

const PAGE_SIZE = 12;
const AVATAR_COLORS = ['#c2410c', '#4d7c0f', '#0f766e', '#7c3aed', '#b45309', '#9a3412'];

type CapKey = 'normal' | 'content' | 'events' | 'finance';
type StatusFilter = 'all' | 'pending' | 'active' | 'inactive' | 'committee' | 'volunteer';

const emptyForm = {
  full_name: '', email: '', password: '', phone: '', designation: '', role: 'member' as Member['role'],
  cap: 'normal' as CapKey,
};

function capFlags(cap: CapKey) {
  return {
    can_manage_posts: cap === 'content',
    can_manage_events: cap === 'events',
    can_manage_finance: cap === 'finance',
  };
}
function currentCap(m: Member): CapKey {
  if (m.can_manage_finance) return 'finance';
  if (m.can_manage_events) return 'events';
  if (m.can_manage_posts) return 'content';
  return 'normal';
}
function isVolunteer(m: Member) {
  return /স্বেচ্ছা|volunteer/i.test(m.designation ?? '');
}
function isCommittee(m: Member) {
  return m.role === 'admin' || m.can_manage_posts || m.can_manage_events || m.can_manage_finance || (!!m.designation && !isVolunteer(m));
}
function initials(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '—';
}
function avatarColor(name: string) {
  let s = 0;
  for (const ch of name) s += ch.charCodeAt(0);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}

function exportCsv(members: Member[], lang: string) {
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const headers = [tr('ID', 'আইডি'), tr('Name', 'নাম'), tr('Email', 'ইমেল'), tr('Phone', 'ফোন'), tr('Designation', 'পদবি'), tr('Role', 'ভূমিকা'), tr('Status', 'অবস্থা'), tr('Joined', 'যোগদান')];
  const rows = members.map((m) =>
    [memberDisplayId(m), m.full_name, m.email, m.phone ?? '', m.designation ?? '', m.role, m.status, m.joined_at?.slice(0, 10) ?? '']
      .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
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
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const num = (v: string | number) => fmt.num(v);
  const navigate = useNavigate();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [village, setVillage] = useState('');
  const [joined, setJoined] = useState<'any' | 'thisyear' | 'lastyear' | 'older'>('any');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('cswo_members').select('*').order('member_serial', { ascending: true, nullsFirst: false });
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
      if (ctx && typeof ctx.json === 'function') { try { const j = await ctx.json(); if (j?.error) text = j.error; } catch { /* ignore */ } }
      setMsg({ type: 'err', text });
      return;
    }
    if (form.cap !== 'normal') {
      await supabase.from('cswo_members').update(capFlags(form.cap)).eq('email', form.email.trim());
    }
    setMsg({ type: 'ok', text: `${tr('Member created', 'সদস্য তৈরি হয়েছে')}: ${form.email}` });
    setForm(emptyForm);
    setShowForm(false);
    await load();
  };

  const setStatus = async (id: string, status: Member['status']) => { await supabase.from('cswo_members').update({ status }).eq('id', id); await load(); };
  const setRole = async (id: string, role: Member['role']) => { await supabase.from('cswo_members').update({ role }).eq('id', id); await load(); };
  const setCapability = async (id: string, cap: CapKey) => { await supabase.from('cswo_members').update(capFlags(cap)).eq('id', id); await load(); };

  // ── counts for chips / stat cards ──
  const counts = useMemo(() => ({
    all: members.length,
    pending: members.filter((m) => m.status === 'pending').length,
    active: members.filter((m) => m.status === 'approved').length,
    inactive: members.filter((m) => m.status === 'suspended' || m.status === 'rejected').length,
    committee: members.filter(isCommittee).length,
    volunteer: members.filter(isVolunteer).length,
  }), [members]);

  const now = new Date();
  const newThisMonth = members.filter((m) => { const dt = new Date(m.joined_at || m.created_at); return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth(); }).length;
  const newLastMonth = members.filter((m) => { const dt = new Date(m.joined_at || m.created_at); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return dt.getFullYear() === lm.getFullYear() && dt.getMonth() === lm.getMonth(); }).length;
  const activePct = counts.all ? Math.round((counts.active / counts.all) * 100) : 0;

  const villages = useMemo(() => Array.from(new Set(members.map((m) => (m.address ?? '').trim()).filter(Boolean))).sort(), [members]);

  // ── filter + paginate ──
  const q = search.trim().toLowerCase();
  const filtered = members.filter((m) => {
    const statusOk =
      statusFilter === 'all' ? true :
      statusFilter === 'pending' ? m.status === 'pending' :
      statusFilter === 'active' ? m.status === 'approved' :
      statusFilter === 'inactive' ? (m.status === 'suspended' || m.status === 'rejected') :
      statusFilter === 'committee' ? isCommittee(m) : isVolunteer(m);
    if (!statusOk) return false;
    if (village && (m.address ?? '').trim() !== village) return false;
    if (joined !== 'any') {
      const y = new Date(m.joined_at || m.created_at).getFullYear();
      const cy = now.getFullYear();
      if (joined === 'thisyear' && y !== cy) return false;
      if (joined === 'lastyear' && y !== cy - 1) return false;
      if (joined === 'older' && y >= cy - 1) return false;
    }
    if (q && !m.full_name.toLowerCase().includes(q) && !memberDisplayId(m).toLowerCase().includes(q) && !(m.designation ?? '').toLowerCase().includes(q) && !(m.address ?? '').toLowerCase().includes(q)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const shown = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const resetPage = () => setPage(0);

  const statusMeta = (s: Member['status']) =>
    s === 'approved' ? { dot: GREEN, label: tr('Active', 'সক্রিয়') } :
    s === 'pending' ? { dot: BRAND, label: tr('Pending', 'অপেক্ষমাণ') } :
    { dot: '#a8a29e', label: tr('Inactive', 'নিষ্ক্রিয়') };

  const capPill = (m: Member) => {
    if (m.can_manage_finance) return { label: tr('Treasurer', 'কোষাধ্যক্ষ'), bg: 'rgba(77,124,15,0.12)', fg: GREEN };
    if (m.can_manage_events) return { label: tr('Secretary', 'সেক্রেটারি'), bg: 'rgba(124,58,237,0.12)', fg: '#6d28d9' };
    if (m.can_manage_posts) return { label: tr('Digital Media', 'ডিজিটাল মিডিয়া'), bg: 'rgba(194,65,12,0.12)', fg: BRAND };
    return null;
  };

  if (loading) return <TableSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      {/* ───────── Header ───────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            {tr('Members', 'সদস্য')} · {tr(`Total ${num(counts.all)}`, `মোট ${num(counts.all)} জন`)}
          </div>
          <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
            {tr('Membership Roll', 'সদস্যবৃন্দ')} <span style={{ color: MUTED }}>· {tr('Members', 'Membership Roll')}</span>
          </h1>
          <p className="mt-1 max-w-2xl text-[13.5px]" style={{ color: INK2 }}>
            {tr('The full membership roll. Approve applications, change roles and reactivate inactive members.', 'পুরো ছাত্রদল সদস্যতালিকা। আবেদন অনুমোদন, ভূমিকা পরিবর্তন এবং নিষ্ক্রিয় সদস্যদের পুনঃসক্রিয় করতে পারো।')}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => exportCsv(filtered, lang)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
            <FaDownload className="h-3 w-3" /> {tr('Export CSV', 'CSV এক্সপোর্ট')}
          </button>
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}>
            <FaPlus className="h-3 w-3" /> {tr('Add member', 'নতুন সদস্য')}
          </button>
        </div>
      </div>

      {msg && <div className="rounded-[6px] px-4 py-2.5 text-[13px]" style={msg.type === 'ok' ? { background: 'rgba(77,124,15,0.1)', color: GREEN } : { background: 'rgba(194,65,12,0.1)', color: BRAND }}>{msg.text}</div>}

      {showForm && <CreateForm form={form} setForm={setForm} onSubmit={create} saving={saving} tr={tr} />}

      {/* ───────── Stat cards ───────── */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard icon={FaUsers} eyebrow={tr('Total', 'মোট')} value={num(counts.all)} sub={tr('Total members', 'মোট সদস্য')} note={`+${num(newThisMonth)} / ${tr('mo', 'মাস')}`} noteColor={GREEN} />
        <StatCard icon={FaUserClock} eyebrow={tr('Pending', 'অপেক্ষমাণ')} value={num(counts.pending)} sub={tr('Awaiting approval', 'অপেক্ষমাণ আবেদন')} note={counts.pending ? tr('needs review', 'পর্যালোচনা চাই') : tr('all clear', 'সব পরিষ্কার')} noteColor={counts.pending ? BRAND : MUTED} iconColor={counts.pending ? BRAND : MUTED} />
        <StatCard icon={FaUserCheck} eyebrow={tr('Active', 'সক্রিয়')} value={num(counts.active)} sub={tr('Active', 'সক্রিয়')} note={`${num(activePct)}%`} noteColor={GREEN} />
        <StatCard icon={FaUserPlus} eyebrow={`${tr('New', 'নতুন')} · ${fmt.months()[now.getMonth()]}`} value={num(newThisMonth)} sub={tr('New this month', 'নতুন · এই মাস')} note={`${newThisMonth - newLastMonth >= 0 ? '+' : ''}${num(newThisMonth - newLastMonth)} ${tr('vs prev', 'গত মাস')}`} noteColor={newThisMonth - newLastMonth >= 0 ? GREEN : MUTED} />
      </div>

      {/* ───────── Filters ───────── */}
      <div className="rounded-[8px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="flex flex-wrap gap-2">
          {([
            ['all', tr('All', 'সব'), counts.all],
            ['pending', tr('Pending', 'অপেক্ষমাণ'), counts.pending],
            ['active', tr('Active', 'সক্রিয়'), counts.active],
            ['inactive', tr('Inactive', 'নিষ্ক্রিয়'), counts.inactive],
            ['committee', tr('Committee', 'কমিটি'), counts.committee],
            ['volunteer', tr('Volunteer', 'স্বেচ্ছাসেবক'), counts.volunteer],
          ] as [StatusFilter, string, number][]).map(([key, label, n]) => {
            const active = statusFilter === key;
            return (
              <button key={key} onClick={() => { setStatusFilter(key); resetPage(); }} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors" style={{ background: active ? INK : CREAM, color: active ? CREAM : INK2, border: `1px solid ${active ? INK : RULE}` }}>
                {label} <span className="font-mono text-[10px]" style={{ opacity: 0.7 }}>{num(n)}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t pt-3" style={{ borderColor: RULE }}>
          <select value={village} onChange={(e) => { setVillage(e.target.value); resetPage(); }} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
            <option value="">{tr('Village: All', 'গ্রাম: সব')}</option>
            {villages.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={joined} onChange={(e) => { setJoined(e.target.value as typeof joined); resetPage(); }} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
            <option value="any">{tr('Joined: Any time', 'যোগদান: যেকোনো সময়')}</option>
            <option value="thisyear">{tr('This year', 'এই বছর')}</option>
            <option value="lastyear">{tr('Last year', 'গত বছর')}</option>
            <option value="older">{tr('Older', 'আরও আগে')}</option>
          </select>
          <div className="relative min-w-[220px] flex-1">
            <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: MUTED }} />
            <input value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder={tr('Search name, ID or village…', 'নাম, ID বা গ্রাম খুঁজুন…')} className="w-full rounded-[6px] py-2 pl-9 pr-3 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          </div>
        </div>
      </div>

      {/* ───────── Table ───────── */}
      <div className="overflow-visible rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead>
              <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                {[tr('Name', 'নাম'), tr('Designation', 'পদবি'), tr('Role', 'ভূমিকা'), tr('Capabilities', 'ক্ষমতা'), tr('Status', 'অবস্থা'), tr('Joined', 'যোগদান'), ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUTED }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => {
                const sm = statusMeta(m.status);
                const cap = capPill(m);
                const isPending = m.status === 'pending';
                return (
                  <tr key={m.id} style={{ borderBottom: `1px solid ${RULE}`, background: isPending ? 'rgba(194,65,12,0.04)' : undefined }}>
                    {/* Name + ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: avatarColor(m.full_name) }}>{initials(m.full_name)}</span>
                        <div className="min-w-0">
                          <Link to={`/admin/members/${m.id}`} className="block truncate font-semibold hover:underline" style={{ color: INK }}>{m.full_name}</Link>
                          <div className="font-mono text-[10.5px]" style={{ color: MUTED }}>{memberDisplayId(m)}</div>
                        </div>
                      </div>
                    </td>
                    {/* Designation */}
                    <td className="px-4 py-3" style={{ color: INK2 }}>{m.designation || '—'}</td>
                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]" style={m.role === 'admin' ? { background: 'rgba(28,25,23,0.08)', color: INK } : { background: CREAM, color: MUTED, border: `1px solid ${RULE}` }}>
                        {m.role === 'admin' ? tr('Admin', 'অ্যাডমিন') : tr('Member', 'সদস্য')}
                      </span>
                    </td>
                    {/* Capabilities */}
                    <td className="px-4 py-3">
                      {cap ? <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: cap.bg, color: cap.fg }}>{cap.label}</span> : <span className="text-[12px]" style={{ color: MUTED }}>{tr('Normal', 'সাধারণ')}</span>}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: INK2 }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: sm.dot }} /> {sm.label}
                      </span>
                    </td>
                    {/* Joined */}
                    <td className="px-4 py-3 font-mono text-[11.5px]" style={{ color: MUTED }}>{m.joined_at ? fmt.date(m.joined_at) : '—'}</td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="relative flex items-center justify-end gap-2">
                        {isPending && (
                          <button onClick={() => setStatus(m.id, 'approved')} className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: GREEN }}>
                            <FaCheck className="h-2.5 w-2.5" /> OK
                          </button>
                        )}
                        <button onClick={() => setMenuId(menuId === m.id ? null : m.id)} className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-black/5" style={{ color: MUTED }} aria-label="Actions">
                          <FaEllipsis className="h-4 w-4" />
                        </button>
                        {menuId === m.id && (
                          <RowMenu
                            m={m} me={me} tr={tr} navigate={navigate}
                            onClose={() => setMenuId(null)}
                            setRole={setRole} setStatus={setStatus} setCapability={setCapability}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No members found.', 'কোনো সদস্য পাওয়া যায়নি।')}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderTop: `1px solid ${RULE}` }}>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>
            {tr('Showing', 'দেখাচ্ছে')} {num(filtered.length ? safePage * PAGE_SIZE + 1 : 0)}–{num(Math.min((safePage + 1) * PAGE_SIZE, filtered.length))} {tr('of', 'মোট')} {num(filtered.length)}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} className="rounded-[5px] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors disabled:opacity-40" style={{ border: `1px solid ${RULE}`, color: INK2 }}>← {tr('Prev', 'আগে')}</button>
            {Array.from({ length: totalPages }, (_, i) => i).slice(Math.max(0, safePage - 2), Math.max(0, safePage - 2) + 5).map((i) => (
              <button key={i} onClick={() => setPage(i)} className="h-7 w-7 rounded-[5px] font-mono text-[11px] font-semibold transition-colors" style={i === safePage ? { background: INK, color: CREAM } : { border: `1px solid ${RULE}`, color: INK2 }}>{num(i + 1)}</button>
            ))}
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} className="rounded-[5px] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors disabled:opacity-40" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('Next', 'পরে')} →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── Row kebab menu ─────────
function RowMenu({ m, me, tr, navigate, onClose, setRole, setStatus, setCapability }: {
  m: Member; me: Member | null; tr: (en: string, bn: string) => string;
  navigate: ReturnType<typeof useNavigate>; onClose: () => void;
  setRole: (id: string, r: Member['role']) => void;
  setStatus: (id: string, s: Member['status']) => void;
  setCapability: (id: string, c: CapKey) => void;
}) {
  const isSelf = m.id === me?.id;
  const act = (fn: () => void) => { fn(); onClose(); };
  const Section = ({ label }: { label: string }) => (
    <div className="px-3 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
  );
  const Item = ({ label, icon: Icon, onClick }: { label: string; icon?: typeof FaEye; onClick: () => void }) => (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] transition-colors hover:bg-black/[0.03]" style={{ color: INK }}>
      {Icon && <Icon className="h-3.5 w-3.5" style={{ color: MUTED }} />} {label}
    </button>
  );
  const Pill = ({ label, active, onClick, disabled }: { label: string; active: boolean; onClick: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-40" style={active ? { background: BRAND, color: '#fff' } : { background: CREAM, color: INK2, border: `1px solid ${RULE}` }}>{label}</button>
  );
  const curCap = currentCap(m);
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-9 z-30 w-60 overflow-hidden rounded-[8px] py-1 shadow-xl" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <Item label={tr('View', 'বিস্তারিত')} icon={FaEye} onClick={() => act(() => navigate(`/admin/members/${m.id}`))} />
        <Item label={tr('Edit profile', 'প্রোফাইল সম্পাদনা')} icon={FaPen} onClick={() => act(() => navigate(`/admin/members/${m.id}?edit=1`))} />

        <div style={{ borderTop: `1px solid ${RULE}` }} />
        <Section label={tr('Role', 'ভূমিকা')} />
        <div className="flex gap-1.5 px-3 pb-2">
          <Pill label={tr('Member', 'সদস্য')} active={m.role === 'member'} disabled={isSelf} onClick={() => act(() => setRole(m.id, 'member'))} />
          <Pill label={tr('Admin', 'অ্যাডমিন')} active={m.role === 'admin'} disabled={isSelf} onClick={() => act(() => setRole(m.id, 'admin'))} />
        </div>

        <Section label={tr('Status', 'অবস্থা')} />
        <div className="flex flex-wrap gap-1.5 px-3 pb-2">
          <Pill label={tr('Approved', 'অনুমোদিত')} active={m.status === 'approved'} onClick={() => act(() => setStatus(m.id, 'approved'))} />
          <Pill label={tr('Rejected', 'প্রত্যাখ্যাত')} active={m.status === 'rejected'} disabled={isSelf} onClick={() => act(() => setStatus(m.id, 'rejected'))} />
          <Pill label={tr('Suspend', 'স্থগিত')} active={m.status === 'suspended'} disabled={isSelf} onClick={() => act(() => setStatus(m.id, 'suspended'))} />
        </div>

        <Section label={tr('Management Capabilities', 'ব্যবস্থাপনা ক্ষমতা')} />
        <div className="flex flex-wrap gap-1.5 px-3 pb-2.5">
          <Pill label={tr('Normal', 'সাধারণ')} active={curCap === 'normal'} onClick={() => act(() => setCapability(m.id, 'normal'))} />
          <Pill label={tr('Digital Media', 'ডিজিটাল মিডিয়া')} active={curCap === 'content'} onClick={() => act(() => setCapability(m.id, 'content'))} />
          <Pill label={tr('Secretary', 'সেক্রেটারি')} active={curCap === 'events'} onClick={() => act(() => setCapability(m.id, 'events'))} />
          <Pill label={tr('Treasurer', 'কোষাধ্যক্ষ')} active={curCap === 'finance'} onClick={() => act(() => setCapability(m.id, 'finance'))} />
        </div>
      </div>
    </>
  );
}

// ───────── Stat card ─────────
function StatCard({ icon: Icon, eyebrow, value, sub, note, noteColor, iconColor = BRAND }: {
  icon: typeof FaUsers; eyebrow: string; value: string; sub: string; note: string; noteColor: string; iconColor?: string;
}) {
  return (
    <div className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="flex items-start justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{eyebrow}</div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(194,65,12,0.08)' }}><Icon className="h-3.5 w-3.5" style={{ color: iconColor }} /></span>
      </div>
      <div className="mt-3 text-[32px] font-bold leading-none" style={{ color: INK }}>{value}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[12px]" style={{ color: MUTED }}>{sub}</span>
        <span className="font-mono text-[10px] font-semibold" style={{ color: noteColor }}>{note}</span>
      </div>
    </div>
  );
}

// ───────── Create member form ─────────
function CreateForm({ form, setForm, onSubmit, saving, tr }: {
  form: typeof emptyForm; setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSubmit: (e: React.FormEvent) => void; saving: boolean;
  tr: (en: string, bn: string) => string;
}) {
  const caps: [CapKey, string][] = [
    ['normal', tr('Normal', 'সাধারণ')],
    ['content', tr('Digital Media', 'ডিজিটাল মিডিয়া')],
    ['events', tr('Secretary', 'সেক্রেটারি')],
    ['finance', tr('Treasurer', 'কোষাধ্যক্ষ')],
  ];
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 rounded-[8px] p-6 sm:grid-cols-2" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <input className="input" placeholder={tr('Full name', 'পুরো নাম')} required value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
      <input className="input" type="email" placeholder={tr('Email', 'ইমেল')} required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
      <input className="input" type="text" placeholder={`${tr('Temporary password', 'অস্থায়ী পাসওয়ার্ড')} (min 6)`} required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
      <input className="input" placeholder={tr('Phone', 'ফোন')} value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      <input className="input" placeholder={tr('Designation', 'পদবি')} value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
      <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Member['role'] }))}>
        <option value="member">{tr('Member', 'সদস্য')}</option>
        <option value="admin">{tr('Admin', 'অ্যাডমিন')}</option>
      </select>
      <div className="sm:col-span-2">
        <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Management capabilities', 'ব্যবস্থাপনা ক্ষমতা')}</p>
        <div className="flex flex-wrap gap-2">
          {caps.map(([key, label]) => (
            <button key={key} type="button" onClick={() => setForm((f) => ({ ...f, cap: key }))} className="rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors" style={form.cap === key ? { background: BRAND, color: '#fff' } : { background: CREAM, color: INK2, border: `1px solid ${RULE}` }}>{label}</button>
          ))}
        </div>
      </div>
      <div className="sm:col-span-2">
        <button type="submit" disabled={saving} className="rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: BRAND }}>{saving ? tr('Creating…', 'তৈরি হচ্ছে…') : tr('Create account', 'অ্যাকাউন্ট তৈরি করুন')}</button>
        <p className="mt-2 text-[12px]" style={{ color: MUTED }}>{tr('The account is created already-approved. Share the email and temporary password with the member.', 'অ্যাকাউন্ট সরাসরি অনুমোদিত অবস্থায় তৈরি হবে। সদস্যকে ইমেল ও অস্থায়ী পাসওয়ার্ড জানিয়ে দিন।')}</p>
      </div>
    </form>
  );
}
