import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ORG } from '@/data/content';

export default function Login() {
  const { signIn } = useAuth();
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
      await signIn(email, password);
      navigate('/member');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900 px-4 py-12">
      <Link to="/" className="mb-6 flex items-center gap-3 text-white">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white p-1">
          <img src="/assets/images/favicon/favicon512.png" alt="logo" className="h-8 w-8 object-contain" />
        </span>
        <span className="text-xl font-bold">{ORG.nameBn}</span>
      </Link>

      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">সদস্য / অ্যাডমিন লগইন</h1>
        <p className="mb-6 text-sm text-gray-500">আপনার অ্যাকাউন্টে প্রবেশ করুন।</p>

        {error && <div className="mb-4 rounded bg-red-100 px-4 py-3 text-sm text-red-800">{error}</div>}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">ইমেল</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">পাসওয়ার্ড</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'লগইন হচ্ছে…' : 'লগইন'}
          </button>
        </form>

        <div className="mt-6 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          নতুন সদস্য? সরাসরি সাইন-আপ করা যায় না। অ্যাডমিন অনুমোদন দিলে তবেই আপনি লগইন করতে পারবেন। সদস্য হতে চাইলে{' '}
          <Link to="/volunteer" className="font-semibold underline">
            এখানে আবেদন করুন
          </Link>
          ।
        </div>

        <p className="mt-4 text-center text-sm">
          <Link to="/" className="text-blue-600 hover:underline">
            ← হোমে ফিরে যান
          </Link>
        </p>
      </div>
    </div>
  );
}
