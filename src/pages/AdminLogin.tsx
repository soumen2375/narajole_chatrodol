import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { ORG } from '@/data/content';

const SERIF_BN = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };
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
        setError(lang === 'bn'
          ? 'এই পেজটি শুধুমাত্র অ্যাডমিনদের জন্য। সদস্য লগইনের জন্য সদস্য লগইন পেজ ব্যবহার করুন।'
          : 'This page is for administrators only. Please use the Member Login page instead.');
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
    <div className="flex min-h-screen flex-col" style={{ background: CREAM }}>
      {/* Top strip — dark admin style */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ background: ADMIN_DARK, borderBottom: `1px solid rgba(255,255,255,0.08)` }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <img src="assets/images/favicon/android-chrome-512x512.png" alt="logo" className="h-8 w-8 site-logo" style={{ background: CREAM }} />
          <div>
            <span className="block text-[15px] font-bold" style={{ ...SERIF_BN, color: CREAM }}>{lang === 'en' ? ORG.shortEn : ORG.shortBn}</span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Admin Portal</span>
          </div>
        </Link>
        <LanguageToggle light />
      </div>

      {/* Center card */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
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

          <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.18em]">
            <Link to="/" style={{ color: MUTED }} className="transition-colors hover:opacity-70">
              ← {t('common.backToHome')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
