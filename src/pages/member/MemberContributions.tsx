import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { MonthlyContribution } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { startRazorpayPayment } from '@/lib/razorpay';
import { MonthGridSkeleton } from '@/components/ui/Skeleton';
import { printReceipt } from '@/lib/receipt';

const DEFAULT_AMOUNT = 100;

export default function MemberContributions() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [rows, setRows] = useState<Record<number, MonthlyContribution>>({});
  const [loading, setLoading] = useState(true);
  const [payingMonth, setPayingMonth] = useState<number | null>(null);
  const [error, setError] = useState('');
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const months = fmt.months();

  const pad = (n: number) => String(n).padStart(2, '0');
  const dtFull = (s: string) => { const d = new Date(s); return `${fmt.date(s)} · ${fmt.num(pad(d.getHours()))}:${fmt.num(pad(d.getMinutes()))}`; };

  const load = useCallback(async () => {
    if (!member) return;
    setLoading(true);
    const { data } = await supabase.from('cswo_monthly_contributions').select('*').eq('member_id', member.id).eq('year', year);
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
        description: `Monthly dues — ${months[month - 1]} ${year}`,
      });
      await load();
    } catch (err) {
      console.error('Contribution payment error:', err);
      setError(err instanceof Error && err.message === 'CANCELLED' ? t('pay.cancelled') : t('pay.failed'));
    } finally {
      setPayingMonth(null);
    }
  };

  const years = [currentYear, currentYear - 1, currentYear - 2];
  const paidCount = Object.values(rows).filter((r) => r.status === 'paid').length;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t('m.contributions')}</h1>
      <p className="mb-6 text-gray-600">{tr('See your monthly dues and pay them online.', 'প্রতি মাসের চাঁদা দেখুন ও অনলাইনে পরিশোধ করুন।')}</p>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t('common.year')}</label>
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{fmt.num(y)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{tr('Monthly amount (₹)', 'মাসিক চাঁদা (₹)')}</label>
          <input type="number" min={10} className="input" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div className="ml-auto text-right">
          <p className="text-sm text-gray-500">{tr('Months paid', 'পরিশোধিত মাস')}</p>
          <p className="text-2xl font-bold text-green-600">{fmt.num(paidCount)}/{fmt.num(12)}</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded bg-red-100 px-4 py-2 text-red-800">{error}</div>}

      {loading ? (
        <MonthGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {months.map((nm, i) => {
            const month = i + 1;
            const row = rows[month];
            const paid = row?.status === 'paid';
            return (
              <div key={month} className={`rounded-xl border p-4 shadow-sm ${paid ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">{nm}</h3>
                  <span className={`badge ${paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {paid ? tr('Paid', 'পরিশোধিত') : tr('Due', 'বকেয়া')}
                  </span>
                </div>
                {paid ? (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      {fmt.money(Number(row.amount))}{row.paid_at ? ` · ${dtFull(row.paid_at)}` : ''}
                    </p>
                    {row.receipt_number && (
                      <button
                        onClick={() =>
                          printReceipt(
                            {
                              receiptNumber: row.receipt_number!,
                              type: 'contribution',
                              name: member?.full_name ?? '',
                              email: member?.email,
                              amount: Number(row.amount),
                              date: row.paid_at ? fmt.date(row.paid_at) : '',
                              month: nm,
                              year,
                              paymentMethod: row.payment_method ?? undefined,
                              paymentId: row.razorpay_payment_id ?? undefined,
                            },
                            lang,
                          )
                        }
                        className="mt-1 text-xs text-blue-600 hover:underline"
                      >
                        {tr('Download receipt', 'রসিদ ডাউনলোড')}
                      </button>
                    )}
                  </div>
                ) : (
                  <button onClick={() => pay(month)} disabled={payingMonth === month} className="btn-primary mt-3 w-full text-sm">
                    {payingMonth === month ? t('common.processing') : `${fmt.money(row?.amount ? Number(row.amount) : amount)} ${tr('Pay', 'পরিশোধ করুন')}`}
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
