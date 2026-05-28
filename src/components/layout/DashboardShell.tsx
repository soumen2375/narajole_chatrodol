import { useMemo, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import LanguageToggle from '@/components/ui/LanguageToggle';
import NotificationBell from '@/components/ui/NotificationBell';
import { memberDisplayId } from '@/types';
import { 
  ChevronDown, 
  LogOut, 
  Globe, 
  ArrowLeftRight 
} from 'lucide-react';

const INK    = '#000201'; // Charcoal black
const CREAM  = '#efeadb'; // Elegant warm off-white
const PAPER  = '#ffffff'; // Pure white
const RULE   = '#e5dec9'; // Warm border
const ACCENT = '#fdcf6f'; // Warm Gold

export interface NavItem {
  to: string;
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>> | any;
  end?: boolean;
  sectionLabel?: string;
  badge?: number;
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
    <ChevronDown
      className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
    />
  );
}

function MemberAvatar({ avatarUrl, name, size = 36 }: { avatarUrl: string | null; name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="shrink-0"
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '2px solid rgba(255,255,255,0.15)',
          boxShadow: '0 0 0 3px rgba(255,255,255,0.06)'
        }}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center shrink-0 font-bold"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: 'linear-gradient(135deg, #14b8a6, #0C756F)', color: '#fff',
        fontSize: size * 0.38,
        border: '2px solid rgba(255,255,255,0.15)',
        boxShadow: '0 0 0 3px rgba(255,255,255,0.06)',
        fontFamily: '"Inter", sans-serif',
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
  const toggle = (label: string) => setExpanded((p) => ({ ...p, [label]: !p[label] }));

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayId = member ? memberDisplayId(member) : '';

  return (
    <div className="flex min-h-screen" style={{ background: CREAM }}>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col transform transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ 
          background: 'linear-gradient(180deg, #071412 0%, #0a1f1d 45%, #07110f 100%)', 
          color: CREAM,
          fontFamily: "'Inter', sans-serif"
        }}
      >
        {/* Subtle Brand Glow behind active area */}
        <div 
          className="absolute pointer-events-none rounded-full" 
          style={{
            top: '25%',
            left: '-50px',
            width: '240px',
            height: '240px',
            background: '#0c756f',
            filter: 'blur(80px)',
            opacity: 0.08,
            zIndex: 0
          }}
        />

        {/* Sidebar header (Glass Card design) */}
        <div className="p-4 pb-1 shrink-0 z-10">
          <Link
            to="/member/profile"
            className="flex items-center gap-3 px-3.5 backdrop-blur-[10px] transition-all hover:bg-white/[0.04]"
            style={{
              height: '84px',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              display: 'flex'
            }}
            title={t('m.profile')}
          >
            <MemberAvatar avatarUrl={member?.avatar_url ?? null} name={member?.full_name ?? 'M'} size={40} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold leading-tight" style={{ fontSize: 14.5, color: '#ffffff' }}>
                {member?.full_name ?? title}
              </div>
              <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color: 'rgba(250,246,239,0.45)' }}>
                {displayId} · {roleLabel}
              </div>
              <div className="mt-1 font-mono text-[9px] font-extrabold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                {title}
              </div>
            </div>
          </Link>
        </div>

        {/* Scrollable nav area */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3.5 py-2 z-10 premium-sidebar-nav">
          {groups.map((group) => (
            <div key={group.label ?? '__top__'}>
              {/* Collapsible section header */}
              {group.label && (
                <button
                  type="button"
                  onClick={() => toggle(group.label!)}
                  className="mt-4 mb-1.5 flex w-full items-center justify-between pb-1 rounded-md transition-all duration-200 text-left premium-section-header px-1"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <span 
                    className="text-[9.5px] font-extrabold uppercase tracking-[0.28em]" 
                    style={{ color: 'rgba(253,207,111,0.65)', fontFamily: "'Inter', sans-serif" }}
                  >
                    {group.label}
                  </span>
                  <span style={{ color: 'rgba(250,246,239,0.35)' }}>
                    <Chevron open={!!expanded[group.label]} />
                  </span>
                </button>
              )}

              {/* Section items — with smooth max-height transitions */}
              <div
                className="transition-all duration-220 ease-in-out overflow-hidden"
                style={{
                  maxHeight: (!group.label || !!expanded[group.label]) ? '1000px' : '0',
                  opacity: (!group.label || !!expanded[group.label]) ? 1 : 0,
                  transform: (!group.label || !!expanded[group.label]) ? 'translateY(0)' : 'translateY(-8px)',
                  transitionProperty: 'all',
                }}
              >
                {group.items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={it.end}
                    onClick={() => setOpen(false)}
                    className="flex items-center rounded-xl px-3.5 text-[13.5px] font-semibold transition-all duration-220 mb-0.5 premium-sidebar-link"
                    style={({ isActive }) => ({
                      height: '44px',
                      gap: '12px',
                      background: isActive ? 'linear-gradient(135deg, #0C756F, #118A83)' : 'transparent',
                      color: isActive ? '#fff' : 'rgba(250,246,239,0.72)',
                      border: isActive ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                      boxShadow: isActive ? '0 8px 20px rgba(12,117,111,0.25), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                    })}
                  >
                    {it.icon && <it.icon className="h-[18px] w-[18px] shrink-0" />}
                    <span className="flex-1 min-w-0 truncate">{it.label}</span>
                    {it.badge != null && it.badge > 0 && (
                      <span style={{
                        background: '#FDCF6F', color: '#000201',
                        borderRadius: 99, padding: '1.5px 6.5px', fontSize: 10, fontWeight: 800,
                        lineHeight: '13px', flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(253,207,111,0.2)'
                      }}>{it.badge}</span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom actions sticky footer (Fixed responsiveness) */}
        <div className="shrink-0 p-4 mt-auto z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          {isAdmin && (
            <Link
              to={panel === 'admin' ? '/member' : '/admin'}
              onClick={() => setOpen(false)}
              className="mb-3 flex items-center justify-center gap-2 text-center text-[11.5px] font-bold uppercase tracking-wider transition-all duration-220 hover:-translate-y-[1.5px] shadow-sm hover:shadow-md"
              style={{ 
                height: '44px',
                background: 'linear-gradient(135deg, #FDCF6F, #F5C051)', 
                color: '#000201',
                boxShadow: '0 4px 12px rgba(253,207,111,0.18)',
                borderRadius: '12px'
              }}
            >
              <ArrowLeftRight className="h-4 w-4" strokeWidth={2.2} />
              {panel === 'admin' ? t('header.memberPanel') : t('header.adminPanel')}
            </Link>
          )}
          
          <div 
            className="flex flex-col gap-0.5 p-1.5" 
            style={{ 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.05)', 
              borderRadius: '14px' 
            }}
          >
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 text-[12.5px] font-semibold hover:bg-white/5 transition-all duration-200 premium-sidebar-link"
              style={{ height: '36px', color: 'rgba(250,246,239,0.65)' }}
            >
              <Globe className="h-[18px] w-[18px] shrink-0 text-white/45" />
              <span>{t('common.backToSite')}</span>
            </Link>
            <button
              onClick={() => { setOpen(false); handleSignOut(); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 text-[12.5px] font-semibold hover:bg-red-500/10 transition-all duration-200 text-left premium-sidebar-link"
              style={{ height: '36px', color: '#fca47e' }}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0 text-red-400/70" strokeWidth={2} />
              <span>{t('header.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[280px]">
        {/* Top bar */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
          style={{ background: PAPER, borderBottom: `1px solid ${RULE}`, boxShadow: '0 1px 8px rgba(0,2,1,0.04)' }}
        >
          <button
            className="lg:hidden rounded-[4px] p-1.5 transition-colors hover:bg-gray-100"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            style={{ color: INK }}
          >
            <ChevronDown className="h-5 w-5 rotate-90" />
          </button>

          <div className="hidden text-sm font-semibold lg:block" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
            <LanguageToggle />
            {member && (
              <Link to="/member/profile" title={t('m.profile')} className="transition-transform hover:scale-105 active:scale-95">
                <MemberAvatar avatarUrl={member.avatar_url} name={member.full_name} size={32} />
              </Link>
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
