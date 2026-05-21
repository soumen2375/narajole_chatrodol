import DashboardShell from '@/components/layout/DashboardShell';
import { useT } from '@/i18n';

export default function MemberLayout() {
  const { t } = useT();
  const items = [
    { to: '/member', label: t('m.dashboard'), end: true },
    { to: '/member/profile', label: t('m.profile') },
    { to: '/member/posts', label: t('m.posts') },
    { to: '/member/attendance', label: t('m.attendance') },
    { to: '/member/contributions', label: t('m.contributions') },
    { to: '/member/donations', label: t('m.donations') },
  ];
  return <DashboardShell title={t('m.panel')} items={items} panel="member" />;
}
