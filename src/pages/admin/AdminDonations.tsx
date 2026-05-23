import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Donation } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import { printReceipt } from '@/lib/receipt';

interface DonationRow extends Omit<Donation, 'member'> {
  member?: { full_name: string; email: string } | null;
}

export default function AdminDonations() {
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyPaid, setOnlyPaid] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from('cswo_donations')
      .select('*, member:cswo_members(full_name,email)')
      .order('created_at', { ascending: false });
    if (onlyPaid) q = q.eq('status', 'paid');
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
    q.then(({ data }) => {
      setDonations((data ?? []) as DonationRow[]);
      setLoading(false);
    });
  }, [onlyPaid, dateFrom, dateTo]);

  const total = donations
    .filter((d) => d.status === 'paid')
    .reduce((s, d) => s + Number(d.amount), 0);

  const handleReceipt = (d: DonationRow) => {
    printReceipt(
      {
        receiptNumber: d.receipt_number ?? `DON-${d.id.slice(0, 8).toUpperCase()}`,
        type: 'donation',
        name: d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? '—'),
        email: d.donor_email,
        amount: Number(d.amount),
        date: fmt.date(d.created_at),
        purpose: d.purpose,
        paymentMethod: d.razorpay_payment_id ? 'Razorpay' : tr('Offline', 'অফলাইন'),
        paymentId: d.razorpay_payment_id,
      },
      lang,
    );
  };

  const exportCSV = () => {
    const header = [
      tr('Date', 'তারিখ'),
      tr('Donor', 'দাতা'),
      tr('Email', 'ইমেল'),
      tr('Amount (₹)', 'পরিমাণ (₹)'),
      tr('Purpose', 'উদ্দেশ্য'),
      tr('Status', 'অবস্থা'),
      tr('Receipt No.', 'রসিদ নং'),
      tr('Payment ID', 'পেমেন্ট আইডি'),
    ];
    const rows = donations.map((d) => [
      d.created_at.slice(0, 10),
      d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? ''),
      d.donor_email ?? '',
      d.amount,
      d.purpose ?? '',
      d.status,
      d.receipt_number ?? '',
      d.razorpay_payment_id ?? '',
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cswo-donations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('a.donations')}</h1>
        <button onClick={exportCSV} className="btn-secondary text-sm">
          {tr('Export CSV', 'CSV ডাউনলোড')}
        </button>
      </div>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{tr('Total raised', 'মোট সংগৃহীত')}</p>
          <p className="text-2xl font-extrabold text-amber-600">{fmt.money(total)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{tr('Records', 'রেকর্ড')}</p>
          <p className="text-2xl font-extrabold text-blue-600">{fmt.num(donations.length)}</p>
        </div>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyPaid}
            onChange={(e) => setOnlyPaid(e.target.checked)}
          />
          {tr('Successful payments only', 'শুধুমাত্র সফল পেমেন্ট')}
        </label>
        <div>
          <label className="mb-1 block text-xs text-gray-500">{tr('From', 'থেকে')}</label>
          <input
            type="date"
            className="input text-sm"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">{tr('To', 'পর্যন্ত')}</label>
          <input
            type="date"
            className="input text-sm"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs text-gray-500 hover:underline"
          >
            {tr('Clear dates', 'তারিখ মুছুন')}
          </button>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : donations.length === 0 ? (
        <p className="text-gray-600">{tr('No donation records.', 'কোনো দান রেকর্ড নেই।')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">{t('common.date')}</th>
                <th className="px-4 py-3">{tr('Donor', 'দাতা')}</th>
                <th className="px-4 py-3">{t('common.amount')}</th>
                <th className="px-4 py-3">{t('donate.purpose')}</th>
                <th className="px-4 py-3">{t('common.member')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3">{tr('Receipt No.', 'রসিদ নং')}</th>
                <th className="px-4 py-3">{tr('Actions', 'কার্যক্রম')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {donations.map((d) => (
                <tr key={d.id}>
                  <td className="whitespace-nowrap px-4 py-3">{fmt.date(d.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {d.is_anonymous
                        ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক')
                        : d.donor_name || '—'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {d.donor_email || d.donor_phone || ''}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt.money(Number(d.amount))}</td>
                  <td className="px-4 py-3">{d.purpose || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.member ? d.member.full_name : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {d.receipt_number ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {d.status === 'paid' && (
                      <button
                        onClick={() => handleReceipt(d)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {tr('Receipt', 'রসিদ')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
