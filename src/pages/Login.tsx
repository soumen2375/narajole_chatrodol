import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import { ORG } from '@/data/content';
import { supabase } from '@/lib/supabase';

const SERIF_BN = { fontFamily: '"Noto Serif Bengali", "Noto Sans Bengali", serif' };
const INK    = '#1c1917';
const CREAM  = '#faf6ef';
const BRAND  = '#c2410c';
const PAPER  = '#ffffff';
const RULE   = '#e7e5e4';
const MUTED  = '#78716c';

export default function Login() {
  const { signIn } = useAuth();
  const { t, lang } = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const m = await signIn(email, password);
      if (m.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/member');
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : 'PAYMENT_FAILED';
      // Translate internal error codes to user-friendly messages
      const displayMsg = m === 'PAYMENT_FAILED'
        ? (lang === 'bn'
          ? 'পেমেন্ট গেটওয়ে লোড হয়নি। ইন্টারনেট সংযোগ চেক করুন।'
          : 'Payment gateway could not load. Please check your internet connection.')
        : m;
      setError(displayMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotStatus('sending');
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/login?reset=1`,
    });
    setForgotStatus(error ? 'error' : 'sent');
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: CREAM }}>
      {/* Top strip */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ background: BRAND, borderBottom: `1px solid rgba(255,255,255,0.12)` }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/images/logo.png" alt="logo" className="h-9 w-9 rounded-full object-contain bg-white p-0.5" />
          <div>
            <span className="block text-[15px] font-bold" style={{ ...SERIF_BN, color: CREAM }}>{lang === 'en' ? ORG.shortEn : ORG.shortBn}</span>
            <span className="block font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.55)' }}>Member Portal</span>
          </div>
        </Link>
      </div>

      {/* Center card */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <h1 className="font-bengali text-[36px] leading-tight" style={{ ...SERIF_BN, color: INK }}>
            {lang === 'bn' ? 'সদস্য লগইন' : 'Member Login'}
          </h1>
          <p className="mt-2 mb-8 font-bengali text-[14px]" style={{ color: MUTED }}>
            {lang === 'bn' ? 'সদস্য প্যানেলে প্রবেশ করুন।' : 'Sign in to your member panel.'}
          </p>

          <div
            className="rounded-[4px] p-8"
            style={{ background: PAPER, border: `1px solid ${RULE}`, boxShadow: '0 8px 30px -10px rgba(28,25,23,0.12)' }}
          >
            {error && (
              <div
                className="mb-5 rounded-[4px] px-4 py-3 font-bengali text-[13px]"
                style={{ background: 'rgba(194,65,12,0.08)', border: `1px solid rgba(194,65,12,0.2)`, color: BRAND }}
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
                  className="w-full rounded-[4px] border bg-transparent px-4 py-3 text-[14px] outline-none transition-colors focus:border-[#c2410c]"
                  style={{ borderColor: RULE, color: INK }}
                  placeholder="your@email.com"
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
                  className="w-full rounded-[4px] border bg-transparent px-4 py-3 text-[14px] outline-none transition-colors focus:border-[#c2410c]"
                  style={{ borderColor: RULE, color: INK }}
                  placeholder="••••••••"
                />
              </div>
              {/* Forgot password link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="font-bengali text-[12.5px] transition-opacity hover:opacity-70"
                  style={{ color: BRAND }}
                >
                  {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                </button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full py-3.5 font-bengali text-[14px] font-semibold text-white transition-all hover:-translate-y-[1px] disabled:opacity-60"
                style={{ background: BRAND, boxShadow: '0 8px 20px -8px rgba(194,65,12,0.55)' }}
              >
                {loading ? t('login.loggingIn') : t('login.button')}
              </button>
            </form>
          </div>

          {/* Note */}
          <div
            className="mt-5 rounded-[4px] px-5 py-4 font-bengali text-[13px]"
            style={{ background: 'rgba(180,83,9,0.07)', border: `1px solid rgba(180,83,9,0.15)`, color: '#92400e' }}
          >
            {t('login.note')}{' '}
            <Link to="/volunteer" className="font-semibold underline underline-offset-2">{t('login.applyHere')}</Link>।
          </div>

          {/* Admin link */}
          <div
            className="mt-3 rounded-[4px] px-5 py-4 font-bengali text-[13px]"
            style={{ background: 'rgba(15,23,42,0.04)', border: `1px solid rgba(15,23,42,0.08)`, color: '#374151' }}
          >
            {lang === 'bn' ? 'অ্যাডমিন? ' : 'Administrator? '}
            <Link to="/admin-login" className="font-semibold underline underline-offset-2" style={{ color: '#0f172a' }}>
              {lang === 'bn' ? 'অ্যাডমিন লগইন পেজে যান' : 'Go to Admin Login'}
            </Link>
          </div>

          {/* Forgot password modal */}
          {forgotMode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <div className="w-full max-w-sm rounded-[4px] p-8" style={{ background: PAPER, border: `1px solid ${RULE}` }}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bengali text-[22px] font-bold" style={{ ...SERIF_BN, color: INK }}>
                    {lang === 'bn' ? 'পাসওয়ার্ড রিসেট' : 'Reset Password'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setForgotStatus('idle'); setForgotEmail(''); }}
                    className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/5"
                    style={{ color: MUTED }}
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 mb-5 font-bengali text-[13px]" style={{ color: MUTED }}>
                  {lang === 'bn' ? 'আপনার ইমেল দিন, আমরা রিসেট লিংক পাঠাব।' : 'Enter your email and we will send a reset link.'}
                </p>
                {forgotStatus === 'sent' ? (
                  <div className="rounded-[4px] px-4 py-3 font-bengali text-[13px]" style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', color: '#15803d' }}>
                    {lang === 'bn' ? '✓ রিসেট লিংক পাঠানো হয়েছে। আপনার ইমেল চেক করুন।' : '✓ Reset link sent. Please check your email.'}
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-[4px] border bg-transparent px-4 py-3 text-[14px] outline-none focus:border-[#c2410c]"
                      style={{ borderColor: RULE, color: INK }}
                    />
                    {forgotStatus === 'error' && (
                      <p className="font-bengali text-[12.5px]" style={{ color: BRAND }}>
                        {lang === 'bn' ? 'পাঠাতে সমস্যা হয়েছে।' : 'Could not send reset link.'}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <button type="button" onClick={() => { setForgotMode(false); setForgotStatus('idle'); setForgotEmail(''); }}
                        className="flex-1 rounded-full border py-2.5 font-bengali text-[13px]" style={{ borderColor: RULE, color: INK }}>
                        {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button type="submit" disabled={forgotStatus === 'sending'}
                        className="flex-1 rounded-full py-2.5 font-bengali text-[13px] font-semibold text-white disabled:opacity-60"
                        style={{ background: BRAND }}>
                        {forgotStatus === 'sending' ? (lang === 'bn' ? 'পাঠানো হচ্ছে…' : 'Sending…') : (lang === 'bn' ? 'লিংক পাঠান' : 'Send Link')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Nav links - showing full header menu */}
          <div className="mt-8 border-t pt-6" style={{ borderColor: RULE }}>
            <p className="mb-3 text-center font-mono text-[9.5px] uppercase tracking-[0.22em]" style={{ color: MUTED }}>
              {lang === 'bn' ? 'পেজগুলি' : 'Navigation'}
            </p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { to: '/', label: lang === 'bn' ? 'হোম' : 'Home' },
                { to: '/about', label: lang === 'bn' ? 'আমাদের সম্পর্কে' : 'About' },
                { to: '/events', label: lang === 'bn' ? 'অনুষ্ঠান' : 'Events' },
                { to: '/gallery', label: lang === 'bn' ? 'গ্যালারি' : 'Gallery' },
                { to: '/contact', label: lang === 'bn' ? 'যোগাযোগ' : 'Contact' },
                { to: '/volunteer', label: lang === 'bn' ? 'স্বেচ্ছাসেবক' : 'Volunteer' },
                { to: '/donate', label: lang === 'bn' ? 'অনুদান' : 'Donate' },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="font-mono text-[10.5px] uppercase tracking-[0.14em] transition-opacity hover:opacity-70"
                  style={{ color: MUTED }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center font-mono text-[11px] uppercase tracking-[0.18em]">
            <Link to="/" style={{ color: MUTED }} className="transition-colors hover:opacity-70">
              ← {t('common.backToHome')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
