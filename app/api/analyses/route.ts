import { createAdminClient } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/ratelimit';
import { createAnalysisInput } from '@/lib/schema';
import { fetchYoutubeTranscript } from '@/lib/youtube/transcript';
import { buildYoutubeAnalysisInput } from '@/lib/analysis-input';
import { HttpError, toErrorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/analyses
 *
 * Resuelve el transcript de YouTube, lo adapta al AnalysisJobInput compartido
 * y lo encola. El análisis pesado ocurre en analysis-worker, fuera del request.
 */
export async function POST(req: Request) {
  try {
    await enforceRateLimit(req);

    const parsed = createAnalysisInput.safeParse(await req.json());
    if (!parsed.success) {
      throw new HttpError(400, 'INVALID_INPUT', parsed.error.issues.map((issue) => issue.message).join('; '));
    }
    if (parsed.data.sourceType !== 'youtube') {
      throw new HttpError(501, 'SOURCE_NOT_IMPLEMENTED', 'Por ahora el motor acepta enlaces de YouTube.');
    }

    const transcript = await fetchYoutubeTranscript(parsed.data.url);
    const input = buildYoutubeAnalysisInput(parsed.data.url, transcript);
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('analyses')
      .insert({ input, status: 'queued', progress: 0 })
      .select('id, status, progress, created_at')
      .single();

    if (error || !data) {
      throw new HttpError(500, 'DB_INSERT_FAILED', error?.message ?? 'No se pudo encolar el análisis.');
    }

    return Response.json({ ...data, result: null, error: null }, { status: 202 });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return toErrorResponse(new HttpError(400, 'INVALID_JSON', 'Body inválido: se esperaba JSON.'));
    }
    return toErrorResponse(err);
  }
}
