import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  IconHome,
  IconPerson,
  IconCalendar,
  IconPhoto,
  IconPeople,
  IconPhone,
} from '@/components/site/NavIcons';
import { getMemberAvatarUrl } from '@/lib/avatar';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { member, isAdmin } = useAuth();
  const { pathname } = useLocation();

  const dashboardPath = isAdmin ? '/admin' : '/member';

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Header stays pinned; it only gains a hairline + lift once the page moves.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { to: '/', label: 'Home', icon: IconHome, exact: true },
    { to: '/about', label: 'About', icon: IconPerson },
    { to: '/events', label: 'Events', icon: IconCalendar },
    { to: '/gallery', label: 'Gallery', icon: IconPhoto },
    { to: '/contact', label: 'Contact', icon: IconPhone },
    { to: '/volunteer', label: 'Volunteer', icon: IconPeople },
  ];

  // User details for profile pill when logged in
  const userName = member?.full_name || 'Member';
  const userAvatar = getMemberAvatarUrl(member) || '/assets/images/about/members/soumen.jpg';

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-site-green transition-shadow duration-300 ${
        scrolled ? 'border-b border-white/10 shadow-[0_10px_30px_-18px_rgba(10,59,47,0.9)]' : ''
      }`}
    >
      <div className="mx-auto flex h-[76px] w-full max-w-[1340px] items-center gap-3 px-5 sm:px-8 xl:gap-6">
        {/* 1. BRAND LOGO & NAME */}
        <Link
          to="/"
          className="group flex flex-none items-center gap-2.5"
          onClick={() => setOpen(false)}
        >
          <span className="flex h-[44px] w-[44px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-[3px] lg:h-[42px] lg:w-[42px] xl:h-[52px] xl:w-[52px]">
            <img
              src="/assets/images/logo.png"
              alt="Chhatradol Official Logo"
              className="h-full w-full rounded-full object-contain"
              onError={(e) => { e.currentTarget.src = '/assets/images/Chhatradol.jpg'; }}
            />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="wordmark whitespace-nowrap text-[17px] text-white sm:text-[19px] lg:text-[17px] xl:text-[22px]">
              Chhatradol
            </span>
            <span className="mt-1 block whitespace-nowrap text-[6.5px] font-bold uppercase tracking-[0.12em] text-white/70 sm:mt-1.5 sm:text-[8px] sm:tracking-[0.16em]">
              SOCIAL WELFARE ORGANIZATION
            </span>
          </span>
        </Link>

        {/* 2. CENTER NAV LINKS — icons appear once there is room for them */}
        <nav className="ml-auto hidden items-center gap-1 lg:flex xl:gap-1.5">
          {navLinks.map((item) => {
            const IconComp = item.icon;
            return (
              <NavLink key={item.to + item.label} to={item.to} end={item.exact}>
                {({ isActive }) =>
                  isActive ? (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-3 py-2.5 font-dmsans text-[13.5px] font-bold text-site-green xl:px-4 xl:text-[14px]">
                      <IconComp className="hidden shrink-0 xl:block" />
                      <span>{item.label}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-2.5 font-dmsans text-[13.5px] font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-site-yellow xl:px-3.5 xl:text-[14px]">
                      <IconComp className="hidden shrink-0 xl:block" />
                      <span>{item.label}</span>
                    </span>
                  )
                }
              </NavLink>
            );
          })}
        </nav>

        {/* 3. RIGHT SECTION: PROFILE/LOGIN + DONATE */}
        <div className="hidden flex-none items-center gap-2.5 lg:flex">
          {member ? (
            <Link
              to={dashboardPath}
              className="flex items-center gap-2.5 rounded-full border border-white/30 py-1.5 pl-1.5 pr-4 transition-colors hover:border-site-yellow"
            >
              <img
                src={userAvatar}
                alt={userName}
                className="h-8 w-8 shrink-0 rounded-full object-cover"
                onError={(e) => { e.currentTarget.src = '/assets/images/members/soumen.jpg'; }}
              />
              <span className="flex flex-col text-left leading-tight">
                <span className="max-w-[80px] truncate font-dmsans text-[12.5px] font-bold text-white xl:max-w-[104px]">
                  {userName}
                </span>
                <span className="whitespace-nowrap font-dmsans text-[10px] font-bold text-site-yellow">
                  Dashboard
                </span>
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border border-white/40 px-4 font-dmsans text-[13.5px] font-bold text-white transition-colors hover:border-site-yellow hover:text-site-yellow xl:px-5 xl:text-[14px]"
            >
              <IconPerson className="shrink-0" />
              <span>Login</span>
            </Link>
          )}

          <Link
            to="/donate"
            className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full bg-site-yellow px-5 font-dmsans text-[14px] font-bold text-site-ink transition-all hover:brightness-95 xl:px-7 xl:text-[15px]"
          >
            <span>Donate</span>
          </Link>
        </div>

        {/* 4. MOBILE / TABLET RIGHT ACTIONS */}
        <div className="ml-auto flex flex-none items-center gap-2 lg:hidden">
          <Link
            to="/donate"
            className="hidden min-h-[44px] items-center whitespace-nowrap rounded-full bg-site-yellow px-5 font-dmsans text-[14px] font-bold text-site-ink sm:inline-flex"
          >
            <span>Donate</span>
          </Link>

          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
            aria-label="Toggle Navigation Menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 5. MOBILE & TABLET DRAWER */}
      {open && (
        <>
          <div
            className="fixed inset-0 top-[76px] z-40 bg-black/50 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50 max-h-[78vh] overflow-y-auto rounded-b-[36px] bg-site-green px-5 pb-8 pt-2 sm:px-8 lg:hidden">
            <div className="grid gap-1">
              {navLinks.map((item) => {
                const IconComp = item.icon;
                return (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.exact}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex min-h-[48px] items-center gap-3 rounded-full px-5 font-dmsans text-[15px] transition-colors ${
                        isActive
                          ? 'bg-white font-bold text-site-green'
                          : 'font-medium text-white/85 hover:bg-white/10 hover:text-site-yellow'
                      }`
                    }
                  >
                    <IconComp className="shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-3 border-t border-white/15 pt-5">
              {member ? (
                <Link
                  to={dashboardPath}
                  onClick={() => setOpen(false)}
                  className="flex min-h-[56px] items-center gap-3 rounded-full border border-white/25 py-2 pl-2 pr-5"
                >
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/assets/images/members/soumen.jpg'; }}
                  />
                  <span className="flex flex-col text-left leading-tight">
                    <span className="font-dmsans text-[14px] font-bold text-white">{userName}</span>
                    <span className="font-dmsans text-[11px] font-bold text-site-yellow">View Dashboard</span>
                  </span>
                </Link>
              ) : (
                <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost-light w-full">
                  <IconPerson className="shrink-0" />
                  <span>Login</span>
                </Link>
              )}

              <Link to="/donate" onClick={() => setOpen(false)} className="btn-yellow w-full">
                <span>Donate</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
