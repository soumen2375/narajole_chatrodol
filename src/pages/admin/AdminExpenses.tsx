import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoExpense, CswoFund, CswoPaymentMethod, ExpenseStatus, CswoBankAccount } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import StatusBadge from '@/components/ui/StatusBadge';

type Form = {
  fund_id: string;
  event_id: string;
  amount: string;
  spent_on: string;
  vendor: string;
  description: string;
  payment_method: CswoPaymentMethod;
  receipt_image: string;
  status: ExpenseStatus;
  rejection_reason?: string;
  bank_account_id: string;
};

const EMPTY_FORM: Form = {
  fund_id: '',
  event_id: '',
  amount: '',
  spent_on: new Date().toISOString().slice(0, 10),
  vendor: '',
  description: '',
  payment_method: 'cash',
  receipt_image: '',
  status: 'draft',
  rejection_reason: '',
  bank_account_id: '',
};

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
  const [funds, setFunds] = useState<CswoFund[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; event_code: string | null; fund_id: string | null }[]>([]);
  const [eventBudgetCats, setEventBudgetCats] = useState<string[]>([]);
  const [bankAccounts, setBankAccounts] = useState<CswoBankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFund, setFilterFund] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CswoExpense | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const checkBudgetExceeded = async (fundId: string, amount: number, spentOn: string): Promise<{ exceeded: boolean; msg: string; frozen: boolean }> => {
    const { data: fund, error: fundErr } = await supabase
      .from('cswo_funds')
      .select('*')
      .eq('id', fundId)
      .single();
    
    if (fundErr || !fund) {
      return { exceeded: false, msg: tr('Fund not found.', 'ফান্ড পাওয়া যায়নি।'), frozen: false };
    }
    if (fund.is_frozen) {
      return { exceeded: false, msg: tr('This fund is frozen. Spend/approval is blocked.', 'এই ফান্ডটি স্থগিত করা হয়েছে। নতুন ব্যয়/অনুমোদন নিষিদ্ধ।'), frozen: true };
    }

    const d = new Date(spentOn);
    const y = d.getFullYear();
    const fy = d.getMonth() >= 3 ? `${y}-${String(y + 1).slice(-2)}` : `${y - 1}-${String(y).slice(-2)}`;

    const { data: budget } = await supabase
      .from('cswo_budgets')
      .select('*')
      .eq('fund_id', fundId)
      .eq('fiscal_year', fy)
      .maybeSingle();

    if (!budget) {
      return { exceeded: false, msg: '', frozen: false };
    }

    const budgetLimit = Number(budget.allocated_amount);
    const startYear = parseInt(fy.split('-')[0]);
    const startDate = `${startYear}-04-01`;
    const endDate = `${startYear + 1}-03-31`;

    const { data: approvedExpenses } = await supabase
      .from('cswo_expenses')
      .select('amount')
      .eq('fund_id', fundId)
      .eq('status', 'approved')
      .gte('spent_on', startDate)
      .lte('spent_on', endDate);

    const totalSpent = (approvedExpenses ?? []).reduce((sum, item) => sum + Number(item.amount), 0);

    if (totalSpent + amount > budgetLimit) {
      const remaining = budgetLimit - totalSpent;
      return {
        exceeded: true,
        msg: tr(
          `Budget exceeded! Maximum allowed budget is ₹${budgetLimit.toLocaleString('en-IN')}. Current spent is ₹${totalSpent.toLocaleString('en-IN')} (Remaining: ₹${remaining.toLocaleString('en-IN')}).`,
          `বাজেট অতিক্রম করেছে! সর্বোচ্চ অনুমোদিত বাজেট ₹${budgetLimit.toLocaleString('en-IN')}। বর্তমান ব্যয় ₹${totalSpent.toLocaleString('en-IN')} (অবশিষ্ট: ₹${remaining.toLocaleString('en-IN')})।`
        ),
        frozen: false
      };
    }

    return { exceeded: false, msg: '', frozen: false };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [ef, ff, ev, ba] = await Promise.all([
      supabase
        .from('cswo_expenses')
        .select('*, fund:cswo_funds(id,name_bn,name_en,slug)')
        .order('spent_on', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('cswo_funds')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('cswo_events')
        .select('id,title,event_code,fund_id')
        .order('event_date', { ascending: false }),
      supabase
        .from('cswo_bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
    ]);
    setExpenses((ef.data ?? []) as CswoExpense[]);
    setFunds((ff.data ?? []) as CswoFund[]);
    setEvents((ev.data ?? []) as { id: string; title: string; event_code: string | null; fund_id: string | null }[]);
    setBankAccounts((ba.data ?? []) as CswoBankAccount[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadBudgetCats = async (eventId: string) => {
    if (!eventId) { setEventBudgetCats([]); return; }
    const { data } = await supabase
      .from('cswo_event_budget_items')
      .select('category')
      .eq('event_id', eventId);
    setEventBudgetCats([...new Set((data ?? []).map((b: { category: string }) => b.category).filter(Boolean))]);
  };

  const openAdd = () => {
    setEditing(null);
    setEventBudgetCats([]);
    setForm({ ...EMPTY_FORM, fund_id: funds[0]?.id ?? '', status: 'draft' });
    setErr('');
    setShowModal(true);
  };

  const openEdit = async (e: CswoExpense) => {
    setEditing(e);
    setForm({
      fund_id: e.fund_id,
      event_id: e.event_id ?? '',
      amount: String(e.amount),
      spent_on: e.spent_on,
      vendor: e.vendor,
      description: e.description,
      payment_method: e.payment_method,
      receipt_image: e.receipt_image ?? '',
      status: e.status,
      rejection_reason: e.rejection_reason ?? '',
      bank_account_id: e.bank_account_id ?? '',
    });
    setErr('');
    if (e.event_id) await loadBudgetCats(e.event_id);
    else setEventBudgetCats([]);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setErr('');
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `expense-receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage.from('cswo-media').upload(path, file);
    if (error) {
      setErr(tr('Upload failed: ', 'আপলোড ব্যর্থ: ') + error.message);
      setUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from('cswo-media').getPublicUrl(data.path);
    setForm((f) => ({ ...f, receipt_image: publicUrl }));
    setUploading(false);
  };

  const save = async () => {
    if (!form.fund_id || !form.amount || !form.spent_on) {
      setErr(tr('Fund, amount and date are required.', 'ফান্ড, পরিমাণ ও তারিখ আবশ্যিক।'));
      return;
    }
    setSaving(true);
    setErr('');

    if (form.status === 'approved') {
      const res = await checkBudgetExceeded(form.fund_id, parseFloat(form.amount), form.spent_on);
      if (res.frozen) {
        setErr(res.msg);
        setSaving(false);
        return;
      }
      if (res.exceeded) {
        const ok = window.confirm(res.msg + "\n\n" + tr("Do you still want to approve this expense?", "আপনি কি তবুও এই ব্যয়টি অনুমোদন করতে চান?"));
        if (!ok) {
          setSaving(false);
          return;
        }
      }
    }

    const payload = {
      fund_id: form.fund_id,
      event_id: form.event_id || null,
      amount: parseFloat(form.amount),
      spent_on: form.spent_on,
      vendor: form.vendor.trim(),
      description: form.description.trim(),
      payment_method: form.payment_method,
      receipt_image: form.receipt_image.trim() || null,
      status: form.status,
      recorded_by: me!.id,
      rejection_reason: form.status === 'rejected' ? (form.rejection_reason?.trim() || null) : null,
      bank_account_id: form.bank_account_id || null,
      ...(form.status === 'approved' && !editing ? { approved_by: me!.id } : {}),
      ...(form.status === 'rejected' && !editing ? { approved_by: me!.id } : {}),
    };
    const { error } = editing
      ? await supabase.from('cswo_expenses').update(payload).eq('id', editing.id)
      : await supabase.from('cswo_expenses').insert(payload);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    closeModal();
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(tr('Delete this expense?', 'এই ব্যয় মুছবেন?'))) return;
    await supabase.from('cswo_expenses').delete().eq('id', id);
    await load();
  };

  const approve = async (e: CswoExpense) => {
    setLoading(true);
    const res = await checkBudgetExceeded(e.fund_id, Number(e.amount), e.spent_on);
    if (res.frozen) {
      alert(res.msg);
      setLoading(false);
      return;
    }
    if (res.exceeded) {
      const ok = window.confirm(res.msg + "\n\n" + tr("Do you still want to approve this expense?", "আপনি কি তবুও এই ব্যয়টি অনুমোদন করতে চান?"));
      if (!ok) {
        setLoading(false);
        return;
      }
    }
    await supabase.from('cswo_expenses')
      .update({ status: 'approved', approved_by: me!.id })
      .eq('id', e.id);
    await load();
  };

  const reject = async (e: CswoExpense) => {
    const reason = window.prompt(tr('Why is this expense rejected?', 'এই ব্যয়টি কেন প্রত্যাখ্যাত হলো?'));
    if (reason === null) return; // cancelled
    setLoading(true);
    await supabase.from('cswo_expenses')
      .update({ status: 'rejected', rejection_reason: reason.trim(), approved_by: me!.id })
      .eq('id', e.id);
    await load();
  };

  const filtered = expenses.filter((e) => {
    if (filterFund && e.fund_id !== filterFund) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  });

  const totalApproved = filtered
    .filter((e) => e.status === 'approved')
    .reduce((s, e) => s + Number(e.amount), 0);

  const fundLabel = (e: CswoExpense) =>
    lang === 'bn' ? (e.fund?.name_bn ?? '—') : (e.fund?.name_en ?? '—');

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
          <p className="text-sm text-gray-500">{tr('Approved total', 'অনুমোদিত মোট ব্যয়')}</p>
          <p className="text-2xl font-extrabold text-red-600">{fmt.money(totalApproved)}</p>
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
          value={filterFund}
          onChange={(e) => setFilterFund(e.target.value)}
        >
          <option value="">{tr('All funds', 'সব ফান্ড')}</option>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {lang === 'bn' ? f.name_bn : f.name_en}
            </option>
          ))}
        </select>
        <select
          className="input text-sm"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">{tr('All status', 'সব অবস্থা')}</option>
          <option value="draft">{tr('Draft', 'খসড়া')}</option>
          <option value="approved">{tr('Approved', 'অনুমোদিত')}</option>
          <option value="rejected">{tr('Rejected', 'প্রত্যাখ্যাত')}</option>
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
                <th className="px-4 py-3">{tr('Fund', 'ফান্ড')}</th>
                <th className="px-4 py-3">{tr('Vendor', 'বিক্রেতা')}</th>
                <th className="px-4 py-3">{tr('Description', 'বিবরণ')}</th>
                <th className="px-4 py-3">{tr('Amount', 'পরিমাণ')}</th>
                <th className="px-4 py-3">{tr('Method', 'পদ্ধতি')}</th>
                <th className="px-4 py-3">{tr('Status', 'অবস্থা')}</th>
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
                  <td className="px-4 py-3">{fundLabel(e)}</td>
                  <td className="px-4 py-3">{e.vendor || '—'}</td>
                  <td className="max-w-xs truncate px-4 py-3">{e.description || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-red-700">
                    {fmt.money(Number(e.amount))}
                  </td>
                  <td className="px-4 py-3">{pmLabel(e.payment_method)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={e.status} />
                    {e.status === 'rejected' && e.rejection_reason && (
                      <div className="mt-1 text-[11px] text-red-600 font-medium">
                        {tr('Reason: ', 'কারণ: ')}{e.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openEdit(e)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {tr('Edit', 'সম্পাদনা')}
                      </button>
                      {e.status === 'draft' && me?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => approve(e)}
                            className="text-xs text-green-600 hover:underline font-semibold"
                          >
                            {tr('Approve', 'অনুমোদন')}
                          </button>
                          <button
                            onClick={() => reject(e)}
                            className="text-xs text-red-600 hover:underline font-semibold"
                          >
                            {tr('Reject', 'প্রত্যাখ্যাত')}
                          </button>
                        </>
                      )}
                      {(e.status === 'draft' || me?.role === 'admin') && (
                        <button
                          onClick={() => remove(e.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          {tr('Delete', 'মুছুন')}
                        </button>
                      )}
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

            <div className="space-y-3">
              <div>
                <label className="label">
                  {tr('Fund', 'ফান্ড')} *
                </label>
                <select
                  className="input"
                  value={form.fund_id}
                  onChange={(e) => {
                    const newFund = e.target.value;
                    // If current event doesn't belong to this fund, clear it
                    const curEvFund = events.find((ev) => ev.id === form.event_id)?.fund_id ?? null;
                    const clearEvent = form.event_id && curEvFund && curEvFund !== newFund;
                    setForm((f) => ({ ...f, fund_id: newFund, event_id: clearEvent ? '' : f.event_id }));
                    if (clearEvent) setEventBudgetCats([]);
                  }}
                >
                  <option value="">{tr('Select fund…', 'ফান্ড বেছে নিন…')}</option>
                  {funds.filter((f) => !f.is_frozen).map((f) => (
                    <option key={f.id} value={f.id}>
                      {lang === 'bn' ? f.name_bn : f.name_en}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">
                  {tr('Event / camp (optional)', 'অনুষ্ঠান / ক্যাম্প (ঐচ্ছিক)')}
                  {form.fund_id && (
                    <span className="ml-2 text-[11px] font-normal" style={{ color: '#15803d' }}>
                      {tr('— showing events for selected fund', '— নির্বাচিত তহবিলের অনুষ্ঠান দেখানো হচ্ছে')}
                    </span>
                  )}
                </label>
                <select
                  className="input"
                  value={form.event_id}
                  onChange={async (e) => {
                    const newEventId = e.target.value;
                    setForm((f) => ({ ...f, event_id: newEventId }));
                    await loadBudgetCats(newEventId);
                  }}
                >
                  <option value="">{tr('Not linked to an event', 'কোনো অনুষ্ঠানে যুক্ত নয়')}</option>
                  {events
                    .filter((ev) => !form.fund_id || !ev.fund_id || ev.fund_id === form.fund_id)
                    .map((ev) => (
                      <option key={ev.id} value={ev.id}>{ev.title}{ev.event_code ? ` · ${ev.event_code}` : ''}</option>
                    ))}
                </select>
                {eventBudgetCats.length > 0 && (
                  <p className="mt-1 text-[11px]" style={{ color: '#0c756f' }}>
                    {tr('Budget categories:', 'বাজেট বিভাগ:')} {eventBudgetCats.join(' · ')}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{tr('Amount (₹)', 'পরিমাণ (₹)')} *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="input"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label">{tr('Date', 'তারিখ')} *</label>
                  <input
                    type="date"
                    className="input"
                    value={form.spent_on}
                    onChange={(e) => setForm((f) => ({ ...f, spent_on: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="label">{tr('Vendor / Payee', 'বিক্রেতা / প্রাপক')}</label>
                <input
                  type="text"
                  className="input"
                  value={form.vendor}
                  onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">{tr('Description / Sub-category', 'বিবরণ / উপ-বিভাগ')}</label>
                <input
                  list="exp-budget-cats"
                  className="input"
                  placeholder={eventBudgetCats.length > 0
                    ? tr('Type or choose a budget category…', 'বাজেট বিভাগ টাইপ বা নির্বাচন করুন…')
                    : tr('Description', 'বিবরণ')}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
                {eventBudgetCats.length > 0 && (
                  <datalist id="exp-budget-cats">
                    {eventBudgetCats.map((cat) => <option key={cat} value={cat} />)}
                  </datalist>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{tr('Payment method', 'পেমেন্ট পদ্ধতি')}</label>
                  <select
                    className="input"
                    value={form.payment_method}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, payment_method: e.target.value as CswoPaymentMethod }))
                    }
                  >
                    {(Object.keys(PM_LABELS) as CswoPaymentMethod[]).map((m) => (
                      <option key={m} value={m}>
                        {lang === 'bn' ? PM_LABELS[m].bn : PM_LABELS[m].en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{tr('Bank / Cash Account', 'ব্যাংক / নগদ অ্যাকাউন্ট')}</label>
                  <select
                    className="input"
                    value={form.bank_account_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bank_account_id: e.target.value }))
                    }
                  >
                    <option value="">{tr('-- Select Account --', '-- অ্যাকাউন্ট নির্বাচন করুন --')}</option>
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label} ({b.bank_name || 'Cash'})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">{tr('Status', 'অবস্থা')}</label>
                  <select
                    className="input"
                    value={form.status}
                    disabled={me?.role !== 'admin'}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value as ExpenseStatus }))
                    }
                  >
                    <option value="draft">{tr('Draft', 'খসড়া')}</option>
                    {me?.role === 'admin' && <option value="approved">{tr('Approved', 'অনুমোদিত')}</option>}
                    {me?.role === 'admin' && <option value="rejected">{tr('Rejected', 'প্রত্যাখ্যাত')}</option>}
                  </select>
                </div>
              </div>

              {form.status === 'rejected' && (
                <div>
                  <label className="label">{tr('Rejection Reason', 'প্রত্যাখ্যাত করার কারণ')}</label>
                  <input
                    type="text"
                    className="input"
                    placeholder={tr('Enter reason why this was rejected...', 'কেন এটি প্রত্যাখ্যাত হলো তার কারণ লিখুন...')}
                    value={form.rejection_reason || ''}
                    onChange={(e) => setForm((f) => ({ ...f, rejection_reason: e.target.value }))}
                  />
                </div>
              )}

              <div>
                <label className="label">{tr('Receipt image', 'রসিদ ছবি')}</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="input flex-1 text-xs"
                    placeholder={tr('Paste URL or upload →', 'URL বা আপলোড করুন →')}
                    value={form.receipt_image}
                    onChange={(e) => setForm((f) => ({ ...f, receipt_image: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="btn-secondary whitespace-nowrap text-xs"
                  >
                    {uploading ? '…' : tr('Upload', 'আপলোড')}
                  </button>
                </div>
                {form.receipt_image && (
                  <a
                    href={form.receipt_image}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block text-xs text-blue-600 hover:underline"
                  >
                    {tr('View uploaded receipt', 'আপলোডকৃত রসিদ দেখুন')}
                  </a>
                )}
              </div>
            </div>

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
