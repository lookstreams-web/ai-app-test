import { ProxyAgent, fetch as undiciFetch } from 'undici';

/**
 * YouTube bloquea las IPs de datacenter: el mismo transcript que baja sin
 * problemas desde una IP residencial falla en Railway. Cuando existe
 * `YOUTUBE_PROXY_URL`, las peticiones a YouTube salen por un proxy residencial.
 *
 * El proxy se aplica solo a YouTube: Supabase y el resto del tráfico siguen
 * saliendo directo, sin consumir ancho de banda de pago.
 *
 * Sin la variable el comportamiento es idéntico al de siempre, así que
 * desactivarlo en producción solo requiere borrarla.
 *
 * Sobre la sesión: no todas las IPs residenciales sirven (algunas devuelven el
 * muro de consentimiento de YouTube). Medido sobre el pool de IPRoyal, rotar en
 * cada petición acierta ~2 de cada 3 veces, mientras que fijar la IP con una
 * sesión y solo rotar cuando falla acertó 10 de 10. De ahí la sesión pegajosa
 * más `rotateProxySession()` en el reintento.
 */

// undici trae sus propios tipos de Request/Response; hacia afuera exponemos la
// misma firma que el fetch global para que los llamadores no noten la diferencia.
type FetchLike = typeof globalThis.fetch;

// Sintaxis de IPRoyal: los parámetros viajan como sufijos de la contraseña.
const SESSION_LIFETIME = '10m';

let sessionId = randomSession();
let cached: { key: string; fetch: FetchLike } | null = null;

function randomSession(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Fuerza una IP nueva en la siguiente petición. Se usa al reintentar. */
export function rotateProxySession(): void {
  sessionId = randomSession();
  cached = null;
}

// Inserta la sesión en la contraseña sin tocar el resto de la URL.
function withSession(rawUrl: string, session: string): string {
  const url = new URL(rawUrl);
  if (!url.password) return rawUrl;
  url.password = `${url.password}_session-${session}_lifetime-${SESSION_LIFETIME}`;
  return url.toString();
}

export function youtubeFetch(): FetchLike | undefined {
  const configured = process.env.YOUTUBE_PROXY_URL?.trim();
  if (!configured) return undefined;

  const key = `${configured}|${sessionId}`;
  // El agente mantiene el pool de conexiones; recrearlo en cada request
  // desperdiciaría un handshake contra el proxy.
  if (cached?.key !== key) {
    const agent = new ProxyAgent(withSession(configured, sessionId));
    const proxied = ((input: Parameters<FetchLike>[0], init?: Parameters<FetchLike>[1]) =>
      undiciFetch(input as never, { ...(init ?? {}), dispatcher: agent } as never)) as unknown as FetchLike;
    cached = { key, fetch: proxied };
  }

  return cached.fetch;
}

export function proxyEnabled(): boolean {
  return Boolean(process.env.YOUTUBE_PROXY_URL?.trim());
}
