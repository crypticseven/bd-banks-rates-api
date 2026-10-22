/**
 * Component 3: Deterministic Confidence Scoring Engine
 * Rejects fuzzy heuristics. Enforces weighted mathematical gating.
 * Confidence = (A * 0.25) + (C * 0.20) + (S * 0.20) + (N * 0.15) + (R * 0.15) + (F * 0.05)
 * Gate: >= 0.95 Approved for automated DB commit; < 0.95 Quarantined.
 */

export interface ScoringInputs {
  sourceAuthority: "TREASURY_CIRCULAR" | "OFFICIAL_PRODUCT_PAGE" | "BB_REGULATORY_BULLETIN" | "AGGREGATOR";
  completeness: {
    hasProductName: boolean;
    hasProductType: boolean;
    hasExplicitTenure: boolean;
    hasExplicitRate: boolean;
  };
  structuralAlignment: "EXPLICIT_TABLE_ROW_OR_CARD" | "LOOSE_DISTANCE_HEURISTIC";
  rateValue: number;
  crossSourceAgreement: "MATCHES_OR_WITHIN_CORRIDOR" | "CONFLICTING";
  publishedWithinCurrentQuarter: boolean;
}

export interface ConfidenceEvaluation {
  score: number;
  isApproved: boolean;
  quarantineReason?: string;
  breakdown: {
    A_authority: number;
    C_completeness: number;
    S_structure: number;
    N_numericBounds: number;
    R_agreement: number;
    F_freshness: number;
  };
}

export function evaluateRateConfidence(inputs: ScoringInputs): ConfidenceEvaluation {
  // A (Source Authority)
  let A = 0.0;
  if (inputs.sourceAuthority === "TREASURY_CIRCULAR") A = 1.0;
  else if (inputs.sourceAuthority === "OFFICIAL_PRODUCT_PAGE") A = 0.95;
  else if (inputs.sourceAuthority === "BB_REGULATORY_BULLETIN") A = 0.90;
  else A = 0.0;

  // C (Evidence Completeness)
  const isComplete =
    inputs.completeness.hasProductName &&
    inputs.completeness.hasProductType &&
    inputs.completeness.hasExplicitTenure &&
    inputs.completeness.hasExplicitRate;
  const C = isComplete ? 1.0 : 0.0;

  // S (Structural Alignment)
  const S = inputs.structuralAlignment === "EXPLICIT_TABLE_ROW_OR_CARD" ? 1.0 : 0.4;

  // N (Numeric Bounds: 3.0% <= Rate <= 16.0%)
  const N = inputs.rateValue >= 3.0 && inputs.rateValue <= 16.0 ? 1.0 : 0.0;

  // R (Cross-Source Agreement)
  const R = inputs.crossSourceAgreement === "MATCHES_OR_WITHIN_CORRIDOR" ? 1.0 : 0.5;

  // F (Freshness)
  const F = inputs.publishedWithinCurrentQuarter ? 1.0 : 0.5;

  // Formula: (A * 0.25) + (C * 0.20) + (S * 0.20) + (N * 0.15) + (R * 0.15) + (F * 0.05)
  const rawScore = A * 0.25 + C * 0.2 + S * 0.2 + N * 0.15 + R * 0.15 + F * 0.05;
  const score = Math.round(rawScore * 1000) / 1000;

  const isApproved = score >= 0.95;
  let quarantineReason: string | undefined;

  if (!isApproved) {
    const reasons: string[] = [];
    if (A < 0.95) reasons.push("Low source authority");
    if (!isComplete) reasons.push("Incomplete product/tenure/rate attributes");
    if (S < 1.0) reasons.push("Loose structural alignment without row containment");
    if (N < 1.0) reasons.push(`Rate ${inputs.rateValue}% outside statutory corridor (3.0% - 16.0%)`);
    if (R < 1.0) reasons.push("Cross-source corridor conflict");
    quarantineReason = `HELD_IN_STAGING_QUARANTINE: Score ${score} < 0.95 (${reasons.join(", ")})`;
  }

  return {
    score,
    isApproved,
    quarantineReason,
    breakdown: {
      A_authority: A,
      C_completeness: C,
      S_structure: S,
      N_numericBounds: N,
      R_agreement: R,
      F_freshness: F,
    },
  };
}
