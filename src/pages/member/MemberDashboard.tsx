import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';
import { memberDisplayId } from '@/types';

const BRAND  = '#c2410c';
const INK    = '#1c1917';
const MUTED  = '#78716c';
const RULE   = '#e7e5e4';
const SERIF  = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };

function MemberAvatar({ avatarUrl, name, size = 72 }: { avatarUrl: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${BRAND}` }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: BRAND, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.34, fontWeight: 700, border: `3px solid ${BRAND}`,
      fontFamily: '"Noto Serif Bengali", serif',
    }}>
      {initials}
    </div>
  );
}

interface Stats {
  attendance: number;
  totalEvents: number;
  posts: number;
  donated: number;
  unpaidMonths: number;
  paidMonths: number;
}

export default function MemberDashboard() {
  const { member, canManagePosts } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const [stats, setStats] = useState<Stats>({ attendance: 0, totalEvents: 0, posts: 0, donated: 0, unpaidMonths: 0, paidMonths: 0 });

  useEffect(() => {
    if (!member) return;
    (async () => {
      const year = new Date().getFullYear();
      const [att, evts, posts, don, unpaid, paid] = await Promise.all([
        supabase.from('cswo_attendance').select('id', { count: 'exact', head: true }).eq('member_id', member.id),
        supabase.from('cswo_events').select('id', { count: 'exact', head: true }),
        supabase.from('cswo_posts').select('id', { count: 'exact', head: true }).eq('author_id', member.id),
        supabase.from('cswo_donations').select('amount').eq('member_id', member.id).eq('status', 'paid'),
        supabase.from('cswo_monthly_contributions').select('id', { count: 'exact', head: true }).eq('member_id', member.id).eq('year', year).eq('status', 'unpaid'),
        supabase.from('cswo_monthly_contributions').select('id', { count: 'exact', head: true }).eq('member_id', member.id).eq('year', year).eq('status', 'paid'),
      ]);
      const donated = (don.data ?? []).reduce((sum, d) => sum + Number(d.amount), 0);
      setStats({
        attendance: att.count ?? 0,
        totalEvents: evts.count ?? 0,
        posts: posts.count ?? 0,
        donated,
        unpaidMonths: unpaid.count ?? 0,
        paidMonths: paid.count ?? 0,
      });
    })();
  }, [member]);

  if (!member) return null;

  const memberId = memberDisplayId(member);

  const elapsedMonths = new Date().getMonth() + 1;
  const attendancePct = stats.totalEvents > 0 ? Math.round((stats.attendance / stats.totalEvents) * 100) : null;
  const compliancePct = elapsedMonths > 0 ? Math.round((stats.paidMonths / elapsedMonths) * 100) : null;

  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  return (
    <div>
      {/* Profile card */}
      <div
        className="mb-8 flex flex-col items-start gap-5 rounded-xl p-6 sm:flex-row sm:items-center"
        style={{ background: '#fff', border: `1px solid ${RULE}`, boxShadow: '0 2px 16px rgba(28,25,23,0.07)' }}
      >
        <MemberAvatar avatarUrl={member.avatar_url} name={member.full_name} size={72} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-[22px] font-bold" style={{ ...SERIF, color: INK }}>{member.full_name}</h1>
            <span className="rounded-full px-3 py-0.5 font-mono text-[11px] uppercase tracking-[0.18em]" style={{ background: 'rgba(194,65,12,0.08)', color: BRAND }}>
              {memberId}
            </span>
          </div>
          <p className="mt-1 text-[13px]" style={{ color: MUTED }}>{member.designation || (lang === 'bn' ? 'সদস্য' : 'Member')} · {member.email}</p>
          {member.blood_group && (
            <span className="mt-1 inline-block rounded-full px-2.5 py-0.5 font-mono text-[11px]" style={{ background: 'rgba(220,38,38,0.08)', color: '#dc2626' }}>
              ✦ {member.blood_group}
            </span>
          )}
        </div>
        <Link
          to="/member/profile"
          className="shrink-0 rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors hover:opacity-80"
          style={{ background: INK, color: '#faf6ef' }}
        >
          {lang === 'bn' ? 'প্রোফাইল সম্পাদনা' : 'Edit profile'}
        </Link>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label={t('m.stat.attendance')} value={fmt.num(stats.attendance)} accent="blue" />
        {canManagePosts && (
          <StatCard label={t('m.stat.posts')} value={fmt.num(stats.posts)} accent="green" />
        )}
        <StatCard label={t('m.stat.donated')} value={fmt.money(stats.donated)} accent="amber" />
        <StatCard
          label={`${fmt.num(new Date().getFullYear())} · ${t('m.stat.due')}`}
          value={fmt.num(stats.unpaidMonths)}
          accent={stats.unpaidMonths > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Engagement metrics strip */}
      {(attendancePct !== null || compliancePct !== null) && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {attendancePct !== null && (
            <div className="rounded-xl p-4" style={{ background: '#fff', border: `1px solid ${RULE}` }}>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span style={{ color: MUTED }}>{tr('Attendance rate', 'উপস্থিতির হার')}</span>
                <span className="font-semibold" style={{ color: INK }}>{attendancePct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: RULE }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${attendancePct}%`, background: attendancePct >= 70 ? '#16a34a' : attendancePct >= 40 ? '#d97706' : '#dc2626' }}
                />
              </div>
              <p className="mt-1.5 text-[11px]" style={{ color: MUTED }}>
                {stats.attendance} / {stats.totalEvents} {tr('events', 'অনুষ্ঠান')}
              </p>
            </div>
          )}
          {compliancePct !== null && (
            <div className="rounded-xl p-4" style={{ background: '#fff', border: `1px solid ${RULE}` }}>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span style={{ color: MUTED }}>{tr('Dues compliance', 'চাঁদা পরিশোধের হার')} {new Date().getFullYear()}</span>
                <span className="font-semibold" style={{ color: INK }}>{compliancePct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full" style={{ background: RULE }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${compliancePct}%`, background: compliancePct >= 80 ? '#16a34a' : compliancePct >= 50 ? '#d97706' : '#dc2626' }}
                />
              </div>
              <p className="mt-1.5 text-[11px]" style={{ color: MUTED }}>
                {stats.paidMonths} / {elapsedMonths} {tr('months paid', 'মাস পরিশোধিত')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {canManagePosts && (
          <QuickLink
            to="/member/posts"
            title={lang === 'en' ? 'Write a post' : 'নতুন পোস্ট লিখুন'}
            desc={lang === 'en' ? 'Share your work; published after admin approval.' : 'আপনার কাজ শেয়ার করুন — অ্যাডমিন অনুমোদনের পর প্রকাশিত।'}
            emoji="✍️"
          />
        )}
        <QuickLink
          to="/member/contributions"
          title={lang === 'en' ? 'Pay monthly dues' : 'মাসিক অনুদান দিন'}
          desc={lang === 'en' ? 'See which months are due and pay online.' : 'কোন মাসের চাঁদা বাকি দেখুন ও অনলাইনে পরিশোধ করুন।'}
          emoji="💳"
          highlight={stats.unpaidMonths > 0}
        />
        <QuickLink
          to="/member/attendance"
          title={lang === 'en' ? 'My attendance' : 'আমার উপস্থিতি'}
          desc={lang === 'en' ? 'View events and camps you attended.' : 'আপনি কোন অনুষ্ঠানে অংশ নিয়েছেন দেখুন।'}
          emoji="📅"
        />
        <QuickLink
          to="/member/directory"
          title={lang === 'en' ? 'Member directory' : 'সদস্য তালিকা'}
          desc={lang === 'en' ? 'Browse approved members and their skills.' : 'অনুমোদিত সদস্যদের প্রোফাইল ও দক্ষতা দেখুন।'}
          emoji="👥"
        />
      </div>
    </div>
  );
}

function QuickLink({ to, title, desc, emoji, highlight }: { to: string; title: string; desc: string; emoji: string; highlight?: boolean }) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 rounded-xl p-5 transition-all hover:-translate-y-[2px] hover:shadow-md"
      style={{
        background: highlight ? 'rgba(194,65,12,0.06)' : '#fff',
        border: `1px solid ${highlight ? 'rgba(194,65,12,0.25)' : RULE}`,
        boxShadow: '0 1px 6px rgba(28,25,23,0.05)',
      }}
    >
      <span className="text-[24px]">{emoji}</span>
      <div>
        <h3 className="text-[15px] font-semibold" style={{ color: highlight ? BRAND : INK }}>{title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed" style={{ color: MUTED }}>{desc}</p>
      </div>
    </Link>
  );
}
