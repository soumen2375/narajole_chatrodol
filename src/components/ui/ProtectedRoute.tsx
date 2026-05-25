import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { DashboardSkeleton } from './Skeleton';

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
    <div className="min-h-screen p-5 md:p-6" style={{ background: '#faf6ef' }}>
      <div className="mx-auto max-w-5xl">
        <DashboardSkeleton />
      </div>
    </div>
  );
}

export type CapabilityKey = 'canManagePosts' | 'canManageEvents' | 'canManageFinance';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  /** Redirect to /member if this specific capability is missing */
  require?: CapabilityKey;
}

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  require: requireCap,
}: ProtectedRouteProps) {
  const {
    session, member, loading, revalidating,
    isAdmin, isApproved,
    canManagePosts, canManageEvents, canManageFinance,
  } = useAuth();
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

  if (!isApproved && !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  // Admin-panel access: strictly allow full admins only.
  // Members with management capabilities manage their assigned features directly inside the Member Panel.
  if (requireAdmin) {
    if (!isAdmin) {
      if (revalidating) return <Loader />;
      return <Navigate to="/member" replace />;
    }
  }

  // Specific capability guard (e.g. posts / gallery routes inside /member)
  if (requireCap) {
    const capMap: Record<CapabilityKey, boolean> = { canManagePosts, canManageEvents, canManageFinance };
    if (!capMap[requireCap]) {
      if (revalidating) return <Loader />;
      return <Navigate to="/member" replace />;
    }
  }

  return <>{children}</>;
}
