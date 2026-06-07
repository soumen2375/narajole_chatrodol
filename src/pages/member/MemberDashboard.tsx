import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useFmt, monthNames, toBengaliDigits } from '@/lib/format';
import { useT } from '@/i18n';
import { subscribeToPush, getNotificationPermission, showLocalNotification } from '@/lib/pushNotifications';
import { memberDisplayId } from '@/types';
import type { CswoEvent, MonthlyContribution } from '@/types';
import { 
  PenSquare, 
  Heart, 
  MapPin, 
  Phone, 
  Check, 
  Droplet, 
  Calendar, 
  Award, 
  IndianRupee, 
  Sparkles
} from 'lucide-react';

const BRAND  = '#0c756f'; // Deep Teal
const INK    = '#000201'; // Charcoal Black
const MUTED  = '#7a7c7b'; // Charcoal Muted
const RULE   = '#e5dec9'; // Warm Border
const CREAM  = '#efeadb'; // Warm Cream
const ACCENT = '#fdcf6f'; // Warm Gold
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
      background: BRAND, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, ...SERIF,
    }}>{ini}</div>
  );
}

function CircularProgress({ pct, size = 100 }: { pct: number; size?: number }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#fdcf6f' : '#ef4444';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1ede4" strokeWidth={11} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={11}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 6} textAnchor="middle" fontSize={size * 0.2}
        fontWeight={800} fill={INK}>{pct}%</text>
    </svg>
  );
}

// Standing tier based on cumulative paid months
function getStanding(paidMonths: number): { label_bn: string; label_en: string; color: string; pct: number } {
  if (paidMonths >= 24) return { label_bn: 'হীরা স্তর', label_en: 'Diamond', color: '#0ea5e9', pct: 100 };
  if (paidMonths >= 18) return { label_bn: 'প্লাটিনাম স্তর', label_en: 'Platinum', color: '#8b5cf6', pct: Math.round((paidMonths / 24) * 100) };
  if (paidMonths >= 12) return { label_bn: 'স্বর্ণ স্তর', label_en: 'Gold', color: '#eab308', pct: Math.round((paidMonths / 18) * 100) };
  if (paidMonths >= 6)  return { label_bn: 'রূপা স্তর', label_en: 'Silver', color: '#6b7280', pct: Math.round((paidMonths / 12) * 100) };
  return { label_bn: 'সদস্য', label_en: 'Member', color: '#0c756f', pct: Math.round((paidMonths / 6) * 100) };
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

// ── Main Component ───────────────────────────────────────────────────────────
export default function MemberDashboard() {
  const { member } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  useEffect(() => {
    const perm = getNotificationPermission();
    if (perm === 'default') {
      setShowPushPrompt(true);
    }
  }, []);

  const handleEnablePush = async () => {
    const sub = await subscribeToPush();
    if (sub) {
      showLocalNotification(tr('Notifications Enabled ✓', 'বিজ্ঞপ্তি সক্রিয় করা হয়েছে ✓'), {
        body: tr('You will now receive updates on monthly contributions and events.', 'আপনি এখন থেকে চাঁদা ও অনুষ্ঠানের আপডেট পাবেন।'),
      });
    }
    setShowPushPrompt(false);
  };

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
  const ledgerItems: { type: 'dues' | 'attendance'; label: string; sub: string; date: string; amount?: number }[] = [
    ...Object.values(data.contributions)
      .filter((c) => c.status === 'paid' && c.paid_at)
      .map((c) => ({
        type: 'dues' as const,
        label: tr(`${months[c.month - 1]} dues`, `${months[c.month - 1]} মাসের চাঁদা`),
        sub: tr(`Receipt #${c.receipt_number ?? '—'}`, `রসিদ #${c.receipt_number ?? '—'}`),
        date: c.paid_at!,
        amount: Number(c.amount),
      })),
    ...data.events
      .filter((e) => data.attendedIds.has(e.id))
      .slice(0, 3)
      .map((e) => ({
        type: 'attendance' as const,
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
            {tr('MEMBER OVERVIEW', 'সদস্য সারসংক্ষেপ')}
          </p>
          <h1 className="mt-2 text-[30px] leading-tight animate-fade-in" style={{ fontFamily: '"Noto Serif Bengali", serif', color: INK }}>
            {tr('Welcome back, ', 'স্বাগতম, ')}
            <span style={{ color: BRAND }}>{member.full_name.split(' ')[0]}</span>
          </h1>
          {/* Alert strip */}
          {(currentMonthDue || unreadCount > 0) && (
            <p className="mt-1 text-[13px]" style={{ color: MUTED }}>
              {tr('This week:', 'এই সপ্তাহে:')}
              {currentMonthDue && (
                <>{' '}{tr(`${months[currentMonth - 1]} dues`, `${months[currentMonth - 1]} মাসের চাঁদা`)}
                  {' '}<span className="font-semibold" style={{ color: '#dc2626' }}>{tr('are still due', 'এখনো বাকি')}</span>,</>
              )}
              {unreadCount > 0 && (
                <>{' '}{tr('and', 'এবং')} <span className="font-semibold" style={{ color: INK }}>{fmt.num(unreadCount)} {tr('unread bulletin(s)', 'টি নতুন বার্তা')}</span> {tr('received', 'এসেছে')}।</>
              )}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to="/member/posts"
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] transition-all hover:-translate-y-[1px] shadow-sm hover:shadow-md"
            style={{ background: INK, color: CREAM }}
          >
            <PenSquare className="h-3.5 w-3.5" />
            {tr('Write Post', 'পোস্ট লিখুন')}
          </Link>
          <Link
            to="/donate"
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] transition-all hover:-translate-y-[1px] shadow-sm hover:shadow-md"
            style={{ background: BRAND, color: '#fff' }}
          >
            <Heart className="h-3.5 w-3.5 fill-white" />
            {tr('Donate', 'অনুদান দিন')}
          </Link>
        </div>
      </div>

      {/* Push notifications prompt */}
      {showPushPrompt && (
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl p-4 border animate-fade-in"
          style={{ background: 'rgba(253,207,111,0.06)', borderColor: ACCENT }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🔔</span>
            <div>
              <p className="text-sm font-bold" style={{ color: INK }}>
                {tr('Enable Phone Notifications', 'ফোনে নোটিফিকেশন চালু করুন')}
              </p>
              <p className="text-xs" style={{ color: MUTED }}>
                {tr('Never miss monthly dues alerts or event announcements.', 'মাসিক চাঁদা বা কোনো গুরুত্বপূর্ণ নোটিশ মিস করবেন না।')}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleEnablePush}
              className="rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider"
              style={{ background: BRAND, color: '#fff' }}
            >
              {tr('Enable', 'চালু করুন')}
            </button>
            <button
              onClick={() => setShowPushPrompt(false)}
              className="rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-gray-100"
              style={{ color: MUTED }}
            >
              {tr('Dismiss', 'বাতিল')}
            </button>
          </div>
        </div>
      )}

      {/* ── Profile Card ───────────────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-start border card-lift"
        style={{ background: '#fff', borderColor: RULE, boxShadow: '0 4px 16px rgba(0,2,1,0.03)' }}
      >
        {/* Avatar + info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <MemberAvatar avatarUrl={member.avatar_url} name={member.full_name} size={72} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
                MEMBER · {memberId}
              </span>
            </div>
            <h2 className="mt-0.5 text-[20px] font-bold leading-tight" style={{ ...SERIF, color: INK }}>
              {member.full_name}
              {member.designation && (
                <span className="ml-2 text-[14px] font-light italic" style={{ color: MUTED }}>
                  · {member.designation}
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-[12px] flex items-center gap-1 font-semibold" style={{ color: MUTED }}>
              <Calendar className="h-3.5 w-3.5" />
              {tr('Active member since', 'সক্রিয় সদস্য')} — {fmt.date(member.joined_at || member.created_at)}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[12px] font-semibold" style={{ color: MUTED }}>
              {member.address && (
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {member.address}</span>
              )}
              {member.phone && (
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {member.phone}</span>
              )}
              <span
                className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold flex items-center gap-0.5 bg-green-50 text-green-600 border border-green-150"
              >
                <Check className="h-3 w-3" /> {tr('VERIFIED', 'যাচাইকৃত')}
              </span>
              {member.blood_group && (
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold flex items-center gap-0.5 bg-red-50 text-red-600 border border-red-150"
                >
                  <Droplet className="h-3 w-3 fill-red-600" /> {member.blood_group}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Standing box */}
        <div
          className="shrink-0 rounded-xl p-4 min-w-[180px] border shadow-xs"
          style={{ background: '#faf9f6', borderColor: RULE }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: MUTED }}>
            YOUR STANDING · {tr('Level', 'স্তর')}
          </p>
          <p className="mt-1 text-[18px] font-bold" style={{ ...SERIF, color: standing.color }}>
            {lang === 'bn' ? standing.label_bn : standing.label_en}
          </p>
          <p className="mb-2 text-[10px] font-semibold" style={{ color: MUTED }}>
            {fmt.num(data.allTimePaidMonths)} {tr('months paid', 'মাস পরিশোধিত')}
          </p>
          {/* Progress bars for tier */}
          <div className="space-y-1">
            {[
              { label: tr('Dues', 'চাঁদা'), pct: compliancePct },
              { label: tr('Attendance', 'উপস্থিতি'), pct: attendancePct },
            ].map((bar) => (
              <div key={bar.label}>
                <div className="flex justify-between text-[10px] mb-0.5" style={{ color: MUTED }}>
                  <span className="font-semibold">{bar.label}</span><span>{bar.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${bar.pct}%`, background: standing.color }} />
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
          className="lg:col-span-2 rounded-2xl p-5 border bg-white card-lift"
          style={{ borderColor: RULE, boxShadow: '0 2px 10px rgba(0,2,1,0.03)' }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
                YOUR DUES · {tr('Dues', 'চাঁদা')}
              </p>
              <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
                {tr('Dues Payment', 'চাঁদা পরিশোধ')}
              </h3>
            </div>
            {currentMonthDue && (
              <span className="rounded-full px-3 py-1 text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-800">
                {months[currentMonth - 1]} {tr('due: ₹100', 'বাকি: ₹১০০')}
              </span>
            )}
          </div>

          {/* Paid count */}
          <div className="mb-3 flex items-baseline gap-1">
            <span className="text-[42px] font-black leading-none" style={{ color: INK }}>{fmt.num(paidCount)}</span>
            <span className="text-[18px] font-bold" style={{ color: MUTED }}>/{fmt.num(12)}</span>
          </div>
          <p className="mb-3 text-[12px] font-semibold" style={{ color: MUTED }}>
            {tr(`Last payment for ${months[Math.max(0, currentMonth - 2)]}`, `বিগত ${months[Math.max(0, currentMonth - 2)]} মাসের পরিশোধিত`)}
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
                  className="rounded-lg text-[9px] font-extrabold flex items-center justify-center shrink-0 border"
                  style={{
                    width: 42, height: 28,
                    background: isFuture ? '#f1ede4' : paid ? '#e2f0d9' : '#fde8e8',
                    color: isFuture ? MUTED : paid ? '#16a34a' : '#dc2626',
                    borderColor: isFuture ? 'transparent' : paid ? '#c2e0b1' : '#f8b4b4',
                  }}
                >
                  {mn.slice(0, 3)}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: RULE }}>
            {currentMonthDue ? (
              <p className="text-[12px] font-semibold" style={{ color: '#dc2626' }}>
                {months[currentMonth - 1]} {tr('dues ₹100 still pending.', 'মাসের চাঁদা ₹১০০ এখনো বাকি।')}
              </p>
            ) : (
              <p className="text-[12px] font-semibold" style={{ color: '#16a34a' }}>
                {tr('All dues paid this month!', 'এই মাসের চাঁদা পরিশোধিত!')}
              </p>
            )}
            <Link
              to="/member/contributions"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.12em] transition-all hover:-translate-y-[1px] shadow-sm text-brand-dark"
              style={{ background: ACCENT }}
            >
              <IndianRupee className="h-3.5 w-3.5" />
              {tr('Pay Dues', 'পরিশোধ করুন')}
            </Link>
          </div>
        </div>

        {/* Attendance (1/3 width) */}
        <div
          className="rounded-2xl p-5 border bg-white card-lift"
          style={{ borderColor: RULE, boxShadow: '0 2px 10px rgba(0,2,1,0.03)' }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
            ATTENDANCE · {tr('Attendance', 'উপস্থিতি')}
          </p>
          <h3 className="mt-0.5 mb-4 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
            {tr('Your Attendance', 'তোমার উপস্থিতি')}
          </h3>

          <div className="flex justify-center mb-3">
            <CircularProgress pct={attendancePct} size={100} />
          </div>
          <p className="text-center text-[10px] mb-4 font-black tracking-widest text-green-600">
            {tr('ATTENDED', 'উপস্থিত')}
          </p>

          <p className="text-[11px] font-bold mb-2 uppercase tracking-[0.1em]" style={{ color: MUTED }}>
            {tr('Recent Events:', 'সাম্প্রতিক:')}
          </p>
          <div className="space-y-1.5">
            {recentAttended.length === 0 ? (
              <p className="text-[12px]" style={{ color: MUTED }}>
                {tr('No events attended yet', 'এখনো কোনো অনুষ্ঠানে অংশ নেওয়া হয়নি')}
              </p>
            ) : recentAttended.map((e) => (
              <div key={e.id} className="flex items-center justify-between">
                <p className="text-[12px] truncate" style={{ color: INK }}>{e.title}</p>
                <span className="ml-2 text-[9.5px] rounded-full px-2 py-0.5 font-bold shrink-0 bg-green-50 text-green-600 border border-green-150">
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
          className="lg:col-span-2 rounded-2xl p-5 border bg-white card-lift"
          style={{ borderColor: RULE, boxShadow: '0 2px 10px rgba(0,2,1,0.03)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
                UPCOMING · {tr('Coming up', 'আসছে')}
              </p>
              <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
                {tr('Your Invitations', 'তোমার জন্য আমন্ত্রণ')}
              </h3>
            </div>
            <Link to="/member/attendance" className="text-[11px] font-extrabold uppercase tracking-[0.1em] hover:underline" style={{ color: BRAND }}>
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
                    className="flex items-center gap-4 rounded-xl p-3 border hover:shadow-xs transition-shadow duration-200"
                    style={{ background: '#faf9f6', borderColor: RULE }}
                  >
                    {/* Date badge */}
                    <div className="shrink-0 text-center rounded-lg px-3 py-2 text-white" style={{ background: BRAND, minWidth: 52 }}>
                      <div className="text-[9.5px] font-bold uppercase font-mono leading-none">
                        {lang === 'bn' ? monthNames('bn')[evDate.getMonth()].slice(0, 3) : monthNames('en')[evDate.getMonth()].slice(0, 3).toUpperCase()}
                      </div>
                      <div className="text-xl font-black leading-none mt-1">
                        {lang === 'bn' ? toBengaliDigits(evDate.getDate()) : evDate.getDate()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-extrabold text-[13.5px] truncate" style={{ color: INK }}>{ev.title}</h4>
                      {ev.location && (
                        <p className="text-[12px] truncate opacity-75 mt-0.5 flex items-center gap-1" style={{ color: MUTED }}><MapPin className="h-3 w-3" /> {ev.location}</p>
                      )}
                    </div>
                    <Link
                      to="/member/attendance"
                      className="shrink-0 rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 hover:-translate-y-[1px]"
                      style={{
                        background: isGoing ? '#e2f0d9' : ACCENT,
                        color: isGoing ? '#16a34a' : INK,
                        border: isGoing ? '1px solid #c2e0b1' : '1px solid transparent',
                      }}
                    >
                      {isGoing ? tr('Going', 'যাচ্ছি') : tr('Join', 'যোগ দিন')}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Admin Messages (1/3) */}
        <div
          className="rounded-2xl p-5 flex flex-col border bg-white card-lift"
          style={{ borderColor: RULE, boxShadow: '0 2px 10px rgba(0,2,1,0.03)' }}
        >
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
              FROM ADMIN · {tr('Admin', 'অ্যাডমিন')}
            </p>
            <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
              {tr('Your Messages', 'তোমার জন্য বার্তা')}
            </h3>
          </div>

          {data.adminMsgs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <p className="text-[12px] text-center" style={{ color: MUTED }}>
                {tr('No messages from admin yet', 'এখনো কোনো বার্তা নেই')}
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-4">
              {data.adminMsgs.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <SenderAvatar name={msg.sender_name} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[12px] font-extrabold truncate" style={{ color: INK }}>{msg.sender_name}</span>
                      <span className="text-[10px] opacity-75 shrink-0" style={{ color: MUTED }}>{fmt.date(msg.created_at)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed line-clamp-2" style={{ color: MUTED }}>{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Link
            to="/member/messages"
            className="mt-4 block text-center text-[11px] font-bold uppercase tracking-[0.1em] hover:underline border-t pt-3"
            style={{ color: BRAND, borderColor: RULE }}
          >
            {tr('See all messages →', 'সব বার্তা দেখুন →')}
          </Link>
        </div>
      </div>

      {/* ── Ledger + Impact Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Ledger */}
        <div
          className="rounded-2xl p-5 border bg-white card-lift"
          style={{ borderColor: RULE, boxShadow: '0 2px 10px rgba(0,2,1,0.03)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
                YOUR LEDGER · {tr('Ledger', 'অবদান পাতা')}
              </p>
              <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
                {tr('Your Contributions', 'তোমার অবদান')}
              </h3>
            </div>
            <Link to="/member/contributions" className="text-[11px] font-bold uppercase tracking-[0.1em] hover:underline" style={{ color: BRAND }}>
              {tr('History →', 'ইতিহাস →')}
            </Link>
          </div>

          <div className="space-y-3.5 mb-5 border-b pb-4" style={{ borderColor: RULE }}>
            {ledgerItems.length === 0 ? (
              <p className="text-[12px] py-4 text-center" style={{ color: MUTED }}>
                {tr('No activity yet', 'এখনো কোনো কার্যক্রম নেই')}
              </p>
            ) : ledgerItems.map((item, i) => (
              <div 
                key={i} 
                className="flex items-center gap-3 hover:bg-[#fdf8eb] transition-colors duration-150 p-1.5 rounded-lg cursor-pointer"
              >
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: item.type === 'dues' ? 'rgba(12,117,111,0.08)' : 'rgba(22,163,74,0.08)',
                  color: item.type === 'dues' ? BRAND : '#16a34a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                }}>
                  {item.type === 'dues' ? <IndianRupee className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" strokeWidth={2.5} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-extrabold truncate" style={{ color: INK }}>{item.label}</p>
                  {item.sub && <p className="text-[10px] opacity-75 truncate" style={{ color: MUTED }}>{item.sub}</p>}
                </div>
                <div className="text-right shrink-0">
                  {item.amount ? (
                    <p className="text-xs font-extrabold" style={{ color: BRAND }}>₹{fmt.num(item.amount)}</p>
                  ) : null}
                  <p className="text-[9.5px] font-semibold" style={{ color: MUTED }}>{fmt.date(item.date)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-around pt-2">
            <div className="text-center">
              <p className="text-xl font-black leading-none" style={{ color: INK }}>{fmt.num(data.volunteerCount)}</p>
              <p className="text-[9.5px] uppercase tracking-[0.1em] font-bold mt-1" style={{ color: MUTED }}>{tr('Volunteer', 'স্বেচ্ছাসেবক')}</p>
            </div>
            <div style={{ width: 1, height: 32, background: RULE }} />
            <div className="text-center">
              <p className="text-xl font-black leading-none" style={{ color: BRAND }}>₹{fmt.num(data.donations)}</p>
              <p className="text-[9.5px] uppercase tracking-[0.1em] font-bold mt-1" style={{ color: MUTED }}>{tr('Donated', 'দান')}</p>
            </div>
            <div style={{ width: 1, height: 32, background: RULE }} />
            <div className="text-center">
              <p className="text-xl font-black leading-none" style={{ color: INK }}>{fmt.num(data.posts)}</p>
              <p className="text-[9.5px] uppercase tracking-[0.1em] font-bold mt-1" style={{ color: MUTED }}>{tr('Posts', 'পোস্ট')}</p>
            </div>
          </div>
        </div>

        {/* Impact */}
        <div
          className="rounded-2xl p-5 border bg-white card-lift"
          style={{ borderColor: RULE, boxShadow: '0 2px 10px rgba(0,2,1,0.03)' }}
        >
          <div className="mb-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: BRAND }}>
              YOUR IMPACT · {tr('Impact', 'প্রভাব')}
            </p>
            <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
              {tr('What you changed', 'যা তুমি বদলে দিয়েছ')}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { icon: Droplet, value: data.volunteerCount, label: tr('Blood donations', 'রক্তদান শিবিরের অংশীদার'), color: '#ef4444', bg: '#fef2f2' },
              { icon: Calendar, value: paidCount, label: tr('Months contribution', 'মাসিক চাঁদা পরিশোধিত'), color: '#16a34a', bg: '#f0fdf4' },
              { icon: Award, value: data.attendedIds.size, label: tr('Programs joined', 'কর্মসূচিতে সরাসরি অংশগ্রহণ'), color: '#2563eb', bg: '#eff6ff' },
              { icon: Sparkles, value: Math.round(data.donations / 100) || 0, label: tr('Lives impacted (est.)', 'মানুষের মুখে হাসি ফুটিয়েছেন'), color: '#eab308', bg: '#fefbeb' },
            ].map((item, i) => (
              <div key={i} className="rounded-xl p-3 text-center border shadow-xs" style={{ background: '#faf9f6', borderColor: RULE }}>
                <div className="flex justify-center mb-1">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg shadow-xs" style={{ background: item.bg, color: item.color }}>
                    <item.icon className="h-4.5 w-4.5" />
                  </span>
                </div>
                <div className="text-xl font-black mt-1" style={{ color: INK }}>
                  {lang === 'bn' ? toBengaliDigits(item.value) : item.value}
                </div>
                <p className="text-[10px] leading-tight font-bold opacity-75 mt-0.5" style={{ color: MUTED }}>{item.label}</p>
              </div>
            ))}
          </div>

          {/* Quote */}
          <div className="rounded-xl p-3 border" style={{ background: '#faf9f6', borderColor: RULE }}>
            <p className="text-[11.5px] italic leading-relaxed" style={{ color: MUTED }}>
              &ldquo;{tr(
                'Your every contribution strengthens the foundation of Chatrodol. Every step, every moment carries weight.',
                'তোমার মেধা সমাজরক্ষায় ছাত্রদলের প্রতিটি পদক্ষেপ। প্রতিটি মুহূর্ত, প্রতিটি কাজ গণ্য হয়।'
              )}&rdquo;
            </p>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.1em]" style={{ color: BRAND }}>
              — {tr('Governing Board, Chatrodol Trust', 'পরিচালনা পর্ষদ, ছাত্রদল ট্রাস্ট')}
            </p>
          </div>
        </div>
      </div>

      {/* ── Blood Donor Directory Card ────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 border bg-white card-lift"
        style={{ borderColor: RULE, boxShadow: '0 2px 10px rgba(0,2,1,0.03)' }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
              style={{ background: 'rgba(185,28,28,0.08)' }}
            >
              <Droplet className="h-5 w-5 fill-red-600 text-red-600" />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: '#b91c1c' }}>
                BLOOD DONORS · {tr('Directory', 'পরিচিতি')}
              </p>
              <h3 className="mt-0.5 text-[18px] font-bold" style={{ ...SERIF, color: INK }}>
                {tr('Blood Donor Registry', 'রক্তদাতা পঞ্জিকা')}
              </h3>
              <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
                {tr('Find members who have donated blood at our camps. Browse by blood group.', 'আমাদের শিবিরে রক্তদানকারী সদস্যদের খুঁজুন। রক্তের গ্রুপ অনুযায়ী ব্রাউজ করুন।')}
              </p>
            </div>
          </div>
          <Link
            to="/member/blood-donors"
            className="shrink-0 rounded-full px-5 py-2.5 text-[12px] font-extrabold uppercase tracking-[0.12em] transition-all hover:-translate-y-[1px] shadow-sm"
            style={{ background: '#b91c1c', color: '#fff' }}
          >
            {tr('View Donors →', 'দাতা দেখুন →')}
          </Link>
        </div>
      </div>
    </div>
  );
}
