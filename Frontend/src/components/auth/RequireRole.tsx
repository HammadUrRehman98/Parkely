import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RequireRoleProps {
  role: 'user' | 'admin';
}

const RequireRole = ({ role }: RequireRoleProps) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (!user || user.role !== role) {
    return <Navigate to={role === 'admin' ? '/login' : '/dashboard'} replace />;
  }

  return <Outlet />;
};

export default RequireRole;
