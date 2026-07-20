import { createAdminClient } from '@/lib/supabase/admin';
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
      .select('id, status, progress, public_diagnosis, legacy_v1_report, last_error, created_at, completed_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new HttpError(500, 'DB_READ_FAILED', error.message);
    if (!data) throw new HttpError(404, 'NOT_FOUND', 'Análisis no encontrado.');

    return Response.json({
      id: data.id,
      status: data.status,
      progress: data.progress,
      result: data.public_diagnosis,
      legacyResult: data.legacy_v1_report,
      error: data.last_error ? { code: 'ANALYSIS_FAILED', message: data.last_error } : null,
      createdAt: data.created_at,
      completedAt: data.completed_at,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
