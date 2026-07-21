import { describe, expect, it } from 'vitest';
import { buildAnalysisError, buildSourceSnapshot } from '@/lib/analysis-snapshot';

describe('snapshot público de análisis', () => {
  it('expone solo la fuente necesaria para identificar el video', () => {
    expect(buildSourceSnapshot({
      url: 'https://www.youtube.com/watch?v=test',
      videoId: 'test',
      title: 'Video de prueba',
      durationSeconds: 120,
      channel: {
        id: 'channel-1',
        name: 'Canal de prueba',
        url: 'https://www.youtube.com/@prueba',
      },
      transcript: 'no debe exponerse',
    })).toEqual({
      url: 'https://www.youtube.com/watch?v=test',
      title: 'Video de prueba',
      channel: {
        name: 'Canal de prueba',
        url: 'https://www.youtube.com/@prueba',
      },
    });
  });

  it('no presenta como fallo un error interno conservado durante un reintento', () => {
    expect(buildAnalysisError('queued', 'web_search_timeout')).toBeNull();
    expect(buildAnalysisError('researching', 'web_search_timeout')).toBeNull();
  });

  it('expone el error cuando el trabajo terminó en failed', () => {
    expect(buildAnalysisError('failed', 'Se agotaron los intentos.')).toEqual({
      code: 'ANALYSIS_FAILED',
      message: 'Se agotaron los intentos.',
    });
  });
});
