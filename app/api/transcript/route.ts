import { enforceRateLimit } from '@/lib/ratelimit';
import { transcriptInput } from '@/lib/schema';
import { fetchYoutubeTranscript } from '@/lib/youtube/transcript';
import { HttpError, toErrorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/transcript
 * Utilidad de debug/preview: URL de YouTube → transcript con timestamps.
 * No persiste nada. Útil para que Joel (UI) y Eduardo (motor) prueben rápido.
 */
export async function POST(req: Request) {
  try {
    await enforceRateLimit(req);
    const body = await req.json();
    const parsed = transcriptInput.safeParse(body);
    if (!parsed.success) {
      throw new HttpError(400, 'INVALID_INPUT', parsed.error.issues.map((i) => i.message).join('; '));
    }
    const result = await fetchYoutubeTranscript(parsed.data.url);
    return Response.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
