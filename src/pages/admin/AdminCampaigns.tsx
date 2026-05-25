import { useCallback, useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa6';
import { supabase } from '@/lib/supabase';
import type { CswoCampaign, CswoFund } from '@/types';
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

type Form = {
  name_bn: string; name_en: string; goal_amount: string; fund_id: string;
  starts_on: string; ends_on: string; is_active: boolean; description: string;
};
const EMPTY: Form = { name_bn: '', name_en: '', goal_amount: '', fund_id: '', starts_on: '', ends_on: '', is_active: true, description: '' };
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || `c-${Date.now()}`;

export default function AdminCampaigns() {
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [camps, setCamps] = useState<CswoCampaign[]>([]);
  const [funds, setFunds] = useState<CswoFund[]>([]);
  const [raised, setRaised] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CswoCampaign | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [cR, fR, dR] = await Promise.all([
      supabase.from('cswo_campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('cswo_funds').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('cswo_donations').select('amount,campaign_id').eq('status', 'paid'),
    ]);
    setCamps((cR.data ?? []) as CswoCampaign[]);
    setFunds((fR.data ?? []) as CswoFund[]);
    const r: Record<string, number> = {};
    for (const d of (dR.data ?? []) as { amount: number; campaign_id: string | null }[]) {
      if (d.campaign_id) r[d.campaign_id] = (r[d.campaign_id] ?? 0) + Number(d.amount);
    }
    setRaised(r);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setErr(''); setShowModal(true); };
  const openEdit = (c: CswoCampaign) => {
    setEditing(c);
    setForm({ name_bn: c.name_bn, name_en: c.name_en, goal_amount: String(Number(c.goal_amount)), fund_id: c.fund_id ?? '', starts_on: c.starts_on ?? '', ends_on: c.ends_on ?? '', is_active: c.is_active, description: c.description });
    setErr(''); setShowModal(true);
  };

  const save = async () => {
    if (!form.name_en.trim() || !form.name_bn.trim()) { setErr(tr('Both names are required.', 'উভয় নাম আবশ্যক।')); return; }
    setSaving(true); setErr('');
    const base = {
      name_bn: form.name_bn.trim(), name_en: form.name_en.trim(),
      goal_amount: Number(form.goal_amount || 0), fund_id: form.fund_id || null,
      starts_on: form.starts_on || null, ends_on: form.ends_on || null,
      is_active: form.is_active, description: form.description.trim(),
    };
    const { error } = editing
      ? await supabase.from('cswo_campaigns').update({ ...base, updated_at: new Date().toISOString() }).eq('id', editing.id)
      : await supabase.from('cswo_campaigns').insert({ ...base, slug: slugify(form.name_en) });
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setShowModal(false); await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm(tr('Delete this campaign?', 'এই ক্যাম্পেইন মুছবেন?'))) return;
    await supabase.from('cswo_campaigns').delete().eq('id', id);
    await load();
  };

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Finance', 'অর্থ')} · {tr('Campaigns', 'ক্যাম্পেইন')}</div>
          <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Fundraising Campaigns', 'তহবিল সংগ্রহ ক্যাম্পেইন')}</h1>
          <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('Set goals and track progress. Assign donations to a campaign from the Donations page.', 'লক্ষ্য নির্ধারণ ও অগ্রগতি ট্র্যাক করুন। দান পেজ থেকে দানকে ক্যাম্পেইনে যুক্ত করুন।')}</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}><FaPlus className="h-3 w-3" /> {tr('New campaign', 'নতুন ক্যাম্পেইন')}</button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {camps.length === 0 && <p className="text-[13px]" style={{ color: MUTED }}>{tr('No campaigns yet.', 'এখনো কোনো ক্যাম্পেইন নেই।')}</p>}
        {camps.map((c) => {
          const got = raised[c.id] ?? 0;
          const goal = Number(c.goal_amount) || 0;
          const pct = goal > 0 ? Math.min(100, Math.round((got / goal) * 100)) : 0;
          return (
            <div key={c.id} className="rounded-[8px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[16px] font-semibold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{lang === 'bn' ? c.name_bn : c.name_en}</div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: c.is_active ? GREEN : MUTED }}>{c.is_active ? tr('Active', 'সক্রিয়') : tr('Inactive', 'নিষ্ক্রিয়')}{c.ends_on ? ` · ${tr('ends', 'শেষ')} ${fmt.date(c.ends_on)}` : ''}</div>
                </div>
                <div className="flex gap-2 text-[12px]">
                  <button onClick={() => openEdit(c)} className="font-medium" style={{ color: BRAND }}>{tr('Edit', 'সম্পাদনা')}</button>
                  <button onClick={() => remove(c.id)} className="font-medium text-red-600">{tr('Delete', 'মুছুন')}</button>
                </div>
              </div>
              {c.description && <p className="mt-2 text-[12.5px]" style={{ color: INK2 }}>{c.description}</p>}
              <div className="mt-3 flex items-end justify-between">
                <span className="text-[20px] font-bold" style={{ color: GREEN }}>{fmt.money(got)}</span>
                <span className="text-[12px]" style={{ color: MUTED }}>{tr('of', 'লক্ষ্য')} {fmt.money(goal)}</span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: CREAM }}><div className="h-full rounded-full" style={{ width: `${pct}%`, background: BRAND }} /></div>
              <div className="mt-1 text-right font-mono text-[10px]" style={{ color: MUTED }}>{fmt.num(pct)}%</div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg overflow-y-auto rounded-[10px] p-6 shadow-xl max-h-[90vh]" style={{ background: PAPER }} onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-[18px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{editing ? tr('Edit campaign', 'ক্যাম্পেইন সম্পাদনা') : tr('New campaign', 'নতুন ক্যাম্পেইন')}</h2>
            {err && <p className="mb-3 rounded px-3 py-2 text-[13px]" style={{ background: 'rgba(194,65,12,0.1)', color: BRAND }}>{err}</p>}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input className="input" placeholder={tr('Name (English)', 'নাম (ইংরেজি)')} value={form.name_en} onChange={(e) => setForm((f) => ({ ...f, name_en: e.target.value }))} />
              <input className="input" placeholder={tr('Name (Bengali)', 'নাম (বাংলা)')} value={form.name_bn} onChange={(e) => setForm((f) => ({ ...f, name_bn: e.target.value }))} />
              <input className="input" type="number" placeholder={tr('Goal amount (₹)', 'লক্ষ্য (₹)')} value={form.goal_amount} onChange={(e) => setForm((f) => ({ ...f, goal_amount: e.target.value }))} />
              <select className="input" value={form.fund_id} onChange={(e) => setForm((f) => ({ ...f, fund_id: e.target.value }))}>
                <option value="">{tr('No fund', 'কোনো ফান্ড নয়')}</option>
                {funds.map((f) => <option key={f.id} value={f.id}>{lang === 'bn' ? f.name_bn : f.name_en}</option>)}
              </select>
              <input className="input" type="date" value={form.starts_on} onChange={(e) => setForm((f) => ({ ...f, starts_on: e.target.value }))} />
              <input className="input" type="date" value={form.ends_on} onChange={(e) => setForm((f) => ({ ...f, ends_on: e.target.value }))} />
              <textarea className="input resize-none sm:col-span-2" rows={2} placeholder={tr('Description', 'বিবরণ')} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              <label className="flex items-center gap-2 text-[13px] sm:col-span-2" style={{ color: INK2 }}>
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> {tr('Active', 'সক্রিয়')}
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('Cancel', 'বাতিল')}</button>
              <button onClick={save} disabled={saving} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60" style={{ background: BRAND }}>{saving ? tr('Saving…', 'সংরক্ষণ…') : tr('Save', 'সংরক্ষণ')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
