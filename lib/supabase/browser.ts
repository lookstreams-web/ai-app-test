import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente para componentes de cliente (browser). Solo anon key pública.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
