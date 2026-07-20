import { createAdminClient } from '@/lib/supabase/admin';
import { HttpError, toErrorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/analyses/[id]
 * Devuelve el estado y (si existe) el resultado del análisis. Sirve para polling
 * y para las páginas compartibles /analysis/[id].
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('analyses')
      .select('id, status, result, error, created_at, completed_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new HttpError(500, 'DB_READ_FAILED', error.message);
    if (!data) throw new HttpError(404, 'NOT_FOUND', 'Análisis no encontrado.');

    return Response.json(data);
  } catch (err) {
    return toErrorResponse(err);
  }
}
