import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUsers, FaFileLines, FaCalendarDays, FaHeart, FaCoins, FaEnvelope,
  FaArrowRight, FaArrowTrendUp, FaArrowTrendDown, FaPlus, FaCheck, FaXmark,
  FaUserCheck, FaCalendarPlus, FaHandHoldingDollar, FaPaperPlane,
} from 'react-icons/fa6';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import { useFmt } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Sparkline, BarLineChart, Donut } from '@/components/ui/charts';
import { useAdminDashboard, type Activity, type QueueItem } from './useAdminDashboard';

const INK = '#1c1917';
const INK2 = '#44403c';
const MUTED = '#78716c';
const RULE = '#e7e5e4';
const BRAND = '#c2410c';
const GREEN = '#4d7c0f';
const PAPER = '#ffffff';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const WEEKDAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
};

// ───────── small presentational helpers (no hooks) ─────────
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[8px] ${className}`} style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 1px 3px rgba(28,25,23,0.04)' }}>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{children}</div>;
}

function StatCard({ icon: Icon, eyebrow, value, suffix, delta, spark, color }: {
  icon: IconType; eyebrow: string; value: string; suffix?: string; delta: ReactNode; spark: number[]; color: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <Eyebrow>{eyebrow}</Eyebrow>
        <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: 'rgba(194,65,12,0.08)' }}>
          <Icon className="h-3.5 w-3.5" style={{ color: BRAND }} />
        </span>
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        <span className="text-[34px] font-bold leading-none" style={{ color: INK }}>{value}</span>
        {suffix && <span className="mb-1 text-[13px] font-medium" style={{ color: MUTED }}>{suffix}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {delta}
      </div>
      <div className="mt-3">
        <Sparkline data={spark} color={color} className="h-8 w-full" />
      </div>
    </Card>
  );
}

function DeltaChip({ value, positive }: { value: string; positive: boolean }) {
  const c = positive ? GREEN : MUTED;
  const Icon = positive ? FaArrowTrendUp : FaArrowTrendDown;
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold" style={{ background: positive ? 'rgba(77,124,15,0.1)' : 'rgba(120,113,108,0.1)', color: c }}>
      <Icon className="h-2.5 w-2.5" /> {value}
    </span>
  );
}

export default function AdminDashboard() {
  const { member } = useAuth();
  const { lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const num = (v: string | number) => fmt.num(v);
  const d = useAdminDashboard();

  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [range, setRange] = useState(12);
  const [nowTs, setNowTs] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const clock = new Date(nowTs);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hour = clock.getHours();
  const greeting = hour < 12 ? tr('Good morning', 'শুভ সকাল') : hour < 17 ? tr('Good afternoon', 'শুভ অপরাহ্ণ') : tr('Good evening', 'শুভ সন্ধ্যা');
  const firstName = (member?.full_name ?? '').split(' ')[0] || tr('Admin', 'অ্যাডমিন');
  const dateLine = `${WEEKDAYS[lang][clock.getDay()]} · ${num(clock.getDate())} ${fmt.months()[clock.getMonth()]} ${num(clock.getFullYear())} · ${num(pad(hour))}:${num(pad(clock.getMinutes()))}`;

  const moneyShort = (n: number) => (n >= 100000 ? `₹${num((n / 100000).toFixed(2))} ${tr('Lakh', 'লক্ষ')}` : fmt.money(n));

  const ago = (at: string) => {
    const diff = Date.now() - new Date(at).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return tr('just now', 'এইমাত্র');
    if (m < 60) return `${num(m)} ${tr('min ago', 'মিনিট আগে')}`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${num(h)} ${tr('hr ago', 'ঘণ্টা আগে')}`;
    return `${num(Math.floor(h / 24))} ${tr('d ago', 'দিন আগে')}`;
  };

  const queue = useMemo(() => d.queue.filter((q) => !skipped.has(q.id)), [d.queue, skipped]);
  const pendingPosts = d.queue.filter((q) => q.kind === 'post').length;

  const approve = async (item: QueueItem) => {
    if (item.kind === 'member') await supabase.from('cswo_members').update({ status: 'approved' }).eq('id', item.id);
    else await supabase.from('cswo_posts').update({ status: 'published' }).eq('id', item.id);
    setSkipped((s) => new Set(s).add(item.id));
    d.refresh();
  };
  const skip = (id: string) => setSkipped((s) => new Set(s).add(id));

  const initials = (name: string) => name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '—';

  const weeklyBars = d.donationsWeekly.slice(-range);
  const weeklyLine = d.membersCumulative.slice(-range);
  const startWeek = 12 - range;

  const ACT_COLOR: Record<Activity['kind'], string> = {
    event: '#0f766e', donation: BRAND, post: '#1d4ed8', attendance: GREEN, contribution: '#b45309', volunteer: '#7c3aed',
  };
  const actText = (a: Activity): { main: string; sub: string } => {
    const who = a.name || tr('Someone', 'কেউ একজন');
    switch (a.kind) {
      case 'event': return { main: tr(`${who} created a new event`, `${who} নতুন ইভেন্ট তৈরি করেছেন`), sub: a.extra };
      case 'donation': return { main: tr(`${who} donated ₹${num(a.extra)}`, `${who} ₹${num(a.extra)} অনুদান দিয়েছেন`), sub: '' };
      case 'post': return { main: tr(`${who} published a post`, `${who} পোস্ট প্রকাশ করেছেন`), sub: a.extra };
      case 'attendance': return { main: tr(`${who} added attendance`, `${who} উপস্থিতি যোগ করেছেন`), sub: a.extra };
      case 'contribution': return { main: tr(`${who} paid monthly dues ₹${num(a.extra)}`, `${who} মাসিক চাঁদা ₹${num(a.extra)} দিয়েছেন`), sub: '' };
      case 'volunteer': return { main: tr(`${who} applied to volunteer`, `${who} স্বেচ্ছাসেবী হতে আবেদন করেছেন`), sub: '' };
    }
  };

  return (
    <div className="space-y-6">
      {/* ───────── Greeting ───────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: MUTED }}>{dateLine}</div>
          <h1 className="mt-2 text-[30px] leading-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
            {greeting}, <span style={{ color: BRAND }}>{firstName}</span>
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: INK2 }}>
            {tr(
              `${d.pendingMembers} new applications, ${pendingPosts} posts to review and ${d.messages} messages today.`,
              `আজ ${num(d.pendingMembers)} জন নতুন আবেদন, ${num(pendingPosts)} টি পোস্ট পর্যালোচনার অপেক্ষায় এবং ${num(d.messages)} টি বার্তা রয়েছে।`,
            )}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-full px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em]" style={{ border: `1px solid ${RULE}`, color: INK2 }}>
            {fmt.months()[clock.getMonth()]}
          </span>
          <Link to="/admin/posts" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}>
            <FaPlus className="h-3 w-3" /> {tr('New post', 'নতুন পোস্ট')}
          </Link>
        </div>
      </div>

      {/* ───────── Stat cards ───────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={FaUsers} eyebrow={tr('Members · Total', 'সদস্য · মোট')} value={num(d.membersTotal)}
          spark={d.membersSpark} color={BRAND}
          delta={<><span className="text-[12px]" style={{ color: MUTED }}>{tr('Total members', 'মোট সদস্য')}</span><DeltaChip value={`+${num(d.membersDelta)}/${tr('mo', 'মাস')}`} positive={d.membersDelta > 0} /></>}
        />
        <StatCard
          icon={FaFileLines} eyebrow={tr('Posts · Published', 'পোস্ট · প্রকাশিত')} value={num(d.postsPublished)}
          spark={d.postsSpark} color="#1d4ed8"
          delta={<><span className="text-[12px]" style={{ color: MUTED }}>{tr('Published posts', 'প্রকাশিত পোস্ট')}</span><DeltaChip value={`+${num(d.postsDelta)}/${tr('mo', 'মাস')}`} positive={d.postsDelta > 0} /></>}
        />
        <StatCard
          icon={FaCalendarDays} eyebrow={tr('Events · This year', 'ইভেন্ট · এই বছর')} value={num(d.eventsYear)}
          spark={d.eventsSpark} color={GREEN}
          delta={<><span className="text-[12px]" style={{ color: MUTED }}>{tr('Events & camps', 'অনুষ্ঠান ও শিবির')}</span><DeltaChip value={`${d.eventsDelta >= 0 ? '+' : ''}${num(d.eventsDelta)} ${tr('vs LY', 'গত বছর')}`} positive={d.eventsDelta >= 0} /></>}
        />
        <StatCard
          icon={FaHeart} eyebrow={tr('Donations · YTD', 'অনুদান · এই বছর')} value={moneyShort(d.donationsYtd)}
          spark={d.donationsSpark} color={BRAND}
          delta={<><span className="text-[12px]" style={{ color: MUTED }}>{tr('Raised this year', 'এ বছরের সংগ্রহ')}</span>{d.donationsDeltaPct != null ? <DeltaChip value={`${d.donationsDeltaPct >= 0 ? '+' : ''}${num(d.donationsDeltaPct)}%`} positive={d.donationsDeltaPct >= 0} /> : <span className="font-mono text-[10px]" style={{ color: MUTED }}>{tr('new', 'নতুন')}</span>}</>}
        />
      </div>

      {/* ───────── Quick stats ───────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickCard to="/admin/members" icon={FaUsers} value={num(d.pendingMembers)} label={tr('Member applications · pending', 'সদস্য আবেদন · অপেক্ষমাণ')} />
        <QuickCard to="/admin/contributions" icon={FaCoins} value={num(d.duesDue)} label={tr('Monthly dues · outstanding', 'মাসিক চাঁদা · বকেয়া')} />
        <QuickCard to="/admin/messages" icon={FaEnvelope} value={num(d.messages)} label={tr('Messages & enquiries', 'অপঠিত বার্তা ও আবেদন')} />
        <QuickCard to="/admin/messages" icon={FaHeart} value={num(d.volunteers)} label={tr('Volunteer applications', 'স্বেচ্ছাসেবী আবেদন')} />
      </div>

      {/* ───────── Chart + Queue ───────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Eyebrow>{tr(`Last ${range} weeks`, `গত ${num(range)} সপ্তাহ`)}</Eyebrow>
              <h3 className="mt-1.5 text-[19px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Donations & Growth', 'অনুদান ও সদস্যবৃদ্ধি')}</h3>
            </div>
            <div className="flex items-center gap-3">
              <Legend color={BRAND} label={tr('Donations (₹)', 'অনুদান (₹)')} />
              <Legend color={GREEN} label={tr('Members', 'সদস্য')} />
              <div className="flex overflow-hidden rounded-full" style={{ border: `1px solid ${RULE}` }}>
                {[4, 8, 12].map((r) => (
                  <button key={r} onClick={() => setRange(r)} className="px-2.5 py-1 font-mono text-[10px] font-semibold transition-colors" style={{ background: range === r ? BRAND : 'transparent', color: range === r ? '#fff' : MUTED }}>
                    {num(r)}W
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <BarLineChart bars={weeklyBars} line={weeklyLine} barColor={BRAND} lineColor={GREEN} className="h-52 w-full" />
            <div className="mt-1 flex justify-between font-mono text-[9px]" style={{ color: MUTED }}>
              {weeklyBars.map((_, i) => <span key={i}>W{num(startWeek + i + 1)}</span>)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4" style={{ borderColor: RULE }}>
            <Summary eyebrow={tr(`Best week · W${d.bestWeek.index + 1}`, `সেরা সপ্তাহ · W${num(d.bestWeek.index + 1)}`)} value={moneyShort(d.bestWeek.value)} />
            <Summary eyebrow={tr('Avg · weekly', 'গড় · সাপ্তাহিক')} value={moneyShort(d.avgWeekly)} />
            <Summary eyebrow={tr('New members', 'নতুন সদস্য')} value={num(d.newMembers)} />
          </div>
        </Card>

        {/* Queue */}
        <Card className="flex flex-col p-5">
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>{tr('Queue', 'অপেক্ষমাণ')}</Eyebrow>
              <h3 className="mt-1.5 text-[19px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Awaiting approval', 'অনুমোদনের অপেক্ষায়')}</h3>
            </div>
            <span className="text-[28px] font-bold" style={{ color: BRAND }}>{num(queue.length)}</span>
          </div>

          <div className="mt-3 flex-1 space-y-1.5">
            {queue.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-center text-[13px]" style={{ color: MUTED }}>{tr('Nothing pending. ', 'কিছু অপেক্ষমাণ নেই।')}</div>
            ) : (
              queue.slice(0, 4).map((q) => (
                <div key={q.id} className="flex items-center gap-3 rounded-[6px] px-2 py-2" style={{ background: '#faf6ef' }}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold text-white" style={{ background: q.kind === 'member' ? BRAND : '#1d4ed8' }}>{initials(q.title)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold" style={{ color: INK }}>{q.title}</div>
                    <div className="truncate font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: MUTED }}>{q.kind === 'member' ? tr('Member', 'সদস্য') : tr('Post', 'পোস্ট')} · {ago(q.at)}</div>
                  </div>
                  <button onClick={() => approve(q)} className="flex h-7 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: GREEN }}><FaCheck className="h-2.5 w-2.5" />{tr('Approve', 'অনুমোদন')}</button>
                  <button onClick={() => skip(q.id)} className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-black/5" style={{ color: MUTED }}><FaXmark className="h-3 w-3" /></button>
                </div>
              ))
            )}
          </div>

          <Link to="/admin/members" className="mt-3 flex items-center justify-center gap-1.5 border-t pt-3 text-[12px] font-semibold transition-opacity hover:opacity-70" style={{ borderColor: RULE, color: BRAND }}>
            {tr('View full queue', 'সব অনুমোদন দেখুন')} <FaArrowRight className="h-3 w-3" />
          </Link>
        </Card>
      </div>

      {/* ───────── Activity + Program mix ───────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>{tr('Live · Recent', 'সাম্প্রতিক')}</Eyebrow>
              <h3 className="mt-1.5 text-[19px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Activity', 'দলের গতিবিধি')}</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ background: 'rgba(77,124,15,0.1)', color: GREEN }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} /> {tr('Live', 'লাইভ')}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {d.activity.length === 0 ? (
              <div className="py-8 text-center text-[13px]" style={{ color: MUTED }}>{tr('No recent activity yet.', 'এখনো কোনো সাম্প্রতিক কার্যকলাপ নেই।')}</div>
            ) : (
              d.activity.map((a) => {
                const tx = actText(a);
                return (
                  <div key={a.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white" style={{ background: ACT_COLOR[a.kind] }}>{initials(a.name || '•')}</span>
                    <div className="min-w-0 flex-1 border-b pb-3" style={{ borderColor: RULE }}>
                      <div className="text-[13.5px]" style={{ color: INK }}>{tx.main}</div>
                      {tx.sub && <div className="truncate text-[12px]" style={{ color: INK2 }}>{tx.sub}</div>}
                      <div className="mt-0.5 font-mono text-[10px]" style={{ color: MUTED }}>{ago(a.at)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Program mix */}
        <Card className="p-5">
          <Eyebrow>{tr('This year · Program mix', 'এই বছর · কর্মসূচির ভাগ')}</Eyebrow>
          <h3 className="mt-1.5 text-[19px]" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{d.mix.mode === 'donations' ? tr('Donations by purpose', 'উদ্দেশ্য অনুযায়ী অনুদান') : tr('Posts by category', 'বিভাগ অনুযায়ী পোস্ট')}</h3>

          <div className="mt-4 flex flex-col items-center gap-5">
            {d.mix.total === 0 ? (
              <div className="py-10 text-center text-[13px]" style={{ color: MUTED }}>{tr('No data yet.', 'এখনো কোনো তথ্য নেই।')}</div>
            ) : (
              <>
                <Donut
                  segments={d.mix.segments.map((s) => ({ value: s.value, color: s.color }))}
                  centerTop={num(d.mix.mode === 'donations' ? d.mix.total : d.mix.total)}
                  centerSub={tr('Total', 'মোট')}
                />
                <div className="w-full space-y-2">
                  {d.mix.segments.map((s) => (
                    <div key={s.key} className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                      <span className="flex-1 truncate text-[13px]" style={{ color: INK2 }}>{s.key}</span>
                      <span className="font-mono text-[12px] font-semibold" style={{ color: INK }}>{d.mix.mode === 'donations' ? moneyShort(s.value) : num(s.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ───────── Shortcuts ───────── */}
      <div>
        <Eyebrow>{tr('Shortcuts · Get things done', 'দৈনন্দিন কাজ')}</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Shortcut to="/admin/members" icon={FaUserCheck} title={tr('Approve members', 'সদস্য অনুমোদন')} sub={d.pendingMembers ? tr(`${d.pendingMembers} applicants waiting`, `${num(d.pendingMembers)} জন আবেদনকারী অপেক্ষমাণ`) : tr('All clear', 'সব পরিষ্কার')} />
          <Shortcut to="/admin/posts" icon={FaPaperPlane} title={tr('Review posts', 'পোস্ট পর্যালোচনা')} sub={pendingPosts ? tr(`${pendingPosts} pending`, `${num(pendingPosts)} টি অপেক্ষমাণ`) : tr('No posts pending', 'কোনো পোস্ট অপেক্ষমাণ নেই')} />
          <Shortcut to="/admin/events" icon={FaCalendarPlus} title={tr('Create event', 'নতুন ইভেন্ট')} sub={tr('Camp, meeting or outreach', 'শিবির, মিটিং বা বনভোজন')} />
          <Shortcut to="/admin/donations" icon={FaHandHoldingDollar} title={tr('Log donation', 'অনুদান লগ')} sub={tr('Record cash or UPI', 'নগদ বা UPI গ্রহণ')} />
        </div>
      </div>

      {/* ───────── Footer ───────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 font-mono text-[10px] uppercase tracking-[0.16em]" style={{ borderColor: RULE, color: MUTED }}>
        <span>Chhatradol · Admin · v2.4 · {tr('Last sync', 'শেষ সিঙ্ক')} {num(pad(hour))}:{num(pad(clock.getMinutes()))}</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} /> {tr('All systems nominal', 'সব ঠিক আছে')}</span>
      </div>
    </div>
  );
}

// ───────── more presentational helpers ─────────
function QuickCard({ to, icon: Icon, value, label }: { to: string; icon: IconType; value: string; label: string }) {
  return (
    <Link to={to}>
      <Card className="flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(194,65,12,0.08)' }}>
          <Icon className="h-4 w-4" style={{ color: BRAND }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[22px] font-bold leading-none" style={{ color: INK }}>{value}</div>
          <div className="mt-1 truncate text-[12px]" style={{ color: MUTED }}>{label}</div>
        </div>
        <FaArrowRight className="h-3.5 w-3.5" style={{ color: MUTED }} />
      </Card>
    </Link>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]" style={{ color: MUTED }}>
      <span className="h-2 w-2 rounded-sm" style={{ background: color }} /> {label}
    </span>
  );
}

function Summary({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.16em]" style={{ color: MUTED }}>{eyebrow}</div>
      <div className="mt-1 text-[17px] font-bold" style={{ color: INK }}>{value}</div>
    </div>
  );
}

function Shortcut({ to, icon: Icon, title, sub }: { to: string; icon: IconType; title: string; sub: string }) {
  return (
    <Link to={to}>
      <Card className="p-5 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'rgba(194,65,12,0.08)' }}>
            <Icon className="h-4 w-4" style={{ color: BRAND }} />
          </span>
          <FaArrowRight className="h-3.5 w-3.5" style={{ color: MUTED }} />
        </div>
        <div className="mt-3 text-[14px] font-semibold" style={{ color: INK }}>{title}</div>
        <div className="mt-0.5 text-[12px]" style={{ color: MUTED }}>{sub}</div>
      </Card>
    </Link>
  );
}
