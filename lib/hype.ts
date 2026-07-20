import type { Breakdown, Finding, LlmFinding } from '@/lib/types';
import { BREAKDOWN_KEYS } from '@/lib/schema';
import { HttpError } from '@/lib/http';

/**
 * Guardarraíl del backend para el hypeIndex y la composición (ver CONTRATO.md).
 * El LLM estima el hypeIndex de forma holística; el backend lo acota para que sea
 * consistente entre corridas y coherente con el breakdown.
 */

// Acepta suma en [95, 105] y normaliza a exactamente 100.
export function normalizeBreakdown(b: Breakdown): Breakdown {
  const sum = BREAKDOWN_KEYS.reduce((s, k) => s + b[k], 0);
  if (sum < 95 || sum > 105) {
    throw new HttpError(422, 'INVALID_BREAKDOWN', `La suma del breakdown (${sum}) está fuera de [95, 105].`);
  }

  const scaled = {} as Breakdown;
  let acc = 0;
  for (const k of BREAKDOWN_KEYS) {
    scaled[k] = Math.round((b[k] * 100) / sum);
    acc += scaled[k];
  }

  // Ajusta el redondeo para que sume exactamente 100 (sobre el bucket más grande).
  const diff = 100 - acc;
  if (diff !== 0) {
    let kMax: (typeof BREAKDOWN_KEYS)[number] = BREAKDOWN_KEYS[0];
    for (const k of BREAKDOWN_KEYS) if (scaled[k] > scaled[kMax]) kMax = k;
    scaled[kMax] += diff;
  }
  return scaled;
}

// +5 por finding high, +2 por medium, máximo total +15. Los low no suman.
export function severityBonus(findings: Array<Pick<Finding | LlmFinding, 'severity'>>): number {
  let bonus = 0;
  for (const f of findings) {
    if (f.severity === 'high') bonus += 5;
    else if (f.severity === 'medium') bonus += 2;
  }
  return Math.min(bonus, 15);
}

// Referencia lineal del backend a partir de un breakdown normalizado a 100.
export function hypeFormula(breakdown: Breakdown, findings: Array<Pick<Finding | LlmFinding, 'severity'>>): number {
  return (
    0.8 * breakdown.emotionalAppeal +
    1.0 * breakdown.fallacy +
    0.9 * breakdown.unsourcedClaim +
    0.1 * breakdown.opinion +
    severityBonus(findings)
  );
}

// Si |llm - formula| > 15, ajusta al extremo más cercano de formula ± 15.
// Luego acota a [0, 100] y redondea.
export function applyHypeGuardrail(
  llmHype: number,
  breakdown: Breakdown,
  findings: Array<Pick<Finding | LlmFinding, 'severity'>>,
): number {
  const formula = hypeFormula(breakdown, findings);
  let value = llmHype;
  if (Math.abs(llmHype - formula) > 15) {
    value = llmHype > formula ? formula + 15 : formula - 15;
  }
  return Math.round(Math.min(100, Math.max(0, value)));
}
