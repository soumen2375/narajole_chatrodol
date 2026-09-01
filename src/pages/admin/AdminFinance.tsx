import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ComponentType, SVGProps } from 'react';
import { FaArrowTrendUp, FaHeart, FaCoins, FaReceipt, FaDownload, FaBuildingColumns, FaWallet } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Sparkline, BarLineChart } from '@/components/ui/charts';
import RecordMoneyButton from '@/components/finance/RecordMoney';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const GREEN = '#4d7c0f';
const RED = '#b91c1c';
const PAPER = '#ffffff';
const CREAM = '#faf6ef';
const EVENT_COLORS = ['#1d4ed8', '#c2410c', '#4d7c0f', '#b45309', '#0f766e', '#78716c'];

type IconType = ComponentType<SVGProps<SVGSVGElement>>;
const FY_MONTH_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];

function currentFiscalYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() + 1 >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}
function fyStartYear(fy: string) { return Number(fy.slice(0, 4)); }
function fyMonthIndex(dateStr: string, sy: number) {
  const d = new Date(dateStr);
  return (d.getFullYear() - sy) * 12 + d.getMonth() - 3; // 0 = April .. 11 = March
}
function inFy(dateStr: string, sy: number) { const i = fyMonthIndex(dateStr, sy); return i >= 0 && i < 12; }

interface EventRow { id: string | null; title: string; date: string | null; income: number; expenses: number; }
interface Txn { at: string; label: string; event: string; amount: number; dir: 'credit' | 'debit'; }
interface AccountBalance { id: string; label: string; type: string; balance: number; }

export default function AdminFinance() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const num = (v: string | number) => fmt.num(v);
  const months = fmt.months();

  const [fy, setFy] = useState(currentFiscalYear());
  // Event-allocation table controls
  const [evYear, setEvYear] = useState('all');
  const [evSort, setEvSort] = useState<'desc' | 'asc'>('desc');
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    income: number; donations: number; contributions: number; expenses: number;
    recurringTotal: number; recurringCount: number;
    bankBalance: number; walletBalance: number; accounts: AccountBalance[];
    mDon: number[]; mCon: number[]; mExp: number[]; mInc: number[];
    events: EventRow[]; txns: Txn[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const sy = fyStartYear(fy);
    Promise.all([
      supabase.from('cswo_donations').select('amount,event_id,created_at,donor_name,is_anonymous,is_recurring,purpose,status'),
      supabase.from('cswo_monthly_contributions').select('amount,paid_at,member_id,status,year'),
      supabase.from('cswo_expenses').select('amount,event_id,spent_on,created_at,vendor,description,status'),
      supabase.from('cswo_events').select('id,title,event_date').order('event_date', { ascending: false }),
      supabase.from('cswo_members').select('id,full_name,status'),
      supabase.from('cswo_bank_accounts').select('id,label,account_type,opening_balance').eq('is_active', true).order('sort_order'),
      supabase.from('cswo_bank_transactions').select('account_id,direction,amount'),
    ]).then(([donR, conR, expR, evR, memR, accR, txnR]) => {
      if (!active) return;
      type D = { amount: number; event_id: string | null; created_at: string; donor_name: string | null; is_anonymous: boolean; is_recurring: boolean; purpose: string | null; status: string };
      type C = { amount: number; paid_at: string | null; member_id: string; status: string; year: number };
      type E = { amount: number; event_id: string | null; spent_on: string; created_at: string; vendor: string; description: string; status: string };
      type A = { id: string; label: string; account_type: string; opening_balance: number };
      type T = { account_id: string; direction: 'credit' | 'debit'; amount: number };

      const donations = ((donR.data ?? []) as D[]).filter((d) => d.status === 'paid');
      const contributions = ((conR.data ?? []) as C[]).filter((c) => c.status === 'paid');
      const expenses = ((expR.data ?? []) as E[]).filter((e) => e.status === 'approved');
      const events = (evR.data ?? []) as { id: string; title: string; event_date: string }[];
      const members = (memR.data ?? []) as { id: string; full_name: string; status: string }[];
      const accounts = (accR.data ?? []) as A[];
      const txns = (txnR.data ?? []) as T[];
      const memberName = new Map(members.map((m) => [m.id, m.full_name]));
      const eventTitle = (id: string | null) => events.find((e) => e.id === id)?.title ?? tr('Not allocated', 'অনির্ধারিত');

      // ── Balances: where the money actually sits, all time ────────────────
      const accBalances: AccountBalance[] = accounts.map((a) => {
        const mine = txns.filter((t) => t.account_id === a.id);
        const cr = mine.filter((t) => t.direction === 'credit').reduce((s, t) => s + Number(t.amount), 0);
        const db = mine.filter((t) => t.direction === 'debit').reduce((s, t) => s + Number(t.amount), 0);
        return { id: a.id, label: a.label, type: a.account_type, balance: Number(a.opening_balance) + cr - db };
      });
      const bankBalance = accBalances.filter((a) => a.type !== 'cash').reduce((s, a) => s + a.balance, 0);
      const walletBalance = accBalances.filter((a) => a.type === 'cash').reduce((s, a) => s + a.balance, 0);

      // ── FY-scoped activity ───────────────────────────────────────────────
      const donFy = donations.filter((d) => inFy(d.created_at, sy));
      const conFy = contributions.filter((c) => c.paid_at && inFy(c.paid_at, sy));
      const expFy = expenses.filter((e) => inFy(e.spent_on || e.created_at, sy));

      const tDon = donFy.reduce((s, d) => s + Number(d.amount), 0);
      const tCon = conFy.reduce((s, c) => s + Number(c.amount), 0);
      const tExp = expFy.reduce((s, e) => s + Number(e.amount), 0);
      const recurring = donFy.filter((d) => d.is_recurring);

      const mDon = Array(12).fill(0); const mCon = Array(12).fill(0); const mExp = Array(12).fill(0);
      donFy.forEach((d) => { mDon[fyMonthIndex(d.created_at, sy)] += Number(d.amount); });
      conFy.forEach((c) => { if (c.paid_at) mCon[fyMonthIndex(c.paid_at, sy)] += Number(c.amount); });
      expFy.forEach((e) => { mExp[fyMonthIndex(e.spent_on || e.created_at, sy)] += Number(e.amount); });
      const mInc = mDon.map((v, i) => v + mCon[i]);

      // ── Event allocation: only events that actually moved money ──────────
      const ids = new Set<string | null>();
      donFy.forEach((d) => ids.add(d.event_id));
      expFy.forEach((e) => ids.add(e.event_id));
      const eventRows: EventRow[] = [...ids].map((id) => ({
        id,
        title: eventTitle(id),
        date: events.find((e) => e.id === id)?.event_date ?? null,
        income: donFy.filter((d) => d.event_id === id).reduce((s, d) => s + Number(d.amount), 0),
        expenses: expFy.filter((e) => e.event_id === id).reduce((s, e) => s + Number(e.amount), 0),
      })).sort((a, b) => (b.income + b.expenses) - (a.income + a.expenses));

      const latest: Txn[] = [
        ...donations.map<Txn>((d) => ({ at: d.created_at, label: (d.is_anonymous ? tr('Anonymous', 'নাম গোপন') : d.donor_name || tr('Donation', 'অনুদান')) + (d.is_recurring ? ' · ' + tr('monthly', 'মাসিক') : '') + ' — ' + (d.purpose || tr('Donation', 'অনুদান')), event: eventTitle(d.event_id), amount: Number(d.amount), dir: 'credit' })),
        ...contributions.map<Txn>((c) => ({ at: c.paid_at || '', label: (memberName.get(c.member_id) || tr('Member', 'সদস্য')) + ' — ' + tr('monthly donation', 'মাসিক অনুদান'), event: tr('Not allocated', 'অনির্ধারিত'), amount: Number(c.amount), dir: 'credit' })),
        ...expenses.map<Txn>((e) => ({ at: e.created_at || e.spent_on, label: (e.vendor || e.description || tr('Expense', 'ব্যয়')), event: eventTitle(e.event_id), amount: Number(e.amount), dir: 'debit' })),
      ].filter((t) => t.at).sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 10);

      setData({
        income: tDon + tCon, donations: tDon, contributions: tCon, expenses: tExp,
        recurringTotal: recurring.reduce((s, d) => s + Number(d.amount), 0), recurringCount: recurring.length,
        bankBalance, walletBalance, accounts: accBalances,
        mDon, mCon, mExp, mInc, events: eventRows, txns: latest,
      });
      setLoading(false);
    });
    return () => { active = false; };
  }, [fy, lang, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const net = data ? data.income - data.expenses : 0;
  const expenseRatio = data && data.income > 0 ? Math.round((data.expenses / data.income) * 100) : 0;
  const savingsRate = data && data.income > 0 ? Math.round((net / data.income) * 100) : 0;
  const totalHeld = data ? data.bankBalance + data.walletBalance : 0;

  // Years present in the allocation rows, so the filter never offers a dead year.
  const evYears = useMemo(
    () => [...new Set((data?.events ?? []).map((r) => r.date?.slice(0, 4)).filter(Boolean) as string[])].sort((a, b) => b.localeCompare(a)),
    [data],
  );
  const eventRows = useMemo(() => {
    const rows = (data?.events ?? []).filter((r) => evYear === 'all' || r.date?.startsWith(evYear));
    const total = (r: EventRow) => r.income + r.expenses;
    return [...rows].sort((a, b) => (evSort === 'desc' ? total(b) - total(a) : total(a) - total(b)));
  }, [data, evYear, evSort]);

  const best = useMemo(() => {
    if (!data) return { inc: { i: 0, v: 0 }, exp: { i: 0, v: 0 }, avg: 0 };
    const incI = data.mInc.reduce((b, v, i, a) => (v > a[b] ? i : b), 0);
    const expI = data.mExp.reduce((b, v, i, a) => (v > a[b] ? i : b), 0);
    return { inc: { i: incI, v: data.mInc[incI] }, exp: { i: expI, v: data.mExp[expI] }, avg: Math.round(data.income / 12) };
  }, [data]);

  const moneyShort = (n: number) => (Math.abs(n) >= 100000 ? `₹${num((n / 100000).toFixed(2))} ${tr('Lakh', 'লক্ষ')}` : fmt.money(n));
  const pad = (n: number) => String(n).padStart(2, '0');
  const dtFull = (s: string) => { const d = new Date(s); return `${fmt.date(s)} · ${num(pad(d.getHours()))}:${num(pad(d.getMinutes()))}`; };
  const fyMonthLabel = (idx: number) => months[FY_MONTH_ORDER[idx]].slice(0, 3);

  const exportCSV = () => {
    if (!data) return;
    const header = [tr('Event', 'অনুষ্ঠান'), tr('Income', 'আয়'), tr('Expenses', 'ব্যয়'), tr('Balance', 'ব্যালেন্স')];
    const body = eventRows.map((r) => [r.title, r.income, r.expenses, r.income - r.expenses]);
    const totals = [tr('TOTAL', 'মোট'), data.income, data.expenses, net];
    const csv = [header, ...body, totals].map((row) => row.map((c) => `"${c}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cswo-finance-${fy}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const fyList = [currentFiscalYear(), `${fyStartYear(currentFiscalYear()) - 1}-${String(fyStartYear(currentFiscalYear())).slice(-2)}`];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Financial report', 'আর্থিক প্রতিবেদন')} · FY {num(fy)}</div>
          <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
            {tr('Finance Summary', 'আর্থিক সারসংক্ষেপ')} <span style={{ color: MUTED }}>· The Quarterly Ledger</span>
          </h1>
          <p className="mt-1 max-w-2xl text-[13.5px]" style={{ color: INK2 }}>{tr('What the trust holds right now, and everything that moved this year.', 'এই মুহূর্তে হাতে কত আছে, আর এই বছরে কী কী নড়াচড়া হয়েছে।')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <RecordMoneyButton onSaved={() => setTick((t) => t + 1)} />
          <select value={fy} onChange={(e) => setFy(e.target.value)} className="rounded-full px-3.5 py-2 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
            {fyList.map((y) => <option key={y} value={y}>FY {y}</option>)}
          </select>
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
            <FaDownload className="h-3 w-3" /> {tr('Export CSV', 'CSV এক্সপোর্ট')}
          </button>
        </div>
      </div>

      {loading || !data ? <TableSkeleton rows={8} /> : (
        <>
          {/* ── Where the money is, right now ────────────────────────────── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <BalanceCard
              icon={FaBuildingColumns}
              eyebrow={tr('Bank balance', 'ব্যাংক ব্যালেন্স')}
              value={moneyShort(data.bankBalance)}
              sub={tr('Online — gateway, UPI, transfers', 'অনলাইন — গেটওয়ে, ইউপিআই, ট্রান্সফার')}
              accent="#1d4ed8"
              bg="linear-gradient(158deg,#eef4ff 0%,#ffffff 62%)"
              border="#d3ddf2"
              rows={data.accounts.filter((a) => a.type !== 'cash').map((a) => ({ label: a.label, value: fmt.money(a.balance) }))}
              empty={tr('No bank accounts yet.', 'কোনো ব্যাংক অ্যাকাউন্ট নেই।')}
            />
            <BalanceCard
              icon={FaWallet}
              eyebrow={tr('Wallet balance', 'ওয়ালেট ব্যালেন্স')}
              value={moneyShort(data.walletBalance)}
              sub={tr('Offline cash in hand', 'হাতে থাকা নগদ')}
              accent={GREEN}
              bg="linear-gradient(158deg,#ecfaf3 0%,#ffffff 62%)"
              border="#c8e7d8"
              rows={data.accounts.filter((a) => a.type === 'cash').map((a) => ({ label: a.label, value: fmt.money(a.balance) }))}
              empty={tr('No cash wallet yet.', 'কোনো নগদ ওয়ালেট নেই।')}
            />
            <div className="rounded-[8px] p-5" style={{ background: INK, color: CREAM }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: '#a8a29e' }}>{tr('Total held', 'সর্বমোট')}</div>
              <div className="mt-2 text-[34px] font-bold leading-none">{moneyShort(totalHeld)}</div>
              <p className="mt-2 text-[12.5px]" style={{ color: '#d6d3d1' }}>
                {tr('Bank + wallet, all time. This is money the trust can actually spend.', 'ব্যাংক + ওয়ালেট, সর্বকাল। এটাই প্রকৃত খরচযোগ্য অর্থ।')}
              </p>
              <div className="mt-4 space-y-1.5 border-t pt-3" style={{ borderColor: '#44403c' }}>
                <DarkRow label={tr('This year’s income', 'এ বছরের আয়')} value={moneyShort(data.income)} />
                <DarkRow label={tr('This year’s spend', 'এ বছরের ব্যয়')} value={moneyShort(data.expenses)} />
                <DarkRow label={tr('Net this year', 'এ বছরের নিট')} value={moneyShort(net)} strong />
              </div>
            </div>
          </div>

          {/* ── This year's activity ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard icon={FaArrowTrendUp} eyebrow={tr('Total income', 'মোট আয়')} value={moneyShort(data.income)} sub={tr('Donations + monthly', 'অনুদান + মাসিক')} spark={data.mInc} color={GREEN} />
            <StatCard icon={FaHeart} eyebrow={tr('Donations', 'অনুদান')} value={moneyShort(data.donations)} sub={tr('From donors', 'দাতাদের থেকে')} spark={data.mDon} color={BRAND} />
            <StatCard icon={FaCoins} eyebrow={tr('Monthly donation', 'মাসিক অনুদান')} value={moneyShort(data.contributions)} sub={tr('From members', 'সদস্যদের থেকে')} spark={data.mCon} color="#1d4ed8" />
            <StatCard icon={FaReceipt} eyebrow={tr('Expenses', 'ব্যয়')} value={moneyShort(data.expenses)} sub={tr('All categories', 'সব খাতে')} spark={data.mExp} color="#9a3412" />
          </div>

          {/* Income vs Expense chart */}
          <div className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Income vs Expense', 'আয় বনাম ব্যয়')} · FY {num(fy)}</div>
                <h3 className="mt-1.5 text-[18px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Monthly cash flow', 'মাসিক নগদ প্রবাহ')}</h3>
              </div>
              <div className="flex items-center gap-3">
                <Legend color={GREEN} label={tr('Income', 'আয়')} /><Legend color={BRAND} label={tr('Expense', 'ব্যয়')} />
              </div>
            </div>
            <div className="mt-4">
              <BarLineChart bars={data.mInc} line={data.mExp} barColor={GREEN} lineColor={BRAND} className="h-52 w-full" />
              <div className="mt-1 flex justify-between font-mono text-[9px]" style={{ color: MUTED }}>
                {data.mInc.map((_, i) => <span key={i}>{fyMonthLabel(i)}</span>)}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4" style={{ borderColor: RULE }}>
              <Summary eyebrow={tr(`Best · ${fyMonthLabel(best.inc.i)}`, `সেরা · ${fyMonthLabel(best.inc.i)}`)} value={moneyShort(best.inc.v)} />
              <Summary eyebrow={tr(`Top spend · ${fyMonthLabel(best.exp.i)}`, `সর্বোচ্চ ব্যয় · ${fyMonthLabel(best.exp.i)}`)} value={moneyShort(best.exp.v)} />
              <Summary eyebrow={tr('Avg income / mo', 'গড় আয় / মাস')} value={moneyShort(best.avg)} />
              <Summary eyebrow={tr('Savings rate', 'সঞ্চয় হার')} value={`${num(savingsRate)}%`} />
            </div>
            <div className="mt-4 border-t pt-4" style={{ borderColor: RULE }}>
              <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}><span>{tr('Expense ratio', 'ব্যয়ের অনুপাত')}</span><span>{num(expenseRatio)}%</span></div>
              <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: CREAM }}>
                <div style={{ width: `${Math.min(100, expenseRatio)}%`, background: BRAND }} />
                <div style={{ width: `${Math.max(0, 100 - expenseRatio)}%`, background: GREEN }} />
              </div>
            </div>
          </div>

          {/* ── Event allocation ─────────────────────────────────────────── */}
          <div className="rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
            <div className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Event allocation', 'অনুষ্ঠান-ভিত্তিক বরাদ্দ')}</div>
              <h3 className="mt-1.5 text-[18px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Income & expense by event', 'অনুষ্ঠান অনুসারে আয় ও ব্যয়')}</h3>
              <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>{tr('Change an allocation on the Ledger page.', 'বরাদ্দ বদলাতে লেজার পাতায় যান।')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={evYear}
                  onChange={(e) => setEvYear(e.target.value)}
                  className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold outline-none"
                  style={{ border: `1px solid ${RULE}`, color: INK2, background: PAPER }}
                >
                  <option value="all">{tr('All years', 'সব বছর')}</option>
                  {evYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
                <select
                  value={evSort}
                  onChange={(e) => setEvSort(e.target.value as 'desc' | 'asc')}
                  className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold outline-none"
                  style={{ border: `1px solid ${RULE}`, color: INK2, background: PAPER }}
                >
                  <option value="desc">{tr('Highest first', 'বেশি আগে')}</option>
                  <option value="asc">{tr('Lowest first', 'কম আগে')}</option>
                </select>
              </div>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-[13px]">
                <thead><tr style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
                  {[tr('Event', 'অনুষ্ঠান'), tr('Income', 'আয়'), tr('Expenses', 'ব্যয়'), tr('Balance', 'ব্যালেন্স')].map((h, i) => (
                    <th key={i} className={`px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${i === 0 ? 'text-left' : 'text-right'}`} style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {eventRows.map((r, i) => {
                    const bal = r.income - r.expenses;
                    return (
                      <tr key={r.id ?? 'none'} style={{ borderBottom: `1px solid ${RULE}` }}>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.id ? EVENT_COLORS[i % EVENT_COLORS.length] : '#a8a29e' }} />
                            <span style={{ color: r.id ? INK : INK2 }}>{r.title}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right" style={{ color: GREEN }}>{fmt.money(r.income)}</td>
                        <td className="px-5 py-3 text-right" style={{ color: BRAND }}>{fmt.money(r.expenses)}</td>
                        <td className="px-5 py-3 text-right font-semibold" style={{ color: bal >= 0 ? GREEN : BRAND }}>{fmt.money(bal)}</td>
                      </tr>
                    );
                  })}
                  {data.contributions > 0 && (
                    <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#1d4ed8' }} />
                          <span style={{ color: INK }}>{tr('Monthly Donation', 'মাসিক অনুদান')}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right" style={{ color: GREEN }}>{fmt.money(data.contributions)}</td>
                      <td className="px-5 py-3 text-right" style={{ color: MUTED }}>—</td>
                      <td className="px-5 py-3 text-right font-semibold" style={{ color: GREEN }}>{fmt.money(data.contributions)}</td>
                    </tr>
                  )}
                  {eventRows.length === 0 && data.contributions === 0 && (
                    <tr><td colSpan={4} className="px-5 py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('Nothing recorded this year yet.', 'এ বছরে এখনো কিছু রেকর্ড হয়নি।')}</td></tr>
                  )}
                  <tr style={{ background: INK }}>
                    <td className="px-5 py-3 font-semibold" style={{ color: CREAM }}>{tr('Total', 'সর্বমোট')}</td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: '#86efac' }}>{fmt.money(data.income)}</td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: '#fca47e' }}>{fmt.money(data.expenses)}</td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: CREAM }}>{fmt.money(net)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-[11px]" style={{ color: MUTED }}>* {tr('Monthly donation is org-wide and is not allocated to any single event.', 'মাসিক অনুদান সংস্থার সাধারণ তহবিল — কোনো নির্দিষ্ট অনুষ্ঠানে বরাদ্দ নয়।')}</p>
          </div>

          {/* Latest transactions */}
          <div className="rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Latest transactions', 'সাম্প্রতিক লেনদেন')}</div>
                <h3 className="mt-1.5 text-[18px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Last 10 movements', 'শেষ ১০টি লেনদেন')}</h3>
              </div>
              <Link
                to="/admin/ledger"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors hover:bg-black/[0.03]"
                style={{ border: `1px solid ${RULE}`, color: INK2 }}
              >
                {tr('View all', 'সব দেখুন')} <span aria-hidden="true">→</span>
              </Link>
            </div>
            {data.txns.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px]" style={{ color: MUTED }}>{tr('No transactions yet.', 'এখনো কোনো লেনদেন নেই।')}</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[680px] text-[13px]">
                  <thead><tr style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
                    {[tr('Date & time', 'তারিখ ও সময়'), tr('Description', 'বিবরণ'), tr('Event', 'অনুষ্ঠান'), tr('Amount', 'পরিমাণ')].map((h, i) => (
                      <th key={i} className={`px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${i === 3 ? 'text-right' : 'text-left'}`} style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.txns.map((tx, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${RULE}` }}>
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px]" style={{ color: MUTED }}>{dtFull(tx.at)}</td>
                        <td className="px-5 py-3" style={{ color: INK }}>{tx.label}</td>
                        <td className="px-5 py-3" style={{ color: INK2 }}>{tx.event}</td>
                        <td className="px-5 py-3 text-right font-semibold" style={{ color: tx.dir === 'credit' ? GREEN : RED }}>{fmt.money(tx.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BalanceCard({
  icon: Icon, eyebrow, value, sub, accent, bg, border, rows, empty,
}: {
  icon: IconType; eyebrow: string; value: string; sub: string;
  accent: string; bg: string; border: string;
  rows: { label: string; value: string }[]; empty: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[8px] p-5" style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="absolute bottom-0 left-0 top-0 w-[3px]" style={{ background: accent }} />
      <div className="flex items-start justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: accent }}>{eyebrow}</div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: PAPER }}>
          <Icon className="h-3.5 w-3.5" style={{ color: accent }} />
        </span>
      </div>
      <div className="mt-2 text-[34px] font-bold leading-none" style={{ color: accent }}>{value}</div>
      <div className="mt-1.5 text-[12px]" style={{ color: MUTED }}>{sub}</div>
      <div className="mt-3 space-y-1 border-t pt-2.5" style={{ borderColor: border }}>
        {rows.length === 0
          ? <div className="text-[12px]" style={{ color: MUTED }}>{empty}</div>
          : rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-[12.5px]">
              <span style={{ color: MUTED }}>{r.label}</span>
              <span className="font-medium" style={{ color: INK }}>{r.value}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function DarkRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px]" style={{ color: '#a8a29e' }}>{label}</span>
      <span style={{ color: CREAM, fontSize: strong ? 15 : 13, fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  );
}

function StatCard({ icon: Icon, eyebrow, value, sub, spark, color }: { icon: IconType; eyebrow: string; value: string; sub: string; spark: number[]; color: string }) {
  return (
    <div className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="flex items-start justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{eyebrow}</div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(194,65,12,0.08)' }}><Icon className="h-3.5 w-3.5" style={{ color: BRAND }} /></span>
      </div>
      <div className="mt-3 text-[28px] font-bold leading-none" style={{ color: INK }}>{value}</div>
      <div className="mt-1.5 text-[12px]" style={{ color: MUTED }}>{sub}</div>
      <div className="mt-3"><Sparkline data={spark} color={color} className="h-8 w-full" /></div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: MUTED }}><span className="h-2 w-2 rounded-sm" style={{ background: color }} /> {label}</span>;
}

function Summary({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{eyebrow}</div>
      <div className="mt-1 text-[16px] font-bold" style={{ color: INK }}>{value}</div>
    </div>
  );
}
