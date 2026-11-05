import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute() {
  const { session } = useAuth();
  return session && session.expiresAt > Date.now()
    ? <Outlet />
    : <Navigate to="/login" replace />;
}