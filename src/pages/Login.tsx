import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { name } from '@/data/content';
import { useT } from '@/i18n';
import LanguageToggle from '@/components/ui/LanguageToggle';

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900 px-4 py-12">
      <div className="mb-4">
        <LanguageToggle light />
      </div>
      <Link to="/" className="mb-6 flex items-center gap-3 text-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white p-1">
          <img src="/assets/images/favicon/favicon512.png" alt="logo" className="h-8 w-8 object-contain" />
        </span>
        <span className="text-xl font-bold">{name(lang)}</span>
      </Link>

      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">{t('login.title')}</h1>
        <p className="mb-6 text-sm text-gray-500">{t('login.subtitle')}</p>

        {error && <div className="mb-4 rounded bg-red-100 px-4 py-3 text-sm text-red-800">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('common.email')}</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('login.password')}</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? t('login.loggingIn') : t('login.button')}
          </button>
        </form>

        <div className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('login.note')}{' '}
          <Link to="/volunteer" className="font-semibold underline">{t('login.applyHere')}</Link>।
        </div>

        <p className="mt-4 text-center text-sm">
          <Link to="/" className="text-blue-600 hover:underline">{t('common.backToHome')}</Link>
        </p>
      </div>
    </div>
  );
}
