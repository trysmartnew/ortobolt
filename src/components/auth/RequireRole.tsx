import { useApp } from '@/contexts/AppContext';

interface RequireRoleProps {
  allowedRoles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RequireRole({ allowedRoles, fallback = null, children }: RequireRoleProps) {
  const { user } = useApp();
  if (!user) return <>{fallback}</>;
  if (!allowedRoles || allowedRoles.length === 0) return <>{children}</>;
  return allowedRoles.includes(user.role) ? <>{children}</> : <>{fallback}</>;
}
