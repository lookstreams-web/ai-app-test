import type { TranscriptSegment } from '@/lib/types';

/**
 * Canonicalización de citas (paso 2 del pipeline en CONTRATO.md).
 * El LLM devuelve `quote` aproximada; el backend la localiza en el transcript
 * mediante fuzzy match, reemplaza `quote` por el substring exacto encontrado y
 * asigna `timestampSeconds` a partir del segmento correspondiente.
 */

const MATCH_THRESHOLD = 0.6; // proporción mínima de tokens que deben coincidir
// Marcas combinantes (acentos) que quedan tras normalizar a NFD. Construido con
// escapes ASCII para evitar glifos combinantes en el código fuente.
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

interface Word {
  raw: string;
  norm: string;
  offsetSeconds: number | null;
}

// Minúsculas, sin acentos, sin puntuación, espacios colapsados.
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Construye una lista de palabras con su timestamp heredado del segmento.
function buildWordList(segments: TranscriptSegment[] | null, fullText: string): Word[] {
  const words: Word[] = [];
  if (segments && segments.length > 0) {
    for (const seg of segments) {
      for (const raw of seg.text.split(/\s+/)) {
        if (!raw) continue;
        const norm = normalize(raw);
        if (!norm) continue;
        words.push({ raw, norm, offsetSeconds: seg.offsetSeconds });
      }
    }
    return words;
  }
  // Fuente sin segmentos (texto/artículo): sin timestamps.
  for (const raw of fullText.split(/\s+/)) {
    if (!raw) continue;
    const norm = normalize(raw);
    if (!norm) continue;
    words.push({ raw, norm, offsetSeconds: null });
  }
  return words;
}

export interface CanonicalQuote {
  quote: string; // substring exacto del transcript (o el original si no hay match)
  timestampSeconds: number | null;
}

/**
 * Localiza `rawQuote` dentro del transcript. Desliza una ventana del tamaño de
 * la cita y elige la de mayor coincidencia posicional de tokens.
 */
export function canonicalizeQuote(
  rawQuote: string,
  segments: TranscriptSegment[] | null,
  fullText: string,
): CanonicalQuote {
  const words = buildWordList(segments, fullText);
  const quoteTokens = normalize(rawQuote).split(' ').filter(Boolean);

  if (words.length === 0 || quoteTokens.length === 0) {
    return { quote: rawQuote, timestampSeconds: null };
  }

  const windowSize = Math.min(quoteTokens.length, words.length);
  let bestStart = -1;
  let bestScore = 0;

  for (let i = 0; i + windowSize <= words.length; i++) {
    let matches = 0;
    for (let j = 0; j < windowSize; j++) {
      if (words[i + j].norm === quoteTokens[j]) matches++;
    }
    if (matches > bestScore) {
      bestScore = matches;
      bestStart = i;
    }
  }

  if (bestStart === -1 || bestScore / windowSize < MATCH_THRESHOLD) {
    return { quote: rawQuote, timestampSeconds: null };
  }

  const slice = words.slice(bestStart, bestStart + windowSize);
  const exact = slice.map((w) => w.raw).join(' ');
  return { quote: exact, timestampSeconds: slice[0].offsetSeconds };
}
