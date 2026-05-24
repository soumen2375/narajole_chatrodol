import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Donation } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import { printReceipt, printCertificate } from '@/lib/receipt';

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
  const [onlyRecurring, setOnlyRecurring] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const pad = (n: number) => String(n).padStart(2, '0');
  const dtFull = (s: string) => { const d = new Date(s); return `${fmt.date(s)} · ${fmt.num(pad(d.getHours()))}:${fmt.num(pad(d.getMinutes()))}`; };
  const fyOf = (s: string) => { const d = new Date(s); const y = d.getFullYear(); return d.getMonth() + 1 >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`; };

  const [regs, setRegs] = useState({ reg80g: '', reg12a: '', orgPan: '' });
  useEffect(() => {
    supabase.from('cswo_compliance').select('ckey,reg_number').then(({ data }) => {
      const m = Object.fromEntries(((data ?? []) as { ckey: string; reg_number: string }[]).map((r) => [r.ckey, r.reg_number]));
      setRegs({ reg80g: m['80g'] ?? '', reg12a: m['12a'] ?? '', orgPan: m['pan'] ?? '' });
    });
  }, []);

  const handleCert = (d: DonationRow) => {
    printCertificate({
      receiptNumber: d.receipt_number ?? `DON-${d.id.slice(0, 8).toUpperCase()}`,
      name: d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? '—'),
      amount: Number(d.amount),
      date: fmt.date(d.created_at),
      fy: fyOf(d.created_at),
      purpose: d.purpose,
      paymentId: d.razorpay_payment_id,
      reg80g: regs.reg80g, reg12a: regs.reg12a, orgPan: regs.orgPan,
    }, lang);
  };

  useEffect(() => {
    setLoading(true);
    let q = supabase
      .from('cswo_donations')
      .select('*, member:cswo_members(full_name,email)')
      .order('created_at', { ascending: false });
    if (onlyPaid) q = q.eq('status', 'paid');
    if (onlyRecurring) q = q.eq('is_recurring', true);
    if (dateFrom) q = q.gte('created_at', dateFrom);
    if (dateTo) q = q.lte('created_at', dateTo + 'T23:59:59');
    q.then(({ data }) => {
      setDonations((data ?? []) as DonationRow[]);
      setLoading(false);
    });
  }, [onlyPaid, onlyRecurring, dateFrom, dateTo]);

  const setRecurring = async (id: string, val: boolean) => {
    await supabase.from('cswo_donations').update({ is_recurring: val }).eq('id', id);
    setDonations((ds) => ds.map((d) => (d.id === id ? { ...d, is_recurring: val } : d)));
  };

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
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlyRecurring}
            onChange={(e) => setOnlyRecurring(e.target.checked)}
          />
          {tr('Recurring (monthly) only', 'শুধুমাত্র মাসিক')}
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
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-600">{dtFull(d.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      {d.is_anonymous
                        ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক')
                        : d.donor_name || '—'}
                      {d.is_recurring && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                          {tr('Monthly', 'মাসিক')}
                        </span>
                      )}
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
                    <div className="flex items-center gap-3">
                      {d.status === 'paid' && (
                        <button
                          onClick={() => handleReceipt(d)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {tr('Receipt', 'রসিদ')}
                        </button>
                      )}
                      {d.status === 'paid' && (
                        <button
                          onClick={() => handleCert(d)}
                          className="text-xs font-medium text-emerald-700 hover:underline"
                        >
                          {tr('80G Cert', '৮০জি')}
                        </button>
                      )}
                      <button
                        onClick={() => setRecurring(d.id, !d.is_recurring)}
                        className={`text-xs hover:underline ${d.is_recurring ? 'text-amber-600' : 'text-gray-500'}`}
                      >
                        {d.is_recurring ? tr('Unmark monthly', 'মাসিক বাতিল') : tr('Mark monthly', 'মাসিক চিহ্নিত')}
                      </button>
                    </div>
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
