import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  CalendarDays,
  Heart,
  Coins,
  Mail,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Plus,
  Check,
  X,
  UserCheck,
  CalendarPlus,
  HandCoins,
  Send,
  Inbox
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import { useFmt } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Sparkline, BarLineChart, Donut } from '@/components/ui/charts';
import { useAdminDashboard, type Activity, type QueueItem } from './useAdminDashboard';
import { AdminGatewaySwitch } from '@/components/payment/GatewaySelector';


const INK = '#000201'; // Charcoal black
const INK2 = '#4a4c4b'; // Charcoal grey
const MUTED = '#7a7c7b'; // Charcoal muted
const RULE = '#e5dec9'; // Warm border
const BRAND = '#0c756f'; // Deep Teal
const ACCENT = '#fdcf6f'; // Warm Gold
const GREEN = '#16a34a'; // Success Green
const PAPER = '#ffffff'; // Pure white

type IconType = ComponentType<SVGProps<SVGSVGElement>> | any;

const WEEKDAYS = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
};

// Presentational Card with modern rounded corners and shadow
function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div 
      className={`rounded-2xl border card-lift ${className}`} 
      style={{ background: PAPER, borderColor: RULE, boxShadow: '0 4px 14px rgba(0,2,1,0.03)' }}
    >
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="font-mono text-[9px] font-extrabold uppercase tracking-widest" style={{ color: MUTED }}>{children}</div>;
}

function StatCard({ icon: Icon, eyebrow, value, suffix, delta, spark, color }: {
  icon: IconType; eyebrow: string; value: string; suffix?: string; delta: ReactNode; spark: number[]; color: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <Eyebrow>{eyebrow}</Eyebrow>
        <span className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: 'rgba(12,117,111,0.08)' }}>
          <Icon className="h-4.5 w-4.5" style={{ color: BRAND }} />
        </span>
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        <span className="text-3xl font-black leading-none tracking-tight" style={{ color: INK }}>{value}</span>
        {suffix && <span className="mb-0.5 text-xs font-bold" style={{ color: MUTED }}>{suffix}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {delta}
      </div>
      <div className="mt-3.5">
        <Sparkline data={spark} color={color} className="h-8 w-full" />
      </div>
    </Card>
  );
}

function DeltaChip({ value, positive }: { value: string; positive: boolean }) {
  const c = positive ? GREEN : MUTED;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span 
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-extrabold tracking-wider" 
      style={{ background: positive ? 'rgba(22,163,74,0.08)' : 'rgba(122,124,123,0.08)', color: c }}
    >
      <Icon className="h-3 w-3" /> {value}
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
    event: '#0c756f', donation: BRAND, post: '#3b82f6', attendance: GREEN, contribution: '#eab308', volunteer: '#8b5cf6',
  };
  const actText = (a: Activity): { main: string; sub: string } => {
    const who = a.name || tr('Someone', 'কেউ একজন');
    switch (a.kind) {
      case 'event': return { main: tr(`${who} created a new event`, `${who} নতুন ইভেন্ট তৈরি করেছেন`), sub: a.extra };
      case 'donation': return { main: tr(`${who} donated ₹${num(a.extra)}`, `${who} ₹${num(a.extra)} অনুদান দিয়েছেন`), sub: '' };
      case 'post': return { main: tr(`${who} published a post`, `${who} পোস্ট প্রকাশ করেছেন`), sub: a.extra };
      case 'attendance': return { main: tr(`${who} added attendance`, `${who} উপস্থিতি যোগ করেছেন`), sub: a.extra };
      case 'contribution': return { main: tr(`${who} paid monthly dues ₹${num(a.extra)}`, `${who} মাসিক চাঁদা ₹${num(a.extra)} দিয়েছেন`), sub: '' };
      case 'volunteer': return { main: tr(`${who} applied to volunteer`, `${who} স্বেচ্ছাসেবী হতে আবেদন করেছেন`), sub: '' };
    }
  };

  if (d.error) {
    return (
      <div className="rounded-2xl border p-8 text-center max-w-xl mx-auto mt-12 space-y-5 animate-fade-in" style={{ background: PAPER, borderColor: RULE }}>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl mx-auto" style={{ background: 'rgba(220,38,38,0.08)' }}>
          <X className="h-6 w-6 text-red-600" />
        </span>
        <h2 className="text-xl font-bold" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
          {tr('Database connection issue', 'ডাটাবেস সংযোগ সমস্যা')}
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: INK2 }}>
          {tr(
            'We encountered a problem loading dashboard metrics. Please check your internet connection or try again.',
            'ড্যাশবোর্ড লোড করতে সমস্যা হয়েছে। দয়া করে ইন্টারনেট সংযোগ পরীক্ষা করুন অথবা পুনরায় চেষ্টা করুন।'
          )}
        </p>
        <div className="text-[11px] font-mono p-3 rounded-lg bg-red-50 text-red-700 border border-red-100/50 overflow-x-auto text-left max-h-36">
          {d.error}
        </div>
        <button
          onClick={() => d.refresh()}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 shadow-sm"
          style={{ background: BRAND }}
        >
          {tr('Retry Loading', 'পুনরায় চেষ্টা করুন')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
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
          <span className="rounded-full px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.16em] border" style={{ borderColor: RULE, color: INK2 }}>
            {fmt.months()[clock.getMonth()]}
          </span>
          <Link to="/admin/posts" className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: BRAND }}>
            <Plus className="h-3.5 w-3.5" /> {tr('New post', 'নতুন পোস্ট')}
          </Link>
        </div>
      </div>

      {/* ───────── Stat cards ───────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Users} eyebrow={tr('Members · Total', 'সদস্য · মোট')} value={num(d.membersTotal)}
          spark={d.membersSpark} color={BRAND}
          delta={<><span className="text-[11px] font-semibold" style={{ color: MUTED }}>{tr('Total registered', 'মোট নিবন্ধিত')}</span><DeltaChip value={`+${num(d.membersDelta)}/${tr('mo', 'মাস')}`} positive={d.membersDelta > 0} /></>}
        />
        <StatCard
          icon={FileText} eyebrow={tr('Posts · Published', 'পোস্ট · প্রকাশিত')} value={num(d.postsPublished)}
          spark={d.postsSpark} color="#3b82f6"
          delta={<><span className="text-[11px] font-semibold" style={{ color: MUTED }}>{tr('Published feeds', 'প্রকাশিত পোস্ট')}</span><DeltaChip value={`+${num(d.postsDelta)}/${tr('mo', 'মাস')}`} positive={d.postsDelta > 0} /></>}
        />
        <StatCard
          icon={CalendarDays} eyebrow={tr('Events · This year', 'ইভেন্ট · এই বছর')} value={num(d.eventsYear)}
          spark={d.eventsSpark} color={GREEN}
          delta={<><span className="text-[11px] font-semibold" style={{ color: MUTED }}>{tr('Active camps & meets', 'অনুষ্ঠান ও শিবির')}</span><DeltaChip value={`${d.eventsDelta >= 0 ? '+' : ''}${num(d.eventsDelta)} ${tr('vs LY', 'গত বছর')}`} positive={d.eventsDelta >= 0} /></>}
        />
        <StatCard
          icon={Heart} eyebrow={tr('Donations · YTD', 'অনুদান · এই বছর')} value={moneyShort(d.donationsYtd)}
          spark={d.donationsSpark} color={BRAND}
          delta={<><span className="text-[11px] font-semibold" style={{ color: MUTED }}>{tr('Raised YTD', 'এ বছরের সংগ্রহ')}</span>{d.donationsDeltaPct != null ? <DeltaChip value={`${d.donationsDeltaPct >= 0 ? '+' : ''}${num(d.donationsDeltaPct)}%`} positive={d.donationsDeltaPct >= 0} /> : <span className="font-mono text-[9px] font-extrabold" style={{ color: MUTED }}>{tr('new', 'নতুন')}</span>}</>}
        />
      </div>

      {/* ───────── Quick stats ───────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <QuickCard to="/admin/members" icon={Users} value={num(d.pendingMembers)} label={tr('Member applications · pending', 'সদস্য আবেদন · অপেক্ষমাণ')} />
        <QuickCard to="/admin/contributions" icon={Coins} value={num(d.duesDue)} label={tr('Monthly dues · outstanding', 'মাসিক চাঁদা · বকেয়া')} />
        <QuickCard to="/admin/messages" icon={Mail} value={num(d.messages)} label={tr('Messages & enquiries', 'অপঠিত বার্তা ও আবেদন')} />
        <QuickCard to="/admin/messages" icon={Heart} value={num(d.volunteers)} label={tr('Volunteer applications', 'স্বেচ্ছাসেবী আবেদন')} />
      </div>

      {/* ───────── Chart + Queue ───────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Eyebrow>{tr(`Last ${range} weeks`, `গত ${num(range)} সপ্তাহ`)}</Eyebrow>
              <h3 className="text-[18px] font-black tracking-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Donations & Member Growth', 'অনুদান ও সদস্যবৃদ্ধি বিবরণ')}</h3>
            </div>
            <div className="flex items-center gap-3">
              <Legend color={BRAND} label={tr('Donations (₹)', 'অনুদান (₹)')} />
              <Legend color={GREEN} label={tr('Members', 'সদস্য')} />
              <div className="flex overflow-hidden rounded-full border" style={{ borderColor: RULE }}>
                {[4, 8, 12].map((r) => (
                  <button key={r} onClick={() => setRange(r)} className="px-3 py-1 font-mono text-[10px] font-bold transition-colors" style={{ background: range === r ? BRAND : 'transparent', color: range === r ? '#fff' : MUTED }}>
                    {num(r)}W
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <BarLineChart bars={weeklyBars} line={weeklyLine} barColor={BRAND} lineColor={GREEN} className="h-52 w-full" />
            <div className="mt-2 flex justify-between font-mono text-[9px]" style={{ color: MUTED }}>
              {weeklyBars.map((_, i) => <span key={i}>W{num(startWeek + i + 1)}</span>)}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 border-t pt-4" style={{ borderColor: RULE }}>
            <Summary eyebrow={tr(`Best week · W${d.bestWeek.index + 1}`, `সেরা সপ্তাহ · W${num(d.bestWeek.index + 1)}`)} value={moneyShort(d.bestWeek.value)} />
            <Summary eyebrow={tr('Avg · weekly', 'গড় · সাপ্তাহিক')} value={moneyShort(d.avgWeekly)} />
            <Summary eyebrow={tr('New members', 'নতুন সদস্য')} value={num(d.newMembers)} />
          </div>
        </Card>

        {/* Queue List */}
        <Card className="flex flex-col p-6">
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: RULE }}>
            <div>
              <Eyebrow>{tr('QUEUE', 'অপেক্ষমাণ কাতার')}</Eyebrow>
              <h3 className="text-[17px] font-black tracking-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Awaiting Approval', 'অনুমোদনের অপেক্ষায়')}</h3>
            </div>
            <span className="text-2xl font-black" style={{ color: BRAND }}>{num(queue.length)}</span>
          </div>

          <div className="mt-4 flex-1 space-y-3">
            {queue.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center py-8 text-center text-xs font-semibold" style={{ color: MUTED }}>
                <Inbox className="h-8 w-8 opacity-35 mb-2" />
                {tr('Nothing pending. All clear!', 'সব কাজ সম্পন্ন। অপেক্ষমাণ কিছু নেই।')}
              </div>
            ) : (
              queue.slice(0, 4).map((q) => (
                <div key={q.id} className="flex items-center gap-3 rounded-2xl border p-3" style={{ background: '#faf9f6', borderColor: RULE }}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-[10px] font-extrabold text-white" style={{ background: q.kind === 'member' ? BRAND : '#3b82f6' }}>
                    {initials(q.title)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-extrabold" style={{ color: INK }}>{q.title}</div>
                    <div className="truncate font-mono text-[9px] uppercase tracking-wider mt-0.5" style={{ color: MUTED }}>
                      {q.kind === 'member' ? tr('Member', 'সদস্য') : tr('Post', 'পোস্ট')} · {ago(q.at)}
                    </div>
                  </div>
                  <button 
                    onClick={() => approve(q)} 
                    className="flex h-7 items-center gap-1 rounded-full px-3 text-[10.5px] font-bold text-white transition-opacity hover:opacity-90 shadow-sm" 
                    style={{ background: GREEN }}
                  >
                    <Check className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                  <button 
                    onClick={() => skip(q.id)} 
                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                </div>
              ))
            )}
          </div>

          <Link to="/admin/members" className="mt-4 flex items-center justify-center gap-1.5 border-t pt-3 text-xs font-bold transition-opacity hover:opacity-80" style={{ borderColor: RULE, color: BRAND }}>
            {tr('View Full Queue', 'সব অনুমোদন দেখুন')} <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </Link>
        </Card>
      </div>

      {/* ───────── Activity + Program mix ───────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: RULE }}>
            <div>
              <Eyebrow>{tr('LIVE TRACKER', 'লাইভ ট্র্যাকার')}</Eyebrow>
              <h3 className="text-[17px] font-black tracking-tight" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>{tr('Recent Activity Feed', 'সাম্প্রতিক কার্যকলাপ')}</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-widest" style={{ background: 'rgba(22,163,74,0.08)', color: GREEN }}>
              <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: GREEN }} /> {tr('Live', 'লাইভ')}
            </span>
          </div>

          <div className="space-y-3.5">
            {d.activity.length === 0 ? (
              <div className="py-8 text-center text-xs font-semibold" style={{ color: MUTED }}>{tr('No recent activity yet.', 'এখনো কোনো সাম্প্রতিক কার্যকলাপ নেই।')}</div>
            ) : (
              d.activity.map((a) => {
                const tx = actText(a);
                return (
                  <div key={a.id} className="flex gap-3">
                    <span 
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[9.5px] font-extrabold text-white" 
                      style={{ background: ACT_COLOR[a.kind] || BRAND }}
                    >
                      {initials(a.name || '•')}
                    </span>
                    <div className="min-w-0 flex-1 border-b pb-3" style={{ borderColor: RULE }}>
                      <div className="text-[13px] font-semibold" style={{ color: INK }}>{tx.main}</div>
                      {tx.sub && <div className="truncate text-xs opacity-75 mt-0.5" style={{ color: INK2 }}>{tx.sub}</div>}
                      <div className="mt-1 font-mono text-[9.5px]" style={{ color: MUTED }}>{ago(a.at)}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Program Mix Donut */}
        <Card className="p-6">
          <Eyebrow>{tr('METRIC MIX', 'মেট্রিক মিক্স')}</Eyebrow>
          <h3 className="text-[17px] font-black tracking-tight pb-3 border-b mb-4" style={{ color: INK, borderColor: RULE, fontFamily: '"Noto Serif Bengali", serif' }}>
            {d.mix.mode === 'donations' ? tr('Donations by Purpose', 'উদ্দেশ্য অনুযায়ী অনুদান') : tr('Posts by Category', 'বিভাগ অনুযায়ী পোস্ট')}
          </h3>

          <div className="flex flex-col items-center gap-5">
            {d.mix.total === 0 ? (
              <div className="py-10 text-center text-xs font-semibold" style={{ color: MUTED }}>{tr('No data recorded.', 'এখনো কোনো তথ্য নেই।')}</div>
            ) : (
              <>
                <Donut
                  segments={d.mix.segments.map((s) => ({ value: s.value, color: s.color }))}
                  centerTop={num(d.mix.total)}
                  centerSub={tr('Total', 'মোট')}
                />
                <div className="w-full space-y-2.5">
                  {d.mix.segments.map((s) => (
                    <div key={s.key} className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-xs" style={{ background: s.color }} />
                      <span className="flex-1 truncate text-xs font-semibold" style={{ color: INK2 }}>{s.key}</span>
                      <span className="font-mono text-xs font-extrabold" style={{ color: INK }}>{d.mix.mode === 'donations' ? moneyShort(s.value) : num(s.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* ───────── Gateway Control & Shortcuts ───────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Eyebrow>{tr('PAYMENT GATEWAY CONFIG', 'পেমেন্ট গেটওয়ে কনফিগ')}</Eyebrow>
          <div className="mt-3.5">
            <AdminGatewaySwitch />
          </div>
        </div>
        <div className="lg:col-span-8">
          <Eyebrow>{tr('SHORTCUTS', 'দ্রুত গতিপথ')}</Eyebrow>
          <div className="mt-3.5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Shortcut to="/admin/members" icon={UserCheck} title={tr('Approve Members', 'সদস্য অনুমোদন')} sub={d.pendingMembers ? tr(`${d.pendingMembers} applicants`, `${num(d.pendingMembers)} জন আবেদনকারী`) : tr('All clear', 'সব পরিষ্কার')} />
            <Shortcut to="/admin/posts" icon={Send} title={tr('Review Posts', 'পোস্ট পর্যালোচনা')} sub={pendingPosts ? tr(`${pendingPosts} pending`, `${num(pendingPosts)} টি অপেক্ষমাণ`) : tr('No posts pending', 'সব পরিষ্কার')} />
            <Shortcut to="/admin/events" icon={CalendarPlus} title={tr('Create Event', 'নতুন ইভেন্ট')} sub={tr('Camps or programs', 'শিবির বা কর্মসূচি')} />
            <Shortcut to="/admin/donations" icon={HandCoins} title={tr('Log Donation', 'অনুদান লগ')} sub={tr('Record offline payments', 'অফলাইন অনুদান রেকর্ড')} />
          </div>
        </div>
      </div>


      {/* ───────── Footer ───────── */}
      <div 
        className="flex flex-wrap items-center justify-between gap-2 border-t pt-4 font-mono text-[9px] font-extrabold uppercase tracking-widest" 
        style={{ borderColor: RULE, color: MUTED }}
      >
        <span>Chhatradol Trust · Admin Console v2.4 · {tr('Last sync', 'শেষ সিঙ্ক')} {num(pad(hour))}:{num(pad(clock.getMinutes()))}</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} /> 
          {tr('All systems nominal', 'সব ঠিক আছে')}
        </span>
      </div>
    </div>
  );
}

// ───────── presentational sub-components ─────────
function QuickCard({ to, icon: Icon, value, label }: { to: string; icon: IconType; value: string; label: string }) {
  return (
    <Link to={to}>
      <Card className="flex items-center gap-4 p-4 border transition-all duration-200">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: 'rgba(12,117,111,0.08)' }}>
          <Icon className="h-5 w-5" style={{ color: BRAND }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[20px] font-black leading-none" style={{ color: INK }}>{value}</div>
          <div className="mt-1.5 truncate text-[11px] font-bold opacity-75" style={{ color: MUTED }}>{label}</div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" style={{ color: MUTED }} />
      </Card>
    </Link>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold" style={{ color: MUTED }}>
      <span className="h-2 w-2 rounded-xs" style={{ background: color }} /> {label}
    </span>
  );
}

function Summary({ eyebrow, value }: { eyebrow: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] font-extrabold uppercase tracking-wider" style={{ color: MUTED }}>{eyebrow}</div>
      <div className="mt-1 text-[16px] font-black" style={{ color: INK }}>{value}</div>
    </div>
  );
}

function Shortcut({ to, icon: Icon, title, sub }: { to: string; icon: IconType; title: string; sub: string }) {
  return (
    <Link to={to}>
      <Card className="p-5 border transition-all duration-200">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl shadow-xs" style={{ background: ACCENT }}>
            <Icon className="h-4.5 w-4.5" style={{ color: INK }} />
          </span>
          <ArrowRight className="h-4 w-4" style={{ color: MUTED }} />
        </div>
        <div className="mt-3.5 text-xs font-black" style={{ color: INK }}>{title}</div>
        <div className="mt-0.5 text-[11px] font-bold" style={{ color: MUTED }}>{sub}</div>
      </Card>
    </Link>
  );
}
