import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoExpense, CswoPaymentMethod } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  ExpenseFields, emptyExpenseDraft, saveExpense, validateExpense, useMoneyRefs,
  expenseToDraft, type ExpenseDraft,
} from '@/components/finance/moneyForms';


const PM_LABELS: Record<CswoPaymentMethod, { en: string; bn: string }> = {
  cash:          { en: 'Cash',          bn: 'নগদ' },
  bank_transfer: { en: 'Bank transfer', bn: 'ব্যাংক ট্রান্সফার' },
  upi:           { en: 'UPI',           bn: 'UPI' },
  cheque:        { en: 'Cheque',        bn: 'চেক' },
  online:        { en: 'Online',        bn: 'অনলাইন' },
  other:         { en: 'Other',         bn: 'অন্যান্য' },
};

export default function AdminExpenses() {
  const { member: me } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dtFull = (s: string) => { const d = new Date(s); return `${fmt.date(s)} · ${fmt.num(pad(d.getHours()))}:${fmt.num(pad(d.getMinutes()))}`; };

  const [expenses, setExpenses] = useState<CswoExpense[]>([]);
  const { events, banks } = useMoneyRefs();
  const [loading, setLoading] = useState(true);
  const [filterEvent, setFilterEvent] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CswoExpense | null>(null);
  const [draft, setDraft] = useState<ExpenseDraft>(emptyExpenseDraft);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cswo_expenses')
      .select('*')
      .order('spent_on', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    setExpenses((data ?? []) as CswoExpense[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setDraft(emptyExpenseDraft());
    setErr('');
    setShowModal(true);
  };

  const openEdit = (e: CswoExpense) => {
    setEditing(e);
    setDraft(expenseToDraft(e));
    setErr('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const save = async () => {
    const problem = validateExpense(draft, lang);
    if (problem) { setErr(problem); return; }
    setSaving(true);
    setErr('');
    try {
      await saveExpense(draft, me!.id, lang, editing?.id);
      closeModal();
      await load();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : tr('Could not save.', 'সংরক্ষণ করা যায়নি।'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm(tr('Delete this expense?', 'এই ব্যয় মুছবেন?'))) return;
    await supabase.from('cswo_expenses').delete().eq('id', id);
    await load();
  };

  const filtered = expenses.filter((e) => {
    if (filterEvent === '__none') return !e.event_id;
    if (filterEvent && e.event_id !== filterEvent) return false;
    return true;
  });

  const totalSpent = filtered.reduce((s, e) => s + Number(e.amount), 0);

  const eventLabel = (e: CswoExpense) =>
    events.find((x) => x.id === e.event_id)?.title ?? '—';

  const pmLabel = (m: CswoPaymentMethod) =>
    lang === 'bn' ? PM_LABELS[m].bn : PM_LABELS[m].en;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          {tr('Expenses', 'ব্যয় ব্যবস্থাপনা')}
        </h1>
        <button onClick={openAdd} className="btn-primary">
          + {tr('Add expense', 'ব্যয় যোগ করুন')}
        </button>
      </div>

      {/* stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{tr('Total spent', 'মোট ব্যয়')}</p>
          <p className="text-2xl font-extrabold text-red-600">{fmt.money(totalSpent)}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">{tr('Records shown', 'রেকর্ড')}</p>
          <p className="text-2xl font-extrabold text-blue-600">{fmt.num(filtered.length)}</p>
        </div>
      </div>

      {/* filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          className="input text-sm"
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
        >
          <option value="">{tr('All events', 'সব অনুষ্ঠান')}</option>
          <option value="__none">{tr('Not allocated', 'অনির্ধারিত')}</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <p className="text-gray-600">
          {tr('No expenses recorded.', 'কোনো ব্যয় লিপিবদ্ধ নেই।')}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3">{tr('Date', 'তারিখ')}</th>
                <th className="px-4 py-3">{tr('Event', 'অনুষ্ঠান')}</th>
                <th className="px-4 py-3">{tr('Vendor', 'বিক্রেতা')}</th>
                <th className="px-4 py-3">{tr('Description', 'বিবরণ')}</th>
                <th className="px-4 py-3">{tr('Amount', 'পরিমাণ')}</th>
                <th className="px-4 py-3">{tr('Method', 'পদ্ধতি')}</th>
                <th className="px-4 py-3">{tr('Actions', 'কার্যক্রম')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="text-[13px] font-medium">{fmt.date(e.spent_on + 'T00:00:00')}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{dtFull(e.created_at)}</div>
                  </td>
                  <td className="px-4 py-3">{eventLabel(e)}</td>
                  <td className="px-4 py-3">{e.vendor || '—'}</td>
                  <td className="max-w-xs truncate px-4 py-3">{e.description || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-red-700">
                    {fmt.money(Number(e.amount))}
                  </td>
                  <td className="px-4 py-3">{pmLabel(e.payment_method)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEdit(e)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {tr('Edit', 'সম্পাদনা')}
                      </button>
                      <button
                        onClick={() => remove(e.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        {tr('Delete', 'মুছুন')}
                      </button>
                      {e.receipt_image && (
                        <a
                          href={e.receipt_image}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-gray-500 hover:underline"
                        >
                          {tr('Receipt', 'রসিদ ছবি')}
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* add / edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl max-h-[90vh]">
            <h2 className="mb-4 text-lg font-bold">
              {editing
                ? tr('Edit expense', 'ব্যয় সম্পাদনা')
                : tr('Add expense', 'ব্যয় যোগ করুন')}
            </h2>

            {err && (
              <p className="mb-3 rounded bg-red-100 px-3 py-2 text-sm text-red-800">{err}</p>
            )}

            <ExpenseFields draft={draft} onChange={setDraft} events={events} banks={banks} />

            <div className="mt-5 flex justify-end gap-3">
              <button onClick={closeModal} className="btn-secondary">
                {tr('Cancel', 'বাতিল')}
              </button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? tr('Saving…', 'সংরক্ষণ হচ্ছে…') : tr('Save', 'সংরক্ষণ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
