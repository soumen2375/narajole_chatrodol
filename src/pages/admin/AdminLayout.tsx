import {
  LayoutDashboard,
  Users,
  FileText,
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
  ShieldCheck
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
      { to: '/admin/posts',      label: t('a.posts'),      icon: FileText,
        sectionLabel: isAdmin ? tr('Content', 'কন্টেন্ট') : tr('Digital Media', 'ডিজিটাল মিডিয়া') } as NavItem,
      { to: '/admin/categories', label: t('a.categories'), icon: FolderOpen } as NavItem,
      { to: '/admin/gallery',    label: t('a.gallery'),    icon: Images } as NavItem,
    ] : []),

    // ── Secretary / Events ────────────────────────────────────────────
    ...(isAdmin || canManageEvents ? [
      { to: '/admin/events',     label: t('a.events'),     icon: CalendarDays,
        sectionLabel: isAdmin ? tr('Events', 'অনুষ্ঠান') : tr('Secretary', 'সেক্রেটারি') } as NavItem,
      { to: '/admin/attendance', label: t('a.attendance'), icon: ClipboardList } as NavItem,
    ] : []),

    // ── Treasurer / Finance ───────────────────────────────────────────
    ...(isAdmin || canManageFinance ? [
      { to: '/admin/finance',        label: t('a.finance'),        icon: Wallet,
        sectionLabel: isAdmin ? tr('Finance', 'অর্থ') : tr('Treasurer', 'কোষাধ্যক্ষ') } as NavItem,
      { to: '/admin/approvals',      label: t('a.approvals'),      icon: ClipboardCheck } as NavItem,
      { to: '/admin/budgets',        label: t('a.budgets'),        icon: Scale } as NavItem,
      { to: '/admin/contributions',  label: t('a.contributions'),  icon: BadgeIndianRupee } as NavItem,
      { to: '/admin/donations',      label: t('a.donations'),      icon: HeartHandshake } as NavItem,
      { to: '/admin/grants',         label: t('a.grants'),         icon: HandCoins } as NavItem,
      { to: '/admin/campaigns',      label: t('a.campaigns'),      icon: Megaphone } as NavItem,
      { to: '/admin/refunds',        label: t('a.refunds'),        icon: Undo2 } as NavItem,
      { to: '/admin/expenses',       label: t('a.expenses'),       icon: ReceiptText } as NavItem,
      { to: '/admin/payroll',        label: t('a.payroll'),        icon: Coins } as NavItem,
      { to: '/admin/bank',           label: t('a.bank'),           icon: Landmark } as NavItem,
      { to: '/admin/ledger',         label: t('a.ledger'),         icon: BookOpenText } as NavItem,
      { to: '/admin/reports',        label: t('a.reports'),        icon: BarChart3 } as NavItem,
      { to: '/admin/compliance',     label: t('a.compliance'),     icon: FileCheck } as NavItem,
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
