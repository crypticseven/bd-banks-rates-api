/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / HashCorp-FinTech Engine-TDRD Rates™)
 * Copyright (c) 2024-2026 Fardin Ahsan Anik <fardinahsananik@gmail.com>. All Rights Reserved.
 *
 * PENNY-PERFECT MATURITY & STATUTORY TAX CALCULATOR
 * Implements NBR Withholding Tax (TDS) and Bangladesh Bank Multi-tier Statutory Excise Duty.
 */

export interface MaturityInput {
  principal: number;       // e.g. 500000
  annualRatePct: number;   // e.g. 10.50
  tenureMonths: number;    // e.g. 12
  hasTin: boolean;         // true -> 10% TDS, false -> 15% TDS
  compounding?: 'MATURITY' | 'MONTHLY' | 'QUARTERLY';
}

export interface MaturityOutput {
  principal: number;
  grossInterest: number;
  tdsRatePct: number;
  tdsAmount: number;
  exciseDuty: number;
  netInterest: number;
  netMaturityPayout: number;
  effectiveYieldPct: number;
}

export function computeExciseDuty(peakBalance: number): number {
  if (peakBalance <= 100000) return 0;
  // Peak balance rule: 500,000 principal + accrued interest pushes balance > 500,000 into the 500,001 - 1,000,000 slab = 500 BDT
  if (peakBalance <= 500000) return 150;
  if (peakBalance <= 1000000) return 500;
  if (peakBalance <= 10000000) return 3000;
  if (peakBalance <= 50000000) return 15000;
  return 50000;
}

export function calculatePennyPerfectMaturity(input: MaturityInput): MaturityOutput {
  const { principal, annualRatePct, tenureMonths, hasTin, compounding = 'MATURITY' } = input;
  const r = annualRatePct / 100;
  const years = tenureMonths / 12;

  let grossInterest = 0;
  if (compounding === 'MATURITY' || compounding === 'MONTHLY') {
    grossInterest = Number((principal * r * years).toFixed(2));
  } else if (compounding === 'QUARTERLY') {
    const n = 4;
    grossInterest = Number((principal * Math.pow(1 + r / n, n * years) - principal).toFixed(2));
  }

  const tdsRatePct = hasTin ? 10 : 15;
  const tdsAmount = Number((grossInterest * (tdsRatePct / 100)).toFixed(2));

  // Peak balance includes accrued interest at maturity
  const peakBalance = principal + grossInterest;
  const exciseDuty = computeExciseDuty(peakBalance);

  const netInterest = Number((grossInterest - tdsAmount - exciseDuty).toFixed(2));
  const netMaturityPayout = Number((principal + netInterest).toFixed(2));
  const effectiveYieldPct = Number(((netInterest / principal / years) * 100).toFixed(2));

  return {
    principal,
    grossInterest,
    tdsRatePct,
    tdsAmount,
    exciseDuty,
    netInterest,
    netMaturityPayout,
    effectiveYieldPct,
  };
}
