import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ORG } from '@/data/content';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import LanguageToggle from '@/components/ui/LanguageToggle';

// Field Journal Header — brand-red bar, cream text, ink donate pill.

const BRAND = '#c2410c';
const INK   = '#1c1917';
const CREAM = '#faf6ef';

const NAV_KEYS = [
  { to: '/',         key: 'nav.home',     exact: true },
  { to: '/about',    key: 'nav.about' },
  { to: '/events',   key: 'nav.events' },
  { to: '/gallery',  key: 'nav.gallery' },
  // { to: '/programs', key: 'nav.programs' },
  // { to: '/impacts',  key: 'nav.impacts' },
  { to: '/contact',  key: 'nav.contact' },
  { to: '/volunteer',  key: 'nav.volunteer' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { member, isAdmin } = useAuth();
  const { t } = useT();

  const dashboardPath = isAdmin ? '/admin' : '/member';

  // const orgName = lang === 'en' ? ORG.shortEn : ORG.shortBn;
  const orgName = ORG.shortEn;

  return (
    <header
      className="sticky top-0 z-40 border-b"
      style={{ background: BRAND, color: CREAM, borderColor: 'rgba(255,255,255,0.12)' }}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-3.5 md:py-4">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img
            src="assets/images/favicon/android-chrome-512x512.png"
            alt="logo"
            className="h-11 w-11 site-logo"
          />
          <span className="flex flex-col leading-tight">
            <span
              className="font-bengali text-[20px] font-bold md:text-[22px]"
              style={{ fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' }}
            >
              {orgName}
            </span>
            <span className="hidden text-[10.5px] font-medium uppercase tracking-[0.18em] sm:block" style={{ color: 'rgba(250,246,239,0.75)' }}>
              Public Charitable Trust
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 text-[14px] font-medium xl:flex">
          {NAV_KEYS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className="relative pb-1 font-bengali transition-colors duration-200"
              style={({ isActive }) => ({ color: isActive ? '#fff' : 'rgba(250,246,239,0.78)' })}
            >
              {({ isActive }) => (
                <>
                  {t(link.key)}
                  {isActive && <span className="absolute -bottom-[7px] left-0 right-0 h-[2px]" style={{ background: CREAM }} />}
                </>
              )}
            </NavLink>
          ))}
          <LanguageToggle light />
          {member ? (
            <Link
              to={dashboardPath}
              className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 font-bengali text-[13px] font-semibold transition-all hover:-translate-y-[1px]"
              style={{ background: INK, color: CREAM }}
            >
              {t('header.dashboard')}
            </Link>
          ) : (
            <Link
              to="/login"
              className="font-bengali text-[13.5px] font-medium"
              style={{ color: 'rgba(250,246,239,0.85)' }}
            >
              {t('header.login')}
            </Link>
          )}
          <Link
            to="/donate"
            className="inline-flex items-center gap-1.5 rounded-full px-5 py-2 font-bengali text-[13px] font-semibold transition-all hover:-translate-y-[1px] donate-blink"
            style={{ background: INK, color: CREAM, boxShadow: '0 8px 18px -10px rgba(0,0,0,0.5)' }}
          >
            {t('nav.donate')} ❤
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button className="xl:hidden" aria-label="Toggle menu" onClick={() => setOpen((v) => !v)}>
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="border-t px-4 pb-4 xl:hidden" style={{ borderColor: 'rgba(255,255,255,0.12)', background: BRAND }}>
          <div className="flex flex-col space-y-1 pt-3 text-base">
            {NAV_KEYS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                onClick={() => setOpen(false)}
                className="rounded px-3 py-2.5 font-bengali transition-colors"
                style={({ isActive }) => ({
                  background: isActive ? 'rgba(0,0,0,0.18)' : 'transparent',
                  color: '#fff',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                {t(link.key)}
              </NavLink>
            ))}
            <div className="mt-3 border-t pt-3" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
              <div className="mb-3 flex justify-center">
                <LanguageToggle light />
              </div>
              <div className="flex flex-col gap-2">
                {member ? (
                  <Link
                    to={dashboardPath}
                    onClick={() => setOpen(false)}
                    className="rounded-full px-4 py-2.5 text-center font-bengali font-semibold"
                    style={{ background: INK, color: CREAM }}
                  >
                    {t('header.dashboard')}
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-full border px-4 py-2.5 text-center font-bengali font-semibold"
                    style={{ borderColor: 'rgba(255,255,255,0.30)', color: '#fff' }}
                  >
                    {t('header.login')}
                  </Link>
                )}
                <Link
                  to="/donate"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-4 py-2.5 text-center font-bengali font-semibold donate-blink"
                  style={{ background: INK, color: CREAM }}
                >
                  {t('nav.donate')} ❤
                </Link>
              </div>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
