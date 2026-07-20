// Acceso centralizado a variables de entorno del servidor.
// Falla temprano y claro si falta algo obligatorio.

function requiredOneOf(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Falta una variable de entorno obligatoria: ${names.join(' o ')}`);
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const serverEnv = {
  supabaseUrl: () => requiredOneOf('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => requiredOneOf('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: () => requiredOneOf('SUPABASE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY'),
  rateLimitMax: () => optionalInt('RATE_LIMIT_MAX', 5),
  rateLimitWindowSeconds: () => optionalInt('RATE_LIMIT_WINDOW_SECONDS', 3600),
  rateLimitSalt: () => {
    if (process.env.RATE_LIMIT_SALT) return process.env.RATE_LIMIT_SALT;
    if (process.env.NODE_ENV === 'production') return requiredOneOf('RATE_LIMIT_SALT');
    return 'dev-salt-change-me';
  },
};
