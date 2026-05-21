import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/StatCard';
import { useFmt } from '@/lib/format';
import { useT } from '@/i18n';

export default function AdminDashboard() {
  const { t, lang } = useT();
  const fmt = useFmt();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const [s, setS] = useState({ members: 0, pending: 0, posts: 0, pendingPosts: 0, events: 0, donations: 0, messages: 0, volunteers: 0 });

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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t('a.panel')}</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={tr('Total members', 'মোট সদস্য')} value={fmt.num(s.members)} accent="blue" />
        <StatCard label={tr('Awaiting approval', 'অনুমোদনের অপেক্ষায়')} value={fmt.num(s.pending)} accent={s.pending ? 'red' : 'green'} />
        <StatCard label={tr('Total posts', 'মোট পোস্ট')} value={fmt.num(s.posts)} accent="gray" />
        <StatCard label={tr('Pending posts', 'অপেক্ষমাণ পোস্ট')} value={fmt.num(s.pendingPosts)} accent={s.pendingPosts ? 'amber' : 'green'} />
        <StatCard label={tr('Events & camps', 'অনুষ্ঠান ও ক্যাম্প')} value={fmt.num(s.events)} accent="blue" />
        <StatCard label={tr('Total raised', 'মোট সংগৃহীত দান')} value={fmt.money(s.donations)} accent="amber" />
        <StatCard label={tr('Contact messages', 'যোগাযোগ বার্তা')} value={fmt.num(s.messages)} accent="gray" />
        <StatCard label={tr('Volunteer applications', 'স্বেচ্ছাসেবক আবেদন')} value={fmt.num(s.volunteers)} accent="green" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link to="/admin/members" className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:shadow-md">
          <h3 className="font-semibold text-blue-700">{tr('Add / approve members', 'সদস্য যোগ / অনুমোদন')}</h3>
          <p className="mt-1 text-sm text-gray-600">{tr('Create member accounts and approve pending requests.', 'নতুন সদস্য অ্যাকাউন্ট তৈরি ও অপেক্ষমাণ অনুরোধ অনুমোদন করুন।')}</p>
        </Link>
        <Link to="/admin/posts" className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:shadow-md">
          <h3 className="font-semibold text-blue-700">{tr('Approve posts', 'পোস্ট অনুমোদন')}</h3>
          <p className="mt-1 text-sm text-gray-600">{tr('Review and publish member-submitted posts.', 'সদস্যদের জমা দেওয়া পোস্ট পর্যালোচনা ও প্রকাশ করুন।')}</p>
        </Link>
        <Link to="/admin/events" className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 hover:shadow-md">
          <h3 className="font-semibold text-blue-700">{tr('Add events', 'অনুষ্ঠান যোগ করুন')}</h3>
          <p className="mt-1 text-sm text-gray-600">{tr('Create events or camps for members to attend.', 'নতুন অনুষ্ঠান বা ক্যাম্প তৈরি করুন।')}</p>
        </Link>
      </div>
    </div>
  );
}
