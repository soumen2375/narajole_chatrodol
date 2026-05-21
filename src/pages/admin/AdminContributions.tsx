import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Member, MonthlyContribution } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import Spinner from '@/components/ui/Spinner';

export default function AdminContributions() {
  const { member: me } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const months = fmt.months();
  const currentYear = new Date().getFullYear();
  const [members, setMembers] = useState<Member[]>([]);
  const [year, setYear] = useState(currentYear);
  const [defaultAmount, setDefaultAmount] = useState(100);
  // member_id -> month -> contribution
  const [grid, setGrid] = useState<Record<string, Record<number, MonthlyContribution>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [mem, con] = await Promise.all([
      supabase.from('cswo_members').select('*').eq('status', 'approved').order('full_name'),
      supabase.from('cswo_monthly_contributions').select('*').eq('year', year),
    ]);
    setMembers((mem.data ?? []) as Member[]);
    const g: Record<string, Record<number, MonthlyContribution>> = {};
    for (const r of (con.data ?? []) as MonthlyContribution[]) {
      (g[r.member_id] ??= {})[r.month] = r;
    }
    setGrid(g);
    setLoading(false);
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (memberId: string, month: number) => {
    const key = `${memberId}-${month}`;
    setBusy(key);
    const existing = grid[memberId]?.[month];
    const isPaid = existing?.status === 'paid';
    const amount = existing?.amount ? Number(existing.amount) : defaultAmount;
    await supabase.from('cswo_monthly_contributions').upsert(
      {
        member_id: memberId, year, month, amount,
        status: isPaid ? 'unpaid' : 'paid',
        paid_at: isPaid ? null : new Date().toISOString(),
        payment_method: isPaid ? null : 'cash',
        recorded_by: me?.id,
      },
      { onConflict: 'member_id,year,month' },
    );
    await load();
    setBusy(null);
  };

  const years = [currentYear, currentYear - 1, currentYear - 2];
  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t('a.contributions')}</h1>
      <p className="mb-6 text-gray-600">{tr('Overview of every member’s monthly dues. Click a cell to toggle cash paid / due.', 'প্রতিটি সদস্যের মাসিক চাঁদার সারসংক্ষেপ। নগদ পরিশোধ/বকেয়া টগল করতে সেলে ক্লিক করুন।')}</p>

      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t('common.year')}</label>
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{fmt.num(y)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{tr('Default amount (₹)', 'ডিফল্ট চাঁদা (₹)')}</label>
          <input type="number" className="input w-28" value={defaultAmount} onChange={(e) => setDefaultAmount(Number(e.target.value))} />
        </div>
      </div>

      {members.length === 0 ? (
        <p className="text-gray-600">{tr('No approved members yet.', 'এখনও কোনো অনুমোদিত সদস্য নেই।')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-3 py-3 text-left">{t('common.member')}</th>
                {months.map((nm) => <th key={nm} className="px-2 py-3 text-center">{nm.slice(0, 3)}</th>)}
                <th className="px-2 py-3 text-center">{tr('Total', 'মোট')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m) => {
                const row = grid[m.id] ?? {};
                const total = Object.values(row).filter((c) => c.status === 'paid').reduce((s, c) => s + Number(c.amount), 0);
                return (
                  <tr key={m.id}>
                    <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-900">{m.full_name}</td>
                    {months.map((_, i) => {
                      const month = i + 1;
                      const c = row[month];
                      const paid = c?.status === 'paid';
                      const key = `${m.id}-${month}`;
                      return (
                        <td key={month} className="px-1 py-1 text-center">
                          <button
                            disabled={busy === key}
                            onClick={() => toggle(m.id, month)}
                            title={paid ? tr('Paid — click to mark due', 'পরিশোধিত — বকেয়া করতে ক্লিক') : tr('Due — click to mark cash paid', 'বকেয়া — নগদ পরিশোধে ক্লিক')}
                            className={`h-7 w-7 rounded text-[10px] font-bold ${paid ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                          >
                            {paid ? '✓' : '–'}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-semibold text-green-700">{fmt.money(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
