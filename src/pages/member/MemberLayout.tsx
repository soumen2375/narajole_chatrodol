import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  UserRound,
  BadgeIndianRupee,
  CalendarCheck,
  FileText,
  Image,
  HeartHandshake,
  Mail,
  Users,
  FolderOpen,
  Images,
  CalendarDays,
  ClipboardList,
  Wallet,
  ReceiptText,
  BookOpenText,
  Landmark,
  BarChart3,
  FileCheck,
  Droplet,
  Layers,
  CheckCircle2,
  Tag,
  HardDrive
} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useT } from '@/i18n';
import type { NavItem } from '@/components/layout/DashboardShell';

export default function MemberLayout() {
  const { t, lang } = useT();
  const { member, canManagePosts, canManageEvents, canManageFinance } = useAuth();
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const tr = (en: string, bn: string) => (lang === 'en' ? en : bn);

  useEffect(() => {
    if (!member) return;
    supabase
      .from('cswo_admin_messages')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', member.id)
      .eq('is_read', false)
      .then(({ count }) => setUnreadMsgs(count ?? 0));
  }, [member]);

  const items: NavItem[] = [
    { to: '/member',               label: t('m.dashboard'),     icon: LayoutDashboard, end: true },
    { to: '/member/profile',       label: t('m.profile'),       icon: UserRound },
    { to: '/member/directory',     label: t('m.directory'),     icon: Users },
    { to: '/member/posts',         label: t('m.posts'),         icon: FileText },
    { to: '/member/gallery',       label: t('m.gallery'),       icon: Image },
    { to: '/member/attendance',    label: t('m.attendance'),    icon: CalendarCheck },
    { to: '/member/contributions', label: t('m.contributions'), icon: BadgeIndianRupee },
    { to: '/member/donations',     label: t('m.donations'),     icon: HeartHandshake },
    { to: '/member/messages',      label: t('m.messages'),      icon: Mail, badge: unreadMsgs },
    { to: '/member/blood-donors',  label: tr('Blood Donors', 'রক্তদাতা'), icon: Droplet },

    // ── Digital Media Capability (Dynamic) ─────────────────────────────
    ...(canManagePosts ? [
      { to: '/member/cms',           label: tr('All Content', 'সকল কনটেন্ট'),     icon: Layers,
        sectionLabel: tr('Digital Media', 'ডিজিটাল মিডিয়া') } as NavItem,
      { to: '/member/cms/approvals', label: tr('Review Queue', 'অনুমোদন কিউ'),   icon: CheckCircle2 } as NavItem,
      { to: '/member/cms/analytics', label: tr('Analytics', 'অ্যানালিটিক্স'),       icon: BarChart3 } as NavItem,
      { to: '/member/cms/tags',      label: tr('Tags Manager', 'ট্যাগ ম্যানেজার'),  icon: Tag } as NavItem,
      { to: '/member/media',         label: tr('Media Library', 'মিডিয়া লাইব্রেরি'), icon: HardDrive } as NavItem,
      { to: '/member/categories',    label: t('a.categories'),                  icon: FolderOpen } as NavItem,
      { to: '/member/gallery-manage',label: t('a.gallery'),                     icon: Images } as NavItem,
    ] : []),

    // ── Secretary / Events Capability (Dynamic) ────────────────────────
    ...(canManageEvents ? [
      { to: '/member/event-dashboard',   label: t('a.eventsDashboard'), icon: LayoutDashboard,
        sectionLabel: tr('Secretary', 'সেক্রেটারি') } as NavItem,
      { to: '/member/events',            label: t('a.events'),          icon: CalendarDays } as NavItem,
      { to: '/member/attendance-manage', label: t('a.attendance'),      icon: ClipboardList } as NavItem,
      { to: '/member/blood-donors-manage', label: tr('Blood Donors', 'রক্তদাতা তালিকা'), icon: Droplet } as NavItem,
    ] : []),

    // ── Treasurer / Finance Capability (Dynamic) ───────────────────────
    ...(canManageFinance ? [
      { to: '/member/finance',              label: 'Finance',             icon: Wallet,
        sectionLabel: 'Treasurer' } as NavItem,
      { to: '/member/contributions-manage', label: 'Monthly Donation',    icon: BadgeIndianRupee } as NavItem,
      { to: '/member/donations-manage',     label: 'Donations',           icon: HeartHandshake } as NavItem,
      { to: '/member/expenses',             label: 'Expenses',            icon: ReceiptText } as NavItem,
      { to: '/member/invoices',             label: 'Invoices',            icon: FileText } as NavItem,
      { to: '/member/ledger',               label: 'Ledger',              icon: BookOpenText } as NavItem,
      { to: '/member/bank',                 label: 'Bank',                icon: Landmark } as NavItem,
      { to: '/member/reports',              label: 'Reports',             icon: BarChart3 } as NavItem,
      { to: '/member/compliance',           label: 'Compliance',          icon: FileCheck } as NavItem,
    ] : []),
  ];

  return <DashboardShell title={t('m.panel')} items={items} panel="member" />;
}
