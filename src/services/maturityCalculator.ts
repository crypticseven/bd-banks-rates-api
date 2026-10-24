/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / HashCorp-FinTech Engine-TDRD Rates™)
 * Copyright (c) 2024-2026 Fardin Ahsan Anik <fardinahsananik@gmail.com>. All Rights Reserved.
 *
 * INSTITUTIONAL-GRADE PENNY-PERFECT MATURITY & STATUTORY TAX CALCULATOR
 * Implements NBR Income Tax Act 2023 (TIN with PSR vs without PSR),
 * Bangladesh Bank Multi-tier Statutory Excise Duty, Day-Count Accrual Conventions (Actual/360, Actual/365, 30/360),
 * Premature Encashment Penalty Engine, DPS Continuous Monthly Annuity, and Real Inflation-Adjusted Yields.
 */

export type TaxProfile = "TIN_WITH_PSR" | "TIN_WITHOUT_PSR" | "NO_TIN";
export type DayCountConvention = "ACTUAL_360" | "ACTUAL_365" | "THIRTY_360";
export type CompoundingFrequency = "MATURITY" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY";

export interface BalanceSlab {
  min_bdt: number;
  max_bdt: number | null; // null represents Infinity (e.g. > 1 Crore)
  rate_pct?: number;
  annual_rate_pct?: number;
}

export interface MaturityInput {
  principal: number; // e.g. 500000
  annualRatePct: number; // e.g. 10.50
  tenureMonths: number; // e.g. 12
  taxProfile?: TaxProfile; // NBR 2023 Tax profile
  hasTin?: boolean; // legacy fallback
  compounding?: CompoundingFrequency;
  dayCount?: DayCountConvention;
  breakAfterMonths?: number; // Optional early encashment test
  savingsRatePct?: number; // Fallback savings rate for early break (default 3.5%)
  cpiInflationPct?: number; // Default 9.80% BBS reference
  deductAmf?: boolean; // Deduct Account Maintenance Fees (AMF)
}

export interface MaturityOutput {
  principal: number;
  grossInterest: number;
  tdsRatePct: number;
  tdsAmount: number;
  exciseDuty: number;
  accountMaintenanceFee: number;
  netInterest: number;
  netMaturityPayout: number;
  effectiveYieldPct: number;
  netInPocketYieldPct: number;
  realInflationAdjustedYieldPct: number;
  dayCountApplied: DayCountConvention;
  taxProfileApplied: TaxProfile;
  prematurePenalty?: {
    breakAfterMonths: number;
    paidRatePct: number;
    penaltyLostBdt: number;
    actualInterestBdt: number;
    forfeitedEarly: boolean;
  };
}

export interface DpsMaturityOutput {
  monthlyInstallment: number;
  totalDepositPrincipal: number;
  tenureMonths: number;
  annualRatePct: number;
  grossMaturityAmount: number;
  grossInterestEarned: number;
  tdsRatePct: number;
  tdsDeduction: number;
  exciseDuty: number;
  netMaturityPayout: number;
  effectiveAnnualYieldPct: number;
}

/**
 * Resolves applicable interest rate from multi-tier balance slabs.
 */
export function resolveApplicableRate(slabs: BalanceSlab[], principal: number): number {
  if (!slabs || slabs.length === 0) {
    throw new Error("No balance slabs provided for evaluation.");
  }
  const matchingSlab = slabs.find(
    (s) => principal >= s.min_bdt && (s.max_bdt === null || principal <= s.max_bdt)
  );
  if (!matchingSlab) {
    // If lower than minimum slab, fall back to lowest slab rate
    if (principal < slabs[0].min_bdt) {
      return slabs[0].rate_pct ?? slabs[0].annual_rate_pct ?? 0;
    }
    // If higher than highest slab, fall back to highest slab rate
    const last = slabs[slabs.length - 1];
    return last.rate_pct ?? last.annual_rate_pct ?? 0;
  }
  return matchingSlab.rate_pct ?? matchingSlab.annual_rate_pct ?? 0;
}

/**
 * Bangladesh Bank Peak Balance Statutory Excise Duty Brackets
 * Adheres strictly to the Finance Act & Bangladesh Bank DOS Statutory Guidelines.
 */
export function computeExciseDuty(peakBalance: number): number {
  if (peakBalance <= 100000) return 0;
  if (peakBalance <= 500000) return 150;
  if (peakBalance <= 1000000) return 500;
  if (peakBalance <= 10000000) return 3000;
  if (peakBalance <= 50000000) return 15000;
  return 50000;
}

/**
 * Resolves TDS tax percentage under NBR Income Tax Act 2023 (Section 102/264)
 * - TIN_WITH_PSR: 10%
 * - TIN_WITHOUT_PSR: 15% (Statutory mandate: without PSR proof, rate remains 15%)
 * - NO_TIN: 15%
 */
export function resolveTdsRate(taxProfile?: TaxProfile, hasTin?: boolean): { ratePct: number; profile: TaxProfile } {
  if (taxProfile) {
    if (taxProfile === "TIN_WITH_PSR") return { ratePct: 10, profile: "TIN_WITH_PSR" };
    return { ratePct: 15, profile: taxProfile };
  }
  // Fallback to legacy boolean hasTin
  if (hasTin === true) {
    return { ratePct: 10, profile: "TIN_WITH_PSR" };
  }
  return { ratePct: 15, profile: "NO_TIN" };
}

/**
 * Premature Encashment Penalty Calculation
 * Branch reality: Breaking < 3 months forfeits 100% of interest.
 * Breaking >= 3 months drops rate from declared FDR rate to bank's base Savings Account rate (e.g. 3.50%).
 */
export function calculateEncashmentPenalty(
  principal: number,
  declaredRatePct: number,
  savingsRatePct: number,
  agreedTenureMonths: number,
  breakAfterMonths: number
): { paidRatePct: number; penaltyLostBdt: number; actualInterestBdt: number; forfeitedEarly: boolean } {
  const daysInPeriod = (breakAfterMonths / 12);
  const fullEntitled = Number((principal * (declaredRatePct / 100) * daysInPeriod).toFixed(2));

  if (breakAfterMonths < 3) {
    return {
      paidRatePct: 0,
      penaltyLostBdt: fullEntitled,
      actualInterestBdt: 0,
      forfeitedEarly: true,
    };
  }

  const paidRatePct = savingsRatePct;
  const actualPaid = Number((principal * (paidRatePct / 100) * daysInPeriod).toFixed(2));
  const penaltyLostBdt = Number((fullEntitled - actualPaid).toFixed(2));

  return {
    paidRatePct,
    penaltyLostBdt,
    actualInterestBdt: actualPaid,
    forfeitedEarly: false,
  };
}

/**
 * Continuous Monthly Annuity Accumulation Formula for DPS
 * FV = P * [ (1 + r/12)^n - 1 ] / (r/12)
 */
export function calculateDpsAnnuityMaturity(
  monthlyInstallment: number,
  annualRatePct: number,
  tenureMonths: number,
  taxProfile: TaxProfile = "TIN_WITH_PSR"
): DpsMaturityOutput {
  const rMonthly = (annualRatePct / 100) / 12;
  const totalPrincipal = monthlyInstallment * tenureMonths;

  // Monthly annuity formula
  const grossMaturityAmount = Number(
    (monthlyInstallment * ((Math.pow(1 + rMonthly, tenureMonths) - 1) / rMonthly)).toFixed(2)
  );
  const grossInterestEarned = Number((grossMaturityAmount - totalPrincipal).toFixed(2));

  const { ratePct: tdsRatePct } = resolveTdsRate(taxProfile);
  const tdsDeduction = Number((grossInterestEarned * (tdsRatePct / 100)).toFixed(2));

  const exciseDuty = computeExciseDuty(grossMaturityAmount);
  const netMaturityPayout = Number((grossMaturityAmount - tdsDeduction - exciseDuty).toFixed(2));
  const netInterest = netMaturityPayout - totalPrincipal;
  const effectiveAnnualYieldPct = Number(
    ((netInterest / totalPrincipal) * (12 / tenureMonths) * 100).toFixed(2)
  );

  return {
    monthlyInstallment,
    totalDepositPrincipal: totalPrincipal,
    tenureMonths,
    annualRatePct,
    grossMaturityAmount,
    grossInterestEarned,
    tdsRatePct,
    tdsDeduction,
    exciseDuty,
    netMaturityPayout,
    effectiveAnnualYieldPct,
  };
}

/**
 * Main Penny-Perfect Maturity Calculator with Institutional Day-Count, Tax Profile, and AMF
 */
export function calculatePennyPerfectMaturity(input: MaturityInput): MaturityOutput {
  const {
    principal,
    annualRatePct,
    tenureMonths,
    taxProfile,
    hasTin,
    compounding = "MATURITY",
    dayCount = "THIRTY_360",
    breakAfterMonths,
    savingsRatePct = 3.50,
    cpiInflationPct = 9.80,
    deductAmf = false,
  } = input;

  const r = annualRatePct / 100;
  const years = tenureMonths / 12;

  // Day-Count Convention Multiplier
  let timeFactor = years;
  if (dayCount === "ACTUAL_360") {
    // Finacle CBS convention: 365 actual days / 360 commercial year basis
    timeFactor = (years * 365) / 360;
  } else if (dayCount === "ACTUAL_365") {
    timeFactor = (years * 365) / 365;
  } else {
    // THIRTY_360
    timeFactor = years;
  }

  let grossInterest = 0;
  let penaltyResult: MaturityOutput["prematurePenalty"] = undefined;

  if (breakAfterMonths !== undefined && breakAfterMonths < tenureMonths) {
    const pen = calculateEncashmentPenalty(principal, annualRatePct, savingsRatePct, tenureMonths, breakAfterMonths);
    grossInterest = pen.actualInterestBdt;
    penaltyResult = {
      breakAfterMonths,
      paidRatePct: pen.paidRatePct,
      penaltyLostBdt: pen.penaltyLostBdt,
      actualInterestBdt: pen.actualInterestBdt,
      forfeitedEarly: pen.forfeitedEarly,
    };
  } else {
    if (compounding === "MATURITY" || compounding === "MONTHLY") {
      grossInterest = Number((principal * r * timeFactor).toFixed(2));
    } else if (compounding === "QUARTERLY") {
      const n = 4;
      grossInterest = Number((principal * Math.pow(1 + r / n, n * timeFactor) - principal).toFixed(2));
    } else if (compounding === "HALF_YEARLY") {
      const n = 2;
      grossInterest = Number((principal * Math.pow(1 + r / n, n * timeFactor) - principal).toFixed(2));
    }
  }

  const { ratePct: tdsRatePct, profile: taxProfileApplied } = resolveTdsRate(taxProfile, hasTin);
  const tdsAmount = Number((grossInterest * (tdsRatePct / 100)).toFixed(2));

  // Peak balance evaluation
  const peakBalance = principal + grossInterest;
  const exciseDuty = computeExciseDuty(peakBalance);

  // Account Maintenance Fees (AMF) per BB BRPD Circular 11/2021
  // Deduct bi-annual AMF (৳300 * 2) if balance > ৳25,000 and requested
  let amfFee = 0;
  if (deductAmf && principal > 25000) {
    const yearsHeld = Math.max(1, Math.ceil(years));
    amfFee = yearsHeld * 600; // ৳300 bi-annual * 2
  }

  const netInterest = Number((grossInterest - tdsAmount - exciseDuty - amfFee).toFixed(2));
  const netMaturityPayout = Number((principal + netInterest).toFixed(2));
  const effectiveYieldPct = Number(((netInterest / principal / years) * 100).toFixed(2));

  // Net In-Pocket Yield includes AMF and incidental costs
  const netInPocketYieldPct = Number((((netInterest) / principal / years) * 100).toFixed(2));

  // Fisher equation for real inflation-adjusted yield
  // (1 + nominal_yield) / (1 + inflation) - 1
  const nominalRatio = 1 + effectiveYieldPct / 100;
  const inflationRatio = 1 + cpiInflationPct / 100;
  const realInflationAdjustedYieldPct = Number(((nominalRatio / inflationRatio - 1) * 100).toFixed(2));

  return {
    principal,
    grossInterest,
    tdsRatePct,
    tdsAmount,
    exciseDuty,
    accountMaintenanceFee: amfFee,
    netInterest,
    netMaturityPayout,
    effectiveYieldPct,
    netInPocketYieldPct,
    realInflationAdjustedYieldPct,
    dayCountApplied: dayCount,
    taxProfileApplied,
    prematurePenalty: penaltyResult,
  };
}
