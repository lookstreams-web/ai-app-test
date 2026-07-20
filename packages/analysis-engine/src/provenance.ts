import { createHash } from "node:crypto";
import type { ClaimJudgment, Evidence } from "@motor/analysis-contracts";
import type { ProvenanceAudit } from "./types.js";

export function canonicalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|ref$)/i.test(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase();
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  url.searchParams.sort();
  return url.toString();
}

export function deriveOriginCluster(evidence: Pick<Evidence, "contentHash" | "originClusterId" | "url">): string {
  if (evidence.contentHash) return `content:${evidence.contentHash}`;
  if (evidence.originClusterId) return evidence.originClusterId;
  return `url:${createHash("sha256").update(canonicalizeUrl(evidence.url)).digest("hex")}`;
}

export function deduplicateEvidence(items: Evidence[]): Evidence[] {
  const seen = new Map<string, Evidence>();
  for (const item of items) {
    const normalized: Evidence = { ...item, url: canonicalizeUrl(item.url), originClusterId: deriveOriginCluster(item) };
    const key = normalized.originClusterId;
    const current = seen.get(key);
    if (!current || evidenceStrength(normalized) > evidenceStrength(current)) seen.set(key, normalized);
  }
  return [...seen.values()];
}

export function applyProvenanceAudit(items: Evidence[], audit: ProvenanceAudit): Evidence[] {
  const knownIds = new Set(items.map((item) => item.id));
  const excluded = new Set(audit.excludedEvidenceIds.filter((id) => knownIds.has(id)));
  const clusterByEvidence = new Map<string, string>();
  for (const cluster of audit.originClusters) {
    const validIds = cluster.evidenceIds.filter((id) => knownIds.has(id));
    if (validIds.length < 2) continue;
    for (const id of validIds) clusterByEvidence.set(id, `audit:${cluster.originClusterId}`);
  }
  return items.filter((item) => !excluded.has(item.id)).map((item) => ({
    ...item,
    originClusterId: clusterByEvidence.get(item.id) ?? item.originClusterId
  }));
}

export function evidenceStrength(item: Evidence): number {
  const procedural = item.proceduralStatus === "final" ? 0.1 : item.proceduralStatus === "pending" ? -0.15 : 0;
  return (item.directness + item.temporalFit + item.geographicFit + item.independence) / 4 + procedural;
}

const isStrong = (item: Evidence) => evidenceStrength(item) >= 0.65;

export function enforceAdjudicationThresholds(proposed: ClaimJudgment, evidence: Evidence[]): ClaimJudgment {
  const approved = deduplicateEvidence(evidence.filter((item) => proposed.approvedEvidenceIds.includes(item.id)));
  const supporting = approved.filter((item) => item.stance === "supports" && isStrong(item));
  const contradicting = approved.filter((item) => item.stance === "contradicts" && isStrong(item));

  if (supporting.length > 0 && contradicting.length > 0) {
    return { ...proposed, outcome: "disputed", hasStrongCounterevidence: true, needsHumanReview: true };
  }

  if (proposed.outcome === "contradicted") {
    const directPrimary = contradicting.some((item) =>
      ["primaryOfficial", "regulatorFinalAction"].includes(item.sourceType)
      && item.directness >= 0.8 && item.temporalFit >= 0.7 && item.geographicFit >= 0.7
      && item.proceduralStatus !== "pending" && item.proceduralStatus !== "allegation"
    );
    const independentClusters = new Set(contradicting.filter((item) => item.independence >= 0.6).map((item) => item.originClusterId));
    if (!directPrimary && independentClusters.size < 2) {
      return {
        ...proposed,
        outcome: "insufficientEvidence",
        explanation: `${proposed.explanation} El umbral para declarar contradicción no se completó.`,
        needsHumanReview: false
      };
    }
  }

  return proposed;
}

export function filterAttributableContext<T extends { identity: { status: string } }>(context: T): T | null {
  return context.identity.status === "confirmed" ? context : null;
}
