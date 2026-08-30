import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaDownload, FaMagnifyingGlass } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import type { CswoLedgerEntry } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const GREEN = '#4d7c0f';
const PAPER = '#ffffff';
const CREAM = '#faf6ef';

type EntryFilter = 'all' | 'donation' | 'contribution' | 'expense' | 'adjustment';
type DirFilter = 'all' | 'credit' | 'debit';
interface LedgerRow extends CswoLedgerEntry { actor?: { full_name: string } | null }

export default function AdminLedger() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [entry, setEntry] = useState<EntryFilter>('all');
  const [dir, setDir] = useState<DirFilter>('all');
  const [event, setEventFilter] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

  const pad = (n: number) => String(n).padStart(2, '0');
  const dtFull = (s: string) => { const d = new Date(s); return `${fmt.date(s)} · ${fmt.num(pad(d.getHours()))}:${fmt.num(pad(d.getMinutes()))}`; };

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('cswo_finance_ledger').select('*, actor:cswo_members(full_name)').order('occurred_at', { ascending: false }).limit(500);
    if (entry !== 'all') q = q.eq('entry_type', entry);
    if (dir !== 'all') q = q.eq('direction', dir);
    if (event === '__none') q = q.is('event_id', null);
    else if (event) q = q.eq('event_id', event);
    if (from) q = q.gte('occurred_at', from);
    if (to) q = q.lte('occurred_at', to + 'T23:59:59');
    const [ledR, evR] = await Promise.all([
      q,
      supabase.from('cswo_events').select('id,title').order('event_date', { ascending: false }),
    ]);
    setRows((ledR.data ?? []) as LedgerRow[]);
    setEvents((evR.data ?? []) as { id: string; title: string }[]);
    setLoading(false);
  }, [entry, dir, event, from, to]);
  useEffect(() => { load(); }, [load]);

  const eventName = (id: string | null) => events.find((x) => x.id === id)?.title ?? '—';

  // Allocation is edited on the source row; its trigger re-syncs the ledger.
  // The ledger is then re-read so what is on screen is what is actually stored,
  // and a rejected update says so instead of silently doing nothing.
  const [busy, setBusy] = useState<string | null>(null);
  const allocate = async (r: LedgerRow, eventId: string) => {
    const table = r.entry_type === 'donation' ? 'cswo_donations'
      : r.entry_type === 'expense' ? 'cswo_expenses' : null;
    if (!table || !r.source_id) {
      alert(tr('Only donations and expenses can be allocated to an event.', 'শুধু অনুদান ও ব্যয় অনুষ্ঠানে বরাদ্দ করা যায়।'));
      return;
    }
    setBusy(r.id);
    const { data, error } = await supabase
      .from(table)
      .update({ event_id: eventId || null })
      .eq('id', r.source_id)
      .select('id');
    setBusy(null);

    if (error) {
      alert(tr('Could not change the allocation: ', 'বরাদ্দ বদলানো যায়নি: ') + error.message);
      return;
    }
    if (!data || data.length === 0) {
      alert(tr(
        'The allocation was not saved — you may not have permission to edit this record.',
        'বরাদ্দ সংরক্ষণ হয়নি — এই রেকর্ড সম্পাদনার অনুমতি না-ও থাকতে পারে।',
      ));
      return;
    }
    await load();
  };
  const typeLabel = (t: CswoLedgerEntry['entry_type']) =>
    t === 'donation' ? tr('Donation', 'অনুদান') : t === 'contribution' ? tr('Monthly donation', 'মাসিক অনুদান') : t === 'expense' ? tr('Expense', 'ব্যয়') : tr('Adjustment', 'সমন্বয়');

  const filtered = useMemo(() => {
    const qq = search.trim().toLowerCase();
    return qq ? rows.filter((r) => r.note.toLowerCase().includes(qq)) : rows;
  }, [rows, search]);

  const totals = useMemo(() => {
    let credit = 0, debit = 0;
    for (const r of filtered) { if (r.direction === 'credit') credit += Number(r.amount); else debit += Number(r.amount); }
    return { credit, debit, net: credit - debit };
  }, [filtered]);

  const exportCSV = () => {
    const header = [tr('Date & time', 'তারিখ ও সময়'), tr('Type', 'ধরন'), tr('Event', 'অনুষ্ঠান'), tr('Note', 'বিবরণ'), tr('By', 'দ্বারা'), tr('Direction', 'দিক'), tr('Amount', 'পরিমাণ')];
    const body = filtered.map((r) => [dtFull(r.occurred_at), typeLabel(r.entry_type), eventName(r.event_id), r.note, r.actor?.full_name ?? 'System', r.direction, Number(r.amount)]);
    const csv = [header, ...body].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `cswo-ledger-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Finance', 'অর্থ')} · {tr('Ledger', 'লেজার')}</div>
          <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Transaction Ledger', 'লেনদেন লেজার')}</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Every credit and debit across donations, monthly donations and expenses — and the event each one is allocated to.', 'অনুদান, মাসিক অনুদান ও ব্যয়ের প্রতিটি জমা-খরচ — এবং কোন অনুষ্ঠানে বরাদ্দ, তা এখানেই।')}</p>
        </div>
        <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition-colors hover:bg-black/[0.03]" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
          <FaDownload className="h-3 w-3" /> {tr('Export CSV', 'CSV এক্সপোর্ট')}
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label={tr('Total credit', 'মোট জমা')} value={fmt.money(totals.credit)} color={GREEN} />
        <Stat label={tr('Total debit', 'মোট খরচ')} value={fmt.money(totals.debit)} color={BRAND} />
        <Stat label={tr('Net', 'নিট')} value={fmt.money(totals.net)} color={totals.net >= 0 ? GREEN : BRAND} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-[8px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <select value={entry} onChange={(e) => setEntry(e.target.value as EntryFilter)} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
          {(['all', 'donation', 'contribution', 'expense', 'adjustment'] as EntryFilter[]).map((v) => <option key={v} value={v}>{v === 'all' ? tr('All types', 'সব ধরন') : typeLabel(v as CswoLedgerEntry['entry_type'])}</option>)}
        </select>
        <select value={dir} onChange={(e) => setDir(e.target.value as DirFilter)} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
          <option value="all">{tr('Credit & debit', 'জমা ও খরচ')}</option>
          <option value="credit">{tr('Credit only', 'শুধু জমা')}</option>
          <option value="debit">{tr('Debit only', 'শুধু খরচ')}</option>
        </select>
        <select value={event} onChange={(e) => setEventFilter(e.target.value)} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
          <option value="">{tr('All events', 'সব অনুষ্ঠান')}</option>
          <option value="__none">{tr('Not allocated', 'অনির্ধারিত')}</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
        <div className="relative min-w-[180px] flex-1">
          <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: MUTED }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Search note…', 'বিবরণ খুঁজুন…')} className="w-full rounded-[6px] py-2 pl-9 pr-3 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
        </div>
      </div>

      {loading ? <TableSkeleton rows={10} /> : (
        <div className="overflow-x-auto rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <table className="w-full text-[13px]">
            <thead><tr style={{ borderBottom: `1px solid ${RULE}` }}>
              {[tr('Date & time', 'তারিখ ও সময়'), tr('Type', 'ধরন'), tr('Allocated to event', 'অনুষ্ঠানে বরাদ্দ'), tr('Note', 'বিবরণ'), tr('By', 'দ্বারা'), tr('Amount', 'পরিমাণ')].map((h, i) => (
                <th key={i} className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${i === 5 ? 'text-right' : 'text-left'}`} style={{ color: MUTED }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px]" style={{ color: MUTED }}>{dtFull(r.occurred_at)}</td>
                  <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: CREAM, color: INK2, border: `1px solid ${RULE}` }}>{typeLabel(r.entry_type)}</span></td>
                  <td className="px-4 py-3">
                    {r.entry_type === 'donation' || r.entry_type === 'expense' ? (
                      <select
                        value={r.event_id ?? ''}
                        disabled={busy === r.id}
                        onChange={(e) => allocate(r, e.target.value)}
                        className="max-w-[190px] rounded-[6px] px-2 py-1 text-[12px] outline-none disabled:opacity-50"
                        style={{ border: `1px solid ${RULE}`, background: r.event_id ? CREAM : PAPER, color: r.event_id ? INK : MUTED }}
                      >
                        <option value="">{tr('— Not allocated —', '— অনির্ধারিত —')}</option>
                        {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                      </select>
                    ) : (
                      <span style={{ color: MUTED }}>{eventName(r.event_id)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: INK }}>{r.note}</td>
                  <td className="px-4 py-3" style={{ color: MUTED }}>{r.actor?.full_name ?? tr('System', 'সিস্টেম')}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: r.direction === 'credit' ? GREEN : BRAND }}>{r.direction === 'credit' ? '+' : '−'}{fmt.money(Number(r.amount))}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No transactions match.', 'কোনো লেনদেন মেলেনি।')}</td></tr>}
            </tbody>
          </table>
        </div>
      )}
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
