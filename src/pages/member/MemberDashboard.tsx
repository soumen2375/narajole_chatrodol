import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';
import { toBengaliDigits, formatCurrency } from '@/lib/format';

export default function MemberDashboard() {
  const { member } = useAuth();
  const [stats, setStats] = useState({ attendance: 0, posts: 0, donated: 0, unpaidMonths: 0 });

  useEffect(() => {
    if (!member) return;
    const load = async () => {
      const year = new Date().getFullYear();
      const [att, posts, don, contrib] = await Promise.all([
        supabase.from('cswo_attendance').select('id', { count: 'exact', head: true }).eq('member_id', member.id),
        supabase.from('cswo_posts').select('id', { count: 'exact', head: true }).eq('author_id', member.id),
        supabase.from('cswo_donations').select('amount').eq('member_id', member.id).eq('status', 'paid'),
        supabase
          .from('cswo_monthly_contributions')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', member.id)
          .eq('year', year)
          .eq('status', 'unpaid'),
      ]);
      const donated = (don.data ?? []).reduce((sum, d) => sum + Number(d.amount), 0);
      setStats({
        attendance: att.count ?? 0,
        posts: posts.count ?? 0,
        donated,
        unpaidMonths: contrib.count ?? 0,
      });
    };
    load();
  }, [member]);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-900">স্বাগতম, {member?.full_name}</h1>
      <p className="mb-6 text-gray-600">{member?.designation || 'সদস্য'} · {member?.email}</p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="উপস্থিত অনুষ্ঠান/ক্যাম্প" value={toBengaliDigits(stats.attendance)} accent="blue" />
        <StatCard label="আমার পোস্ট" value={toBengaliDigits(stats.posts)} accent="green" />
        <StatCard label="মোট দান" value={formatCurrency(stats.donated)} accent="amber" />
        <StatCard
          label={`${toBengaliDigits(new Date().getFullYear())} সালে বকেয়া মাস`}
          value={toBengaliDigits(stats.unpaidMonths)}
          accent={stats.unpaidMonths > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickLink to="/member/posts" title="নতুন পোস্ট লিখুন" desc="আপনার কাজ ও কর্মসূচি শেয়ার করুন (অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে)।" />
        <QuickLink to="/member/contributions" title="মাসিক অনুদান দিন" desc="কোন মাসের চাঁদা বাকি আছে দেখুন ও অনলাইনে পরিশোধ করুন।" />
        <QuickLink to="/member/attendance" title="উপস্থিতি জানান" desc="আপনি কোন অনুষ্ঠানে/ক্যাম্পে অংশ নিয়েছেন তা চিহ্নিত করুন।" />
      </div>
    </div>
  );
}

function QuickLink({ to, title, desc }: { to: string; title: string; desc: string }) {
  return (
    <Link to={to} className="rounded-lg bg-white p-5 shadow-sm transition hover:shadow-md">
      <h3 className="font-semibold text-blue-700">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{desc}</p>
    </Link>
  );
}
