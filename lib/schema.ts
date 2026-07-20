import { z } from 'zod';

/**
 * Fuente de verdad ejecutable del contrato (ver CONTRATO.md).
 * Ante discrepancia entre los JSON de docs/ y este schema, prevalece el schema.
 */

export const SOURCE_TYPES = ['youtube', 'article', 'text', 'audio'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

// Categorías que puede tomar un finding (neutral NO es categoría de finding).
export const FINDING_CATEGORIES = [
  'fallacy',
  'emotionalAppeal',
  'unsourcedClaim',
  'opinion',
  'sourcedClaim',
] as const;
export type FindingCategory = (typeof FINDING_CATEGORIES)[number];

// Llaves del breakdown (incluye neutral). Deben sumar 100.
export const BREAKDOWN_KEYS = [
  'emotionalAppeal',
  'fallacy',
  'opinion',
  'sourcedClaim',
  'unsourcedClaim',
  'neutral',
] as const;
export type BreakdownKey = (typeof BREAKDOWN_KEYS)[number];

export const FALLACY_TYPES = [
  'falseDichotomy',
  'artificialScarcity',
  'appealToAuthority',
  'hastyGeneralization',
  'anecdotalEvidence',
  'adHominem',
  'slipperySlope',
  'bandwagon',
] as const;

export const SEVERITIES = ['high', 'medium', 'low'] as const;
export const VERIFICATION_STATUS = ['verified', 'contradicted', 'noEvidence'] as const;

// ---------- meta ----------
export const metaSchema = z
  .object({
    schemaVersion: z.literal('1'),
    sourceType: z.enum(SOURCE_TYPES),
    sourceUrl: z.string().url().nullable(),
    title: z.string(),
    language: z.string(),
    durationSeconds: z.number().int().nonnegative().nullable(),
    model: z.string(),
    analyzedAt: z.string(),
  })
  .superRefine((m, ctx) => {
    if (m.sourceType === 'text' && m.durationSeconds !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationSeconds'],
        message: 'durationSeconds debe ser null para sourceType "text".',
      });
    }
  });

// ---------- breakdown ----------
export const breakdownSchema = z.object({
  emotionalAppeal: z.number(),
  fallacy: z.number(),
  opinion: z.number(),
  sourcedClaim: z.number(),
  unsourcedClaim: z.number(),
  neutral: z.number(),
});

// ---------- verification (solo la crea el backend en la etapa stretch) ----------
export const verificationSchema = z.object({
  status: z.enum(VERIFICATION_STATUS),
  note: z.string(),
  sourceUrl: z.string().url().nullable(),
});

// ---------- executive summary ----------
export const executiveSummarySchema = z.object({
  hasSubstance: z.string(),
  mainConcerns: z.string(),
  recommendation: z.string(),
});

// ---------- finding ----------
// Campos compartidos entre la salida del LLM y la respuesta final.
const findingCoreShape = {
  id: z.string(),
  category: z.enum(FINDING_CATEGORIES),
  fallacyType: z.enum(FALLACY_TYPES).nullable(),
  fallacyLabel: z.string().nullable(),
  quote: z.string(),
  explanation: z.string(),
  severity: z.enum(SEVERITIES).nullable(),
};

// Invariantes comunes a cualquier finding.
function refineFindingCore(
  f: { category: FindingCategory; fallacyType: unknown; fallacyLabel: unknown; severity: unknown },
  ctx: z.RefinementCtx,
) {
  const isFallacy = f.category === 'fallacy';
  if (isFallacy && (f.fallacyType === null || f.fallacyLabel === null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fallacyType'],
      message: 'fallacyType y fallacyLabel no pueden ser null cuando category === "fallacy".',
    });
  }
  if (!isFallacy && (f.fallacyType !== null || f.fallacyLabel !== null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fallacyType'],
      message: 'fallacyType y fallacyLabel deben ser null cuando category !== "fallacy".',
    });
  }
  if ((f.category === 'opinion' || f.category === 'sourcedClaim') && f.severity !== null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['severity'],
      message: 'severity debe ser null para opinion y sourcedClaim.',
    });
  }
}

// Finding tal como lo produce el LLM: SIN timestampSeconds ni verification.
export const llmFindingSchema = z.object(findingCoreShape).superRefine(refineFindingCore);

// Finding de la respuesta final: el backend añade timestampSeconds y verification.
export const findingSchema = z
  .object({
    ...findingCoreShape,
    timestampSeconds: z.number().nonnegative().nullable(),
    verification: verificationSchema.nullable(),
  })
  .superRefine((f, ctx) => {
    refineFindingCore(f, ctx);
    const claimLike = f.category === 'sourcedClaim' || f.category === 'unsourcedClaim';
    if (!claimLike && f.verification !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['verification'],
        message: 'verification solo puede ser no-null para sourcedClaim y unsourcedClaim.',
      });
    }
  });

// ---------- analysis ----------
// Subárbol que valida la salida del LLM (findings sin timestamp/verification).
export const analysisLlmSchema = z.object({
  hypeIndex: z.number().min(0).max(100),
  verdict: z.string(),
  breakdown: breakdownSchema,
  findings: z.array(llmFindingSchema).min(1),
  executiveSummary: executiveSummarySchema,
});

// analysis final (findings completos).
export const analysisSchema = z.object({
  hypeIndex: z.number().min(0).max(100),
  verdict: z.string(),
  breakdown: breakdownSchema,
  findings: z.array(findingSchema).min(1),
  executiveSummary: executiveSummarySchema,
});

// Respuesta pública completa.
export const responseSchema = z.object({
  meta: metaSchema,
  analysis: analysisSchema,
});

// ---------- input de la API ----------
export const createAnalysisInput = z.discriminatedUnion('sourceType', [
  z.object({ sourceType: z.literal('youtube'), url: z.string().url() }),
  z.object({ sourceType: z.literal('article'), url: z.string().url() }),
  z.object({ sourceType: z.literal('text'), text: z.string().min(1).max(100_000), title: z.string().optional() }),
]);

export const transcriptInput = z.object({ url: z.string().url() });
