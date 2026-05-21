import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Donation } from '@/types';
import { formatCurrency, formatDateBn, toBengaliDigits } from '@/lib/format';
import Spinner from '@/components/ui/Spinner';
import StatusBadge from '@/components/ui/StatusBadge';

interface DonationRow extends Omit<Donation, 'member'> {
  member?: { full_name: string; email: string } | null;
}

export default function AdminDonations() {
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyPaid, setOnlyPaid] = useState(true);

  useEffect(() => {
    let q = supabase
      .from('cswo_donations')
      .select('*, member:cswo_members(full_name,email)')
      .order('created_at', { ascending: false });
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
        <h1 className="text-2xl font-bold text-gray-900">দান রেকর্ড</h1>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={onlyPaid} onChange={(e) => setOnlyPaid(e.target.checked)} />
          শুধুমাত্র সফল পেমেন্ট
        </label>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">মোট সংগৃহীত</p>
          <p className="text-2xl font-extrabold text-amber-600">{formatCurrency(total)}</p>
        </div>
        <div className="rounded-lg bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">মোট রেকর্ড</p>
          <p className="text-2xl font-extrabold text-blue-600">{toBengaliDigits(donations.length)}</p>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : donations.length === 0 ? (
        <p className="text-gray-600">কোনো দান রেকর্ড নেই।</p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">তারিখ</th>
                <th className="px-4 py-3">দাতা</th>
                <th className="px-4 py-3">পরিমাণ</th>
                <th className="px-4 py-3">উদ্দেশ্য</th>
                <th className="px-4 py-3">সদস্য?</th>
                <th className="px-4 py-3">অবস্থা</th>
                <th className="px-4 py-3">পেমেন্ট আইডি</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {donations.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">{formatDateBn(d.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {d.is_anonymous ? 'নাম প্রকাশ অনিচ্ছুক' : d.donor_name || '—'}
                    </div>
                    <div className="text-xs text-gray-500">{d.donor_email || d.donor_phone || ''}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(Number(d.amount))}</td>
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
