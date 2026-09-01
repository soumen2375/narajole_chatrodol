import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPlus, FaFilePdf, FaDroplet } from 'react-icons/fa6';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CswoEvent, CswoBloodDonor, CswoBloodBank, DonorStatus, BloodGroup } from '@/types';
import { useFmt } from '@/lib/format';
import { formatAadhar } from '@/lib/bloodDonors';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { detailTable, esc, printDocSheet, printedDate } from '@/lib/docsheet';

const TEAL = '#0c756f';
const RED = '#b91c1c';
const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const GREEN = '#4d7c0f';
const PAPER = '#ffffff';
const CREAM = '#faf8f5';

const GROUPS: Exclude<BloodGroup, ''>[] = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const DSTATUS: DonorStatus[] = ['registered', 'donated', 'rejected'];
const STATUS_COLOR: Record<DonorStatus, string> = { registered: '#1d4ed8', rejected: RED, donated: GREEN };

const emptyDonor = {
  name: '', age: '', gender: '' as '' | 'male' | 'female' | 'other', phone: '',
  address: '', blood_group: '' as BloodGroup, aadhar: '',
  status: 'registered' as DonorStatus, units: '0',
};
const emptyBank = {
  name: '', contact_person: '', phone: '', email: '', license_no: '',
  team_size: '', beds: '', ambulance: false, generator: false, equipment: '', note: '',
};

export default function AdminBloodCamp() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [event, setEvent] = useState<CswoEvent | null>(null);
  const [donors, setDonors] = useState<CswoBloodDonor[]>([]);
  const [banks, setBanks] = useState<CswoBloodBank[]>([]);
  const [loading, setLoading] = useState(true);

  const [dForm, setDForm] = useState(emptyDonor);
  const [dEditId, setDEditId] = useState<string | null>(null);
  const [showDonor, setShowDonor] = useState(false);

  const [bForm, setBForm] = useState(emptyBank);
  const [bEditId, setBEditId] = useState<string | null>(null);
  const [showBank, setShowBank] = useState(false);

  const [letterBank, setLetterBank] = useState<CswoBloodBank | null>(null);
  const [letter, setLetter] = useState({ to: '', subject: '', organizer: '', secretary: '', expected: '', body: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [evR, dR, bR] = await Promise.all([
      supabase.from('cswo_events').select('*').eq('id', id).maybeSingle(),
      supabase.from('cswo_blood_donors').select('*').eq('event_id', id).order('created_at'),
      supabase.from('cswo_blood_banks').select('*').eq('event_id', id).order('created_at'),
    ]);
    setEvent((evR.data ?? null) as CswoEvent | null);
    setDonors((dR.data ?? []) as CswoBloodDonor[]);
    setBanks((bR.data ?? []) as CswoBloodBank[]);
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // ── Donors ──
  const saveDonor = async () => {
    if (!dForm.name.trim()) return;
    const payload = {
      event_id: id, name: dForm.name.trim(), age: dForm.age ? Number(dForm.age) : null, gender: dForm.gender,
      phone: dForm.phone.trim(), address: dForm.address.trim(), blood_group: dForm.blood_group,
      aadhar: dForm.aadhar.replace(/\D/g, ''), status: dForm.status, units: Number(dForm.units || 0),
    };
    if (dEditId) await supabase.from('cswo_blood_donors').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', dEditId);
    else await supabase.from('cswo_blood_donors').insert(payload);
    setShowDonor(false); setDForm(emptyDonor); setDEditId(null);
    await load();
  };
  const editDonor = (d: CswoBloodDonor) => {
    setDEditId(d.id);
    setDForm({
      name: d.name, age: d.age != null ? String(d.age) : '', gender: d.gender, phone: d.phone,
      address: d.address, blood_group: d.blood_group, aadhar: d.aadhar ?? '',
      status: d.status, units: String(d.units),
    });
    setShowDonor(true);
  };
  const setDonorStatus = async (d: CswoBloodDonor, status: DonorStatus) => {
    const units = status === 'donated' && d.units === 0 ? 1 : d.units;
    setDonors((arr) => arr.map((x) => x.id === d.id ? { ...x, status, units } : x));
    await supabase.from('cswo_blood_donors').update({ status, units, updated_at: new Date().toISOString() }).eq('id', d.id);
  };
  const delDonor = async (did: string) => { await supabase.from('cswo_blood_donors').delete().eq('id', did); await load(); };

  // ── Banks ──
  const saveBank = async () => {
    if (!bForm.name.trim()) return;
    const payload = {
      event_id: id, name: bForm.name.trim(), contact_person: bForm.contact_person.trim(), phone: bForm.phone.trim(), email: bForm.email.trim(),
      license_no: bForm.license_no.trim(), team_size: Number(bForm.team_size || 0), beds: Number(bForm.beds || 0),
      ambulance: bForm.ambulance, generator: bForm.generator, equipment: bForm.equipment.trim(), note: bForm.note.trim(),
    };
    if (bEditId) await supabase.from('cswo_blood_banks').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', bEditId);
    else await supabase.from('cswo_blood_banks').insert(payload);
    setShowBank(false); setBForm(emptyBank); setBEditId(null);
    await load();
  };
  const editBank = (b: CswoBloodBank) => {
    setBEditId(b.id);
    setBForm({ name: b.name, contact_person: b.contact_person, phone: b.phone, email: b.email, license_no: b.license_no, team_size: String(b.team_size), beds: String(b.beds), ambulance: b.ambulance, generator: b.generator, equipment: b.equipment, note: b.note });
    setShowBank(true);
  };
  const delBank = async (bid: string) => { await supabase.from('cswo_blood_banks').delete().eq('id', bid); await load(); };

  // ── Request letter ──
  const openLetter = (b: CswoBloodBank) => {
    setLetterBank(b);
    setLetter({
      to: b.name, subject: `Request to conduct a voluntary blood donation camp — ${event?.title ?? ''}`,
      organizer: '', secretary: '',
      expected: event?.expected_participants ? String(event.expected_participants) : '',
      body: `We, Chhatradol Social Welfare Organization, are organising a voluntary blood donation camp and request your blood bank's kind cooperation in collecting blood at the venue and date detailed below. We request the necessary team, beds and equipment for a smooth camp.`,
    });
  };
  /**
   * The request that goes to a blood bank: the house document sheet, with a To
   * block and a subject line above the camp's particulars, rather than the
   * masthead that used to be invented for this one screen.
   */
  const printLetter = () => {
    if (!event) return;
    const dateStr = fmt.date(event.event_date) + (event.end_date ? ` – ${fmt.date(event.end_date)}` : '');
    const timeStr = event.start_time
      ? `${event.start_time.slice(0, 5)}${event.end_time ? ` – ${event.end_time.slice(0, 5)}` : ''}`
      : '';
    const venue = [event.location, event.district, event.state, event.pincode].filter(Boolean).join(', ');

    printDocSheet({
      title: `BLOOD CAMP REQUEST — ${event.title}`,
      docTitle: 'REQUEST FOR BLOOD DONATION CAMP',
      refLabel: 'Event Code',
      refValue: event.event_code ?? '—',
      dateValue: printedDate(),
      bodyHtml: [
        `<div class="to">To,<br><strong>${esc(letter.to || '________________')}</strong><br>(Blood Bank)</div>`,
        `<div class="subject"><span>Subject:</span> ${esc(letter.subject)}</div>`,
        `<p class="para">Respected Sir / Madam,</p>`,
        `<p class="para">${esc(letter.body)}</p>`,
        detailTable([
          ['Camp / event', esc(event.title + (event.event_code ? ` (${event.event_code})` : ''))],
          ['Date', esc(dateStr)],
          ...(timeStr ? [['Time', esc(timeStr)] as [string, string]] : []),
          ['Venue', esc(venue || '________________')],
          ['Expected donors', esc(letter.expected || '—')],
        ]),
        `<p class="para">We shall remain grateful for your support in this noble cause. Kindly confirm your team's availability.</p>`,
        `<p class="para">Thanking you,</p>`,
      ].join(''),
      signature: { name: letter.secretary || undefined },
      note: letter.organizer ? `Organiser: ${letter.organizer}` : null,
    });
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

  const registered = donors.length;
  const rejected = donors.filter((d) => d.status === 'rejected').length;
  const donated = donors.filter((d) => d.status === 'donated').length;
  const totalUnits = donors.reduce((s, d) => s + Number(d.units), 0);
  const groupUnits = GROUPS.map((g) => ({ g, n: donors.filter((d) => d.blood_group === g).reduce((s, d) => s + Number(d.units), 0) })).filter((x) => x.n > 0);

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
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: RED }}>
          <FaDroplet className="h-3 w-3" /> {tr('Blood Donation Camp', 'রক্তদান শিবির')}
        </div>
        <h1 className="mt-1.5 text-[26px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{event.title}</h1>
        <p className="mt-1 text-[13px]" style={{ color: INK2 }}>{fmt.date(event.event_date)}{event.location ? ` · ${event.location}` : ''}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat label={tr('Registered', 'নিবন্ধিত')} value={fmt.num(registered)} color={INK} />
        <Stat label={tr('Rejected', 'বাতিল')} value={fmt.num(rejected)} color={RED} />
        <Stat label={tr('Donated', 'দান করেছেন')} value={fmt.num(donated)} color={GREEN} />
        <Stat label={tr('Units collected', 'সংগৃহীত ইউনিট')} value={fmt.num(totalUnits)} color={RED} />
      </div>

      {groupUnits.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-[10px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{tr('Units by group', 'গ্রুপ অনুযায়ী ইউনিট')}:</span>
          {groupUnits.map((x) => (
            <span key={x.g} className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ background: 'rgba(185,28,28,0.08)', color: RED }}>{x.g} = {fmt.num(x.n)}</span>
          ))}
        </div>
      )}

      {/* Donor registry */}
      <Card title={tr('Donor Registry', 'রক্তদাতা নিবন্ধন')} action={<button onClick={() => { setDForm(emptyDonor); setDEditId(null); setShowDonor(true); }} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white" style={{ background: TEAL }}><FaPlus className="h-3 w-3" /> {tr('Add donor', 'দাতা যোগ')}</button>}>
        <Table head={[tr('Code', 'কোড'), tr('Name', 'নাম'), tr('Age/Sex', 'বয়স/লিঙ্গ'), tr('Group', 'গ্রুপ'), tr('Phone', 'ফোন'), tr('Status', 'অবস্থা'), tr('Units', 'ইউনিট'), '']}>
          {donors.map((d) => (
            <tr key={d.id} style={{ borderTop: `1px solid ${RULE}` }}>
              <td className="px-3 py-2.5 font-mono text-[11px]" style={{ color: MUTED }}>{d.donor_code}</td>
              <td className="px-3 py-2.5 font-medium" style={{ color: INK }}>{d.name}</td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{d.age ?? '—'}{d.gender ? ` / ${d.gender[0].toUpperCase()}` : ''}</td>
              <td className="px-3 py-2.5"><span className="font-semibold" style={{ color: d.blood_group ? RED : MUTED }}>{d.blood_group || '—'}</span></td>
              <td className="px-3 py-2.5" style={{ color: INK2 }}>{d.phone || '—'}</td>
              <td className="px-3 py-2.5">
                <select value={d.status} onChange={(e) => setDonorStatus(d, e.target.value as DonorStatus)} className="rounded-[6px] px-2 py-1 text-[12px]" style={{ border: `1px solid ${RULE}`, color: STATUS_COLOR[d.status], fontWeight: 600 }}>
                  {DSTATUS.map((s) => <option key={s} value={s} style={{ color: INK }}>{s}</option>)}
                </select>
              </td>
              <td className="px-3 py-2.5 font-semibold" style={{ color: RED }}>{fmt.num(d.units)}</td>
              <td className="px-3 py-2.5 text-right">
                <button onClick={() => editDonor(d)} className="mr-2 text-[12px] font-medium" style={{ color: TEAL }}>{tr('Edit', 'সম্পাদনা')}</button>
                <button onClick={() => delDonor(d.id)} className="text-[12px] text-red-600">{tr('Delete', 'মুছুন')}</button>
              </td>
            </tr>
          ))}
          {donors.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-[13px]" style={{ color: MUTED }}>{tr('No donors registered yet.', 'এখনো কোনো দাতা নিবন্ধিত নেই।')}</td></tr>}
        </Table>
      </Card>

      {/* Blood banks */}
      <Card title={tr('Blood Bank & Logistics', 'ব্লাড ব্যাংক ও লজিস্টিকস')} action={<button onClick={() => { setBForm(emptyBank); setBEditId(null); setShowBank(true); }} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white" style={{ background: TEAL }}><FaPlus className="h-3 w-3" /> {tr('Add blood bank', 'ব্লাড ব্যাংক যোগ')}</button>}>
        {banks.length === 0 ? (
          <p className="py-4 text-center text-[13px]" style={{ color: MUTED }}>{tr('No blood bank added yet.', 'এখনো কোনো ব্লাড ব্যাংক যোগ হয়নি।')}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {banks.map((b) => (
              <div key={b.id} className="rounded-[10px] p-4" style={{ background: CREAM, border: `1px solid ${RULE}` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold" style={{ color: INK }}>{b.name}</div>
                  <div className="flex gap-2 text-[12px] font-medium">
                    <button onClick={() => openLetter(b)} className="inline-flex items-center gap-1" style={{ color: TEAL }}><FaFilePdf className="h-3 w-3" /> {tr('Request letter', 'অনুরোধপত্র')}</button>
                    <button onClick={() => editBank(b)} style={{ color: MUTED }}>{tr('Edit', 'সম্পাদনা')}</button>
                    <button onClick={() => delBank(b.id)} className="text-red-600">{tr('Delete', 'মুছুন')}</button>
                  </div>
                </div>
                <div className="mt-1.5 space-y-0.5 text-[12.5px]" style={{ color: INK2 }}>
                  {b.contact_person && <div>{b.contact_person}{b.phone ? ` · ${b.phone}` : ''}</div>}
                  {b.license_no && <div className="font-mono text-[11px]" style={{ color: MUTED }}>{tr('License', 'লাইসেন্স')}: {b.license_no}</div>}
                  <div style={{ color: MUTED }}>{tr('Team', 'টিম')}: {fmt.num(b.team_size)} · {tr('Beds', 'বেড')}: {fmt.num(b.beds)} · {b.ambulance ? tr('Ambulance', 'অ্যাম্বুলেন্স') : ''} {b.generator ? `· ${tr('Generator', 'জেনারেটর')}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Donor modal */}
      {showDonor && (
        <Modal title={dEditId ? tr('Edit donor', 'দাতা সম্পাদনা') : tr('Register donor', 'দাতা নিবন্ধন')} onClose={() => setShowDonor(false)} onSave={saveDonor}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className="input sm:col-span-2" placeholder={tr('Full name', 'পুরো নাম')} value={dForm.name} onChange={(e) => setDForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="input" type="number" placeholder={tr('Age', 'বয়স')} value={dForm.age} onChange={(e) => setDForm((f) => ({ ...f, age: e.target.value }))} />
            <select className="input" value={dForm.gender} onChange={(e) => setDForm((f) => ({ ...f, gender: e.target.value as typeof dForm.gender }))}>
              <option value="">{tr('Gender', 'লিঙ্গ')}</option><option value="male">{tr('Male', 'পুরুষ')}</option><option value="female">{tr('Female', 'মহিলা')}</option><option value="other">{tr('Other', 'অন্যান্য')}</option>
            </select>
            <input className="input" type="tel" inputMode="numeric" placeholder={tr('Mobile number', 'মোবাইল নম্বর')} value={dForm.phone} onChange={(e) => setDForm((f) => ({ ...f, phone: e.target.value }))} />
            <select className="input" value={dForm.blood_group} onChange={(e) => setDForm((f) => ({ ...f, blood_group: e.target.value as BloodGroup }))}>
              <option value="">{tr('Blood group', 'রক্তের গ্রুপ')}</option>{GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input className="input sm:col-span-2" placeholder={tr('Address', 'ঠিকানা')} value={dForm.address} onChange={(e) => setDForm((f) => ({ ...f, address: e.target.value }))} />
            <input className="input sm:col-span-2" inputMode="numeric" maxLength={14} placeholder={tr('Aadhar number', 'আধার নম্বর')} value={formatAadhar(dForm.aadhar)} onChange={(e) => setDForm((f) => ({ ...f, aadhar: e.target.value.replace(/\D/g, '').slice(0, 12) }))} />
            <select className="input" value={dForm.status} onChange={(e) => setDForm((f) => ({ ...f, status: e.target.value as DonorStatus }))}>{DSTATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            <input className="input" type="number" placeholder={tr('Units', 'ইউনিট')} value={dForm.units} onChange={(e) => setDForm((f) => ({ ...f, units: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* Bank modal */}
      {showBank && (
        <Modal title={bEditId ? tr('Edit blood bank', 'ব্লাড ব্যাংক সম্পাদনা') : tr('Add blood bank', 'ব্লাড ব্যাংক যোগ')} onClose={() => setShowBank(false)} onSave={saveBank}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input className="input sm:col-span-2" placeholder={tr('Blood bank name', 'ব্লাড ব্যাংকের নাম')} value={bForm.name} onChange={(e) => setBForm((f) => ({ ...f, name: e.target.value }))} />
            <input className="input" placeholder={tr('Contact person', 'যোগাযোগের ব্যক্তি')} value={bForm.contact_person} onChange={(e) => setBForm((f) => ({ ...f, contact_person: e.target.value }))} />
            <input className="input" placeholder={tr('Phone', 'ফোন')} value={bForm.phone} onChange={(e) => setBForm((f) => ({ ...f, phone: e.target.value }))} />
            <input className="input" placeholder={tr('Email', 'ইমেল')} value={bForm.email} onChange={(e) => setBForm((f) => ({ ...f, email: e.target.value }))} />
            <input className="input" placeholder={tr('License number', 'লাইসেন্স নম্বর')} value={bForm.license_no} onChange={(e) => setBForm((f) => ({ ...f, license_no: e.target.value }))} />
            <input className="input" type="number" placeholder={tr('Team size', 'টিমের আকার')} value={bForm.team_size} onChange={(e) => setBForm((f) => ({ ...f, team_size: e.target.value }))} />
            <input className="input" type="number" placeholder={tr('Beds required', 'প্রয়োজনীয় বেড')} value={bForm.beds} onChange={(e) => setBForm((f) => ({ ...f, beds: e.target.value }))} />
            <input className="input sm:col-span-2" placeholder={tr('Equipment required', 'প্রয়োজনীয় সরঞ্জাম')} value={bForm.equipment} onChange={(e) => setBForm((f) => ({ ...f, equipment: e.target.value }))} />
            <label className="flex items-center gap-2 text-[13px]" style={{ color: INK2 }}><input type="checkbox" checked={bForm.ambulance} onChange={(e) => setBForm((f) => ({ ...f, ambulance: e.target.checked }))} /> {tr('Ambulance needed', 'অ্যাম্বুলেন্স প্রয়োজন')}</label>
            <label className="flex items-center gap-2 text-[13px]" style={{ color: INK2 }}><input type="checkbox" checked={bForm.generator} onChange={(e) => setBForm((f) => ({ ...f, generator: e.target.checked }))} /> {tr('Generator needed', 'জেনারেটর প্রয়োজন')}</label>
          </div>
        </Modal>
      )}

      {/* Letter modal */}
      {letterBank && (
        <Modal title={tr('Blood camp request letter', 'রক্তদান শিবির অনুরোধপত্র')} onClose={() => setLetterBank(null)} onSave={() => { printLetter(); setLetterBank(null); }} saveLabel={tr('Print', 'প্রিন্ট')}>
          <div className="space-y-3">
            <input className="input" placeholder={tr('Addressed to (blood bank)', 'প্রাপক (ব্লাড ব্যাংক)')} value={letter.to} onChange={(e) => setLetter((f) => ({ ...f, to: e.target.value }))} />
            <input className="input" placeholder={tr('Subject', 'বিষয়')} value={letter.subject} onChange={(e) => setLetter((f) => ({ ...f, subject: e.target.value }))} />
            <textarea className="input" rows={3} placeholder={tr('Body', 'মূল বক্তব্য')} value={letter.body} onChange={(e) => setLetter((f) => ({ ...f, body: e.target.value }))} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input className="input" placeholder={tr('Expected donors', 'প্রত্যাশিত দাতা')} value={letter.expected} onChange={(e) => setLetter((f) => ({ ...f, expected: e.target.value }))} />
              <input className="input" placeholder={tr('Organiser name', 'সংগঠকের নাম')} value={letter.organizer} onChange={(e) => setLetter((f) => ({ ...f, organizer: e.target.value }))} />
              <input className="input" placeholder={tr('Secretary name', 'সম্পাদকের নাম')} value={letter.secretary} onChange={(e) => setLetter((f) => ({ ...f, secretary: e.target.value }))} />
            </div>
            <p className="text-[11px]" style={{ color: MUTED }}>{tr('Camp date, time and venue are filled automatically from the event.', 'শিবিরের তারিখ, সময় ও স্থান অনুষ্ঠান থেকে স্বয়ংক্রিয়ভাবে যুক্ত হয়।')}</p>
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
      <table className="w-full min-w-[720px] text-[13px]">
        <thead><tr>{head.map((h, i) => <th key={i} className={`px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${i === head.length - 1 ? 'text-right' : 'text-left'}`} style={{ color: MUTED }}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Modal({ title, onClose, onSave, saveLabel, children }: { title: string; onClose: () => void; onSave: () => void; saveLabel?: string; children: React.ReactNode }) {
  const { lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] p-6 shadow-xl" style={{ background: PAPER }} onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-[18px] font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{title}</h2>
        {children}
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-[13px] font-medium" style={{ border: `1px solid ${RULE}`, color: INK2 }}>{tr('Cancel', 'বাতিল')}</button>
          <button onClick={onSave} className="rounded-full px-5 py-2 text-[13px] font-semibold text-white" style={{ background: TEAL }}>{saveLabel ?? tr('Save', 'সংরক্ষণ')}</button>
        </div>
      </div>
    </div>
  );
}
