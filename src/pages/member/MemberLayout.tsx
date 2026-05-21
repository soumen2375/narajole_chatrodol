import DashboardShell, { type NavItem } from '@/components/layout/DashboardShell';

const items: NavItem[] = [
  { to: '/member', label: 'ড্যাশবোর্ড', end: true },
  { to: '/member/profile', label: 'আমার প্রোফাইল' },
  { to: '/member/posts', label: 'আমার পোস্ট' },
  { to: '/member/attendance', label: 'উপস্থিতি ও ক্যাম্প' },
  { to: '/member/contributions', label: 'মাসিক অনুদান' },
  { to: '/member/donations', label: 'আমার দান' },
];

export default function MemberLayout() {
  return <DashboardShell title="সদস্য প্যানেল" items={items} />;
}
