import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';

import Breadcrumb from '@/components/ui/Breadcrumb';

const SERIF_BN = { fontFamily: 'Archivo, "Noto Serif Bengali", "DM Sans", sans-serif' };

export default function Login() {
  useSEO(SEO['/login']);
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
      setError(m);
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
    <div className="flex min-h-screen flex-col bg-site-cream">
      <Breadcrumb title="Member Login" />

      {/* Center card — form left, green panel right */}
      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8 md:py-16">
        <div className="w-full max-w-5xl overflow-hidden rounded-[24px] border border-site-line bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* ── Form side ── */}
            <div className="p-8 sm:p-10 md:p-12">
              <h1 className="h-section font-bengali text-site-ink" style={SERIF_BN}>
                {lang === 'bn' ? 'সদস্য লগইন' : 'Member Login'}
              </h1>
              <p className="mb-8 mt-3 font-bengali text-[14px] text-site-muted">
                {lang === 'bn' ? 'সদস্য প্যানেলে প্রবেশ করুন।' : 'Sign in to your member panel.'}
              </p>

              {error && (
                <div className="error-panel mb-5 font-bengali">
                  {error}
                </div>
              )}

              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label htmlFor="login-email" className="site-label font-bengali">
                    {t('common.email')}
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="site-input"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="site-label font-bengali">
                    {t('login.password')}
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="site-input"
                    placeholder="••••••••"
                  />
                </div>
                {/* Forgot password link */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="btn-tertiary font-bengali"
                  >
                    {lang === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-yellow w-full font-bengali"
                >
                  {loading ? t('login.loggingIn') : t('login.button')}
                </button>
              </form>
            </div>

            {/* ── Green panel side ── */}
            <div className="flex flex-col justify-center gap-5 bg-site-green p-8 text-white sm:p-10 md:p-12">
              <div className="eyebrow-light">Chhatradol</div>

              {/* Note */}
              <div className="rounded-soft border border-white/15 bg-white/5 px-6 py-5 font-bengali text-[13.5px] leading-[1.8] text-white/80">
                {t('login.note')}{' '}
                <Link to="/volunteer" className="font-bold text-site-yellow underline underline-offset-4">{t('login.applyHere')}</Link>।
              </div>

              {/* Admin link */}
              <div className="rounded-soft border border-white/15 bg-white/5 px-6 py-5 font-bengali text-[13.5px] leading-[1.8] text-white/80">
                {lang === 'bn' ? 'অ্যাডমিন? ' : 'Administrator? '}
                <Link to="/admin-login" className="font-bold text-site-yellow underline underline-offset-4">
                  {lang === 'bn' ? 'অ্যাডমিন লগইন পেজে যান' : 'Go to Admin Login'}
                </Link>
              </div>
            </div>
          </div>

          {/* Forgot password modal */}
          {forgotMode && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(10,59,47,0.6)' }}>
              <div className="w-full max-w-md rounded-panel border border-site-line bg-white p-8">
                <div className="mb-2 flex items-center justify-between gap-4">
                  <h2 className="h-card font-bengali text-site-ink" style={SERIF_BN}>
                    {lang === 'bn' ? 'পাসওয়ার্ড রিসেট' : 'Reset Password'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => { setForgotMode(false); setForgotStatus('idle'); setForgotEmail(''); }}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-site-muted transition-colors hover:bg-site-cream hover:text-site-green"
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="mb-6 mt-2 font-bengali text-[13.5px] leading-[1.8] text-site-muted">
                  {lang === 'bn' ? 'আপনার ইমেল দিন, আমরা রিসেট লিংক পাঠাব।' : 'Enter your email and we will send a reset link.'}
                </p>
                {forgotStatus === 'sent' ? (
                  <div className="success-panel font-bengali">
                    {lang === 'bn' ? '✓ রিসেট লিংক পাঠানো হয়েছে। আপনার ইমেল চেক করুন।' : '✓ Reset link sent. Please check your email.'}
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <label htmlFor="forgot-email" className="sr-only">{t('common.email')}</label>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="site-input"
                    />
                    {forgotStatus === 'error' && (
                      <p className="field-error font-bengali">
                        {lang === 'bn' ? 'পাঠাতে সমস্যা হয়েছে।' : 'Could not send reset link.'}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => { setForgotMode(false); setForgotStatus('idle'); setForgotEmail(''); }}
                        className="btn-ghost-dark flex-1 font-bengali text-[13.5px]"
                      >
                        {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={forgotStatus === 'sending'}
                        className="btn-green flex-1 font-bengali text-[13.5px]"
                      >
                        {forgotStatus === 'sending' ? (lang === 'bn' ? 'পাঠানো হচ্ছে…' : 'Sending…') : (lang === 'bn' ? 'লিংক পাঠান' : 'Send Link')}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
