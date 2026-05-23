import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CswoBudget, CswoFund } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

interface FundRow {
  fund: CswoFund;
  donations: number;
  expenses: number;
  budget: number | null;
}

function currentFiscalYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return m >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
    </div>
  );
}

export default function AdminFinance() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [loading, setLoading] = useState(true);
  const [totalDonations, setTotalDonations] = useState(0);
  const [totalContributions, setTotalContributions] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [fundRows, setFundRows] = useState<FundRow[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('cswo_donations').select('amount,fund_id').eq('status', 'paid'),
      supabase.from('cswo_monthly_contributions').select('amount').eq('status', 'paid'),
      supabase.from('cswo_expenses').select('amount,fund_id').eq('status', 'approved'),
      supabase.from('cswo_funds').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('cswo_budgets').select('*').eq('fiscal_year', currentFiscalYear()),
    ]).then(([don, con, exp, fundsRes, budgetsRes]) => {
      if (!active) return;

      type DonRow = { amount: number; fund_id: string | null };
      type ExpRow = { amount: number; fund_id: string | null };

      const donations = (don.data ?? []) as DonRow[];
      const contributions = (con.data ?? []) as { amount: number }[];
      const expenses = (exp.data ?? []) as ExpRow[];
      const funds = (fundsRes.data ?? []) as CswoFund[];
      const budgets = (budgetsRes.data ?? []) as CswoBudget[];

      const td = donations.reduce((s, d) => s + Number(d.amount), 0);
      const tc = contributions.reduce((s, c) => s + Number(c.amount), 0);
      const te = expenses.reduce((s, e) => s + Number(e.amount), 0);

      const rows: FundRow[] = funds.map((f) => {
        const fd = donations
          .filter((d) => d.fund_id === f.id)
          .reduce((s, d) => s + Number(d.amount), 0);
        const fe = expenses
          .filter((e) => e.fund_id === f.id)
          .reduce((s, e) => s + Number(e.amount), 0);
        const bud = budgets.find((b) => b.fund_id === f.id);
        return { fund: f, donations: fd, expenses: fe, budget: bud ? Number(bud.allocated_amount) : null };
      });

      setTotalDonations(td);
      setTotalContributions(tc);
      setTotalExpenses(te);
      setFundRows(rows);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const totalIncome = totalDonations + totalContributions;
  const netBalance = totalIncome - totalExpenses;
  const expenseRatio = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

  const exportCSV = () => {
    const fy = currentFiscalYear();
    const header = [
      tr('Fund', 'ফান্ড'),
      tr('Donations (₹)', 'দান (₹)'),
      tr('Expenses (₹)', 'ব্যয় (₹)'),
      tr('Budget (₹)', 'বাজেট (₹)'),
      tr('Balance (₹)', 'ব্যালেন্স (₹)'),
    ];
    const body = fundRows.map((r) => [
      lang === 'bn' ? r.fund.name_bn : r.fund.name_en,
      r.donations,
      r.expenses,
      r.budget ?? '',
      r.donations - r.expenses,
    ]);
    const totalsRow = [
      tr('TOTAL', 'মোট'),
      totalDonations,
      totalExpenses,
      '',
      netBalance,
    ];
    const csv = [header, ...body, totalsRow]
      .map((row) => row.map((c) => `"${c}"`).join(','))
      .join('\r\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cswo-finance-${fy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {tr('Finance Overview', 'আর্থিক সারসংক্ষেপ')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {tr('Fiscal year', 'আর্থিক বছর')}: {currentFiscalYear()}
          </p>
        </div>
        <button onClick={exportCSV} className="btn-secondary text-sm">
          {tr('Export CSV', 'CSV ডাউনলোড')}
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : (
        <>
          {/* top stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label={tr('Total Income', 'মোট আয়')}
              value={fmt.money(totalIncome)}
              color="text-green-700"
            />
            <StatCard
              label={tr('Donations', 'মোট দান')}
              value={fmt.money(totalDonations)}
              color="text-amber-600"
            />
            <StatCard
              label={tr('Contributions', 'মোট চাঁদা')}
              value={fmt.money(totalContributions)}
              color="text-blue-600"
            />
            <StatCard
              label={tr('Total Expenses', 'মোট ব্যয়')}
              value={fmt.money(totalExpenses)}
              color="text-red-600"
            />
          </div>

          {/* net balance card */}
          <div className="mb-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm text-gray-500">{tr('Net Balance', 'নিট ব্যালেন্স')}</p>
                <p className={`text-4xl font-extrabold ${netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {fmt.money(netBalance)}
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>{tr('Expense ratio', 'ব্যয়ের অনুপাত')}</p>
                <p className="text-xl font-bold text-gray-700">{fmt.num(expenseRatio)}%</p>
              </div>
            </div>
            {totalIncome > 0 && (
              <div className="mt-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-red-100">
                  <div
                    className={`h-full rounded-full transition-all ${expenseRatio > 80 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, 100 - expenseRatio)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-400">
                  <span>{tr('Expenses', 'ব্যয়')}</span>
                  <span>{tr('Remaining', 'অবশিষ্ট')}</span>
                </div>
              </div>
            )}
          </div>

          {/* per-fund table */}
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            {tr('Per-fund breakdown', 'ফান্ড অনুযায়ী বিশ্লেষণ')}
          </h2>
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3">{tr('Fund', 'ফান্ড')}</th>
                  <th className="px-4 py-3">{tr('Donations', 'দান')}</th>
                  <th className="px-4 py-3">{tr('Expenses', 'ব্যয়')}</th>
                  <th className="px-4 py-3">{tr('Budget', 'বাজেট')}</th>
                  <th className="px-4 py-3">{tr('Balance', 'ব্যালেন্স')}</th>
                  <th className="w-36 px-4 py-3">{tr('Usage', 'ব্যবহার')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fundRows.map(({ fund, donations, expenses, budget }) => {
                  const balance = donations - expenses;
                  const usage = donations > 0 ? Math.min(100, Math.round((expenses / donations) * 100)) : 0;
                  return (
                    <tr key={fund.id}>
                      <td className="px-4 py-3 font-medium">
                        {lang === 'bn' ? fund.name_bn : fund.name_en}
                      </td>
                      <td className="px-4 py-3 text-amber-700">{fmt.money(donations)}</td>
                      <td className="px-4 py-3 text-red-700">{fmt.money(expenses)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {budget != null ? fmt.money(budget) : '—'}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {fmt.money(balance)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${usage > 80 ? 'bg-red-400' : 'bg-amber-400'}`}
                            style={{ width: `${usage}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">{fmt.num(usage)}%</p>
                      </td>
                    </tr>
                  );
                })}
                {/* totals row */}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3">{tr('Total', 'মোট')}</td>
                  <td className="px-4 py-3 text-amber-700">{fmt.money(totalDonations)}</td>
                  <td className="px-4 py-3 text-red-700">{fmt.money(totalExpenses)}</td>
                  <td className="px-4 py-3">—</td>
                  <td className={`px-4 py-3 ${netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {fmt.money(netBalance)}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-gray-400">
            * {tr(
              'Contributions (monthly dues) are not allocated to specific funds and are included in Net Balance only.',
              'মাসিক চাঁদা নির্দিষ্ট ফান্ডে বরাদ্দ নয় এবং শুধুমাত্র নিট ব্যালেন্সে অন্তর্ভুক্ত।',
            )}
          </p>
        </>
      )}
    </div>
  );
}
