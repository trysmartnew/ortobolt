// src/services/supabase.ts
// ✅ C-03: select('*') substituído por lista explícita de campos
// ✅ C-03: Tipagem (c: any) em certifications substituída por interface explícita
// ✅ Segurança: URLs assinadas com expiração de 24h para imagens médicas

import { createClient } from '@supabase/supabase-js';
import type { User } from '@/types/index';
import { createLogger } from '@/utils/logger';

const logger = createLogger('supabase');

// Expiração padrão para URLs assinadas: 24 horas (86400 segundos)
const SIGNED_URL_EXPIRY = 86400;

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

/** Access token da sessão atual — obrigatório para /api/ai */
export async function getSupabaseAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('getSupabaseAccessToken:', error.message);
    return null;
  }
  return data.session?.access_token ?? null;
}

// Listener global — registrado imediatamente após criação do cliente
// Captura PASSWORD_RECOVERY antes do React montar
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    sessionStorage.setItem('ortobolt_recovery_pending', '1');
  }
});

// ✅ C-03: Interface explícita — sem 'any'
interface UserProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  role: 'veterinarian' | 'resident' | 'admin' | 'student' | null;
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

export async function upsertUserProfile(supaUser: {
  id: string;
  email?: string | null;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
}): Promise<void> {
  const name = supaUser.user_metadata?.full_name
    || supaUser.user_metadata?.name
    || supaUser.email?.split('@')[0]
    || 'Usuário';
  const avatar = supaUser.user_metadata?.avatar_url ?? null;
  await supabase.from('users').upsert(
    {
      id:           supaUser.id,
      email:        supaUser.email ?? null,
      name,
      avatar,
      role:         'veterinarian',
      specialty:    'Ortopedia Veterinária',
      crmv:         '',
      institution:  '',
      preferences: {
        notifications: true,
        theme:         'light',
        language:      'pt',
        autoAnalysis:  true,
        reportFormat:  'pdf',
      },
    },
    { onConflict: 'id', ignoreDuplicates: true }
  );
}


/** P0.1 — Upload de radiografia para bucket radiografias; retorna signedUrl ou null */
export async function uploadRadiografia(
  dataUrl: string,
  storagePath: string
): Promise<string | null> {
  const sep    = dataUrl.indexOf(',');
  const header = sep >= 0 ? dataUrl.slice(0, sep) : 'data:image/jpeg;base64';
  const b64    = sep >= 0 ? dataUrl.slice(sep + 1) : dataUrl;
  const mime   = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const ext    = mime.split('/')[1] ?? 'jpg';
  const filePath = `${storagePath}.${ext}`;

  const raw  = atob(b64);
  const ab   = new ArrayBuffer(raw.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);

  const { error } = await supabase.storage
    .from('radiografias')
    .upload(filePath, new Blob([ab], { type: mime }), { contentType: mime, upsert: true });

  if (error) {
    logger.error('Erro no upload de radiografia', error.message);
    return null;
  }

  // Gerar URL assinada com expiração de 24h (segurança LGPD)
  const signedUrl = await getSignedImageUrl(filePath);
  return signedUrl;
}

/** Upload genérico de imagem de caso para o bucket 'radiografias' */
export async function uploadCaseImage(
  dataUrl: string,
  caseId: string,
  type: 'avatar' | 'xray'
): Promise<string | null> {
  const sep    = dataUrl.indexOf(',');
  const header = sep >= 0 ? dataUrl.slice(0, sep) : 'data:image/jpeg;base64';
  const b64    = sep >= 0 ? dataUrl.slice(sep + 1) : dataUrl;
  const mime   = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const ext    = mime.split('/')[1] ?? 'jpg';
  const folder = type === 'avatar' ? 'avatars' : 'xrays';
  const filePath = folder + '/' + caseId + '_' + Date.now() + '.' + ext;

  const raw  = atob(b64);
  const ab   = new ArrayBuffer(raw.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);

  const { error } = await supabase.storage
    .from('radiografias')
    .upload(filePath, new Blob([ab], { type: mime }), { contentType: mime, upsert: true });

  if (error) {
    logger.error('Erro no upload de imagem de caso', error.message);
    return null;
  }

  // Gerar URL assinada com expiração de 24h (segurança LGPD)
  const signedUrl = await getSignedImageUrl(filePath);
  return signedUrl;
}

/**
 * Gera URL assinada para acesso temporário a imagens no Storage.
 * URLs expiram em 24h por padrão (conformidade LGPD).
 * 
 * @param path - Caminho do arquivo no bucket
 * @param expiresIn - Duração em segundos (padrão: 86400 = 24h)
 * @returns URL assinada ou null se falhar
 */
export async function getSignedImageUrl(
  path: string,
  expiresIn: number = SIGNED_URL_EXPIRY
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('radiografias')
      .createSignedUrl(path, expiresIn);

  if (error) {
    logger.error('Erro ao gerar URL assinada', error.message);
    return null;
  }

  return data.signedUrl;
  } catch (err) {
    logger.error('Erro ao gerar URL assinada', err);
    return null;
  }
}
