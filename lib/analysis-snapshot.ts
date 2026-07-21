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
  title: string;
  channel: null;
  recordedAt: string | null;
}

export type AnalysisSourceSnapshot = YoutubeSourceSnapshot | VoiceRecordingSourceSnapshot;

export interface AnalysisErrorSnapshot {
  code: 'ANALYSIS_FAILED';
  message: string;
}

export function buildSourceSnapshot(value: unknown): AnalysisSourceSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (typeof source.title !== 'string') return null;

  if (source.kind === 'voiceRecording') {
    return {
      kind: 'voiceRecording',
      url: null,
      title: source.title,
      channel: null,
      recordedAt: typeof source.recordedAt === 'string' ? source.recordedAt : null,
    };
  }

  if (typeof source.url !== 'string') return null;

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
