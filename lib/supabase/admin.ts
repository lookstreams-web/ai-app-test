import { createClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

/**
 * Cliente con service_role. BYPASSA RLS.
 * SOLO en route handlers / código de servidor. NUNCA importar desde el browser.
 */
export function createAdminClient() {
  return createClient(serverEnv.supabaseUrl(), serverEnv.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
