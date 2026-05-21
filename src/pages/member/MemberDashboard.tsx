import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';

export default function MemberDashboard() {
  const { member } = useAuth();
  const { t, lang } = useT();
  const fmt = useFmt();
  const [stats, setStats] = useState({ attendance: 0, posts: 0, donated: 0, unpaidMonths: 0 });

  useEffect(() => {
    if (!member) return;
    const load = async () => {
      const year = new Date().getFullYear();
      const [att, posts, don, contrib] = await Promise.all([
        supabase.from('cswo_attendance').select('id', { count: 'exact', head: true }).eq('member_id', member.id),
        supabase.from('cswo_posts').select('id', { count: 'exact', head: true }).eq('author_id', member.id),
        supabase.from('cswo_donations').select('amount').eq('member_id', member.id).eq('status', 'paid'),
        supabase.from('cswo_monthly_contributions').select('id', { count: 'exact', head: true }).eq('member_id', member.id).eq('year', year).eq('status', 'unpaid'),
      ]);
      const donated = (don.data ?? []).reduce((sum, d) => sum + Number(d.amount), 0);
      setStats({ attendance: att.count ?? 0, posts: posts.count ?? 0, donated, unpaidMonths: contrib.count ?? 0 });
    };
    load();
  }, [member]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">{t('m.welcome')}, {member?.full_name}</h1>
      <p className="mb-6 text-gray-600">{member?.designation || t('common.member')} · {member?.email}</p>

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

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickLink to="/member/posts" title={lang === 'en' ? 'Write a post' : 'নতুন পোস্ট লিখুন'} desc={lang === 'en' ? 'Share your work; published after admin approval.' : 'আপনার কাজ শেয়ার করুন (অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে)।'} />
        <QuickLink to="/member/contributions" title={lang === 'en' ? 'Pay monthly dues' : 'মাসিক অনুদান দিন'} desc={lang === 'en' ? 'See which months are due and pay online.' : 'কোন মাসের চাঁদা বাকি দেখুন ও অনলাইনে পরিশোধ করুন।'} />
        <QuickLink to="/member/attendance" title={lang === 'en' ? 'Mark attendance' : 'উপস্থিতি জানান'} desc={lang === 'en' ? 'Mark which events/camps you attended.' : 'কোন অনুষ্ঠানে/ক্যাম্পে অংশ নিয়েছেন চিহ্নিত করুন।'} />
      </div>
    </div>
  );
}

function QuickLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md">
      <h3 className="font-semibold text-blue-700">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{desc}</p>
    </Link>
  );
}
