import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { serverEnv } from '@/lib/env';

/**
 * Cliente para Server Components / route handlers con la sesión del usuario (anon key).
 * Respeta RLS. Usar para lecturas públicas; las escrituras van por el cliente admin.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(serverEnv.supabaseUrl(), serverEnv.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // setAll puede fallar en Server Components; se ignora si hay middleware refrescando sesión.
        }
      },
    },
  });
}
