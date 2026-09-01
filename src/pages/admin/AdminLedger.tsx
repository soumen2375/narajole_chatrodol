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
const RED = '#b91c1c';
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
  // Bulk allocation. `defaultEvent` is remembered across reloads so a run of
  // donations from one camp is a tick-tick-tick-Allocate, not a dropdown each time.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [defaultEvent, setDefaultEvent] = useState<string>(() => localStorage.getItem('cswo.ledger.defaultEvent') ?? '');
  const [bulkBusy, setBulkBusy] = useState(false);
  const setDefault = (id: string) => {
    setDefaultEvent(id);
    if (id) localStorage.setItem('cswo.ledger.defaultEvent', id);
    else localStorage.removeItem('cswo.ledger.defaultEvent');
  };

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
      // Zero rows and no error means one of two very different things: RLS
      // filtered the row out, or the source record is simply gone — a ledger
      // entry can outlive the donation/expense it was built from. Blaming
      // permissions for both sends you hunting the wrong bug, so check which.
      const { data: source } = await supabase.from(table).select('id').eq('id', r.source_id).maybeSingle();
      alert(source
        ? tr(
            'The allocation was not saved — you may not have permission to edit this record.',
            'বরাদ্দ সংরক্ষণ হয়নি — এই রেকর্ড সম্পাদনার অনুমতি না-ও থাকতে পারে।',
          )
        : tr(
            `This entry cannot be allocated: the ${typeLabel(r.entry_type).toLowerCase()} record it was created from no longer exists, so there is nothing to attach the event to. The ledger entry itself is intact (${r.id}) — ask an administrator to restore the source record.`,
            `এই এন্ট্রি বরাদ্দ করা যাচ্ছে না: যে রেকর্ড থেকে এটি তৈরি হয়েছিল সেটি আর নেই, তাই অনুষ্ঠান যুক্ত করার কিছু নেই। লেজার এন্ট্রিটি ঠিক আছে (${r.id}) — উৎস রেকর্ডটি ফিরিয়ে আনতে প্রশাসকের সাহায্য নিন।`,
          ));
      return;
    }
    await load();
  };
  // Only donations and expenses carry an event; adjustments/contributions do not.
  const allocatable = (r: LedgerRow) => (r.entry_type === 'donation' || r.entry_type === 'expense') && !!r.source_id;

  const allocateSelected = async () => {
    const targets = filtered.filter((r) => selected.has(r.id) && allocatable(r));
    if (targets.length === 0) return;
    setBulkBusy(true);
    const results = await Promise.all(targets.map(async (r) => {
      const table = r.entry_type === 'donation' ? 'cswo_donations' : 'cswo_expenses';
      const { data, error } = await supabase.from(table)
        .update({ event_id: defaultEvent || null }).eq('id', r.source_id).select('id');
      return { r, ok: !error && !!data && data.length > 0, error };
    }));
    setBulkBusy(false);
    const failed = results.filter((x) => !x.ok);
    setSelected(new Set());
    await load();
    if (failed.length) {
      alert(tr(
        `${results.length - failed.length} of ${results.length} allocated. ${failed.length} could not be saved — their source donation or expense may no longer exist.`,
        `${fmt.num(results.length)}টির মধ্যে ${fmt.num(results.length - failed.length)}টি বরাদ্দ হয়েছে। ${fmt.num(failed.length)}টি সংরক্ষণ করা যায়নি।`,
      ));
    }
  };

  const typeLabel = (t: CswoLedgerEntry['entry_type']) =>
    t === 'donation' ? tr('Donation', 'অনুদান') : t === 'contribution' ? tr('Monthly donation', 'মাসিক অনুদান') : t === 'expense' ? tr('Expense', 'ব্যয়') : tr('Adjustment', 'সমন্বয়');

  const filtered = useMemo(() => {
    const qq = search.trim().toLowerCase();
    return qq ? rows.filter((r) => r.note.toLowerCase().includes(qq)) : rows;
  }, [rows, search]);

  const selectableCount = useMemo(() => filtered.filter(allocatable).length, [filtered]);

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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat label={tr('Total credit', 'মোট জমা')} value={fmt.money(totals.credit)} color={GREEN} />
        <Stat label={tr('Total debit', 'মোট খরচ')} value={fmt.money(totals.debit)} color={BRAND} />
        <Stat label={tr('Net', 'নিট')} value={fmt.money(totals.net)} color={totals.net >= 0 ? GREEN : BRAND} />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2.5 rounded-[8px] p-4 sm:flex sm:flex-wrap sm:items-center" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <select value={entry} onChange={(e) => setEntry(e.target.value as EntryFilter)} className="w-full min-w-0 rounded-[6px] px-3 py-2 text-[13px] outline-none sm:w-auto" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
          {(['all', 'donation', 'contribution', 'expense', 'adjustment'] as EntryFilter[]).map((v) => <option key={v} value={v}>{v === 'all' ? tr('All types', 'সব ধরন') : typeLabel(v as CswoLedgerEntry['entry_type'])}</option>)}
        </select>
        <select value={dir} onChange={(e) => setDir(e.target.value as DirFilter)} className="w-full min-w-0 rounded-[6px] px-3 py-2 text-[13px] outline-none sm:w-auto" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
          <option value="all">{tr('Credit & debit', 'জমা ও খরচ')}</option>
          <option value="credit">{tr('Credit only', 'শুধু জমা')}</option>
          <option value="debit">{tr('Debit only', 'শুধু খরচ')}</option>
        </select>
        <select value={event} onChange={(e) => setEventFilter(e.target.value)} className="w-full min-w-0 rounded-[6px] px-3 py-2 text-[13px] outline-none sm:w-auto" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
          <option value="">{tr('All events', 'সব অনুষ্ঠান')}</option>
          <option value="__none">{tr('Not allocated', 'অনির্ধারিত')}</option>
          {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full min-w-0 rounded-[6px] px-3 py-2 text-[13px] outline-none sm:w-auto" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full min-w-0 rounded-[6px] px-3 py-2 text-[13px] outline-none sm:w-auto" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
        <div className="relative col-span-2 min-w-0 sm:col-span-1 sm:min-w-[180px] sm:flex-1">
          <FaMagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2" style={{ color: MUTED }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr('Search note…', 'বিবরণ খুঁজুন…')} className="w-full rounded-[6px] py-2 pl-9 pr-3 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
        </div>
      </div>

      {/* Bulk allocation — tick the rows, pick the event once, apply. */}
      {!loading && (
        <div className="flex flex-col gap-3 rounded-[8px] p-4 sm:flex-row sm:items-center sm:gap-3" style={{ background: CREAM, border: `1px solid ${RULE}` }}>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Allocate to', 'বরাদ্দ করুন')}</span>
          <select
            value={defaultEvent}
            onChange={(e) => setDefault(e.target.value)}
            className="min-w-0 flex-1 rounded-[6px] px-3 py-2 text-[13px] font-semibold outline-none sm:max-w-[320px]"
            style={{ border: `1px solid ${RULE}`, background: PAPER, color: defaultEvent ? INK : MUTED }}
          >
            <option value="">{tr('— Not allocated —', '— অনির্ধারিত —')}</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
          </select>
          <button
            onClick={allocateSelected}
            disabled={bulkBusy || selectableCount === 0 || selected.size === 0}
            className="rounded-full px-4 py-2 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: BRAND }}
          >
            {bulkBusy
              ? tr('Allocating…', 'বরাদ্দ হচ্ছে…')
              : tr(`Allocate ${selected.size} selected`, `${fmt.num(selected.size)}টি বরাদ্দ করুন`)}
          </button>
          {selected.size > 0 && (
            <button onClick={() => setSelected(new Set())} className="text-[12.5px] font-semibold underline" style={{ color: MUTED }}>
              {tr('Clear', 'বাতিল')}
            </button>
          )}
          <span className="text-[12px] sm:ml-auto" style={{ color: MUTED }}>
            {tr('Ticked rows take the event above. Any row can still be changed on its own.', 'টিক করা সারিগুলো উপরের অনুষ্ঠানে যাবে। আলাদা করেও বদলানো যায়।')}
          </span>
        </div>
      )}

      {loading ? <TableSkeleton rows={10} /> : (
        <div className="overflow-x-auto rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <table className="w-full min-w-[960px] text-[13px]">
            <thead><tr style={{ borderBottom: `1px solid ${RULE}` }}>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label={tr('Select all allocatable rows', 'সব বরাদ্দযোগ্য সারি নির্বাচন')}
                  className="h-4 w-4 rounded"
                  checked={selectableCount > 0 && selected.size === selectableCount}
                  ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < selectableCount; }}
                  onChange={(e) => setSelected(e.target.checked ? new Set(filtered.filter(allocatable).map((r) => r.id)) : new Set())}
                />
              </th>
              {[tr('Date & time', 'তারিখ ও সময়'), tr('Type', 'ধরন'), tr('Allocated to event', 'অনুষ্ঠানে বরাদ্দ'), tr('Note', 'বিবরণ'), tr('By', 'দ্বারা'), tr('Amount', 'পরিমাণ')].map((h, i) => (
                <th key={i} className={`px-4 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${i === 5 ? 'text-right' : 'text-left'}`} style={{ color: MUTED }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: `1px solid ${RULE}`, background: selected.has(r.id) ? CREAM : undefined }}>
                  <td className="px-4 py-3">
                    {allocatable(r) && (
                      <input
                        type="checkbox"
                        aria-label={tr('Select this entry', 'এই এন্ট্রি নির্বাচন')}
                        className="h-4 w-4 rounded"
                        checked={selected.has(r.id)}
                        onChange={(e) => setSelected((prev) => {
                          const n = new Set(prev);
                          if (e.target.checked) n.add(r.id); else n.delete(r.id);
                          return n;
                        })}
                      />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px]" style={{ color: MUTED }}>{dtFull(r.occurred_at)}</td>
                  <td className="px-4 py-3"><span className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: CREAM, color: INK2, border: `1px solid ${RULE}` }}>{typeLabel(r.entry_type)}</span></td>
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
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: r.direction === 'credit' ? GREEN : RED }}>{fmt.money(Number(r.amount))}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No transactions match.', 'কোনো লেনদেন মেলেনি।')}</td></tr>}
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
