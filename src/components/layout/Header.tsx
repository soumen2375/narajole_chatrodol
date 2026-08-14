import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  FaHouse,
  FaUser,
  FaCalendarDays,
  FaImage,
  FaPhone,
  FaUsers,
  FaHeart,
  FaChevronDown,
} from 'react-icons/fa6';

const BRAND_BG = '#c2410c';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { member, isAdmin } = useAuth();

  const dashboardPath = isAdmin ? '/admin' : '/member';

  const navLinks = [
    { to: '/', label: 'Home', icon: FaHouse, exact: true },
    { to: '/about', label: 'About', icon: FaUser },
    { to: '/events', label: 'Events', icon: FaCalendarDays },
    { to: '/gallery', label: 'Gallery', icon: FaImage },
    { to: '/contact', label: 'Contact', icon: FaPhone },
    { to: '/volunteer', label: 'Volunteer', icon: FaUsers },
  ];

  // User details for profile pill when logged in
  const userName = member?.full_name || 'Soumen Maity';
  const userAvatar = member?.avatar_url || '/assets/images/members/soumen.jpg';

  return (
    <header className="sticky top-0 z-50 w-full px-2 sm:px-4 py-2.5 md:py-3.5 transition-all duration-300">
      <div
        className="mx-auto flex max-w-[1380px] items-center justify-between rounded-[18px] md:rounded-[22px] border border-amber-500/25 px-4 sm:px-6 py-2.5 md:py-3 shadow-2xl backdrop-blur-md text-white transition-all"
        style={{ background: BRAND_BG }}
      >
        {/* 1. BRAND LOGO & NAME */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group" onClick={() => setOpen(false)}>
          <div className="relative flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/50 bg-white p-0.5 shadow-md transition-transform duration-300 group-hover:scale-105">
            <img
              src="/assets/images/logo.png"
              alt="Chhatradol Official Logo"
              className="h-full w-full object-cover scale-110 rounded-full"
              onError={(e) => { e.currentTarget.src = '/assets/images/Chhatradol.jpg'; }}
            />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span
              className="text-base sm:text-xl md:text-[24px] font-bold text-white tracking-tight truncate"
              style={{ fontFamily: '"Noto Serif", Georgia, serif' }}
            >
              Chhatradol
            </span>
            <span className="block text-[7px] xs:text-[8px] sm:text-[8.5px] md:text-[9.5px] font-bold tracking-[0.12em] sm:tracking-[0.18em] uppercase text-white/90 truncate">
              SOCIAL WELFARE ORGANIZATION
            </span>
          </div>
        </Link>

        <div className="hidden xl:block h-7 w-px bg-white/25 mx-2" />

        {/* 2. CENTER NAV LINKS WITH ICONS */}
        <nav className="hidden items-center gap-1.5 xl:gap-2.5 font-medium xl:flex">
          {navLinks.map((item) => {
            const IconComp = item.icon;
            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.exact}
              >
                {({ isActive }) => (
                  isActive ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[14px] font-bold shadow-md transition-all text-[#c2410c]">
                      <IconComp className="h-4 w-4 text-[#c2410c]" />
                      <span>{item.label}</span>
                    </div>
                  ) : (
                    <div className="group inline-flex items-center gap-2 rounded-full px-3 py-2 text-[14px] font-semibold text-white/90 transition-colors hover:bg-white/10 hover:text-white">
                      <IconComp className="h-4 w-4 opacity-90 transition-transform group-hover:scale-110" />
                      <span>{item.label}</span>
                    </div>
                  )
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* 3. RIGHT SECTION: PROFILE/LOGIN + DONATE */}
        <div className="hidden xl:flex items-center gap-3 shrink-0">
          {/* Profile Badge (logged in) vs Login Button (logged out) */}
          {member ? (
            <Link
              to={dashboardPath}
              className="flex items-center gap-2.5 rounded-full border border-amber-300/40 bg-black/15 px-3.5 py-1.5 transition-all hover:bg-black/25 active:scale-95"
            >
              <img
                src={userAvatar}
                alt={userName}
                className="h-8 w-8 rounded-full border border-amber-300 object-cover"
                onError={(e) => { e.currentTarget.src = '/assets/images/members/soumen.jpg'; }}
              />
              <div className="flex flex-col text-left leading-tight">
                <span className="text-xs font-bold text-white max-w-[100px] truncate">{userName}</span>
                <span className="text-[10px] font-semibold text-amber-300 flex items-center gap-0.5">
                  Dashboard <FaChevronDown className="h-2 w-2" />
                </span>
              </div>
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-bold text-white transition-all"
            >
              <FaUser className="h-4 w-4 text-white/90" />
              <span>Login</span>
            </Link>
          )}

          {/* Donate Pill Button */}
          <Link
            to="/donate"
            className="inline-flex items-center gap-2 rounded-full bg-white px-5 sm:px-6 py-2.5 text-sm md:text-[15px] font-extrabold text-[#c2410c] shadow-lg transition-all duration-200 hover:bg-amber-50 hover:scale-105 active:scale-95"
          >
            <FaHeart className="h-4 w-4 text-rose-600" />
            <span>Donate</span>
          </Link>
        </div>

        {/* 4. MOBILE / TABLET RIGHT ACTIONS */}
        <div className="flex items-center gap-2 xl:hidden shrink-0">
          <Link
            to="/donate"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs sm:text-sm font-bold text-[#c2410c] shadow-md hover:bg-amber-50 transition-all"
          >
            <FaHeart className="h-3.5 w-3.5 text-rose-600" />
            <span>Donate</span>
          </Link>

          <button
            className="rounded-xl p-2 text-white hover:bg-white/15 transition-colors focus:outline-none"
            aria-label="Toggle Navigation Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 5. MOBILE & TABLET DRAWER */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-50 mt-2 mx-auto max-w-[1380px] max-h-[82vh] overflow-y-auto rounded-[18px] border border-white/15 bg-[#c2410c] p-4 shadow-2xl xl:hidden animate-fade-in text-white">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {navLinks.map((item) => {
                const IconComp = item.icon;
                return (
                  <NavLink
                    key={item.to + item.label}
                    to={item.to}
                    end={item.exact}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                        isActive ? 'bg-white text-[#c2410c] shadow-md font-bold' : 'text-white/90 hover:bg-white/15'
                      }`
                    }
                  >
                    <IconComp className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2.5 border-t border-white/20 pt-3.5">
              {member ? (
                <Link
                  to={dashboardPath}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl border border-amber-300/40 bg-black/20 px-4 py-3 transition-colors hover:bg-black/30"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="h-8 w-8 rounded-full border border-amber-300 object-cover"
                      onError={(e) => { e.currentTarget.src = '/assets/images/members/soumen.jpg'; }}
                    />
                    <div className="flex flex-col text-left leading-tight">
                      <span className="font-bold text-sm text-white">{userName}</span>
                      <span className="text-[10px] text-amber-300 font-semibold">View Dashboard</span>
                    </div>
                  </div>
                  <span className="text-xs text-amber-300 font-bold">Dashboard ➔</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 py-3 text-sm font-bold text-white shadow-sm hover:bg-white/20 transition-all"
                >
                  <FaUser className="h-4 w-4" />
                  <span>Login / Register</span>
                </Link>
              )}

              <Link
                to="/donate"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-2 rounded-full bg-white py-3 text-center text-sm font-extrabold text-[#c2410c] shadow-md hover:bg-amber-50 transition-all"
              >
                <FaHeart className="h-4 w-4 text-rose-600" />
                <span>Donate Now</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
