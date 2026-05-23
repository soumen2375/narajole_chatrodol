import { useState } from 'react';
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
  /** If set, a small category header is rendered immediately before this nav link. */
  sectionLabel?: string;
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
  const { member, isAdmin, signOut } = useAuth();
  const { t } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayId = member ? memberDisplayId(member) : '';

  return (
    <div className="flex min-h-screen" style={{ background: CREAM }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: INK, color: CREAM }}
      >
        {/* Sidebar header — member photo + name + ID */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: `1px solid rgba(250,246,239,0.12)` }}
        >
          <MemberAvatar avatarUrl={member?.avatar_url ?? null} name={member?.full_name ?? 'M'} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold leading-tight" style={{ fontFamily: '"Noto Serif Bengali", serif', fontSize: 14, color: CREAM }}>
              {member?.full_name ?? title}
            </div>
            <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: 'rgba(250,246,239,0.5)' }}>
              {displayId} · {panel === 'admin' ? 'Admin' : 'Member'}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 p-3 text-sm">
          {items.map((it) => (
            <div key={it.to}>
              {it.sectionLabel && (
                <p
                  className="mt-3 mb-0.5 px-3.5 text-[9px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: 'rgba(250,246,239,0.35)' }}
                >
                  {it.sectionLabel}
                </p>
              )}
              <NavLink
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
            </div>
          ))}

          <div className="my-2" style={{ height: 1, background: 'rgba(250,246,239,0.10)' }} />

          {isAdmin && (
            <Link
              to={panel === 'admin' ? '/member' : '/admin'}
              onClick={() => setOpen(false)}
              className="rounded-[4px] px-3.5 py-2.5 text-center text-sm font-medium transition-colors"
              style={{ background: 'rgba(194,65,12,0.22)', color: '#fca47e' }}
            >
              {panel === 'admin' ? t('header.memberPanel') : t('header.adminPanel')}
            </Link>
          )}
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="rounded-[4px] px-3.5 py-2.5 text-sm transition-colors"
            style={{ color: 'rgba(250,246,239,0.45)' }}
          >
            ← {t('common.backToSite')}
          </Link>

          <button
            onClick={() => { setOpen(false); handleSignOut(); }}
            className="flex w-full items-center gap-2.5 rounded-[4px] px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-red-900/30"
            style={{ color: '#fca47e' }}
          >
            ⏻ {t('header.logout')}
          </button>
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
