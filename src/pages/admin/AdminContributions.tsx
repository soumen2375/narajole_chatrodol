import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Member, MonthlyContribution } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

type Tab = 'grid' | 'defaulters';

interface DefaulterRow {
  member: Member;
  unpaidMonths: number[];
  totalDue: number;
}

export default function AdminContributions() {
  const { member: me } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const months = fmt.months();
  const currentYear = new Date().getFullYear();

  const [tab, setTab] = useState<Tab>('grid');
  const [members, setMembers] = useState<Member[]>([]);
  const [year, setYear] = useState(currentYear);
  const [defaultAmount, setDefaultAmount] = useState(100);
  const [grid, setGrid] = useState<Record<string, Record<number, MonthlyContribution>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkMonth, setBulkMonth] = useState<number>(new Date().getMonth() + 1);
  const [bulkBusy, setBulkBusy] = useState(false);

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

  useEffect(() => { load(); }, [load]);

  const toggle = async (memberId: string, month: number) => {
    const key = `${memberId}-${month}`;
    setBusy(key);
    const existing = grid[memberId]?.[month];
    const isPaid = existing?.status === 'paid';
    const amount = existing?.amount ? Number(existing.amount) : defaultAmount;
    await supabase.from('cswo_monthly_contributions').upsert(
      {
        member_id: memberId,
        year,
        month,
        amount,
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

  const bulkMarkPaid = async () => {
    if (!window.confirm(
      tr(
        `Mark all members as paid for month ${months[bulkMonth - 1]} ${year}?`,
        `${months[bulkMonth - 1]} ${year} মাসের সব সদস্যকে পরিশোধিত চিহ্নিত করবেন?`,
      ),
    )) return;
    setBulkBusy(true);
    const unpaid = members.filter((m) => grid[m.id]?.[bulkMonth]?.status !== 'paid');
    await Promise.all(
      unpaid.map((m) =>
        supabase.from('cswo_monthly_contributions').upsert(
          {
            member_id: m.id,
            year,
            month: bulkMonth,
            amount: defaultAmount,
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_method: 'cash',
            recorded_by: me?.id,
          },
          { onConflict: 'member_id,year,month' },
        ),
      ),
    );
    await load();
    setBulkBusy(false);
  };

  // For the current year only count months that have already passed (no future months).
  const maxMonth = year === currentYear ? new Date().getMonth() + 1 : 12;

  const defaulters = members.reduce<DefaulterRow[]>((acc, m) => {
    const row = grid[m.id] ?? {};
    const unpaidMonths = Array.from({ length: maxMonth }, (_, i) => i + 1).filter(
      (mo) => !row[mo] || row[mo].status !== 'paid',
    );
    if (unpaidMonths.length > 0) {
      acc.push({ member: m, unpaidMonths, totalDue: unpaidMonths.length * defaultAmount });
    }
    return acc;
  }, []);

  const exportDefaultersCSV = () => {
    const header = [tr('Name', 'নাম'), tr('Email', 'ইমেল'), tr('Unpaid months', 'বকেয়া মাস'), tr('Est. due (₹)', 'আনুমানিক বকেয়া (₹)')];
    const rows = defaulters.map((d) => [
      d.member.full_name,
      d.member.email,
      d.unpaidMonths.map((m) => months[m - 1]).join('; '),
      d.totalDue,
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cswo-defaulters-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const years = [currentYear, currentYear - 1, currentYear - 2];

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{t('a.contributions')}</h1>

      {/* toolbar */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t('common.year')}</label>
          <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{fmt.num(y)}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {tr('Default amount (₹)', 'ডিফল্ট চাঁদা (₹)')}
          </label>
          <input
            type="number"
            className="input w-28"
            value={defaultAmount}
            onChange={(e) => setDefaultAmount(Number(e.target.value))}
          />
        </div>
        {/* bulk mark paid */}
        <div className="flex items-end gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {tr('Bulk mark paid', 'একসাথে পরিশোধিত')}
            </label>
            <select
              className="input"
              value={bulkMonth}
              onChange={(e) => setBulkMonth(Number(e.target.value))}
            >
              {months.map((nm, i) => <option key={i + 1} value={i + 1}>{nm}</option>)}
            </select>
          </div>
          <button
            onClick={bulkMarkPaid}
            disabled={bulkBusy}
            className="btn-secondary text-sm"
          >
            {bulkBusy ? tr('Working…', 'কাজ হচ্ছে…') : tr('Mark all paid', 'সবাইকে পরিশোধিত')}
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setTab('grid')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'grid' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {tr('Payment grid', 'পেমেন্ট গ্রিড')}
        </button>
        <button
          onClick={() => setTab('defaulters')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === 'defaulters' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
        >
          {tr('Defaulters', 'বকেয়াদার')}
          {defaulters.length > 0 && (
            <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] text-white">
              {fmt.num(defaulters.length)}
            </span>
          )}
        </button>
      </div>

      {/* --- payment grid tab --- */}
      {tab === 'grid' && (
        members.length === 0 ? (
          <p className="text-gray-600">{tr('No approved members yet.', 'এখনও কোনো অনুমোদিত সদস্য নেই।')}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="sticky left-0 z-10 bg-gray-50 px-3 py-3 text-left">
                    {t('common.member')}
                  </th>
                  {months.map((nm) => (
                    <th key={nm} className="px-2 py-3 text-center">{nm.slice(0, 3)}</th>
                  ))}
                  <th className="px-2 py-3 text-center">{tr('Total', 'মোট')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map((m) => {
                  const row = grid[m.id] ?? {};
                  const total = Object.values(row)
                    .filter((c) => c.status === 'paid')
                    .reduce((s, c) => s + Number(c.amount), 0);
                  return (
                    <tr key={m.id}>
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-900">
                        {m.full_name}
                      </td>
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
                              title={
                                paid
                                  ? tr('Paid — click to mark due', 'পরিশোধিত — বকেয়া করতে ক্লিক')
                                  : tr('Due — click to mark cash paid', 'বকেয়া — নগদ পরিশোধে ক্লিক')
                              }
                              className={`h-7 w-7 rounded text-[10px] font-bold ${paid ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                            >
                              {paid ? '✓' : '–'}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-2 py-2 text-center font-semibold text-green-700">
                        {fmt.money(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* --- defaulters tab --- */}
      {tab === 'defaulters' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {tr(
                `${defaulters.length} member(s) have unpaid months in ${year}.`,
                `${year} সালে ${fmt.num(defaulters.length)} জন সদস্যের বকেয়া আছে।`,
              )}
            </p>
            {defaulters.length > 0 && (
              <button onClick={exportDefaultersCSV} className="btn-secondary text-sm">
                {tr('Export CSV', 'CSV ডাউনলোড')}
              </button>
            )}
          </div>

          {defaulters.length === 0 ? (
            <p className="rounded-xl bg-green-50 p-6 text-center text-green-700">
              {tr('No defaulters! All members are up to date.', 'কোনো বকেয়া নেই! সকল সদস্য আপডেটেড।')}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3">{t('common.member')}</th>
                    <th className="px-4 py-3">{t('common.email')}</th>
                    <th className="px-4 py-3">{tr('Unpaid months', 'বকেয়া মাস')}</th>
                    <th className="px-4 py-3">{tr('Count', 'সংখ্যা')}</th>
                    <th className="px-4 py-3">{tr('Est. due', 'আনুমানিক বকেয়া')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {defaulters
                    .sort((a, b) => b.unpaidMonths.length - a.unpaidMonths.length)
                    .map(({ member, unpaidMonths, totalDue }) => (
                      <tr key={member.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">{member.full_name}</td>
                        <td className="px-4 py-3 text-gray-500">{member.email}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {unpaidMonths.map((m) => (
                              <span
                                key={m}
                                className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700"
                              >
                                {months[m - 1].slice(0, 3)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-red-600">
                          {fmt.num(unpaidMonths.length)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-red-700">
                          {fmt.money(totalDue)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
