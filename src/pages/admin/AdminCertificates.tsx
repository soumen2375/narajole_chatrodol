import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPlus, FaPrint, FaAward, FaUserPlus } from 'react-icons/fa6';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CswoEvent, CswoEventCertificate, CertRecipientType } from '@/types';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const TEAL = '#0c756f';
const GOLD = '#b8860b';
const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const PAPER = '#ffffff';
const CREAM = '#faf8f5';

const TYPES: CertRecipientType[] = ['participant', 'winner', 'volunteer', 'donor', 'custom'];
const emptyForm = { recipient_name: '', recipient_type: 'participant' as CertRecipientType, category: '', position: '' };

export default function AdminCertificates() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [event, setEvent] = useState<CswoEvent | null>(null);
  const [certs, setCerts] = useState<CswoEventCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [sign, setSign] = useState({ left: '', right: '', date: '', leftImage: '', rightImage: '', autoSign: false });

  const load = useCallback(async () => {
    setLoading(true);
    const [evR, cR] = await Promise.all([
      supabase.from('cswo_events').select('*').eq('id', id).maybeSingle(),
      supabase.from('cswo_event_certificates').select('*').eq('event_id', id).order('created_at'),
    ]);
    const ev = (evR.data ?? null) as CswoEvent | null;
    setEvent(ev);
    setCerts((cR.data ?? []) as CswoEventCertificate[]);
    setSign((s) => ({ ...s, date: s.date || (ev?.event_date ?? '') }));
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.recipient_name.trim()) return;
    const payload = { event_id: id, recipient_name: form.recipient_name.trim(), recipient_type: form.recipient_type, category: form.category.trim(), position: form.position.trim() };
    if (editId) await supabase.from('cswo_event_certificates').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editId);
    else await supabase.from('cswo_event_certificates').insert(payload);
    setForm(emptyForm); setEditId(null);
    await load();
  };
  const edit = (c: CswoEventCertificate) => { setEditId(c.id); setForm({ recipient_name: c.recipient_name, recipient_type: c.recipient_type, category: c.category, position: c.position }); };
  const del = async (cid: string) => { await supabase.from('cswo_event_certificates').delete().eq('id', cid); await load(); };

  const importFrom = async (type: CertRecipientType, names: string[]) => {
    const have = new Set(certs.filter((c) => c.recipient_type === type).map((c) => c.recipient_name.toLowerCase()));
    const rows = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
      .filter((n) => !have.has(n.toLowerCase()))
      .map((n) => ({ event_id: id, recipient_name: n, recipient_type: type, category: '', position: '' }));
    if (rows.length === 0) return;
    await supabase.from('cswo_event_certificates').insert(rows);
    await load();
  };
  const importVolunteers = async () => {
    const { data } = await supabase.from('cswo_event_volunteers').select('name').eq('event_id', id);
    await importFrom('volunteer', (data ?? []).map((r) => r.name as string));
  };
  const importDonors = async () => {
    const { data } = await supabase.from('cswo_blood_donors').select('name').eq('event_id', id).eq('status', 'donated');
    await importFrom('donor', (data ?? []).map((r) => r.name as string));
  };
  const importBeneficiaries = async () => {
    const { data } = await supabase.from('cswo_event_beneficiaries').select('name').eq('event_id', id);
    await importFrom('participant', (data ?? []).map((r) => r.name as string));
  };
  const importAttendance = async () => {
    const { data } = await supabase.from('cswo_attendance').select('member:cswo_members!member_id(full_name)').eq('event_id', id);
    const names = (data ?? []).map((r) => (r as { member?: { full_name?: string } }).member?.full_name ?? '').filter(Boolean);
    await importFrom('participant', names);
  };

  const printCerts = (list: CswoEventCertificate[]) => {
    if (!event || list.length === 0) return;
    const dateStr = sign.date ? fmt.date(sign.date) : fmt.date(event.event_date);
    const venue = [event.location, event.district].filter(Boolean).join(', ');
    const titleOf = (t: CertRecipientType) => ({
      participant: 'Certificate of Participation', winner: 'Certificate of Achievement',
      volunteer: 'Certificate of Appreciation', donor: 'Certificate of Appreciation', custom: 'Certificate',
    }[t]);
    const bodyOf = (c: CswoEventCertificate) => {
      const ev = `<b>${event.title}</b>`;
      if (c.recipient_type === 'winner') return `has secured <b>${c.position || 'a'}</b> position${c.category ? ` in ${c.category}` : ''} at ${ev}`;
      if (c.recipient_type === 'volunteer') return `served as a dedicated volunteer at ${ev}`;
      if (c.recipient_type === 'donor') return `is gratefully acknowledged for the noble contribution at ${ev}`;
      return `has participated in ${ev}${c.category ? ` (${c.category})` : ''}`;
    };
    const pages = list.map((c) => `
      <div class="cert"><div class="frame">
        <div class="hdr"><div class="org">Chhatradol Social Welfare Organisation</div><div class="orgbn">নাড়াজোল ছাত্রদল</div></div>
        <div class="title">${titleOf(c.recipient_type)}</div>
        <div class="pre">This is proudly presented to</div>
        <div class="name">${c.recipient_name}</div>
        <div class="body">${bodyOf(c)}, held on ${dateStr}${venue ? ` at ${venue}` : ''}.</div>
        <div class="sign">
          <div class="b">
            ${sign.autoSign && sign.leftImage ? `<img src="${sign.leftImage}" alt="signature" style="max-height:40px;max-width:120px;display:block;margin-bottom:2px;" />` : ''}
            <div class="line">${sign.left || 'Organiser'}</div>
            Organiser
          </div>
          <div class="seal">★</div>
          <div class="b">
            ${sign.autoSign && sign.rightImage ? `<img src="${sign.rightImage}" alt="signature" style="max-height:40px;max-width:120px;display:block;margin-bottom:2px;" />` : ''}
            <div class="line">${sign.right || 'Secretary'}</div>
            Secretary
          </div>
        </div>
        <div class="code">${c.cert_code ?? ''}</div>
      </div></div>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Certificates</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Georgia','Segoe UI',serif}
  .cert{width:297mm;height:209mm;padding:14mm;page-break-after:always;display:flex}
  .frame{flex:1;border:3px double ${GOLD};outline:1px solid ${TEAL};outline-offset:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:18mm 24mm;position:relative}
  .hdr{position:absolute;top:14mm;left:0;right:0}
  .org{font-size:20px;font-weight:800;color:${TEAL}}
  .orgbn{font-size:13px;color:#666;margin-top:2px}
  .title{font-size:30px;font-weight:800;letter-spacing:2px;color:${GOLD};text-transform:uppercase;margin-bottom:8px}
  .pre{font-size:13px;color:#555;margin-top:6px}
  .name{font-size:40px;color:${INK};margin:10px 0;font-style:italic;border-bottom:2px solid ${RULE};padding:0 30px 8px}
  .body{font-size:15px;color:#333;max-width:620px;line-height:1.6;margin-top:6px}
  .sign{position:absolute;bottom:16mm;left:24mm;right:24mm;display:flex;justify-content:space-between;align-items:flex-end}
  .sign .b{font-size:12px;color:#444}
  .line{border-top:1.5px solid #1c1917;padding-top:5px;width:170px}
  .seal{font-size:34px;color:${GOLD};opacity:.8}
  .code{position:absolute;bottom:8mm;left:0;right:0;font-size:9px;color:#aaa;letter-spacing:1px}
</style></head><body>${pages}</body></html>`;
    const w = window.open('', '_blank', 'width=1000,height=720');
    if (!w) return;
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 500);
  };

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

  const typeLabel = (t: CertRecipientType) => ({ participant: tr('Participant', 'অংশগ্রহণকারী'), winner: tr('Winner', 'বিজয়ী'), volunteer: tr('Volunteer', 'স্বেচ্ছাসেবক'), donor: tr('Donor', 'দাতা'), custom: tr('Custom', 'কাস্টম') }[t]);

  return (
    <div className="space-y-6">
      <button 
        onClick={() => navigate(-1)} 
        className="inline-flex items-center gap-2 text-[13px] font-medium cursor-pointer bg-transparent border-0 p-0 hover:opacity-80" 
        style={{ color: MUTED }}
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {tr('Back to event', 'অনুষ্ঠানে ফিরুন')}
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: GOLD }}><FaAward className="h-3 w-3" /> {tr('Certificates', 'সার্টিফিকেট')}</div>
          <h1 className="mt-1.5 text-[26px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{event.title}</h1>
          <p className="mt-1 text-[13px]" style={{ color: INK2 }}>{fmt.date(event.event_date)}{event.location ? ` · ${event.location}` : ''}</p>
        </div>
        <button onClick={() => printCerts(certs)} disabled={certs.length === 0} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ background: GOLD }}>
          <FaPrint className="h-3 w-3" /> {tr('Print all', 'সব প্রিন্ট')} ({fmt.num(certs.length)})
        </button>
      </div>

      {/* Signatories */}
      <div className="rounded-[10px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="mb-3 flex items-center justify-between">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Certificate settings', 'সার্টিফিকেট সেটিংস')}</div>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={sign.autoSign} onChange={(e) => setSign((s) => ({ ...s, autoSign: e.target.checked }))}
              className="h-4 w-4 rounded accent-teal-700" />
            <span className="text-[12px] font-medium" style={{ color: INK2 }}>{tr('Auto Signature Print', 'স্বয়ংক্রিয় স্বাক্ষর')}</span>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <input value={sign.left} onChange={(e) => setSign((s) => ({ ...s, left: e.target.value }))} placeholder={tr('Left signatory (Organiser)', 'বাম স্বাক্ষর (সংগঠক)')} className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input value={sign.right} onChange={(e) => setSign((s) => ({ ...s, right: e.target.value }))} placeholder={tr('Right signatory (Secretary)', 'ডান স্বাক্ষর (সম্পাদক)')} className="w-full rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <input type="date" value={sign.date} onChange={(e) => setSign((s) => ({ ...s, date: e.target.value }))} className="rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }} />
        </div>
        {sign.autoSign && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-[8px] p-3" style={{ border: `1px dashed ${RULE}` }}>
              <label className="mb-1 block text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: MUTED }}>{tr('Signature image (left)', 'দস্তখত ছবি (বাম)')}</label>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setSign((s) => ({ ...s, leftImage: ev.target?.result as string }));
                reader.readAsDataURL(file);
              }} className="w-full text-[11.5px]" style={{ color: INK2 }} />
              {sign.leftImage && <img src={sign.leftImage} alt="Left signature" className="mt-1.5 max-h-12 rounded border" style={{ borderColor: RULE }} />}
            </div>
            <div className="rounded-[8px] p-3" style={{ border: `1px dashed ${RULE}` }}>
              <label className="mb-1 block text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: MUTED }}>{tr('Signature image (right)', 'দস্তখত ছবি (ডান)')}</label>
              <input type="file" accept="image/*" onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => setSign((s) => ({ ...s, rightImage: ev.target?.result as string }));
                reader.readAsDataURL(file);
              }} className="w-full text-[11.5px]" style={{ color: INK2 }} />
              {sign.rightImage && <img src={sign.rightImage} alt="Right signature" className="mt-1.5 max-h-12 rounded border" style={{ borderColor: RULE }} />}
            </div>
          </div>
        )}
      </div>

      {/* Add + import */}
      <div className="rounded-[10px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <div className="flex flex-wrap items-end gap-2">
          <input value={form.recipient_name} onChange={(e) => setForm((f) => ({ ...f, recipient_name: e.target.value }))} placeholder={tr('Recipient name', 'প্রাপকের নাম')} className="min-w-[160px] flex-1 rounded-[6px] px-3 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          <select value={form.recipient_type} onChange={(e) => setForm((f) => ({ ...f, recipient_type: e.target.value as CertRecipientType }))} className="rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
            {TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </select>
          <input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder={tr('Category (Group A…)', 'বিভাগ')} className="w-32 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />
          {form.recipient_type === 'winner' && <input value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} placeholder={tr('Position (1st)', 'স্থান (১ম)')} className="w-24 rounded-[6px] px-2 py-2 text-[13px] outline-none" style={{ border: `1px solid ${RULE}`, color: INK }} />}
          <button onClick={save} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white" style={{ background: TEAL }}>{editId ? tr('Save', 'সংরক্ষণ') : <><FaPlus className="h-3 w-3" /> {tr('Add', 'যোগ')}</>}</button>
          {editId && <button onClick={() => { setForm(emptyForm); setEditId(null); }} className="rounded-full px-3 py-2 text-[12.5px]" style={{ border: `1px solid ${RULE}`, color: MUTED }}>{tr('Cancel', 'বাতিল')}</button>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}><FaUserPlus className="mr-1 inline h-3 w-3" />{tr('Import', 'ইম্পোর্ট')}:</span>
          {[
            { fn: importVolunteers, l: tr('Volunteers', 'স্বেচ্ছাসেবক') },
            { fn: importDonors, l: tr('Blood donors', 'রক্তদাতা') },
            { fn: importBeneficiaries, l: tr('Beneficiaries', 'উপকারভোগী') },
            { fn: importAttendance, l: tr('Attendance', 'উপস্থিতি') },
          ].map((b, i) => (
            <button key={i} onClick={b.fn} className="rounded-full px-3 py-1 text-[12px] font-medium" style={{ background: CREAM, border: `1px solid ${RULE}`, color: TEAL }}>+ {b.l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[10px]" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
        <table className="w-full text-[13px]">
          <thead><tr style={{ borderBottom: `1px solid ${RULE}` }}>
            {[tr('Code', 'কোড'), tr('Recipient', 'প্রাপক'), tr('Type', 'ধরন'), tr('Category / Position', 'বিভাগ / স্থান'), tr('Actions', 'কার্যক্রম')].map((h, i) => (
              <th key={i} className={`px-4 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${i === 4 ? 'text-right' : 'text-left'}`} style={{ color: MUTED }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {certs.map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${RULE}` }}>
                <td className="px-4 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{c.cert_code}</td>
                <td className="px-4 py-2.5 font-medium" style={{ color: INK }}>{c.recipient_name}</td>
                <td className="px-4 py-2.5" style={{ color: INK2 }}>{typeLabel(c.recipient_type)}</td>
                <td className="px-4 py-2.5" style={{ color: INK2 }}>{[c.category, c.position].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => printCerts([c])} className="mr-2 text-[12px] font-medium" style={{ color: GOLD }}>{tr('Print', 'প্রিন্ট')}</button>
                  <button onClick={() => edit(c)} className="mr-2 text-[12px] font-medium" style={{ color: TEAL }}>{tr('Edit', 'সম্পাদনা')}</button>
                  <button onClick={() => del(c.id)} className="text-[12px] text-red-600">{tr('Delete', 'মুছুন')}</button>
                </td>
              </tr>
            ))}
            {certs.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No certificates yet. Add recipients or import from volunteers/donors/attendance.', 'এখনো কোনো সার্টিফিকেট নেই। প্রাপক যোগ করুন বা ইম্পোর্ট করুন।')}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
