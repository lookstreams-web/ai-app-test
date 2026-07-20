import { describe, expect, it } from "vitest";
import type { AnalysisJobInput, Evidence } from "@motor/analysis-contracts";
import { buildPublicDiagnosis, type ReportParts } from "./adapters.js";
import { calculateGlobalRisk } from "./scoring.js";
import type { ScoredClaim } from "./types.js";

const input: AnalysisJobInput = {
  source: { url: "https://youtube.com/watch?v=test", videoId: "test", title: "Prueba", durationSeconds: 600, channel: { id: "c1", name: "Canal", url: null } },
  transcript: { language: "es", origin: "youtube", coverage: 1, segments: [{ id: "s1", startSeconds: 0, endSeconds: 600, text: "Contenido", confidence: 1 }] },
  options: { maxClaims: 3, webResearch: true, publicContext: true, outputLanguage: "es", timeBudgetMs: 600_000 }
};

function scored(id: string, outcome: ScoredClaim["outcome"], weight: number): ScoredClaim {
  return { id, text: `Afirmación ${id}`, quote: `Afirmación ${id}`, startSeconds: 302, endSeconds: 308, centrality: 1, potentialHarm: 1, actionInducement: 1, verifiability: 1, repetition: 0, isCentralPromise: id === "c3", sensitiveDomain: "none", weight, outcome, explanation: "Contraste basado en fuentes.", confidence: 0.9, approvedEvidenceIds: [`evidence-${id}`], needsHumanReview: false };
}

function source(index: number): Evidence {
  return { id: `evidence-c${index}`, claimId: `c${index}`, url: `https://example.com/source-${index}`, title: `Fuente ${index}`, publisher: "Editor", excerpt: "Extracto", stance: index === 3 ? "contradicts" : "supports", sourceType: "primaryOfficial", publishedAt: "2026-01-01", retrievedAt: "2026-07-20T00:00:00Z", directness: 1, temporalFit: 1, geographicFit: 1, independence: 0.8, proceduralStatus: "final", originClusterId: `origin-${index}`, contentHash: null };
}

describe("adaptador público determinista", () => {
  it("mantiene 55/87/58, tres contrastes y cinco fuentes", () => {
    const claims = [scored("c1", "supported", 0.44), scored("c2", "misleadingMissingContext", 0.18), scored("c3", "contradicted", 0.22), scored("c4", "insufficientEvidence", 0.16)];
    const score = calculateGlobalRisk([
      { category: "factualRisk", score: 55, coverage: 0.87 },
      { category: "manipulationPersuasionRisk", score: 55, coverage: 0.87 },
      { category: "crossVideoPatternRisk", score: 55, coverage: 0.87 },
      { category: "transparencyRisk", score: 55, coverage: 0.87 },
      { category: "corroboratedPublicRisk", score: 55, coverage: 0.87 },
      { category: "audienceEvidenceRisk", score: 55, coverage: 0.87 }
    ]);
    const parts: ReportParts = {
      runId: "run-1", input, score, claims, evidence: [1, 2, 3, 4, 5].map(source),
      discourse: { summary: "Resumen", marketingPromotionPct: 38, candidateValuePct: 46, urgencyExposurePct: 20, persuasionExposurePct: 58, persuasionRiskScore: 72, coverage: 1, findings: [] },
      context: { identity: { status: "confirmed", confidence: 1, attributionSignals: ["enlace recíproco"] }, reviewedPlaces: ["YouTube", "web"], positiveCorroborated: [], adverseCorroborated: [], opinionSignals: [], crossVideoRiskScore: 55, crossVideoCoverage: 1, transparencyRiskScore: 55, transparencyCoverage: 1, publicRiskScore: 55, publicRiskCoverage: 1, audienceEvidenceRiskScore: 55, audienceEvidenceCoverage: 1, evidence: [], limitations: [] },
      synthesis: { headline: "Alerta", summary: "Resumen sencillo.", usefulPoints: ["Aporta un paso útil."], warnings: ["Revisa la promesa."] },
      finalStatus: "completed", modelGeneral: "gpt-5.6-terra", modelJudge: "gpt-5.6-sol"
    };
    const report = buildPublicDiagnosis(parts);
    expect(report.diagnostico_final.puntaje_de_alerta_pct).toBe(55);
    expect(report.diagnostico_final.evidencia_revisada_pct).toBe(87);
    expect(report.diagnostico_final.posible_manipulacion.contenido_con_senales_pct).toBe(58);
    expect(report.contrastes).toHaveLength(3);
    expect(report.fuentes_principales).toHaveLength(5);
  });
});
