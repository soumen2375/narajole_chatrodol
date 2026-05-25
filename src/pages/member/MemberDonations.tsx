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
import { Heart, Download } from 'lucide-react';

const BRAND  = '#0c756f'; // Deep Teal
const INK    = '#000201'; // Charcoal Black
const MUTED  = '#7a7c7b'; // Charcoal Muted
const RULE   = '#e5dec9'; // Warm Border
const SERIF  = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };

export default function MemberDonations() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [regs, setRegs] = useState({ reg80g: '', reg12a: '', orgPan: '' });
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const fyOf = (s: string) => { const d = new Date(s); const y = d.getFullYear(); return d.getMonth() + 1 >= 4 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`; };

  const pad = (n: number) => String(n).padStart(2, '0');
  const dtFull = (s: string) => { const d = new Date(s); return `${fmt.date(s)} · ${fmt.num(pad(d.getHours()))}:${fmt.num(pad(d.getMinutes()))}`; };

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
        <h1 className="text-2xl font-bold font-bengali-serif" style={{ ...SERIF, color: INK }}>{t('m.donations')}</h1>
        <Link 
          to="/donate" 
          className="flex items-center justify-center gap-2 rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 hover:-translate-y-[1px] shadow-sm text-white"
          style={{ background: BRAND }}
        >
          <Heart className="h-4 w-4 fill-white" />
          {tr('New donation', 'নতুন দান')}
        </Link>
      </div>

      <div 
        className="mb-6 rounded-2xl p-5 border shadow-sm card-lift"
        style={{ background: '#fff', borderColor: RULE }}
      >
        <p className="text-xs font-semibold" style={{ color: MUTED }}>{tr('My total donations', 'আমার মোট দান')}</p>
        <p className="text-3xl font-extrabold mt-1" style={{ color: BRAND }}>{fmt.money(total)}</p>
      </div>

      {donations.length === 0 ? (
        <p className="text-xs font-semibold py-8" style={{ color: MUTED }}>
          {tr('You have not made any donations yet.', 'আপনি এখনও কোনো দান করেননি।')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white border shadow-sm" style={{ borderColor: RULE }}>
          <table className="w-full text-xs text-left">
            <thead className="bg-[#faf9f6] text-gray-600 border-b" style={{ borderColor: RULE }}>
              <tr>
                <th className="px-4 py-3 font-bold uppercase">{t('common.date')}</th>
                <th className="px-4 py-3 font-bold uppercase">{t('common.amount')}</th>
                <th className="px-4 py-3 font-bold uppercase">{t('donate.purpose')}</th>
                <th className="px-4 py-3 font-bold uppercase">{t('common.status')}</th>
                <th className="px-4 py-3 font-bold uppercase text-right">{tr('Receipt', 'রসিদ')}</th>
              </tr>
            </thead>
            <tbody className="divide-y font-semibold" style={{ borderColor: RULE }}>
              {donations.map((d) => (
                <tr 
                  key={d.id} 
                  className="hover:bg-[#fdf8eb] transition-colors duration-155"
                >
                  <td className="px-4 py-3 font-mono text-[11px]" style={{ color: MUTED }}>
                    {dtFull(d.created_at)}
                  </td>
                  <td className="px-4 py-3 font-extrabold text-sm" style={{ color: INK }}>{fmt.money(Number(d.amount))}</td>
                  <td className="px-4 py-3" style={{ color: INK }}>{d.purpose || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-right">
                    {d.status === 'paid' ? (
                      <div className="flex items-center justify-end gap-3">
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
                          className="inline-flex items-center gap-1 font-extrabold text-blue-600 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
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
                          className="inline-flex items-center gap-1 font-extrabold text-emerald-700 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {tr('80G Cert', '৮০জি')}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-normal">—</span>
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
