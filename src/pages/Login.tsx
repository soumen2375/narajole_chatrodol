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

export default function Login() {
  const { signIn } = useAuth();
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
      navigate(m.role === 'admin' ? '/admin' : '/member');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ background: CREAM }}>
      {/* Top strip */}
      <div
        className="flex items-center justify-between px-6 py-3"
        style={{ background: BRAND, borderBottom: `1px solid rgba(255,255,255,0.12)` }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/assets/images/favicon/favicon512.png" alt="logo" className="h-8 w-8 rounded-full object-cover" style={{ background: CREAM }} />
          <span className="text-[15px] font-bold" style={{ ...SERIF_BN, color: CREAM }}>{lang === 'en' ? ORG.shortEn : ORG.shortBn}</span>
        </Link>
        <LanguageToggle light />
      </div>

      {/* Center card */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Card header */}
          <h1 className="font-bengali text-[36px] leading-tight" style={{ ...SERIF_BN, color: INK }}>
            {t('login.title')}
          </h1>
          <p className="mt-2 mb-8 font-bengali text-[14px]" style={{ color: MUTED }}>{t('login.subtitle')}</p>

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

          <div
            className="mt-5 rounded-[4px] px-5 py-4 font-bengali text-[13px]"
            style={{ background: 'rgba(180,83,9,0.07)', border: `1px solid rgba(180,83,9,0.15)`, color: '#92400e' }}
          >
            {t('login.note')}{' '}
            <Link to="/volunteer" className="font-semibold underline underline-offset-2">{t('login.applyHere')}</Link>।
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
