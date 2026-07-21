import { describe, expect, it } from 'vitest';
import { parseYoutubeId, transcriptTimeDivisor, truncateTranscript } from '@/lib/youtube/transcript';

describe('YouTube transcript', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extrae el video ID de %s', (url, expected) => {
    expect(parseYoutubeId(url)).toBe(expected);
  });

  it('detecta milisegundos incluso en videos de menos de 86 segundos', () => {
    expect(transcriptTimeDivisor([
      { offset: 0, duration: 2_000 },
      { offset: 2_000, duration: 2_500 },
    ])).toBe(1_000);
  });

  it('conserva tiempos que ya vienen en segundos', () => {
    expect(transcriptTimeDivisor([
      { offset: 0, duration: 2 },
      { offset: 2, duration: 2.5 },
    ])).toBe(1);
  });
});

describe('truncateTranscript', () => {
  const segment = (text: string, offsetSeconds: number) => ({
    text,
    offsetSeconds,
    durationSeconds: 5,
  });

  it('no toca transcripts dentro del límite y reporta cobertura completa', () => {
    const segments = [segment('Primera frase', 0), segment('Segunda frase', 5)];
    const result = truncateTranscript(segments, 100);
    expect(result.segments).toHaveLength(2);
    expect(result.fullText).toBe('Primera frase Segunda frase');
    expect(result.coverage).toBe(1);
  });

  it('trunca por segmentos completos y reporta la fracción analizada', () => {
    const segments = [
      segment('aaaaaaaaaa', 0),
      segment('bbbbbbbbbb', 5),
      segment('cccccccccc', 10),
      segment('dddddddddd', 15),
    ];
    // 10 + 1 + 10 = 21 <= 25; agregar el tercero daría 32.
    const result = truncateTranscript(segments, 25);
    expect(result.segments).toHaveLength(2);
    expect(result.fullText).toBe('aaaaaaaaaa bbbbbbbbbb');
    expect(result.coverage).toBeCloseTo(21 / 43, 5);
  });

  it('conserva al menos un segmento aunque supere el límite por sí solo', () => {
    const segments = [segment('x'.repeat(50), 0), segment('y'.repeat(10), 5)];
    const result = truncateTranscript(segments, 20);
    expect(result.segments).toHaveLength(1);
    expect(result.coverage).toBeGreaterThan(0);
    expect(result.coverage).toBeLessThan(1);
  });
});
