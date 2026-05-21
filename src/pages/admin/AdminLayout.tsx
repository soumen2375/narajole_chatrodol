import DashboardShell, { type NavItem } from '@/components/layout/DashboardShell';

const items: NavItem[] = [
  { to: '/admin', label: 'ড্যাশবোর্ড', end: true },
  { to: '/admin/members', label: 'সদস্য ব্যবস্থাপনা' },
  { to: '/admin/posts', label: 'পোস্ট ব্যবস্থাপনা' },
  { to: '/admin/events', label: 'অনুষ্ঠান ও ক্যাম্প' },
  { to: '/admin/attendance', label: 'উপস্থিতি' },
  { to: '/admin/contributions', label: 'মাসিক অনুদান' },
  { to: '/admin/donations', label: 'দান রেকর্ড' },
  { to: '/admin/messages', label: 'বার্তা ও আবেদন' },
];

export default function AdminLayout() {
  return <DashboardShell title="অ্যাডমিন প্যানেল" items={items} />;
}
