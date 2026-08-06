import { useApp } from '@/contexts/AppContext';


export function RequireRole({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
