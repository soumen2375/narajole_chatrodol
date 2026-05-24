import { useCallback, useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoPayroll, CswoFund, PayrollKind, PayrollStatus } from '@/types';
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

const KINDS: PayrollKind[] = ['salary', 'honorarium', 'stipend', 'reimbursement'];
const STATUS_COLOR: Record<PayrollStatus, string> = { pending: AMBER, paid: GREEN, cancelled: MUTED };

interface Row extends CswoPayroll {
  member?: { full_name: string } | null;
}
type Form = {
  member_id: string; payee_name: string; designation: string;
  kind: PayrollKind; period: string; amount: string; fund_id: string; note: string;
};
const EMPTY: Form = { member_id: '', payee_name: '', designation: '', kind: 'honorarium', period: '', amount: '', fund_id: '', note: '' };

export default function AdminPayroll() {
  const { member: me } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [rows, setRows] = useState<Row[]>([]);
  const [funds, setFunds] = useState<CswoFund[]>([]);
  const [members, setMembers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CswoPayroll | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [pR, fR, mR] = await Promise.all([
      supabase.from('cswo_payroll').select('*, member:cswo_members!member_id(full_name)').order('created_at', { ascending: false }),
      supabase.from('cswo_funds').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('cswo_members').select('id,full_name').eq('status', 'approved').order('full_name'),
    ]);
    setRows((pR.data ?? []) as Row[]);
    setFunds((fR.data ?? []) as CswoFund[]);
    setMembers((mR.data ?? []) as { id: string; full_name: string }[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const kindLabel = (k: PayrollKind) =>
    ({ salary: tr('Salary', 'বেতন'), honorarium: tr('Honorarium', 'সম্মানী'), stipend: tr('Stipend', 'বৃত্তি'), reimbursement: tr('Reimbursement', 'প্রতিদান') }[k]);
  const statusLabel = (s: PayrollStatus) =>
    ({ pending: tr('Pending', 'অপেক্ষমাণ'), paid: tr('Paid', 'পরিশোধিত'), cancelled: tr('Cancelled', 'বাতিল') }[s]);
  const payeeOf = (r: Row) => r.member?.full_name || r.payee_name || '—';

  const openAdd = () => { setEditing(null); setForm(EMPTY); setErr(''); setShowModal(true); };
  const openEdit = (r: Row) => {
    setEditing(r);
    setForm({ member_id: r.member_id ?? '', payee_name: r.payee_name, designation: r.designation, kind: r.kind, period: r.period, amount: String(Number(r.amount)), fund_id: r.fund_id ?? '', note: r.note });
    setErr(''); setShowModal(true);
  };

  const save = async () => {
    if (!form.member_id && !form.payee_name.trim()) { setErr(tr('Choose a member or enter a payee name.', 'সদস্য বেছে নিন বা প্রাপকের নাম দিন।')); return; }
    if (!form.amount || Number(form.amount) <= 0) { setErr(tr('Enter a valid amount.', 'সঠিক পরিমাণ দিন।')); return; }
    setSaving(true); setErr('');
    const payload = {
      member_id: form.member_id || null, payee_name: form.payee_name.trim(), designation: form.designation.trim(),
      kind: form.kind, period: form.period.trim(), amount: Number(form.amount), fund_id: form.fund_id || null, note: form.note.trim(),
    };
    const { error } = editing
      ? await supabase.from('cswo_payroll').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id)
      : await supabase.from('cswo_payroll').insert({ ...payload, created_by: me?.id });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowModal(false); await load();
  };

  const setStatus = async (r: Row, status: PayrollStatus) => {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'paid') { patch.paid_on = new Date().toISOString().slice(0, 10); patch.approved_by = me?.id; }
    if (status === 'pending') patch.paid_on = null;
    await supabase.from('cswo_payroll').update(patch).eq('id', r.id);
    await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(tr('Delete this payroll record?', 'এই বেতন রেকর্ড মুছবেন?'))) return;
    await supabase.from('cswo_payroll').delete().eq('id', id);
    await load();
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const pendingTotal = pending.reduce((s, r) => s + Number(r.amount), 0);
  const paidTotal = rows.filter((r) => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0);

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Finance', 'অর্থ')} · {tr('Payroll', 'বেতন')}</div>
          <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Payroll & Honorarium', 'বেতন ও সম্মানী')}</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Record salaries, honorariums and stipends. Marking one paid posts a debit to the ledger automatically.', 'বেতন, সম্মানী ও বৃত্তি নথিভুক্ত করুন। পরিশোধিত চিহ্নিত করলে স্বয়ংক্রিয়ভাবে লেজারে খরচ যুক্ত হয়।')}</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}><FaPlus className="h-3 w-3" /> {tr('New entry', 'নতুন এন্ট্রি')}</button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label={tr('Pending', 'অপেক্ষমাণ')} value={fmt.money(pendingTotal)} sub={`${fmt.num(pending.length)} ${tr('entries', 'এন্ট্রি')}`} color={AMBER} />
        <Stat label={tr('Paid total', 'পরিশোধিত মোট')} value={fmt.money(paidTotal)} color={GREEN} />
        <Stat label={tr('Records', 'রেকর্ড')} value={fmt.num(rows.length)} color={INK} />
      </div>

      <div className="overflow-x-auto rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <table className="w-full text-[13px]">
          <thead><tr style={{ borderBottom: `1px solid ${RULE}` }}>
            {[tr('Payee', 'প্রাপক'), tr('Kind', 'ধরন'), tr('Period', 'সময়কাল'), tr('Amount', 'পরিমাণ'), tr('Fund', 'তহবিল'), tr('Status', 'অবস্থা'), tr('Actions', 'কার্যক্রম')].map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: MUTED }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                <td className="px-4 py-3">
                  <div className="font-semibold" style={{ color: INK }}>{payeeOf(r)}</div>
                  {r.designation && <div className="font-mono text-[10px]" style={{ color: MUTED }}>{r.designation}</div>}
                </td>
                <td className="px-4 py-3" style={{ color: INK2 }}>{kindLabel(r.kind)}</td>
                <td className="px-4 py-3" style={{ color: INK2 }}>{r.period || '—'}</td>
                <td className="px-4 py-3 font-semibold" style={{ color: BRAND }}>{fmt.money(Number(r.amount))}</td>
                <td className="px-4 py-3" style={{ color: INK2 }}>{funds.find((f) => f.id === r.fund_id) ? (lang === 'bn' ? funds.find((f) => f.id === r.fund_id)!.name_bn : funds.find((f) => f.id === r.fund_id)!.name_en) : '—'}</td>
                <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: STATUS_COLOR[r.status] }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[r.status] }} />{statusLabel(r.status)}</span></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2 text-[12px] font-medium">
                    {r.status === 'pending' && <button onClick={() => setStatus(r, 'paid')} className="text-green-700 hover:underline">{tr('Mark paid', 'পরিশোধিত')}</button>}
                    {r.status === 'paid' && <button onClick={() => setStatus(r, 'pending')} className="text-amber-700 hover:underline">{tr('Revert', 'ফেরান')}</button>}
                    {r.status !== 'cancelled' && r.status !== 'paid' && <button onClick={() => setStatus(r, 'cancelled')} className="text-gray-500 hover:underline">{tr('Cancel', 'বাতিল')}</button>}
                    <button onClick={() => openEdit(r)} className="hover:underline" style={{ color: BRAND }}>{tr('Edit', 'সম্পাদনা')}</button>
                    <button onClick={() => remove(r.id)} className="text-red-600 hover:underline">{tr('Delete', 'মুছুন')}</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No payroll records yet.', 'এখনো কোনো বেতন রেকর্ড নেই।')}</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] p-6 shadow-xl" style={{ background: PAPER }} onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-[18px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{editing ? tr('Edit entry', 'এন্ট্রি সম্পাদনা') : tr('New payroll entry', 'নতুন বেতন এন্ট্রি')}</h2>
            {err && <p className="mb-3 rounded px-3 py-2 text-[13px]" style={{ background: 'rgba(194,65,12,0.1)', color: BRAND }}>{err}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select className="input sm:col-span-2" value={form.member_id} onChange={(e) => setForm((f) => ({ ...f, member_id: e.target.value }))}>
                <option value="">{tr('External / non-member payee', 'বহিরাগত / অ-সদস্য প্রাপক')}</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
              <input className="input" placeholder={tr('Payee name (if external)', 'প্রাপকের নাম (বহিরাগত হলে)')} value={form.payee_name} onChange={(e) => setForm((f) => ({ ...f, payee_name: e.target.value }))} />
              <input className="input" placeholder={tr('Designation / role', 'পদবি / ভূমিকা')} value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} />
              <select className="input" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as PayrollKind }))}>
                {KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
              </select>
              <input className="input" placeholder={tr('Period (e.g. May 2026)', 'সময়কাল (যেমন মে ২০২৬)')} value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} />
              <input className="input" type="number" placeholder={tr('Amount (₹)', 'পরিমাণ (₹)')} value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              <select className="input" value={form.fund_id} onChange={(e) => setForm((f) => ({ ...f, fund_id: e.target.value }))}>
                <option value="">{tr('No fund', 'কোনো তহবিল নয়')}</option>
                {funds.map((f) => <option key={f.id} value={f.id}>{lang === 'bn' ? f.name_bn : f.name_en}</option>)}
              </select>
              <textarea className="input resize-none sm:col-span-2" rows={2} placeholder={tr('Note', 'নোট')} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('Cancel', 'বাতিল')}</button>
              <button onClick={save} disabled={saving} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: BRAND }}>{saving ? tr('Saving…', 'সংরক্ষণ…') : tr('Save', 'সংরক্ষণ')}</button>
            </div>
            <p className="mt-3 text-[11px]" style={{ color: MUTED }}>{tr('New entries start as pending. Use “Mark paid” to record the actual disbursement.', 'নতুন এন্ট্রি অপেক্ষমাণ অবস্থায় শুরু হয়। প্রকৃত পরিশোধ নথিভুক্ত করতে “পরিশোধিত” ব্যবহার করুন।')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-[8px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1.5 text-[22px] font-bold" style={{ color }}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px]" style={{ color: MUTED }}>{sub}</div>}
    </div>
  );
}
