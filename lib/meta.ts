import type { Meta, SourceType, TranscriptSegment } from '@/lib/types';

/**
 * Construcción de `meta` (paso 2 del pipeline en CONTRATO.md).
 * El backend genera meta a partir de la fuente; el LLM nunca produce estos campos.
 */

const DEFAULT_MODEL = 'gpt-5.6';

export interface BuildMetaInput {
  sourceType: SourceType;
  sourceUrl: string | null;
  title: string;
  language: string;
  segments?: TranscriptSegment[] | null;
  model?: string;
  analyzedAt?: string; // ISO; por defecto ahora
}

// Duración total a partir de los segmentos (para YouTube/audio). null si no aplica.
export function durationFromSegments(segments?: TranscriptSegment[] | null): number | null {
  if (!segments || segments.length === 0) return null;
  const last = segments[segments.length - 1];
  return Math.round(last.offsetSeconds + last.durationSeconds);
}

export function buildMeta(input: BuildMetaInput): Meta {
  const isText = input.sourceType === 'text';
  return {
    schemaVersion: '1',
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl,
    title: input.title,
    language: input.language,
    durationSeconds: isText ? null : durationFromSegments(input.segments),
    model: input.model ?? DEFAULT_MODEL,
    analyzedAt: input.analyzedAt ?? new Date().toISOString(),
  };
}
