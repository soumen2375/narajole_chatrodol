import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPlus, FaBoxOpen } from 'react-icons/fa6';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CswoEvent, CswoEventInventory, CswoEventBeneficiary } from '@/types';
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
const RED = '#b91c1c';
const PAPER = '#ffffff';

const emptyInv = { item: '', category: '', variant: '', qty_required: '', qty_available: '', unit_cost: '' };
const emptyBen = {
  name: '', age: '', gender: '' as '' | 'male' | 'female' | 'other', phone: '', address: '',
  family_size: '', income_category: '', id_proof: '', verified: false, inventory_id: '', item_received: '', quantity: '1',
};

export default function AdminBeneficiaries() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [event, setEvent] = useState<CswoEvent | null>(null);
  const [inventory, setInventory] = useState<CswoEventInventory[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<CswoEventBeneficiary[]>([]);
  const [loading, setLoading] = useState(true);

  const [iForm, setIForm] = useState(emptyInv);
  const [iEditId, setIEditId] = useState<string | null>(null);

  const [bForm, setBForm] = useState(emptyBen);
  const [bEditId, setBEditId] = useState<string | null>(null);
  const [showBen, setShowBen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [evR, iR, bR] = await Promise.all([
      supabase.from('cswo_events').select('*').eq('id', id).maybeSingle(),
      supabase.from('cswo_event_inventory').select('*').eq('event_id', id).order('created_at'),
      supabase.from('cswo_event_beneficiaries').select('*').eq('event_id', id).order('created_at'),
    ]);
    setEvent((evR.data ?? null) as CswoEvent | null);
    setInventory((iR.data ?? []) as CswoEventInventory[]);
    setBeneficiaries((bR.data ?? []) as CswoEventBeneficiary[]);
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const invLabel = (inv: CswoEventInventory) => `${inv.item}${inv.variant ? ` · ${inv.variant}` : ''}`;
  const distributedOf = useMemo(() => {
    const m: Record<string, number> = {};
    beneficiaries.forEach((b) => { if (b.inventory_id) m[b.inventory_id] = (m[b.inventory_id] ?? 0) + Number(b.quantity); });
    return m;
  }, [beneficiaries]);

  // ── Inventory ──
  const saveInv = async () => {
    if (!iForm.item.trim()) return;
    const payload = {
      event_id: id, item: iForm.item.trim(), category: iForm.category.trim(), variant: iForm.variant.trim(),
      qty_required: Number(iForm.qty_required || 0), qty_available: Number(iForm.qty_available || 0), unit_cost: Number(iForm.unit_cost || 0),
    };
    if (iEditId) await supabase.from('cswo_event_inventory').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', iEditId);
    else await supabase.from('cswo_event_inventory').insert(payload);
    setIForm(emptyInv); setIEditId(null);
    await load();
  };
  const editInv = (inv: CswoEventInventory) => {
    setIEditId(inv.id);
    setIForm({ item: inv.item, category: inv.category, variant: inv.variant, qty_required: String(inv.qty_required), qty_available: String(inv.qty_available), unit_cost: String(Number(inv.unit_cost)) });
  };
  const delInv = async (iid: string) => { await supabase.from('cswo_event_inventory').delete().eq('id', iid); await load(); };

  // ── Beneficiaries ──
  const saveBen = async () => {
    if (!bForm.name.trim()) return;
    const inv = inventory.find((x) => x.id === bForm.inventory_id);
    const payload = {
      event_id: id, name: bForm.name.trim(), age: bForm.age ? Number(bForm.age) : null, gender: bForm.gender,
      phone: bForm.phone.trim(), address: bForm.address.trim(), family_size: Number(bForm.family_size || 0),
      income_category: bForm.income_category.trim(), id_proof: bForm.id_proof.trim(), verified: bForm.verified,
      inventory_id: bForm.inventory_id || null, item_received: inv ? invLabel(inv) : bForm.item_received.trim(), quantity: Number(bForm.quantity || 0),
    };
    if (bEditId) await supabase.from('cswo_event_beneficiaries').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', bEditId);
    else await supabase.from('cswo_event_beneficiaries').insert(payload);
    setShowBen(false); setBForm(emptyBen); setBEditId(null);
    await load();
  };
  const editBen = (b: CswoEventBeneficiary) => {
    setBEditId(b.id);
    setBForm({
      name: b.name, age: b.age != null ? String(b.age) : '', gender: b.gender, phone: b.phone, address: b.address,
      family_size: String(b.family_size), income_category: b.income_category, id_proof: b.id_proof, verified: b.verified,
      inventory_id: b.inventory_id ?? '', item_received: b.item_received, quantity: String(b.quantity),
    });
    setShowBen(true);
  };
  const delBen = async (bid: string) => { await supabase.from('cswo_event_beneficiaries').delete().eq('id', bid); await load(); };

  if (loading) return <TableSkeleton rows={6} />;
  if (!event) return (
    <div className="py-16 text-center">
      <p style={{ color: MUTED }}>{tr('Event not found.', 'অনুষ্ঠান পাওয়া যায়নি।')}</p>
      <button 
        onClick={() => navigate(-1)} 
        className="mt-3 inline-flex items-center gap-1.5 font-semibold bg-transparent border-0 p-0 cursor-pointer" 
        style={{ color: TEAL }}
      >
        <ArrowLeft className="h-4 w-4" /> {tr('Back', 'ফিরুন')}
      </button>
    </div>
  );

  const verified = beneficiaries.filter((b) => b.verified).length;
  const distributedTotal = beneficiaries.reduce((s, b) => s + Number(b.quantity), 0);

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate(-1)} 
        className="inline-flex items-center gap-2 text-[13px] font-medium cursor-pointer bg-transparent border-0 p-0 hover:opacity-80" 
        style={{ color: MUTED }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {tr('Back to event', 'অনুষ্ঠানে ফিরুন')}
      </button>

      <div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: TEAL }}>
          <FaBoxOpen className="h-3 w-3" /> {tr('Relief & Distribution', 'ত্রাণ ও বিতরণ')}
        </div>
        <h1 className="mt-1.5 text-[26px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{event.title}</h1>
        <p className="mt-1 text-[13px]" style={{ color: INK2 }}>{fmt.date(event.event_date)}{event.location ? ` · ${event.location}` : ''}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={tr('Beneficiaries', 'উপকারভোগী')} value={fmt.num(beneficiaries.length)} color={INK} />
        <Stat label={tr('Verified', 'যাচাইকৃত')} value={fmt.num(verified)} color={GREEN} />
        <Stat label={tr('Items distributed', 'বিতরণকৃত আইটেম')} value={fmt.num(distributedTotal)} color={TEAL} />
        <Stat label={tr('Stock items', 'স্টক আইটেম')} value={fmt.num(inventory.length)} color={AMBER} />
      </div>

      {/* Inventory */}
      <Card title={tr('Inventory', 'মজুদ')}>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <input value={iForm.item} onChange={(e) => setIForm((f) => ({ ...f, item: e.target.value }))} placeholder={tr('Item (Shirt, Rice…)', 'আইটেম (জামা, চাল…)')} className="min-w-[140px] flex-1 rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input value={iForm.variant} onChange={(e) => setIForm((f) => ({ ...f, variant: e.target.value }))} placeholder={tr('Size / variant', 'সাইজ / ধরন')} className="w-28 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input type="number" value={iForm.qty_required} onChange={(e) => setIForm((f) => ({ ...f, qty_required: e.target.value }))} placeholder={tr('Required', 'প্রয়োজন')} className="w-24 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input type="number" value={iForm.qty_available} onChange={(e) => setIForm((f) => ({ ...f, qty_available: e.target.value }))} placeholder={tr('Available', 'মজুদ')} className="w-24 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input type="number" value={iForm.unit_cost} onChange={(e) => setIForm((f) => ({ ...f, unit_cost: e.target.value }))} placeholder={tr('Unit ₹', 'একক ₹')} className="w-24 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <button onClick={saveInv} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white" style={{ background: TEAL }}>{iEditId ? tr('Save', 'সংরক্ষণ') : <><FaPlus className="h-3 w-3" /> {tr('Add', 'যোগ')}</>}</button>
          {iEditId && <button onClick={() => { setIForm(emptyInv); setIEditId(null); }} className="rounded-full px-3 py-2 text-[12.5px]" style={{ border: `1px solid ${RULE}`, color: MUTED }}>{tr('Cancel', 'বাতিল')}</button>}
        </div>
        <Table head={[tr('Item', 'আইটেম'), tr('Variant', 'ধরন'), tr('Required', 'প্রয়োজন'), tr('Available', 'মজুদ'), tr('Distributed', 'বিতরণ'), tr('Remaining', 'বাকি'), tr('Unit ₹', 'একক ₹'), '']}>
          {inventory.map((inv) => {
            const dist = distributedOf[inv.id] ?? 0;
            const remaining = inv.qty_available - dist;
            return (
              <tr key={inv.id} style={{ borderTop: `1px solid ${RULE}` }}>
                <td className="px-3 py-2.5 font-medium" style={{ color: INK }}>{inv.item}{inv.category ? <span className="ml-1 text-[11px]" style={{ color: MUTED }}>· {inv.category}</span> : null}</td>
                <td className="px-3 py-2.5" style={{ color: INK2 }}>{inv.variant || '—'}</td>
                <td className="px-3 py-2.5" style={{ color: INK2 }}>{fmt.num(inv.qty_required)}</td>
                <td className="px-3 py-2.5" style={{ color: INK2 }}>{fmt.num(inv.qty_available)}</td>
                <td className="px-3 py-2.5 font-semibold" style={{ color: TEAL }}>{fmt.num(dist)}</td>
                <td className="px-3 py-2.5 font-semibold" style={{ color: remaining < 0 ? RED : INK }}>{fmt.num(remaining)}</td>
                <td className="px-3 py-2.5" style={{ color: INK2 }}>{fmt.money(Number(inv.unit_cost))}</td>
                <td className="px-3 py-2.5 text-right">
                  <button onClick={() => editInv(inv)} className="mr-2 text-[12px] font-medium" style={{ color: TEAL }}>{tr('Edit', 'সম্পাদনা')}</button>
                  <button onClick={() => delInv(inv.id)} className="text-[12px] text-red-600">{tr('Delete', 'মুছুন')}</button>
                </td>
              </tr>
            );
          })}
          {inventory.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-[13px]" style={{ color: MUTED }}>{tr('No inventory items yet.', 'এখনো কোনো মজুদ নেই।')}</td></tr>}
        </Table>
      </Card>

      {/* Beneficiaries */}
      <Card title={tr('Beneficiaries', 'উপকারভোগী')} action={<button onClick={() => { setBForm(emptyBen); setBEditId(null); setShowBen(true); }} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white" style={{ background: TEAL }}><FaPlus className="h-3 w-3" /> {tr('Add beneficiary', 'উপকারভোগী যোগ')}</button>}>
        <Table head={[tr('Code', 'কোড'), tr('Name', 'নাম'), tr('Phone', 'ফোন'), tr('Received', 'প্রাপ্ত'), tr('Qty', 'সংখ্যা'), tr('Verified', 'যাচাই'), '']}>
          {beneficiaries.map((b) => (
            <tr key={b.id} style={{ borderTop: `1px solid ${RULE}` }}>
              <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{b.beneficiary_code}</td>
              <td className="px-3 py-2.5 font-medium" style={{ color: INK }}>{b.name}{b.family_size ? <span className="ml-1 text-[11px]" style={{ color: MUTED }}>· {tr('family', 'পরিবার')} {fmt.num(b.family_size)}</span> : null}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{b.phone || '—'}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{b.item_received || '—'}</td>
              <td className="px-3 py-2.5 font-semibold" style={{ color: TEAL }}>{fmt.num(b.quantity)}</td>
              <td className="px-3 py-2.5">{b.verified ? <span style={{ color: GREEN }}>✓</span> : <span style={{ color: MUTED }}>—</span>}</td>
              <td className="px-3 py-2.5 text-right">
                <button onClick={() => editBen(b)} className="mr-2 text-[12px] font-medium" style={{ color: TEAL }}>{tr('Edit', 'সম্পাদনা')}</button>
                <button onClick={() => delBen(b.id)} className="text-[12px] text-red-600">{tr('Delete', 'মুছুন')}</button>
              </td>
            </tr>
          ))}
          {beneficiaries.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-[13px]" style={{ color: MUTED }}>{tr('No beneficiaries yet.', 'এখনো কোনো উপকারভোগী নেই।')}</td></tr>}
        </Table>
      </Card>

      {showBen && (
        <Modal title={bEditId ? tr('Edit beneficiary', 'উপকারভোগী সম্পাদনা') : tr('Add beneficiary', 'উপকারভোগী যোগ')} onClose={() => setShowBen(false)} onSave={saveBen}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className="input" placeholder={tr('Full name', 'পুরো নাম')} value={bForm.name} onChange={(e) => setBForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder={tr('Phone', 'ফোন')} value={bForm.phone} onChange={(e) => setBForm((f) => ({ ...f, phone: e.target.value }))} />
            <input className="input" type="number" placeholder={tr('Age', 'বয়স')} value={bForm.age} onChange={(e) => setBForm((f) => ({ ...f, age: e.target.value }))} />
            <select className="input" value={bForm.gender} onChange={(e) => setBForm((f) => ({ ...f, gender: e.target.value as typeof bForm.gender }))}>
              <option value="">{tr('Gender', 'লিঙ্গ')}</option><option value="male">{tr('Male', 'পুরুষ')}</option><option value="female">{tr('Female', 'মহিলা')}</option><option value="other">{tr('Other', 'অন্যান্য')}</option>
            </select>
            <input className="input" type="number" placeholder={tr('Family size', 'পরিবারের সদস্য')} value={bForm.family_size} onChange={(e) => setBForm((f) => ({ ...f, family_size: e.target.value }))} />
            <input className="input" placeholder={tr('Income category', 'আয়ের শ্রেণি')} value={bForm.income_category} onChange={(e) => setBForm((f) => ({ ...f, income_category: e.target.value }))} />
            <input className="input sm:col-span-2" placeholder={tr('Address', 'ঠিকানা')} value={bForm.address} onChange={(e) => setBForm((f) => ({ ...f, address: e.target.value }))} />
            <input className="input sm:col-span-2" placeholder={tr('ID proof (type / number)', 'পরিচয়পত্র (ধরন / নম্বর)')} value={bForm.id_proof} onChange={(e) => setBForm((f) => ({ ...f, id_proof: e.target.value }))} />
            <select className="input" value={bForm.inventory_id} onChange={(e) => setBForm((f) => ({ ...f, inventory_id: e.target.value }))}>
              <option value="">{tr('Item received (from stock)', 'প্রাপ্ত আইটেম (মজুদ থেকে)')}</option>
              {inventory.map((inv) => <option key={inv.id} value={inv.id}>{invLabel(inv)}</option>)}
            </select>
            <input className="input" type="number" placeholder={tr('Quantity', 'সংখ্যা')} value={bForm.quantity} onChange={(e) => setBForm((f) => ({ ...f, quantity: e.target.value }))} />
            {!bForm.inventory_id && <input className="input sm:col-span-2" placeholder={tr('Or type item received', 'অথবা প্রাপ্ত আইটেম লিখুন')} value={bForm.item_received} onChange={(e) => setBForm((f) => ({ ...f, item_received: e.target.value }))} />}
            <label className="flex items-center gap-2 text-[13px] sm:col-span-2" style={{ color: INK2 }}><input type="checkbox" checked={bForm.verified} onChange={(e) => setBForm((f) => ({ ...f, verified: e.target.checked }))} /> {tr('Documents verified', 'নথি যাচাইকৃত')}</label>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[10px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1.5 text-[24px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{title}</h2>
        {action}
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
function Modal({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] p-6 shadow-xl" style={{ background: PAPER }} onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-[18px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{title}</h2>
        {children}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('Cancel', 'বাতিল')}</button>
          <button onClick={onSave} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white" style={{ background: TEAL }}>{tr('Save', 'সংরক্ষণ')}</button>
        </div>
      </div>
    </div>
  );
}
