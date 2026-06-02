import { createClient, type User } from '@supabase/supabase-js';

export type VerifyAuthResult =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 500; error: string };

function createAuthClient() {
  const url =
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Valida JWT Supabase enviado como `Authorization: Bearer <access_token>`.
 */
export async function verifySupabaseBearer(
  authHeader: string | string[] | undefined
): Promise<VerifyAuthResult> {
  const raw =
    typeof authHeader === 'string'
      ? authHeader
      : Array.isArray(authHeader)
      ? authHeader[0]
      : undefined;

  if (!raw?.trim()) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  const match = raw.match(/^Bearer\s+(\S+)$/i);
  if (!match?.[1]) {
    return { ok: false, status: 401, error: 'Invalid Authorization header' };
  }

  const token = match[1];
  const supabase = createAuthClient();

  if (!supabase) {
    console.error('[AI Proxy] SUPABASE_URL / SUPABASE_ANON_KEY not configured');
    return {
      ok: false,
      status: 500,
      error: 'Authentication service not configured',
    };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { ok: false, status: 401, error: 'Invalid or expired token' };
  }

  return { ok: true, user: data.user };
}
