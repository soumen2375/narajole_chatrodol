import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CswoBudget, CswoExpense, CswoFund } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { logAudit } from '@/lib/audit';
import { TableSkeleton } from '@/components/ui/Skeleton';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const GREEN = '#4d7c0f';
const PAPER = '#ffffff';
const CREAM = '#faf6ef';

function currentFiscalYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() + 1 >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}
function fyStartYear(fy: string) { return Number(fy.slice(0, 4)); }
function inFy(dateStr: string, sy: number) { const d = new Date(dateStr); const i = (d.getFullYear() - sy) * 12 + d.getMonth() - 3; return i >= 0 && i < 12; }

export default function AdminBudgets() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const num = (v: string | number) => fmt.num(v);

  const [fy, setFy] = useState(currentFiscalYear());
  const [funds, setFunds] = useState<CswoFund[]>([]);
  const [used, setUsed] = useState<Record<string, number>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const sy = fyStartYear(fy);
    const [fundsR, budR, expR] = await Promise.all([
      supabase.from('cswo_funds').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('cswo_budgets').select('*').eq('fiscal_year', fy),
      supabase.from('cswo_expenses').select('amount,fund_id,spent_on,created_at,status').eq('status', 'approved'),
    ]);
    const funds = (fundsR.data ?? []) as CswoFund[];
    const budgets = (budR.data ?? []) as CswoBudget[];
    const expenses = (expR.data ?? []) as Pick<CswoExpense, 'amount' | 'fund_id' | 'spent_on' | 'created_at'>[];

    const u: Record<string, number> = {};
    for (const e of expenses) {
      if (inFy(e.spent_on || e.created_at, sy) && e.fund_id) u[e.fund_id] = (u[e.fund_id] ?? 0) + Number(e.amount);
    }
    const ed: Record<string, string> = {};
    for (const f of funds) { const b = budgets.find((x) => x.fund_id === f.id); ed[f.id] = b ? String(Number(b.allocated_amount)) : ''; }

    setFunds(funds);
    setUsed(u);
    setEdits(ed);
    setLoading(false);
  }, [fy]);
  useEffect(() => { load(); }, [load]);

  const save = async (fund: CswoFund) => {
    const amount = Number(edits[fund.id] || 0);
    setSavingId(fund.id);
    await supabase.from('cswo_budgets').upsert(
      { fund_id: fund.id, fiscal_year: fy, allocated_amount: amount },
      { onConflict: 'fund_id,fiscal_year' },
    );
    await logAudit('budget.set', 'cswo_budgets', fund.id, { fiscal_year: fy, amount });
    setSavingId(null);
    setMsg(`${tr('Saved', 'সংরক্ষিত')}: ${lang === 'bn' ? fund.name_bn : fund.name_en}`);
    setTimeout(() => setMsg(null), 2500);
  };

  const totalAllocated = funds.reduce((s, f) => s + Number(edits[f.id] || 0), 0);
  const totalUsed = funds.reduce((s, f) => s + (used[f.id] ?? 0), 0);

  const fyList = [currentFiscalYear(), `${fyStartYear(currentFiscalYear()) - 1}-${String(fyStartYear(currentFiscalYear())).slice(-2)}`];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Finance', 'অর্থ')} · {tr('Budgets', 'বাজেট')}</div>
          <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Budget Management', 'বাজেট ব্যবস্থাপনা')}</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Allocate a budget per fund for the fiscal year and track utilisation against approved expenses.', 'আর্থিক বছরের জন্য প্রতিটি ফান্ডে বাজেট বরাদ্দ করুন এবং অনুমোদিত ব্যয়ের সাপেক্ষে ব্যবহার ট্র্যাক করুন।')}</p>
        </div>
        <select value={fy} onChange={(e) => setFy(e.target.value)} className="rounded-full px-3.5 py-2 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
          {fyList.map((y) => <option key={y} value={y}>FY {y}</option>)}
        </select>
      </div>

      {msg && <div className="rounded-[6px] px-4 py-2.5 text-[13px]" style={{ background: 'rgba(77,124,15,0.1)', color: GREEN }}>{msg}</div>}

      {loading ? <TableSkeleton rows={6} /> : (
        <div className="overflow-x-auto rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <table className="w-full text-[13px]">
            <thead><tr style={{ borderBottom: `1px solid ${RULE}` }}>
              {[tr('Fund', 'ফান্ড'), tr('Allocated', 'বরাদ্দ'), tr('Used', 'ব্যবহৃত'), tr('Remaining', 'অবশিষ্ট'), tr('Utilisation', 'ব্যবহার'), ''].map((h, i) => (
                <th key={i} className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${i === 0 || i === 5 ? 'text-left' : 'text-right'}`} style={{ color: MUTED }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {funds.map((f) => {
                const alloc = Number(edits[f.id] || 0);
                const u = used[f.id] ?? 0;
                const remaining = alloc - u;
                const pct = alloc > 0 ? Math.min(999, Math.round((u / alloc) * 100)) : 0;
                const barColor = pct >= 100 ? BRAND : pct >= 90 ? '#b45309' : GREEN;
                return (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                    <td className="px-4 py-3 font-medium" style={{ color: INK }}>{lang === 'bn' ? f.name_bn : f.name_en}</td>
                    <td className="px-4 py-3 text-right">
                      <input type="number" value={edits[f.id] ?? ''} onChange={(e) => setEdits((m) => ({ ...m, [f.id]: e.target.value }))}
                        className="w-28 rounded-[5px] px-2 py-1 text-right text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} placeholder="0" />
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: BRAND }}>{fmt.money(u)}</td>
                    <td className="px-4 py-3 text-right font-semibold" style={{ color: remaining >= 0 ? GREEN : BRAND }}>{fmt.money(remaining)}</td>
                    <td className="px-4 py-3">
                      <div className="ml-auto h-1.5 w-28 overflow-hidden rounded-full" style={{ background: CREAM }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: barColor }} /></div>
                      <div className="mt-1 text-right font-mono text-[9px]" style={{ color: pct >= 90 ? BRAND : MUTED }}>{num(pct)}%{pct >= 100 ? ` · ${tr('over', 'অতিক্রান্ত')}` : ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => save(f)} disabled={savingId === f.id} className="rounded-full px-3 py-1 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: BRAND }}>{savingId === f.id ? tr('Saving…', 'সংরক্ষণ…') : tr('Save', 'সংরক্ষণ')}</button>
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: INK }}>
                <td className="px-4 py-3 font-semibold" style={{ color: CREAM }}>{tr('Total', 'সর্বমোট')}</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: CREAM }}>{fmt.money(totalAllocated)}</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: '#fca47e' }}>{fmt.money(totalUsed)}</td>
                <td className="px-4 py-3 text-right font-semibold" style={{ color: '#86efac' }}>{fmt.money(totalAllocated - totalUsed)}</td>
                <td className="px-4 py-3" /><td className="px-4 py-3" />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
