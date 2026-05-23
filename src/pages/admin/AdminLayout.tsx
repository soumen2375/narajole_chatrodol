import {
  FaGauge, FaUsers, FaFileLines, FaCalendarDays,
  FaClipboardList, FaCoins, FaHeart, FaEnvelope, FaImages,
  FaChartPie, FaReceipt,
} from 'react-icons/fa6';
import DashboardShell from '@/components/layout/DashboardShell';
import { useT } from '@/i18n';

export default function AdminLayout() {
  const { t, lang } = useT();
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);
  const items = [
    { to: '/admin',               label: t('a.dashboard'),     icon: FaGauge,      end: true },

    // ── Members ──────────────────────────────────────────────────────────────
    { to: '/admin/members',       label: t('a.members'),       icon: FaUsers,
      sectionLabel: tr('Members', 'সদস্য') },

    // ── Content ──────────────────────────────────────────────────────────────
    { to: '/admin/posts',         label: t('a.posts'),         icon: FaFileLines,
      sectionLabel: tr('Content', 'কন্টেন্ট') },
    { to: '/admin/gallery',       label: t('a.gallery'),       icon: FaImages },
    { to: '/admin/events',        label: t('a.events'),        icon: FaCalendarDays },
    { to: '/admin/attendance',    label: t('a.attendance'),    icon: FaClipboardList },

    // ── Finance ───────────────────────────────────────────────────────────────
    { to: '/admin/contributions', label: t('a.contributions'), icon: FaCoins,
      sectionLabel: tr('Finance', 'অর্থ') },
    { to: '/admin/donations',     label: t('a.donations'),     icon: FaHeart },
    { to: '/admin/expenses',      label: t('a.expenses'),      icon: FaReceipt },
    { to: '/admin/finance',       label: t('a.finance'),       icon: FaChartPie },

    // ── Communication ─────────────────────────────────────────────────────────
    { to: '/admin/messages',      label: t('a.messages'),      icon: FaEnvelope,
      sectionLabel: tr('Communication', 'যোগাযোগ') },
  ];
  return <DashboardShell title={t('a.panel')} items={items} panel="admin" />;
}
