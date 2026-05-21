import {
  FaGauge, FaCircleUser, FaFileLines, FaCalendarCheck,
  FaWallet, FaHeart,
} from 'react-icons/fa6';
import DashboardShell from '@/components/layout/DashboardShell';
import { useT } from '@/i18n';

export default function MemberLayout() {
  const { t } = useT();
  const items = [
    { to: '/member',               label: t('m.dashboard'),     icon: FaGauge,        end: true },
    { to: '/member/profile',       label: t('m.profile'),       icon: FaCircleUser },
    { to: '/member/posts',         label: t('m.posts'),         icon: FaFileLines },
    { to: '/member/attendance',    label: t('m.attendance'),    icon: FaCalendarCheck },
    { to: '/member/contributions', label: t('m.contributions'), icon: FaWallet },
    { to: '/member/donations',     label: t('m.donations'),     icon: FaHeart },
  ];
  return <DashboardShell title={t('m.panel')} items={items} panel="member" />;
}
