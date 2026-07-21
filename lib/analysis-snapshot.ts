export interface AnalysisSourceSnapshot {
  url: string;
  title: string;
  channel: {
    name: string;
    url: string | null;
  };
}

export interface AnalysisErrorSnapshot {
  code: 'ANALYSIS_FAILED';
  message: string;
}

export function buildSourceSnapshot(value: unknown): AnalysisSourceSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  if (typeof source.url !== 'string' || typeof source.title !== 'string') return null;

  const rawChannel = source.channel;
  const channel = rawChannel && typeof rawChannel === 'object'
    ? rawChannel as Record<string, unknown>
    : null;

  return {
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
