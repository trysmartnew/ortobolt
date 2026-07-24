// api/lib/supabase-admin.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
// IMPORTANT: Use the SERVICE_ROLE_KEY for admin operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // This will cause the serverless function to fail safely if misconfigured
  throw new Error('Supabase Admin: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in environment variables.');
}

/**
 * Supabase client with admin privileges (service_role).
 * Required for backend operations like creating signed URLs outside of RLS policies.
 * NEVER expose this client or its key to the frontend.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
