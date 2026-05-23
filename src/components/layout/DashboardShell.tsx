import { useMemo, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { memberDisplayId } from '@/types';

const INK    = '#1c1917';
const CREAM  = '#faf6ef';
const PAPER  = '#ffffff';
const BRAND  = '#c2410c';
const RULE   = '#e7e5e4';

export interface NavItem {
  to: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  end?: boolean;
  sectionLabel?: string;
}

type SectionGroup = { label: string | null; items: NavItem[] };

function groupItems(items: NavItem[]): SectionGroup[] {
  const groups: SectionGroup[] = [];
  let cur: SectionGroup = { label: null, items: [] };
  for (const item of items) {
    if (item.sectionLabel !== undefined) {
      if (cur.items.length > 0) groups.push(cur);
      cur = { label: item.sectionLabel, items: [item] };
    } else {
      cur.items.push(item);
    }
  }
  if (cur.items.length > 0) groups.push(cur);
  return groups;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className="h-3 w-3 shrink-0 transition-transform duration-200"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function MemberAvatar({ avatarUrl, name, size = 36 }: { avatarUrl: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(250,246,239,0.25)' }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: BRAND, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.38, fontWeight: 700,
        border: '2px solid rgba(250,246,239,0.25)',
        fontFamily: '"Noto Serif Bengali", serif',
      }}
    >
      {initials}
    </div>
  );
}

export default function DashboardShell({
  title,
  items,
  panel,
}: {
  title: string;
  items: NavItem[];
  panel: 'member' | 'admin';
}) {
  const { member, isAdmin, canManagePosts, canManageEvents, canManageFinance, signOut } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const roleLabel = (() => {
    if (panel === 'admin' || isAdmin) return 'Admin';
    const parts = [
      canManagePosts  && 'Digital Media',
      canManageEvents && 'Secretary',
      canManageFinance && 'Treasurer',
    ].filter(Boolean) as string[];
    if (parts.length === 0) return 'Member';
    if (parts.length >= 3) return 'All Roles';
    return parts.join(' · ');
  })();

  const groups = useMemo(() => groupItems(items), [items]);
  const toggle = (label: string) => setCollapsed((p) => ({ ...p, [label]: !p[label] }));

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayId = member ? memberDisplayId(member) : '';

  return (
    <div className="flex min-h-screen" style={{ background: CREAM }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: INK, color: CREAM }}
      >
        {/* Sidebar header */}
        <div
          className="flex shrink-0 items-center gap-3 px-5 py-4"
          style={{ borderBottom: `1px solid rgba(250,246,239,0.12)` }}
        >
          <MemberAvatar avatarUrl={member?.avatar_url ?? null} name={member?.full_name ?? 'M'} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold leading-tight" style={{ fontFamily: '"Noto Serif Bengali", serif', fontSize: 14, color: CREAM }}>
              {member?.full_name ?? title}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(250,246,239,0.5)' }}>
              {displayId} · {roleLabel}
            </div>
          </div>
        </div>

        {/* Scrollable nav area */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3 text-sm">
          {groups.map((group) => (
            <div key={group.label ?? '__top__'}>
              {/* Collapsible section header */}
              {group.label && (
                <button
                  type="button"
                  onClick={() => toggle(group.label!)}
                  className="mt-3 mb-0.5 flex w-full items-center justify-between px-3.5 py-0.5 transition-opacity hover:opacity-80"
                >
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em]" style={{ color: 'rgba(250,246,239,0.45)' }}>
                    {group.label}
                  </span>
                  <span style={{ color: 'rgba(250,246,239,0.35)' }}>
                    <Chevron open={!collapsed[group.label]} />
                  </span>
                </button>
              )}

              {/* Section items — hidden when collapsed */}
              {(!group.label || !collapsed[group.label]) && group.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-[4px] px-3.5 py-2.5 font-medium transition-colors"
                  style={({ isActive }) => ({
                    background: isActive ? BRAND : 'transparent',
                    color: isActive ? '#fff' : 'rgba(250,246,239,0.78)',
                  })}
                >
                  {it.icon && <it.icon className="h-3.5 w-3.5 shrink-0" />}
                  {it.label}
                </NavLink>
              ))}
            </div>
          ))}

          {/* Bottom actions */}
          <div className="mt-auto pt-2">
            <div className="mb-2" style={{ height: 1, background: 'rgba(250,246,239,0.10)' }} />

            {(isAdmin || canManagePosts || canManageEvents || canManageFinance) && (
              <Link
                to={panel === 'admin' ? '/member' : '/admin'}
                onClick={() => setOpen(false)}
                className="mb-1 block rounded-[4px] px-3.5 py-2.5 text-center text-sm font-medium transition-colors"
                style={{ background: 'rgba(194,65,12,0.22)', color: '#fca47e' }}
              >
                {panel === 'admin' ? t('header.memberPanel') : t('header.adminPanel')}
              </Link>
            )}
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="block rounded-[4px] px-3.5 py-2.5 text-sm transition-colors"
              style={{ color: 'rgba(250,246,239,0.45)' }}
            >
              {t('common.backToSite')}
            </Link>
            <button
              onClick={() => { setOpen(false); handleSignOut(); }}
              className="flex w-full items-center gap-2.5 rounded-[4px] px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-red-900/30"
              style={{ color: '#fca47e' }}
            >
              ⏻ {t('header.logout')}
            </button>
          </div>
        </nav>
      </aside>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
          style={{ background: PAPER, borderBottom: `1px solid ${RULE}`, boxShadow: '0 1px 8px rgba(28,25,23,0.06)' }}
        >
          <button
            className="lg:hidden rounded-[4px] p-1.5 transition-colors hover:bg-gray-100"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden text-sm font-semibold lg:block" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
            {title}
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            {member && (
              <MemberAvatar avatarUrl={member.avatar_url} name={member.full_name} size={32} />
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
