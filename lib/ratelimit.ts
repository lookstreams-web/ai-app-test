import { createHash } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { serverEnv } from '@/lib/env';
import { HttpError } from '@/lib/http';

/**
 * Rate limit por IP con ventana deslizante, implementado en Postgres
 * (función check_and_record_rate_limit). Ver supabase/migrations/0001_init.sql.
 */

// Extrae la IP del cliente detrás del proxy de Railway.
export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

// Hash con salt: nunca guardamos la IP en claro.
export function hashIp(ip: string): string {
  return createHash('sha256').update(ip + serverEnv.rateLimitSalt()).digest('hex');
}

export interface RateLimitResult {
  allowed: boolean;
  identifier: string;
  retryAfterSeconds: number;
}

/**
 * Registra el intento y decide si se permite. Lanza HttpError 429 si se excede.
 * Devuelve el identifier (ip_hash) para guardarlo en la fila de análisis.
 */
export async function enforceRateLimit(req: Request): Promise<RateLimitResult> {
  const identifier = hashIp(clientIp(req));
  const max = serverEnv.rateLimitMax();
  const windowSeconds = serverEnv.rateLimitWindowSeconds();

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('check_and_record_rate_limit', {
    p_identifier: identifier,
    p_max: max,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    throw new HttpError(500, 'RATE_LIMIT_ERROR', `No se pudo verificar el rate limit: ${error.message}`);
  }

  const allowed = data === true;
  if (!allowed) {
    throw new HttpError(429, 'RATE_LIMITED', `Límite alcanzado: ${max} análisis por ${windowSeconds} s.`);
  }

  return { allowed, identifier, retryAfterSeconds: windowSeconds };
}
