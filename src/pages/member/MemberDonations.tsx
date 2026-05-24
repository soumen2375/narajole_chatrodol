import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Donation } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import { printReceipt, printCertificate } from '@/lib/receipt';

export default function MemberDonations() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [regs, setRegs] = useState({ reg80g: '', reg12a: '', orgPan: '' });
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const fyOf = (s: string) => { const d = new Date(s); const y = d.getFullYear(); return d.getMonth() + 1 >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`; };

  useEffect(() => {
    if (!member) return;
    supabase.from('cswo_donations').select('*').eq('member_id', member.id).order('created_at', { ascending: false }).then(({ data }) => {
      setDonations((data ?? []) as Donation[]);
      setLoading(false);
    });
    supabase.from('cswo_compliance').select('ckey,reg_number').then(({ data }) => {
      const m = Object.fromEntries(((data ?? []) as { ckey: string; reg_number: string }[]).map((r) => [r.ckey, r.reg_number]));
      setRegs({ reg80g: m['80g'] ?? '', reg12a: m['12a'] ?? '', orgPan: m['pan'] ?? '' });
    });
  }, [member]);

  const total = donations.filter((d) => d.status === 'paid').reduce((s, d) => s + Number(d.amount), 0);

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('m.donations')}</h1>
        <Link to="/donate" className="btn-primary">{tr('New donation', 'নতুন দান')}</Link>
      </div>

      <div className="mb-6 rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <p className="text-sm text-gray-500">{tr('My total donations', 'আমার মোট দান')}</p>
        <p className="text-3xl font-extrabold text-amber-600">{fmt.money(total)}</p>
      </div>

      {donations.length === 0 ? (
        <p className="text-gray-600">{tr('You have not made any donations yet.', 'আপনি এখনও কোনো দান করেননি।')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">{t('common.date')}</th>
                <th className="px-4 py-3">{t('common.amount')}</th>
                <th className="px-4 py-3">{t('donate.purpose')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3">{tr('Receipt', 'রসিদ')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {donations.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">{fmt.date(d.created_at)}</td>
                  <td className="px-4 py-3 font-semibold">{fmt.money(Number(d.amount))}</td>
                  <td className="px-4 py-3">{d.purpose || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3">
                    {d.status === 'paid' ? (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            printReceipt(
                              {
                                receiptNumber: d.receipt_number ?? `DON-${d.id.slice(0, 8).toUpperCase()}`,
                                type: 'donation',
                                name: d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? ''),
                                email: d.donor_email,
                                amount: Number(d.amount),
                                date: fmt.date(d.created_at),
                                purpose: d.purpose,
                                paymentMethod: d.razorpay_payment_id ? 'Razorpay' : tr('Offline', 'অফলাইন'),
                                paymentId: d.razorpay_payment_id,
                              },
                              lang,
                            )
                          }
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {tr('Receipt', 'রসিদ')}
                        </button>
                        <button
                          onClick={() =>
                            printCertificate(
                              {
                                receiptNumber: d.receipt_number ?? `DON-${d.id.slice(0, 8).toUpperCase()}`,
                                name: d.is_anonymous ? tr('Anonymous', 'নাম প্রকাশ অনিচ্ছুক') : (d.donor_name ?? ''),
                                amount: Number(d.amount),
                                date: fmt.date(d.created_at),
                                fy: fyOf(d.created_at),
                                purpose: d.purpose,
                                paymentId: d.razorpay_payment_id,
                                reg80g: regs.reg80g, reg12a: regs.reg12a, orgPan: regs.orgPan,
                              },
                              lang,
                            )
                          }
                          className="text-xs font-medium text-emerald-700 hover:underline"
                        >
                          {tr('80G Cert', '৮০জি')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
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
