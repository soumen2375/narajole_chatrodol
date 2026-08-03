import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Images,
  CalendarDays,
  ClipboardList,
  Wallet,
  ClipboardCheck,
  Scale,
  BadgeIndianRupee,
  HeartHandshake,
  HandCoins,
  Megaphone,
  Undo2,
  ReceiptText,
  Coins,
  Landmark,
  BookOpenText,
  BarChart3,
  FileCheck,
  Mail,
  ShieldCheck,
  Droplet,
  HardDrive,
  Layers,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import type { NavItem } from '@/components/layout/DashboardShell';

export default function AdminLayout() {
  const { t, lang } = useT();
  const { isAdmin, canManagePosts, canManageEvents, canManageFinance } = useAuth();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const items: NavItem[] = [
    { to: '/admin', label: t('a.dashboard'), icon: LayoutDashboard, end: true },

    // ── Members (admin only) ──────────────────────────────────────────
    ...(isAdmin ? [
      { to: '/admin/members', label: t('a.members'), icon: Users,
        sectionLabel: tr('Members', 'সদস্য') } as NavItem,
    ] : []),

    // ── Digital Media ─────────────────────────────────────────────────
    ...(isAdmin || canManagePosts ? [
      { to: '/admin/cms',           label: 'All Content',    icon: Layers,
        sectionLabel: isAdmin ? tr('Content', 'কন্টেন্ট') : tr('Digital Media', 'ডিজিটাল মিডিয়া') } as NavItem,
      { to: '/admin/cms/approvals', label: 'Review Queue',   icon: CheckCircle2 } as NavItem,
      { to: '/admin/cms/analytics', label: 'Analytics',      icon: BarChart3 } as NavItem,
      { to: '/admin/cms/tags',      label: 'Tags Manager',   icon: Tag } as NavItem,
      { to: '/admin/media',         label: 'Media Library',  icon: HardDrive } as NavItem,
      { to: '/admin/categories',    label: t('a.categories'), icon: FolderOpen } as NavItem,
      { to: '/admin/gallery',       label: t('a.gallery'),    icon: Images } as NavItem,
    ] : []),

    // ── Secretary / Events ────────────────────────────────────────────
    ...(isAdmin || canManageEvents ? [
      { to: '/admin/event-dashboard', label: t('a.eventsDashboard'), icon: LayoutDashboard,
        sectionLabel: isAdmin ? tr('Events', 'অনুষ্ঠান') : tr('Secretary', 'সেক্রেটারি') } as NavItem,
      { to: '/admin/events',       label: t('a.events'),       icon: CalendarDays } as NavItem,
      { to: '/admin/attendance',   label: t('a.attendance'),   icon: ClipboardList } as NavItem,
      { to: '/admin/blood-donors', label: tr('Blood Donors', 'রক্তদাতা তালিকা'), icon: Droplet } as NavItem,
    ] : []),

    // ── Treasurer / Finance ───────────────────────────────────────────
    ...(isAdmin || canManageFinance ? [
      { to: '/admin/finance',        label: 'Finance',        icon: Wallet,
        sectionLabel: isAdmin ? 'Finance' : 'Treasurer' } as NavItem,
      { to: '/admin/approvals',      label: 'Approvals',      icon: ClipboardCheck } as NavItem,
      { to: '/admin/budgets',        label: 'Budgets',        icon: Scale } as NavItem,
      { to: '/admin/contributions',  label: 'Monthly Donation',  icon: BadgeIndianRupee } as NavItem,
      { to: '/admin/donations',      label: 'Donations',      icon: HeartHandshake } as NavItem,
      { to: '/admin/grants',         label: 'Grants',         icon: HandCoins } as NavItem,
      { to: '/admin/campaigns',      label: 'Campaigns',      icon: Megaphone } as NavItem,
      { to: '/admin/refunds',        label: 'Refunds',        icon: Undo2 } as NavItem,
      { to: '/admin/expenses',       label: 'Expenses',       icon: ReceiptText } as NavItem,
      { to: '/admin/payroll',        label: 'Payroll',        icon: Coins } as NavItem,
      { to: '/admin/bank',           label: 'Bank',           icon: Landmark } as NavItem,
      { to: '/admin/ledger',         label: 'Ledger',         icon: BookOpenText } as NavItem,
      { to: '/admin/reports',        label: 'Reports',        icon: BarChart3 } as NavItem,
      { to: '/admin/compliance',     label: 'Compliance',     icon: FileCheck } as NavItem,
    ] : []),

    // ── Communication (admin only) ────────────────────────────────────
    ...(isAdmin ? [
      { to: '/admin/messages', label: t('a.messages'), icon: Mail,
        sectionLabel: tr('Communication', 'যোগাযোগ') } as NavItem,
      { to: '/admin/audit', label: t('a.audit'), icon: ShieldCheck,
        sectionLabel: tr('Governance', 'সুশাসন') } as NavItem,
    ] : []),
  ];

  return <DashboardShell title={t('a.panel')} items={items} panel="admin" />;
}
