import {
  FaGauge, FaCircleUser, FaFileLines, FaCalendarCheck,
  FaWallet, FaHeart, FaImage, FaUsers,
} from 'react-icons/fa6';
import DashboardShell from '@/components/layout/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import type { NavItem } from '@/components/layout/DashboardShell';

export default function MemberLayout() {
  const { t } = useT();
  const { canManagePosts } = useAuth();

  const items: NavItem[] = [
    { to: '/member',               label: t('m.dashboard'),     icon: FaGauge,        end: true },
    { to: '/member/profile',       label: t('m.profile'),       icon: FaCircleUser },
    ...(canManagePosts ? [
      { to: '/member/posts',   label: t('m.posts'),   icon: FaFileLines } as NavItem,
      { to: '/member/gallery', label: t('m.gallery'), icon: FaImage     } as NavItem,
    ] : []),
    { to: '/member/attendance',    label: t('m.attendance'),    icon: FaCalendarCheck },
    { to: '/member/contributions', label: t('m.contributions'), icon: FaWallet },
    { to: '/member/donations',     label: t('m.donations'),     icon: FaHeart },
    { to: '/member/directory',     label: t('m.directory'),     icon: FaUsers },
  ];

  return <DashboardShell title={t('m.panel')} items={items} panel="member" />;
}
