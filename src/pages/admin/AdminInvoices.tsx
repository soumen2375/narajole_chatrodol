import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDate, useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';
import { printInvoice } from '@/lib/invoice';
import type {
  CswoBankAccount,
  CswoInvoice,
  CswoInvoiceItem,
  CswoPaymentMethod,
  InvoiceStatus,
} from '@/types';

const PM_LABELS: Record<CswoPaymentMethod, { en: string; bn: string }> = {
  cash:          { en: 'Cash',          bn: 'নগদ' },
  bank_transfer: { en: 'Bank transfer', bn: 'ব্যাংক ট্রান্সফার' },
  upi:           { en: 'UPI',           bn: 'UPI' },
  cheque:        { en: 'Cheque',        bn: 'চেক' },
  online:        { en: 'Online',        bn: 'অনলাইন' },
  other:         { en: 'Other',         bn: 'অন্যান্য' },
};

const STATUS_LABELS: Record<InvoiceStatus, { en: string; bn: string }> = {
  draft:     { en: 'Draft',     bn: 'খসড়া' },
  unpaid:    { en: 'Unpaid',    bn: 'বকেয়া' },
  partial:   { en: 'Partial',   bn: 'আংশিক' },
  paid:      { en: 'Paid',      bn: 'পরিশোধিত' },
  cancelled: { en: 'Cancelled', bn: 'বাতিল' },
};

type ItemRow = { description: string; quantity: string; rate: string };

type Form = {
  bill_to_name: string;
  bill_to_email: string;
  bill_to_phone: string;
  bill_to_address: string;
  issue_date: string;
  due_date: string;
  event_id: string;
  payment_method: CswoPaymentMethod;
  bank_account_id: string;
  payment_ref: string;
  discount: string;
  round_off: string;
  amount_paid: string;
  status: InvoiceStatus;
  notes: string;
  items: ItemRow[];
};

const EMPTY_ITEM: ItemRow = { description: '', quantity: '1', rate: '' };

const emptyForm = (): Form => ({
  bill_to_name: '',
  bill_to_email: '',
  bill_to_phone: '',
  bill_to_address: '',
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: '',
  event_id: '',
  payment_method: 'upi',
  bank_account_id: '',
  payment_ref: '',
  discount: '0',
  round_off: '0',
  amount_paid: '0',
  status: 'draft',
  notes: '',
  items: [{ ...EMPTY_ITEM }],
});

const n = (v: string | number | null | undefined) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

/** Bills stay `draft`/`cancelled` when told to; otherwise the money decides. */
function derivedStatus(chosen: InvoiceStatus, total: number, paid: number): InvoiceStatus {
  if (chosen === 'draft' || chosen === 'cancelled') return chosen;
  if (total > 0 && paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

export default function AdminInvoices() {
  const { member: me } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [invoices, setInvoices] = useState<CswoInvoice[]>([]);
  const [items, setItems] = useState<CswoInvoiceItem[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; event_code: string | null }[]>([]);
  const [banks, setBanks] = useState<CswoBankAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CswoInvoice | null>(null);
  const [form, setForm] = useState<Form>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [inv, it, ev, ba] = await Promise.all([
      supabase
        .from('cswo_invoices')
        .select('*')
        .order('issue_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('cswo_invoice_items').select('*').order('sort_order'),
      supabase.from('cswo_events').select('id,title,event_code').order('event_date', { ascending: false }),
      supabase.from('cswo_bank_accounts').select('*').eq('is_active', true).order('sort_order'),
    ]);
    setInvoices((inv.data ?? []) as CswoInvoice[]);
    setItems((it.data ?? []) as CswoInvoiceItem[]);
    setEvents((ev.data ?? []) as { id: string; title: string; event_code: string | null }[]);
    setBanks((ba.data ?? []) as CswoBankAccount[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const itemsOf = useCallback(
    (invoiceId: string) => items.filter((i) => i.invoice_id === invoiceId),
    [items],
  );

  // ── form maths (live totals in the editor) ────────────────────────────────
  const formLines = form.items.map((r) => ({
    description: r.description.trim(),
    quantity: n(r.quantity),
    rate: n(r.rate),
    amount: Math.round(n(r.quantity) * n(r.rate) * 100) / 100,
  }));
  const formSubtotal = Math.round(formLines.reduce((s, l) => s + l.amount, 0) * 100) / 100;
  const formTotal = Math.max(0, Math.round((formSubtotal - n(form.discount) + n(form.round_off)) * 100) / 100);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm(), bank_account_id: banks[0]?.id ?? '' });
    setErr('');
    setShowModal(true);
  };

  const openEdit = (inv: CswoInvoice) => {
    const rows = itemsOf(inv.id);
    setEditing(inv);
    setForm({
      bill_to_name: inv.bill_to_name,
      bill_to_email: inv.bill_to_email,
      bill_to_phone: inv.bill_to_phone,
      bill_to_address: inv.bill_to_address,
      issue_date: inv.issue_date,
      due_date: inv.due_date ?? '',
      event_id: inv.event_id ?? '',
      payment_method: inv.payment_method,
      bank_account_id: inv.bank_account_id ?? '',
      payment_ref: inv.payment_ref,
      discount: String(inv.discount),
      round_off: String(inv.round_off),
      amount_paid: String(inv.amount_paid),
      status: inv.status,
      notes: inv.notes,
      items: rows.length
        ? rows.map((r) => ({ description: r.description, quantity: String(r.quantity), rate: String(r.rate) }))
        : [{ ...EMPTY_ITEM }],
    });
    setErr('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const setItem = (idx: number, patch: Partial<ItemRow>) =>
    setForm((f) => ({ ...f, items: f.items.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));
  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (idx: number) =>
    setForm((f) => ({ ...f, items: f.items.length > 1 ? f.items.filter((_, i) => i !== idx) : f.items }));

  const save = async () => {
    if (!form.bill_to_name.trim()) {
      setErr(tr('Billed-to name is required.', 'বিল কার নামে, তা আবশ্যিক।'));
      return;
    }
    const lines = formLines.filter((l) => l.description || l.amount > 0);
    if (lines.length === 0) {
      setErr(tr('Add at least one line item.', 'অন্তত একটি আইটেম যোগ করুন।'));
      return;
    }
    setSaving(true);
    setErr('');

    const paid = n(form.amount_paid);
    const payload = {
      bill_to_name: form.bill_to_name.trim(),
      bill_to_email: form.bill_to_email.trim(),
      bill_to_phone: form.bill_to_phone.trim(),
      bill_to_address: form.bill_to_address.trim(),
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      event_id: form.event_id || null,
      payment_method: form.payment_method,
      bank_account_id: form.bank_account_id || null,
      payment_ref: form.payment_ref.trim(),
      subtotal: formSubtotal,
      discount: n(form.discount),
      round_off: n(form.round_off),
      total: formTotal,
      amount_paid: paid,
      status: derivedStatus(form.status, formTotal, paid),
      notes: form.notes.trim(),
      recorded_by: me?.id ?? null,
    };

    let invoiceId = editing?.id ?? '';
    if (editing) {
      const { error } = await supabase.from('cswo_invoices').update(payload).eq('id', editing.id);
      if (error) { setSaving(false); setErr(error.message); return; }
    } else {
      const { data, error } = await supabase.from('cswo_invoices').insert(payload).select('id').single();
      if (error || !data) { setSaving(false); setErr(error?.message ?? 'Insert failed'); return; }
      invoiceId = data.id;
    }

    // Write the new lines before dropping the old ones, so a failed insert
    // leaves the bill with its previous items rather than none at all.
    const staleIds = editing ? itemsOf(editing.id).map((i) => i.id) : [];
    const { error: itemErr } = await supabase.from('cswo_invoice_items').insert(
      lines.map((l, i) => ({
        invoice_id: invoiceId,
        sort_order: i,
        description: l.description,
        quantity: l.quantity,
        rate: l.rate,
        amount: l.amount,
      })),
    );
    if (itemErr) { setSaving(false); setErr(itemErr.message); return; }
    if (staleIds.length) await supabase.from('cswo_invoice_items').delete().in('id', staleIds);
    setSaving(false);
    closeModal();
    await load();
  };

  const markPaid = async (inv: CswoInvoice) => {
    await supabase
      .from('cswo_invoices')
      .update({ amount_paid: Number(inv.total), status: 'paid' })
      .eq('id', inv.id);
    await load();
  };

  const remove = async (inv: CswoInvoice) => {
    if (!window.confirm(tr(`Delete bill ${inv.invoice_number}?`, `${inv.invoice_number} বিলটি মুছবেন?`))) return;
    await supabase.from('cswo_invoices').delete().eq('id', inv.id);
    await load();
  };

  const printBill = (inv: CswoInvoice) => {
    const bank = banks.find((b) => b.id === inv.bank_account_id);
    printInvoice({
      invoiceNumber: inv.invoice_number,
      billToName: inv.bill_to_name,
      billToEmail: inv.bill_to_email,
      billToPhone: inv.bill_to_phone,
      billToAddress: inv.bill_to_address,
      // The printed bill is the organisation's English-language document, so it
      // keeps English digits and month names regardless of the UI language.
      date: formatDate(inv.issue_date, 'en'),
      dueDate: inv.due_date ? formatDate(inv.due_date, 'en') : null,
      paymentMode: PM_LABELS[inv.payment_method].en,
      paymentRef: inv.payment_ref,
      items: itemsOf(inv.id).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        rate: Number(i.rate),
        amount: Number(i.amount),
      })),
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      roundOff: Number(inv.round_off),
      total: Number(inv.total),
      amountPaid: Number(inv.amount_paid),
      notes: inv.notes,
      bank: bank
        ? {
            account_name: bank.account_name,
            account_number: bank.account_number,
            ifsc: bank.ifsc,
            branch: bank.branch,
          }
        : null,
    });
  };

  // ── filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (filterStatus && inv.status !== filterStatus) return false;
      if (fromDate && inv.issue_date < fromDate) return false;
      if (toDate && inv.issue_date > toDate) return false;
      if (q) {
        const hay = [inv.invoice_number, inv.bill_to_name, inv.payment_ref, inv.notes]
          .join(' ')
          .toLowerCase();
        const inItems = itemsOf(inv.id).some((i) => i.description.toLowerCase().includes(q));
        if (!hay.includes(q) && !inItems) return false;
      }
      return true;
    });
  }, [invoices, filterStatus, fromDate, toDate, search, itemsOf]);

  const stats = useMemo(() => {
    const live = filtered.filter((i) => i.status !== 'cancelled' && i.status !== 'draft');
    const billed = live.reduce((s, i) => s + Number(i.total), 0);
    const paid = live.reduce((s, i) => s + Number(i.amount_paid), 0);
    return { billed, paid, due: billed - paid, count: filtered.length };
  }, [filtered]);


  // ── Excel-friendly exports ────────────────────────────────────────────────
  const downloadCsv = (rows: (string | number)[][], filename: string) => {
    const csv = rows
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportRegister = () => {
    const header = [
      'Bill No.', 'Date', 'Due date', 'Billed to', 'Email', 'Phone',
      'Payment mode', 'Reference', 'Items', 'Subtotal', 'Discount', 'Round off',
      'Total', 'Paid', 'Balance', 'Status', 'Notes',
    ];
    const body = filtered.map((i) => [
      i.invoice_number,
      i.issue_date,
      i.due_date ?? '',
      i.bill_to_name,
      i.bill_to_email,
      i.bill_to_phone,
      PM_LABELS[i.payment_method].en,
      i.payment_ref,
      itemsOf(i.id).length,
      Number(i.subtotal),
      Number(i.discount),
      Number(i.round_off),
      Number(i.total),
      Number(i.amount_paid),
      Number(i.total) - Number(i.amount_paid),
      STATUS_LABELS[i.status].en,
      i.notes.replace(/\r?\n/g, ' '),
    ]);
    const totals = [
      'TOTAL', '', '', '', '', '', '', '', '', '',
      filtered.reduce((s, i) => s + Number(i.subtotal), 0),
      filtered.reduce((s, i) => s + Number(i.discount), 0),
      filtered.reduce((s, i) => s + Number(i.round_off), 0),
      filtered.reduce((s, i) => s + Number(i.total), 0),
      filtered.reduce((s, i) => s + Number(i.amount_paid), 0),
      filtered.reduce((s, i) => s + Number(i.total) - Number(i.amount_paid), 0),
      '', '',
    ];
    downloadCsv([header, ...body, totals], `cswo-bills-register-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const exportItems = () => {
    const header = [
      'Bill No.', 'Date', 'Billed to', 'Status', '#', 'Description', 'Qty', 'Rate', 'Amount',
    ];
    const body: (string | number)[][] = [];
    filtered.forEach((i) => {
      itemsOf(i.id).forEach((it, idx) => {
        body.push([
          i.invoice_number,
          i.issue_date,
          i.bill_to_name,
          STATUS_LABELS[i.status].en,
          idx + 1,
          it.description,
          Number(it.quantity),
          Number(it.rate),
          Number(it.amount),
        ]);
      });
    });
    downloadCsv([header, ...body], `cswo-bill-items-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{tr('Invoices / Billing', 'ইনভয়েস / বিলিং')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {tr(
              'Every bill Chhatradol raises or pays — itemised, printable and exportable to Excel.',
              'ছাত্রদলের প্রতিটি বিল — আইটেমসহ, প্রিন্টযোগ্য ও এক্সেলে এক্সপোর্টযোগ্য।',
            )}
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          + {tr('New bill', 'নতুন বিল')}
        </button>
      </div>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{tr('Total billed', 'মোট বিল')}</p>
          <p className="text-2xl font-extrabold text-gray-900">{fmt.money(stats.billed)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{tr('Received', 'আদায়')}</p>
          <p className="text-2xl font-extrabold text-green-700">{fmt.money(stats.paid)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{tr('Outstanding', 'বকেয়া')}</p>
          <p className="text-2xl font-extrabold text-red-600">{fmt.money(stats.due)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{tr('Bills shown', 'বিল সংখ্যা')}</p>
          <p className="text-2xl font-extrabold text-blue-600">{fmt.num(stats.count)}</p>
        </div>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          className="input text-sm"
          placeholder={tr('Search bill no., party, item…', 'বিল নং, নাম, আইটেম খুঁজুন…')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">{tr('All status', 'সব অবস্থা')}</option>
          {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
            <option key={s} value={s}>{lang === 'bn' ? STATUS_LABELS[s].bn : STATUS_LABELS[s].en}</option>
          ))}
        </select>
        <div>
          <label className="label text-[11px]">{tr('From', 'থেকে')}</label>
          <input type="date" className="input text-sm" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className="label text-[11px]">{tr('To', 'পর্যন্ত')}</label>
          <input type="date" className="input text-sm" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={exportRegister} className="btn-secondary text-xs">
            {tr('Export register', 'রেজিস্টার এক্সপোর্ট')}
          </button>
          <button onClick={exportItems} className="btn-secondary text-xs">
            {tr('Export items', 'আইটেম এক্সপোর্ট')}
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <p className="text-gray-600">{tr('No bills recorded yet.', 'এখনও কোনো বিল নেই।')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">{tr('Bill no.', 'বিল নং')}</th>
                <th className="px-4 py-3">{tr('Date', 'তারিখ')}</th>
                <th className="px-4 py-3">{tr('Billed to', 'যার নামে')}</th>
                <th className="px-4 py-3 text-right">{tr('Total', 'মোট')}</th>
                <th className="px-4 py-3 text-right">{tr('Paid', 'পরিশোধ')}</th>
                <th className="px-4 py-3 text-right">{tr('Balance', 'বকেয়া')}</th>
                <th className="px-4 py-3">{tr('Status', 'অবস্থা')}</th>
                <th className="px-4 py-3">{tr('Actions', 'কার্যক্রম')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((inv) => {
                const bal = Number(inv.total) - Number(inv.amount_paid);
                const rows = itemsOf(inv.id);
                return (
                  <tr key={inv.id}>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[12px] font-semibold">
                      {inv.invoice_number}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-[13px]">{fmt.date(inv.issue_date)}</div>
                      {inv.due_date && (
                        <div className="mt-0.5 text-[10px] text-gray-400">
                          {tr('due', 'শেষ তারিখ')} {fmt.date(inv.due_date)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{inv.bill_to_name || '—'}</div>
                      <div className="mt-0.5 max-w-xs truncate text-[11px] text-gray-400">
                        {rows.length
                          ? `${fmt.num(rows.length)} ${tr('items', 'আইটেম')} · ${rows.map((r) => r.description).filter(Boolean).join(', ')}`
                          : tr('No items', 'আইটেম নেই')}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{fmt.money(Number(inv.total))}</td>
                    <td className="px-4 py-3 text-right text-green-700">{fmt.money(Number(inv.amount_paid))}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${bal > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {fmt.money(bal)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => printBill(inv)} className="text-xs font-semibold text-orange-700 hover:underline">
                          {tr('Print', 'প্রিন্ট')}
                        </button>
                        <button onClick={() => openEdit(inv)} className="text-xs text-blue-600 hover:underline">
                          {tr('Edit', 'সম্পাদনা')}
                        </button>
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button onClick={() => markPaid(inv)} className="text-xs text-green-700 hover:underline">
                            {tr('Mark paid', 'পরিশোধিত')}
                          </button>
                        )}
                        {me?.role === 'admin' && (
                          <button onClick={() => remove(inv)} className="text-xs text-red-600 hover:underline">
                            {tr('Delete', 'মুছুন')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* add / edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-6 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold">
              {editing
                ? `${tr('Edit bill', 'বিল সম্পাদনা')} · ${editing.invoice_number}`
                : tr('New bill', 'নতুন বিল')}
            </h2>

            {err && <p className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-800">{err}</p>}

            <div className="space-y-4">
              {/* billed to */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">{tr('Billed to', 'যার নামে বিল')} *</label>
                  <input
                    className="input"
                    value={form.bill_to_name}
                    onChange={(e) => setForm((f) => ({ ...f, bill_to_name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">{tr('Email', 'ইমেইল')}</label>
                  <input
                    className="input"
                    value={form.bill_to_email}
                    onChange={(e) => setForm((f) => ({ ...f, bill_to_email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">{tr('Phone', 'ফোন')}</label>
                  <input
                    className="input"
                    value={form.bill_to_phone}
                    onChange={(e) => setForm((f) => ({ ...f, bill_to_phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">{tr('Address', 'ঠিকানা')}</label>
                  <input
                    className="input"
                    value={form.bill_to_address}
                    onChange={(e) => setForm((f) => ({ ...f, bill_to_address: e.target.value }))}
                  />
                </div>
              </div>

              {/* dates + categorisation */}
              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <label className="label">{tr('Bill date', 'বিলের তারিখ')} *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.issue_date}
                    onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">{tr('Due date', 'শেষ তারিখ')}</label>
                  <input
                    type="date"
                    className="input"
                    value={form.due_date}
                    onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">{tr('Event', 'অনুষ্ঠান')}</label>
                  <select
                    className="input"
                    value={form.event_id}
                    onChange={(e) => setForm((f) => ({ ...f, event_id: e.target.value }))}
                  >
                    <option value="">{tr('Not linked', 'যুক্ত নয়')}</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}{ev.event_code ? ` · ${ev.event_code}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* line items */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="label mb-0">{tr('Items', 'আইটেম')} *</label>
                  <button type="button" onClick={addItem} className="text-xs font-semibold text-orange-700 hover:underline">
                    + {tr('Add row', 'সারি যোগ')}
                  </button>
                </div>
                <div className="overflow-x-auto rounded-lg ring-1 ring-gray-200">
                  <table className="w-full min-w-[460px] text-sm">
                    <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">{tr('Description', 'বিবরণ')}</th>
                        <th className="w-24 px-3 py-2">{tr('Qty', 'পরিমাণ')}</th>
                        <th className="w-32 px-3 py-2">{tr('Rate (₹)', 'দর (₹)')}</th>
                        <th className="w-32 px-3 py-2 text-right">{tr('Amount (₹)', 'মোট (₹)')}</th>
                        <th className="w-10 px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {form.items.map((row, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5">
                            <input
                              className="input text-sm"
                              placeholder={tr('e.g. Balti (Subhajit Kundu)', 'যেমন বালতি (শুভজিৎ কুণ্ডু)')}
                              value={row.description}
                              onChange={(e) => setItem(idx, { description: e.target.value })}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              className="input text-sm"
                              value={row.quantity}
                              onChange={(e) => setItem(idx, { quantity: e.target.value })}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              className="input text-sm"
                              value={row.rate}
                              onChange={(e) => setItem(idx, { rate: e.target.value })}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right font-semibold">
                            {formLines[idx].amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              className="text-xs text-red-500 hover:underline"
                              title={tr('Remove', 'সরান')}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* payment + totals */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <div>
                    <label className="label">{tr('Payment mode', 'পেমেন্ট পদ্ধতি')}</label>
                    <select
                      className="input"
                      value={form.payment_method}
                      onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value as CswoPaymentMethod }))}
                    >
                      {(Object.keys(PM_LABELS) as CswoPaymentMethod[]).map((m) => (
                        <option key={m} value={m}>{lang === 'bn' ? PM_LABELS[m].bn : PM_LABELS[m].en}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">{tr('Bank account shown on the bill', 'বিলে দেখানো ব্যাংক অ্যাকাউন্ট')}</label>
                    <select
                      className="input"
                      value={form.bank_account_id}
                      onChange={(e) => setForm((f) => ({ ...f, bank_account_id: e.target.value }))}
                    >
                      <option value="">{tr('Do not print bank details', 'ব্যাংক বিবরণ ছাপবেন না')}</option>
                      {banks.map((b) => (
                        <option key={b.id} value={b.id}>{b.label} ({b.bank_name || 'Cash'})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">{tr('Payment reference', 'পেমেন্ট রেফারেন্স')}</label>
                    <input
                      className="input"
                      value={form.payment_ref}
                      onChange={(e) => setForm((f) => ({ ...f, payment_ref: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">{tr('Status', 'অবস্থা')}</label>
                    <select
                      className="input"
                      value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as InvoiceStatus }))}
                    >
                      {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
                        <option key={s} value={s}>{lang === 'bn' ? STATUS_LABELS[s].bn : STATUS_LABELS[s].en}</option>
                      ))}
                    </select>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {tr(
                        'Unpaid / partial / paid is set from the amount received unless the bill is a draft or cancelled.',
                        'খসড়া বা বাতিল না হলে প্রাপ্ত টাকার ভিত্তিতে অবস্থা নির্ধারিত হয়।',
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{tr('Subtotal', 'সাবটোটাল')}</span>
                    <span className="font-semibold">
                      ₹{formSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <label className="label">{tr('Discount (₹)', 'ছাড় (₹)')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      value={form.discount}
                      onChange={(e) => setForm((f) => ({ ...f, discount: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">{tr('Round off (₹)', 'রাউন্ড অফ (₹)')}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={form.round_off}
                      onChange={(e) => setForm((f) => ({ ...f, round_off: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">{tr('Amount received (₹)', 'প্রাপ্ত টাকা (₹)')}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      value={form.amount_paid}
                      onChange={(e) => setForm((f) => ({ ...f, amount_paid: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-sm font-bold">{tr('Total payable', 'মোট প্রদেয়')}</span>
                    <span className="text-xl font-extrabold text-orange-700">
                      ₹{formTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="label">{tr('Notes', 'মন্তব্য')}</label>
                <textarea
                  rows={2}
                  className="input"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={closeModal} className="btn-secondary">{tr('Cancel', 'বাতিল')}</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? tr('Saving…', 'সংরক্ষণ হচ্ছে…') : tr('Save bill', 'বিল সংরক্ষণ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
