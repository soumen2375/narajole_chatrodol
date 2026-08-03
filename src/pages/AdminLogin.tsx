import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';

import Breadcrumb from '@/components/ui/Breadcrumb';

const SERIF_BN = { fontFamily: '"Noto Serif", Georgia, serif' };
const INK    = '#1c1917';
const CREAM  = '#faf6ef';
const BRAND  = '#c2410c';
const PAPER  = '#ffffff';
const RULE   = '#e7e5e4';
const MUTED  = '#78716c';
const ADMIN_DARK = '#0f172a'; // dark navy for admin accent

export default function AdminLogin() {
  const { signIn, signOut } = useAuth();
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const m = await signIn(email, password);
      if (m.role !== 'admin') {
        setError('This page is for administrators only. Please use the Member Login page instead.');
        await signOut();
        return;
      }
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: CREAM }}>
      <Breadcrumb title="Admin Login" />

      {/* Center card */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 md:py-16">
        <div className="w-full max-w-md">
          <h1 className="font-bengali text-[36px] leading-tight" style={{ ...SERIF_BN, color: INK }}>
            {lang === 'bn' ? 'অ্যাডমিন লগইন' : 'Admin Login'}
          </h1>
          <p className="mt-2 mb-8 font-bengali text-[14px]" style={{ color: MUTED }}>
            {lang === 'bn' ? 'অ্যাডমিন প্যানেলে প্রবেশ করুন।' : 'Sign in to the admin panel.'}
          </p>

          <div
            className="rounded-[4px] p-8"
            style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 8px 30px -10px rgba(15,23,42,0.14)' }}
          >
            {error && (
              <div
                className="mb-5 rounded-[4px] px-4 py-3 font-bengali text-[13px]"
                style={{ background: 'rgba(15,23,42,0.06)', border: `1px solid rgba(15,23,42,0.14)`, color: ADMIN_DARK }}
              >
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>
                  {t('common.email')}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-[4px] border bg-transparent px-4 py-3 text-[14px] outline-none transition-colors"
                  style={{ borderColor: RULE, color: INK }}
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>
                  {t('login.password')}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-[4px] border bg-transparent px-4 py-3 text-[14px] outline-none transition-colors"
                  style={{ borderColor: RULE, color: INK }}
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full py-3.5 font-bengali text-[14px] font-semibold text-white transition-all hover:-translate-y-[1px] disabled:opacity-60"
                style={{ background: ADMIN_DARK, boxShadow: '0 8px 20px -8px rgba(15,23,42,0.45)' }}
              >
                {loading ? t('login.loggingIn') : (lang === 'bn' ? 'অ্যাডমিন লগইন' : 'Sign in as Admin')}
              </button>
            </form>
          </div>

          <div
            className="mt-5 rounded-[4px] px-5 py-4 font-bengali text-[13px]"
            style={{ background: 'rgba(15,23,42,0.05)', border: `1px solid rgba(15,23,42,0.10)`, color: '#374151' }}
          >
            {lang === 'bn' ? 'সদস্য? ' : 'Not an admin? '}
            <Link to="/login" className="font-semibold underline underline-offset-2" style={{ color: BRAND }}>
              {lang === 'bn' ? 'সদস্য লগইন পেজে যান' : 'Go to Member Login'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
