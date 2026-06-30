import { useApp } from '@/contexts/AppContext';
import type { UserRole } from '@/types/index';

interface RequireRoleProps {
  roles: UserRole[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RequireRole({ roles, fallback = null, children }: RequireRoleProps) {
  const { user } = useApp();
  if (!user) return <>{fallback}</>;
  return roles.includes(user.role) ? <>{children}</> : <>{fallback}</>;
}
