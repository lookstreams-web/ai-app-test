// Acceso centralizado a variables de entorno del servidor.
// Falla temprano y claro si falta algo obligatorio.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  return value;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const serverEnv = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  rateLimitMax: () => optionalInt('RATE_LIMIT_MAX', 5),
  rateLimitWindowSeconds: () => optionalInt('RATE_LIMIT_WINDOW_SECONDS', 3600),
  rateLimitSalt: () => process.env.RATE_LIMIT_SALT ?? 'dev-salt-change-me',
};
