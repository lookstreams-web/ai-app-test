import { describe, expect, it } from 'vitest';
import { analysisJobInputSchema } from '@motor/analysis-contracts';
import { buildYoutubeAnalysisInput } from '@/lib/analysis-input';

describe('buildYoutubeAnalysisInput', () => {
  it('convierte la salida de Jorge al contrato que consume el worker', () => {
    const input = buildYoutubeAnalysisInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      videoId: 'dQw4w9WgXcQ',
      title: 'Video de prueba',
      language: 'es',
      channelName: 'Canal de prueba',
      channelUrl: 'https://www.youtube.com/@prueba',
      fullText: 'Primera frase Segunda frase',
      segments: [
        { text: 'Primera frase', offsetSeconds: 0, durationSeconds: 2 },
        { text: 'Segunda frase', offsetSeconds: 2, durationSeconds: 3 },
      ],
    });

    expect(analysisJobInputSchema.safeParse(input).success).toBe(true);
    expect(input.source.durationSeconds).toBe(5);
    expect(input.source.channel.name).toBe('Canal de prueba');
    expect(input.transcript.segments[1]).toMatchObject({
      id: 'segment-2',
      startSeconds: 2,
      endSeconds: 5,
    });
  });
});
