import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoRefund, Donation, RefundStatus } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const GREEN = '#4d7c0f';
const AMBER = '#b45309';
const PAPER = '#ffffff';

interface RefundRow extends CswoRefund {
  donation?: { donor_name: string | null; amount: number; receipt_number: string | null; is_anonymous: boolean } | null;
}
type PaidDon = Pick<Donation, 'id' | 'donor_name' | 'amount' | 'is_anonymous' | 'created_at'>;

const STATUS_META: Record<RefundStatus, { color: string }> = {
  requested: { color: AMBER }, approved: { color: '#1d4ed8' }, processed: { color: GREEN }, rejected: { color: BRAND },
};

export default function AdminRefunds() {
  const { member: me } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [rows, setRows] = useState<RefundRow[]>([]);
  const [paid, setPaid] = useState<PaidDon[]>([]);
  const [loading, setLoading] = useState(true);
  const [donationId, setDonationId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [rR, dR] = await Promise.all([
      supabase.from('cswo_refunds').select('*, donation:cswo_donations(donor_name,amount,receipt_number,is_anonymous)').order('created_at', { ascending: false }),
      supabase.from('cswo_donations').select('id,donor_name,amount,is_anonymous,created_at').eq('status', 'paid').order('created_at', { ascending: false }),
    ]);
    setRows((rR.data ?? []) as RefundRow[]);
    setPaid((dR.data ?? []) as PaidDon[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const statusLabel = (s: RefundStatus) =>
    ({ requested: tr('Requested', 'অনুরোধ'), approved: tr('Approved', 'অনুমোদিত'), processed: tr('Processed', 'সম্পন্ন'), rejected: tr('Rejected', 'প্রত্যাখ্যাত') }[s]);

  const create = async () => {
    if (!donationId || !amount) return;
    setBusy(true);
    await supabase.from('cswo_refunds').insert({ donation_id: donationId, amount: Number(amount), reason: reason.trim(), status: 'requested', requested_by: me?.id });
    setDonationId(''); setAmount(''); setReason('');
    setBusy(false);
    await load();
  };

  const setStatus = async (r: RefundRow, status: RefundStatus) => {
    const patch: Record<string, unknown> = { status };
    if (status === 'approved') patch.approved_by = me?.id;
    if (status === 'processed') {
      patch.processed_at = new Date().toISOString();
      if (r.donation_id) await supabase.from('cswo_donations').update({ status: 'refunded' }).eq('id', r.donation_id);
    }
    await supabase.from('cswo_refunds').update(patch).eq('id', r.id);
    await load();
  };

  const donorOf = (r: RefundRow) => r.donation?.is_anonymous ? tr('Anonymous', 'নাম গোপন') : (r.donation?.donor_name ?? '—');
  const pending = rows.filter((r) => r.status === 'requested' || r.status === 'approved').length;
  const processedTotal = rows.filter((r) => r.status === 'processed').reduce((s, r) => s + Number(r.amount), 0);

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Finance', 'অর্থ')} · {tr('Refunds', 'ফেরত')}</div>
        <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Refund Management', 'ফেরত ব্যবস্থাপনা')}</h1>
        <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Record and approve donation refunds. Processing marks the donation refunded and reverses it from the ledger.', 'দানের ফেরত নথিভুক্ত ও অনুমোদন করুন। সম্পন্ন করলে দান “ফেরত” চিহ্নিত হয় ও লেজার থেকে বাদ যায়।')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label={tr('Pending', 'অপেক্ষমাণ')} value={fmt.num(pending)} color={AMBER} />
        <Stat label={tr('Processed total', 'সম্পন্ন মোট')} value={fmt.money(processedTotal)} color={GREEN} />
        <Stat label={tr('Records', 'রেকর্ড')} value={fmt.num(rows.length)} color={INK} />
      </div>

      {/* Create */}
      <div className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('New refund', 'নতুন ফেরত')}</div>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <select value={donationId} onChange={(e) => { setDonationId(e.target.value); const d = paid.find((x) => x.id === e.target.value); if (d) setAmount(String(Number(d.amount))); }} className="min-w-[240px] flex-1 rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }}>
            <option value="">{tr('Select a paid donation…', 'একটি পরিশোধিত দান বেছে নিন…')}</option>
            {paid.map((d) => <option key={d.id} value={d.id}>{(d.is_anonymous ? tr('Anonymous', 'নাম গোপন') : d.donor_name || '—')} · {fmt.money(Number(d.amount))} · {fmt.date(d.created_at)}</option>)}
          </select>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={tr('Amount', 'পরিমাণ')} className="w-28 rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={tr('Reason', 'কারণ')} className="min-w-[160px] flex-1 rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <button onClick={create} disabled={busy || !donationId || !amount} className="rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: BRAND }}>{tr('Request refund', 'ফেরত অনুরোধ')}</button>
        </div>
        <p className="mt-2 text-[11px]" style={{ color: MUTED }}>{tr('Note: this records the refund. Process the actual money return through your payment gateway / bank separately.', 'দ্রষ্টব্য: এটি ফেরত নথিভুক্ত করে। প্রকৃত অর্থ ফেরত পেমেন্ট গেটওয়ে / ব্যাংকের মাধ্যমে আলাদাভাবে করুন।')}</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <table className="w-full text-[13px]">
          <thead><tr style={{ borderBottom: `1px solid ${RULE}` }}>
            {[tr('Date', 'তারিখ'), tr('Donor', 'দাতা'), tr('Amount', 'পরিমাণ'), tr('Reason', 'কারণ'), tr('Status', 'অবস্থা'), tr('Actions', 'কার্যক্রম')].map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUTED }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px]" style={{ color: MUTED }}>{fmt.date(r.created_at)}</td>
                <td className="px-4 py-3" style={{ color: INK }}>{donorOf(r)}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: BRAND }}>{fmt.money(Number(r.amount))}</td>
                <td className="max-w-[200px] truncate px-4 py-3" style={{ color: INK2 }}>{r.reason || '—'}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: STATUS_META[r.status].color }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_META[r.status].color }} />{statusLabel(r.status)}</span></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {r.status === 'requested' && <button onClick={() => setStatus(r, 'approved')} className="text-xs font-medium text-blue-700 hover:underline">{tr('Approve', 'অনুমোদন')}</button>}
                    {r.status === 'approved' && <button onClick={() => setStatus(r, 'processed')} className="text-xs font-medium text-green-700 hover:underline">{tr('Process', 'সম্পন্ন')}</button>}
                    {(r.status === 'requested' || r.status === 'approved') && <button onClick={() => setStatus(r, 'rejected')} className="text-xs font-medium text-red-600 hover:underline">{tr('Reject', 'প্রত্যাখ্যান')}</button>}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No refunds yet.', 'এখনো কোনো ফেরত নেই।')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[8px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1.5 text-[22px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
