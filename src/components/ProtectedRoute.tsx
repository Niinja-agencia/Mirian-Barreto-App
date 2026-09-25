import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/context/AuthContext';
import FullScreenLoader from '@/components/FullScreenLoader';
import { authPath, checkoutDestination } from '@/lib/authRedirect';

export default function ProtectedRoute({
  children,
  adminOnly = false,
  signupFirst = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  signupFirst?: boolean;
}) {
  const { session, profile, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenLoader />;

  if (!session) {
    if (signupFirst) return <Navigate to={authPath('cadastro', checkoutDestination(location.pathname + location.search))} replace />;
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Aguarda o profile carregar antes de decidir sobre permissão de admin
  if (adminOnly) {
    if (!profile) return <FullScreenLoader />;
    if (!isAdmin) return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
