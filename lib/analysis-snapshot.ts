export interface YoutubeSourceSnapshot {
  kind: 'youtube';
  url: string;
  title: string;
  channel: {
    name: string;
    url: string | null;
  };
}

export interface VoiceRecordingSourceSnapshot {
  kind: 'voiceRecording';
  url: null;
  // Puede ser null durante `transcribing`, cuando el input todavía es el sobre
  // de audio y aún no existe `source.title`.
  title: string | null;
  channel: null;
  recordedAt: string | null;
}

export type AnalysisSourceSnapshot = YoutubeSourceSnapshot | VoiceRecordingSourceSnapshot;

export interface AnalysisErrorSnapshot {
  code: 'ANALYSIS_FAILED';
  message: string;
}

/**
 * Construye la fuente pública del snapshot. Nunca expone la ruta del audio.
 * `inputKind` es el `input->kind` de la fila: durante la etapa `transcribing`
 * (o en cola) el input todavía es el sobre `audioPending` y aún no hay `source`,
 * así que lo usamos para etiquetar la fuente como grabación de voz.
 * `envelopeRecordedAt` es el `input->recordedAt` del sobre: permite mostrar la
 * fecha de la grabación desde el primer polling, antes de que exista `source`.
 */
export function buildSourceSnapshot(
  value: unknown,
  inputKind?: unknown,
  envelopeRecordedAt?: unknown,
): AnalysisSourceSnapshot | null {
  const source = value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

  if (source?.kind === 'voiceRecording' || inputKind === 'audioPending') {
    const recordedAt = typeof source?.recordedAt === 'string'
      ? source.recordedAt
      : typeof envelopeRecordedAt === 'string' ? envelopeRecordedAt : null;
    return {
      kind: 'voiceRecording',
      url: null,
      title: typeof source?.title === 'string' ? source.title : null,
      channel: null,
      recordedAt,
    };
  }

  if (!source || typeof source.title !== 'string' || typeof source.url !== 'string') return null;

  const rawChannel = source.channel;
  const channel = rawChannel && typeof rawChannel === 'object'
    ? rawChannel as Record<string, unknown>
    : null;

  return {
    kind: 'youtube',
    url: source.url,
    title: source.title,
    channel: {
      name: typeof channel?.name === 'string' ? channel.name : 'Canal no identificado',
      url: typeof channel?.url === 'string' ? channel.url : null,
    },
  };
}

export function buildAnalysisError(status: unknown, lastError: unknown): AnalysisErrorSnapshot | null {
  if (status !== 'failed' || typeof lastError !== 'string' || lastError.length === 0) return null;
  return { code: 'ANALYSIS_FAILED', message: lastError };
}
