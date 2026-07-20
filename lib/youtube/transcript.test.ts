import { describe, expect, it } from 'vitest';
import { parseYoutubeId, transcriptTimeDivisor } from '@/lib/youtube/transcript';

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
