import type { AnalysisLlm, SourceType, TranscriptSegment } from '@/lib/types';

/**
 * STUB del motor de análisis — lo implementa EDUARDO.
 *
 * Contrato: recibe el transcript/texto y devuelve el objeto `analysis` SIN
 * `timestampSeconds` ni `verification` (esos los añade el backend). La salida
 * debe validar contra `analysisLlmSchema`.
 *
 * Mientras esté sin implementar, lanza y el pipeline marca la fila como `failed`
 * con un mensaje claro; así el resto del flujo (transcript, rate limit, meta,
 * guardarraíl, persistencia) es probable end-to-end desde hoy.
 */

export interface EngineInput {
  transcript: string;
  sourceType: SourceType;
  title: string | null;
  language: string;
  segments?: TranscriptSegment[] | null;
}

export interface EngineUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface EngineOutput {
  analysis: AnalysisLlm;
  model: string;
  usage?: EngineUsage;
}

export async function analyzeContent(_input: EngineInput): Promise<EngineOutput> {
  throw new Error('not implemented — Eduardo (motor de análisis OpenAI)');
}
