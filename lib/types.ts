import type { z } from 'zod';
import type {
  metaSchema,
  breakdownSchema,
  verificationSchema,
  executiveSummarySchema,
  llmFindingSchema,
  findingSchema,
  analysisLlmSchema,
  analysisSchema,
  responseSchema,
  createAnalysisInput,
} from '@/lib/schema';

// Tipos inferidos del schema Zod. Fuente única de verdad para motor (Eduardo) y UI (Joel).
export type Meta = z.infer<typeof metaSchema>;
export type Breakdown = z.infer<typeof breakdownSchema>;
export type Verification = z.infer<typeof verificationSchema>;
export type ExecutiveSummary = z.infer<typeof executiveSummarySchema>;
export type LlmFinding = z.infer<typeof llmFindingSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type AnalysisLlm = z.infer<typeof analysisLlmSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type AnalysisResponse = z.infer<typeof responseSchema>;
export type CreateAnalysisInput = z.infer<typeof createAnalysisInput>;

export type { SourceType, FindingCategory, BreakdownKey } from '@/lib/schema';

// Estado de una fila `analyses` en la base de datos.
export type AnalysisStatus =
  | 'pending'
  | 'transcribing'
  | 'analyzing'
  | 'verifying'
  | 'completed'
  | 'failed';

// Segmento de transcript con timestamps (unidad: segundos).
export interface TranscriptSegment {
  text: string;
  offsetSeconds: number;
  durationSeconds: number;
}
