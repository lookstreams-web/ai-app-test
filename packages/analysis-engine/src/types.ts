import type {
  AnalysisJobInput,
  ClaimJudgment,
  Evidence,
  InternalReport,
  LegacyV1,
  PublicDiagnosis
} from "@motor/analysis-contracts";
import type {
  atomicClaimSchema,
  claimPlanSchema,
  discourseAnalysisSchema,
  publicContextResearchSchema
} from "@motor/analysis-contracts";
import type { provenanceAuditSchema } from "@motor/analysis-contracts";
import type { z } from "zod";

export type AtomicClaim = z.infer<typeof atomicClaimSchema>;
export type ClaimPlan = z.infer<typeof claimPlanSchema>;
export type DiscourseAnalysis = z.infer<typeof discourseAnalysisSchema>;
export type PublicContextResearch = z.infer<typeof publicContextResearchSchema>;
export type ProvenanceAudit = z.infer<typeof provenanceAuditSchema>;

export interface ScoredClaim extends AtomicClaim {
  weight: number;
  outcome: ClaimJudgment["outcome"];
  explanation: string;
  confidence: number;
  approvedEvidenceIds: string[];
  needsHumanReview: boolean;
}

export interface ResearchBundle {
  claimId: string;
  searchedQueries: string[];
  evidence: Evidence[];
  limitations: string[];
}

export interface AgentInvocation {
  agent: string;
  model: string;
  promptVersion: string;
  durationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  error: string | null;
}

export interface AnalysisArtifacts {
  internal: InternalReport;
  public: PublicDiagnosis;
  legacyV1: LegacyV1 | null;
  claims: ScoredClaim[];
  evidence: Evidence[];
  agentRuns: AgentInvocation[];
  finalStatus: "completed" | "partial" | "needs_review";
}

export interface AgentGateway {
  planClaims(input: AnalysisJobInput, signal?: AbortSignal): Promise<ClaimPlan>;
  analyzeDiscourse(input: AnalysisJobInput, signal?: AbortSignal): Promise<DiscourseAnalysis>;
  researchClaim(input: AnalysisJobInput, claim: AtomicClaim, signal?: AbortSignal): Promise<ResearchBundle>;
  researchContext(input: AnalysisJobInput, signal?: AbortSignal): Promise<PublicContextResearch>;
  auditProvenance(input: AnalysisJobInput, evidence: Evidence[], context: PublicContextResearch, signal?: AbortSignal): Promise<ProvenanceAudit>;
  judgeClaim(input: AnalysisJobInput, claim: AtomicClaim, evidence: Evidence[], signal?: AbortSignal): Promise<ClaimJudgment>;
  synthesize(input: AnalysisJobInput, claims: ScoredClaim[], discourse: DiscourseAnalysis, evidence: Evidence[], signal?: AbortSignal): Promise<{ headline: string; summary: string; usefulPoints: string[]; warnings: string[] }>;
  readonly invocations: AgentInvocation[];
}
