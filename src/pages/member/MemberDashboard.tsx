import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useFmt, monthNames, toBengaliDigits } from '@/lib/format';
import { useT } from '@/i18n';
import { memberDisplayId } from '@/types';
import type { CswoEvent, MonthlyContribution } from '@/types';

const BRAND  = '#c2410c';
const INK    = '#1c1917';
const MUTED  = '#78716c';
const RULE   = '#e7e5e4';
const CREAM  = '#faf6ef';
const SERIF  = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };

// ── Helpers ─────────────────────────────────────────────────────────────────

function MemberAvatar({ avatarUrl, name, size = 72 }: { avatarUrl: string | null; name: string; size?: number }) {
  const ini = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt={name} onError={(e) => { e.currentTarget.style.display = 'none'; }}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${BRAND}`, flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: BRAND, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700, border: `3px solid ${BRAND}`,
      ...SERIF,
    }}>{ini}</div>
  );
}

function SenderAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const ini = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#44403c', color: CREAM,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, ...SERIF,
    }}>{ini}</div>
  );
}

function CircularProgress({ pct, size = 100 }: { pct: number; size?: number }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={RULE} strokeWidth={11} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={11}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize={size * 0.2}
        fontWeight={700} fill={INK}>{pct}%</text>
    </svg>
  );
}

// Standing tier based on cumulative paid months
function getStanding(paidMonths: number): { label_bn: string; label_en: string; color: string; pct: number } {
  if (paidMonths >= 24) return { label_bn: 'হীরা স্তর', label_en: 'Diamond', color: '#0ea5e9', pct: 100 };
  if (paidMonths >= 18) return { label_bn: 'প্লাটিনাম স্তর', label_en: 'Platinum', color: '#8b5cf6', pct: Math.round((paidMonths / 24) * 100) };
  if (paidMonths >= 12) return { label_bn: 'স্বর্ণ স্তর', label_en: 'Gold', color: '#f59e0b', pct: Math.round((paidMonths / 18) * 100) };
  if (paidMonths >= 6)  return { label_bn: 'রূপা স্তর', label_en: 'Silver', color: '#6b7280', pct: Math.round((paidMonths / 12) * 100) };
  return { label_bn: 'সদস্য', label_en: 'Member', color: '#c2410c', pct: Math.round((paidMonths / 6) * 100) };
}

interface AdminMsg { id: string; sender_name: string; message: string; is_read: boolean; created_at: string; }

interface DashData {
  contributions: Record<number, MonthlyContribution>;
  attendedIds: Set<string>;
  events: CswoEvent[];
  donations: number;
  posts: number;
  allTimePaidMonths: number;
  adminMsgs: AdminMsg[];
  volunteerCount: number;
}

// Bengali weekday/month for header
const BN_WEEKDAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

function todayHeader(lang: string) {
  const d = new Date();
  const day = lang === 'bn' ? BN_WEEKDAYS[d.getDay()] : d.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  const dateNum = lang === 'bn' ? toBengaliDigits(d.getDate()) : d.getDate();
  const month = lang === 'bn' ? monthNames('bn')[d.getMonth()] : monthNames('en')[d.getMonth()];
  const year = lang === 'bn' ? toBengaliDigits(d.getFullYear()) : d.getFullYear();
  return { day, dateNum, month, year };
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function MemberDashboard() {
  const { member } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member) return;
    (async () => {
      const year = new Date().getFullYear();
      const [contribs, att, evts, don, posts, allPaid, adminMsgs, volunteerAtt] = await Promise.all([
        supabase.from('cswo_monthly_contributions').select('*').eq('member_id', member.id).eq('year', year),
        supabase.from('cswo_attendance').select('event_id').eq('member_id', member.id),
        supabase.from('cswo_events').select('*').order('event_date', { ascending: false }),
        supabase.from('cswo_donations').select('amount').eq('member_id', member.id).eq('status', 'paid'),
        supabase.from('cswo_posts').select('id', { count: 'exact', head: true }).eq('author_id', member.id).eq('status', 'published'),
        supabase.from('cswo_monthly_contributions').select('id', { count: 'exact', head: true }).eq('member_id', member.id).eq('status', 'paid'),
        supabase.from('cswo_admin_messages').select('*').eq('member_id', member.id).order('created_at', { ascending: false }).limit(3),
        supabase.from('cswo_attendance').select('event_id', { count: 'exact', head: true }).eq('member_id', member.id).eq('status', 'volunteered'),
      ]);

      const contribMap: Record<number, MonthlyContribution> = {};
      for (const r of (contribs.data ?? []) as MonthlyContribution[]) contribMap[r.month] = r;

      const attendedIds = new Set((att.data ?? []).map((a: { event_id: string }) => a.event_id));
      const donated = ((don.data ?? []) as { amount: number }[]).reduce((s, d) => s + Number(d.amount), 0);

      setData({
        contributions: contribMap,
        attendedIds,
        events: (evts.data ?? []) as CswoEvent[],
        donations: donated,
        posts: posts.count ?? 0,
        allTimePaidMonths: allPaid.count ?? 0,
        adminMsgs: (adminMsgs.data ?? []) as AdminMsg[],
        volunteerCount: volunteerAtt.count ?? 0,
      });
      setLoading(false);
    })();
  }, [member]);

  if (!member) return null;

  const memberId = memberDisplayId(member);
  const { day, dateNum, month, year: headerYear } = todayHeader(lang);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const elapsedMonths = currentMonth;
  const months = fmt.months();

  if (loading || !data) {
    return (
      <div style={{ color: MUTED, padding: '40px 0', textAlign: 'center' }}>
        {tr('Loading…', 'লোড হচ্ছে…')}
      </div>
    );
  }

  const paidCount = Object.values(data.contributions).filter((r) => r.status === 'paid').length;
  const unpaidThisYear = elapsedMonths - paidCount;
  const attendancePct = data.events.length > 0 ? Math.round((data.attendedIds.size / data.events.length) * 100) : 0;
  const compliancePct = elapsedMonths > 0 ? Math.round((paidCount / elapsedMonths) * 100) : 0;
  const standing = getStanding(data.allTimePaidMonths);

  const upcomingEvents = data.events
    .filter((e) => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 3);

  const recentAttended = data.events
    .filter((e) => data.attendedIds.has(e.id) && new Date(e.event_date) < new Date())
    .slice(0, 4);

  const unreadCount = data.adminMsgs.filter((m) => !m.is_read).length;
  const currentMonthContrib = data.contributions[currentMonth];
  const currentMonthDue = !currentMonthContrib || currentMonthContrib.status !== 'paid';

  // Ledger: combine contributions + donations into a unified recent feed
  const ledgerItems: { icon: string; label: string; sub: string; date: string; amount?: number }[] = [
    ...Object.values(data.contributions)
      .filter((c) => c.status === 'paid' && c.paid_at)
      .map((c) => ({
        icon: '₹',
        label: tr(`${months[c.month - 1]} dues`, `${months[c.month - 1]} মাসের চাঁদা`),
        sub: tr(`Receipt #${c.receipt_number ?? '—'}`, `রসিদ #${c.receipt_number ?? '—'}`),
        date: c.paid_at!,
        amount: Number(c.amount),
      })),
    ...data.events
      .filter((e) => data.attendedIds.has(e.id))
      .slice(0, 3)
      .map((e) => ({
        icon: '✓',
        label: e.title,
        sub: e.location ?? '',
        date: e.event_date,
      })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5">

      {/* ── Welcome Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: MUTED }}>
            {day} · {dateNum} {month} {headerYear}
          </p>
          <h1 className="mt-0.5 text-[26px] font-extrabold leading-tight" style={{ ...SERIF, color: INK }}>
            {tr('Welcome back, ', 'স্বাগতম, ')}
            <span style={{ color: BRAND }}>{member.full_name.split(' ')[0]}</span>
            {' '}
            <span className="text-[20px] italic font-light" style={{ color: MUTED }}>
              · {tr('Welcome back', 'Welcome back')}
            </span>
          </h1>
          {/* Alert strip */}
          {(unpaidThisYear > 0 || unreadCount > 0) && (
            <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
              {tr('This week', 'এই সপ্তাহে')}
              {unpaidThisYear > 0 && (
                <>{' '}{tr(`${months[currentMonth - 1]} dues pending`, `${months[currentMonth - 1]} মাসের চাঁদা`)}
                  {' '}<span className="font-semibold" style={{ color: BRAND }}>{tr('still pending', 'এখনো বাকি')}</span>,</>
              )}
              {unreadCount > 0 && (
                <>{' '}{tr('and', 'এবং')} <span className="font-semibold" style={{ color: INK }}>{fmt.num(unreadCount)} {tr('new message(s)', 'টি নতুন বার্তা')}</span> {tr('arrived', 'এসেছে')}।</>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to="/member/posts"
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-80"
            style={{ background: INK, color: CREAM }}
          >
            ✍ {tr('Write Post', 'পোস্ট লিখুন')}
          </Link>
          <Link
            to="/donate"
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-80"
            style={{ background: BRAND, color: '#fff' }}
          >
            ♥ {tr('Donate', 'অনুদান দিন')}
          </Link>
        </div>
      </div>

      {/* ── Profile Card ───────────────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-start"
        style={{ background: '#fff', border: `1px solid ${RULE}`, boxShadow: '0 2px 16px rgba(28,25,23,0.07)' }}
      >
        {/* Avatar + info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <MemberAvatar avatarUrl={member.avatar_url} name={member.full_name} size={72} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
                MEMBER · {memberId}
              </span>
            </div>
            <h2 className="mt-0.5 text-[20px] font-bold leading-tight" style={{ ...SERIF, color: INK }}>
              {member.full_name}
              <span className="ml-2 text-[14px] font-light italic" style={{ color: MUTED }}>
                · {member.full_name}
              </span>
            </h2>
            <p className="mt-0.5 text-[12px]" style={{ color: MUTED }}>
              {tr('Active member', 'সক্রিয় স্বেচ্ছাসেবিকা')} · {tr('Member since', 'সদস্য')} — {fmt.date(member.joined_at || member.created_at)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px]" style={{ color: MUTED }}>
              {member.address && (
                <span>📍 {member.address}</span>
              )}
              {member.phone && (
                <span>📞 {member.phone}</span>
              )}
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
                style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}
              >
                ✓ {tr('VERIFIED', 'যাচাইকৃত')}
              </span>
              {member.blood_group && (
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
                  style={{ background: 'rgba(220,38,38,0.1)', color: '#dc2626' }}
                >
                  ✦ {member.blood_group}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Standing box */}
        <div
          className="shrink-0 rounded-xl p-4 min-w-[180px]"
          style={{ background: CREAM, border: `1px solid ${RULE}` }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            YOUR STANDING · {tr('স্তর', 'Level')}
          </p>
          <p className="mt-1 text-[18px] font-bold" style={{ ...SERIF, color: standing.color }}>
            {lang === 'bn' ? standing.label_bn : standing.label_en}
          </p>
          <p className="mb-2 text-[10px]" style={{ color: MUTED }}>
            {fmt.num(data.allTimePaidMonths)} {tr('months contributed', 'মাস অবদান')}
          </p>
          {/* Progress bars for tier */}
          <div className="space-y-1">
            {[
              { label: tr('Dues', 'চাঁদা'), pct: compliancePct },
              { label: tr('Attendance', 'উপস্থিতি'), pct: attendancePct },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-[10px] mb-0.5" style={{ color: MUTED }}>
                  <span>{bar.label}</span><span>{bar.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: RULE }}>
                  <div className="h-full rounded-full" style={{ width: `${bar.pct}%`, background: standing.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dues + Attendance Row ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Dues section (2/3 width) */}
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: '#fff', border: `1px solid ${RULE}`, boxShadow: '0 1px 8px rgba(28,25,23,0.05)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
                YOUR DUES · {tr('চাঁদা', 'Dues')}
              </p>
              <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
                {tr('Dues Payment', 'চাঁদা পরিশোধ')}
              </h3>
            </div>
            {currentMonthDue && (
              <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ background: 'rgba(194,65,12,0.1)', color: BRAND }}>
                {months[currentMonth - 1]} {tr('due →', 'বাকি →')} ₹100
              </span>
            )}
          </div>

          {/* Paid count */}
          <div className="mb-3 flex items-baseline gap-1">
            <span className="text-[42px] font-black" style={{ color: INK }}>{fmt.num(paidCount)}</span>
            <span className="text-[18px] font-light" style={{ color: MUTED }}>/{fmt.num(12)}</span>
          </div>
          <p className="mb-3 text-[12px]" style={{ color: MUTED }}>
            {tr(`Last ${months[Math.max(0, currentMonth - 2)]} month paid`, `বিগত ${months[Math.max(0, currentMonth - 2)]} মাসের পরিশোধিত`)}
          </p>

          {/* Month grid */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {months.map((mn, i) => {
              const m = i + 1;
              const row = data.contributions[m];
              const paid = row?.status === 'paid';
              const isFuture = m > currentMonth;
              return (
                <div key={m} title={mn}
                  style={{
                    width: 36, height: 24, borderRadius: 4, flexShrink: 0,
                    background: isFuture ? 'rgba(120,113,108,0.12)' : paid ? '#16a34a' : 'rgba(194,65,12,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: 700, color: isFuture ? MUTED : paid ? '#fff' : BRAND,
                  }}
                >
                  {lang === 'bn' ? mn.slice(0, 3) : mn.slice(0, 3)}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between">
            {currentMonthDue ? (
              <p className="text-[12px]" style={{ color: MUTED }}>
                {months[currentMonth - 1]} {tr('dues ₹100 still pending.', 'মাসের চাঁদা ₹১০০ এখনো বাকি।')}
              </p>
            ) : (
              <p className="text-[12px] font-semibold" style={{ color: '#16a34a' }}>
                ✓ {tr('All dues paid this month!', 'এই মাসের চাঁদা পরিশোধিত!')}
              </p>
            )}
            <Link
              to="/member/contributions"
              className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] transition-opacity hover:opacity-80"
              style={{ background: BRAND, color: '#fff' }}
            >
              ₹ {tr('Pay via UPI', 'UPI-তে পরিশোধ করুন')}
            </Link>
          </div>
        </div>

        {/* Attendance (1/3 width) */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#fff', border: `1px solid ${RULE}`, boxShadow: '0 1px 8px rgba(28,25,23,0.05)' }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
            ATTENDANCE · {tr('উপস্থিতি', 'Attendance')}
          </p>
          <h3 className="mt-0.5 mb-4 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
            {tr('Your Attendance', 'তোমার উপস্থিতি')}
          </h3>

          <div className="flex justify-center mb-3">
            <CircularProgress pct={attendancePct} size={100} />
          </div>
          <p className="text-center text-[11px] mb-4 font-semibold" style={{ color: MUTED }}>
            {tr('PRESENT', 'উপস্থিত')}
          </p>

          <p className="text-[11px] font-semibold mb-2 uppercase tracking-[0.1em]" style={{ color: MUTED }}>
            {tr('Recent:', 'সাম্প্রতিক:')}
          </p>
          <div className="space-y-1.5">
            {recentAttended.length === 0 ? (
              <p className="text-[12px]" style={{ color: MUTED }}>
                {tr('No events attended yet', 'এখনো কোনো অনুষ্ঠানে অংশ নেওয়া হয়নি')}
              </p>
            ) : recentAttended.map((e) => (
              <div key={e.id} className="flex items-center justify-between">
                <p className="text-[12px] truncate" style={{ color: INK }}>{e.title}</p>
                <span className="ml-2 text-[10px] rounded-full px-2 py-0.5 font-semibold shrink-0" style={{ background: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>
                  {tr('Present', 'উপস্থিত')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Upcoming Events + Messages Row ────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Upcoming Events (2/3) */}
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: '#fff', border: `1px solid ${RULE}`, boxShadow: '0 1px 8px rgba(28,25,23,0.05)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
                UPCOMING · {tr('আসছে', 'Coming up')}
              </p>
              <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
                {tr('Your Invitations', 'তোমার জন্য আমন্ত্রণ')}
                {' '}
                <span className="text-[14px] italic font-light" style={{ color: MUTED }}>
                  · {tr('Save your spot', 'Save your spot')}
                </span>
              </h3>
            </div>
            <Link to="/member/attendance" className="text-[11px] font-semibold uppercase tracking-[0.1em] hover:underline" style={{ color: BRAND }}>
              {tr('All Events →', 'সব অনুষ্ঠান →')}
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <p className="text-[13px] py-8 text-center" style={{ color: MUTED }}>
              {tr('No upcoming events', 'কোনো আসন্ন অনুষ্ঠান নেই')}
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((ev) => {
                const evDate = new Date(ev.event_date);
                const isGoing = data.attendedIds.has(ev.id);
                return (
                  <div key={ev.id}
                    className="flex items-center gap-4 rounded-xl p-3"
                    style={{ background: CREAM, border: `1px solid ${RULE}` }}
                  >
                    {/* Date badge */}
                    <div className="shrink-0 text-center rounded-lg px-3 py-2" style={{ background: BRAND, color: '#fff', minWidth: 52 }}>
                      <div className="text-[11px] font-semibold uppercase">
                        {lang === 'bn' ? monthNames('bn')[evDate.getMonth()].slice(0, 3) : monthNames('en')[evDate.getMonth()].slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-[22px] font-black leading-tight">
                        {lang === 'bn' ? toBengaliDigits(evDate.getDate()) : evDate.getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[14px] truncate" style={{ color: INK }}>{ev.title}</h4>
                      {ev.location && (
                        <p className="text-[12px] truncate" style={{ color: MUTED }}>📍 {ev.location}</p>
                      )}
                    </div>
                    <Link
                      to="/member/attendance"
                      className="shrink-0 rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-80"
                      style={{
                        background: isGoing ? '#16a34a' : BRAND,
                        color: '#fff',
                      }}
                    >
                      {isGoing ? `✓ ${tr('Going', 'যাচ্ছি')}` : tr('Join', 'যোগ দিন')}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin Messages (1/3) */}
        <div
          className="rounded-2xl p-5 flex flex-col"
          style={{ background: '#fff', border: `1px solid ${RULE}`, boxShadow: '0 1px 8px rgba(28,25,23,0.05)' }}
        >
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
              FROM ADMIN · {tr('অ্যাডমিন', 'Admin')}
            </p>
            <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
              {tr('Your Messages', 'তোমার জন্য বার্তা')}
              {' '}
              <span className="text-[14px] italic font-light" style={{ color: MUTED }}>· Messages</span>
            </h3>
          </div>

          {data.adminMsgs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-[12px] text-center" style={{ color: MUTED }}>
                {tr('No messages from admin yet', 'এখনো কোনো বার্তা নেই')}
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-3">
              {data.adminMsgs.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <SenderAvatar name={msg.sender_name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[12px] font-semibold truncate" style={{ color: INK }}>{msg.sender_name}</span>
                      <span className="text-[10px] shrink-0" style={{ color: MUTED }}>{fmt.date(msg.created_at)}</span>
                    </div>
                    <p className="mt-0.5 text-[12px] leading-relaxed line-clamp-2" style={{ color: MUTED }}>{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            to="/member/messages"
            className="mt-4 block text-center text-[11px] font-semibold uppercase tracking-[0.1em] hover:underline"
            style={{ color: BRAND }}
          >
            {tr('See all messages →', 'সব বার্তা দেখুন →')}
          </Link>
        </div>
      </div>

      {/* ── Ledger + Impact Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Ledger */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#fff', border: `1px solid ${RULE}`, boxShadow: '0 1px 8px rgba(28,25,23,0.05)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
                YOUR LEDGER · {tr('অবদান পাতা', 'Ledger')}
              </p>
              <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
                {tr('Your Contributions', 'তোমার অবদান')}
                {' '}
                <span className="text-[13px] italic font-light" style={{ color: MUTED }}>
                  · {tr('Recent contributions', 'Recent contributions')}
                </span>
              </h3>
            </div>
            <Link to="/member/contributions" className="text-[11px] font-semibold uppercase tracking-[0.1em] hover:underline" style={{ color: BRAND }}>
              {tr('History →', 'ইতিহাস →')}
            </Link>
          </div>

          <div className="space-y-3 mb-5">
            {ledgerItems.length === 0 ? (
              <p className="text-[12px] py-4 text-center" style={{ color: MUTED }}>
                {tr('No activity yet', 'এখনো কোনো কার্যক্রম নেই')}
              </p>
            ) : ledgerItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: item.amount ? 'rgba(194,65,12,0.1)' : 'rgba(22,163,74,0.1)',
                  color: item.amount ? BRAND : '#16a34a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate" style={{ color: INK }}>{item.label}</p>
                  {item.sub && <p className="text-[11px] truncate" style={{ color: MUTED }}>{item.sub}</p>}
                </div>
                <div className="text-right shrink-0">
                  {item.amount ? (
                    <p className="text-[13px] font-semibold" style={{ color: BRAND }}>₹{item.amount}</p>
                  ) : null}
                  <p className="text-[10px]" style={{ color: MUTED }}>{fmt.date(item.date)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-around border-t pt-4" style={{ borderColor: RULE }}>
            <div className="text-center">
              <p className="text-[20px] font-black" style={{ color: INK }}>{fmt.num(data.volunteerCount)}</p>
              <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>{tr('Volunteer', 'স্বেচ্ছাসেবক')}</p>
            </div>
            <div style={{ width: 1, height: 32, background: RULE }} />
            <div className="text-center">
              <p className="text-[20px] font-black" style={{ color: BRAND }}>₹{fmt.num(data.donations)}</p>
              <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>{tr('Donated', 'দান')}</p>
            </div>
            <div style={{ width: 1, height: 32, background: RULE }} />
            <div className="text-center">
              <p className="text-[20px] font-black" style={{ color: INK }}>{fmt.num(data.posts)}</p>
              <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: MUTED }}>{tr('Posts', 'পোস্ট')}</p>
            </div>
          </div>
        </div>

        {/* Impact */}
        <div
          className="rounded-2xl p-5"
          style={{ background: '#fff', border: `1px solid ${RULE}`, boxShadow: '0 1px 8px rgba(28,25,23,0.05)' }}
        >
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
              YOUR IMPACT · {tr('প্রভাব', 'Impact')}
            </p>
            <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
              {tr('What you changed', 'যা তুমি বদলে দিয়েছ')}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { icon: '🩸', value: data.volunteerCount, label: tr('Blood donations joined', 'রক্তদানে যোগদান'), color: '#dc2626' },
              { icon: '🌱', value: paidCount, label: tr('Months contributed', 'মাস অবদান রেখেছ'), color: '#16a34a' },
              { icon: '📚', value: data.attendedIds.size, label: tr('Events attended', 'অনুষ্ঠানে অংশগ্রহণ'), color: '#2563eb' },
              { icon: '❤', value: Math.round(data.donations / 100) || 0, label: tr('Lives impacted (est.)', 'জীবন স্পর্শ করেছ'), color: '#c2410c' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: CREAM, border: `1px solid ${RULE}` }}>
                <div className="text-[28px] leading-none mb-1">{item.icon}</div>
                <div className="text-[28px] font-black" style={{ color: item.color }}>
                  {lang === 'bn' ? toBengaliDigits(item.value) : item.value}
                </div>
                <p className="text-[10px] leading-tight mt-1" style={{ color: MUTED }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="rounded-xl p-4" style={{ background: CREAM, border: `1px solid ${RULE}` }}>
            <p className="text-[12px] italic leading-relaxed" style={{ color: MUTED }}>
              &ldquo;{tr(
                'Your every contribution strengthens the foundation of Chatrodol. Every step, every moment carries weight.',
                'তোমার মেধা সমাজরক্ষায় ছাত্রদলের প্রতিটি পদক্ষেপ। প্রতিটি মুহূর্ত, প্রতিটি কাজ গণ্য হয়।'
              )}&rdquo;
            </p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: BRAND }}>
              — {tr('General Secretary, Chatrodol', 'সাধারণ সম্পাদক, ছাত্রদল')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
