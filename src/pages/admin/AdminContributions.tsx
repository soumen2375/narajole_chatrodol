import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Member, MonthlyContribution } from '@/types';
import { memberDisplayId } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import {
  Search, Download, Check, Mail, User, MoreVertical, CheckCircle2, ChevronDown, ListFilter,
  Wallet, Landmark,
} from 'lucide-react';
import MemberAvatar from '@/components/ui/MemberAvatar';

type Grid = Record<string, Record<number, MonthlyContribution>>;
type CellState = 'paid' | 'advance' | 'due' | 'upcoming';

/** Where the money physically landed. Cash goes to the wallet; online goes to
 *  the bank account the treasurer names on the way in. */
type PaidBy = 'cash' | 'online';

interface BankOpt { id: string; label: string; account_number: string; is_default: boolean }

/** What the picker resolved to, and what gets written onto every row it covers. */
interface PaymentSource { paidBy: PaidBy; bankAccountId: string | null }

/** The action a confirmed payment source should be applied to. */
type PendingMark =
  | { kind: 'cell'; memberId: string; month: number; label: string }
  | { kind: 'member'; member: Member; months: number[]; label: string }
  | { kind: 'month'; month: number; memberIds: string[]; label: string };

// ─── Design tokens (from the Monthly Contributions canvas) ───────────────────
const C = {
  ink: '#0e1a15',
  sub: '#6b7a73',
  label: '#7f8f87',
  muted: '#8b9a92',
  line: '#e3e8e4',
  lineSoft: '#edf1ee',
  lineRow: '#f1f4f2',
  head: '#f7f9f8',
  totalRow: '#fbfcfb',
  foot: '#fcfdfc',
  field: '#fafbfa',
  fieldLine: '#d8dfda',
  dark: '#0f231b',
  darkLabel: '#7fa392',
  darkValue: '#b9d3c6',
  darkMuted: '#9fbcae',
  track: '#1c3a2e',
  collected: '#34d399',
  advance: '#1f6b4a',
  accent: '#12874f',
  accentDark: '#0f7a4a',
  accentSoft: '#e7f5ed',
  warn: '#eaab4e',
  warnInk: '#b4700d',
  warnBg: '#fff6e8',
  upcomingBg: '#f7f9f8',
  upcomingLine: '#dae1dc',
  upcomingInk: '#c3ccc7',
};

// Desktop payment-grid column track — shared by header, totals row and body rows.
const GRID_COLS = '210px repeat(12, minmax(50px, 1fr)) 92px 104px 40px';
const GRID_MIN = 1120;

// ─── Payment cell ────────────────────────────────────────────────────────────
function cellVisual(state: CellState): { style: React.CSSProperties; mark: string } {
  switch (state) {
    case 'paid':
      return { style: { background: C.accent, color: '#fff' }, mark: '✓' };
    case 'advance':
      return { style: { background: C.accentSoft, color: C.accent, border: `1.5px solid ${C.accent}` }, mark: '✓' };
    case 'due':
      return { style: { background: C.warnBg, color: C.warnInk, border: `1.5px solid ${C.warn}` }, mark: '' };
    default:
      return { style: { background: C.upcomingBg, color: C.upcomingInk, border: `1px dashed ${C.upcomingLine}` }, mark: '·' };
  }
}

function Spinner({ color = '#fff' }: { color?: string }) {
  return (
    <span
      className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"
      style={{ borderColor: color, borderTopColor: 'transparent' }}
    />
  );
}

// ─── Row actions menu ────────────────────────────────────────────────────────
function RowMenu({ memberId, onMarkAllPaid, label }: { memberId: string; onMarkAllPaid: () => void; label: (en: string, bn: string) => string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={label('Row actions', 'সারির কার্যক্রম')}
        className="rounded-lg p-1.5 transition-colors hover:bg-black/5"
        style={{ color: C.muted }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-xl bg-white py-1"
          style={{ border: `1px solid ${C.line}`, boxShadow: '0 12px 32px rgba(14,26,21,.14)' }}
        >
          <Link
            to={`/admin/members/${memberId}`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-[12.5px] font-semibold hover:bg-black/[.03]"
            style={{ color: C.ink }}
          >
            <User className="h-3.5 w-3.5" style={{ color: C.muted }} /> {label('View profile', 'প্রোফাইল দেখুন')}
          </Link>
          <button
            onClick={() => { onMarkAllPaid(); setOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-semibold hover:bg-black/[.03]"
            style={{ color: C.ink }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" style={{ color: C.accent }} /> {label('Mark all months paid', 'সব মাস পরিশোধিত')}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Asks where the money came in before a month is marked paid.
 *
 * The destination used to be implicit: every admin-marked month was written as
 * 'cash', so dues collected by bank transfer still landed in the cash wallet
 * and the wallet never reconciled. Cash goes to the wallet; Online goes to the
 * chosen bank account, which is carried on the row itself so the ledger and
 * bank-transaction mirrors both agree with what actually happened.
 */
function PaymentSourceModal({
  title, subtitle, banks, initial, onConfirm, onCancel, label,
}: {
  title: string;
  subtitle: string;
  banks: BankOpt[];
  initial: PaymentSource;
  onConfirm: (src: PaymentSource) => void;
  onCancel: () => void;
  label: (en: string, bn: string) => string;
}) {
  const [paidBy, setPaidBy] = useState<PaidBy>(initial.paidBy);
  const [bankId, setBankId] = useState<string>(
    initial.bankAccountId || banks.find((b) => b.is_default)?.id || banks[0]?.id || '',
  );

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onCancel]);

  const canConfirm = paidBy === 'cash' || !!bankId;

  const option = (v: PaidBy, Icon: typeof Wallet, name: string, hint: string) => {
    const on = paidBy === v;
    return (
      <button
        key={v}
        type="button"
        onClick={() => setPaidBy(v)}
        className="flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 transition-colors"
        style={{
          border: `1.5px solid ${on ? C.accent : C.fieldLine}`,
          background: on ? C.accentSoft : '#fff',
          color: on ? C.accent : C.sub,
        }}
        aria-pressed={on}
      >
        <Icon className="h-[18px] w-[18px]" />
        <span className="text-[13.5px] font-bold">{name}</span>
        <span className="text-[10.5px]" style={{ color: on ? C.accent : C.muted }}>{hint}</span>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,35,27,.5)' }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
        <h3 className="text-[17px] font-extrabold tracking-[-.01em]">{title}</h3>
        <p className="mt-1 text-[13px]" style={{ color: C.sub }}>{subtitle}</p>

        <div className="mt-4 flex gap-2.5">
          {option('cash', Wallet, label('Cash', 'নগদ'), label('to wallet', 'ওয়ালেটে'))}
          {option('online', Landmark, label('Online', 'অনলাইন'), label('to bank', 'ব্যাংকে'))}
        </div>

        {paidBy === 'online' && (
          <label className="mt-3.5 block">
            <span className="text-[11px] font-bold uppercase tracking-[.08em]" style={{ color: C.label }}>
              {label('Which account received it', 'কোন অ্যাকাউন্টে এসেছে')}
            </span>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl px-3 text-sm"
              style={{ border: `1px solid ${C.fieldLine}`, background: C.field }}
            >
              {banks.length === 0 && <option value="">{label('No bank account on file', 'কোনো ব্যাংক অ্যাকাউন্ট নেই')}</option>}
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}{b.account_number ? ` (…${b.account_number.slice(-4)})` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onCancel}
            className="min-h-[44px] flex-1 rounded-xl py-2.5 text-sm font-bold"
            style={{ border: `1px solid ${C.fieldLine}`, background: '#fff', color: '#20302a' }}
          >
            {label('Cancel', 'বাতিল')}
          </button>
          <button
            onClick={() => onConfirm({ paidBy, bankAccountId: paidBy === 'online' ? bankId : null })}
            disabled={!canConfirm}
            className="min-h-[44px] flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: C.accent }}
          >
            {label('Mark paid', 'পরিশোধিত করুন')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminContributions() {
  const { member: me } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const months = fmt.months();
  const short = (i: number) => months[i].slice(0, 3);
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
  // Surfaced so a rejected write is visible instead of the cell silently reverting.
  const [writeError, setWriteError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ key: string; x: number; y: number } | null>(null);

  // Focus month — drives the month chips, the stats band and the bulk action.
  const [focus, setFocus] = useState<number>(currentMonth);

  // Cash-or-online, asked once per marking action and remembered as the
  // default for the next one so a long collection session stays quick.
  const [banks, setBanks] = useState<BankOpt[]>([]);
  const [pendingMark, setPendingMark] = useState<PendingMark | null>(null);
  const [lastSource, setLastSource] = useState<PaymentSource>({ paidBy: 'cash', bankAccountId: null });

  const [showRemindersModal, setShowRemindersModal] = useState(false);
  const [remindersMessage, setRemindersMessage] = useState('');
  const [sendingReminders, setSendingReminders] = useState(false);
  const [remindersSuccess, setRemindersSuccess] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  const dtAgo = (s: string) => {
    const diff = Date.now() - new Date(s).getTime();
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (d > 0) return tr(`${d} day${d > 1 ? 's' : ''} ago`, `${fmt.num(d)} দিন আগে`);
    if (h > 0) return tr(`${h} hour${h > 1 ? 's' : ''} ago`, `${fmt.num(h)} ঘণ্টা আগে`);
    return tr('just now', 'এইমাত্র');
  };

  useEffect(() => {
    const h = (e: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    setRemindersMessage(
      tr('Please payment your monthly due as soon as possible.', 'দয়া করে আপনার মাসিক বকেয়া চাঁদা দ্রুত পরিশোধ করুন।'),
    );
  }, [lang]);

  // Past years are complete — focus the whole year; the current year stops at today.
  useEffect(() => {
    setFocus(year === currentYear ? currentMonth : 12);
  }, [year, currentYear, currentMonth]);

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

  // The cash wallet is not a destination you pick — 'cash' routes there itself.
  useEffect(() => {
    supabase
      .from('cswo_bank_accounts')
      .select('id,label,account_number,is_default')
      .eq('is_active', true)
      .neq('account_type', 'cash')
      .order('sort_order')
      .then(({ data }) => setBanks((data ?? []) as BankOpt[]));
  }, []);

  // ─── Marking a month paid ─────────────────────────────────────────────────
  //
  // Every path that sets 'paid' first asks where the money came from, then
  // applies the same answer to the whole batch. Un-marking needs no answer, so
  // it goes straight through.

  /** One row's worth of the write, given the confirmed source. */
  const paidRow = (memberId: string, month: number, src: PaymentSource, nowIso: string) => ({
    member_id: memberId,
    year,
    month,
    amount: defaultAmount,
    status: 'paid' as const,
    paid_at: nowIso,
    payment_method: src.paidBy,
    bank_account_id: src.bankAccountId,
    recorded_by: me?.id,
  });

  const clearMonth = async (memberId: string, month: number) => {
    const cellKey = `${memberId}-${month}`;
    const existing = grid[memberId]?.[month];
    setGrid((prev) => {
      const mr = { ...(prev[memberId] ?? {}) };
      mr[month] = { ...(existing ?? ({} as MonthlyContribution)), member_id: memberId, year, month, amount: defaultAmount, status: 'unpaid', paid_at: null, payment_method: null, bank_account_id: null, recorded_by: me?.id ?? null } as MonthlyContribution;
      return { ...prev, [memberId]: mr };
    });
    setBusyCells((prev) => new Set(prev).add(cellKey));
    const { error } = await supabase.from('cswo_monthly_contributions').upsert(
      { member_id: memberId, year, month, amount: defaultAmount, status: 'unpaid', paid_at: null, payment_method: null, bank_account_id: null, recorded_by: me?.id },
      { onConflict: 'member_id,year,month' },
    );
    if (error) {
      console.error('[contributions] upsert failed', { memberId, year, month, error });
      setWriteError(`${months[month - 1]} ${year} — ${error.message}`);
      setGrid((prev) => {
        const mr = { ...(prev[memberId] ?? {}) };
        if (existing) mr[month] = existing; else delete mr[month];
        return { ...prev, [memberId]: mr };
      });
    } else {
      setWriteError(null);
    }
    setBusyCells((prev) => { const n = new Set(prev); n.delete(cellKey); return n; });
  };

  const toggle = (memberId: string, month: number) => {
    const cellKey = `${memberId}-${month}`;
    if (busyCells.has(cellKey)) return;
    if (grid[memberId]?.[month]?.status === 'paid') {
      void clearMonth(memberId, month);
      return;
    }
    const who = members.find((m) => m.id === memberId)?.full_name ?? '';
    setPendingMark({
      kind: 'cell',
      memberId,
      month,
      label: `${who} · ${months[month - 1]} ${year}`,
    });
  };

  const markAllForMember = (member: Member) => {
    const toMark = Array.from({ length: 12 }, (_, i) => i + 1).filter((mo) => grid[member.id]?.[mo]?.status !== 'paid');
    if (toMark.length === 0) return;
    setPendingMark({
      kind: 'member',
      member,
      months: toMark,
      label: tr(
        `${member.full_name} · ${toMark.length} month${toMark.length > 1 ? 's' : ''} · ₹${toMark.length * defaultAmount}`,
        `${member.full_name} · ${fmt.num(toMark.length)} মাস · ₹${fmt.num(toMark.length * defaultAmount)}`,
      ),
    });
  };

  const bulkMarkPaid = (mo: number) => {
    const unpaid = members.filter((m) => grid[m.id]?.[mo]?.status !== 'paid');
    if (unpaid.length === 0) return;
    setPendingMark({
      kind: 'month',
      month: mo,
      memberIds: unpaid.map((m) => m.id),
      label: tr(
        `${months[mo - 1]} ${year} · ${unpaid.length} member${unpaid.length > 1 ? 's' : ''} · ₹${unpaid.length * defaultAmount}`,
        `${months[mo - 1]} ${fmt.num(year)} · ${fmt.num(unpaid.length)} জন · ₹${fmt.num(unpaid.length * defaultAmount)}`,
      ),
    });
  };

  /** Applies the confirmed source to whichever action opened the picker. */
  const applyMark = async (src: PaymentSource) => {
    const target = pendingMark;
    setPendingMark(null);
    if (!target) return;
    setLastSource(src);

    const nowIso = new Date().toISOString();
    const pairs: Array<{ memberId: string; month: number }> =
      target.kind === 'cell'
        ? [{ memberId: target.memberId, month: target.month }]
        : target.kind === 'member'
          ? target.months.map((mo) => ({ memberId: target.member.id, month: mo }))
          : target.memberIds.map((id) => ({ memberId: id, month: target.month }));

    if (target.kind === 'cell') setBusyCells((prev) => new Set(prev).add(`${target.memberId}-${target.month}`));
    else setBulkBusy(true);

    setGrid((prev) => {
      const next = { ...prev };
      for (const { memberId, month } of pairs) {
        const mr = { ...(next[memberId] ?? {}) };
        mr[month] = { ...(mr[month] ?? ({} as MonthlyContribution)), ...paidRow(memberId, month, src, nowIso), recorded_by: me?.id ?? null } as MonthlyContribution;
        next[memberId] = mr;
      }
      return next;
    });

    const results = await Promise.all(
      pairs.map(({ memberId, month }) =>
        supabase.from('cswo_monthly_contributions').upsert(
          paidRow(memberId, month, src, nowIso),
          { onConflict: 'member_id,year,month' },
        ),
      ),
    );

    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error('[contributions] mark paid failed', { target, error: failed.error });
      setWriteError(`${target.label} — ${failed.error.message}`);
      await load();
    } else {
      setWriteError(null);
    }

    if (target.kind === 'cell') {
      setBusyCells((prev) => { const n = new Set(prev); n.delete(`${target.memberId}-${target.month}`); return n; });
    } else {
      setBulkBusy(false);
    }
  };

  // ─── Export CSV ───────────────────────────────────────────────────────────
  const exportCSV = () => {
    const header = ['Member', 'ID', ...months.map((m) => m.slice(0, 3)), 'Total (₹)'];
    const rows = members.map((m) => {
      const row = grid[m.id] ?? {};
      const total = Object.values(row).filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0);
      return [m.full_name, memberDisplayId(m), ...Array.from({ length: 12 }, (_, i) => {
        const c = row[i + 1];
        return c?.status === 'paid' ? 'Paid' : i + 1 > focus ? 'Upcoming' : 'Due';
      }), total];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cswo-dues-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Derived stats (all keyed to the focus month) ─────────────────────────
  const stats = useMemo(() => {
    let collected = 0, advance = 0, upToDate = 0, behind = 0, dueMonths = 0;
    const monthTotals = new Array(12).fill(0);
    const defaulters: Member[] = [];

    for (const m of members) {
      const row = grid[m.id] ?? {};
      let miss = 0;
      for (let mo = 1; mo <= 12; mo++) {
        const c = row[mo];
        const paid = c?.status === 'paid';
        if (paid) {
          const amt = Number(c.amount);
          collected += amt;
          monthTotals[mo - 1] += amt;
          if (mo > focus) advance += amt;
        } else if (mo <= focus) miss++;
      }
      if (miss === 0) upToDate++; else { behind++; dueMonths += miss; defaulters.push(m); }
    }

    const expected = members.length * focus * defaultAmount;
    const onTime = collected - advance;
    const pct = expected > 0 ? Math.round((onTime / expected) * 100) : 0;
    return {
      collected, advance, expected, onTime, pct, upToDate, behind, dueMonths, monthTotals, defaulters,
      pending: Math.max(expected - onTime, 0),
    };
  }, [members, grid, focus, defaultAmount]);

  // ─── Filtered rows ────────────────────────────────────────────────────────
  const filteredMembers = useMemo(() => {
    let list = members;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        memberDisplayId(m).toLowerCase().includes(q));
    }
    const missing = (m: Member) => Array.from({ length: focus }, (_, i) => i + 1).some((mo) => grid[m.id]?.[mo]?.status !== 'paid');
    if (filterStatus === 'paid') list = list.filter((m) => !missing(m));
    if (filterStatus === 'due') list = list.filter(missing);
    return list;
  }, [members, search, filterStatus, grid, focus]);

  const years = [currentYear, currentYear - 1, currentYear - 2];
  const filterLabel = filterStatus === 'all' ? tr('All members', 'সব সদস্য') : filterStatus === 'paid' ? tr('Fully paid', 'পরিশোধিত') : tr('Has pending', 'বকেয়া আছে');

  // ─── Send reminders ───────────────────────────────────────────────────────
  const sendReminders = async () => {
    if (stats.defaulters.length === 0 || !remindersMessage.trim()) return;
    setSendingReminders(true);
    try {
      const records = stats.defaulters.map((m) => ({ member_id: m.id, sender_name: 'Admin', message: remindersMessage.trim() }));
      const { error } = await supabase.from('cswo_admin_messages').insert(records);
      if (error) throw error;
      setRemindersSuccess(true);
      setTimeout(() => { setShowRemindersModal(false); setRemindersSuccess(false); }, 2000);
    } catch (err) {
      console.error(err);
      alert(tr('Failed to send reminders. Please try again.', 'রিমাইন্ডার পাঠাতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'));
    } finally {
      setSendingReminders(false);
    }
  };

  // ─── Per-member view model ────────────────────────────────────────────────
  const rowModel = (m: Member) => {
    const row = grid[m.id] ?? {};
    let paidCount = 0, miss = 0, total = 0;
    const cells = Array.from({ length: 12 }, (_, i) => {
      const mo = i + 1;
      const c = row[mo];
      const isPaid = c?.status === 'paid';
      const future = mo > focus;
      if (isPaid) { paidCount++; total += Number(c.amount); } else if (!future) miss++;
      const state: CellState = isPaid ? (future ? 'advance' : 'paid') : future ? 'upcoming' : 'due';
      return { mo, state, cellKey: `${m.id}-${mo}` };
    });
    const pct = Math.round((paidCount / 12) * 100);
    return { cells, total, pct, miss };
  };

  const btnGhost: React.CSSProperties = {
    border: `1px solid ${C.fieldLine}`, background: '#fff', color: '#20302a',
  };

  return (
    <div className="space-y-4 sm:space-y-[18px]" style={{ color: C.ink }}>

      {/* ── Floating cell tooltip (desktop pointer only) ── */}
      {tooltip && (() => {
        const parts = tooltip.key.split('-');
        const mo = Number(parts[parts.length - 1]);
        const mid = parts.slice(0, -1).join('-');
        const cell = grid[mid]?.[mo];
        if (!cell) return null;
        return (
          <div
            className="pointer-events-none fixed z-50 rounded-xl px-3 py-2 text-xs shadow-2xl"
            style={{ left: tooltip.x + 12, top: tooltip.y - 44, background: C.dark, color: '#fff' }}
          >
            <div className="font-bold" style={{ color: C.collected }}>{fmt.money(Number(cell.amount))}</div>
            {cell.paid_at && <div style={{ color: C.darkMuted }} className="mt-0.5">{fmt.date(cell.paid_at)}</div>}
            {cell.payment_method && <div className="mt-0.5 text-[10px] capitalize" style={{ color: C.darkLabel }}>{cell.payment_method}</div>}
          </div>
        );
      })()}

      {/* ── Cash or online, asked before anything is marked paid ── */}
      {pendingMark && (
        <PaymentSourceModal
          title={tr('How was this received?', 'কীভাবে পাওয়া গেল?')}
          subtitle={pendingMark.label}
          banks={banks}
          initial={lastSource}
          onConfirm={applyMark}
          onCancel={() => setPendingMark(null)}
          label={tr}
        />
      )}

      {/* ── Reminders modal ── */}
      {showRemindersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,35,27,.5)' }}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-3 flex items-start gap-2.5">
              <div className="rounded-xl p-2" style={{ background: C.warnBg, color: C.warnInk }}><Mail className="h-5 w-5" /></div>
              <div className="min-w-0">
                <h3 className="text-base font-extrabold sm:text-lg">{tr('Send payment reminders', 'পেমেন্ট তাগাদা পাঠান')}</h3>
                <p className="text-xs" style={{ color: C.sub }}>
                  {tr(
                    `Send a notification to ${stats.defaulters.length} member${stats.defaulters.length === 1 ? '' : 's'} with pending dues.`,
                    `${fmt.num(stats.defaulters.length)} জন বকেয়াদার সদস্যের কাছে নোটিফিকেশন পাঠান।`,
                  )}
                </p>
              </div>
            </div>

            {remindersSuccess ? (
              <div className="my-8 py-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: C.accentSoft, color: C.accent }}>
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold">{tr('Reminders sent successfully!', 'তাগাদা সফলভাবে পাঠানো হয়েছে!')}</h4>
              </div>
            ) : (
              <>
                <div className="mb-4 max-h-36 space-y-1.5 overflow-y-auto rounded-xl p-3" style={{ border: `1px solid ${C.lineSoft}`, background: C.head }}>
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: C.label }}>{tr('Recipients', 'গ্রাহক')}</p>
                  {stats.defaulters.map((m) => (
                    <div key={m.id} className="flex items-center gap-2">
                      <MemberAvatar name={m.full_name} avatarUrl={m.avatar_url} size={20} />
                      <span className="truncate text-xs font-medium">{m.full_name}</span>
                      <span className="shrink-0 text-[10px]" style={{ color: C.muted }}>({memberDisplayId(m)})</span>
                    </div>
                  ))}
                </div>

                <div className="mb-5">
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider" style={{ color: C.label }}>{tr('Message', 'বার্তা')}</label>
                  <textarea
                    rows={4}
                    value={remindersMessage}
                    onChange={(e) => setRemindersMessage(e.target.value)}
                    placeholder={tr('Write reminder message…', 'তাগাদা বার্তাটি লিখুন…')}
                    className="w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
                    style={{ border: `1px solid ${C.fieldLine}` }}
                  />
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
                  <button
                    onClick={() => setShowRemindersModal(false)}
                    disabled={sendingReminders}
                    className="min-h-[44px] flex-1 rounded-xl py-2.5 text-sm font-bold transition-colors disabled:opacity-50"
                    style={btnGhost}
                  >
                    {tr('Cancel', 'বাতিল')}
                  </button>
                  <button
                    onClick={sendReminders}
                    disabled={sendingReminders || !remindersMessage.trim()}
                    className="min-h-[44px] flex-1 rounded-xl py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50"
                    style={{ background: C.accent }}
                  >
                    {sendingReminders ? tr('Sending…', 'পাঠানো হচ্ছে…') : tr('Send reminders', 'তাগাদা পাঠান')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Write failure banner ── */}
      {writeError && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3 text-[13px]"
          style={{ background: C.warnBg, border: `1px solid ${C.warn}`, color: C.warnInk }}
          role="alert"
        >
          <span className="flex-1">
            <strong>{tr('Not saved to the database.', 'ডাটাবেসে সংরক্ষিত হয়নি।')}</strong>{' '}
            {writeError}
          </span>
          <button onClick={() => setWriteError(null)} className="shrink-0 font-bold" aria-label={tr('Dismiss', 'বন্ধ')}>×</button>
        </div>
      )}

      {/* ── Header ── */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-.02em] sm:text-[26px] lg:text-[30px]">
            {tr('Monthly contributions', 'মাসিক চাঁদা')}
          </h1>
          <p className="mt-1 text-[13px] sm:text-sm" style={{ color: C.sub }}>
            {tr(
              `${members.length} active members · ₹${defaultAmount} per member per month · year ${year}`,
              `${fmt.num(members.length)} জন সক্রিয় সদস্য · মাসে ₹${fmt.num(defaultAmount)} · সাল ${fmt.num(year)}`,
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportCSV}
            className="flex h-10 min-h-[40px] flex-1 items-center justify-center gap-2 rounded-[10px] px-4 text-[13.5px] font-bold transition-colors hover:brightness-[.97] sm:flex-none"
            style={btnGhost}
          >
            <Download className="h-4 w-4" /> {tr('Export CSV', 'CSV রপ্তানি')}
          </button>
          <button
            onClick={() => bulkMarkPaid(focus)}
            disabled={bulkBusy || members.length === 0}
            className="flex h-10 min-h-[40px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] px-4 text-[13.5px] font-bold text-white transition-colors disabled:opacity-50 sm:flex-none"
            style={{ background: C.accent, border: `1px solid ${C.accentDark}`, boxShadow: '0 1px 2px rgba(9,40,25,.25)' }}
          >
            {bulkBusy ? <Spinner /> : <Check className="h-4 w-4" />}
            {tr(`Mark ${short(focus - 1)} all paid`, `${short(focus - 1)} সবাই পরিশোধিত`)}
          </button>
        </div>
      </header>

      {/* ── Stats band ── */}
      <section className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.35fr_1fr]">

        {/* Collected / expected */}
        <div className="flex flex-col gap-4 rounded-2xl p-5 sm:p-[22px_24px]" style={{ background: C.dark }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-[11.5px] font-bold tracking-[.14em]" style={{ color: C.darkLabel }}>
                {tr('COLLECTED YEAR TO DATE', 'বছরের মোট সংগ্রহ')}
              </span>
              <span className="text-[30px] font-extrabold tracking-[-.02em] text-white tabular-nums sm:text-[40px]">
                {fmt.money(stats.collected)}
              </span>
            </div>
            <div className="flex flex-col gap-1 sm:text-right">
              <span className="text-[11.5px] font-bold tracking-[.14em]" style={{ color: C.darkLabel }}>
                {tr(`EXPECTED THROUGH ${short(focus - 1).toUpperCase()}`, `${short(focus - 1)} পর্যন্ত প্রত্যাশিত`)}
              </span>
              <span className="text-[20px] font-bold tabular-nums sm:text-[22px]" style={{ color: C.darkValue }}>
                {fmt.money(stats.expected)}
              </span>
            </div>
          </div>

          <div className="flex h-3 overflow-hidden rounded-full" style={{ background: C.track }}>
            <div style={{ width: `${Math.min(stats.pct, 100)}%`, background: C.collected }} />
            <div style={{ width: `${stats.expected > 0 ? Math.min(Math.round((stats.advance / stats.expected) * 100), 100) : 0}%`, background: C.advance }} />
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] sm:text-[13px]">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: C.collected }} />
              <span style={{ color: C.darkMuted }}>{tr('Collected', 'সংগৃহীত')}</span>
              <strong className="text-white tabular-nums">{fmt.money(stats.collected)}</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#f0a336' }} />
              <span style={{ color: C.darkMuted }}>{tr('Outstanding', 'বকেয়া')}</span>
              <strong className="text-white tabular-nums">{fmt.money(stats.pending)}</strong>
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#5b7d6e' }} />
              <span style={{ color: C.darkMuted }}>{tr('Rate', 'হার')}</span>
              <strong className="text-white">{fmt.num(stats.pct)}%</strong>
            </span>
          </div>
        </div>

        {/* Counters + controls */}
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col justify-between gap-2 rounded-2xl bg-white p-4 sm:p-[18px]" style={{ border: `1px solid ${C.line}` }}>
            <span className="text-[11px] font-bold tracking-[.12em] sm:text-[11.5px]" style={{ color: C.label }}>{tr('UP TO DATE', 'হালনাগাদ')}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-extrabold tracking-[-.02em] tabular-nums sm:text-[34px]">{fmt.num(stats.upToDate)}</span>
              <span className="text-sm font-semibold" style={{ color: C.muted }}>/ {fmt.num(members.length)}</span>
            </div>
            <span className="text-[12px] font-semibold sm:text-[12.5px]" style={{ color: C.accent }}>
              {tr(`Paid through ${short(focus - 1)}`, `${short(focus - 1)} পর্যন্ত পরিশোধিত`)}
            </span>
          </div>

          <div className="flex flex-col justify-between gap-2 rounded-2xl bg-white p-4 sm:p-[18px]" style={{ border: `1px solid ${C.line}` }}>
            <span className="text-[11px] font-bold tracking-[.12em] sm:text-[11.5px]" style={{ color: C.label }}>{tr('BEHIND', 'পিছিয়ে')}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-extrabold tracking-[-.02em] tabular-nums sm:text-[34px]">{fmt.num(stats.behind)}</span>
              <span className="text-sm font-semibold" style={{ color: C.muted }}>{tr('members', 'সদস্য')}</span>
            </div>
            <span className="text-[12px] font-semibold sm:text-[12.5px]" style={{ color: C.warnInk }}>
              {tr(`${stats.dueMonths} unpaid months outstanding`, `${fmt.num(stats.dueMonths)} মাসের বকেয়া`)}
            </span>
          </div>

          {/* Year · rate · month chips */}
          <div className="col-span-2 flex flex-wrap items-center gap-2.5 rounded-2xl bg-white p-3 sm:px-4" style={{ border: `1px solid ${C.line}` }}>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-9 cursor-pointer rounded-[9px] px-2 text-[12.5px] font-bold outline-none sm:h-8"
              style={{ border: `1px solid ${C.fieldLine}`, background: C.field, color: '#20302a' }}
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>

            <div className="flex h-9 items-center gap-1.5 rounded-[9px] px-2.5 sm:h-8" style={{ border: `1px solid ${C.fieldLine}`, background: C.field }}>
              <span className="text-[11.5px] font-bold" style={{ color: C.muted }}>₹/{tr('month', 'মাস')}</span>
              <input
                type="number"
                min={1}
                value={defaultAmount}
                onChange={(e) => setDefaultAmount(Math.max(1, Number(e.target.value) || 1))}
                className="w-12 border-0 bg-transparent text-[13px] font-extrabold tabular-nums outline-none"
                style={{ color: C.ink }}
              />
            </div>

            <div className="hidden h-[22px] w-px sm:block" style={{ background: C.lineSoft }} />

            {/* Chips scroll on narrow screens, wrap on wide ones */}
            <div className="-mx-1 flex w-full gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:w-auto sm:flex-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
              {months.map((_, i) => {
                const mo = i + 1;
                const on = mo === focus;
                return (
                  <button
                    key={mo}
                    onClick={() => setFocus(mo)}
                    className="h-8 shrink-0 cursor-pointer rounded-lg px-3 text-[12px] font-bold transition-colors"
                    style={{
                      border: `1px solid ${on ? C.accent : '#e0e6e2'}`,
                      background: on ? C.accent : '#fff',
                      color: on ? '#fff' : '#5c6b64',
                    }}
                  >
                    {short(i)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Payment grid ── */}
      <section className="overflow-hidden rounded-2xl bg-white" style={{ border: `1px solid ${C.line}` }}>

        {/* Card header */}
        <div className="flex flex-col gap-3 p-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:gap-4" style={{ borderBottom: `1px solid ${C.lineSoft}` }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="text-[15px] font-extrabold tracking-[-.01em] sm:text-base">{tr('Payment grid', 'পেমেন্ট গ্রিড')}</h2>
            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 text-[11.5px] sm:text-xs" style={{ color: C.sub }}>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-[5px]" style={{ background: C.accent }} />{tr('Paid', 'পরিশোধিত')}</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-[5px]" style={{ background: C.warnBg, border: `1.5px solid ${C.warn}` }} />{tr('Due', 'বকেয়া')}</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 rounded-[5px]" style={{ background: C.upcomingBg, border: `1px dashed #cdd6d0` }} />{tr('Upcoming', 'আসন্ন')}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[9px] px-3 sm:h-9 lg:w-[230px] lg:flex-none" style={{ border: `1px solid ${C.fieldLine}`, background: C.field }}>
              <Search className="h-4 w-4 shrink-0" style={{ color: C.muted }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tr('Search member or ID', 'সদস্য বা আইডি খুঁজুন')}
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
                style={{ color: C.ink }}
              />
            </div>

            <div ref={filterRef} className="relative shrink-0">
              <button
                onClick={() => setShowFilterMenu((o) => !o)}
                className="flex h-10 items-center gap-2 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-bold sm:h-9"
                style={{ border: `1px solid ${showFilterMenu || filterStatus !== 'all' ? '#20302a' : C.fieldLine}`, background: '#fff', color: '#20302a' }}
              >
                <ListFilter className="h-4 w-4" />
                <span className="hidden sm:inline">{filterLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
              {showFilterMenu && (
                <div
                  className="absolute right-0 top-[46px] z-20 flex min-w-[184px] flex-col gap-0.5 rounded-xl bg-white p-1.5"
                  style={{ border: `1px solid ${C.line}`, boxShadow: '0 12px 32px rgba(14,26,21,.14)' }}
                >
                  {(['all', 'paid', 'due'] as const).map((s) => {
                    const on = filterStatus === s;
                    return (
                      <button
                        key={s}
                        onClick={() => { setFilterStatus(s); setShowFilterMenu(false); }}
                        className="flex min-h-[36px] w-full items-center gap-2 whitespace-nowrap rounded-lg px-2.5 text-left text-[13px]"
                        style={{ background: on ? C.accentSoft : 'transparent', color: on ? C.accent : '#20302a', fontWeight: on ? 800 : 600 }}
                      >
                        <span className="w-3.5 text-[12px] font-extrabold" style={{ color: on ? C.accent : 'transparent' }}>✓</span>
                        {s === 'all' ? tr('All members', 'সব সদস্য') : s === 'paid' ? tr('Fully paid', 'পরিশোধিত') : tr('Has pending', 'বকেয়া আছে')}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Desktop / tablet: 12-month grid ── */}
        <div className="hidden overflow-x-auto md:block">
          <div style={{ minWidth: GRID_MIN }}>

            {/* Column heads */}
            <div
              className="grid h-[42px] items-center pr-5"
              style={{ gridTemplateColumns: GRID_COLS, background: C.head, borderBottom: `1px solid ${C.lineSoft}` }}
            >
              <span className="sticky left-0 z-[2] pl-5 text-[10.5px] font-extrabold tracking-[.12em]" style={{ color: C.label, background: C.head }}>
                {tr('MEMBER', 'সদস্য')}
              </span>
              {months.map((_, i) => {
                const mo = i + 1;
                return (
                  <button
                    key={mo}
                    onClick={() => bulkMarkPaid(mo)}
                    disabled={bulkBusy}
                    title={tr(`Mark all paid for ${months[i]}`, `${months[i]} সবাইকে পরিশোধিত করুন`)}
                    className="text-center text-[10.5px] font-extrabold tracking-[.08em] transition-colors disabled:opacity-50"
                    style={{ color: mo === focus ? C.accent : mo > focus ? '#b9c2bc' : C.label }}
                  >
                    {short(i).toUpperCase()}
                  </button>
                );
              })}
              <span className="text-right text-[10.5px] font-extrabold tracking-[.12em]" style={{ color: C.label }}>{tr('PAID', 'পরিশোধিত')}</span>
              <span className="text-right text-[10.5px] font-extrabold tracking-[.12em]" style={{ color: C.label }}>{tr('PROGRESS', 'অগ্রগতি')}</span>
              <span />
            </div>

            {/* Month totals */}
            <div
              className="grid h-[52px] items-center pr-5"
              style={{ gridTemplateColumns: GRID_COLS, background: C.totalRow, borderBottom: `1px solid ${C.line}` }}
            >
              <span className="sticky left-0 z-[2] pl-5 text-[11px] font-extrabold tracking-[.12em]" style={{ color: '#4a5b53', background: C.totalRow }}>
                {tr('MONTH TOTAL', 'মাসিক মোট')}
              </span>
              {stats.monthTotals.map((tot, i) => (
                <span key={i} className="text-center text-[11.5px] font-bold tabular-nums" style={{ color: tot ? '#20302a' : C.upcomingInk }}>
                  {tot ? fmt.money(tot) : '—'}
                </span>
              ))}
              <span className="text-right text-sm font-extrabold tabular-nums">{fmt.money(stats.collected)}</span>
              <span className="text-right text-[11.5px] font-bold" style={{ color: C.sub }}>{fmt.num(stats.pct)}%</span>
              <span />
            </div>

            {/* Body */}
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid h-14 animate-pulse items-center pr-5" style={{ gridTemplateColumns: GRID_COLS, borderBottom: `1px solid ${C.lineRow}` }}>
                  <div className="sticky left-0 z-[2] flex items-center gap-3 bg-white pl-5">
                    <div className="h-[34px] w-[34px] shrink-0 rounded-full" style={{ background: C.lineSoft }} />
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 rounded" style={{ background: C.lineSoft }} />
                      <div className="h-2 w-14 rounded" style={{ background: C.head }} />
                    </div>
                  </div>
                  {Array.from({ length: 14 }).map((__, j) => (
                    <div key={j} className="mx-1.5 h-[26px] rounded-lg" style={{ background: C.head }} />
                  ))}
                  <span />
                </div>
              ))
            ) : filteredMembers.length === 0 ? (
              <div className="px-5 py-14 text-center text-[13px] font-medium" style={{ color: C.muted }}>
                {search || filterStatus !== 'all'
                  ? tr('No members match your search.', 'কোনো সদস্য খুঁজে পাওয়া যায়নি।')
                  : tr('No approved members yet.', 'এখনো কোনো অনুমোদিত সদস্য নেই।')}
              </div>
            ) : (
              filteredMembers.map((m) => {
                const { cells, total, pct, miss } = rowModel(m);
                return (
                  <div
                    key={m.id}
                    className="group grid h-14 items-center pr-5"
                    style={{ gridTemplateColumns: GRID_COLS, borderBottom: `1px solid ${C.lineRow}` }}
                  >
                    <Link to={`/admin/members/${m.id}`} className="sticky left-0 z-[2] flex min-w-0 items-center gap-2.5 bg-white pl-5 pr-2">
                      <MemberAvatar name={m.full_name} avatarUrl={m.avatar_url} size={34} />
                      <span className="flex min-w-0 flex-col leading-[1.25]">
                        <span className="truncate text-[13.5px] font-bold">{m.full_name}</span>
                        <span className="text-[11px] tracking-[.03em]" style={{ color: C.muted }}>{memberDisplayId(m)}</span>
                      </span>
                    </Link>

                    {cells.map(({ mo, state, cellKey }) => {
                      const busy = busyCells.has(cellKey);
                      const v = cellVisual(state);
                      return (
                        <button
                          key={mo}
                          onClick={() => toggle(m.id, mo)}
                          disabled={busy}
                          title={`${m.full_name} · ${months[mo - 1]} ${year}`}
                          onMouseEnter={(e) => state !== 'due' && state !== 'upcoming' && setTooltip({ key: cellKey, x: e.clientX, y: e.clientY })}
                          onMouseMove={(e) => setTooltip((p) => (p && p.key === cellKey ? { ...p, x: e.clientX, y: e.clientY } : p))}
                          onMouseLeave={() => setTooltip(null)}
                          className="mx-[3px] flex h-[30px] items-center justify-center rounded-lg text-[11px] font-extrabold transition-transform active:scale-95"
                          style={{ ...v.style, boxShadow: mo === focus ? '0 0 0 2px rgba(18,135,79,.14)' : undefined }}
                        >
                          {busy ? <Spinner color={state === 'paid' ? '#fff' : C.accent} /> : v.mark}
                        </button>
                      );
                    })}

                    <span className="text-right text-[13.5px] font-bold tabular-nums">{fmt.money(total)}</span>

                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-[52px] overflow-hidden rounded-full" style={{ background: '#eceeeb' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: miss ? C.warn : C.accent }} />
                      </div>
                      <span className="w-8 text-right text-[11.5px] font-bold tabular-nums" style={{ color: C.sub }}>{fmt.num(pct)}%</span>
                    </div>

                    <RowMenu memberId={m.id} onMarkAllPaid={() => markAllForMember(m)} label={tr} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Mobile: one card per member ── */}
        <div className="md:hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse rounded-2xl p-3.5" style={{ border: `1px solid ${C.lineSoft}` }}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full" style={{ background: C.lineSoft }} />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 rounded" style={{ background: C.lineSoft }} />
                      <div className="h-2 w-16 rounded" style={{ background: C.head }} />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-6 gap-1.5">
                    {Array.from({ length: 12 }).map((__, j) => <div key={j} className="h-9 rounded-lg" style={{ background: C.head }} />)}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] font-medium" style={{ color: C.muted }}>
              {search || filterStatus !== 'all'
                ? tr('No members match your search.', 'কোনো সদস্য খুঁজে পাওয়া যায়নি।')
                : tr('No approved members yet.', 'এখনো কোনো অনুমোদিত সদস্য নেই।')}
            </div>
          ) : (
            <>
              {/* Month total strip */}
              <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ background: C.totalRow, borderBottom: `1px solid ${C.line}` }}>
                <span className="text-[11px] font-extrabold tracking-[.12em]" style={{ color: '#4a5b53' }}>{tr('MONTH TOTAL', 'মাসিক মোট')}</span>
                <span className="flex items-baseline gap-2">
                  <span className="text-[15px] font-extrabold tabular-nums">{fmt.money(stats.collected)}</span>
                  <span className="text-[11.5px] font-bold" style={{ color: C.sub }}>{fmt.num(stats.pct)}%</span>
                </span>
              </div>

              <div className="space-y-3 p-4">
                {filteredMembers.map((m) => {
                  const { cells, total, pct, miss } = rowModel(m);
                  return (
                    <div key={m.id} className="rounded-2xl p-3.5" style={{ border: `1px solid ${C.line}` }}>
                      <div className="flex items-center gap-3">
                        <Link to={`/admin/members/${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                          <MemberAvatar name={m.full_name} avatarUrl={m.avatar_url} size={38} />
                          <span className="flex min-w-0 flex-col leading-tight">
                            <span className="truncate text-[14px] font-bold">{m.full_name}</span>
                            <span className="text-[11px] tracking-[.03em]" style={{ color: C.muted }}>{memberDisplayId(m)}</span>
                          </span>
                        </Link>
                        <span className="shrink-0 text-right">
                          <span className="block text-[14px] font-extrabold tabular-nums">{fmt.money(total)}</span>
                          <span className="block text-[11px] font-bold" style={{ color: miss ? C.warnInk : C.accent }}>{fmt.num(pct)}%</span>
                        </span>
                        <RowMenu memberId={m.id} onMarkAllPaid={() => markAllForMember(m)} label={tr} />
                      </div>

                      <div className="mt-3 grid grid-cols-6 gap-1.5">
                        {cells.map(({ mo, state, cellKey }) => {
                          const busy = busyCells.has(cellKey);
                          const v = cellVisual(state);
                          return (
                            <button
                              key={mo}
                              onClick={() => toggle(m.id, mo)}
                              disabled={busy}
                              aria-label={`${m.full_name} · ${months[mo - 1]} ${year}`}
                              className="flex h-10 flex-col items-center justify-center rounded-lg text-[10px] font-extrabold leading-none transition-transform active:scale-95"
                              style={{ ...v.style, boxShadow: mo === focus ? '0 0 0 2px rgba(18,135,79,.18)' : undefined }}
                            >
                              {busy ? <Spinner color={state === 'paid' ? '#fff' : C.accent} /> : (
                                <>
                                  <span className="opacity-80">{short(mo - 1).toUpperCase()}</span>
                                  <span className="mt-0.5 text-[11px]">{v.mark || '•'}</span>
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: '#eceeeb' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: miss ? C.warn : C.accent }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Card footer */}
        <div
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-3"
          style={{ borderTop: `1px solid ${C.lineSoft}`, background: C.foot }}
        >
          <p className="text-[12px] sm:text-[12.5px]" style={{ color: C.label }}>
            {tr('Tap any cell to toggle payment — future months record advance payments.', 'পেমেন্ট বদলাতে যেকোনো সেলে ট্যাপ করুন — ভবিষ্যতের মাস আগাম হিসেবে গণ্য হবে।')}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRemindersModal(true)}
              disabled={stats.defaulters.length === 0}
              className="h-10 flex-1 whitespace-nowrap rounded-[9px] px-3.5 text-[12.5px] font-bold transition-colors disabled:opacity-40 sm:h-[34px] sm:flex-none"
              style={btnGhost}
            >
              {tr('Send reminders', 'তাগাদা পাঠান')} ({fmt.num(stats.defaulters.length)})
            </button>
            <Link
              to="/admin/donations"
              className="flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-[9px] px-3.5 text-[12.5px] font-bold transition-colors sm:h-[34px] sm:flex-none"
              style={btnGhost}
            >
              {tr('Donation history', 'দানের ইতিহাস')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Recent payments ── */}
      <section className="rounded-2xl bg-white p-4 sm:p-5" style={{ border: `1px solid ${C.line}` }}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-extrabold">{tr('Recent payments', 'সাম্প্রতিক পেমেন্ট')}</h3>
          <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: C.muted }}>{tr('Live', 'সরাসরি')}</span>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-2.5">
                <div className="h-8 w-8 shrink-0 rounded-full" style={{ background: C.lineSoft }} />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-24 rounded" style={{ background: C.lineSoft }} />
                  <div className="h-2 w-16 rounded" style={{ background: C.head }} />
                </div>
              </div>
            ))}
          </div>
        ) : (() => {
          const recent: { member: Member; month: number; amount: number; paidAt: string }[] = [];
          for (const m of members) {
            for (const [mo, c] of Object.entries(grid[m.id] ?? {})) {
              if (c.status === 'paid' && c.paid_at) recent.push({ member: m, month: Number(mo), amount: Number(c.amount), paidAt: c.paid_at });
            }
          }
          recent.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
          const top = recent.slice(0, 5);
          if (top.length === 0) {
            return <p className="py-4 text-center text-[12.5px] font-medium" style={{ color: C.muted }}>{tr('No payments recorded yet.', 'কোনো পেমেন্ট নেই।')}</p>;
          }
          return (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {top.map((p, idx) => (
                <div key={idx} className="flex items-center gap-2.5 rounded-xl p-2.5" style={{ background: C.head }}>
                  <MemberAvatar name={p.member.full_name} avatarUrl={p.member.avatar_url} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-bold">{p.member.full_name}</p>
                    <p className="text-[10.5px] font-semibold" style={{ color: C.muted }}>{months[p.month - 1]} {fmt.num(year)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12.5px] font-extrabold" style={{ color: C.accent }}>{fmt.money(p.amount)}</p>
                    <p className="text-[10px] font-semibold" style={{ color: C.muted }}>{dtAgo(p.paidAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </section>
    </div>
  );
}
