import { randomUUID } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { enforceRateLimit } from '@/lib/ratelimit';
import { audioAnalysisFields, createAnalysisInput } from '@/lib/schema';
import { fetchYoutubeTranscript } from '@/lib/youtube/transcript';
import {
  ANALYSIS_AUDIO_BUCKET,
  MAX_AUDIO_BYTES,
  audioObjectPath,
  buildAudioJobEnvelope,
  buildYoutubeAnalysisInput,
} from '@/lib/analysis-input';
import { HttpError, toErrorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/analyses
 *
 * Rama JSON (YouTube): resuelve el transcript, lo adapta al AnalysisJobInput
 * compartido y lo encola. Rama multipart (grabación de voz): sube el audio al
 * bucket privado y encola el sobre `audioPending`. En ambos casos el trabajo
 * pesado (transcripción y análisis) ocurre en el worker, fuera del request.
 */
export async function POST(req: Request) {
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    return handleAudio(req);
  }

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
    const input = buildYoutubeAnalysisInput(
      parsed.data.url,
      transcript,
      parsed.data.outputLanguage ?? 'es',
    );
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

/**
 * Rama multipart: solo valida, sube el audio a Storage y encola el sobre. No
 * ejecuta OpenAI ni trabajo en background (decisión de ARQUITECTURA.md).
 */
async function handleAudio(req: Request) {
  try {
    await enforceRateLimit(req);

    const form = await req.formData();
    const file = form.get('audio');
    if (!(file instanceof Blob) || file.size === 0) {
      throw new HttpError(400, 'INVALID_AUDIO', 'Falta el archivo de audio de la grabación.');
    }
    if (!file.type.startsWith('audio/')) {
      throw new HttpError(400, 'INVALID_AUDIO_TYPE', 'El archivo no es un audio válido.');
    }
    if (file.size > MAX_AUDIO_BYTES) {
      throw new HttpError(413, 'AUDIO_TOO_LARGE', 'La grabación supera el tamaño máximo permitido.');
    }

    const fields = audioAnalysisFields.safeParse({
      language: form.get('language') ?? undefined,
      outputLanguage: form.get('outputLanguage') ?? undefined,
    });
    if (!fields.success) {
      throw new HttpError(400, 'INVALID_INPUT', fields.error.issues.map((issue) => issue.message).join('; '));
    }

    // Generamos el id antes de subir para derivar la ruta del audio sin insertar
    // una fila que el worker pudiera tomar antes de que el objeto exista.
    const id = randomUUID();
    const audioPath = audioObjectPath(id);
    const language = fields.data.language;
    const outputLanguage = fields.data.outputLanguage ?? language;

    const admin = createAdminClient();
    const audioBytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(ANALYSIS_AUDIO_BUCKET)
      .upload(audioPath, audioBytes, { contentType: 'audio/webm', upsert: false });
    if (uploadError) {
      throw new HttpError(500, 'AUDIO_UPLOAD_FAILED', uploadError.message);
    }

    const input = buildAudioJobEnvelope(audioPath, language, outputLanguage);
    const { data, error } = await admin
      .from('analyses')
      .insert({ id, input, status: 'queued', progress: 0 })
      .select('id, status, progress, created_at')
      .single();

    if (error || !data) {
      // Si la fila no se pudo crear, no dejamos el audio huérfano en el bucket.
      await admin.storage.from(ANALYSIS_AUDIO_BUCKET).remove([audioPath]);
      throw new HttpError(500, 'DB_INSERT_FAILED', error?.message ?? 'No se pudo encolar el análisis.');
    }

    return Response.json({ ...data, result: null, error: null }, { status: 202 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
