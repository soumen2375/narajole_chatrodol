import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPlus, FaTrash, FaHandHoldingDollar } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { CswoGrant, CswoGrantTranche, CswoFund, GrantStatus } from '@/types';
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

const GRANT_STATUS: GrantStatus[] = ['pending', 'active', 'completed', 'closed'];
const today = () => new Date().toISOString().slice(0, 10);

type GForm = {
  grantor: string; title: string; reference: string; fund_id: string;
  sanctioned_amount: string; start_date: string; end_date: string; status: GrantStatus; contact_person: string; contact_phone: string; note: string;
};
const EMPTY_G: GForm = { grantor: '', title: '', reference: '', fund_id: '', sanctioned_amount: '', start_date: '', end_date: '', status: 'active', contact_person: '', contact_phone: '', note: '' };

type TForm = { amount: string; received_on: string; reference: string; note: string };
const emptyT = (): TForm => ({ amount: '', received_on: today(), reference: '', note: '' });

export default function AdminGrants() {
  const { member: me } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [grants, setGrants] = useState<CswoGrant[]>([]);
  const [tranches, setTranches] = useState<CswoGrantTranche[]>([]);
  const [funds, setFunds] = useState<CswoFund[]>([]);
  const [expenses, setExpenses] = useState<{ amount: number; fund_id: string }[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showG, setShowG] = useState(false);
  const [editingG, setEditingG] = useState<CswoGrant | null>(null);
  const [gForm, setGForm] = useState<GForm>(EMPTY_G);
  const [savingG, setSavingG] = useState(false);
  const [gErr, setGErr] = useState('');

  const [tForm, setTForm] = useState<TForm>(emptyT());
  const [savingT, setSavingT] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [gR, tR, fR, eR] = await Promise.all([
      supabase.from('cswo_grants').select('*').order('created_at', { ascending: false }),
      supabase.from('cswo_grant_tranches').select('*').order('tranche_no'),
      supabase.from('cswo_funds').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('cswo_expenses').select('amount,fund_id').eq('status', 'approved'),
    ]);
    const gs = (gR.data ?? []) as CswoGrant[];
    setGrants(gs);
    setTranches((tR.data ?? []) as CswoGrantTranche[]);
    setFunds((fR.data ?? []) as CswoFund[]);
    setExpenses((eR.data ?? []) as { amount: number; fund_id: string }[]);
    setSelectedId((cur) => cur && gs.some((g) => g.id === cur) ? cur : (gs[0]?.id ?? null));
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const receivedOf = useCallback((grantId: string) =>
    tranches.filter((t) => t.grant_id === grantId && t.status === 'received').reduce((s, t) => s + Number(t.amount), 0), [tranches]);

  const spentOf = useCallback((fundId: string | null) => {
    if (!fundId) return 0;
    return expenses.filter((e) => e.fund_id === fundId).reduce((s, e) => s + Number(e.amount), 0);
  }, [expenses]);

  const selected = grants.find((g) => g.id === selectedId) ?? null;
  const selTranches = useMemo(() => tranches.filter((t) => t.grant_id === selectedId).sort((a, b) => a.tranche_no - b.tranche_no), [tranches, selectedId]);

  const fundName = (id: string | null) => { const f = funds.find((x) => x.id === id); return f ? (lang === 'bn' ? f.name_bn : f.name_en) : '—'; };
  const statusLabel = (s: GrantStatus) => ({ pending: tr('Pending', 'অপেক্ষমাণ'), active: tr('Active', 'সক্রিয়'), completed: tr('Completed', 'সম্পন্ন'), closed: tr('Closed', 'বন্ধ') }[s]);

  const openAddG = () => { setEditingG(null); setGForm(EMPTY_G); setGErr(''); setShowG(true); };
  const openEditG = (g: CswoGrant) => {
    setEditingG(g);
    setGForm({ grantor: g.grantor, title: g.title, reference: g.reference, fund_id: g.fund_id ?? '', sanctioned_amount: String(Number(g.sanctioned_amount)), start_date: g.start_date ?? '', end_date: g.end_date ?? '', status: g.status, contact_person: g.contact_person, contact_phone: g.contact_phone ?? '', note: g.note });
    setGErr(''); setShowG(true);
  };

  const saveG = async () => {
    if (!gForm.grantor.trim() || !gForm.title.trim()) { setGErr(tr('Grantor and title are required.', 'অনুদানদাতা ও শিরোনাম আবশ্যক।')); return; }
    setSavingG(true); setGErr('');
    const payload = {
      grantor: gForm.grantor.trim(), title: gForm.title.trim(), reference: gForm.reference.trim(), fund_id: gForm.fund_id || null,
      sanctioned_amount: Number(gForm.sanctioned_amount || 0), start_date: gForm.start_date || null, end_date: gForm.end_date || null,
      status: gForm.status, contact_person: gForm.contact_person.trim(), contact_phone: gForm.contact_phone.trim(), note: gForm.note.trim(),
    };
    const { error } = editingG
      ? await supabase.from('cswo_grants').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingG.id)
      : await supabase.from('cswo_grants').insert({ ...payload, created_by: me?.id });
    setSavingG(false);
    if (error) { setGErr(error.message); return; }
    setShowG(false); await load();
  };

  const removeG = async (id: string) => {
    if (!window.confirm(tr('Delete this grant and all its tranches?', 'এই অনুদান ও এর সব কিস্তি মুছবেন?'))) return;
    await supabase.from('cswo_grants').delete().eq('id', id);
    await load();
  };

  const addTranche = async () => {
    if (!selectedId || !tForm.amount || Number(tForm.amount) <= 0) return;
    setSavingT(true);
    const nextNo = (selTranches.reduce((m, t) => Math.max(m, t.tranche_no), 0)) + 1;
    await supabase.from('cswo_grant_tranches').insert({
      grant_id: selectedId, tranche_no: nextNo, amount: Number(tForm.amount),
      received_on: tForm.received_on || null, status: 'expected', reference: tForm.reference.trim(), note: tForm.note.trim(),
    });
    setTForm(emptyT());
    setSavingT(false);
    await load();
  };

  const toggleReceived = async (t: CswoGrantTranche) => {
    const next = t.status === 'received' ? 'expected' : 'received';
    await supabase.from('cswo_grant_tranches').update({
      status: next, received_on: next === 'received' ? (t.received_on || today()) : t.received_on, updated_at: new Date().toISOString(),
    }).eq('id', t.id);
    await load();
  };

  const removeTranche = async (id: string) => {
    await supabase.from('cswo_grant_tranches').delete().eq('id', id);
    await load();
  };

  const totalSanctioned = grants.filter((g) => g.status === 'active' || g.status === 'pending').reduce((s, g) => s + Number(g.sanctioned_amount), 0);
  const totalReceived = tranches.filter((t) => t.status === 'received').reduce((s, t) => s + Number(t.amount), 0);

  if (loading) return <TableSkeleton rows={6} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Finance', 'অর্থ')} · {tr('Grants', 'অনুদান-তহবিল')}</div>
          <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Grants & Funding', 'অনুদান ও তহবিল')}</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Track grant agreements and their tranches. Marking a tranche received posts a credit to the ledger automatically.', 'অনুদান চুক্তি ও কিস্তি ট্র্যাক করুন। কিস্তি “প্রাপ্ত” চিহ্নিত করলে স্বয়ংক্রিয়ভাবে লেজারে জমা যুক্ত হয়।')}</p>
        </div>
        <button onClick={openAddG} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}><FaPlus className="h-3 w-3" /> {tr('New grant', 'নতুন অনুদান')}</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Stat label={tr('Sanctioned (open)', 'অনুমোদিত (চলমান)')} value={fmt.money(totalSanctioned)} color={INK} />
        <Stat label={tr('Received', 'প্রাপ্ত')} value={fmt.money(totalReceived)} color={GREEN} />
        <Stat label={tr('Grants', 'অনুদান')} value={fmt.num(grants.length)} color={BRAND} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Grants list */}
        <div className="space-y-3">
          {grants.length === 0 && <p className="text-[13px]" style={{ color: MUTED }}>{tr('No grants yet.', 'এখনো কোনো অনুদান নেই।')}</p>}
          {grants.map((g) => {
            const got = receivedOf(g.id);
            const sanc = Number(g.sanctioned_amount) || 0;
            const pct = sanc > 0 ? Math.min(100, Math.round((got / sanc) * 100)) : 0;
            const active = g.id === selectedId;
            return (
              <button key={g.id} onClick={() => setSelectedId(g.id)} className="w-full rounded-[8px] p-4 text-left" style={{ background: active ? CREAM : PAPER, border: `1px solid ${active ? BRAND : RULE}` }}>
                <div className="flex items-center gap-2">
                  <FaHandHoldingDollar className="h-3.5 w-3.5" style={{ color: BRAND }} />
                  <span className="min-w-0 flex-1 truncate font-semibold" style={{ color: INK }}>{g.grantor}</span>
                  <span className="font-mono text-[9px] uppercase" style={{ color: g.status === 'active' ? GREEN : MUTED }}>{statusLabel(g.status)}</span>
                </div>
                <div className="mt-0.5 truncate text-[12px]" style={{ color: INK2 }}>{g.title}</div>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-[15px] font-bold" style={{ color: GREEN }}>{fmt.money(got)}</span>
                  <span className="text-[11px]" style={{ color: MUTED }}>/ {fmt.money(sanc)}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: '#f1efe9' }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: BRAND }} /></div>
              </button>
            );
          })}
        </div>

        {/* Selected grant */}
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{selected.grantor}</h2>
                  <div className="mt-0.5 text-[13px]" style={{ color: INK2 }}>{selected.title}</div>
                  <div className="mt-1 font-mono text-[11px]" style={{ color: MUTED }}>
                    {selected.reference && <span>{tr('Ref', 'রেফ')} {selected.reference} · </span>}{tr('Fund', 'তহবিল')}: {fundName(selected.fund_id)}
                    {selected.start_date && <span> · {fmt.date(selected.start_date)}{selected.end_date ? ` — ${fmt.date(selected.end_date)}` : ''}</span>}
                  </div>
                  {(selected.contact_person || selected.contact_phone) && (
                    <div className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
                      {tr('Contact', 'যোগাযোগ')}: {selected.contact_person}{selected.contact_phone ? ` · 📞 ${selected.contact_phone}` : ''}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 text-[12px] font-medium">
                  <button onClick={() => openEditG(selected)} style={{ color: BRAND }} className="hover:underline">{tr('Edit', 'সম্পাদনা')}</button>
                  <button onClick={() => removeG(selected.id)} className="text-red-600 hover:underline">{tr('Delete', 'মুছুন')}</button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Mini label={tr('Total Grant', 'মোট অনুদান')} value={fmt.money(Number(selected.sanctioned_amount))} color={INK2} />
                <Mini label={tr('Received', 'প্রাপ্ত হয়েছে')} value={fmt.money(receivedOf(selected.id))} color={GREEN} />
                <Mini label={tr('Spent', 'ব্যয় হয়েছে')} value={fmt.money(spentOf(selected.fund_id))} color={BRAND} sub={`${Math.round((spentOf(selected.fund_id) / Math.max(1, Number(selected.sanctioned_amount))) * 100)}%`} />
                <Mini label={tr('Remaining', 'অবশিষ্ট')} value={fmt.money(Number(selected.sanctioned_amount) - spentOf(selected.fund_id))} color={GREEN} />
              </div>
              {selected.note && <p className="mt-3 text-[12.5px]" style={{ color: INK2 }}>{selected.note}</p>}
            </div>

            {/* Add tranche */}
            <div className="rounded-[8px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: MUTED }}>{tr('Add tranche', 'কিস্তি যোগ')}</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input type="number" value={tForm.amount} onChange={(e) => setTForm((f) => ({ ...f, amount: e.target.value }))} placeholder={tr('Amount', 'পরিমাণ')} className="w-32 rounded-[6px] px-2 py-1.5 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
                <input type="date" value={tForm.received_on} onChange={(e) => setTForm((f) => ({ ...f, received_on: e.target.value }))} className="rounded-[6px] px-2 py-1.5 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
                <input value={tForm.reference} onChange={(e) => setTForm((f) => ({ ...f, reference: e.target.value }))} placeholder={tr('Reference', 'রেফারেন্স')} className="min-w-[120px] flex-1 rounded-[6px] px-2 py-1.5 text-[12.5px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
                <button onClick={addTranche} disabled={savingT || !tForm.amount} className="rounded-full px-4 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: BRAND }}>{tr('Add', 'যোগ')}</button>
              </div>
              <p className="mt-2 text-[11px]" style={{ color: MUTED }}>{tr('Tranches are added as expected. Mark received to post the credit.', 'কিস্তি “প্রত্যাশিত” হিসেবে যোগ হয়। জমা পোস্ট করতে “প্রাপ্ত” চিহ্নিত করুন।')}</p>
            </div>

            {/* Tranches */}
            <div className="overflow-hidden rounded-[8px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <table className="w-full text-[13px]">
                <thead><tr style={{ borderBottom: `1px solid ${RULE}` }}>
                  {['#', tr('Amount', 'পরিমাণ'), tr('Date', 'তারিখ'), tr('Reference', 'রেফারেন্স'), tr('Status', 'অবস্থা'), ''].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: MUTED }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {selTranches.map((t) => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${RULE}`, background: t.status === 'received' ? 'rgba(77,124,15,0.04)' : undefined }}>
                      <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{fmt.num(t.tranche_no)}</td>
                      <td className="px-3 py-2.5 font-semibold" style={{ color: INK }}>{fmt.money(Number(t.amount))}</td>
                      <td className="px-3 py-2.5" style={{ color: INK2 }}>{t.received_on ? fmt.date(t.received_on) : '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{t.reference || '—'}</td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => toggleReceived(t)} className="rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ background: t.status === 'received' ? 'rgba(77,124,15,0.12)' : CREAM, color: t.status === 'received' ? GREEN : MUTED, border: `1px solid ${RULE}` }}>
                          {t.status === 'received' ? tr('Received', 'প্রাপ্ত') : tr('Mark received', 'প্রাপ্ত করুন')}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-right"><button onClick={() => removeTranche(t.id)} className="rounded-full p-1.5 transition-colors hover:bg-black/5" style={{ color: MUTED }}><FaTrash className="h-3 w-3" /></button></td>
                    </tr>
                  ))}
                  {selTranches.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-[13px]" style={{ color: MUTED }}>{tr('No tranches yet.', 'এখনো কোনো কিস্তি নেই।')}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-[8px] p-10 text-center text-[13px]" style={{ background: PAPER, border: `1px solid ${RULE}`, color: MUTED }}>{tr('Add a grant to begin.', 'শুরু করতে একটি অনুদান যোগ করুন।')}</div>
        )}
      </div>

      {showG && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowG(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] p-6 shadow-xl" style={{ background: PAPER }} onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-[18px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{editingG ? tr('Edit grant', 'অনুদান সম্পাদনা') : tr('New grant', 'নতুন অনুদান')}</h2>
            {gErr && <p className="mb-3 rounded px-3 py-2 text-[13px]" style={{ background: 'rgba(194,65,12,0.1)', color: BRAND }}>{gErr}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Key identification fields */}
              <input className="input" placeholder={tr('Grantor / agency', 'অনুদানদাতা / সংস্থা')} value={gForm.grantor} onChange={(e) => setGForm((f) => ({ ...f, grantor: e.target.value }))} />
              <input className="input" placeholder={tr('Grant / project title', 'অনুদান / প্রকল্পের শিরোনাম')} value={gForm.title} onChange={(e) => setGForm((f) => ({ ...f, title: e.target.value }))} />
              {/* Contact person - separate name and phone fields */}
              <div>
                <label className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.18em]" style={{ color: '#78716c' }}>
                  {tr('Contact Person Name', 'যোগাযোগের ব্যক্তির নাম')}
                </label>
                <input className="input" placeholder={tr('Contact person name', 'যোগাযোগের ব্যক্তির নাম')} value={gForm.contact_person} onChange={(e) => setGForm((f) => ({ ...f, contact_person: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[9.5px] uppercase tracking-[0.18em]" style={{ color: '#78716c' }}>
                  {tr('Contact Phone Number', 'যোগাযোগের ফোন নম্বর')}
                </label>
                <input className="input" type="tel" placeholder={tr('Phone number', 'ফোন নম্বর')} value={gForm.contact_phone} onChange={(e) => setGForm((f) => ({ ...f, contact_phone: e.target.value }))} />
              </div>
              {/* Date fields - moved up */}
              <div className="sm:col-span-2">
                <div className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.18em]" style={{ color: '#78716c' }}>
                  {tr('Grant Period', 'অনুদানের মেয়াদ')}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <input className="input" type="date" value={gForm.start_date} onChange={(e) => setGForm((f) => ({ ...f, start_date: e.target.value }))} />
                  <input className="input" type="date" value={gForm.end_date} onChange={(e) => setGForm((f) => ({ ...f, end_date: e.target.value }))} />
                </div>
              </div>
              {/* Financial details */}
              <input className="input" placeholder={tr('Reference / agreement no.', 'রেফারেন্স / চুক্তি নং')} value={gForm.reference} onChange={(e) => setGForm((f) => ({ ...f, reference: e.target.value }))} />
              <input className="input" type="number" placeholder={tr('Sanctioned amount (₹)', 'অনুমোদিত পরিমাণ (₹)')} value={gForm.sanctioned_amount} onChange={(e) => setGForm((f) => ({ ...f, sanctioned_amount: e.target.value }))} />
              <select className="input" value={gForm.fund_id} onChange={(e) => setGForm((f) => ({ ...f, fund_id: e.target.value }))}>
                <option value="">{tr('No fund', 'কোনো তহবিল নয়')}</option>
                {funds.map((f) => <option key={f.id} value={f.id}>{lang === 'bn' ? f.name_bn : f.name_en}</option>)}
              </select>
              <select className="input" value={gForm.status} onChange={(e) => setGForm((f) => ({ ...f, status: e.target.value as GrantStatus }))}>
                {GRANT_STATUS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
              </select>
              <textarea className="input resize-none sm:col-span-2" rows={2} placeholder={tr('Note', 'নোট')} value={gForm.note} onChange={(e) => setGForm((f) => ({ ...f, note: e.target.value }))} />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowG(false)} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('Cancel', 'বাতিল')}</button>
              <button onClick={saveG} disabled={savingG} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: BRAND }}>{savingG ? tr('Saving…', 'সংরক্ষণ…') : tr('Save', 'সংরক্ষণ')}</button>
            </div>
          </div>
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

function Mini({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="rounded-[6px] p-2.5" style={{ background: CREAM }}>
      <div className="font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-0.5 text-[15px] font-bold" style={{ color }}>{value}</div>
      {sub && <div className="mt-0.5 text-[10.5px] font-semibold text-stone-500" style={{ color: MUTED }}>{sub}</div>}
    </div>
  );
}
