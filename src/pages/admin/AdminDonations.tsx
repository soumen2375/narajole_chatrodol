import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Donation } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';

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

  useEffect(() => {
    let q = supabase.from('cswo_donations').select('*, member:cswo_members(full_name,email)').order('created_at', { ascending: false });
    if (onlyPaid) q = q.eq('status', 'paid');
    q.then(({ data }) => {
      setDonations((data ?? []) as DonationRow[]);
      setLoading(false);
    });
  }, [onlyPaid]);

  const total = donations.filter((d) => d.status === 'paid').reduce((s, d) => s + Number(d.amount), 0);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t('a.donations')}</h1>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={onlyPaid} onChange={(e) => setOnlyPaid(e.target.checked)} />
          {tr('Successful payments only', 'শুধুমাত্র সফল পেমেন্ট')}
        </label>
      </div>

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
                <th className="px-4 py-3">{tr('Payment ID', 'পেমেন্ট আইডি')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {donations.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">{fmt.date(d.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : d.donor_name || '—'}</div>
                    <div className="text-xs text-gray-500">{d.donor_email || d.donor_phone || ''}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt.money(Number(d.amount))}</td>
                  <td className="px-4 py-3">{d.purpose || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{d.member ? d.member.full_name : '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-500">{d.razorpay_payment_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
