import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useT } from '@/i18n';
import { useSEO } from '@/hooks/useSEO';
import { SEO } from '@/data/seoConfig';

import Breadcrumb from '@/components/ui/Breadcrumb';

const SERIF_BN = { fontFamily: 'Archivo, "Noto Serif Bengali", "DM Sans", sans-serif' };

export default function AdminLogin() {
  useSEO(SEO['/admin-login']);
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
    <div className="flex min-h-screen flex-col bg-site-cream">
      <Breadcrumb title="Admin Login" />

      {/* Narrow centred green card */}
      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-8 md:py-16">
        <div className="w-full max-w-md">
          <div className="rounded-panel bg-site-green p-8 text-white sm:p-10">
            <h1 className="h-card font-bengali text-white" style={SERIF_BN}>
              {lang === 'bn' ? 'অ্যাডমিন লগইন' : 'Admin Login'}
            </h1>
            <p className="mb-8 mt-3 font-bengali text-[14px] leading-[1.8] text-white/65">
              {lang === 'bn' ? 'অ্যাডমিন প্যানেলে প্রবেশ করুন।' : 'Sign in to the admin panel.'}
            </p>

            {error && (
              <div className="mb-5 rounded-[18px] border border-white/20 bg-white/10 px-5 py-4 font-bengali text-[13.5px] leading-[1.7] text-white">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="admin-email" className="mb-2 block font-dmsans text-[13px] font-bold text-white">
                  {t('common.email')}
                </label>
                <input
                  id="admin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block min-h-[48px] w-full rounded-full border border-white/25 bg-white/10 px-6 py-[15px] font-dmsans text-[14.5px] text-white transition-colors placeholder:text-white/40 focus:border-site-yellow"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label htmlFor="admin-password" className="mb-2 block font-dmsans text-[13px] font-bold text-white">
                  {t('login.password')}
                </label>
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block min-h-[48px] w-full rounded-full border border-white/25 bg-white/10 px-6 py-[15px] font-dmsans text-[14.5px] text-white transition-colors placeholder:text-white/40 focus:border-site-yellow"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-yellow w-full font-bengali"
              >
                {loading ? t('login.loggingIn') : (lang === 'bn' ? 'অ্যাডমিন লগইন' : 'Sign in as Admin')}
              </button>
            </form>
          </div>

          <div className="mt-5 rounded-[18px] border border-site-line bg-white px-6 py-5 font-bengali text-[13.5px] leading-[1.8] text-site-soft">
            {lang === 'bn' ? 'সদস্য? ' : 'Not an admin? '}
            <Link to="/login" className="font-bold text-site-green underline decoration-site-yellow decoration-2 underline-offset-4">
              {lang === 'bn' ? 'সদস্য লগইন পেজে যান' : 'Go to Member Login'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
