import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaPlus, FaTrash, FaLocationDot, FaUpRightFromSquare } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import type { CswoEvent, CswoEventBudgetItem, CswoEventVolunteer, EventBudgetStatus } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const TEAL = '#0c756f';
const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const GREEN = '#4d7c0f';
const AMBER = '#b45309';
const PAPER = '#ffffff';
const CREAM = '#faf8f5';

interface LinkedExpense { id: string; amount: number; description: string; vendor: string; status: string; spent_on: string }
interface LinkedDonation { id: string; amount: number; donor_name: string | null; is_anonymous: boolean; status: string; created_at: string }

const BSTATUS: EventBudgetStatus[] = ['planned', 'approved', 'paid'];
const emptyBudget = { category: '', planned: '', approved: '', actual: '', vendor: '', status: 'planned' as EventBudgetStatus };
const emptyVol = { name: '', role: '', phone: '', department: '', shift: '' };

export default function AdminEventDetail() {
  const { id = '' } = useParams();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [event, setEvent] = useState<CswoEvent | null>(null);
  const [budget, setBudget] = useState<CswoEventBudgetItem[]>([]);
  const [vols, setVols] = useState<CswoEventVolunteer[]>([]);
  const [expenses, setExpenses] = useState<LinkedExpense[]>([]);
  const [donations, setDonations] = useState<LinkedDonation[]>([]);
  const [attendance, setAttendance] = useState(0);
  const [loading, setLoading] = useState(true);

  const [bForm, setBForm] = useState(emptyBudget);
  const [bEditId, setBEditId] = useState<string | null>(null);
  const [vForm, setVForm] = useState(emptyVol);

  const load = useCallback(async () => {
    setLoading(true);
    const [evR, bR, vR, exR, dnR, atR] = await Promise.all([
      supabase.from('cswo_events').select('*').eq('id', id).maybeSingle(),
      supabase.from('cswo_event_budget_items').select('*').eq('event_id', id).order('created_at'),
      supabase.from('cswo_event_volunteers').select('*').eq('event_id', id).order('created_at'),
      supabase.from('cswo_expenses').select('id,amount,description,vendor,status,spent_on').eq('event_id', id),
      supabase.from('cswo_donations').select('id,amount,donor_name,is_anonymous,status,created_at').eq('event_id', id).order('created_at', { ascending: false }),
      supabase.from('cswo_attendance').select('id', { count: 'exact', head: true }).eq('event_id', id),
    ]);
    setEvent((evR.data ?? null) as CswoEvent | null);
    setBudget((bR.data ?? []) as CswoEventBudgetItem[]);
    setVols((vR.data ?? []) as CswoEventVolunteer[]);
    setExpenses((exR.data ?? []) as LinkedExpense[]);
    setDonations((dnR.data ?? []) as LinkedDonation[]);
    setAttendance(atR.count ?? 0);
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const saveBudget = async () => {
    if (!bForm.category.trim()) return;
    const payload = {
      event_id: id, category: bForm.category.trim(), planned: Number(bForm.planned || 0),
      approved: Number(bForm.approved || 0), actual: Number(bForm.actual || 0), vendor: bForm.vendor.trim(), status: bForm.status,
    };
    if (bEditId) await supabase.from('cswo_event_budget_items').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', bEditId);
    else await supabase.from('cswo_event_budget_items').insert(payload);
    setBForm(emptyBudget); setBEditId(null);
    await load();
  };
  const editBudget = (b: CswoEventBudgetItem) => {
    setBEditId(b.id);
    setBForm({ category: b.category, planned: String(Number(b.planned)), approved: String(Number(b.approved)), actual: String(Number(b.actual)), vendor: b.vendor, status: b.status });
  };
  const delBudget = async (bid: string) => { await supabase.from('cswo_event_budget_items').delete().eq('id', bid); await load(); };

  const addVol = async () => {
    if (!vForm.name.trim()) return;
    await supabase.from('cswo_event_volunteers').insert({ event_id: id, name: vForm.name.trim(), role: vForm.role.trim(), phone: vForm.phone.trim(), department: vForm.department.trim(), shift: vForm.shift.trim() });
    setVForm(emptyVol); await load();
  };
  const toggleVolAttend = async (v: CswoEventVolunteer) => {
    setVols((arr) => arr.map((x) => x.id === v.id ? { ...x, attended: !x.attended } : x));
    await supabase.from('cswo_event_volunteers').update({ attended: !v.attended, updated_at: new Date().toISOString() }).eq('id', v.id);
  };
  const delVol = async (vid: string) => { await supabase.from('cswo_event_volunteers').delete().eq('id', vid); await load(); };

  if (loading) return <TableSkeleton rows={6} />;
  if (!event) return (
    <div className="py-16 text-center">
      <p style={{ color: MUTED }}>{tr('Event not found.', 'অনুষ্ঠান পাওয়া যায়নি।')}</p>
      <Link to=".." className="mt-3 inline-block font-semibold" style={{ color: TEAL }}>← {tr('Back to events', 'অনুষ্ঠানে ফিরুন')}</Link>
    </div>
  );

  const bPlanned = budget.reduce((s, b) => s + Number(b.planned), 0);
  const bApproved = budget.reduce((s, b) => s + Number(b.approved), 0);
  const bActual = budget.reduce((s, b) => s + Number(b.actual), 0);
  const expTotal = expenses.filter((e) => e.status === 'approved').reduce((s, e) => s + Number(e.amount), 0);
  const donTotal = donations.filter((d) => d.status === 'paid').reduce((s, d) => s + Number(d.amount), 0);
  const volAttended = vols.filter((v) => v.attended).length;

  return (
    <div className="space-y-6">
      <Link to=".." className="inline-flex items-center gap-2 text-[13px] font-medium" style={{ color: MUTED }}>
        <FaArrowLeft className="h-3 w-3" /> {tr('All events', 'সব অনুষ্ঠান')}
      </Link>

      {/* Header */}
      <div className="rounded-[10px] p-6" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white" style={{ background: TEAL }}>{event.status}</span>
              {event.event_code && <span className="font-mono text-[11px]" style={{ color: MUTED }}>{event.event_code}</span>}
            </div>
            <h1 className="mt-2 text-[26px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{event.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]" style={{ color: INK2 }}>
              <span>{event.category || event.type}</span>
              <span style={{ color: RULE }}>·</span>
              <span>{fmt.date(event.event_date)}{event.end_date ? ` — ${fmt.date(event.end_date)}` : ''}</span>
              {event.start_time && <><span style={{ color: RULE }}>·</span><span>{event.start_time.slice(0, 5)}{event.end_time ? `–${event.end_time.slice(0, 5)}` : ''}</span></>}
            </div>
            {(event.location || event.district) && (
              <div className="mt-1 inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: MUTED }}>
                <FaLocationDot className="h-3 w-3" /> {[event.location, event.district, event.state, event.pincode].filter(Boolean).join(', ')}
                {event.map_link && <a href={event.map_link} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1" style={{ color: TEAL }}>{tr('Map', 'ম্যাপ')} <FaUpRightFromSquare className="h-2.5 w-2.5" /></a>}
              </div>
            )}
            {event.description && <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed" style={{ color: INK2 }}>{event.description}</p>}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat label={tr('Budget planned', 'বাজেট পরিকল্পিত')} value={fmt.money(bPlanned)} color={INK} />
        <Stat label={tr('Budget spent', 'বাজেট ব্যয়')} value={fmt.money(bActual)} color={AMBER} sub={`${tr('of approved', 'অনুমোদিত')} ${fmt.money(bApproved)}`} />
        <Stat label={tr('Donations received', 'প্রাপ্ত অনুদান')} value={fmt.money(donTotal)} color={GREEN} sub={`${fmt.num(donations.filter((d) => d.status === 'paid').length)} ${tr('paid', 'পরিশোধিত')}`} />
        <Stat label={tr('Linked expenses', 'যুক্ত ব্যয়')} value={fmt.money(expTotal)} color={TEAL} sub={`${fmt.num(expenses.length)} ${tr('records', 'রেকর্ড')}`} />
        <Stat label={tr('Attendance', 'উপস্থিতি')} value={fmt.num(attendance)} color={GREEN} sub={`${fmt.num(vols.length)} ${tr('volunteers', 'স্বেচ্ছাসেবক')}`} />
      </div>

      {/* Budget */}
      <Card title={tr('Event Budget', 'অনুষ্ঠান বাজেট')} hint={`${tr('Planned', 'পরিকল্পিত')} ${fmt.money(bPlanned)} · ${tr('Approved', 'অনুমোদিত')} ${fmt.money(bApproved)} · ${tr('Spent', 'ব্যয়')} ${fmt.money(bActual)}`}>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <input value={bForm.category} onChange={(e) => setBForm((f) => ({ ...f, category: e.target.value }))} placeholder={tr('Category (Venue, Food…)', 'বিভাগ (ভেন্যু, খাবার…)')} className="min-w-[150px] flex-1 rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input type="number" value={bForm.planned} onChange={(e) => setBForm((f) => ({ ...f, planned: e.target.value }))} placeholder={tr('Planned', 'পরিকল্পিত')} className="w-24 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input type="number" value={bForm.approved} onChange={(e) => setBForm((f) => ({ ...f, approved: e.target.value }))} placeholder={tr('Approved', 'অনুমোদিত')} className="w-24 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input type="number" value={bForm.actual} onChange={(e) => setBForm((f) => ({ ...f, actual: e.target.value }))} placeholder={tr('Actual', 'প্রকৃত')} className="w-24 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input value={bForm.vendor} onChange={(e) => setBForm((f) => ({ ...f, vendor: e.target.value }))} placeholder={tr('Vendor', 'বিক্রেতা')} className="w-28 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <select value={bForm.status} onChange={(e) => setBForm((f) => ({ ...f, status: e.target.value as EventBudgetStatus }))} className="rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
            {BSTATUS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={saveBudget} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white" style={{ background: TEAL }}>{bEditId ? tr('Save', 'সংরক্ষণ') : <><FaPlus className="h-3 w-3" /> {tr('Add', 'যোগ')}</>}</button>
          {bEditId && <button onClick={() => { setBForm(emptyBudget); setBEditId(null); }} className="rounded-full px-3 py-2 text-[12.5px]" style={{ border: `1px solid ${RULE}`, color: MUTED }}>{tr('Cancel', 'বাতিল')}</button>}
        </div>
        <Table head={[tr('Category', 'বিভাগ'), tr('Planned', 'পরিকল্পিত'), tr('Approved', 'অনুমোদিত'), tr('Actual', 'প্রকৃত'), tr('Vendor', 'বিক্রেতা'), tr('Status', 'অবস্থা'), '']}>
          {budget.map((b) => (
            <tr key={b.id} style={{ borderTop: `1px solid ${RULE}` }}>
              <td className="px-3 py-2.5" style={{ color: INK }}>{b.category}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{fmt.money(Number(b.planned))}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{fmt.money(Number(b.approved))}</td>
              <td className="px-3 py-2.5 font-semibold" style={{ color: AMBER }}>{fmt.money(Number(b.actual))}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{b.vendor || '—'}</td>
              <td className="px-3 py-2.5"><span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: CREAM, color: INK2, border: `1px solid ${RULE}` }}>{b.status}</span></td>
              <td className="px-3 py-2.5 text-right">
                <button onClick={() => editBudget(b)} className="mr-2 text-[12px] font-medium" style={{ color: TEAL }}>{tr('Edit', 'সম্পাদনা')}</button>
                <button onClick={() => delBudget(b.id)} className="text-[12px] text-red-600">{tr('Delete', 'মুছুন')}</button>
              </td>
            </tr>
          ))}
          {budget.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-[13px]" style={{ color: MUTED }}>{tr('No budget items yet.', 'এখনো কোনো বাজেট আইটেম নেই।')}</td></tr>}
        </Table>
      </Card>

      {/* Volunteers */}
      <Card title={tr('Volunteers', 'স্বেচ্ছাসেবক')} hint={`${fmt.num(volAttended)}/${fmt.num(vols.length)} ${tr('attended', 'উপস্থিত')}`}>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <input value={vForm.name} onChange={(e) => setVForm((f) => ({ ...f, name: e.target.value }))} placeholder={tr('Name', 'নাম')} className="min-w-[140px] flex-1 rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input value={vForm.role} onChange={(e) => setVForm((f) => ({ ...f, role: e.target.value }))} placeholder={tr('Role', 'ভূমিকা')} className="w-32 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input value={vForm.department} onChange={(e) => setVForm((f) => ({ ...f, department: e.target.value }))} placeholder={tr('Department', 'বিভাগ')} className="w-32 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input value={vForm.phone} onChange={(e) => setVForm((f) => ({ ...f, phone: e.target.value }))} placeholder={tr('Phone', 'ফোন')} className="w-28 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input value={vForm.shift} onChange={(e) => setVForm((f) => ({ ...f, shift: e.target.value }))} placeholder={tr('Shift', 'শিফট')} className="w-24 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <button onClick={addVol} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white" style={{ background: TEAL }}><FaPlus className="h-3 w-3" /> {tr('Add', 'যোগ')}</button>
        </div>
        <Table head={[tr('Name', 'নাম'), tr('Role', 'ভূমিকা'), tr('Department', 'বিভাগ'), tr('Phone', 'ফোন'), tr('Shift', 'শিফট'), tr('Attended', 'উপস্থিত'), '']}>
          {vols.map((v) => (
            <tr key={v.id} style={{ borderTop: `1px solid ${RULE}` }}>
              <td className="px-3 py-2.5 font-medium" style={{ color: INK }}>{v.name}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{v.role || '—'}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{v.department || '—'}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{v.phone || '—'}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{v.shift || '—'}</td>
              <td className="px-3 py-2.5"><input type="checkbox" checked={v.attended} onChange={() => toggleVolAttend(v)} style={{ accentColor: TEAL }} /></td>
              <td className="px-3 py-2.5 text-right"><button onClick={() => delVol(v.id)} className="rounded-full p-1.5 hover:bg-black/5" style={{ color: MUTED }}><FaTrash className="h-3 w-3" /></button></td>
            </tr>
          ))}
          {vols.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-[13px]" style={{ color: MUTED }}>{tr('No volunteers added yet.', 'এখনো কোনো স্বেচ্ছাসেবক নেই।')}</td></tr>}
        </Table>
      </Card>

      {/* Donations */}
      <Card title={tr('Donations Received', 'প্রাপ্ত অনুদান')} hint={<Link to="/admin/donations" className="text-[12px] font-semibold" style={{ color: TEAL }}>{tr('Manage in Donations', 'অনুদানে পরিচালনা')} →</Link>}>
        <Table head={[tr('Date', 'তারিখ'), tr('Donor', 'দাতা'), tr('Status', 'অবস্থা'), tr('Amount', 'পরিমাণ')]}>
          {donations.map((d) => (
            <tr key={d.id} style={{ borderTop: `1px solid ${RULE}` }}>
              <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{fmt.date(d.created_at)}</td>
              <td className="px-3 py-2.5" style={{ color: INK }}>{d.is_anonymous ? tr('Anonymous', 'নাম গোপন') : (d.donor_name || '—')}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{d.status}</td>
              <td className="px-3 py-2.5 font-semibold" style={{ color: GREEN }}>{fmt.money(Number(d.amount))}</td>
            </tr>
          ))}
          {donations.length === 0 && <tr><td colSpan={4} className="px-3 py-6 text-center text-[13px]" style={{ color: MUTED }}>{tr('No donations linked yet. Attribute a donation to this event from the Donations page.', 'এই অনুষ্ঠানে কোনো অনুদান যুক্ত নেই। অনুদান পেজ থেকে যুক্ত করুন।')}</td></tr>}
        </Table>
      </Card>

      {/* Linked expenses */}
      <Card title={tr('Linked Expenses', 'যুক্ত ব্যয়')} hint={<Link to="/admin/expenses" className="text-[12px] font-semibold" style={{ color: TEAL }}>{tr('Manage in Expenses', 'ব্যয়ে পরিচালনা')} →</Link>}>
        <Table head={[tr('Date', 'তারিখ'), tr('Description', 'বিবরণ'), tr('Vendor', 'বিক্রেতা'), tr('Status', 'অবস্থা'), tr('Amount', 'পরিমাণ')]}>
          {expenses.map((e) => (
            <tr key={e.id} style={{ borderTop: `1px solid ${RULE}` }}>
              <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{fmt.date(e.spent_on)}</td>
              <td className="px-3 py-2.5" style={{ color: INK }}>{e.description || '—'}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{e.vendor || '—'}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{e.status}</td>
              <td className="px-3 py-2.5 font-semibold" style={{ color: AMBER }}>{fmt.money(Number(e.amount))}</td>
            </tr>
          ))}
          {expenses.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-[13px]" style={{ color: MUTED }}>{tr('No expenses linked to this event yet. Set the event on an expense in the Expenses page.', 'এই অনুষ্ঠানে কোনো ব্যয় যুক্ত নেই। ব্যয় পেজে অনুষ্ঠান নির্বাচন করুন।')}</td></tr>}
        </Table>
      </Card>
    </div>
  );
}

function Stat({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-[10px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1.5 text-[22px] font-bold" style={{ color }}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px]" style={{ color: MUTED }}>{sub}</div>}
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{title}</h2>
        {typeof hint === 'string' ? <span className="font-mono text-[11px]" style={{ color: MUTED }}>{hint}</span> : hint}
      </div>
      {children}
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead><tr>{head.map((h, i) => <th key={i} className={`px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${i === head.length - 1 ? 'text-right' : 'text-left'}`} style={{ color: MUTED }}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
