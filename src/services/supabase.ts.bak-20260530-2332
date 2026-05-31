// src/services/supabase.ts
// ✅ C-03: select('*') substituído por lista explícita de campos
// ✅ C-03: Tipagem (c: any) em certifications substituída por interface explícita

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

// ✅ C-03: Interface explícita — sem 'any'
interface UserProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  role: 'veterinarian' | 'resident' | 'admin' | null;
  specialty: string | null;
  crmv: string | null;
  institution: string | null;
  avatar: string | null;
  total_cases: number | null;
  success_rate: number | null;
  avg_precision: number | null;
  monthly_procedures: number | null;
  preferences: User['preferences'] | null;
}

interface CertRow {
  id: string;
  title: string;
  issuer: string;
  year: number;
  verified: boolean;
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  // ✅ C-03: Campos explícitos — nunca select('*')
  const { data: profile, error } = await supabase
    .from('users')
    .select(
      'id, name, email, role, specialty, crmv, institution, avatar, ' +
      'total_cases, success_rate, avg_precision, monthly_procedures, preferences'
    )
    .eq('id', userId)
    .single<UserProfileRow>();

  if (error || !profile) {
    console.error('fetchUserProfile error:', error?.message);
    return null;
  }

  // ✅ C-03: select apenas campos necessários em certifications também
  const { data: certs } = await supabase
    .from('certifications')
    .select('id, title, issuer, year, verified')
    .eq('user_id', userId)
    .order('year', { ascending: false })
    .returns<CertRow[]>();

  const user: User = {
    id:          profile.id,
    name:        profile.name        || '',
    email:       profile.email       || '',
    role:        profile.role        || 'veterinarian',
    specialty:   profile.specialty   || 'Ortopedia Veterinária',
    crmv:        profile.crmv        || '',
    institution: profile.institution || '',
    avatar:      profile.avatar      ?? undefined,
    certifications: (certs || []).map((c: CertRow) => ({
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
