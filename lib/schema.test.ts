import { describe, expect, it } from 'vitest';
import { createAnalysisInput } from '@/lib/schema';

describe('createAnalysisInput', () => {
  it('acepta español e inglés en solicitudes de YouTube', () => {
    expect(createAnalysisInput.parse({
      sourceType: 'youtube',
      url: 'https://www.youtube.com/watch?v=test',
      outputLanguage: 'en',
    }).outputLanguage).toBe('en');

    expect(createAnalysisInput.parse({
      sourceType: 'youtube',
      url: 'https://www.youtube.com/watch?v=test',
      outputLanguage: 'es',
    }).outputLanguage).toBe('es');
  });

  it('conserva español como compatibilidad cuando no se envía idioma', () => {
    const parsed = createAnalysisInput.parse({
      sourceType: 'youtube',
      url: 'https://www.youtube.com/watch?v=test',
    });
    expect(parsed.outputLanguage).toBeUndefined();
  });

  it('rechaza idiomas que el motor todavía no soporta', () => {
    expect(() => createAnalysisInput.parse({
      sourceType: 'youtube',
      url: 'https://www.youtube.com/watch?v=test',
      outputLanguage: 'fr',
    })).toThrow();
  });
});
