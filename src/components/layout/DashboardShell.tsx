import { useMemo, useState, useEffect, Suspense } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import NotificationBell from '@/components/ui/NotificationBell';
import { memberDisplayId } from '@/types';
import { PageSkeleton } from '@/components/ui/Skeleton';
import MemberAvatar from '@/components/ui/MemberAvatar';
import { 
  ChevronDown, 
  LogOut, 
  Globe, 
  ArrowLeftRight,
  ExternalLink,
  MoreHorizontal
} from 'lucide-react';

const INK    = '#000201'; // Charcoal black
const CREAM  = '#efeadb'; // Elegant warm off-white
const PAPER  = '#ffffff'; // Pure white
const RULE   = '#e5dec9'; // Warm border

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
  const location = useLocation();

  const groups = useMemo(() => groupItems(items), [items]);

  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of groups) {
      if (group.label) {
        const hasActive = group.items.some((it) => {
          if (it.end) return location.pathname === it.to;
          return location.pathname.startsWith(it.to);
        });
        if (hasActive) {
          initial[group.label] = true;
        }
      }
    }
    return initial;
  });

  useEffect(() => {
    for (const group of groups) {
      if (group.label) {
        const hasActive = group.items.some((it) => {
          if (it.end) return location.pathname === it.to;
          return location.pathname.startsWith(it.to);
        });
        if (hasActive) {
          setExpanded((prev) => ({ ...prev, [group.label!]: true }));
        }
      }
    }
  }, [location.pathname, groups]);

  const toggle = (label: string) => setExpanded((p) => ({ ...p, [label]: !p[label] }));

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayId = member ? memberDisplayId(member) : '';

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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: CREAM }}>
      {/* Mobile Sidebar Overlay Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-3 bottom-3 left-3 z-40 flex w-[270px] sm:w-[280px] flex-col transform transition-transform duration-200 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full -ml-3'
        }`}
        style={{ 
          background: '#070f0e', 
          color: CREAM,
          border: '1px solid rgba(12, 117, 111, 0.25)',
          borderRadius: '20px',
          fontFamily: "'Inter', sans-serif",
          boxShadow: '0 8px 32px rgba(0, 10, 10, 0.45)',
        }}
      >
        {/* Subtle Brand Glow behind active area */}
        <div 
          className="absolute pointer-events-none rounded-full" 
          style={{
            top: '20%',
            left: '-40px',
            width: '200px',
            height: '200px',
            background: '#14b8a6',
            filter: 'blur(70px)',
            opacity: 0.12,
            zIndex: 0
          }}
        />

        {/* Sidebar header (Glass Card design matching image) */}
        <div className="p-3 pb-1 shrink-0 z-10">
          <div
            className="relative flex flex-col gap-3.5 p-4"
            style={{
              background: 'rgba(12, 117, 111, 0.04)',
              border: '1px solid rgba(12, 117, 111, 0.18)',
              borderRadius: '16px',
            }}
          >
            {/* Top row: Avatar, Name & Role, Dots menu */}
            <div className="flex items-center gap-3">
              <MemberAvatar member={member} name={member?.full_name ?? title} size={42} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold leading-tight" style={{ fontSize: 14, color: '#ffffff' }}>
                  {member?.full_name ?? title}
                </div>
                <div className="mt-0.5 font-mono text-[9px] text-gray-400 uppercase tracking-wider">
                  {displayId} · {roleLabel}
                </div>
              </div>
              
              <button 
                type="button"
                onClick={() => navigate('/member/profile')}
                className="text-gray-400 hover:text-white transition-colors p-1"
                title={t('m.profile')}
              >
                <MoreHorizontal className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Bottom row: Badge (Super Administrator) & Online indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 mt-0.5">
              <span 
                className="px-2.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wider rounded-md"
                style={{ 
                  color: '#f3c473', 
                  border: '1px solid rgba(243, 196, 115, 0.28)',
                  background: 'rgba(243, 196, 115, 0.04)'
                }}
              >
                {panel === 'admin' ? 'SUPER ADMINISTRATOR' : 'MEMBER PORTAL'}
              </span>
              
              <div className="flex items-center gap-1.5 text-[9.5px] text-teal-400 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          className="absolute top-3 right-3 lg:hidden flex items-center justify-center rounded-full p-1.5 transition-colors hover:bg-white/10"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          style={{ color: 'rgba(250,246,239,0.7)', zIndex: 20 }}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable nav area */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2 z-10 premium-sidebar-nav">
          {groups.map((group) => (
            <div key={group.label ?? '__top__'}>
              {/* Collapsible section header */}
              {group.label && (
                <button
                  type="button"
                  onClick={() => toggle(group.label!)}
                  className="mt-4 mb-1.5 flex w-full items-center justify-between pb-1 rounded-md transition-all duration-200 text-left premium-section-header px-1.5"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                >
                  <span 
                    className="text-[9.5px] font-extrabold uppercase tracking-[0.25em]" 
                    style={{ color: 'rgba(250,246,239,0.45)', fontFamily: "'Inter', sans-serif" }}
                  >
                    {group.label}
                  </span>
                  <span style={{ color: 'rgba(250,246,239,0.3)' }}>
                    <Chevron open={!!expanded[group.label]} />
                  </span>
                </button>
              )}

              {/* Section items — with smooth max-height transitions */}
              <div
                className="transition-all duration-200 ease-in-out overflow-hidden"
                style={{
                  maxHeight: !group.label ? 'none' : (expanded[group.label] ? '700px' : '0'),
                  opacity: (!group.label || !!expanded[group.label]) ? 1 : 0,
                  transform: (!group.label || !!expanded[group.label]) ? 'translateY(0)' : 'translateY(-8px)',
                  transitionProperty: !group.label ? 'none' : 'all',
                }}
              >
                {group.items.map((it) => {
                  const isItActive = it.end ? location.pathname === it.to : location.pathname.startsWith(it.to);
                  return (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      end={it.end}
                      onClick={() => setOpen(false)}
                      className="flex items-center px-3.5 text-[13.5px] font-semibold transition-all duration-200 mb-0.5 premium-sidebar-link"
                      style={() => ({
                        height: '44px',
                        gap: '12px',
                        background: isItActive ? 'linear-gradient(90deg, rgba(20, 184, 166, 0.12) 0%, rgba(20, 184, 166, 0.02) 100%)' : 'transparent',
                        color: isItActive ? '#14b8a6' : 'rgba(250,246,239,0.75)',
                        borderLeft: isItActive ? '3px solid #14b8a6' : '3px solid transparent',
                        borderTopLeftRadius: '0px',
                        borderBottomLeftRadius: '0px',
                        borderTopRightRadius: '12px',
                        borderBottomRightRadius: '12px',
                        paddingLeft: isItActive ? '12px' : '15px',
                      })}
                    >
                      {it.icon && (
                        <it.icon 
                          className="h-[18px] w-[18px] shrink-0" 
                          style={{ color: isItActive ? '#14b8a6' : 'rgba(20, 184, 166, 0.45)' }} 
                        />
                      )}
                      <span className="flex-1 min-w-0 truncate">{it.label}</span>
                      {it.badge != null && it.badge > 0 && (
                        <span style={{
                          background: '#f3c473', color: '#081212',
                          borderRadius: 99, padding: '1.5px 6.5px', fontSize: 10, fontWeight: 800,
                          lineHeight: '13px', flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(243,196,115,0.2)'
                        }}>{it.badge}</span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom actions sticky footer (Fixed responsiveness) */}
        <div className="shrink-0 p-3 mt-auto z-10" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          {isAdmin && (
            <Link
              to={panel === 'admin' ? '/member' : '/admin'}
              onClick={() => setOpen(false)}
              className="mb-3 flex items-center justify-between px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider transition-all duration-200 hover:-translate-y-[1px] shadow-sm hover:shadow-md"
              style={{ 
                height: '44px',
                background: 'linear-gradient(135deg, #f3c473, #f5c051)', 
                color: '#081212',
                boxShadow: '0 4px 12px rgba(243,196,115,0.22)',
                borderRadius: '12px'
              }}
            >
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" strokeWidth={2.4} />
                <span>{panel === 'admin' ? 'Switch to Member Panel' : 'Switch to Admin Panel'}</span>
              </div>
              <span className="font-mono text-[13px] opacity-70">&gt;</span>
            </Link>
          )}
          
          <div 
            className="flex flex-col gap-0.5 p-1.5" 
            style={{ 
              background: 'rgba(255,255,255,0.01)', 
              border: '1px solid rgba(255,255,255,0.03)', 
              borderRadius: '14px' 
            }}
          >
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 text-[12.5px] font-semibold hover:bg-white/5 transition-all duration-200"
              style={{ height: '36px', color: 'rgba(250,246,239,0.65)' }}
            >
              <div className="flex items-center gap-3">
                <Globe className="h-[18px] w-[18px] shrink-0 text-white/35" />
                <span>Visit Website</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-white/35" />
            </Link>
            
            <button
              onClick={() => { setOpen(false); handleSignOut(); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 text-[12.5px] font-semibold hover:bg-red-500/10 transition-all duration-200 text-left"
              style={{ height: '36px', color: '#fca47e' }}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0 text-red-400/80" strokeWidth={2} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-30 lg:hidden transition-all duration-200 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.4)' }}
        onClick={() => setOpen(false)} 
      />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col h-screen p-3 lg:pl-[304px]">
        <div 
          className="flex flex-1 flex-col overflow-hidden shadow-sm"
          style={{
            background: CREAM,
            border: `1px solid ${RULE}`,
            borderRadius: '20px',
          }}
        >
          {/* Top bar */}
          <header
            className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: PAPER, borderBottom: `1px solid ${RULE}`, boxShadow: '0 1px 8px rgba(0,2,1,0.04)' }}
          >
            <button
              className="lg:hidden rounded-[8px] p-2 transition-colors hover:bg-gray-100 active:bg-gray-200"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              style={{ color: INK }}
            >
              {open ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>

            <div className="hidden text-sm font-semibold lg:block" style={{ color: INK, fontFamily: '"Noto Serif Bengali", serif' }}>
            </div>

            <div className="flex items-center gap-3">
              <NotificationBell />
              {member && (
                <Link to="/member/profile" title={t('m.profile')} className="transition-transform hover:scale-105 active:scale-95">
                  <MemberAvatar member={member} size={32} />
                </Link>
              )}
            </div>
          </header>

          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
