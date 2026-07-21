import { YoutubeTranscript } from 'youtube-transcript';
import type { TranscriptSegment } from '@/lib/types';
import { HttpError } from '@/lib/http';

/**
 * Integración con la librería de transcript de YouTube.
 * Primaria: `youtube-transcript` (scraping no oficial, frágil).
 * Fallback documentado: `youtubei.js` (Innertube) si esta deja de funcionar.
 */

const MAX_TRANSCRIPT_CHARS = 100_000; // trunca transcripts enormes para no reventar tokens

export interface YoutubeTranscriptResult {
  videoId: string;
  title: string | null;
  language: string;
  channelName: string | null;
  channelUrl: string | null;
  segments: TranscriptSegment[];
  fullText: string;
  /** Fracción del transcript original que quedó tras el truncado (1 = completo). */
  coverage: number;
}

// Extrae el videoId de todos los formatos comunes de URL de YouTube.
export function parseYoutubeId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  // último recurso: 11 chars válidos sueltos
  const bare = url.match(/[\w-]{11}/);
  if (bare && /^[\w-]{11}$/.test(url.trim())) return bare[0];
  throw new HttpError(422, 'INVALID_YOUTUBE_URL', 'No se pudo extraer el ID del video de la URL.');
}

// Decodifica entidades HTML comunes que aparecen en los subtítulos.
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

// La librería puede devolver offset/duration en ms o en s según versión.
// Detectamos ms si el final total supera 24 h (86400 s), improbable en un video.
export function transcriptTimeDivisor(raw: Array<{ offset: number; duration: number }>): number {
  const maxEnd = raw.reduce((m, r) => Math.max(m, (r.offset ?? 0) + (r.duration ?? 0)), 0);
  const durations = raw.map((item) => item.duration ?? 0).sort((a, b) => a - b);
  const medianDuration = durations[Math.floor(durations.length / 2)] ?? 0;
  return maxEnd > 86_400 || medianDuration > 120 ? 1000 : 1;
}

interface YoutubeMetadata {
  title: string | null;
  channelName: string | null;
  channelUrl: string | null;
}

// Obtiene título y autor vía oEmbed (datos generados por el backend, no por el LLM).
async function fetchMetadata(videoId: string): Promise<YoutubeMetadata> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return { title: null, channelName: null, channelUrl: null };
    const data = (await res.json()) as { title?: string; author_name?: string; author_url?: string };
    return {
      title: data.title ?? null,
      channelName: data.author_name ?? null,
      channelUrl: data.author_url ?? null,
    };
  } catch {
    return { title: null, channelName: null, channelUrl: null };
  }
}

export async function fetchYoutubeTranscript(url: string): Promise<YoutubeTranscriptResult> {
  const videoId = parseYoutubeId(url);

  let raw: Array<{ text: string; offset: number; duration: number; lang?: string }>;
  try {
    raw = (await YoutubeTranscript.fetchTranscript(videoId)) as typeof raw;
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : '';
    if (msg.includes('disabled') || msg.includes('transcript is disabled') || msg.includes('captions')) {
      throw new HttpError(422, 'TRANSCRIPT_DISABLED', 'El video no tiene subtítulos disponibles.');
    }
    if (msg.includes('unavailable') || msg.includes('not available') || msg.includes('no longer')) {
      throw new HttpError(422, 'VIDEO_UNAVAILABLE', 'El video no está disponible (privado, eliminado o bloqueado por región).');
    }
    throw new HttpError(422, 'TRANSCRIPT_FETCH_FAILED', `No se pudo obtener el transcript: ${err instanceof Error ? err.message : 'error desconocido'}`);
  }

  if (!raw || raw.length === 0) {
    throw new HttpError(422, 'TRANSCRIPT_DISABLED', 'El video no tiene subtítulos disponibles.');
  }

  const div = transcriptTimeDivisor(raw);
  const allSegments: TranscriptSegment[] = raw.map((r) => ({
    text: decodeEntities(r.text),
    offsetSeconds: (r.offset ?? 0) / div,
    durationSeconds: (r.duration ?? 0) / div,
  }));

  const { segments, fullText, coverage } = truncateTranscript(allSegments);

  const language = raw[0]?.lang ?? 'es';
  const metadata = await fetchMetadata(videoId);

  return { videoId, ...metadata, language, segments, fullText, coverage };
}

function joinSegments(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
}

// Trunca por segmentos completos (conserva timestamps coherentes) y reporta la
// fracción analizada para que el motor la comunique como revisión parcial.
export function truncateTranscript(
  segments: TranscriptSegment[],
  maxChars: number = MAX_TRANSCRIPT_CHARS,
): { segments: TranscriptSegment[]; fullText: string; coverage: number } {
  const fullText = joinSegments(segments);
  if (fullText.length <= maxChars) {
    return { segments, fullText, coverage: 1 };
  }

  const kept: TranscriptSegment[] = [];
  let used = 0;
  for (const segment of segments) {
    const length = segment.text.replace(/\s+/g, ' ').trim().length;
    const next = used + (kept.length > 0 ? 1 : 0) + length;
    // Siempre conservamos al menos un segmento para no dejar el transcript vacío.
    if (kept.length > 0 && next > maxChars) break;
    kept.push(segment);
    used = next;
  }

  const truncatedText = joinSegments(kept);
  return {
    segments: kept,
    fullText: truncatedText,
    coverage: Math.min(1, truncatedText.length / fullText.length),
  };
}
