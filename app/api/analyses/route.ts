import { createAdminClient } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/ratelimit';
import { createAnalysisInput } from '@/lib/schema';
import { analysisLlmSchema } from '@/lib/schema';
import { fetchYoutubeTranscript } from '@/lib/youtube/transcript';
import { analyzeContent } from '@/lib/engine';
import { buildMeta } from '@/lib/meta';
import { assembleResponse } from '@/lib/pipeline';
import { HttpError, toErrorResponse } from '@/lib/http';
import type { TranscriptSegment } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/analyses
 * Crea y procesa un análisis de forma INLINE (opción A del contrato/mega-prompt).
 * Railway permite requests largos. Alternativa B (id inmediato + background con
 * `after()`): pendiente como mejora futura.
 *
 * Reglas de respuesta:
 *  - Fallos ANTES de crear la fila (validación, rate limit) → 4xx { error }.
 *  - Una vez creada la fila (transcript/motor/ensamblado), la respuesta es 200
 *    con el snapshot { id, status, result, error }; el estado real vive en la fila.
 */
export async function POST(req: Request) {
  const startedAt = Date.now();
  const admin = createAdminClient();

  // 1) rate limit (antes de crear nada)
  let ipHash: string;
  try {
    const rl = await enforceRateLimit(req);
    ipHash = rl.identifier;
  } catch (err) {
    return toErrorResponse(err);
  }

  // 2) validar body
  let input;
  try {
    const body = await req.json();
    const parsed = createAnalysisInput.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, 'INVALID_INPUT', parsed.error.issues.map((i) => i.message).join('; '));
    }
    input = parsed.data;
  } catch (err) {
    if (err instanceof HttpError) return toErrorResponse(err);
    return toErrorResponse(new HttpError(400, 'INVALID_JSON', 'Body inválido: se esperaba JSON.'));
  }

  // 3) crear fila (pending)
  const sourceUrl = input.sourceType === 'text' ? null : input.url;
  const { data: created, error: insertErr } = await admin
    .from('analyses')
    .insert({ source_type: input.sourceType, source_url: sourceUrl, status: 'pending', ip_hash: ipHash })
    .select('id')
    .single();

  if (insertErr || !created) {
    return toErrorResponse(new HttpError(500, 'DB_INSERT_FAILED', insertErr?.message ?? 'No se pudo crear el análisis.'));
  }
  const id: string = created.id;

  // Helper: marca la fila como failed y devuelve el snapshot 200.
  const fail = async (code: string, message: string) => {
    await admin
      .from('analyses')
      .update({ status: 'failed', error: { code, message }, duration_ms: Date.now() - startedAt })
      .eq('id', id);
    return Response.json({ id, status: 'failed', result: null, error: { code, message } });
  };

  try {
    // 4) resolver transcript / texto
    let segments: TranscriptSegment[] | null = null;
    let fullText: string;
    let title: string;
    let language = 'es';

    if (input.sourceType === 'youtube') {
      await admin.from('analyses').update({ status: 'transcribing' }).eq('id', id);
      const t = await fetchYoutubeTranscript(input.url);
      segments = t.segments;
      fullText = t.fullText;
      title = t.title ?? 'Video de YouTube';
      language = t.language;
      await admin
        .from('analyses')
        .update({
          transcript: fullText,
          transcript_segments: segments,
          title,
          language,
        })
        .eq('id', id);
    } else if (input.sourceType === 'text') {
      fullText = input.text;
      title = input.title ?? 'Texto pegado';
      await admin.from('analyses').update({ transcript: fullText, title, language }).eq('id', id);
    } else {
      // article: extracción de contenido pendiente (fuera del alcance de arquitectura por ahora)
      throw new HttpError(501, 'ARTICLE_NOT_IMPLEMENTED', 'La extracción de artículos aún no está implementada.');
    }

    // 5) analizar (motor de Eduardo; hoy stub que lanza)
    await admin.from('analyses').update({ status: 'analyzing' }).eq('id', id);
    const engine = await analyzeContent({
      transcript: fullText,
      sourceType: input.sourceType,
      title,
      language,
      segments,
    });

    // validar salida del LLM contra el subárbol del contrato
    const llmParsed = analysisLlmSchema.safeParse(engine.analysis);
    if (!llmParsed.success) {
      throw new HttpError(
        502,
        'ENGINE_OUTPUT_INVALID',
        `La salida del motor no cumple analysisLlmSchema: ${llmParsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
      );
    }

    // 6) ensamblar respuesta final (meta + canonicalización + guardarraíl)
    const meta = buildMeta({
      sourceType: input.sourceType,
      sourceUrl,
      title,
      language,
      segments,
      model: engine.model,
    });
    const response = assembleResponse({ llm: llmParsed.data, meta, segments, fullText });

    // 7) persistir completado
    await admin
      .from('analyses')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result: response,
        hype_index: response.analysis.hypeIndex,
        verdict: response.analysis.verdict,
        model: engine.model,
        input_tokens: engine.usage?.inputTokens ?? null,
        output_tokens: engine.usage?.outputTokens ?? null,
        duration_ms: Date.now() - startedAt,
      })
      .eq('id', id);

    return Response.json({ id, status: 'completed', result: response, error: null });
  } catch (err) {
    if (err instanceof HttpError) return fail(err.code, err.message);
    return fail('INTERNAL_ERROR', err instanceof Error ? err.message : 'Error interno.');
  }
}
