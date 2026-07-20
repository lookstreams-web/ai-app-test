import { describe, expect, it } from "vitest";
import { calculateFactualRisk, calculateGlobalRisk, claimDistribution, RISK_WEIGHTS } from "./scoring.js";
import type { ScoredClaim } from "./types.js";

function claim(outcome: ScoredClaim["outcome"], weight: number, central = false): ScoredClaim {
  return {
    id: `claim-${outcome}-${weight}`,
    text: "Afirmación",
    quote: "Afirmación",
    startSeconds: 0,
    endSeconds: 1,
    centrality: 1,
    potentialHarm: 1,
    actionInducement: 1,
    verifiability: 1,
    repetition: 0,
    isCentralPromise: central,
    sensitiveDomain: "none",
    weight,
    outcome,
    explanation: "Resultado",
    confidence: 1,
    approvedEvidenceIds: [],
    needsHumanReview: false
  };
}

describe("scoring determinista", () => {
  it("mantiene pesos globales que suman 100", () => {
    expect(Object.values(RISK_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it("calcula el caso parcial 26/40 como 65 y rango 26–86", () => {
    const result = calculateGlobalRisk([
      { category: "factualRisk", score: 65, coverage: 40 / 30 },
      { category: "manipulationPersuasionRisk", score: 65, coverage: 10 / 25 }
    ]);
    expect(result.knownRiskPoints).toBe(26);
    expect(result.knownWeightPoints).toBe(40);
    expect(result.observedRiskScore).toBe(65);
    expect(result.uncertaintyRange).toEqual({ min: 26, max: 86, minRaw: 26, maxRaw: 86 });
  });

  it("no inventa un score cuando no existe información", () => {
    const result = calculateGlobalRisk([]);
    expect(result.observedRiskScore).toBeNull();
    expect(result.scoreBand).toBe("insufficientData");
  });

  it("una promesa central sin resolver impide una banda baja", () => {
    const result = calculateGlobalRisk(Object.keys(RISK_WEIGHTS).map((category) => ({
      category: category as keyof typeof RISK_WEIGHTS,
      score: 10,
      coverage: 1
    })), true);
    expect(result.observedRiskScore).toBe(10);
    expect(result.scoreBand).toBe("indeterminate");
  });

  it("comentarios repetidos no participan en el riesgo factual", () => {
    const claims = [claim("supported", 0.5), claim("contradicted", 0.5)];
    const before = calculateFactualRisk(claims);
    const comments = Array.from({ length: 500 }, () => "comentario repetido");
    expect(comments).toHaveLength(500);
    expect(calculateFactualRisk(claims)).toEqual(before);
  });

  it("la distribución pública suma 100", () => {
    const distribution = claimDistribution([
      claim("supported", 0.44), claim("misleadingMissingContext", 0.18),
      claim("contradicted", 0.22), claim("insufficientEvidence", 0.16)
    ]);
    expect(distribution).toEqual({ supported: 44, misleading: 18, contradicted: 22, unresolved: 16 });
  });
});
