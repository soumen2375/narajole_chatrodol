import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { NAV_LINKS, ORG } from '@/data/content';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { member, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const dashboardPath = isAdmin ? '/admin' : '/member';

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-blue-700 text-white shadow-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white p-1">
            <img src="/assets/images/favicon/favicon512.png" alt="logo" className="h-7 w-7 rounded-full object-contain" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-xl font-bold md:text-2xl">{ORG.nameBn}</span>
            <span className="hidden text-[11px] font-medium text-blue-100 sm:block">
              Chhatradol Social Welfare Organisation
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-5 text-[15px] font-medium xl:flex">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) =>
                `pb-1 transition hover:text-blue-200 ${isActive ? 'border-b-2 border-white' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          {member ? (
            <div className="flex items-center gap-3">
              <Link
                to={dashboardPath}
                className="rounded-full bg-white px-4 py-1.5 font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                ড্যাশবোর্ড
              </Link>
              <button onClick={handleSignOut} className="text-sm text-blue-100 hover:text-white">
                লগআউট
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-full bg-amber-500 px-4 py-1.5 font-semibold text-white transition hover:bg-amber-600"
            >
              সদস্য লগইন
            </Link>
          )}
        </nav>

        <button
          className="xl:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <nav className="border-t border-blue-600 bg-blue-700 px-4 pb-4 xl:hidden">
          <div className="flex flex-col space-y-1 pt-2 text-base">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.exact}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded px-3 py-2 transition hover:bg-blue-600 ${isActive ? 'bg-blue-800 font-semibold' : ''}`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="mt-2 border-t border-blue-600 pt-3">
              {member ? (
                <div className="flex flex-col gap-2">
                  <Link
                    to={dashboardPath}
                    onClick={() => setOpen(false)}
                    className="rounded bg-white px-3 py-2 text-center font-semibold text-blue-700"
                  >
                    ড্যাশবোর্ড
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="rounded bg-blue-800 px-3 py-2 text-center font-semibold"
                  >
                    লগআউট
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded bg-amber-500 px-3 py-2 text-center font-semibold text-white"
                >
                  সদস্য লগইন
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
