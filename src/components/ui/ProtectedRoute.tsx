import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Spinner from './Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { session, member, loading, isAdmin, isApproved } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner label="লোড হচ্ছে…" />;

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
