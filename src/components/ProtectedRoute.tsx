import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import FullScreenLoader from '@/components/FullScreenLoader';

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { session, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Aguarda o profile carregar antes de decidir sobre permissão de admin
  if (adminOnly) {
    if (!profile) return <FullScreenLoader />;
    if (!isAdmin) return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
