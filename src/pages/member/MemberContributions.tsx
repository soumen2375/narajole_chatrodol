import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { MonthlyContribution } from '@/types';
import { MONTH_NAMES_BN, formatCurrency, formatDateBn, toBengaliDigits } from '@/lib/format';
import { startRazorpayPayment } from '@/lib/razorpay';
import Spinner from '@/components/ui/Spinner';

const DEFAULT_AMOUNT = 100;

export default function MemberContributions() {
  const { member } = useAuth();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [rows, setRows] = useState<Record<number, MonthlyContribution>>({});
  const [loading, setLoading] = useState(true);
  const [payingMonth, setPayingMonth] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const { data } = await supabase
      .from('cswo_monthly_contributions')
      .select('*')
      .eq('member_id', member.id)
      .eq('year', year);
    const map: Record<number, MonthlyContribution> = {};
    for (const r of (data ?? []) as MonthlyContribution[]) map[r.month] = r;
    setRows(map);
    setLoading(false);
  }, [member, year]);

  useEffect(() => {
    load();
  }, [load]);

  const pay = async (month: number) => {
    setPayingMonth(month);
    setError('');
    try {
      await startRazorpayPayment({
        action: 'create_contribution_order',
        amount: rows[month]?.amount ? Number(rows[month].amount) : amount,
        year,
        month,
        donorName: member?.full_name,
        donorEmail: member?.email,
        donorPhone: member?.phone ?? undefined,
        description: `মাসিক অনুদান — ${MONTH_NAMES_BN[month - 1]} ${year}`,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'পেমেন্টে সমস্যা হয়েছে।');
    } finally {
      setPayingMonth(null);
    }
  };

  const years = [currentYear, currentYear - 1, currentYear - 2];
  const paidCount = Object.values(rows).filter((r) => r.status === 'paid').length;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">মাসিক অনুদান</h1>
      <p className="mb-6 text-gray-600">প্রতি মাসের চাঁদা এখানে দেখুন ও অনলাইনে পরিশোধ করুন।</p>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">বছর</label>
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {toBengaliDigits(y)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">মাসিক চাঁদার পরিমাণ (₹)</label>
          <input
            type="number"
            min={10}
            className="input"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm text-gray-500">পরিশোধিত মাস</p>
          <p className="text-2xl font-bold text-green-600">
            {toBengaliDigits(paidCount)}/{toBengaliDigits(12)}
          </p>
        </div>
      </div>

      {error && <div className="mb-4 rounded bg-red-100 px-4 py-2 text-red-800">{error}</div>}

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MONTH_NAMES_BN.map((name, i) => {
            const month = i + 1;
            const row = rows[month];
            const paid = row?.status === 'paid';
            return (
              <div
                key={month}
                className={`rounded-lg border p-4 shadow-sm ${paid ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{name}</h3>
                  <span className={`badge ${paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {paid ? 'পরিশোধিত' : 'বকেয়া'}
                  </span>
                </div>
                {paid ? (
                  <p className="mt-2 text-sm text-gray-600">
                    {formatCurrency(Number(row.amount))}
                    {row.paid_at ? ` · ${formatDateBn(row.paid_at)}` : ''}
                    {row.payment_method ? ` · ${row.payment_method === 'razorpay' ? 'অনলাইন' : row.payment_method}` : ''}
                  </p>
                ) : (
                  <button
                    onClick={() => pay(month)}
                    disabled={payingMonth === month}
                    className="btn-primary mt-3 w-full text-sm"
                  >
                    {payingMonth === month
                      ? 'প্রক্রিয়াকরণ…'
                      : `${formatCurrency(row?.amount ? Number(row.amount) : amount)} পরিশোধ করুন`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
