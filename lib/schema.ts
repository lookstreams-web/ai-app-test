import { z } from 'zod';

// El contrato completo vive en @motor/analysis-contracts. Este archivo solo
// valida las solicitudes HTTP de entrada de la app Next.js.
export const outputLanguageInput = z.enum(['es', 'en']);

export const createAnalysisInput = z.discriminatedUnion('sourceType', [
  z.object({
    sourceType: z.literal('youtube'),
    url: z.url(),
    outputLanguage: outputLanguageInput.optional(),
  }).strict(),
  z.object({
    sourceType: z.literal('article'),
    url: z.url(),
    outputLanguage: outputLanguageInput.optional(),
  }).strict(),
  z.object({
    sourceType: z.literal('text'),
    text: z.string().min(1).max(100_000),
    title: z.string().optional(),
    outputLanguage: outputLanguageInput.optional(),
  }).strict(),
]);

// La grabación de voz llega como multipart (FormData), no como JSON: el handler
// distingue por content-type y valida estos campos de texto por separado. El
// archivo de audio se valida aparte (tipo y tamaño) en el endpoint.
export const audioAnalysisFields = z.object({
  language: outputLanguageInput.default('es'),
  outputLanguage: outputLanguageInput.optional(),
}).strict();

export type AudioAnalysisFields = z.infer<typeof audioAnalysisFields>;

export const transcriptInput = z.object({ url: z.url() }).strict();

export type CreateAnalysisInput = z.infer<typeof createAnalysisInput>;
