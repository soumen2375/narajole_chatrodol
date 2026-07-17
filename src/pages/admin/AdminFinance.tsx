import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { FaArrowTrendUp, FaHeart, FaCoins, FaReceipt, FaDownload } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import type { CswoBudget, CswoFund } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Sparkline, BarLineChart } from '@/components/ui/charts';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const GREEN = '#4d7c0f';
const PAPER = '#ffffff';
const CREAM = '#faf6ef';
const FUND_COLORS = ['#1d4ed8', '#c2410c', '#4d7c0f', '#b45309', '#0f766e', '#78716c'];

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

interface FundRow { fund: CswoFund; donations: number; expenses: number; budget: number | null; }
interface Txn { at: string; label: string; fund: string; amount: number; dir: 'credit' | 'debit'; }

export default function AdminFinance() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const num = (v: string | number) => fmt.num(v);
  const months = fmt.months();

  const [fy, setFy] = useState(currentFiscalYear());
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    income: number; donations: number; contributions: number; expenses: number;
    recurringTotal: number; recurringCount: number; outstanding: number;
    mDon: number[]; mCon: number[]; mExp: number[]; mInc: number[];
    funds: FundRow[]; txns: Txn[]; unassignedDon: number; unassignedExp: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const sy = fyStartYear(fy);
    Promise.all([
      supabase.from('cswo_donations').select('amount,fund_id,created_at,donor_name,is_anonymous,is_recurring,purpose,status'),
      supabase.from('cswo_monthly_contributions').select('amount,paid_at,member_id,status,year'),
      supabase.from('cswo_expenses').select('amount,fund_id,spent_on,created_at,vendor,description,status'),
      supabase.from('cswo_funds').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('cswo_budgets').select('*').eq('fiscal_year', fy),
      supabase.from('cswo_members').select('id,full_name,status'),
    ]).then(([donR, conR, expR, fundR, budR, memR]) => {
      if (!active) return;
      type D = { amount: number; fund_id: string | null; created_at: string; donor_name: string | null; is_anonymous: boolean; is_recurring: boolean; purpose: string | null; status: string };
      type C = { amount: number; paid_at: string | null; member_id: string; status: string; year: number };
      type E = { amount: number; fund_id: string | null; spent_on: string; created_at: string; vendor: string; description: string; status: string };

      const donations = ((donR.data ?? []) as D[]).filter((d) => d.status === 'paid');
      const contributions = ((conR.data ?? []) as C[]).filter((c) => c.status === 'paid');
      const expenses = ((expR.data ?? []) as E[]).filter((e) => e.status === 'approved');
      const funds = (fundR.data ?? []) as CswoFund[];
      const budgets = (budR.data ?? []) as CswoBudget[];
      const members = (memR.data ?? []) as { id: string; full_name: string; status: string }[];
      const memberName = new Map(members.map((m) => [m.id, m.full_name]));
      const fundName = (id: string | null) => { const f = funds.find((x) => x.id === id); return f ? (lang === 'bn' ? f.name_bn : f.name_en) : tr('General', 'সাধারণ'); };

      // FY-scoped slices
      const donFy = donations.filter((d) => inFy(d.created_at, sy));
      const conFy = contributions.filter((c) => c.paid_at && inFy(c.paid_at, sy));
      const expFy = expenses.filter((e) => inFy(e.spent_on || e.created_at, sy));

      const tDon = donFy.reduce((s, d) => s + Number(d.amount), 0);
      const tCon = conFy.reduce((s, c) => s + Number(c.amount), 0);
      const tExp = expFy.reduce((s, e) => s + Number(e.amount), 0);
      const recurring = donFy.filter((d) => d.is_recurring);

      // outstanding dues (estimate): approved members × elapsed months − paid (current FY only)
      const approved = members.filter((m) => m.status === 'approved').length;
      const elapsed = Math.min(12, Math.max(0, fyMonthIndex(new Date().toISOString(), sy) + 1));
      const outstanding = fy === currentFiscalYear() ? Math.max(0, approved * elapsed * 100 - tCon) : 0;

      // monthly buckets (FY order Apr..Mar)
      const mDon = Array(12).fill(0); const mCon = Array(12).fill(0); const mExp = Array(12).fill(0);
      donFy.forEach((d) => { mDon[fyMonthIndex(d.created_at, sy)] += Number(d.amount); });
      conFy.forEach((c) => { if (c.paid_at) mCon[fyMonthIndex(c.paid_at, sy)] += Number(c.amount); });
      expFy.forEach((e) => { mExp[fyMonthIndex(e.spent_on || e.created_at, sy)] += Number(e.amount); });
      const mInc = mDon.map((v, i) => v + mCon[i]);

      const fundRows: FundRow[] = funds.map((f) => ({
        fund: f,
        donations: donFy.filter((d) => d.fund_id === f.id).reduce((s, d) => s + Number(d.amount), 0),
        expenses: expFy.filter((e) => e.fund_id === f.id).reduce((s, e) => s + Number(e.amount), 0),
        budget: (() => { const b = budgets.find((x) => x.fund_id === f.id); return b ? Number(b.allocated_amount) : null; })(),
      }));

      // latest transactions (recent overall, full timestamps)
      const txns: Txn[] = [
        ...donations.map<Txn>((d) => ({ at: d.created_at, label: (d.is_anonymous ? tr('Anonymous', 'নাম গোপন') : d.donor_name || tr('Donation', 'অনুদান')) + (d.is_recurring ? ' · ' + tr('monthly', 'মাসিক') : '') + ' — ' + (d.purpose || tr('Donation', 'অনুদান')), fund: fundName(d.fund_id), amount: Number(d.amount), dir: 'credit' })),
        ...contributions.map<Txn>((c) => ({ at: c.paid_at || '', label: (memberName.get(c.member_id) || tr('Member', 'সদস্য')) + ' — ' + tr('monthly dues', 'মাসিক চাঁদা'), fund: tr('General', 'সাধারণ'), amount: Number(c.amount), dir: 'credit' })),
        ...expenses.map<Txn>((e) => ({ at: e.created_at || e.spent_on, label: (e.vendor || e.description || tr('Expense', 'ব্যয়')), fund: fundName(e.fund_id), amount: Number(e.amount), dir: 'debit' })),
      ].filter((t) => t.at).sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 10);

      const activeIds = new Set(funds.map((f) => f.id));
      const unassignedDon = donFy.filter((d) => !d.fund_id || !activeIds.has(d.fund_id)).reduce((s, d) => s + Number(d.amount), 0);
      const unassignedExp = expFy.filter((e) => !e.fund_id || !activeIds.has(e.fund_id)).reduce((s, e) => s + Number(e.amount), 0);

      setData({
        income: tDon + tCon, donations: tDon, contributions: tCon, expenses: tExp,
        recurringTotal: recurring.reduce((s, d) => s + Number(d.amount), 0), recurringCount: recurring.length,
        outstanding, mDon, mCon, mExp, mInc, funds: fundRows, txns, unassignedDon, unassignedExp,
      });
      setLoading(false);
    });
    return () => { active = false; };
  }, [fy, lang, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const net = data ? data.income - data.expenses : 0;
  const expenseRatio = data && data.income > 0 ? Math.round((data.expenses / data.income) * 100) : 0;
  const savingsRate = data && data.income > 0 ? Math.round((net / data.income) * 100) : 0;
  const restrictedDon = data ? data.funds.filter((r) => r.fund.is_restricted).reduce((s, r) => s + r.donations, 0) : 0;
  const unrestrictedDon = data ? data.funds.filter((r) => !r.fund.is_restricted).reduce((s, r) => s + r.donations, 0) : 0;

  const toggleFund = async (fund: CswoFund, field: 'is_restricted' | 'is_frozen') => {
    await supabase.from('cswo_funds').update({ [field]: !fund[field] }).eq('id', fund.id);
    setTick((t) => t + 1);
  };

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
    const header = [tr('Fund', 'ফান্ড'), tr('Donations', 'দান'), tr('Expenses', 'ব্যয়'), tr('Budget', 'বাজেট'), tr('Balance', 'ব্যালেন্স')];
    const body = data.funds.map((r) => [lang === 'bn' ? r.fund.name_bn : r.fund.name_en, r.donations, r.expenses, r.budget ?? '', r.donations - r.expenses]);
    const totals = [tr('TOTAL', 'মোট'), data.donations, data.expenses, '', net];
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
          <p className="mt-1 max-w-2xl text-[13.5px]" style={{ color: INK2 }}>{tr('A complete picture of the trust’s finances — income, expenses and per-fund balances.', 'আর্থিক স্বাস্থের পূর্ণাঙ্গ চিত্র — আয়, ব্যয় ও ফান্ড ব্যালেন্স।')}</p>
        </div>
        <div className="flex items-center gap-2.5">
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
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard icon={FaArrowTrendUp} eyebrow={tr('Total income', 'মোট আয়')} value={moneyShort(data.income)} sub={tr('Donations + Contributions', 'অনুদান + চাঁদা')} spark={data.mInc} color={GREEN} />
            <StatCard icon={FaHeart} eyebrow={tr('Donations', 'অনুদান')} value={moneyShort(data.donations)} sub={tr('From donors', 'দাতাদের থেকে')} spark={data.mDon} color={BRAND} />
            <StatCard icon={FaCoins} eyebrow={tr('Contributions', 'চাঁদা')} value={moneyShort(data.contributions)} sub={tr('From members', 'সদস্যদের থেকে')} spark={data.mCon} color="#1d4ed8" />
            <StatCard icon={FaReceipt} eyebrow={tr('Expenses', 'ব্যয়')} value={moneyShort(data.expenses)} sub={tr('All categories', 'সব খাতে')} spark={data.mExp} color="#9a3412" />
          </div>

          {/* Net balance + cash position */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-[8px] p-6 lg:col-span-2" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Net balance', 'নিট ব্যালেন্স')}</div>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-[40px] font-bold leading-none" style={{ color: net >= 0 ? GREEN : BRAND }}>{moneyShort(net)}</span>
                <span className="mb-1.5 font-mono text-[11px] font-semibold" style={{ color: savingsRate >= 0 ? GREEN : BRAND }}>{tr('savings', 'সঞ্চয়')} {num(savingsRate)}%</span>
              </div>
              <p className="mt-2 text-[13px]" style={{ color: INK2 }}>{tr(`Of ₹${num(data.income)} income, ₹${num(data.expenses)} spent; ₹${num(net)} retained.`, `মোট ₹${num(data.income)} আয়ের মধ্যে ₹${num(data.expenses)} ব্যয়; অবশিষ্ট ₹${num(net)}।`)}</p>
              <div className="mt-4">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}><span>{tr('Expense ratio', 'ব্যয়ের অনুপাত')}</span><span>{num(expenseRatio)}%</span></div>
                <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: CREAM }}>
                  <div style={{ width: `${Math.min(100, expenseRatio)}%`, background: BRAND }} />
                  <div style={{ width: `${Math.max(0, 100 - expenseRatio)}%`, background: GREEN }} />
                </div>
              </div>
            </div>
            <div className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Cash position', 'বর্তমান অবস্থা')}</div>
              <div className="mt-3 space-y-2.5">
                <CashRow label={tr('Funds in hand', 'হাতে থাকা তহবিল')} value={moneyShort(net)} strong />
                <CashRow label={tr('Outstanding dues (est.)', 'বকেয়া চাঁদা (আনু.)')} value={moneyShort(data.outstanding)} />
                <CashRow label={tr('Recurring donors', 'মাসিক দাতা')} value={num(data.recurringCount)} />
                <div className="mt-1 border-t pt-2.5" style={{ borderColor: RULE }}>
                  <CashRow label={tr('Projected total', 'সম্ভাব্য মোট')} value={moneyShort(net + data.outstanding)} strong accent />
                </div>
              </div>
            </div>
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
          </div>

          {/* Per-fund breakdown */}
          <div className="rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
            <div className="px-5 pt-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Per-fund breakdown', 'ফান্ড অনুযায়ী বিশ্লেষণ')}</div>
              <h3 className="mt-1.5 text-[18px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('By designated fund', 'তহবিল অনুসারে')}</h3>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
                  {[tr('Fund', 'ফান্ড'), tr('Donations', 'দান'), tr('Expenses', 'ব্যয়'), tr('Budget', 'বাজেট'), tr('Balance', 'ব্যালেন্স'), tr('Usage', 'ব্যবহার')].map((h, i) => (
                    <th key={i} className={`px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${i === 0 ? 'text-left' : 'text-right'}`} style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {data.funds.map((r, i) => {
                    const bal = r.donations - r.expenses;
                    const usage = r.budget && r.budget > 0
                      ? Math.min(100, Math.round((r.expenses / r.budget) * 100))
                      : r.donations > 0 ? Math.min(100, Math.round((r.expenses / r.donations) * 100)) : 0;
                    return (
                      <tr key={r.fund.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: FUND_COLORS[i % FUND_COLORS.length] }} /><span style={{ color: INK }}>{lang === 'bn' ? r.fund.name_bn : r.fund.name_en}</span></span>
                        </td>
                        <td className="px-5 py-3 text-right" style={{ color: GREEN }}>{fmt.money(r.donations)}</td>
                        <td className="px-5 py-3 text-right" style={{ color: BRAND }}>{fmt.money(r.expenses)}</td>
                        <td className="px-5 py-3 text-right" style={{ color: MUTED }}>{r.budget != null ? fmt.money(r.budget) : '—'}</td>
                        <td className="px-5 py-3 text-right font-semibold" style={{ color: bal >= 0 ? GREEN : BRAND }}>{fmt.money(bal)}</td>
                        <td className="px-5 py-3">
                          <div className="ml-auto h-1.5 w-24 overflow-hidden rounded-full" style={{ background: CREAM }}><div className="h-full rounded-full" style={{ width: `${usage}%`, background: usage > 80 ? BRAND : GREEN }} /></div>
                          <div className="mt-1 text-right font-mono text-[9px]" style={{ color: MUTED }}>{num(usage)}%</div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Monthly Donation Row */}
                  <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#1d4ed8' }} />
                        <span style={{ color: INK }}>{tr('Monthly Donation', 'মাসিক অনুদান')}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right" style={{ color: GREEN }}>{fmt.money(data.contributions)}</td>
                    <td className="px-5 py-3 text-right" style={{ color: MUTED }}>—</td>
                    <td className="px-5 py-3 text-right" style={{ color: MUTED }}>—</td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: GREEN }}>{fmt.money(data.contributions)}</td>
                    <td className="px-5 py-3" />
                  </tr>
                  {(data.unassignedDon > 0 || data.unassignedExp > 0) && (
                    <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                      <td className="px-5 py-3"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: '#a8a29e' }} /><span style={{ color: INK2 }}>{tr('Unassigned / General', 'অনির্ধারিত / সাধারণ')}</span></span></td>
                      <td className="px-5 py-3 text-right" style={{ color: GREEN }}>{fmt.money(data.unassignedDon)}</td>
                      <td className="px-5 py-3 text-right" style={{ color: BRAND }}>{fmt.money(data.unassignedExp)}</td>
                      <td className="px-5 py-3 text-right" style={{ color: MUTED }}>—</td>
                      <td className="px-5 py-3 text-right font-semibold" style={{ color: (data.unassignedDon - data.unassignedExp) >= 0 ? GREEN : BRAND }}>{fmt.money(data.unassignedDon - data.unassignedExp)}</td>
                      <td className="px-5 py-3" />
                    </tr>
                  )}
                  <tr style={{ background: INK }}>
                    <td className="px-5 py-3 font-semibold" style={{ color: CREAM }}>{tr('Total', 'সর্বমোট')}</td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: '#86efac' }}>{fmt.money(data.income)}</td>
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: '#fca47e' }}>{fmt.money(data.expenses)}</td>
                    <td className="px-5 py-3" />
                    <td className="px-5 py-3 text-right font-semibold" style={{ color: CREAM }}>{fmt.money(net)}</td>
                    <td className="px-5 py-3" />
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-[11px]" style={{ color: MUTED }}>* {tr('Monthly Donation is unrestricted and counted in Net Balance.', 'মাসিক অনুদান নির্দিষ্ট ফান্ডের আওতাভুক্ত নয় এবং নিট ব্যালেন্সে যুক্ত করা হয়েছে।')}</p>
          </div>

          {/* Fund controls + restricted split */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-[8px] p-5 lg:col-span-2" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Fund controls', 'ফান্ড নিয়ন্ত্রণ')}</div>
              <h3 className="mt-1.5 text-[18px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Restrict or freeze funds', 'ফান্ড সীমাবদ্ধ বা স্থগিত করুন')}</h3>
              <div className="mt-3">
                {data.funds.map((r) => (
                  <div key={r.fund.id} className="flex items-center justify-between py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                    <span className="text-[13.5px]" style={{ color: INK }}>{lang === 'bn' ? r.fund.name_bn : r.fund.name_en}</span>
                    <div className="flex gap-2">
                      <button onClick={() => toggleFund(r.fund, 'is_restricted')} className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors" style={r.fund.is_restricted ? { background: '#b45309', color: '#fff' } : { background: CREAM, color: MUTED, border: `1px solid ${RULE}` }}>{tr('Restricted', 'সীমাবদ্ধ')}</button>
                      <button onClick={() => toggleFund(r.fund, 'is_frozen')} className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors" style={r.fund.is_frozen ? { background: BRAND, color: '#fff' } : { background: CREAM, color: MUTED, border: `1px solid ${RULE}` }}>{tr('Frozen', 'স্থগিত')}</button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px]" style={{ color: MUTED }}>{tr('Frozen funds cannot receive new expenses. Restricted funds are earmarked and shown separately.', 'স্থগিত ফান্ডে নতুন ব্যয় যোগ করা যায় না। সীমাবদ্ধ ফান্ড আলাদাভাবে দেখানো হয়।')}</p>
            </div>
            <div className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Restricted split', 'সীমাবদ্ধতার ভাগ')}</div>
              <div className="mt-3 space-y-2.5">
                <CashRow label={tr('Restricted donations', 'সীমাবদ্ধ অনুদান')} value={moneyShort(restrictedDon)} />
                <CashRow label={tr('Unrestricted donations', 'অসীমাবদ্ধ অনুদান')} value={moneyShort(unrestrictedDon)} />
                <CashRow label={tr('Contributions (unrestricted)', 'চাঁদা (অসীমাবদ্ধ)')} value={moneyShort(data.contributions)} />
              </div>
            </div>
          </div>

          {/* Latest transactions */}
          <div className="rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
            <div className="flex items-center justify-between px-5 pt-5">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Latest transactions', 'সাম্প্রতিক লেনদেন')}</div>
                <h3 className="mt-1.5 text-[18px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Last 10 movements', 'শেষ ১০টি লেনদেন')}</h3>
              </div>
            </div>
            {data.txns.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px]" style={{ color: MUTED }}>{tr('No transactions yet.', 'এখনো কোনো লেনদেন নেই।')}</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
                    {[tr('Date & time', 'তারিখ ও সময়'), tr('Description', 'বিবরণ'), tr('Fund', 'ফান্ড'), tr('Amount', 'পরিমাণ')].map((h, i) => (
                      <th key={i} className={`px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${i === 3 ? 'text-right' : 'text-left'}`} style={{ color: MUTED }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.txns.map((tx, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${RULE}` }}>
                        <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px]" style={{ color: MUTED }}>{dtFull(tx.at)}</td>
                        <td className="px-5 py-3" style={{ color: INK }}>{tx.label}</td>
                        <td className="px-5 py-3" style={{ color: INK2 }}>{tx.fund}</td>
                        <td className="px-5 py-3 text-right font-semibold" style={{ color: tx.dir === 'credit' ? GREEN : BRAND }}>{tx.dir === 'credit' ? '+' : '−'}{fmt.money(tx.amount)}</td>
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

function CashRow({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12.5px]" style={{ color: MUTED }}>{label}</span>
      <span className={strong ? 'font-bold' : 'font-medium'} style={{ color: accent ? GREEN : INK, fontSize: strong ? 15 : 13 }}>{value}</span>
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
