import { z } from 'zod';

// El contrato completo vive en @motor/analysis-contracts. Este archivo solo
// valida las solicitudes HTTP de entrada de la app Next.js.
export const createAnalysisInput = z.discriminatedUnion('sourceType', [
  z.object({ sourceType: z.literal('youtube'), url: z.url() }).strict(),
  z.object({ sourceType: z.literal('article'), url: z.url() }).strict(),
  z.object({
    sourceType: z.literal('text'),
    text: z.string().min(1).max(100_000),
    title: z.string().optional(),
  }).strict(),
]);

export const transcriptInput = z.object({ url: z.url() }).strict();

export type CreateAnalysisInput = z.infer<typeof createAnalysisInput>;
