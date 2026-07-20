import { z } from "zod";

export const percentageSchema = z.number().min(0).max(100);
export const ratioSchema = z.number().min(0).max(1);
export const urlSchema = z.url().refine((value) => /^https?:\/\//i.test(value), "Se requiere una URL HTTP(S)");

export const analysisStatusSchema = z.enum([
  "queued",
  "leased",
  "analyzing",
  "researching",
  "adjudicating",
  "scoring",
  "synthesizing",
  "completed",
  "partial",
  "needs_review",
  "failed"
]);

export const factualOutcomeSchema = z.enum([
  "supported",
  "mostlySupported",
  "misleadingMissingContext",
  "contradicted",
  "disputed",
  "insufficientEvidence",
  "notYetVerifiable"
]);

export const transcriptSegmentSchema = z.object({
  id: z.string().min(1),
  startSeconds: z.number().min(0),
  endSeconds: z.number().min(0),
  text: z.string().min(1),
  confidence: ratioSchema.nullable().default(null)
}).strict().superRefine((segment, context) => {
  if (segment.endSeconds < segment.startSeconds) {
    context.addIssue({ code: "custom", message: "endSeconds no puede ser menor que startSeconds", path: ["endSeconds"] });
  }
});

const suppliedVideoSchema = z.object({
  videoId: z.string().min(1),
  url: urlSchema,
  title: z.string().min(1),
  publishedAt: z.string().nullable().default(null),
  transcriptSegments: z.array(transcriptSegmentSchema).default([])
}).strict();

const suppliedCommentSchema = z.object({
  id: z.string().min(1),
  videoId: z.string().min(1),
  authorHash: z.string().min(1),
  text: z.string().min(1),
  publishedAt: z.string().nullable().default(null),
  samplingBucket: z.enum(["recent", "relevant", "supplied"]).default("supplied")
}).strict();

export const analysisJobInputSchema = z.object({
  source: z.object({
    url: urlSchema,
    videoId: z.string().min(1),
    title: z.string().min(1),
    durationSeconds: z.number().positive().nullable(),
    channel: z.object({
      id: z.string().min(1).nullable(),
      name: z.string().min(1),
      url: urlSchema.nullable().default(null)
    }).strict()
  }).strict(),
  transcript: z.object({
    language: z.string().min(2),
    origin: z.enum(["youtube", "speechToText", "manual", "unknown"]),
    coverage: ratioSchema,
    segments: z.array(transcriptSegmentSchema).min(1)
  }).strict(),
  suppliedContext: z.object({
    declaredLinks: z.array(urlSchema).max(50).default([]),
    recentVideos: z.array(suppliedVideoSchema).max(10).default([]),
    comments: z.array(suppliedCommentSchema).max(1000).default([])
  }).strict().optional(),
  options: z.object({
    maxClaims: z.number().int().min(1).max(5).default(3),
    webResearch: z.boolean().default(true),
    publicContext: z.boolean().default(true),
    outputLanguage: z.string().min(2).default("es"),
    timeBudgetMs: z.number().int().min(30_000).max(600_000).default(600_000)
  }).strict().default({
    maxClaims: 3,
    webResearch: true,
    publicContext: true,
    outputLanguage: "es",
    timeBudgetMs: 600_000
  })
}).strict();

export type AnalysisJobInput = z.infer<typeof analysisJobInputSchema>;

export const atomicClaimSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  quote: z.string().min(1),
  startSeconds: z.number().min(0),
  endSeconds: z.number().min(0),
  centrality: ratioSchema,
  potentialHarm: ratioSchema,
  actionInducement: ratioSchema,
  verifiability: ratioSchema,
  repetition: ratioSchema,
  isCentralPromise: z.boolean(),
  sensitiveDomain: z.enum(["health", "finance", "legal", "safety", "none"])
}).strict();

export const claimPlanSchema = z.object({
  centralPromise: z.string().nullable(),
  claims: z.array(atomicClaimSchema).max(20),
  summary: z.string().min(1)
}).strict();

export const evidenceSchema = z.object({
  id: z.string().min(1),
  claimId: z.string().min(1).nullable(),
  url: urlSchema,
  title: z.string().min(1),
  publisher: z.string().nullable(),
  excerpt: z.string().min(1).max(1200),
  stance: z.enum(["supports", "contradicts", "neutral", "context", "claimOrigin"]),
  sourceType: z.enum([
    "primaryOfficial",
    "regulatorFinalAction",
    "courtRecord",
    "academic",
    "independentReporting",
    "creatorControlled",
    "publicProfile",
    "audienceComment",
    "other"
  ]),
  publishedAt: z.string().nullable(),
  retrievedAt: z.string(),
  directness: ratioSchema,
  temporalFit: ratioSchema,
  geographicFit: ratioSchema,
  independence: ratioSchema,
  proceduralStatus: z.enum(["final", "pending", "allegation", "notApplicable", "unknown"]),
  originClusterId: z.string().min(1),
  contentHash: z.string().nullable().default(null)
}).strict();

export type Evidence = z.infer<typeof evidenceSchema>;

export const provenanceAuditSchema = z.object({
  identityStatus: z.enum(["confirmed", "ambiguous", "notFound"]),
  identityNotes: z.array(z.string()).max(5),
  originClusters: z.array(z.object({
    originClusterId: z.string().min(1),
    evidenceIds: z.array(z.string().min(1)).min(1),
    reason: z.string().min(1),
    conflictDetected: z.boolean()
  }).strict()),
  excludedEvidenceIds: z.array(z.string()),
  limitations: z.array(z.string()).max(5)
}).strict();

export const claimResearchSchema = z.object({
  claimId: z.string().min(1),
  searchedQueries: z.array(z.string()).max(4),
  evidence: z.array(evidenceSchema).max(12),
  limitations: z.array(z.string()).max(5)
}).strict();

export const discourseAnalysisSchema = z.object({
  summary: z.string().min(1),
  marketingPromotionPct: percentageSchema,
  candidateValuePct: percentageSchema,
  urgencyExposurePct: percentageSchema,
  persuasionExposurePct: percentageSchema,
  persuasionRiskScore: percentageSchema,
  coverage: ratioSchema,
  findings: z.array(z.object({
    id: z.string().min(1),
    quote: z.string().min(1),
    startSeconds: z.number().min(0),
    endSeconds: z.number().min(0),
    techniques: z.array(z.enum([
      "urgency", "scarcity", "emotionalPressure", "identityPressure",
      "authorityOrSocialProof", "testimonialAsEvidence", "certaintyEvidenceMismatch",
      "falsePrecisionOrMissingDenominator", "causalOverreach", "priceOrRiskFraming",
      "inoculationAgainstCritics", "falseDichotomy", "movingGoalposts"
    ])).min(1),
    severity: z.enum(["low", "medium", "high"]),
    confidence: ratioSchema,
    explanation: z.string().min(1)
  }).strict()).max(20)
}).strict();

export const publicContextResearchSchema = z.object({
  identity: z.object({
    status: z.enum(["confirmed", "ambiguous", "notFound"]),
    confidence: ratioSchema,
    attributionSignals: z.array(z.string()).max(10)
  }).strict(),
  reviewedPlaces: z.array(z.string()).max(15),
  positiveCorroborated: z.array(z.object({ text: z.string(), evidenceIds: z.array(z.string()) }).strict()).max(10),
  adverseCorroborated: z.array(z.object({ text: z.string(), evidenceIds: z.array(z.string()) }).strict()).max(10),
  opinionSignals: z.array(z.object({ text: z.string(), evidenceIds: z.array(z.string()) }).strict()).max(10),
  crossVideoRiskScore: percentageSchema.nullable(),
  crossVideoCoverage: ratioSchema,
  transparencyRiskScore: percentageSchema.nullable(),
  transparencyCoverage: ratioSchema,
  publicRiskScore: percentageSchema.nullable(),
  publicRiskCoverage: ratioSchema,
  audienceEvidenceRiskScore: percentageSchema.nullable(),
  audienceEvidenceCoverage: ratioSchema,
  evidence: z.array(evidenceSchema),
  limitations: z.array(z.string())
}).strict();

export const claimJudgmentSchema = z.object({
  claimId: z.string().min(1),
  outcome: factualOutcomeSchema,
  explanation: z.string().min(1),
  approvedEvidenceIds: z.array(z.string()),
  rejectedEvidenceIds: z.array(z.string()),
  confidence: ratioSchema,
  temporalAndGeographicFitSufficient: z.boolean(),
  hasStrongCounterevidence: z.boolean(),
  needsHumanReview: z.boolean()
}).strict();

export type ClaimJudgment = z.infer<typeof claimJudgmentSchema>;

const publicItemSchema = z.object({
  texto: z.string().min(1),
  fuentes: z.array(z.string())
}).strict();

export const publicDiagnosisSchema = z.object({
  diagnostico_final: z.object({
    titular: z.string().min(1),
    puntaje_de_alerta_pct: percentageSchema.nullable(),
    nivel: z.enum(["bajo", "moderado", "medio", "alto", "muy alto", "sin_conclusion", "precaucion_media"]),
    afirmaciones: z.object({
      respaldadas_pct: percentageSchema,
      incompletas_o_sin_contexto_pct: percentageSchema,
      incorrectas_segun_fuentes_pct: percentageSchema,
      sin_comprobar_pct: percentageSchema,
      explicacion: z.string().min(1)
    }).strict(),
    posible_manipulacion: z.object({
      contenido_con_senales_pct: percentageSchema,
      urgencia_o_presion_pct: percentageSchema,
      senales_principales: z.array(z.string()).max(5),
      explicacion: z.string().min(1)
    }).strict(),
    evidencia_revisada_pct: percentageSchema,
    estado_de_la_revision: z.enum(["completa", "parcial", "requiere_revision_humana", "amplia"]),
    consejo_inmediato: z.string().min(1)
  }).strict().superRefine((diagnosis, context) => {
    const distribution = diagnosis.afirmaciones;
    const sum = distribution.respaldadas_pct + distribution.incompletas_o_sin_contexto_pct
      + distribution.incorrectas_segun_fuentes_pct + distribution.sin_comprobar_pct;
    if (sum !== 100) context.addIssue({ code: "custom", message: "Los porcentajes de afirmaciones deben sumar 100", path: ["afirmaciones"] });
  }),
  resumen: z.object({
    en_pocas_palabras: z.string().min(1),
    lo_que_aporta: z.array(publicItemSchema).max(3),
    ten_cuidado_con: z.array(publicItemSchema).max(3),
    no_pudimos_comprobar: z.array(publicItemSchema).max(3)
  }).strict(),
  contenido_del_video: z.object({
    venta_o_promocion_pct: percentageSchema,
    informacion_util_pct: percentageSchema,
    informacion_util_con_respaldo_pct: percentageSchema,
    urgencia_o_presion_pct: percentageSchema,
    explicacion: z.string().min(1)
  }).strict(),
  contrastes: z.array(z.object({
    dice: z.string().min(1),
    encontramos: z.string().min(1),
    conclusion: z.enum(["coincide", "coincide_en_parte", "falta_contexto", "no_coincide", "hay_desacuerdo_entre_fuentes", "no_se_pudo_comprobar", "todavia_no_se_puede_saber"]),
    explicacion: z.string().min(1),
    momento_del_video: z.string().regex(/^\d{2,}:\d{2}$/),
    fuentes: z.array(z.string())
  }).strict()).max(3),
  contexto_publico: z.object({
    que_revisamos: z.array(z.string()),
    lo_positivo_comprobado: z.array(publicItemSchema),
    alertas_comprobadas: z.array(publicItemSchema),
    comentarios_que_solo_son_opiniones: z.array(publicItemSchema),
    explicacion: z.string().min(1)
  }).strict(),
  consejo: z.object({
    recomendacion_principal: z.string().min(1),
    por_que: z.string().min(1),
    antes_de_decidir: z.array(z.string()).max(3),
    preguntas_que_puedes_hacer: z.array(z.string()).max(3)
  }).strict(),
  fuentes_principales: z.array(z.object({
    id: z.string().min(1),
    nombre: z.string().min(1),
    enlace: urlSchema,
    para_que_la_usamos: z.string().min(1)
  }).strict()).max(5),
  avisos: z.array(z.string())
}).strict();

export type PublicDiagnosis = z.infer<typeof publicDiagnosisSchema>;

export const riskCategorySchema = z.enum([
  "factualRisk",
  "manipulationPersuasionRisk",
  "crossVideoPatternRisk",
  "transparencyRisk",
  "corroboratedPublicRisk",
  "audienceEvidenceRisk"
]);

export const riskComponentSchema = z.object({
  category: riskCategorySchema,
  fixedWeightPoints: z.number().positive(),
  score: percentageSchema.nullable(),
  scoreRaw: percentageSchema.nullable(),
  coverage: ratioSchema,
  coverageNumerator: z.number().min(0),
  coverageDenominator: z.number().positive(),
  coverageMethod: z.string().min(1),
  confidence: ratioSchema,
  knownWeightPoints: z.number().min(0),
  knownRiskPoints: z.number().min(0),
  formulaVersion: z.string().min(1),
  findingRefs: z.array(z.string()),
  sourceRefs: z.array(z.string())
}).strict();

export const internalReportSchema = z.object({
  meta: z.object({
    schemaVersion: z.enum(["2.0", "2.0.0-draft"]),
    methodologyVersion: z.string(),
    methodologyStatus: z.literal("experimental"),
    runId: z.string(),
    status: z.enum(["completed", "partial", "needs_review"]),
    asOf: z.string(),
    language: z.string(),
    isIllustrativeFixture: z.boolean().default(false)
  }).passthrough(),
  input: z.record(z.string(), z.unknown()),
  globalRisk: z.object({
    observedRiskScore: percentageSchema.nullable(),
    observedRiskScoreRaw: percentageSchema.nullable(),
    unit: z.string(),
    status: z.string(),
    scoreBand: z.enum(["low", "moderateLow", "mixed", "high", "veryHigh", "indeterminate", "insufficientData"]),
    scoreCoverage: ratioSchema,
    knownWeightPoints: z.number().min(0).max(100),
    knownRiskPoints: z.number().min(0).max(100),
    missingWeightPoints: z.number().min(0).max(100),
    uncertaintyRange: z.object({ min: percentageSchema, max: percentageSchema, minRaw: percentageSchema, maxRaw: percentageSchema }).strict(),
    assessmentAllowed: z.boolean(),
    publicationAllowedWithoutHumanReview: z.boolean(),
    reason: z.string(),
    safetyOverride: z.object({ active: z.boolean(), type: z.string(), action: z.string(), findingRefs: z.array(z.string()) }).strict(),
    weights: z.record(riskCategorySchema, ratioSchema),
    components: z.array(riskComponentSchema).length(6)
  }).strict(),
  executiveSummaryGeneral: z.record(z.string(), z.unknown()),
  categorySummaries: z.array(z.record(z.string(), z.unknown())),
  contentMetrics: z.record(z.string(), z.unknown()),
  claimInventory: z.record(z.string(), z.unknown()),
  keyFindings: z.array(z.record(z.string(), z.unknown())),
  claims: z.array(z.record(z.string(), z.unknown())),
  persuasionFindings: z.array(z.record(z.string(), z.unknown())),
  recentSamplePatterns: z.array(z.record(z.string(), z.unknown())),
  creatorPublicContext: z.record(z.string(), z.unknown()),
  audienceSignals: z.record(z.string(), z.unknown()),
  sourceAppendix: z.array(evidenceSchema.or(z.record(z.string(), z.unknown()))),
  recommendations: z.array(z.record(z.string(), z.unknown())),
  limitations: z.array(z.record(z.string(), z.unknown())),
  runTrace: z.record(z.string(), z.unknown())
}).strict();

export type InternalReport = z.infer<typeof internalReportSchema>;

export const legacyV1Schema = z.object({
  meta: z.object({
    schemaVersion: z.literal("1"),
    sourceType: z.literal("youtube"),
    sourceUrl: urlSchema,
    title: z.string(),
    language: z.string(),
    durationSeconds: z.number().nullable(),
    model: z.string(),
    analyzedAt: z.string()
  }).strict(),
  analysis: z.object({
    hypeIndex: percentageSchema,
    verdict: z.string(),
    breakdown: z.object({
      emotionalAppeal: percentageSchema,
      fallacy: percentageSchema,
      opinion: percentageSchema,
      sourcedClaim: percentageSchema,
      unsourcedClaim: percentageSchema,
      neutral: percentageSchema
    }).strict(),
    findings: z.array(z.record(z.string(), z.unknown())),
    executiveSummary: z.object({ hasSubstance: z.string(), mainConcerns: z.string(), recommendation: z.string() }).strict()
  }).strict()
}).strict();

export type LegacyV1 = z.infer<typeof legacyV1Schema>;
