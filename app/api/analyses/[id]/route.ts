import { createAdminClient } from '@/lib/supabase/admin';
import { buildAnalysisError, buildSourceSnapshot } from '@/lib/analysis-snapshot';
import { HttpError, toErrorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Devuelve un snapshot para polling sin exponer el reporte interno auditable. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('analyses')
      .select('id, status, progress, source:input->source, public_diagnosis, legacy_v1_report, last_error, created_at, completed_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new HttpError(500, 'DB_READ_FAILED', error.message);
    if (!data) throw new HttpError(404, 'NOT_FOUND', 'Análisis no encontrado.');

    return Response.json({
      id: data.id,
      status: data.status,
      progress: data.progress,
      source: buildSourceSnapshot(data.source),
      result: data.public_diagnosis,
      legacyResult: data.legacy_v1_report,
      error: buildAnalysisError(data.status, data.last_error),
      createdAt: data.created_at,
      completedAt: data.completed_at,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
