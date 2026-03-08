import { createClient } from '@supabase/supabase-js';
import type { User, Certification } from '@/types/index';
 
// ── Variáveis de ambiente ─────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
 
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase: variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas.\n' +
    'Verifique o arquivo .env.local na raiz do projeto.'
  );
}
 
// ── Cliente Supabase (singleton) ─────────────────────────────────────────
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    // Persistir sessão no localStorage automaticamente
    persistSession: true,
    // Renovar token automaticamente antes de expirar
    autoRefreshToken: true,
    // Detectar sessão na URL (para magic links e OAuth)
    detectSessionInUrl: true,
  },
});
 
// ── Helper: buscar perfil completo do usuário ─────────────────────────────
// Junta dados de public.users + certifications
// Retorna objeto no formato do tipo User do OrtoBolt
export async function fetchUserProfile(userId: string): Promise<User | null> {
  // 1. Buscar dados do perfil
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
 
  if (error || !profile) {
    console.error('fetchUserProfile error:', error?.message);
    return null;
  }
 
  // 2. Buscar certificações do usuário
  const { data: certs } = await supabase
    .from('certifications')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: false });
 
  // 3. Montar objeto no formato User do OrtoBolt
  const user: User = {
    id:          profile.id,
    name:        profile.name        || '',
    email:       profile.email       || '',
    role:        profile.role        || 'veterinarian',
    specialty:   profile.specialty   || 'Ortopedia Veterinária',
    crmv:        profile.crmv        || '',
    institution: profile.institution || '',
    avatar:      profile.avatar,
    certifications: (certs || []).map((c: Certification) => ({
      id:       c.id,
      title:    c.title,
      issuer:   c.issuer,
      year:     c.year,
      verified: c.verified,
    })),
    stats: {
      totalCases:         profile.total_cases         || 0,
      successRate:        profile.success_rate        || 0,
      avgPrecision:       profile.avg_precision       || 0,
      monthlyProcedures:  profile.monthly_procedures  || 0,
    },
    preferences: profile.preferences || {
      notifications: true,  theme: 'light',
      language: 'pt',       autoAnalysis: true,
      reportFormat: 'pdf',
    },
  };
 
  return user;
}
