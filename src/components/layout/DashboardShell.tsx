import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import LanguageToggle from '@/components/ui/LanguageToggle';

export interface NavItem {
  to: string;
  label: string;
  end?: boolean;
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

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-gray-900 text-gray-200 transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 border-b border-gray-700 px-5 py-4">
          <img src="/assets/images/favicon/favicon512.png" alt="" className="h-8 w-8 rounded-full bg-white p-0.5" />
          <span className="font-bold">{title}</span>
        </div>
        <nav className="flex flex-col gap-1 p-3 text-sm">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 transition hover:bg-gray-800 ${isActive ? 'bg-blue-600 text-white' : ''}`
              }
            >
              {it.label}
            </NavLink>
          ))}

          {isAdmin && (
            <Link
              to={panel === 'admin' ? '/member' : '/admin'}
              className="mt-2 rounded-md bg-gray-800 px-3 py-2 text-center font-medium text-amber-300 transition hover:bg-gray-700"
            >
              {panel === 'admin' ? t('header.memberPanel') : t('header.adminPanel')}
            </Link>
          )}
          <Link to="/" className="mt-1 rounded-md px-3 py-2 text-gray-400 transition hover:bg-gray-800">
            {t('common.backToSite')}
          </Link>
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b bg-white px-4 py-3 shadow-sm">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex flex-1 items-center justify-end gap-4">
            <LanguageToggle />
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-800">{member?.full_name}</p>
              <p className="text-xs text-gray-500">{member?.role === 'admin' ? t('common.admin') : t('common.member')}</p>
            </div>
            <button onClick={handleSignOut} className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200">
              {t('header.logout')}
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
