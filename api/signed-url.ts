// api/signed-url.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './lib/cors';
import { verifySupabaseBearer } from './lib/verifySupabaseJwt';
import { supabaseAdmin } from './lib/supabase-admin';
import { checkRateLimit } from './lib/rateLimit.js';

const BUCKET_NAME = 'case-images';
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour
const RL_MAX = 30;
const RL_WINDOW_MS = 60_000; // 1 min window

/**
 * A secure endpoint to generate temporary signed URLs for accessing storage objects.
 * This prevents persisting temporary URLs in the database.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS for frontend access
  applyCors(res, req.headers.origin || '');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Verify user authentication
  const authResult = await verifySupabaseBearer(req.headers.authorization);
  if (!authResult.ok) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  // Rate limiting per user
  const rl = checkRateLimit(`signed-url:${authResult.user.id}`, RL_MAX, RL_WINDOW_MS);
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded', retryAfter: rl.retryAfter });
  }

  // 2. Validate request body
  const { path } = req.body;
  if (!path || typeof path !== 'string' || path.trim() === '') {
    return res.status(400).json({ error: 'A non-empty "path" string is required in the request body.' });
  }

  // 3. Validate path ownership - prevent path traversal and cross-user access
  const userId = authResult.user.id;
  const normalizedPath = path.replace(/\\/g, '/');
  if (
    normalizedPath.includes('..') ||
    normalizedPath.includes('%2e') ||
    normalizedPath.includes('%2E') ||
    !normalizedPath.startsWith(`${userId}/`)
  ) {
    return res.status(403).json({ error: 'Access denied: path does not belong to the authenticated user.' });
  }

  try {
    // 4. Generate signed URL using the admin client
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(path, SIGNED_URL_EXPIRY_SECONDS);

    if (error) {
      console.error(`[Signed URL API] Supabase storage error for path "${path}":`, error);
      return res.status(500).json({ error: 'Failed to generate signed URL from storage.' });
    }

    // 5. Return the signed URL
    return res.status(200).json({ signedUrl: data.signedUrl });

  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    console.error(`[Signed URL API] Unexpected error for path "${path}":`, errorMessage);
    return res.status(500).json({ error: 'An unexpected internal server error occurred.' });
  }
}
