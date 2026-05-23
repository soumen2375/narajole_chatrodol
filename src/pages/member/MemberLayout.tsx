import { useEffect, useState } from 'react';
import {
  FaGauge, FaCircleUser, FaFileLines, FaCalendarCheck,
  FaWallet, FaHeart, FaImage, FaUsers, FaEnvelope, FaCalendarDays,
} from 'react-icons/fa6';
import DashboardShell from '@/components/layout/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import type { NavItem } from '@/components/layout/DashboardShell';

export default function MemberLayout() {
  const { t } = useT();
  const { member } = useAuth();
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  useEffect(() => {
    if (!member) return;
    supabase
      .from('cswo_admin_messages')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', member.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadMsgs(count ?? 0));
  }, [member]);

  const items: NavItem[] = [
    { to: '/member',               label: t('m.dashboard'),     icon: FaGauge,         end: true },
    { to: '/member/profile',       label: t('m.profile'),       icon: FaCircleUser },
    { to: '/member/contributions', label: t('m.contributions'), icon: FaWallet },
    { to: '/member/attendance',    label: t('m.attendance'),    icon: FaCalendarCheck },
    { to: '/member/attendance',    label: t('m.events'),        icon: FaCalendarDays },
    { to: '/member/posts',         label: t('m.posts'),         icon: FaFileLines },
    { to: '/member/gallery',       label: t('m.gallery'),       icon: FaImage },
    { to: '/member/donations',     label: t('m.donations'),     icon: FaHeart },
    { to: '/member/messages',      label: t('m.messages'),      icon: FaEnvelope, badge: unreadMsgs },
    { to: '/member/directory',     label: t('m.directory'),     icon: FaUsers },
  ];

  return <DashboardShell title={t('m.panel')} items={items} panel="member" />;
}
