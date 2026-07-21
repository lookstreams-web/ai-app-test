import { describe, expect, it } from 'vitest';
import { analysisJobInputSchema, audioJobEnvelopeSchema } from '@motor/analysis-contracts';
import {
  audioObjectPath,
  buildAudioJobEnvelope,
  buildYoutubeAnalysisInput,
} from '@/lib/analysis-input';

describe('buildYoutubeAnalysisInput', () => {
  it('convierte la salida de Jorge al contrato que consume el worker', () => {
    const input = buildYoutubeAnalysisInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      videoId: 'dQw4w9WgXcQ',
      title: 'Video de prueba',
      language: 'es',
      channelName: 'Canal de prueba',
      channelUrl: 'https://www.youtube.com/@prueba',
      fullText: 'Primera frase Segunda frase',
      coverage: 1,
      segments: [
        { text: 'Primera frase', offsetSeconds: 0, durationSeconds: 2 },
        { text: 'Segunda frase', offsetSeconds: 2, durationSeconds: 3 },
      ],
    });

    expect(analysisJobInputSchema.safeParse(input).success).toBe(true);
    expect(input.source.durationSeconds).toBe(5);
    expect(input.source.kind).toBe('youtube');
    if (input.source.kind === 'youtube') {
      expect(input.source.channel.name).toBe('Canal de prueba');
    }
    expect(input.transcript.segments[1]).toMatchObject({
      id: 'segment-2',
      startSeconds: 2,
      endSeconds: 5,
    });
    expect(input.options.outputLanguage).toBe('es');
  });

  it('propaga inglés a las opciones que consume el motor', () => {
    const input = buildYoutubeAnalysisInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
      videoId: 'dQw4w9WgXcQ',
      title: 'Test video',
      language: 'es',
      channelName: 'Test channel',
      channelUrl: null,
      fullText: 'Contenido original',
      coverage: 0.4,
      segments: [{ text: 'Contenido original', offsetSeconds: 0, durationSeconds: 2 }],
    }, 'en');

    expect(input.options).toMatchObject({
      maxClaims: 3,
      webResearch: true,
      publicContext: true,
      outputLanguage: 'en',
      timeBudgetMs: 600_000,
    });
    expect(input.transcript.coverage).toBe(0.4);
  });
});

describe('buildAudioJobEnvelope', () => {
  it('construye un sobre audioPending válido con la ruta del audio', () => {
    const envelope = buildAudioJobEnvelope('abc-123.webm', 'es', 'en');
    expect(audioJobEnvelopeSchema.safeParse(envelope).success).toBe(true);
    expect(envelope).toMatchObject({
      kind: 'audioPending',
      audioPath: 'abc-123.webm',
      language: 'es',
      outputLanguage: 'en',
      recordedAt: null,
    });
  });

  it('usa el idioma de salida por defecto igual al idioma de entrada cuando no se pasa', () => {
    const envelope = buildAudioJobEnvelope('x.webm', 'en');
    expect(envelope.outputLanguage).toBe('es');
  });

  it('deriva la ruta del audio a partir del id del análisis', () => {
    expect(audioObjectPath('9f8e')).toBe('9f8e.webm');
  });
});
