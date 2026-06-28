// src/services/backupService.ts
import { supabase } from './supabase';

export async function exportUserData(userId: string): Promise<void> {
  const [profileResult, casesResult] = await Promise.all([
    supabase.from('users')
      .select('id, name, email, role, crmv, specialty, institution')
      .eq('id', userId)
      .single(),
    supabase.from('clinical_cases')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  if (profileResult.error) throw new Error(`Erro ao buscar perfil: ${profileResult.error.message}`);
  if (casesResult.error) throw new Error(`Erro ao buscar casos: ${casesResult.error.message}`);

  const backup = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    user: profileResult.data,
    cases: casesResult.data ?? [],
    total_cases: casesResult.data?.length ?? 0,
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ortobolt-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
