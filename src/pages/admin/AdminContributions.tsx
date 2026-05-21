import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Member, MonthlyContribution } from '@/types';
import { MONTH_NAMES_BN, formatCurrency, toBengaliDigits } from '@/lib/format';
import Spinner from '@/components/ui/Spinner';

export default function AdminContributions() {
  const { member: me } = useAuth();
  const currentYear = new Date().getFullYear();
  const [members, setMembers] = useState<Member[]>([]);
  const [memberId, setMemberId] = useState('');
  const [year, setYear] = useState(currentYear);
  const [defaultAmount, setDefaultAmount] = useState(100);
  const [rows, setRows] = useState<Record<number, MonthlyContribution>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('cswo_members')
      .select('*')
      .eq('status', 'approved')
      .order('full_name')
      .then(({ data }) => {
        const list = (data ?? []) as Member[];
        setMembers(list);
        if (list.length) setMemberId(list[0].id);
        setLoading(false);
      });
  }, []);

  const loadRows = useCallback(async () => {
    if (!memberId) return;
    const { data } = await supabase
      .from('cswo_monthly_contributions')
      .select('*')
      .eq('member_id', memberId)
      .eq('year', year);
    const map: Record<number, MonthlyContribution> = {};
    for (const r of (data ?? []) as MonthlyContribution[]) map[r.month] = r;
    setRows(map);
  }, [memberId, year]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const setMonth = async (month: number, status: 'paid' | 'unpaid') => {
    setBusy(month);
    const existing = rows[month];
    const amount = existing?.amount ? Number(existing.amount) : defaultAmount;
    await supabase.from('cswo_monthly_contributions').upsert(
      {
        member_id: memberId,
        year,
        month,
        amount,
        status,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
        payment_method: status === 'paid' ? 'cash' : null,
        recorded_by: me?.id,
      },
      { onConflict: 'member_id,year,month' },
    );
    await loadRows();
    setBusy(null);
  };

  const generateAll = async () => {
    setBusy(-1);
    const payload = MONTH_NAMES_BN.map((_, i) => ({
      member_id: memberId,
      year,
      month: i + 1,
      amount: defaultAmount,
      status: rows[i + 1]?.status ?? 'unpaid',
      recorded_by: me?.id,
    }));
    await supabase.from('cswo_monthly_contributions').upsert(payload, { onConflict: 'member_id,year,month' });
    await loadRows();
    setBusy(null);
  };

  const years = [currentYear, currentYear - 1, currentYear - 2];
  const paidCount = Object.values(rows).filter((r) => r.status === 'paid').length;
  const collected = Object.values(rows)
    .filter((r) => r.status === 'paid')
    .reduce((s, r) => s + Number(r.amount), 0);

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">মাসিক অনুদান ব্যবস্থাপনা</h1>

      {members.length === 0 ? (
        <p className="text-gray-600">প্রথমে অনুমোদিত সদস্য যোগ করুন।</p>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-end gap-4 rounded-lg bg-white p-4 shadow-sm">
            <div className="min-w-[200px]">
              <label className="mb-1 block text-sm font-medium text-gray-700">সদস্য</label>
              <select className="input" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
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
              <label className="mb-1 block text-sm font-medium text-gray-700">ডিফল্ট চাঁদা (₹)</label>
              <input type="number" className="input w-28" value={defaultAmount} onChange={(e) => setDefaultAmount(Number(e.target.value))} />
            </div>
            <button onClick={generateAll} disabled={busy === -1} className="btn-secondary">
              ১২ মাস তৈরি করুন
            </button>
            <div className="ml-auto text-right">
              <p className="text-sm text-gray-500">পরিশোধিত: {toBengaliDigits(paidCount)}/{toBengaliDigits(12)}</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(collected)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MONTH_NAMES_BN.map((name, i) => {
              const month = i + 1;
              const row = rows[month];
              const paid = row?.status === 'paid';
              return (
                <div key={month} className={`rounded-lg border p-4 shadow-sm ${paid ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{name}</h3>
                    <span className={`badge ${paid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {paid ? 'পরিশোধিত' : 'বকেয়া'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    {row ? formatCurrency(Number(row.amount)) : '—'}
                    {row?.payment_method ? ` · ${row.payment_method === 'razorpay' ? 'অনলাইন' : 'নগদ'}` : ''}
                  </p>
                  <div className="mt-3 flex gap-2">
                    {!paid ? (
                      <button disabled={busy === month} onClick={() => setMonth(month, 'paid')} className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700">
                        নগদ পরিশোধিত
                      </button>
                    ) : (
                      <button disabled={busy === month} onClick={() => setMonth(month, 'unpaid')} className="rounded bg-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-300">
                        বকেয়া করুন
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
