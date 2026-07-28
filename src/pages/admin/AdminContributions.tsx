import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Member, MonthlyContribution } from '@/types';
import { memberDisplayId } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import {
  Search,
  Filter,
  Download,
  Plus,
  MoreVertical,
  Info,
  TrendingUp,
  Users,
  CheckCircle2,
  Check,
  Mail,
  User,
  Calendar
} from 'lucide-react';

type Grid = Record<string, Record<number, MonthlyContribution>>;

// ─── Tiny avatar ─────────────────────────────────────────────────────────────
function MAvatar({ name, avatarUrl, size = 32 }: { name: string; avatarUrl?: string | null; size?: number }) {
  const ini = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }} />
    );
  }
  const colors = ['#0c756f', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
  const bg = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center text-white font-bold"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.35 }}>
      {ini}
    </div>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────
function DonutChart({ pct, size = 120, color = '#22c55e' }: { pct: number; size?: number; color?: string }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={14} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={14}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={size * 0.18} fontWeight={800} fill="#1e293b">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ─── Cell icon ────────────────────────────────────────────────────────────────
function CellIcon({ state, busy }: { state: 'paid' | 'due' | 'future'; busy?: boolean }) {
  if (busy) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center">
        <span className="h-3.5 w-3.5 rounded-full border-2 border-green-400 border-t-transparent animate-spin" />
      </span>
    );
  }
  if (state === 'paid') {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="6" stroke="#22c55e" strokeWidth="1.5" />
          <path d="M3.5 6.5l2 2 3.5-3.5" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (state === 'due') {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-orange-500 hover:bg-orange-100 transition-colors">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="6" stroke="#f97316" strokeWidth="1.5" />
        </svg>
      </span>
    );
  }
  // future/not set
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center text-gray-300 text-[10px] font-bold select-none hover:bg-gray-100 rounded-full transition-colors">
      —
    </span>
  );
}

// ─── Row actions menu ─────────────────────────────────────────────────────────
function RowMenu({ member, onMarkAllPaid }: { member: Member; onMarkAllPaid: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-30 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
          <Link to={`/admin/members/${member.id}`}
            className="flex items-center gap-2 px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50"
            onClick={() => setOpen(false)}>
            <User className="h-3.5 w-3.5 text-gray-400" /> View profile
          </Link>
          <button onClick={() => { onMarkAllPaid(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Mark all months paid
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50 animate-pulse">
      <td className="sticky left-0 bg-white px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gray-200 shrink-0" />
          <div className="space-y-1">
            <div className="h-3 w-24 rounded bg-gray-200" />
            <div className="h-2.5 w-14 rounded bg-gray-100" />
          </div>
        </div>
      </td>
      {Array.from({ length: 13 }).map((_, i) => (
        <td key={i} className="px-2 py-3 text-center">
          <div className="mx-auto h-6 w-6 rounded-full bg-gray-100" />
        </td>
      ))}
      <td className="px-3 py-3"><div className="h-6 w-6 rounded bg-gray-100 ml-auto" /></td>
    </tr>
  );
}

export default function AdminContributions() {
  const { member: me } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const months = fmt.months();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [members, setMembers] = useState<Member[]>([]);
  const [year, setYear] = useState(currentYear);
  const [defaultAmount, setDefaultAmount] = useState(100);
  const [grid, setGrid] = useState<Grid>({});
  const [loading, setLoading] = useState(true);
  const [busyCells, setBusyCells] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'due'>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [tooltip, setTooltip] = useState<{ key: string; x: number; y: number } | null>(null);
  
  // Month dropdown state (for bulk mark paid and display)
  const [bulkMonth, setBulkMonth] = useState<number>(currentMonth);

  // Reminders Modal state
  const [showRemindersModal, setShowRemindersModal] = useState(false);
  const [remindersMessage, setRemindersMessage] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);
  const [remindersSuccess, setRemindersSuccess] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  const maxMonth = year === currentYear ? currentMonth : 12;
  const dtAgo = (s: string) => {
    const diff = Date.now() - new Date(s).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (d > 0) return `${d} day${d > 1 ? 's' : ''} ago`;
    if (h > 0) return `${h} hour${h > 1 ? 's' : ''} ago`;
    return 'just now';
  };

  // Close filter menu on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Set default message translation on lang change
  useEffect(() => {
    setRemindersMessage(
      tr(
        'Please payment your monthly due as soon as possible.',
        'দয়া করে আপনার মাসিক বকেয়া চাঁদা দ্রুত পরিশোধ করুন।'
      )
    );
  }, [lang]);

  // ─── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const [mem, con] = await Promise.all([
      supabase.from('cswo_members').select('*').eq('status', 'approved').order('full_name'),
      supabase.from('cswo_monthly_contributions').select('*').eq('year', year),
    ]);
    const memberArr = (mem.data ?? []) as Member[];
    setMembers(memberArr);
    const g: Grid = {};
    for (const r of (con.data ?? []) as MonthlyContribution[]) (g[r.member_id] ??= {})[r.month] = r;
    setGrid(g);
    setLoading(false);
  }, [year]);

  useEffect(() => { load(); }, [load]);

  // ─── Toggle cell (Optimized - Unblocked Future Months Toggling) ───────────
  const toggle = async (memberId: string, month: number) => {
    const cellKey = `${memberId}-${month}`;
    if (busyCells.has(cellKey)) return;
    const existing = grid[memberId]?.[month];
    const wasPaid = existing?.status === 'paid';
    const amount = defaultAmount;
    const newStatus = wasPaid ? 'unpaid' : 'paid';
    const nowIso = new Date().toISOString();
    setGrid((prev) => {
      const mr = { ...(prev[memberId] ?? {}) };
      mr[month] = { ...(existing ?? ({} as MonthlyContribution)), member_id: memberId, year, month, amount, status: newStatus, paid_at: newStatus === 'paid' ? nowIso : null, payment_method: newStatus === 'paid' ? 'cash' : null, recorded_by: me?.id ?? null } as MonthlyContribution;
      return { ...prev, [memberId]: mr };
    });
    setBusyCells((prev) => new Set(prev).add(cellKey));
    const { error } = await supabase.from('cswo_monthly_contributions').upsert(
      { member_id: memberId, year, month, amount, status: newStatus, paid_at: newStatus === 'paid' ? nowIso : null, payment_method: newStatus === 'paid' ? 'cash' : null, recorded_by: me?.id },
      { onConflict: 'member_id,year,month' },
    );
    if (error) {
      setGrid((prev) => {
        const mr = { ...(prev[memberId] ?? {}) };
        if (existing) mr[month] = existing; else delete mr[month];
        return { ...prev, [memberId]: mr };
      });
    }
    setBusyCells((prev) => { const n = new Set(prev); n.delete(cellKey); return n; });
  };

  // ─── Mark all months paid for a member (current year) ───────────────────
  const markAllForMember = async (member: Member) => {
    const nowIso = new Date().toISOString();
    // Allow marking up to 12 months (unblocked future months)
    const toMark = Array.from({ length: 12 }, (_, i) => i + 1).filter(
      (mo) => grid[member.id]?.[mo]?.status !== 'paid'
    );
    if (toMark.length === 0) return;
    setGrid((prev) => {
      const mr = { ...(prev[member.id] ?? {}) };
      toMark.forEach((mo) => {
        mr[mo] = { ...(mr[mo] ?? ({} as MonthlyContribution)), member_id: member.id, year, month: mo, amount: defaultAmount, status: 'paid', paid_at: nowIso, payment_method: 'cash', recorded_by: me?.id ?? null } as MonthlyContribution;
      });
      return { ...prev, [member.id]: mr };
    });
    await Promise.all(
      toMark.map((mo) => supabase.from('cswo_monthly_contributions').upsert(
        { member_id: member.id, year, month: mo, amount: defaultAmount, status: 'paid', paid_at: nowIso, payment_method: 'cash', recorded_by: me?.id },
        { onConflict: 'member_id,year,month' },
      ))
    );
  };

  // ─── Bulk mark selected month ─────────────────────────────────────────────
  const bulkMarkPaid = async (mo: number) => {
    if (!window.confirm(tr(`Mark all members paid for ${months[mo - 1]} ${year}?`, `${months[mo - 1]} ${year} সব সদস্যকে পরিশোধিত করবেন?`))) return;
    setBulkBusy(true);
    const nowIso = new Date().toISOString();
    const unpaid = members.filter((m) => grid[m.id]?.[mo]?.status !== 'paid');
    setGrid((prev) => {
      const next = { ...prev };
      unpaid.forEach((m) => {
        const mr = { ...(next[m.id] ?? {}) };
        mr[mo] = { ...(mr[mo] ?? ({} as MonthlyContribution)), member_id: m.id, year, month: mo, amount: defaultAmount, status: 'paid', paid_at: nowIso, payment_method: 'cash', recorded_by: me?.id ?? null } as MonthlyContribution;
        next[m.id] = mr;
      });
      return next;
    });
    const results = await Promise.all(
      unpaid.map((m) => supabase.from('cswo_monthly_contributions').upsert(
        { member_id: m.id, year, month: mo, amount: defaultAmount, status: 'paid', paid_at: nowIso, payment_method: 'cash', recorded_by: me?.id },
        { onConflict: 'member_id,year,month' },
      ))
    );
    if (results.some((r) => r.error)) await load();
    setBulkBusy(false);
  };

  // ─── Export CSV ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = ['Member', 'ID', ...months.map((m) => m.slice(0, 3)), 'Total (₹)'];
    const rows = members.map((m) => {
      const row = grid[m.id] ?? {};
      const total = Object.values(row).filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0);
      return [m.full_name, memberDisplayId(m), ...Array.from({ length: 12 }, (_, i) => {
        const c = row[i + 1];
        return c?.status === 'paid' ? 'Paid' : i + 1 > maxMonth ? 'Future' : 'Due';
      }), total];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cswo-dues-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Derived stats ────────────────────────────────────────────────────────
  const { totalCollection, expectedTotal, paidMemberCount, pendingMemberCount, defaultersList } = useMemo(() => {
    const totalCollection = members.reduce((sum, m) =>
      sum + Object.values(grid[m.id] ?? {}).filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0), 0);
    const expectedTotal = members.length * maxMonth * defaultAmount;
    
    // Count members fully paid up to the current month
    const paidMemberCount = members.filter((m) =>
      Array.from({ length: maxMonth }, (_, i) => i + 1).every((mo) => grid[m.id]?.[mo]?.status === 'paid')
    ).length;
    
    const pendingMemberCount = members.length - paidMemberCount;

    // Defaulters: list of members with at least one unpaid month up to maxMonth
    const defaultersList = members.filter((m) =>
      Array.from({ length: maxMonth }, (_, i) => i + 1).some((mo) => grid[m.id]?.[mo]?.status !== 'paid')
    );

    return { totalCollection, expectedTotal, paidMemberCount, pendingMemberCount, defaultersList };
  }, [members, grid, maxMonth, defaultAmount]);

  const collectionPct = expectedTotal > 0 ? Math.round((totalCollection / expectedTotal) * 100) : 0;
  const paidPct = members.length > 0 ? Math.round((paidMemberCount / members.length) * 100) : 0;

  // ─── Filtered members ─────────────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    let list = members;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) => m.full_name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }
    if (filterStatus === 'paid') list = list.filter((m) =>
      Array.from({ length: maxMonth }, (_, i) => i + 1).every((mo) => grid[m.id]?.[mo]?.status === 'paid')
    );
    if (filterStatus === 'due') list = list.filter((m) =>
      Array.from({ length: maxMonth }, (_, i) => i + 1).some((mo) => grid[m.id]?.[mo]?.status !== 'paid')
    );
    return list;
  }, [members, search, filterStatus, grid, maxMonth]);

  // ─── Per-month totals ─────────────────────────────────────────────────────
  const monthTotals = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const mo = i + 1;
      return members.reduce((sum, m) => {
        const c = grid[m.id]?.[mo];
        return c?.status === 'paid' ? sum + Number(c.amount) : sum;
      }, 0);
    }), [members, grid]);

  const grandTotal = monthTotals.reduce((s, v) => s + v, 0);
  const years = [currentYear, currentYear - 1, currentYear - 2];

  // ─── Bulk Send Reminders Function ─────────────────────────────────────────
  const sendReminders = async () => {
    if (defaultersList.length === 0 || !remindersMessage.trim()) return;
    setSendingReminders(true);
    try {
      const records = defaultersList.map((m) => ({
        member_id: m.id,
        sender_name: 'Admin',
        message: remindersMessage.trim(),
      }));

      // Insert all messages in bulk
      const { error } = await supabase.from('cswo_admin_messages').insert(records);
      if (error) throw error;

      setRemindersSuccess(true);
      setTimeout(() => {
        setShowRemindersModal(false);
        setRemindersSuccess(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      alert(tr('Failed to send reminders. Please try again.', 'রিমাইন্ডার পাঠাতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'));
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <div className="min-h-screen py-2" style={{ background: '#f8fafc' }}>
      
      {/* ── Floating cell hover tooltip ── */}
      {tooltip && (() => {
        const parts = tooltip.key.split('-');
        const mo = Number(parts[parts.length - 1]);
        const mid = parts.slice(0, -1).join('-');
        const cell = grid[mid]?.[mo];
        if (!cell) return null;
        return (
          <div className="pointer-events-none fixed z-50 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-2xl transition-all duration-150"
            style={{ left: tooltip.x + 12, top: tooltip.y - 44 }}>
            <div className="font-bold text-green-400">{fmt.money(Number(cell.amount))}</div>
            {cell.paid_at && <div className="text-slate-400 mt-0.5">{fmt.date(cell.paid_at)}</div>}
            {cell.payment_method && <div className="text-slate-500 capitalize text-[10px] mt-0.5">{cell.payment_method}</div>}
          </div>
        );
      })()}

      {/* ── Reminders Modal ── */}
      {showRemindersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15, 23, 42, 0.45)' }}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="rounded-xl bg-orange-100 p-2 text-orange-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{tr('Send Payment Reminders', 'পেমেন্ট তাগাদা পাঠান')}</h3>
                <p className="text-xs text-slate-500">
                  {tr(
                    `Send notification bulletin to ${defaultersList.length} members with pending dues.`,
                    `${fmt.num(defaultersList.length)} জন বকেয়াদার সদস্যের কাছে নোটিফিকেশন তাগাদা পাঠান।`
                  )}
                </p>
              </div>
            </div>

            {remindersSuccess ? (
              <div className="my-8 py-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-3">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">{tr('Reminders Sent Successfully!', 'তাগাদা সফলভাবে পাঠানো হয়েছে!')}</h4>
              </div>
            ) : (
              <>
                {/* Defaulters quick preview */}
                <div className="mb-4 max-h-36 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{tr('Recipients List', 'গ্রাহকদের তালিকা')}</p>
                  {defaultersList.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <MAvatar name={m.full_name} avatarUrl={m.avatar_url} size={20} />
                      <span className="text-xs text-slate-700 font-medium">{m.full_name}</span>
                      <span className="text-[10px] text-slate-400">({memberDisplayId(m)})</span>
                    </div>
                  ))}
                </div>

                {/* Textarea */}
                <div className="mb-5">
                  <label className="mb-1.5 block text-xs font-bold text-slate-500 uppercase tracking-wider">{tr('Message Body', 'বার্তার বিষয়বস্তু')}</label>
                  <textarea
                    rows={4}
                    value={remindersMessage}
                    onChange={(e) => setRemindersMessage(e.target.value)}
                    placeholder={tr('Write reminder message…', 'তাগাদা বার্তাটি লিখুন…')}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 resize-none transition-colors"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRemindersModal(false)}
                    disabled={sendingReminders}
                    className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {tr('Cancel', 'বাতিল')}
                  </button>
                  <button
                    onClick={sendReminders}
                    disabled={sendingReminders || !remindersMessage.trim()}
                    className="flex-1 rounded-xl bg-orange-600 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-orange-700 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {sendingReminders ? tr('Sending…', 'পাঠানো হচ্ছে…') : tr('Send Reminders', 'তাগাদা পাঠান')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="mb-6">
        <h1 className="text-[26px] font-black text-slate-900 tracking-tight">{tr('Monthly Donation', 'মাসিক চাঁদা')}</h1>
        <p className="text-sm text-slate-500 mt-0.5">{tr('Track and manage member monthly donations easily', 'সদস্যদের মাসিক চাঁদা সহজে ট্র্যাক ও পরিচালনা করুন')}</p>
      </div>

      {/* ── Controls Toolbar ── */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Year Dropdown */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-sm">
          <Calendar className="h-4 w-4 text-slate-400" />
          <select className="border-none bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
            value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{fmt.num(y)}</option>)}
          </select>
        </div>

        {/* Month Dropdown (Requirement 6) */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-sm">
          <Info className="h-4 w-4 text-slate-400" />
          <select className="border-none bg-transparent text-sm font-semibold text-slate-700 outline-none cursor-pointer"
            value={bulkMonth} onChange={(e) => setBulkMonth(Number(e.target.value))}>
            {months.map((nm, idx) => <option key={idx + 1} value={idx + 1}>{nm}</option>)}
          </select>
        </div>

        {/* Default Amount Input */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400">₹/month</span>
          <input type="number" min={1} className="w-16 border-none bg-transparent text-sm font-semibold text-slate-700 outline-none"
            value={defaultAmount} onChange={(e) => setDefaultAmount(Math.max(1, Number(e.target.value) || 1))} />
        </div>

        {/* Mark All Paid (for selected Dropdown Month) */}
        <button onClick={() => bulkMarkPaid(bulkMonth)} disabled={bulkBusy}
          className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40">
          {bulkBusy ? (
            <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {tr('Mark all paid', 'সবাইকে পরিশোধিত')}
          <span className="rounded bg-green-500/30 px-2 py-0.5 text-[10px] font-bold">
            {months[bulkMonth - 1]}
          </span>
        </button>

        {/* Export Button */}
        <button onClick={exportCSV}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
          <Download className="h-4 w-4" />
          {tr('Export', 'রপ্তানি')}
        </button>
      </div>

      {/* ── Stats Cards Row ── */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Total Collection */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-xl bg-green-50 p-2.5 text-green-600">
              <TrendingUp className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold text-green-700">+{collectionPct}%</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tr('Total Collection', 'মোট সংগ্রহ')}</p>
          <p className="mt-0.5 text-2xl font-black text-slate-900">{fmt.money(totalCollection)}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {tr(`of ${fmt.money(expectedTotal)} expected`, `${fmt.money(expectedTotal)} প্রত্যাশিত`)}
          </p>
        </div>

        {/* Total Members */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="mb-3 flex items-center justify-between">
            <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tr('Total Members', 'মোট সদস্য')}</p>
          <p className="mt-0.5 text-2xl font-black text-slate-900">{fmt.num(members.length)}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{tr('Active club members', 'সক্রিয় ক্লাব সদস্য')}</p>
        </div>

        {/* Paid Members */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tr('Paid Members', 'পরিশোধিত সদস্য')}</p>
              <p className="mt-0.5 text-2xl font-black text-slate-900">{fmt.num(paidMemberCount)}</p>
              <p className="text-[11px] text-green-600 font-semibold">{paidPct}% {tr('completed', 'সম্পন্ন')}</p>
            </div>
            <DonutChart pct={paidPct} size={56} color="#22c55e" />
          </div>
        </div>

        {/* Pending Members */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tr('Pending Members', 'বকেয়া সদস্য')}</p>
              <p className="mt-0.5 text-2xl font-black text-slate-900">{fmt.num(pendingMemberCount)}</p>
              <p className="text-[11px] text-orange-500 font-semibold">{100 - paidPct}% {tr('pending', 'বকেয়া')}</p>
            </div>
            <DonutChart pct={100 - paidPct} size={56} color="#f97316" />
          </div>
        </div>
      </div>

      {/* ── Main Layout (Table Grid + Sidebar) ── */}
      <div className="flex flex-col gap-6 xl:flex-row">
        
        {/* ── LEFT: Tracker Table ── */}
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
            {/* Header controls inside table card */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">{tr('Monthly Donation Tracker', 'মাসিক চাঁদা ট্র্যাকার')}</h2>
                {/* Color Legend */}
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" />{tr('Paid', 'পরিশোধিত')}</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-orange-400 inline-block" />{tr('Due', 'বকেয়া')}</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-slate-300 inline-block" />{tr('Future / Advance', 'ভবিষ্যৎ / আগাম')}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Search Member */}
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder={tr('Search member…', 'সদস্য খুঁজুন…')}
                    className="w-36 bg-transparent text-[12px] text-slate-700 outline-none placeholder-slate-400 font-medium" />
                </div>
                {/* Filter Dropdown */}
                <div ref={filterRef} className="relative">
                  <button onClick={() => setShowFilterMenu((o) => !o)}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-bold transition-colors ${filterStatus !== 'all' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                    <Filter className="h-4.5 w-4.5" />
                    {tr('Filters', 'ফিল্টার')}
                    {filterStatus !== 'all' && <span className="ml-1 rounded-full bg-green-600 px-1.5 py-0.5 text-[9px] text-white">1</span>}
                  </button>
                  {showFilterMenu && (
                    <div className="absolute right-0 top-9 z-20 w-44 rounded-xl border border-slate-100 bg-white py-1 shadow-xl">
                      {(['all', 'paid', 'due'] as const).map((s) => (
                        <button key={s} onClick={() => { setFilterStatus(s); setShowFilterMenu(false); }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-[12px] capitalize ${filterStatus === s ? 'font-bold text-green-700 bg-green-50' : 'text-slate-700 hover:bg-slate-50'}`}>
                          {filterStatus === s && <Check className="h-3.5 w-3.5" />} {s === 'all' ? tr('All members', 'সব সদস্য') : s === 'paid' ? tr('Fully paid', 'পরিশোধিত') : tr('Has pending', 'বকেয়া আছে')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Grid Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="sticky left-0 z-10 bg-slate-50/50 px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {t('common.member')}
                    </th>
                    {months.map((nm, i) => {
                      const mo = i + 1;
                      const isFut = mo > maxMonth;
                      return (
                        <th key={nm} className={`px-2 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider ${isFut ? 'text-slate-400' : 'text-slate-500'}`}>
                          <button onClick={() => bulkMarkPaid(mo)} disabled={bulkBusy}
                            title={tr(`Mark all paid for ${nm}`, `${nm} সবাইকে পরিশোধিত করুন`)}
                            className="hover:text-green-600 transition-colors font-bold">
                            {nm.slice(0, 3)}
                          </button>
                        </th>
                      );
                    })}
                    <th className="px-3 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {tr('Total (₹)', 'মোট (₹)')}
                    </th>
                    <th className="px-3 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {tr('Actions', 'কার্যক্রম')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                    : filteredMembers.length === 0
                    ? (
                      <tr><td colSpan={16} className="py-12 text-center text-slate-400 font-medium">
                        {search ? tr('No members match your search.', 'কোনো সদস্য খুঁজে পাওয়া যায়নি।') : tr('No approved members yet.', 'এখনো কোনো অনুমোদিত সদস্য নেই।')}
                      </td></tr>
                    )
                    : filteredMembers.map((m) => {
                      const row = grid[m.id] ?? {};
                      const total = Object.values(row).filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0);
                      return (
                        <tr key={m.id} className="group hover:bg-slate-50/50 transition-colors">
                          {/* Member Info */}
                          <td className="sticky left-0 z-10 bg-white px-5 py-3 group-hover:bg-slate-50/50 transition-colors">
                            <Link to={`/admin/members/${m.id}`} className="flex items-center gap-2.5">
                              <MAvatar name={m.full_name} avatarUrl={m.avatar_url} size={32} />
                              <div className="min-w-0">
                                <p className="truncate font-bold text-slate-800 hover:text-green-700 text-[12.5px] transition-colors">{m.full_name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">{memberDisplayId(m)}</p>
                              </div>
                            </Link>
                          </td>
                          {/* Month Cells (Unblocked Future Months Toggling) */}
                          {months.map((_, i) => {
                            const month = i + 1;
                            const isFut = month > maxMonth;
                            const c = row[month];
                            const paid = c?.status === 'paid';
                            const cellKey = `${m.id}-${month}`;
                            const isBusy = busyCells.has(cellKey);
                            
                            // If it's a future month and unpaid, render as future state
                            const state = paid ? 'paid' : isFut ? 'future' : 'due';

                            return (
                              <td key={month} className="px-1 py-3 text-center">
                                <button onClick={() => toggle(m.id, month)} disabled={isBusy}
                                  onMouseEnter={(e) => paid && setTooltip({ key: cellKey, x: e.clientX, y: e.clientY })}
                                  onMouseMove={(e) => paid && setTooltip((p) => p ? { ...p, x: e.clientX, y: e.clientY } : null)}
                                  onMouseLeave={() => setTooltip(null)}>
                                  <CellIcon state={state} busy={isBusy} />
                                </button>
                              </td>
                            );
                          })}
                          {/* Total Row */}
                          <td className="px-3 py-3 text-right font-extrabold text-slate-700">
                            {total > 0 ? fmt.money(total) : <span className="text-slate-300">₹0</span>}
                          </td>
                          {/* Actions Row */}
                          <td className="px-3 py-3 text-center">
                            <RowMenu member={m} onMarkAllPaid={() => markAllForMember(m)} />
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
                {/* Footer totals */}
                {!loading && filteredMembers.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                      <td className="sticky left-0 bg-slate-50/50 px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        {tr('Month Total', 'মাসিক মোট')}
                      </td>
                      {monthTotals.map((total, i) => {
                        const mo = i + 1;
                        return (
                          <td key={mo} className="px-2 py-3.5 text-center text-[11px] font-bold text-green-700">
                            {total > 0 ? `₹${fmt.num(total)}` : '—'}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3.5 text-right text-[12.5px] font-black text-green-800">
                        {fmt.money(grandTotal)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Bottom info section */}
            {!loading && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
                <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                  <Info className="h-3.5 w-3.5 text-green-500" />
                  {tr('Click on any cell to toggle payment status (works for future months too).', 'পেমেন্ট টগল করতে যেকোনো সেলে ক্লিক করুন (ভবিষ্যতের মাসেও কাজ করবে)।')}
                </p>
                <button onClick={exportCSV}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> {tr('View Donation History', 'দানের ইতিহাস দেখুন')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="flex shrink-0 flex-col gap-5 xl:w-72">
          
          {/* Collection Overview */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="mb-4 text-[13px] font-bold text-slate-800">{tr('Collection Overview', 'সংগ্রহের সারসংক্ষেপ')}</h3>
            <div className="flex justify-center mb-4">
              <div className="relative">
                <DonutChart pct={collectionPct} size={120} color="#22c55e" />
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {tr('Collected', 'সংগৃহীত')}
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { label: tr('Collected', 'সংগৃহীত'), value: totalCollection, color: '#22c55e' },
                { label: tr('Expected', 'প্রত্যাশিত'), value: expectedTotal, color: '#94a3b8' },
                { label: tr('Pending', 'বকেয়া'), value: Math.max(0, expectedTotal - totalCollection), color: '#f97316' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <span className="h-2 w-2 rounded-full inline-block" style={{ background: item.color }} />
                    {item.label}
                  </span>
                  <span className="font-bold" style={{ color: item.color === '#22c55e' ? '#16a34a' : item.color === '#f97316' ? '#ea580c' : '#64748b' }}>
                    {fmt.money(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions (Requirements 4 & 5) */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <h3 className="mb-3 text-[13px] font-bold text-slate-800">{tr('Quick Actions', 'দ্রুত কার্যক্রম')}</h3>
            <div className="space-y-1">
              
              {/* Add Member Donation -> links to donations page */}
              <Link to="/admin/donations"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-colors">
                <Plus className="h-4.5 w-4.5 text-blue-600" />
                {tr('Add Member Donation', 'সদস্যের চাঁদা যোগ করুন')}
              </Link>

              {/* Bulk Update */}
              <button onClick={() => bulkMarkPaid(bulkMonth)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-colors text-left">
                <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
                {tr('Bulk Update', 'একসাথে আপডেট')}
              </button>

              {/* Payment Reminders (triggers bulk messages compose modal) */}
              <button onClick={() => setShowRemindersModal(true)} disabled={defaultersList.length === 0}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-colors text-left disabled:opacity-40">
                <Mail className="h-4.5 w-4.5 text-orange-500" />
                {tr('Payment Reminders', 'পেমেন্ট তাগাদা')}
              </button>

              {/* Export Report */}
              <button onClick={exportCSV}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 transition-colors text-left">
                <Download className="h-4.5 w-4.5 text-indigo-600" />
                {tr('Export Report', 'রিপোর্ট ডাউনলোড')}
              </button>

            </div>
          </div>

          {/* Recent Payments Feed */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-slate-800">{tr('Recent Payments', 'সাম্প্রতিক পেমেন্ট')}</h3>
              <span className="text-[10px] font-extrabold uppercase text-slate-400">{tr('Live', 'সরাসরি')}</span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2.5 w-20 rounded bg-slate-100" />
                      <div className="h-2 w-14 rounded bg-slate-50" />
                    </div>
                    <div className="h-3 w-10 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3.5">
                {(() => {
                  const recentPaid: { member: Member; month: number; amount: number; paidAt: string }[] = [];
                  for (const m of members) {
                    for (const [mo, c] of Object.entries(grid[m.id] ?? {})) {
                      if (c.status === 'paid' && c.paid_at) {
                        recentPaid.push({ member: m, month: Number(mo), amount: Number(c.amount), paidAt: c.paid_at });
                      }
                    }
                  }
                  recentPaid.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
                  const top = recentPaid.slice(0, 5);
                  if (top.length === 0) return (
                    <p className="text-center text-[12px] text-slate-400 py-4 font-medium">{tr('No payments recorded yet.', 'কোনো পেমেন্ট নেই।')}</p>
                  );
                  return top.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <MAvatar name={p.member.full_name} avatarUrl={p.member.avatar_url} size={32} />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-[12px] font-bold text-slate-800">{p.member.full_name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{months[p.month - 1]} {year}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[12px] font-black text-green-700">{fmt.money(p.amount)}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{dtAgo(p.paidAt)}</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
