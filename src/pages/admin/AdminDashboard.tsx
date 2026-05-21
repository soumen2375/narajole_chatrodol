import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';
import { formatCurrency, toBengaliDigits } from '@/lib/format';

export default function AdminDashboard() {
  const [s, setS] = useState({
    members: 0,
    pending: 0,
    posts: 0,
    pendingPosts: 0,
    events: 0,
    donations: 0,
    messages: 0,
    volunteers: 0,
  });

  useEffect(() => {
    const load = async () => {
      const head = { count: 'exact' as const, head: true };
      const [members, pending, posts, pendingPosts, events, donations, messages, volunteers] = await Promise.all([
        supabase.from('cswo_members').select('id', head),
        supabase.from('cswo_members').select('id', head).eq('status', 'pending'),
        supabase.from('cswo_posts').select('id', head),
        supabase.from('cswo_posts').select('id', head).eq('status', 'pending'),
        supabase.from('cswo_events').select('id', head),
        supabase.from('cswo_donations').select('amount').eq('status', 'paid'),
        supabase.from('cswo_contact_messages').select('id', head),
        supabase.from('cswo_volunteer_applications').select('id', head),
      ]);
      const total = (donations.data ?? []).reduce((sum, d) => sum + Number(d.amount), 0);
      setS({
        members: members.count ?? 0,
        pending: pending.count ?? 0,
        posts: posts.count ?? 0,
        pendingPosts: pendingPosts.count ?? 0,
        events: events.count ?? 0,
        donations: total,
        messages: messages.count ?? 0,
        volunteers: volunteers.count ?? 0,
      });
    };
    load();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">অ্যাডমিন ড্যাশবোর্ড</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="মোট সদস্য" value={toBengaliDigits(s.members)} accent="blue" />
        <StatCard label="অনুমোদনের অপেক্ষায়" value={toBengaliDigits(s.pending)} accent={s.pending ? 'red' : 'green'} />
        <StatCard label="মোট পোস্ট" value={toBengaliDigits(s.posts)} accent="gray" />
        <StatCard label="অপেক্ষমাণ পোস্ট" value={toBengaliDigits(s.pendingPosts)} accent={s.pendingPosts ? 'amber' : 'green'} />
        <StatCard label="অনুষ্ঠান ও ক্যাম্প" value={toBengaliDigits(s.events)} accent="blue" />
        <StatCard label="মোট সংগৃহীত দান" value={formatCurrency(s.donations)} accent="amber" />
        <StatCard label="যোগাযোগ বার্তা" value={toBengaliDigits(s.messages)} accent="gray" />
        <StatCard label="স্বেচ্ছাসেবক আবেদন" value={toBengaliDigits(s.volunteers)} accent="green" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link to="/admin/members" className="rounded-lg bg-white p-5 shadow-sm hover:shadow-md">
          <h3 className="font-semibold text-blue-700">সদস্য যোগ করুন / অনুমোদন</h3>
          <p className="mt-1 text-sm text-gray-600">নতুন সদস্য অ্যাকাউন্ট তৈরি ও অপেক্ষমাণ অনুরোধ অনুমোদন করুন।</p>
        </Link>
        <Link to="/admin/posts" className="rounded-lg bg-white p-5 shadow-sm hover:shadow-md">
          <h3 className="font-semibold text-blue-700">পোস্ট অনুমোদন</h3>
          <p className="mt-1 text-sm text-gray-600">সদস্যদের জমা দেওয়া পোস্ট পর্যালোচনা ও প্রকাশ করুন।</p>
        </Link>
        <Link to="/admin/events" className="rounded-lg bg-white p-5 shadow-sm hover:shadow-md">
          <h3 className="font-semibold text-blue-700">অনুষ্ঠান যোগ করুন</h3>
          <p className="mt-1 text-sm text-gray-600">নতুন অনুষ্ঠান বা ক্যাম্প তৈরি করুন যেখানে সদস্যরা উপস্থিতি জানাবে।</p>
        </Link>
      </div>
    </div>
  );
}
