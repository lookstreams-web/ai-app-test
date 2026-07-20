import type { AtomicClaim, ScoredClaim } from "./types.js";

export const RISK_WEIGHTS = {
  factualRisk: 30,
  manipulationPersuasionRisk: 25,
  crossVideoPatternRisk: 15,
  transparencyRisk: 10,
  corroboratedPublicRisk: 15,
  audienceEvidenceRisk: 5
} as const;

export type RiskCategory = keyof typeof RISK_WEIGHTS;

export interface ScoreComponentInput {
  category: RiskCategory;
  score: number | null;
  coverage: number;
  confidence?: number;
  coverageNumerator?: number;
  coverageDenominator?: number;
  coverageMethod?: string;
  formulaVersion?: string;
  findingRefs?: string[];
  sourceRefs?: string[];
}

export interface GlobalScore {
  observedRiskScore: number | null;
  observedRiskScoreRaw: number | null;
  scoreCoverage: number;
  knownWeightPoints: number;
  knownRiskPoints: number;
  missingWeightPoints: number;
  uncertaintyRange: { min: number; max: number; minRaw: number; maxRaw: number };
  scoreBand: "low" | "moderateLow" | "mixed" | "high" | "veryHigh" | "indeterminate" | "insufficientData";
  components: Array<ScoreComponentInput & {
    fixedWeightPoints: number;
    scoreRaw: number | null;
    knownWeightPoints: number;
    knownRiskPoints: number;
    confidence: number;
    coverageNumerator: number;
    coverageDenominator: number;
    coverageMethod: string;
    formulaVersion: string;
    findingRefs: string[];
    sourceRefs: string[];
  }>;
}

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const fixed = (value: number, digits = 4) => Number(value.toFixed(digits));
export const roundToFive = (value: number) => clamp(Math.round(value / 5) * 5);

export function calculateGlobalRisk(inputs: ScoreComponentInput[], unresolvedCentralPromise = false): GlobalScore {
  const byCategory = new Map(inputs.map((input) => [input.category, input]));
  const components = (Object.keys(RISK_WEIGHTS) as RiskCategory[]).map((category) => {
    const input = byCategory.get(category) ?? { category, score: null, coverage: 0 };
    const coverage = clamp(input.coverage, 0, 1);
    const scoreRaw = input.score === null ? null : clamp(input.score);
    const effectiveCoverage = scoreRaw === null ? 0 : coverage;
    const fixedWeightPoints = RISK_WEIGHTS[category];
    const knownWeightPoints = fixedWeightPoints * effectiveCoverage;
    const knownRiskPoints = scoreRaw === null ? 0 : knownWeightPoints * scoreRaw / 100;
    return {
      ...input,
      coverage: effectiveCoverage,
      score: scoreRaw === null ? null : roundToFive(scoreRaw),
      scoreRaw,
      fixedWeightPoints,
      knownWeightPoints: fixed(knownWeightPoints),
      knownRiskPoints: fixed(knownRiskPoints),
      confidence: input.confidence ?? 0,
      coverageNumerator: input.coverageNumerator ?? effectiveCoverage,
      coverageDenominator: input.coverageDenominator ?? 1,
      coverageMethod: input.coverageMethod ?? "observed_fraction",
      formulaVersion: input.formulaVersion ?? `${category}-v1`,
      findingRefs: input.findingRefs ?? [],
      sourceRefs: input.sourceRefs ?? []
    };
  });

  const knownWeightPoints = fixed(components.reduce((sum, component) => sum + component.knownWeightPoints, 0));
  const knownRiskPoints = fixed(components.reduce((sum, component) => sum + component.knownRiskPoints, 0));
  const missingWeightPoints = fixed(100 - knownWeightPoints);
  const scoreCoverage = fixed(knownWeightPoints / 100);
  const observedRiskScoreRaw = knownWeightPoints >= 5 ? fixed(100 * knownRiskPoints / knownWeightPoints, 2) : null;
  const observedRiskScore = observedRiskScoreRaw === null ? null : roundToFive(observedRiskScoreRaw);
  const minRaw = knownRiskPoints;
  const maxRaw = fixed(knownRiskPoints + missingWeightPoints);
  let scoreBand: GlobalScore["scoreBand"] = "insufficientData";
  if (observedRiskScore !== null) {
    if (scoreCoverage < 0.7 || unresolvedCentralPromise) scoreBand = "indeterminate";
    else if (observedRiskScore <= 20) scoreBand = "low";
    else if (observedRiskScore <= 40) scoreBand = "moderateLow";
    else if (observedRiskScore <= 60) scoreBand = "mixed";
    else if (observedRiskScore <= 80) scoreBand = "high";
    else scoreBand = "veryHigh";
  }

  return {
    observedRiskScore,
    observedRiskScoreRaw,
    scoreCoverage,
    knownWeightPoints,
    knownRiskPoints,
    missingWeightPoints,
    uncertaintyRange: { min: minRaw, max: maxRaw, minRaw, maxRaw },
    scoreBand,
    components
  };
}

export function calculateClaimWeight(claim: AtomicClaim): number {
  return fixed(
    0.3 * claim.centrality
    + 0.25 * claim.potentialHarm
    + 0.2 * claim.actionInducement
    + 0.15 * claim.verifiability
    + 0.1 * claim.repetition
  );
}

const outcomeSupport: Record<ScoredClaim["outcome"], number | null> = {
  supported: 100,
  mostlySupported: 75,
  misleadingMissingContext: 35,
  contradicted: 0,
  disputed: null,
  insufficientEvidence: null,
  notYetVerifiable: null
};

export function calculateFactualRisk(claims: ScoredClaim[]) {
  const eligibleWeight = claims.reduce((sum, claim) => sum + claim.weight, 0);
  const resolved = claims.filter((claim) => outcomeSupport[claim.outcome] !== null);
  const resolvedWeight = resolved.reduce((sum, claim) => sum + claim.weight, 0);
  if (eligibleWeight === 0 || resolvedWeight === 0) {
    return { score: null, support: null, coverage: 0, eligibleWeight, resolvedWeight };
  }
  const support = resolved.reduce((sum, claim) => sum + claim.weight * (outcomeSupport[claim.outcome] ?? 0), 0) / resolvedWeight;
  return {
    score: 100 - support,
    support,
    coverage: resolvedWeight / eligibleWeight,
    eligibleWeight,
    resolvedWeight
  };
}

function allocatePercentages(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total === 0) return [0, 0, 0, 100];
  const raw = values.map((value) => value / total * 100);
  const floors = raw.map(Math.floor);
  let remaining = 100 - floors.reduce((sum, value) => sum + value, 0);
  const order = raw.map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const item of order) {
    if (remaining-- <= 0) break;
    floors[item.index] = (floors[item.index] ?? 0) + 1;
  }
  return floors;
}

export function claimDistribution(claims: ScoredClaim[]) {
  const groups = [
    claims.filter((claim) => claim.outcome === "supported" || claim.outcome === "mostlySupported"),
    claims.filter((claim) => claim.outcome === "misleadingMissingContext"),
    claims.filter((claim) => claim.outcome === "contradicted"),
    claims.filter((claim) => ["disputed", "insufficientEvidence", "notYetVerifiable"].includes(claim.outcome))
  ];
  const allocated = allocatePercentages(groups.map((group) => group.reduce((sum, claim) => sum + claim.weight, 0)));
  return {
    supported: allocated[0] ?? 0,
    misleading: allocated[1] ?? 0,
    contradicted: allocated[2] ?? 0,
    unresolved: allocated[3] ?? 0
  };
}
