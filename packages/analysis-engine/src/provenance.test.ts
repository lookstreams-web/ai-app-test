import { describe, expect, it } from "vitest";
import type { ClaimJudgment, Evidence } from "@motor/analysis-contracts";
import { deduplicateEvidence, enforceAdjudicationThresholds, filterAttributableContext } from "./provenance.js";

function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: "evidence-1",
    claimId: "claim-1",
    url: "https://example.com/source",
    title: "Fuente",
    publisher: "Editor",
    excerpt: "Dato comprobable",
    stance: "contradicts",
    sourceType: "independentReporting",
    publishedAt: "2026-01-01",
    retrievedAt: "2026-07-20T00:00:00Z",
    directness: 0.8,
    temporalFit: 0.9,
    geographicFit: 0.9,
    independence: 0.9,
    proceduralStatus: "notApplicable",
    originClusterId: "origin-1",
    contentHash: "sha256:same",
    ...overrides
  };
}

const judgment: ClaimJudgment = {
  claimId: "claim-1",
  outcome: "contradicted",
  explanation: "No coincide.",
  approvedEvidenceIds: ["evidence-1", "evidence-2"],
  rejectedEvidenceIds: [],
  confidence: 0.9,
  temporalAndGeographicFitSufficient: true,
  hasStrongCounterevidence: false,
  needsHumanReview: false
};

describe("procedencia y arbitraje", () => {
  it("diez artículos copiados cuentan como un origen", () => {
    const copies = Array.from({ length: 10 }, (_, index) => evidence({ id: `evidence-${index}`, url: `https://copy${index}.example/article` }));
    expect(deduplicateEvidence(copies)).toHaveLength(1);
  });

  it("evidencia fuerte en ambos sentidos produce disputed", () => {
    const result = enforceAdjudicationThresholds(judgment, [
      evidence({ id: "evidence-1", stance: "contradicts", contentHash: "a", originClusterId: "a" }),
      evidence({ id: "evidence-2", stance: "supports", contentHash: "b", originClusterId: "b" })
    ]);
    expect(result.outcome).toBe("disputed");
  });

  it("una demanda pendiente no alcanza el umbral de condena o contradicción", () => {
    const result = enforceAdjudicationThresholds({ ...judgment, approvedEvidenceIds: ["evidence-1"] }, [
      evidence({ sourceType: "courtRecord", proceduralStatus: "pending", independence: 0.4 })
    ]);
    expect(result.outcome).toBe("insufficientEvidence");
  });

  it("excluye un perfil homónimo ambiguo del score", () => {
    expect(filterAttributableContext({ identity: { status: "ambiguous" }, risk: 100 })).toBeNull();
  });
});
