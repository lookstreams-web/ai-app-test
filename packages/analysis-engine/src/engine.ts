import { randomUUID } from "node:crypto";
import pLimit from "p-limit";
import {
  analysisJobInputSchema,
  claimJudgmentSchema,
  discourseAnalysisSchema,
  publicContextResearchSchema
} from "@motor/analysis-contracts";
import type { AnalysisJobInput, ClaimJudgment, Evidence } from "@motor/analysis-contracts";
import { buildInternalReport, buildLegacyV1, buildPublicDiagnosis } from "./adapters.js";
import { applyProvenanceAudit, deduplicateEvidence, enforceAdjudicationThresholds, filterAttributableContext } from "./provenance.js";
import { calculateClaimWeight, calculateFactualRisk, calculateGlobalRisk } from "./scoring.js";
import type {
  AgentGateway,
  AnalysisArtifacts,
  AtomicClaim,
  ClaimPlan,
  DiscourseAnalysis,
  PublicContextResearch,
  ResearchBundle,
  ScoredClaim
} from "./types.js";

export type ProgressStage = "analyzing" | "researching" | "adjudicating" | "scoring" | "synthesizing";

export interface AnalysisEngineOptions {
  maxClaims: number;
  claimConcurrency: number;
  emitLegacyV1: boolean;
  generalModel: string;
  judgeModel: string;
  maxTranscriptChunkChars?: number;
}

export interface AnalysisRunOptions {
  signal?: AbortSignal;
  onProgress?: (stage: ProgressStage, progress: number) => Promise<void> | void;
}

const defaultDiscourse = () => discourseAnalysisSchema.parse({
  summary: "El análisis del discurso no pudo completarse.",
  marketingPromotionPct: 0,
  candidateValuePct: 0,
  urgencyExposurePct: 0,
  persuasionExposurePct: 0,
  persuasionRiskScore: 0,
  coverage: 0,
  findings: []
});

const defaultContext = () => publicContextResearchSchema.parse({
  identity: { status: "notFound", confidence: 0, attributionSignals: [] },
  reviewedPlaces: [],
  positiveCorroborated: [],
  adverseCorroborated: [],
  opinionSignals: [],
  crossVideoRiskScore: null,
  crossVideoCoverage: 0,
  transparencyRiskScore: null,
  transparencyCoverage: 0,
  publicRiskScore: null,
  publicRiskCoverage: 0,
  audienceEvidenceRiskScore: null,
  audienceEvidenceCoverage: 0,
  evidence: [],
  limitations: ["La investigación de contexto público no pudo completarse."]
});

export function splitAnalysisInput(input: AnalysisJobInput, maxChars = 24_000): AnalysisJobInput[] {
  const groups: AnalysisJobInput["transcript"]["segments"][] = [];
  let current: AnalysisJobInput["transcript"]["segments"] = [];
  let length = 0;
  for (const segment of input.transcript.segments) {
    if (current.length > 0 && length + segment.text.length > maxChars) {
      groups.push(current);
      current = [];
      length = 0;
    }
    current.push(segment);
    length += segment.text.length;
  }
  if (current.length) groups.push(current);
  return groups.map((segments) => ({ ...input, transcript: { ...input.transcript, segments } }));
}

function mergePlans(plans: ClaimPlan[]): ClaimPlan {
  const claims = new Map<string, AtomicClaim>();
  for (const plan of plans) {
    for (const claim of plan.claims) {
      const key = claim.text.toLocaleLowerCase().replace(/\W+/g, " ").trim();
      const existing = claims.get(key);
      if (!existing || calculateClaimWeight(claim) > calculateClaimWeight(existing)) claims.set(key, claim);
    }
  }
  return {
    centralPromise: plans.find((plan) => plan.centralPromise)?.centralPromise ?? null,
    claims: [...claims.values()],
    summary: plans.map((plan) => plan.summary).join(" ")
  };
}

function weightedAverage(items: DiscourseAnalysis[], field: keyof Pick<DiscourseAnalysis, "marketingPromotionPct" | "candidateValuePct" | "urgencyExposurePct" | "persuasionExposurePct" | "persuasionRiskScore" | "coverage">): number {
  if (!items.length) return 0;
  return items.reduce((sum, item) => sum + item[field], 0) / items.length;
}

function mergeDiscourse(items: DiscourseAnalysis[]): DiscourseAnalysis {
  if (!items.length) return defaultDiscourse();
  return discourseAnalysisSchema.parse({
    summary: items.map((item) => item.summary).join(" "),
    marketingPromotionPct: weightedAverage(items, "marketingPromotionPct"),
    candidateValuePct: weightedAverage(items, "candidateValuePct"),
    urgencyExposurePct: weightedAverage(items, "urgencyExposurePct"),
    persuasionExposurePct: weightedAverage(items, "persuasionExposurePct"),
    persuasionRiskScore: weightedAverage(items, "persuasionRiskScore"),
    coverage: weightedAverage(items, "coverage"),
    findings: items.flatMap((item) => item.findings).slice(0, 20)
  });
}

function fallbackJudgment(claim: AtomicClaim, explanation: string): ClaimJudgment {
  return claimJudgmentSchema.parse({
    claimId: claim.id,
    outcome: "insufficientEvidence",
    explanation,
    approvedEvidenceIds: [],
    rejectedEvidenceIds: [],
    confidence: 0,
    temporalAndGeographicFitSufficient: false,
    hasStrongCounterevidence: false,
    needsHumanReview: false
  });
}

export function bindResearchToClaim(claim: AtomicClaim, research: ResearchBundle): ResearchBundle {
  return {
    ...research,
    claimId: claim.id,
    evidence: research.evidence.map((item) => ({ ...item, claimId: claim.id }))
  };
}

export function retainAuditedContextEvidence(
  context: PublicContextResearch,
  auditedEvidence: Evidence[]
): PublicContextResearch {
  const originalContextIds = new Set(context.evidence.map((item) => item.id));
  const evidence = auditedEvidence.filter((item) => originalContextIds.has(item.id));
  const allowedIds = new Set(evidence.map((item) => item.id));
  const retainItems = (items: Array<{ text: string; evidenceIds: string[] }>) => items
    .map((item) => ({ ...item, evidenceIds: item.evidenceIds.filter((id) => allowedIds.has(id)) }))
    .filter((item) => item.evidenceIds.length > 0);
  const hasAuditedContext = evidence.length > 0;

  return publicContextResearchSchema.parse({
    ...context,
    positiveCorroborated: retainItems(context.positiveCorroborated),
    adverseCorroborated: retainItems(context.adverseCorroborated),
    opinionSignals: retainItems(context.opinionSignals),
    evidence,
    crossVideoRiskScore: hasAuditedContext ? context.crossVideoRiskScore : null,
    crossVideoCoverage: hasAuditedContext ? context.crossVideoCoverage : 0,
    transparencyRiskScore: hasAuditedContext ? context.transparencyRiskScore : null,
    transparencyCoverage: hasAuditedContext ? context.transparencyCoverage : 0,
    publicRiskScore: hasAuditedContext ? context.publicRiskScore : null,
    publicRiskCoverage: hasAuditedContext ? context.publicRiskCoverage : 0,
    audienceEvidenceRiskScore: hasAuditedContext ? context.audienceEvidenceRiskScore : null,
    audienceEvidenceCoverage: hasAuditedContext ? context.audienceEvidenceCoverage : 0
  });
}

export class DeterministicAnalysisEngine {
  constructor(private readonly gateway: AgentGateway, private readonly options: AnalysisEngineOptions) {}

  async analyze(rawInput: AnalysisJobInput, runOptions: AnalysisRunOptions = {}): Promise<AnalysisArtifacts> {
    const input = analysisJobInputSchema.parse(rawInput);
    const runId = randomUUID();
    let partialFailure = false;
    const progress = async (stage: ProgressStage, value: number) => runOptions.onProgress?.(stage, value);
    await progress("analyzing", 10);

    const chunks = splitAnalysisInput(input, this.options.maxTranscriptChunkChars);
    const [planResult, discourseResult, contextResult] = await Promise.allSettled([
      Promise.all(chunks.map((chunk) => this.gateway.planClaims(chunk, runOptions.signal))).then(mergePlans),
      Promise.all(chunks.map((chunk) => this.gateway.analyzeDiscourse(chunk, runOptions.signal))).then(mergeDiscourse),
      input.options.publicContext ? this.gateway.researchContext(input, runOptions.signal) : Promise.resolve(defaultContext())
    ]);
    if (planResult.status === "rejected") throw planResult.reason;
    const plan = planResult.value;
    const discourse = discourseResult.status === "fulfilled" ? discourseResult.value : (partialFailure = true, defaultDiscourse());
    const context = contextResult.status === "fulfilled" ? contextResult.value : (partialFailure = true, defaultContext());

    const selected = plan.claims
      .map((claim) => ({ claim, weight: calculateClaimWeight(claim) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, Math.min(input.options.maxClaims, this.options.maxClaims));

    await progress("researching", 35);
    const limiter = pLimit(this.options.claimConcurrency);
    const researchResults = await Promise.all(selected.map(({ claim }) => limiter(async () => {
      if (!input.options.webResearch) return { claimId: claim.id, searchedQueries: [], evidence: [], limitations: ["La investigación web fue desactivada."] };
      try {
        return bindResearchToClaim(claim, await this.gateway.researchClaim(input, claim, runOptions.signal));
      } catch {
        partialFailure = true;
        return { claimId: claim.id, searchedQueries: [], evidence: [], limitations: ["La investigación web de esta afirmación falló."] };
      }
    })));

    const rawEvidence = [
      ...researchResults.flatMap((result) => result.evidence),
      ...context.evidence
    ];
    let auditedEvidence = rawEvidence;
    if (rawEvidence.length) {
      try {
        const audit = await this.gateway.auditProvenance(input, rawEvidence, context, runOptions.signal);
        auditedEvidence = applyProvenanceAudit(rawEvidence, audit);
      } catch {
        partialFailure = true;
      }
    }
    const allEvidence = deduplicateEvidence(auditedEvidence);
    const auditedContext = retainAuditedContextEvidence(context, allEvidence);
    const evidenceByClaim = new Map(selected.map(({ claim }) => [claim.id, allEvidence.filter((item) => item.claimId === claim.id)]));

    await progress("adjudicating", 60);
    const judgments = await Promise.all(selected.map(async ({ claim }) => {
      const evidence = evidenceByClaim.get(claim.id) ?? [];
      if (!evidence.length) return fallbackJudgment(claim, "No encontramos evidencia suficiente para comprobar esta afirmación.");
      try {
        const proposed = await this.gateway.judgeClaim(claim, evidence, runOptions.signal);
        return enforceAdjudicationThresholds(proposed, evidence);
      } catch {
        partialFailure = true;
        return fallbackJudgment(claim, "La revisión de evidencia no pudo completarse.");
      }
    }));

    const claims: ScoredClaim[] = selected.map(({ claim, weight }, index) => {
      const judgment = judgments[index] ?? fallbackJudgment(claim, "No se obtuvo un veredicto.");
      return {
        ...claim,
        weight,
        outcome: judgment.outcome,
        explanation: judgment.explanation,
        confidence: judgment.confidence,
        approvedEvidenceIds: judgment.approvedEvidenceIds,
        needsHumanReview: judgment.needsHumanReview
      };
    });

    await progress("scoring", 78);
    const factual = calculateFactualRisk(claims);
    const attributable = filterAttributableContext(auditedContext);
    const globalScore = calculateGlobalRisk([
      { category: "factualRisk", score: factual.score, coverage: factual.coverage, confidence: claims.length ? claims.reduce((sum, claim) => sum + claim.confidence, 0) / claims.length : 0, coverageNumerator: factual.resolvedWeight, coverageDenominator: factual.eligibleWeight || 1, coverageMethod: "resolved_claim_weight_over_all_eligible_claim_weight", sourceRefs: claims.flatMap((claim) => claim.approvedEvidenceIds) },
      { category: "manipulationPersuasionRisk", score: discourse.coverage ? discourse.persuasionRiskScore : null, coverage: discourse.coverage, confidence: discourse.coverage, coverageMethod: "classified_transcript_fraction", findingRefs: discourse.findings.map((finding) => finding.id) },
      { category: "crossVideoPatternRisk", score: attributable?.crossVideoRiskScore ?? null, coverage: attributable?.crossVideoCoverage ?? 0 },
      { category: "transparencyRisk", score: attributable?.transparencyRiskScore ?? null, coverage: attributable?.transparencyCoverage ?? 0 },
      { category: "corroboratedPublicRisk", score: attributable?.publicRiskScore ?? null, coverage: attributable?.publicRiskCoverage ?? 0, sourceRefs: attributable?.adverseCorroborated.flatMap((item) => item.evidenceIds) ?? [] },
      { category: "audienceEvidenceRisk", score: attributable?.audienceEvidenceRiskScore ?? null, coverage: attributable?.audienceEvidenceCoverage ?? 0 }
    ], claims.some((claim) => claim.isCentralPromise && ["disputed", "insufficientEvidence", "notYetVerifiable"].includes(claim.outcome)));

    await progress("synthesizing", 90);
    let synthesis: { headline: string; summary: string; usefulPoints: string[]; warnings: string[] };
    try {
      const approvedIds = new Set(claims.flatMap((claim) => claim.approvedEvidenceIds));
      synthesis = await this.gateway.synthesize(input, claims, discourse, allEvidence.filter((item) => approvedIds.has(item.id)), runOptions.signal);
    } catch {
      partialFailure = true;
      synthesis = {
        headline: "Revisión del contenido y sus afirmaciones principales",
        summary: claims.length ? "Revisamos las afirmaciones principales con la evidencia disponible. Lee los contrastes antes de decidir." : "No hubo información suficiente para completar el análisis.",
        usefulPoints: [],
        warnings: claims.filter((claim) => claim.outcome === "contradicted").map((claim) => claim.explanation).slice(0, 3)
      };
    }

    const highImpact = claims.some((claim) =>
      (claim.isCentralPromise && claim.outcome === "contradicted")
      || (claim.sensitiveDomain !== "none" && claim.outcome === "contradicted")
      || claim.needsHumanReview
    );
    const officialAction = allEvidence.some((item) => item.sourceType === "regulatorFinalAction" && item.proceduralStatus === "final");
    const finalStatus = highImpact || officialAction ? "needs_review" : partialFailure ? "partial" : "completed";
    const parts = {
      runId,
      input,
      score: globalScore,
      claims,
      evidence: allEvidence,
      discourse,
      context: auditedContext,
      synthesis,
      finalStatus,
      modelGeneral: this.options.generalModel,
      modelJudge: this.options.judgeModel
    } as const;
    const internal = buildInternalReport(parts);
    const publicReport = buildPublicDiagnosis(parts);
    const legacyV1 = this.options.emitLegacyV1 ? buildLegacyV1(input, publicReport, this.options.generalModel) : null;
    await progress("synthesizing", 100);
    return { internal, public: publicReport, legacyV1, claims, evidence: allEvidence, agentRuns: this.gateway.invocations, finalStatus };
  }
}
