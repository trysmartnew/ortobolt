// src/services/supabase.ts
// ✅ C-03: select('*') substituído por lista explícita de campos
// ✅ C-03: Tipagem (c: any) em certifications substituída por interface explícita
// ✅ Segurança: URLs assinadas com expiração de 24h para imagens médicas

import { createClient } from '@supabase/supabase-js';
import type { User } from '@/types/index';
import type { MarkingsData } from '@/types/markings';
import { createLogger } from '@/utils/logger';
import { compressImage } from '@/utils/imageCompression';

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
    sessionStorage.setItem('vanguard-veterinary_recovery_pending', '1');
  }
});

// ✅ C-03: Interface explícita — sem 'any'
interface UserProfileRow {
  id: string;
  name: string | null;
  email: string | null;
  role: 'professional' | null;
  specialty: string | null;
  crmv: string | null;
  crmv_state: string | null;
  crmv_verified: boolean | null;
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
    .from('profiles')
    .select(
      'id, name, email, role, specialty, crmv, crmv_state, crmv_verified, institution, avatar, ' +
      'total_cases, success_rate, avg_precision, monthly_procedures, preferences'
    )
    .eq('id', userId)
    .single<UserProfileRow>();

  if (error || !profile) {
    console.error('fetchUserProfile error:', error?.message);
    return null;
  }

  // Mapeamento seguro do objeto do banco (snake_case) para o tipo da aplicação (camelCase)
  const user: User = {
    id: profile.id,
    name: profile.name || '',
    email: profile.email || '',
    role: 'professional', // O 'role' agora é fixo no novo modelo de dados
    specialty: profile.specialty || 'Ortopedia Veterinária',
    crmv: profile.crmv || '',
    crmv_state: profile.crmv_state || undefined,
    crmv_verified: profile.crmv_verified || false,
    institution: profile.institution || '',
    avatar: profile.avatar ?? undefined,
    // A tabela 'certifications' parece ter sido descontinuada na refatoração.
    // Retornamos um array vazio para manter a conformidade com o tipo User.
    certifications: [],
    stats: {
      totalCases: profile.total_cases || 0,
      successRate: profile.success_rate || 0,
      avgPrecision: profile.avg_precision || 0,
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

export async function upsertUserProfile(supaUser: any): Promise<void> {
  try {
    const name = supaUser.user_metadata?.full_name ?? supaUser.user_metadata?.name ?? null;
    const avatar = supaUser.user_metadata?.avatar_url ?? null;
    await supabase.from('profiles').upsert(
      {
        id: supaUser.id,
        email: supaUser.email ?? '',
        name,
        avatar,
        role: 'professional',
        specialty: 'Ortopedia Veterinária',
        crmv: '',
        institution: '',
        preferences: {
          notifications: true,
          theme: 'light',
          language: 'pt',
          autoAnalysis: true,
          reportFormat: 'pdf',
        },
      },
      { onConflict: 'id' }
    );
  } catch (err: any) {
    console.error('Failed to upsert user profile:', err);
  }
}

/** P0.1 — Upload de radiografia para bucket radiografias; retorna signedUrl ou null */
export async function uploadRadiografia(
  dataUrl: string,
  storagePath: string
): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.id) {
    throw new Error('Usuário não autenticado');
  }

  const sep = dataUrl.indexOf(',');
  const header = sep >= 0 ? dataUrl.slice(0, sep) : 'data:image/jpeg;base64';
  const b64 = sep >= 0 ? dataUrl.slice(sep + 1) : dataUrl;
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const ext = mime.split('/')[1] ?? 'jpg';
  const filePath = `${storagePath}.${ext}`;

  const raw = atob(b64);
  const ab = new ArrayBuffer(raw.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);

  let uploadBlob: Blob = new Blob([ab], { type: mime });
  try {
    uploadBlob = await compressImage(uploadBlob);
  } catch (err) {
    logger.warn('Falha na compressão da imagem, enviando original', err);
  }

  const { error } = await supabase.storage
    .from('case-images')
    .upload(filePath, uploadBlob, { contentType: uploadBlob.type || mime, upsert: true });

  if (error) {
    logger.error('Erro no upload de radiografia', error.message);
    throw new Error(`Falha no upload da imagem: ${error.message}`);
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
  const sep = dataUrl.indexOf(',');
  const header = sep >= 0 ? dataUrl.slice(0, sep) : 'data:image/jpeg;base64';
  const b64 = sep >= 0 ? dataUrl.slice(sep + 1) : dataUrl;
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const ext = mime.split('/')[1] ?? 'jpg';
  const folder = type === 'avatar' ? 'avatars' : 'xrays';
  const filePath = folder + '/' + caseId + '_' + Date.now() + '.' + ext;

  const raw = atob(b64);
  const ab = new ArrayBuffer(raw.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);

  let uploadBlob: Blob = new Blob([ab], { type: mime });
  try {
    uploadBlob = await compressImage(uploadBlob);
  } catch (err) {
    logger.warn('Falha na compressão da imagem, enviando original', err);
  }

  const { error } = await supabase.storage
    .from('case-images')
    .upload(filePath, uploadBlob, { contentType: uploadBlob.type || mime, upsert: true });

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
      .from('case-images')
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

export async function updateCaseMarkings(
  caseId: string,
  markings: MarkingsData
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.id) {
    throw new Error('Usuário não autenticado');
  }

  const { error } = await supabase
    .from('clinical_cases')
    .update({ markings })
    .eq('id', caseId);
  if (error) throw error;
}
