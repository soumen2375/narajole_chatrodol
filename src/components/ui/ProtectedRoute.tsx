import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Shows after 8s of spinning — lets user retry without a hard refresh.
function LoadingTimeout({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ background: '#faf6ef' }}>
      <div className="w-full max-w-sm rounded-[4px] border p-8 text-center"
        style={{ borderColor: '#e7e5e4', background: '#fff' }}>
        <div
          className="mx-auto mb-4 h-12 w-12 rounded-full"
          style={{ background: 'rgba(194,65,12,0.1)' }}
        >
          <svg className="m-auto pt-3 h-6 w-6" fill="none" stroke="#c2410c" viewBox="0 0 24 24" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
          </svg>
        </div>
        <p className="font-bengali text-[16px] font-semibold" style={{ color: '#1c1917', fontFamily: '"Noto Serif Bengali", serif' }}>
          সংযোগ ধীর গতিতে চলছে
        </p>
        <p className="mt-2 font-bengali text-[13px]" style={{ color: '#78716c' }}>
          Connection is slow. Check your internet and retry.
        </p>
        <button
          onClick={onRetry}
          className="mt-5 w-full rounded-full py-2.5 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition-all hover:opacity-80"
          style={{ background: '#c2410c' }}
        >
          Retry
        </button>
      </div>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ background: '#faf6ef' }}>
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-4 border-[#e7e5e4]" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-[#c2410c]" />
      </div>
      <p className="font-bengali text-[14px]" style={{ color: '#78716c', fontFamily: '"Noto Sans Bengali", sans-serif' }}>
        লোড হচ্ছে…
      </p>
    </div>
  );
}

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { session, member, loading, isAdmin, isApproved } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) { setTimedOut(false); return; }
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading) {
    if (timedOut) return <LoadingTimeout onRetry={() => window.location.reload()} />;
    return <Loader />;
  }

  if (!session || !member) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/member" replace />;
  }

  if (!isApproved && !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
