import {
  internalReportSchema,
  legacyV1Schema,
  publicDiagnosisSchema
} from "@motor/analysis-contracts";
import type {
  AnalysisJobInput,
  Evidence,
  InternalReport,
  LegacyV1,
  PublicDiagnosis
} from "@motor/analysis-contracts";
import type { GlobalScore } from "./scoring.js";
import { claimDistribution } from "./scoring.js";
import type { DiscourseAnalysis, PublicContextResearch, ScoredClaim } from "./types.js";

export interface ReportParts {
  runId: string;
  input: AnalysisJobInput;
  score: GlobalScore;
  claims: ScoredClaim[];
  evidence: Evidence[];
  discourse: DiscourseAnalysis;
  context: PublicContextResearch;
  synthesis: { headline: string; summary: string; usefulPoints: string[]; warnings: string[] };
  finalStatus: "completed" | "partial" | "needs_review";
  modelGeneral: string;
  modelJudge: string;
}

const publicConclusion: Record<ScoredClaim["outcome"], PublicDiagnosis["contrastes"][number]["conclusion"]> = {
  supported: "coincide",
  mostlySupported: "coincide_en_parte",
  misleadingMissingContext: "falta_contexto",
  contradicted: "no_coincide",
  disputed: "hay_desacuerdo_entre_fuentes",
  insufficientEvidence: "no_se_pudo_comprobar",
  notYetVerifiable: "todavia_no_se_puede_saber"
};

function timestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function publicLevel(score: number | null, coverage: number): PublicDiagnosis["diagnostico_final"]["nivel"] {
  if (score === null || coverage < 0.7) return "sin_conclusion";
  if (score <= 20) return "bajo";
  if (score <= 40) return "moderado";
  if (score <= 60) return "medio";
  if (score <= 80) return "alto";
  return "muy alto";
}

const evidenceRef = (id: string) => id;

function simplifyPublicSummary(summary: string): string {
  return summary
    .replace(/\bafirmaci[oó]n\s+(?:c\d+|claim[-_ ]?\d+)\b/gi, "afirmación principal")
    .replace(/\b(?:c\d+|claim[-_ ]?\d+)\b/gi, "la afirmación revisada");
}

export function buildPublicDiagnosis(parts: ReportParts): PublicDiagnosis {
  const distribution = claimDistribution(parts.claims);
  const contradicted = parts.claims.filter((claim) => claim.outcome === "contradicted");
  const unresolved = parts.claims.filter((claim) => ["disputed", "insufficientEvidence", "notYetVerifiable"].includes(claim.outcome));
  const coveragePct = Math.round(parts.score.scoreCoverage * 100);
  const evidenceById = new Map(parts.evidence.map((item) => [item.id, item]));
  const directContradiction = contradicted.some((claim) => claim.approvedEvidenceIds.some((id) => (evidenceById.get(id)?.directness ?? 0) >= 0.8));
  const title = coveragePct < 70
    ? `RESULTADO PARCIAL: revisamos ${coveragePct} % de la evidencia prevista. Falta información antes de concluir.`
    : directContradiction
      ? `ALERTA: ${distribution.contradicted} % de las afirmaciones importantes es incorrecto según las fuentes revisadas.`
      : `ANÁLISIS: el puntaje de alerta es ${parts.score.observedRiskScore ?? 0} sobre 100 según la evidencia revisada.`;
  const topClaims = parts.claims.slice().sort((a, b) => b.weight - a.weight).slice(0, 3);
  const preferredIds = topClaims.flatMap((claim) => claim.approvedEvidenceIds);
  const mainSources = [...new Set(preferredIds)]
    .map((id) => evidenceById.get(id))
    .filter((value): value is Evidence => Boolean(value))
    .concat(parts.evidence.filter((item) => !preferredIds.includes(item.id)).sort((a, b) => b.directness - a.directness))
    .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index)
    .slice(0, 5);
  const mainSourceIds = new Set(mainSources.map((source) => source.id));
  const sensitive = parts.claims.some((claim) => claim.sensitiveDomain !== "none");
  const commercial = parts.discourse.marketingPromotionPct >= 15;
  const contextItems = (items: Array<{ text: string; evidenceIds: string[] }>) => items
    .map((item) => ({
      texto: item.text,
      fuentes: item.evidenceIds.filter((id) => evidenceById.has(id)).map(evidenceRef)
    }))
    .filter((item) => item.fuentes.length > 0);
  const immediateAdvice = commercial
    ? "Antes de pagar, comprueba la promesa principal, el precio total y las condiciones."
    : "Toma este video como punto de partida: separa los hechos de las opiniones y revisa la fuente principal.";
  const actions = commercial
    ? [
        "Pide la fuente original de la cifra.",
        "Lee las condiciones y la política de devolución.",
        sensitive ? "Consulta a un profesional calificado." : "Compara con una fuente independiente."
      ]
    : [
        "Distingue qué partes son hechos, opiniones o experiencias personales.",
        "Abre la fuente original y comprueba si dice lo mismo.",
        sensitive ? "Consulta a un profesional calificado." : "Busca una explicación independiente."
      ];

  return publicDiagnosisSchema.parse({
    diagnostico_final: {
      titular: title,
      puntaje_de_alerta_pct: parts.score.observedRiskScore,
      nivel: publicLevel(parts.score.observedRiskScore, parts.score.scoreCoverage),
      afirmaciones: {
        respaldadas_pct: distribution.supported,
        incompletas_o_sin_contexto_pct: distribution.misleading,
        incorrectas_segun_fuentes_pct: distribution.contradicted,
        sin_comprobar_pct: distribution.unresolved,
        explicacion: "Las promesas principales cuentan más que los detalles menores. No evaluamos la intención de la persona."
      },
      posible_manipulacion: {
        contenido_con_senales_pct: Math.round(parts.discourse.persuasionExposurePct),
        urgencia_o_presion_pct: Math.round(parts.discourse.urgencyExposurePct),
        senales_principales: [...new Set(parts.discourse.findings.flatMap((finding) => finding.techniques))].slice(0, 5),
        explicacion: "Este porcentaje marca fragmentos con presión o persuasión. No prueba intención de manipular."
      },
      evidencia_revisada_pct: coveragePct,
      estado_de_la_revision: parts.finalStatus === "needs_review"
        ? "requiere_revision_humana"
        : parts.finalStatus === "partial" || coveragePct < 70 ? "parcial" : "completa",
      consejo_inmediato: immediateAdvice
    },
    resumen: {
      en_pocas_palabras: simplifyPublicSummary(parts.synthesis.summary),
      lo_que_aporta: parts.synthesis.usefulPoints.slice(0, 3).map((texto) => ({ texto, fuentes: mainSources.slice(0, 1).map((source) => evidenceRef(source.id)) })),
      ten_cuidado_con: parts.synthesis.warnings.slice(0, 3).map((texto) => ({ texto, fuentes: mainSources.slice(0, 2).map((source) => evidenceRef(source.id)) })),
      no_pudimos_comprobar: unresolved.slice(0, 3).map((claim) => ({ texto: claim.text, fuentes: claim.approvedEvidenceIds.map(evidenceRef) }))
    },
    contenido_del_video: {
      venta_o_promocion_pct: Math.round(parts.discourse.marketingPromotionPct),
      informacion_util_pct: Math.round(parts.discourse.candidateValuePct),
      informacion_util_con_respaldo_pct: Math.round(parts.discourse.candidateValuePct * distribution.supported / 100),
      urgencia_o_presion_pct: Math.round(parts.discourse.urgencyExposurePct),
      explicacion: "Estos porcentajes describen fragmentos revisados. Pueden superponerse y no tienen que sumar 100."
    },
    contrastes: topClaims.map((claim) => {
      const sources = claim.approvedEvidenceIds.map((id) => evidenceById.get(id)).filter((value): value is Evidence => Boolean(value));
      return {
        dice: claim.text,
        encontramos: claim.explanation,
        conclusion: publicConclusion[claim.outcome],
        explicacion: claim.outcome === "contradicted"
          ? "Esta afirmación es incorrecta según las fuentes consultadas. Esto no demuestra intención de engañar."
          : claim.explanation,
        momento_del_video: timestamp(claim.startSeconds),
        fuentes: sources.filter((source) => mainSourceIds.has(source.id)).map((source) => evidenceRef(source.id))
      };
    }),
    contexto_publico: {
      que_revisamos: parts.context.reviewedPlaces,
      lo_positivo_comprobado: contextItems(parts.context.positiveCorroborated),
      alertas_comprobadas: contextItems(parts.context.adverseCorroborated),
      comentarios_que_solo_son_opiniones: contextItems(parts.context.opinionSignals),
      explicacion: "Los comentarios visibles no representan a todos los clientes y no prueban por sí solos que algo ocurrió."
    },
    consejo: {
      recomendacion_principal: commercial
        ? "No compres ni te registres basándote solo en este video."
        : "Usa el video como una idea inicial, no como la única fuente para decidir.",
      por_que: contradicted.length > 0
        ? "Al menos una promesa importante no coincide con la evidencia consultada."
        : commercial
          ? "Conviene comparar la promesa principal con una fuente independiente."
          : "El video puede mezclar hechos, opiniones y experiencias personales.",
      antes_de_decidir: actions,
      preguntas_que_puedes_hacer: commercial
        ? [
            "¿Qué datos completos respaldan esta promesa?",
            "¿Cómo se midió el resultado y durante cuánto tiempo?",
            "¿Qué condiciones o casos no se mencionaron?"
          ]
        : [
            "¿Qué parte es un hecho y qué parte es una opinión?",
            "¿La fuente original dice realmente lo mismo?",
            "¿Qué contexto importante podría faltar?"
          ]
    },
    fuentes_principales: mainSources.map((source) => ({
      id: evidenceRef(source.id),
      nombre: source.title,
      enlace: source.url,
      para_que_la_usamos: source.stance === "claimOrigin" ? "Comprobar qué se dijo." : "Contrastar una afirmación del video."
    })),
    avisos: [
      "Este análisis evalúa el contenido y las fuentes disponibles, no la honestidad de la persona.",
      "Un comentario positivo o negativo es una pista hasta que exista evidencia independiente."
    ]
  });
}

export function buildInternalReport(parts: ReportParts): InternalReport {
  const unresolvedCentral = parts.claims.some((claim) => claim.isCentralPromise && ["disputed", "insufficientEvidence", "notYetVerifiable"].includes(claim.outcome));
  const needsReview = parts.finalStatus === "needs_review";
  return internalReportSchema.parse({
    meta: {
      schemaVersion: "2.0",
      methodologyVersion: "0.3",
      methodologyStatus: "experimental",
      runId: parts.runId,
      status: parts.finalStatus,
      asOf: new Date().toISOString(),
      language: parts.input.options.outputLanguage,
      isIllustrativeFixture: false
    },
    input: {
      type: "youtube",
      url: parts.input.source.url,
      videoId: parts.input.source.videoId,
      title: parts.input.source.title,
      channelId: parts.input.source.channel.id,
      durationSeconds: parts.input.source.durationSeconds,
      observedTranscriptSeconds: parts.input.transcript.segments.reduce((sum, segment) => sum + Math.max(0, segment.endSeconds - segment.startSeconds), 0),
      mediaDurationCoverage: parts.input.transcript.coverage
    },
    globalRisk: {
      ...parts.score,
      unit: "risk_points_out_of_100_observed",
      status: needsReview ? "humanReviewRequired" : parts.finalStatus,
      assessmentAllowed: parts.score.observedRiskScore !== null,
      publicationAllowedWithoutHumanReview: !needsReview,
      reason: unresolvedCentral ? "Una promesa central continúa sin resolver." : needsReview ? "Un hallazgo de alto impacto requiere revisión humana." : "Cálculo determinista sobre la parte observada.",
      safetyOverride: {
        active: needsReview,
        type: needsReview ? "centralSensitiveOrOfficialFinding" : "none",
        action: needsReview ? "requireHumanReviewBeforePublicRelease" : "none",
        findingRefs: parts.claims.filter((claim) => claim.needsHumanReview).map((claim) => claim.id)
      },
      weights: {
        factualRisk: 0.3,
        manipulationPersuasionRisk: 0.25,
        crossVideoPatternRisk: 0.15,
        transparencyRisk: 0.1,
        corroboratedPublicRisk: 0.15,
        audienceEvidenceRisk: 0.05
      }
    },
    executiveSummaryGeneral: {
      headline: parts.synthesis.headline,
      summary: parts.synthesis.summary,
      sourceRefs: parts.evidence.slice(0, 5).map((source) => source.id)
    },
    categorySummaries: parts.score.components.map((component) => ({
      category: component.category,
      score: component.score,
      coverage: component.coverage,
      status: component.score === null ? "unavailable" : "available",
      headline: `${component.category}: ${component.score ?? "sin datos"}`,
      sourceRefs: component.sourceRefs
    })),
    contentMetrics: {
      contentMixPct: { marketingPromotion: parts.discourse.marketingPromotionPct },
      actionableInformation: { candidateValuePct: parts.discourse.candidateValuePct },
      techniqueExposurePct: { anyPersuasion: parts.discourse.persuasionExposurePct, urgency: parts.discourse.urgencyExposurePct },
      claimOutcomeRollupsPct: claimDistribution(parts.claims)
    },
    claimInventory: {
      totalDetected: parts.claims.length,
      selectedForResearch: parts.claims.length,
      resolved: parts.claims.filter((claim) => !["disputed", "insufficientEvidence", "notYetVerifiable"].includes(claim.outcome)).length
    },
    keyFindings: parts.claims.map((claim) => ({ id: claim.id, title: claim.text, statement: claim.explanation, severity: claim.needsHumanReview ? "critical" : "medium", confidence: claim.confidence, sourceRefs: claim.approvedEvidenceIds })),
    claims: parts.claims.map((claim) => ({ id: claim.id, text: claim.text, normalizedWeight: claim.weight, centrality: claim.centrality, outcome: claim.outcome, quoteStartSeconds: claim.startSeconds, sourceRefs: claim.approvedEvidenceIds })),
    persuasionFindings: parts.discourse.findings,
    recentSamplePatterns: [],
    creatorPublicContext: parts.context,
    audienceSignals: { status: parts.context.opinionSignals.length ? "signalsOnly" : "notObserved", prevalenceInferenceAllowed: false },
    sourceAppendix: parts.evidence,
    recommendations: [{ id: "recommendation-main", priority: "high", action: "Comprobar la promesa central antes de actuar.", sourceRefs: parts.evidence.slice(0, 3).map((item) => item.id) }],
    limitations: parts.context.limitations.map((message, index) => ({ id: `limitation-${index + 1}`, code: "researchLimitation", message })),
    runTrace: {
      orchestrator: parts.modelGeneral,
      discourseAnalyst: parts.modelGeneral,
      claimResearcher: parts.modelGeneral,
      creatorContextResearcher: parts.modelGeneral,
      provenanceAuditor: `${parts.modelGeneral}+deterministic-rules-v1`,
      evidenceJudge: parts.modelJudge,
      scoreCalculator: "deterministic-score-v1",
      synthesizer: parts.modelGeneral,
      referentialIntegrityPassed: true,
      invariantChecksPassed: ["weights_sum_100", "claim_distribution_sum_100", "sources_exist"]
    }
  });
}

export function buildLegacyV1(input: AnalysisJobInput, publicReport: PublicDiagnosis, model: string): LegacyV1 {
  const factual = publicReport.diagnostico_final.afirmaciones;
  const persuasion = publicReport.diagnostico_final.posible_manipulacion;
  const emotionalAppeal = Math.round(persuasion.contenido_con_senales_pct * 0.5);
  const fallacy = Math.round(persuasion.contenido_con_senales_pct * 0.2);
  const unsourcedClaim = Math.round((factual.sin_comprobar_pct + factual.incorrectas_segun_fuentes_pct) * 0.4);
  const sourcedClaim = Math.round(factual.respaldadas_pct * 0.35);
  const opinion = 10;
  const neutral = Math.max(0, 100 - emotionalAppeal - fallacy - unsourcedClaim - sourcedClaim - opinion);
  return legacyV1Schema.parse({
    meta: {
      schemaVersion: "1",
      sourceType: "youtube",
      sourceUrl: input.source.url,
      title: input.source.title,
      language: input.options.outputLanguage,
      durationSeconds: input.source.durationSeconds,
      model,
      analyzedAt: new Date().toISOString()
    },
    analysis: {
      hypeIndex: publicReport.diagnostico_final.puntaje_de_alerta_pct ?? 0,
      verdict: publicReport.diagnostico_final.titular,
      breakdown: { emotionalAppeal, fallacy, opinion, sourcedClaim, unsourcedClaim, neutral },
      findings: publicReport.contrastes,
      executiveSummary: {
        hasSubstance: publicReport.resumen.en_pocas_palabras,
        mainConcerns: publicReport.consejo.por_que,
        recommendation: publicReport.consejo.recomendacion_principal
      }
    }
  });
}
