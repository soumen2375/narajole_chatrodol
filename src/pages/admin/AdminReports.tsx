import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaDownload, FaPrint } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import type { CswoFund, CswoLedgerEntry, LedgerEntryType } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const GREEN = '#4d7c0f';
const PAPER = '#ffffff';

const fyStart = (d: Date) => (d.getMonth() + 1 >= 4 ? d.getFullYear() : d.getFullYear() - 1);

export default function AdminReports() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [rows, setRows] = useState<CswoLedgerEntry[]>([]);
  const [funds, setFunds] = useState<CswoFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('cswo_finance_ledger').select('*').order('occurred_at', { ascending: false }).limit(5000);
    if (from) q = q.gte('occurred_at', from);
    if (to) q = q.lte('occurred_at', to + 'T23:59:59');
    const [ledR, fundR] = await Promise.all([q, supabase.from('cswo_funds').select('*').order('sort_order')]);
    setRows((ledR.data ?? []) as CswoLedgerEntry[]);
    setFunds((fundR.data ?? []) as CswoFund[]);
    setLoading(false);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const setThisFY = () => { const s = fyStart(new Date()); setFrom(`${s}-04-01`); setTo(`${s + 1}-03-31`); };
  const setAllTime = () => { setFrom(''); setTo(''); };

  const typeLabel = (t: LedgerEntryType) =>
    t === 'donation' ? tr('Donations', 'অনুদান') : t === 'contribution' ? tr('Contributions', 'চাঁদা') : t === 'grant' ? tr('Grants', 'অনুদান-তহবিল') : t === 'expense' ? tr('Expenses', 'ব্যয়') : t === 'payroll' ? tr('Payroll', 'বেতন') : tr('Adjustments', 'সমন্বয়');
  const fundName = (id: string | null) => { const f = funds.find((x) => x.id === id); return f ? (lang === 'bn' ? f.name_bn : f.name_en) : tr('Unassigned', 'অনির্ধারিত'); };

  const report = useMemo(() => {
    const inc = new Map<LedgerEntryType, number>();
    const exp = new Map<LedgerEntryType, number>();
    const fundMap = new Map<string | null, { cr: number; db: number }>();
    for (const r of rows) {
      const amt = Number(r.amount);
      if (r.direction === 'credit') inc.set(r.entry_type, (inc.get(r.entry_type) ?? 0) + amt);
      else exp.set(r.entry_type, (exp.get(r.entry_type) ?? 0) + amt);
      const fm = fundMap.get(r.fund_id) ?? { cr: 0, db: 0 };
      if (r.direction === 'credit') fm.cr += amt; else fm.db += amt;
      fundMap.set(r.fund_id, fm);
    }
    const income = [...inc.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
    const expense = [...exp.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
    const totalIncome = income.reduce((s, x) => s + x.v, 0);
    const totalExpense = expense.reduce((s, x) => s + x.v, 0);
    const byFund = [...fundMap.entries()].map(([id, v]) => ({ id, name: fundName(id), ...v, bal: v.cr - v.db })).sort((a, b) => b.cr - a.cr);
    return { income, expense, totalIncome, totalExpense, net: totalIncome - totalExpense, byFund };
  }, [rows, funds, lang]);

  const periodLabel = from || to ? `${from ? fmt.date(from) : '…'} — ${to ? fmt.date(to) : '…'}` : tr('All time', 'সর্বকাল');

  const exportCSV = () => {
    const lines: (string | number)[][] = [];
    lines.push([tr('Income & Expenditure', 'আয় ও ব্যয়'), periodLabel]);
    lines.push([]);
    lines.push([tr('INCOME', 'আয়'), '']);
    report.income.forEach((x) => lines.push([typeLabel(x.k), x.v]));
    lines.push([tr('Total income', 'মোট আয়'), report.totalIncome]);
    lines.push([]);
    lines.push([tr('EXPENDITURE', 'ব্যয়'), '']);
    report.expense.forEach((x) => lines.push([typeLabel(x.k), x.v]));
    lines.push([tr('Total expenditure', 'মোট ব্যয়'), report.totalExpense]);
    lines.push([]);
    lines.push([tr('Net surplus / (deficit)', 'নিট উদ্বৃত্ত / (ঘাটতি)'), report.net]);
    lines.push([]);
    lines.push([tr('FUND-WISE', 'ফান্ড-ভিত্তিক'), tr('Income', 'আয়'), tr('Expense', 'ব্যয়'), tr('Balance', 'ব্যালেন্স')]);
    report.byFund.forEach((f) => lines.push([f.name, f.cr, f.db, f.bal]));
    const csv = lines.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cswo-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const printStatement = () => {
    const L = (en: string, bn: string) => (lang === 'en' ? en : bn);
    const money = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
    const incRows = report.income.map((x) => `<tr><td>${typeLabel(x.k)}</td><td class="r">${money(x.v)}</td></tr>`).join('');
    const expRows = report.expense.map((x) => `<tr><td>${typeLabel(x.k)}</td><td class="r">${money(x.v)}</td></tr>`).join('');
    const fundRows = report.byFund.map((f) => `<tr><td>${f.name}</td><td class="r">${money(f.cr)}</td><td class="r">${money(f.db)}</td><td class="r">${money(f.bal)}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>${L('Income & Expenditure', 'আয় ও ব্যয়')}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1c1917;padding:40px;max-width:760px}
  .head{text-align:center;border-bottom:2px solid #c2410c;padding-bottom:14px;margin-bottom:8px}
  .org{font-size:18px;font-weight:800;color:#c2410c}
  .sub{font-size:13px;color:#555;margin-top:2px}
  .title{margin-top:14px;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}
  .period{font-size:12px;color:#78716c;margin-top:2px}
  h3{margin:22px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#c2410c}
  table{width:100%;border-collapse:collapse}
  td,th{padding:6px 8px;font-size:13px;border-bottom:1px solid #eee;text-align:left}
  th{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#78716c}
  .r{text-align:right}
  .tot td{font-weight:700;border-top:2px solid #1c1917;border-bottom:none}
  .net{margin-top:18px;padding:12px;background:#faf6ef;display:flex;justify-content:space-between;font-weight:800;font-size:15px}
  .foot{margin-top:26px;text-align:center;font-size:10.5px;color:#a8a29e}
  @media print{body{padding:12px}}
</style></head><body>
  <div class="head">
    <div class="org">Chhatradol Social Welfare Organisation</div>
    <div class="sub">নাড়াজোল ছাত্রদল</div>
    <div class="title">${L('Income & Expenditure Statement', 'আয় ও ব্যয় বিবরণী')}</div>
    <div class="period">${periodLabel}</div>
  </div>
  <h3>${L('Income', 'আয়')}</h3>
  <table>${incRows || `<tr><td colspan="2" style="color:#999">${L('No income', 'কোনো আয় নেই')}</td></tr>`}
    <tr class="tot"><td>${L('Total income', 'মোট আয়')}</td><td class="r">${money(report.totalIncome)}</td></tr></table>
  <h3>${L('Expenditure', 'ব্যয়')}</h3>
  <table>${expRows || `<tr><td colspan="2" style="color:#999">${L('No expenditure', 'কোনো ব্যয় নেই')}</td></tr>`}
    <tr class="tot"><td>${L('Total expenditure', 'মোট ব্যয়')}</td><td class="r">${money(report.totalExpense)}</td></tr></table>
  <div class="net"><span>${L('Net surplus / (deficit)', 'নিট উদ্বৃত্ত / (ঘাটতি)')}</span><span>${money(report.net)}</span></div>
  <h3>${L('Fund-wise summary', 'ফান্ড-ভিত্তিক সারসংক্ষেপ')}</h3>
  <table><tr><th>${L('Fund', 'ফান্ড')}</th><th class="r">${L('Income', 'আয়')}</th><th class="r">${L('Expense', 'ব্যয়')}</th><th class="r">${L('Balance', 'ব্যালেন্স')}</th></tr>${fundRows}</table>
  <div class="foot">${L('Computer-generated statement', 'কম্পিউটার-জেনারেটেড বিবরণী')} · ${new Date().toLocaleString('en-IN')} · narajole.org</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=820,height=900');
    if (!w) return;
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Finance', 'অর্থ')} · {tr('Reports', 'প্রতিবেদন')}</div>
          <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Financial Reports', 'আর্থিক প্রতিবেদন')}</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Income & expenditure and fund-wise summaries for any period, drawn straight from the ledger.', 'যেকোনো সময়ের আয়-ব্যয় ও ফান্ড-ভিত্তিক সারসংক্ষেপ — সরাসরি লেজার থেকে।')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ border: `1px solid ${RULE}`, color: INK2 }}><FaDownload className="h-3 w-3" /> CSV</button>
          <button onClick={printStatement} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}><FaPrint className="h-3 w-3" /> {tr('Print', 'প্রিন্ট')}</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 rounded-[8px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Period', 'সময়কাল')}</span>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
        <span style={{ color: MUTED }}>—</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
        <button onClick={setThisFY} className="rounded-full px-3 py-1.5 text-[12px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('This FY', 'চলতি অর্থবছর')}</button>
        <button onClick={setAllTime} className="rounded-full px-3 py-1.5 text-[12px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('All time', 'সর্বকাল')}</button>
      </div>

      {loading ? <TableSkeleton rows={8} /> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label={tr('Total income', 'মোট আয়')} value={fmt.money(report.totalIncome)} color={GREEN} />
            <Stat label={tr('Total expenditure', 'মোট ব্যয়')} value={fmt.money(report.totalExpense)} color={BRAND} />
            <Stat label={tr('Net surplus / (deficit)', 'নিট উদ্বৃত্ত / (ঘাটতি)')} value={fmt.money(report.net)} color={report.net >= 0 ? GREEN : BRAND} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Section title={tr('Income', 'আয়')} rows={report.income.map((x) => ({ label: typeLabel(x.k), value: x.v }))} total={report.totalIncome} totalLabel={tr('Total income', 'মোট আয়')} color={GREEN} fmt={fmt} empty={tr('No income in this period.', 'এই সময়ে কোনো আয় নেই।')} />
            <Section title={tr('Expenditure', 'ব্যয়')} rows={report.expense.map((x) => ({ label: typeLabel(x.k), value: x.v }))} total={report.totalExpense} totalLabel={tr('Total expenditure', 'মোট ব্যয়')} color={BRAND} fmt={fmt} empty={tr('No expenditure in this period.', 'এই সময়ে কোনো ব্যয় নেই।')} />
          </div>

          <div className="overflow-x-auto rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
            <div className="px-5 pt-4 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{tr('Fund-wise summary', 'ফান্ড-ভিত্তিক সারসংক্ষেপ')}</div>
            <table className="mt-2 w-full text-[13px]">
              <thead><tr style={{ borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}` }}>
                {[tr('Fund', 'ফান্ড'), tr('Income', 'আয়'), tr('Expense', 'ব্যয়'), tr('Balance', 'ব্যালেন্স')].map((h, i) => (
                  <th key={i} className={`px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${i === 0 ? 'text-left' : 'text-right'}`} style={{ color: MUTED }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {report.byFund.map((f) => (
                  <tr key={f.id ?? 'none'} style={{ borderBottom: `1px solid ${RULE}` }}>
                    <td className="px-4 py-2.5" style={{ color: INK }}>{f.name}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: GREEN }}>{fmt.money(f.cr)}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: BRAND }}>{fmt.money(f.db)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold" style={{ color: f.bal >= 0 ? INK : BRAND }}>{fmt.money(f.bal)}</td>
                  </tr>
                ))}
                {report.byFund.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-[13px]" style={{ color: MUTED }}>{tr('No data for this period.', 'এই সময়ের কোনো তথ্য নেই।')}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Section({ title, rows, total, totalLabel, color, fmt, empty }: { title: string; rows: { label: string; value: number }[]; total: number; totalLabel: string; color: string; fmt: ReturnType<typeof useFmt>; empty: string }) {
  return (
    <div className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <h3 className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color }}>{title}</h3>
      <div className="mt-3 space-y-1.5">
        {rows.length === 0 ? <p className="text-[13px]" style={{ color: MUTED }}>{empty}</p> : rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-[13.5px]">
            <span style={{ color: INK2 }}>{r.label}</span>
            <span className="font-medium" style={{ color: INK }}>{fmt.money(r.value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t pt-3 text-[14px] font-bold" style={{ borderColor: RULE, color }}>
        <span>{totalLabel}</span><span>{fmt.money(total)}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[8px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1.5 text-[22px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
