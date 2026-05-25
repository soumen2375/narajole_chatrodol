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
  Scale,
  ReceiptText,
  BookOpenText,
  ClipboardCheck,
  HandCoins,
  Megaphone,
  Undo2,
  Coins,
  Landmark,
  BarChart3,
  FileCheck
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

    // ── Digital Media Capability (Dynamic) ─────────────────────────────
    ...(canManagePosts ? [
      { to: '/member/posts-manage',      label: t('a.posts'),      icon: FileText,
        sectionLabel: tr('Digital Media', 'ডিজিটাল মিডিয়া') } as NavItem,
      { to: '/member/categories', label: t('a.categories'), icon: FolderOpen } as NavItem,
      { to: '/member/gallery-manage',    label: t('a.gallery'),    icon: Images } as NavItem,
    ] : []),

    // ── Secretary / Events Capability (Dynamic) ────────────────────────
    ...(canManageEvents ? [
      { to: '/member/event-dashboard',   label: t('a.eventsDashboard'), icon: LayoutDashboard,
        sectionLabel: tr('Secretary', 'সেক্রেটারি') } as NavItem,
      { to: '/member/events',            label: t('a.events'),     icon: CalendarDays } as NavItem,
      { to: '/member/attendance-manage', label: t('a.attendance'), icon: ClipboardList } as NavItem,
    ] : []),

    // ── Treasurer / Finance Capability (Dynamic) ───────────────────────
    ...(canManageFinance ? [
      { to: '/member/finance',              label: t('a.finance'),        icon: Wallet,
        sectionLabel: tr('Treasurer', 'কোষাধ্যক্ষ') } as NavItem,
      { to: '/member/budgets',              label: t('a.budgets'),        icon: Scale } as NavItem,
      { to: '/member/contributions-manage', label: t('a.contributions'),  icon: BadgeIndianRupee } as NavItem,
      { to: '/member/donations-manage',     label: t('a.donations'),      icon: HeartHandshake } as NavItem,
      { to: '/member/expenses',             label: t('a.expenses'),       icon: ReceiptText } as NavItem,
      { to: '/member/ledger',               label: t('a.ledger'),         icon: BookOpenText } as NavItem,
      { to: '/member/approvals',            label: t('a.approvals'),      icon: ClipboardCheck } as NavItem,
      { to: '/member/grants',               label: t('a.grants'),         icon: HandCoins } as NavItem,
      { to: '/member/campaigns',            label: t('a.campaigns'),      icon: Megaphone } as NavItem,
      { to: '/member/refunds',              label: t('a.refunds'),        icon: Undo2 } as NavItem,
      { to: '/member/payroll',              label: t('a.payroll'),        icon: Coins } as NavItem,
      { to: '/member/bank',                 label: t('a.bank'),           icon: Landmark } as NavItem,
      { to: '/member/reports',              label: t('a.reports'),        icon: BarChart3 } as NavItem,
      { to: '/member/compliance',           label: t('a.compliance'),     icon: FileCheck } as NavItem,
    ] : []),
  ];

  return <DashboardShell title={t('m.panel')} items={items} panel="member" />;
}
