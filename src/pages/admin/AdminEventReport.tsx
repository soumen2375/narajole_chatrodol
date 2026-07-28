import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPrint, FaDownload } from 'react-icons/fa6';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { CswoEvent } from '@/types';
import { useFmt, formatDate } from '@/lib/format';
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

interface B { category: string; planned: number; approved: number; actual: number }
interface Ex { amount: number; status: string; description: string; vendor: string; spent_on: string }
interface Dn { amount: number; donor_name: string | null; is_anonymous: boolean; status: string }
interface Vol { name: string; role: string; attended: boolean }
interface Bd { name: string; units: number; blood_group: string; status: string }
interface Ben { name: string; item_received: string; quantity: number }

export default function AdminEventReport() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [event, setEvent] = useState<CswoEvent | null>(null);
  const [budget, setBudget] = useState<B[]>([]);
  const [expenses, setExpenses] = useState<Ex[]>([]);
  const [donations, setDonations] = useState<Dn[]>([]);
  const [vols, setVols] = useState<Vol[]>([]);
  const [donors, setDonors] = useState<Bd[]>([]);
  const [bens, setBens] = useState<Ben[]>([]);
  const [attendance, setAttendance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [evR, bR, exR, dnR, vR, bdR, beR, atR] = await Promise.all([
      supabase.from('cswo_events').select('*').eq('id', id).maybeSingle(),
      supabase.from('cswo_event_budget_items').select('category,planned,approved,actual').eq('event_id', id),
      supabase.from('cswo_expenses').select('amount,status,description,vendor,spent_on').eq('event_id', id),
      supabase.from('cswo_donations').select('amount,donor_name,is_anonymous,status').eq('event_id', id),
      supabase.from('cswo_event_volunteers').select('name,role,attended').eq('event_id', id),
      supabase.from('cswo_blood_donors').select('name,units,blood_group,status').eq('event_id', id),
      supabase.from('cswo_event_beneficiaries').select('name,item_received,quantity').eq('event_id', id),
      supabase.from('cswo_attendance').select('id', { count: 'exact', head: true }).eq('event_id', id),
    ]);
    setEvent((evR.data ?? null) as CswoEvent | null);
    setBudget((bR.data ?? []) as B[]);
    setExpenses((exR.data ?? []) as Ex[]);
    setDonations((dnR.data ?? []) as Dn[]);
    setVols((vR.data ?? []) as Vol[]);
    setDonors((bdR.data ?? []) as Bd[]);
    setBens((beR.data ?? []) as Ben[]);
    setAttendance(atR.count ?? 0);
    setLoading(false);
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (loading) return <TableSkeleton rows={8} />;
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

  const bPlanned = budget.reduce((s, b) => s + Number(b.planned), 0);
  const bApproved = budget.reduce((s, b) => s + Number(b.approved), 0);
  const bActual = budget.reduce((s, b) => s + Number(b.actual), 0);
  const expTotal = expenses.filter((e) => e.status === 'approved').reduce((s, e) => s + Number(e.amount), 0);
  const donTotal = donations.filter((d) => d.status === 'paid').reduce((s, d) => s + Number(d.amount), 0);
  const net = donTotal - expTotal;
  const volAttended = vols.filter((v) => v.attended).length;
  const bloodUnits = donors.reduce((s, d) => s + Number(d.units), 0);
  const distributed = bens.reduce((s, b) => s + Number(b.quantity), 0);
  const venue = [event.location, event.district, event.state, event.pincode].filter(Boolean).join(', ');
  const dateStr = fmt.date(event.event_date) + (event.end_date ? ` – ${fmt.date(event.end_date)}` : '');

  const money = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
  const dateStrEn = formatDate(event.event_date, 'en') + (event.end_date ? ` – ${formatDate(event.end_date, 'en')}` : '');

  const exportCSV = () => {
    const tr = (en: string, _bn: string) => en;
    const L: (string | number)[][] = [];
    L.push([tr('Event Report', 'অনুষ্ঠান প্রতিবেদন'), event.title]);
    L.push([tr('Code', 'কোড'), event.event_code ?? '']);
    L.push([tr('Date', 'তারিখ'), dateStrEn]);
    L.push([tr('Venue', 'স্থান'), venue]);
    L.push([]);
    L.push([tr('SUMMARY', 'সারসংক্ষেপ'), '']);
    L.push([tr('Donations received', 'প্রাপ্ত অনুদান'), donTotal]);
    L.push([tr('Expenses', 'ব্যয়'), expTotal]);
    L.push([tr('Net', 'নিট'), net]);
    L.push([tr('Budget planned/approved/spent', 'বাজেট পরিকল্পিত/অনুমোদিত/ব্যয়'), `${bPlanned}/${bApproved}/${bActual}`]);
    L.push([tr('Attendance', 'উপস্থিতি'), attendance]);
    L.push([tr('Volunteers (attended)', 'স্বেচ্ছাসেবক (উপস্থিত)'), `${vols.length} (${volAttended})`]);
    if (donors.length) L.push([tr('Blood units', 'রক্তের ইউনিট'), bloodUnits]);
    if (bens.length) L.push([tr('Beneficiaries / items', 'উপকারভোগী / আইটেম'), `${bens.length} / ${distributed}`]);
    L.push([]);
    L.push([tr('BUDGET', 'বাজেট'), tr('Planned', 'পরিকল্পিত'), tr('Approved', 'অনুমোদিত'), tr('Actual', 'প্রকৃত')]);
    budget.forEach((b) => L.push([b.category, b.planned, b.approved, b.actual]));
    const csv = L.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `event-report-${event.event_code ?? id.slice(0, 6)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    const tr = (en: string, _bn: string) => en;
    const row = (k: string, v: string) => `<tr><td class="k">${k}</td><td class="v">${v}</td></tr>`;
    const budgetRows = budget.map((b) => `<tr><td>${b.category}</td><td class="r">${money(Number(b.planned))}</td><td class="r">${money(Number(b.approved))}</td><td class="r">${money(Number(b.actual))}</td></tr>`).join('');
    const bloodRows = donors.length ? `<h3>${tr('Blood Donation', 'রক্তদান')}</h3><p>${tr('Donors', 'দাতা')}: ${donors.length} · ${tr('Units', 'ইউনিট')}: ${bloodUnits}</p>` : '';
    const benRows = bens.length ? `<h3>${tr('Relief / Distribution', 'ত্রাণ / বিতরণ')}</h3><p>${tr('Beneficiaries', 'উপকারভোগী')}: ${bens.length} · ${tr('Items distributed', 'বিতরণকৃত আইটেম')}: ${distributed}</p>` : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${event.title} — Report</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif}
  body{color:#1c1917;padding:40px;max-width:780px;line-height:1.5}
  .head{text-align:center;border-bottom:2px solid ${TEAL};padding-bottom:12px;margin-bottom:6px}
  .org{font-size:18px;font-weight:800;color:${TEAL}}
  .sub{font-size:12px;color:#666}
  .title{margin-top:14px;font-size:16px;font-weight:700}
  .meta{font-size:12px;color:#555;margin-top:2px}
  h3{margin:20px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:${TEAL}}
  table{width:100%;border-collapse:collapse;margin-top:4px}
  td,th{padding:5px 8px;font-size:12.5px;border-bottom:1px solid #eee;text-align:left}
  th{font-size:10px;text-transform:uppercase;color:#888}
  .k{color:#666;width:55%}.v{font-weight:600}.r{text-align:right}
  .net{margin-top:10px;padding:10px 12px;background:#f6f7f5;display:flex;justify-content:space-between;font-weight:800;font-size:14px}
  .foot{margin-top:26px;text-align:center;font-size:10px;color:#aaa}
  @media print{body{padding:14px}}
</style></head><body>
  <div class="head"><div class="org">Chhatradol Social Welfare Organization</div>
    <div class="title">${tr('Event Report', 'অনুষ্ঠান প্রতিবেদন')} — ${event.title}</div>
    <div class="meta">${event.event_code ?? ''} · ${dateStrEn}${venue ? ' · ' + venue : ''}</div>
  </div>
  <h3>${tr('Overview', 'সারসংক্ষেপ')}</h3>
  <table>
    ${row(tr('Category / status', 'বিভাগ / অবস্থা'), `${event.category || event.type} · ${event.status}`)}
    ${row(tr('Attendance', 'উপস্থিতি'), String(attendance))}
    ${row(tr('Volunteers (attended)', 'স্বেচ্ছাসেবক (উপস্থিত)'), `${vols.length} (${volAttended})`)}
  </table>
  <h3>${tr('Financial summary', 'আর্থিক সারসংক্ষেপ')}</h3>
  <table>
    ${row(tr('Donations received', 'প্রাপ্ত অনুদান'), money(donTotal))}
    ${row(tr('Expenses (approved)', 'ব্যয় (অনুমোদিত)'), money(expTotal))}
    ${row(tr('Budget planned / approved / spent', 'বাজেট পরিকল্পিত / অনুমোদিত / ব্যয়'), `${money(bPlanned)} / ${money(bApproved)} / ${money(bActual)}`)}
  </table>
  <div class="net"><span>${tr('Net (donations − expenses)', 'নিট (অনুদান − ব্যয়)')}</span><span>${money(net)}</span></div>
  ${budget.length ? `<h3>${tr('Budget detail', 'বাজেট বিবরণ')}</h3><table><tr><th>${tr('Category', 'বিভাগ')}</th><th class="r">${tr('Planned', 'পরিকল্পিত')}</th><th class="r">${tr('Approved', 'অনুমোদিত')}</th><th class="r">${tr('Actual', 'প্রকৃত')}</th></tr>${budgetRows}</table>` : ''}
  ${bloodRows}
  ${benRows}
  <div class="foot">${tr('Generated', 'তৈরি')} ${new Date().toLocaleString('en-US')} · narajole.org</div>
</body></html>`;
    const w = window.open('', '_blank', 'width=820,height=900');
    if (!w) return;
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 400);
  };

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
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Events', 'অনুষ্ঠান')} · {tr('Report', 'প্রতিবেদন')}</div>
          <h1 className="mt-1.5 text-[26px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{event.title}</h1>
          <p className="mt-1 text-[13px]" style={{ color: INK2 }}>{event.event_code ?? ''} · {dateStr}{venue ? ` · ${venue}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold" style={{ border: `1px solid ${RULE}`, color: INK2 }}><FaDownload className="h-3 w-3" /> CSV</button>
          <button onClick={printReport} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold text-white" style={{ background: TEAL }}><FaPrint className="h-3 w-3" /> {tr('Print report', 'প্রিন্ট')}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={tr('Donations', 'অনুদান')} value={fmt.money(donTotal)} color={GREEN} />
        <Stat label={tr('Expenses', 'ব্যয়')} value={fmt.money(expTotal)} color={AMBER} />
        <Stat label={tr('Net', 'নিট')} value={fmt.money(net)} color={net >= 0 ? GREEN : RED} />
        <Stat label={tr('Attendance', 'উপস্থিতি')} value={fmt.num(attendance)} color={INK} />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={tr('Budget spent / approved', 'ব্যয় / অনুমোদিত')} value={`${fmt.money(bActual)}`} sub={`/ ${fmt.money(bApproved)}`} color={INK} />
        <Stat label={tr('Volunteers', 'স্বেচ্ছাসেবক')} value={`${fmt.num(volAttended)}/${fmt.num(vols.length)}`} color={TEAL} />
        <Stat label={tr('Blood units', 'রক্তের ইউনিট')} value={fmt.num(bloodUnits)} color={RED} />
        <Stat label={tr('Beneficiaries / items', 'উপকারভোগী / আইটেম')} value={`${fmt.num(bens.length)} / ${fmt.num(distributed)}`} color={INK} />
      </div>

      {budget.length > 0 && (
        <div className="overflow-x-auto rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <h2 className="mb-3 text-[15px] font-semibold" style={{ color: INK }}>{tr('Budget detail', 'বাজেট বিবরণ')}</h2>
          <table className="w-full text-[13px]">
            <thead><tr style={{ borderBottom: `1px solid ${RULE}` }}>{[tr('Category', 'বিভাগ'), tr('Planned', 'পরিকল্পিত'), tr('Approved', 'অনুমোদিত'), tr('Actual', 'প্রকৃত')].map((h, i) => <th key={i} className={`px-3 py-2 text-[11px] font-semibold uppercase ${i === 0 ? 'text-left' : 'text-right'}`} style={{ color: MUTED }}>{h}</th>)}</tr></thead>
            <tbody>
              {budget.map((b, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${RULE}` }}>
                  <td className="px-3 py-2" style={{ color: INK }}>{b.category}</td>
                  <td className="px-3 py-2 text-right" style={{ color: INK2 }}>{fmt.money(Number(b.planned))}</td>
                  <td className="px-3 py-2 text-right" style={{ color: INK2 }}>{fmt.money(Number(b.approved))}</td>
                  <td className="px-3 py-2 text-right font-semibold" style={{ color: AMBER }}>{fmt.money(Number(b.actual))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[12px]" style={{ color: MUTED }}>{tr('Use Print report for a formatted PDF, or CSV for spreadsheets.', 'ফরম্যাটেড পিডিএফের জন্য প্রিন্ট, স্প্রেডশিটের জন্য CSV ব্যবহার করুন।')}</p>
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-[10px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1.5 text-[20px] font-bold" style={{ color }}>{value}{sub && <span className="text-[12px] font-normal" style={{ color: MUTED }}> {sub}</span>}</div>
    </div>
  );
}
