import {
  FaGauge, FaUsers, FaFileLines, FaCalendarDays,
  FaClipboardList, FaCoins, FaHeart, FaEnvelope, FaImages,
  FaChartPie, FaReceipt, FaFolderOpen,
} from 'react-icons/fa6';
import DashboardShell from '@/components/layout/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import type { NavItem } from '@/components/layout/DashboardShell';

export default function AdminLayout() {
  const { t, lang } = useT();
  const { isAdmin, canManagePosts, canManageEvents, canManageFinance } = useAuth();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  const items: NavItem[] = [
    { to: '/admin', label: t('a.dashboard'), icon: FaGauge, end: true },

    // ── Members (admin only) ──────────────────────────────────────────
    ...(isAdmin ? [
      { to: '/admin/members', label: t('a.members'), icon: FaUsers,
        sectionLabel: tr('Members', 'সদস্য') } as NavItem,
    ] : []),

    // ── Digital Media ─────────────────────────────────────────────────
    ...(isAdmin || canManagePosts ? [
      { to: '/admin/posts',      label: t('a.posts'),      icon: FaFileLines,
        sectionLabel: isAdmin ? tr('Content', 'কন্টেন্ট') : tr('Digital Media', 'ডিজিটাল মিডিয়া') } as NavItem,
      { to: '/admin/categories', label: t('a.categories'), icon: FaFolderOpen } as NavItem,
      { to: '/admin/gallery',    label: t('a.gallery'),    icon: FaImages } as NavItem,
    ] : []),

    // ── Secretary / Events ────────────────────────────────────────────
    ...(isAdmin || canManageEvents ? [
      { to: '/admin/events',     label: t('a.events'),     icon: FaCalendarDays,
        sectionLabel: isAdmin ? tr('Events', 'অনুষ্ঠান') : tr('Secretary', 'সেক্রেটারি') } as NavItem,
      { to: '/admin/attendance', label: t('a.attendance'), icon: FaClipboardList } as NavItem,
    ] : []),

    // ── Treasurer / Finance ───────────────────────────────────────────
    ...(isAdmin || canManageFinance ? [
      { to: '/admin/finance',        label: t('a.finance'),        icon: FaChartPie,
        sectionLabel: isAdmin ? tr('Finance', 'অর্থ') : tr('Treasurer', 'কোষাধ্যক্ষ') } as NavItem,
      { to: '/admin/contributions',  label: t('a.contributions'),  icon: FaCoins } as NavItem,
      { to: '/admin/donations',      label: t('a.donations'),      icon: FaHeart } as NavItem,
      { to: '/admin/expenses',       label: t('a.expenses'),       icon: FaReceipt } as NavItem,
    ] : []),

    // ── Communication (admin only) ────────────────────────────────────
    ...(isAdmin ? [
      { to: '/admin/messages', label: t('a.messages'), icon: FaEnvelope,
        sectionLabel: tr('Communication', 'যোগাযোগ') } as NavItem,
    ] : []),
  ];

  return <DashboardShell title={t('a.panel')} items={items} panel="admin" />;
}
