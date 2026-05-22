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

export default function MemberDashboard() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const [stats, setStats] = useState({ attendance: 0, posts: 0, donated: 0, unpaidMonths: 0 });

  useEffect(() => {
    if (!member) return;
    (async () => {
      const year = new Date().getFullYear();
      const [att, posts, don, contrib] = await Promise.all([
        supabase.from('cswo_attendance').select('id', { count: 'exact', head: true }).eq('member_id', member.id),
        supabase.from('cswo_posts').select('id', { count: 'exact', head: true }).eq('author_id', member.id),
        supabase.from('cswo_donations').select('amount').eq('member_id', member.id).eq('status', 'paid'),
        supabase.from('cswo_monthly_contributions').select('id', { count: 'exact', head: true }).eq('member_id', member.id).eq('year', year).eq('status', 'unpaid'),
      ]);
      const donated = (don.data ?? []).reduce((sum, d) => sum + Number(d.amount), 0);
      setStats({ attendance: att.count ?? 0, posts: posts.count ?? 0, donated, unpaidMonths: contrib.count ?? 0 });
    })();
  }, [member]);

  if (!member) return null;

  const memberId = memberDisplayId(member);

  return (
    <div>
      {/* Profile card */}
      <div className="mb-8 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5" style={{ background: '#fff', border: `1px solid ${RULE}`, boxShadow: '0 2px 16px rgba(28,25,23,0.07)' }}>
        <MemberAvatar avatarUrl={member.avatar_url} name={member.full_name} size={72} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-bold truncate" style={{ ...SERIF, color: INK }}>{member.full_name}</h1>
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('m.stat.attendance')} value={fmt.num(stats.attendance)} accent="blue" />
        <StatCard label={t('m.stat.posts')} value={fmt.num(stats.posts)} accent="green" />
        <StatCard label={t('m.stat.donated')} value={fmt.money(stats.donated)} accent="amber" />
        <StatCard
          label={`${fmt.num(new Date().getFullYear())} · ${t('m.stat.due')}`}
          value={fmt.num(stats.unpaidMonths)}
          accent={stats.unpaidMonths > 0 ? 'red' : 'green'}
        />
      </div>

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickLink
          to="/member/posts"
          title={lang === 'en' ? 'Write a post' : 'নতুন পোস্ট লিখুন'}
          desc={lang === 'en' ? 'Share your work; published after admin approval.' : 'আপনার কাজ শেয়ার করুন — অ্যাডমিন অনুমোদনের পর প্রকাশিত।'}
          emoji="✍️"
        />
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
        border: `1px solid ${highlight ? 'rgba(194,65,12,0.25)' : '#e7e5e4'}`,
        boxShadow: '0 1px 6px rgba(28,25,23,0.05)',
      }}
    >
      <span className="text-[24px]">{emoji}</span>
      <div>
        <h3 className="font-semibold text-[15px]" style={{ color: highlight ? BRAND : INK }}>{title}</h3>
        <p className="mt-1 text-[13px] leading-relaxed" style={{ color: MUTED }}>{desc}</p>
      </div>
    </Link>
  );
}
