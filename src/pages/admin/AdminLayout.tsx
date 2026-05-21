import DashboardShell from '@/components/layout/DashboardShell';
import { useT } from '@/i18n';

export default function AdminLayout() {
  const { t } = useT();
  const items = [
    { to: '/admin', label: t('a.dashboard'), end: true },
    { to: '/admin/members', label: t('a.members') },
    { to: '/admin/posts', label: t('a.posts') },
    { to: '/admin/events', label: t('a.events') },
    { to: '/admin/attendance', label: t('a.attendance') },
    { to: '/admin/contributions', label: t('a.contributions') },
    { to: '/admin/donations', label: t('a.donations') },
    { to: '/admin/messages', label: t('a.messages') },
  ];
  return <DashboardShell title={t('a.panel')} items={items} panel="admin" />;
}
