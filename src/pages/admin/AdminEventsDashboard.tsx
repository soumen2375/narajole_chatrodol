import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { TableSkeleton } from '@/components/ui/Skeleton';

const TEAL = '#0c756f';
const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const GREEN = '#4d7c0f';
const RED = '#b91c1c';
const PAPER = '#ffffff';
const CREAM = '#faf8f5';

const STATUS_COLOR: Record<string, string> = {
  draft: '#78716c', planned: '#1d4ed8', approved: '#0c756f', live: '#c2410c', completed: '#4d7c0f', cancelled: '#dc2626',
};

interface Ev { id: string; title: string; status: string; type: string; category: string; event_date: string }
interface Ex { amount: number; status: string; event_id: string; created_at: string }
interface Dn { amount: number; donor_name: string | null; is_anonymous: boolean; event_id: string; created_at: string }
interface Bd { units: number; blood_group: string }

export default function AdminEventsDashboard() {
  const { member } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [events, setEvents] = useState<Ev[]>([]);
  const [expenses, setExpenses] = useState<Ex[]>([]);
  const [donations, setDonations] = useState<Dn[]>([]);
  const [donors, setDonors] = useState<Bd[]>([]);
  const [participants, setParticipants] = useState(0);
  const [volunteers, setVolunteers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [evR, exR, dnR, bdR, atR, voR] = await Promise.all([
        supabase.from('cswo_events').select('id,title,status,type,category,event_date').order('event_date', { ascending: false }),
        supabase.from('cswo_expenses').select('amount,status,event_id,created_at').not('event_id', 'is', null),
        supabase.from('cswo_donations').select('amount,donor_name,is_anonymous,event_id,created_at').eq('status', 'paid').not('event_id', 'is', null),
        supabase.from('cswo_blood_donors').select('units,blood_group'),
        supabase.from('cswo_attendance').select('id', { count: 'exact', head: true }),
        supabase.from('cswo_event_volunteers').select('id', { count: 'exact', head: true }),
      ]);
      setEvents((evR.data ?? []) as Ev[]);
      setExpenses((exR.data ?? []) as Ex[]);
      setDonations((dnR.data ?? []) as Dn[]);
      setDonors((bdR.data ?? []) as Bd[]);
      setParticipants(atR.count ?? 0);
      setVolunteers(voR.count ?? 0);
      setLoading(false);
    })();
  }, []);

  const titleOf = useMemo(() => Object.fromEntries(events.map((e) => [e.id, e.title])), [events]);
  const today = new Date().toISOString().slice(0, 10);

  const upcoming = events.filter((e) => e.event_date >= today && e.status !== 'completed' && e.status !== 'cancelled');
  const completed = events.filter((e) => e.status === 'completed').length;
  const donTotal = donations.reduce((s, d) => s + Number(d.amount), 0);
  const expTotal = expenses.filter((e) => e.status === 'approved').reduce((s, e) => s + Number(e.amount), 0);
  const bloodUnits = donors.reduce((s, d) => s + Number(d.units), 0);

  // status donut
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    events.forEach((e) => { m[e.status] = (m[e.status] ?? 0) + 1; });
    return Object.entries(m).map(([k, v]) => ({ k, v, c: STATUS_COLOR[k] ?? MUTED }));
  }, [events]);
  const donut = (() => {
    const total = statusCounts.reduce((s, x) => s + x.v, 0) || 1;
    let acc = 0; const stops: string[] = [];
    statusCounts.forEach((x) => { const a = (acc / total) * 360; acc += x.v; const b = (acc / total) * 360; stops.push(`${x.c} ${a}deg ${b}deg`); });
    return `conic-gradient(${stops.join(', ') || `${RULE} 0deg 360deg`})`;
  })();

  // last 6 months donations vs expenses
  const months = useMemo(() => {
    const arr: string[] = [];
    const d = new Date(); d.setDate(1);
    for (let i = 5; i >= 0; i--) { const m = new Date(d.getFullYear(), d.getMonth() - i, 1); arr.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`); }
    return arr;
  }, []);
  const trend = useMemo(() => {
    const row = months.map((mk) => {
      const inc = donations.filter((x) => x.created_at.slice(0, 7) === mk).reduce((s, x) => s + Number(x.amount), 0);
      const out = expenses.filter((x) => x.status === 'approved' && x.created_at.slice(0, 7) === mk).reduce((s, x) => s + Number(x.amount), 0);
      return { mk, inc, out, label: new Date(mk + '-01').toLocaleString(lang === 'bn' ? 'bn-IN' : 'en-IN', { month: 'short' }) };
    });
    const max = Math.max(1, ...row.flatMap((r) => [r.inc, r.out]));
    return { row, max };
  }, [months, donations, expenses, lang]);

  // top events by spend
  const topSpend = useMemo(() => {
    const m: Record<string, number> = {};
    expenses.filter((e) => e.status === 'approved').forEach((e) => { m[e.event_id] = (m[e.event_id] ?? 0) + Number(e.amount); });
    const arr = Object.entries(m).map(([id, v]) => ({ id, v, title: titleOf[id] ?? '—' })).sort((a, b) => b.v - a.v).slice(0, 5);
    const max = Math.max(1, ...arr.map((x) => x.v));
    return { arr, max };
  }, [expenses, titleOf]);

  const groupUnits = useMemo(() => {
    const groups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
    const arr = groups.map((g) => ({ g, n: donors.filter((d) => d.blood_group === g).reduce((s, d) => s + Number(d.units), 0) })).filter((x) => x.n > 0);
    const max = Math.max(1, ...arr.map((x) => x.n));
    return { arr, max };
  }, [donors]);

  const recentDon = [...donations].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
  const recentExp = [...expenses].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  if (loading) return <TableSkeleton rows={8} />;

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{tr('Events', 'অনুষ্ঠান')} · {tr('Overview', 'সারসংক্ষেপ')}</div>
        <h1 className="mt-1.5 text-[28px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
          {tr('Welcome back', 'স্বাগতম')}{member?.full_name ? `, ${member.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-[13.5px]" style={{ color: INK2 }}>{tr('A live snapshot of every camp, programme and event.', 'প্রতিটি শিবির, কর্মসূচি ও অনুষ্ঠানের সরাসরি চিত্র।')}</p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={tr('Upcoming events', 'আসন্ন অনুষ্ঠান')} value={fmt.num(upcoming.length)} color={TEAL} />
        <Stat label={tr('Completed', 'সম্পন্ন')} value={fmt.num(completed)} color={GREEN} />
        <Stat label={tr('Participants', 'অংশগ্রহণকারী')} value={fmt.num(participants)} color={INK} />
        <Stat label={tr('Volunteers', 'স্বেচ্ছাসেবক')} value={fmt.num(volunteers)} color={INK} />
        <Stat label={tr('Donations received', 'প্রাপ্ত অনুদান')} value={fmt.money(donTotal)} color={GREEN} />
        <Stat label={tr('Event expenses', 'অনুষ্ঠান ব্যয়')} value={fmt.money(expTotal)} color="#b45309" />
        <Stat label={tr('Blood units', 'রক্তের ইউনিট')} value={fmt.num(bloodUnits)} color={RED} />
        <Stat label={tr('Total events', 'মোট অনুষ্ঠান')} value={fmt.num(events.length)} color={INK} />
      </div>

      {/* trend + donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[10px] p-5 lg:col-span-2" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold" style={{ color: INK }}>{tr('Donations vs Expenses', 'অনুদান বনাম ব্যয়')}</h2>
            <div className="flex gap-3 text-[11px]" style={{ color: MUTED }}>
              <span className="flex items-center gap-1"><Dot c={GREEN} /> {tr('Donations', 'অনুদান')}</span>
              <span className="flex items-center gap-1"><Dot c="#b45309" /> {tr('Expenses', 'ব্যয়')}</span>
            </div>
          </div>
          <div className="flex h-44 items-end justify-between gap-3">
            {trend.row.map((r) => (
              <div key={r.mk} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-36 w-full items-end justify-center gap-1">
                  <div title={fmt.money(r.inc)} style={{ width: '42%', height: `${(r.inc / trend.max) * 100}%`, background: GREEN, borderRadius: '3px 3px 0 0', minHeight: r.inc ? 3 : 0 }} />
                  <div title={fmt.money(r.out)} style={{ width: '42%', height: `${(r.out / trend.max) * 100}%`, background: '#b45309', borderRadius: '3px 3px 0 0', minHeight: r.out ? 3 : 0 }} />
                </div>
                <span className="text-[10.5px]" style={{ color: MUTED }}>{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <h2 className="mb-4 text-[15px] font-semibold" style={{ color: INK }}>{tr('Events by status', 'অবস্থা অনুযায়ী')}</h2>
          {events.length === 0 ? <p className="text-[13px]" style={{ color: MUTED }}>{tr('No events.', 'কোনো অনুষ্ঠান নেই।')}</p> : (
            <div className="flex items-center gap-5">
              <div className="relative h-28 w-28 shrink-0 rounded-full" style={{ background: donut }}>
                <div className="absolute inset-[22%] flex items-center justify-center rounded-full" style={{ background: PAPER }}>
                  <span className="text-[18px] font-bold" style={{ color: INK }}>{fmt.num(events.length)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {statusCounts.map((x) => (
                  <div key={x.k} className="flex items-center gap-2 text-[12px]">
                    <Dot c={x.c} /> <span style={{ color: INK2 }}>{x.k}</span> <span className="font-semibold" style={{ color: INK }}>{fmt.num(x.v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* upcoming + quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-[10px] p-5 lg:col-span-2" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold" style={{ color: INK }}>{tr('Upcoming events', 'আসন্ন অনুষ্ঠান')}</h2>
            <Link to="/admin/events" className="text-[12px] font-semibold" style={{ color: TEAL }}>{tr('All events', 'সব অনুষ্ঠান')} →</Link>
          </div>
          <div className="divide-y" style={{ borderColor: RULE }}>
            {upcoming.slice(0, 6).map((e) => (
              <Link key={e.id} to={`/admin/events/${e.id}`} className="flex items-center justify-between gap-3 py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-medium" style={{ color: INK }}>{e.title}</div>
                  <div className="text-[11.5px]" style={{ color: MUTED }}>{e.category || e.type} · {fmt.date(e.event_date)}</div>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: STATUS_COLOR[e.status] ?? MUTED }}>{e.status}</span>
              </Link>
            ))}
            {upcoming.length === 0 && <p className="py-6 text-center text-[13px]" style={{ color: MUTED }}>{tr('No upcoming events.', 'কোনো আসন্ন অনুষ্ঠান নেই।')}</p>}
          </div>
        </div>

        <div className="rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <h2 className="mb-3 text-[15px] font-semibold" style={{ color: INK }}>{tr('Quick actions', 'দ্রুত কাজ')}</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <QA to="/admin/events" label={tr('New event', 'নতুন অনুষ্ঠান')} />
            <QA to="/admin/attendance" label={tr('Attendance', 'উপস্থিতি')} />
            <QA to="/admin/expenses" label={tr('Add expense', 'ব্যয় যোগ')} />
            <QA to="/admin/donations" label={tr('Donations', 'অনুদান')} />
          </div>
        </div>
      </div>

      {/* blood + top spend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <h2 className="mb-3 text-[15px] font-semibold" style={{ color: INK }}>{tr('Blood donation summary', 'রক্তদান সারসংক্ষেপ')}</h2>
          <div className="mb-3 text-[24px] font-bold" style={{ color: RED }}>{fmt.num(bloodUnits)} <span className="text-[13px] font-normal" style={{ color: MUTED }}>{tr('units collected', 'ইউনিট সংগৃহীত')}</span></div>
          {groupUnits.arr.length === 0 ? <p className="text-[13px]" style={{ color: MUTED }}>{tr('No blood units recorded.', 'কোনো রক্তের ইউনিট নেই।')}</p> : (
            <div className="space-y-2">
              {groupUnits.arr.map((x) => (
                <div key={x.g} className="flex items-center gap-3">
                  <span className="w-9 text-[12px] font-bold" style={{ color: RED }}>{x.g}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: CREAM }}><div className="h-full rounded-full" style={{ width: `${(x.n / groupUnits.max) * 100}%`, background: RED }} /></div>
                  <span className="w-8 text-right text-[12px] font-semibold" style={{ color: INK }}>{fmt.num(x.n)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
          <h2 className="mb-3 text-[15px] font-semibold" style={{ color: INK }}>{tr('Top events by spend', 'সর্বাধিক ব্যয়ের অনুষ্ঠান')}</h2>
          {topSpend.arr.length === 0 ? <p className="text-[13px]" style={{ color: MUTED }}>{tr('No event expenses yet.', 'কোনো অনুষ্ঠান ব্যয় নেই।')}</p> : (
            <div className="space-y-2.5">
              {topSpend.arr.map((x) => (
                <div key={x.id}>
                  <div className="mb-1 flex items-center justify-between text-[12.5px]"><span className="truncate" style={{ color: INK2 }}>{x.title}</span><span className="font-semibold" style={{ color: '#b45309' }}>{fmt.money(x.v)}</span></div>
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: CREAM }}><div className="h-full rounded-full" style={{ width: `${(x.v / topSpend.max) * 100}%`, background: '#b45309' }} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* recent lists */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListCard title={tr('Recent donations', 'সাম্প্রতিক অনুদান')}>
          {recentDon.map((d, i) => (
            <Row key={i} left={d.is_anonymous ? tr('Anonymous', 'নাম গোপন') : (d.donor_name || '—')} sub={`${titleOf[d.event_id] ?? ''} · ${fmt.date(d.created_at)}`} right={fmt.money(Number(d.amount))} rightColor={GREEN} />
          ))}
          {recentDon.length === 0 && <Empty tr={tr} />}
        </ListCard>
        <ListCard title={tr('Recent event expenses', 'সাম্প্রতিক অনুষ্ঠান ব্যয়')}>
          {recentExp.map((e, i) => (
            <Row key={i} left={titleOf[e.event_id] ?? '—'} sub={`${e.status} · ${fmt.date(e.created_at)}`} right={fmt.money(Number(e.amount))} rightColor="#b45309" />
          ))}
          {recentExp.length === 0 && <Empty tr={tr} />}
        </ListCard>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-[10px] p-4" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: MUTED }}>{label}</div>
      <div className="mt-1.5 text-[22px] font-bold" style={{ color }}>{value}</div>
    </div>
  );
}
function QA({ to, label }: { to: string; label: string }) {
  return <Link to={to} className="rounded-[8px] px-3 py-3 text-center text-[12.5px] font-semibold transition-colors" style={{ background: CREAM, border: `1px solid ${RULE}`, color: TEAL }}>{label}</Link>;
}
function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[10px] p-5" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
      <h2 className="mb-2 text-[15px] font-semibold" style={{ color: INK }}>{title}</h2>
      <div className="divide-y" style={{ borderColor: RULE }}>{children}</div>
    </div>
  );
}
function Row({ left, sub, right, rightColor }: { left: string; sub: string; right: string; rightColor: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
      <div className="min-w-0"><div className="truncate text-[13px] font-medium" style={{ color: INK }}>{left}</div><div className="truncate text-[11px]" style={{ color: MUTED }}>{sub}</div></div>
      <span className="shrink-0 text-[13px] font-semibold" style={{ color: rightColor }}>{right}</span>
    </div>
  );
}
function Empty({ tr }: { tr: (en: string, bn: string) => string }) {
  return <p className="py-6 text-center text-[13px]" style={{ color: MUTED }}>{tr('Nothing yet.', 'এখনো কিছু নেই।')}</p>;
}
function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />;
}
