import type { AnalysisLlm, AnalysisResponse, Finding, Meta, TranscriptSegment } from '@/lib/types';
import { canonicalizeQuote } from '@/lib/canonicalize';
import { applyHypeGuardrail, normalizeBreakdown } from '@/lib/hype';
import { responseSchema } from '@/lib/schema';
import { HttpError } from '@/lib/http';

/**
 * Paso 2 del pipeline (CONTRATO.md): a partir de la salida del LLM y el
 * transcript, el backend:
 *   - normaliza el breakdown a 100
 *   - localiza cada quote (fuzzy match) → timestampSeconds + substring exacto
 *   - inyecta verification: null en cada finding
 *   - acota el hypeIndex con el guardarraíl
 *   - ensambla { meta, analysis } y valida contra responseSchema
 */
export function assembleResponse(params: {
  llm: AnalysisLlm;
  meta: Meta;
  segments: TranscriptSegment[] | null;
  fullText: string;
}): AnalysisResponse {
  const { llm, meta, segments, fullText } = params;

  const breakdown = normalizeBreakdown(llm.breakdown);

  const findings: Finding[] = llm.findings.map((f) => {
    const { quote, timestampSeconds } = canonicalizeQuote(f.quote, segments, fullText);
    return {
      ...f,
      quote,
      timestampSeconds,
      verification: null, // solo la etapa stretch de verificación web la puede poblar
    };
  });

  const hypeIndex = applyHypeGuardrail(llm.hypeIndex, breakdown, findings);

  const response: AnalysisResponse = {
    meta,
    analysis: {
      hypeIndex,
      verdict: llm.verdict,
      breakdown,
      findings,
      executiveSummary: llm.executiveSummary,
    },
  };

  const parsed = responseSchema.safeParse(response);
  if (!parsed.success) {
    throw new HttpError(
      500,
      'RESPONSE_VALIDATION_FAILED',
      `La respuesta ensamblada no cumple el contrato: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
    );
  }
  return parsed.data;
}
