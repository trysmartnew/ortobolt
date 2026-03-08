import { createClient } from '@supabase/supabase-js';
import type { User } from '@/types/index';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase: variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas.\n' +
    'Verifique o arquivo .env.local na raiz do projeto.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('fetchUserProfile error:', error?.message);
    return null;
  }

  const { data: certs } = await supabase
    .from('certifications')
    .select('*')
    .eq('user_id', userId)
    .order('year', { ascending: false });

  const user: User = {
    id:          profile.id,
    name:        profile.name        || '',
    email:       profile.email       || '',
    role:        profile.role        || 'veterinarian',
    specialty:   profile.specialty   || 'Ortopedia Veterinária',
    crmv:        profile.crmv        || '',
    institution: profile.institution || '',
    avatar:      profile.avatar,
    certifications: (certs || []).map((c: any) => ({
      id:       c.id,
      title:    c.title,
      issuer:   c.issuer,
      year:     c.year,
      verified: c.verified,
    })),
    stats: {
      totalCases:        profile.total_cases        || 0,
      successRate:       profile.success_rate       || 0,
      avgPrecision:      profile.avg_precision      || 0,
      monthlyProcedures: profile.monthly_procedures || 0,
    },
    preferences: profile.preferences || {
      notifications: true,
      theme: 'light',
      language: 'pt',
      autoAnalysis: true,
      reportFormat: 'pdf',
    },
  };

  return user;
}

