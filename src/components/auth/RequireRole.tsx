import { useApp } from '@/contexts/AppContext';

interface RequireRoleProps {
  allowedRoles?: string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RequireRole({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
