export type PaymentFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "MATURITY";

const EXCISE_BRACKETS = [
  { max: 100_000, duty: 0 },
  { max: 500_000, duty: 150 },
  { max: 1_000_000, duty: 500 },
  { max: 10_000_000, duty: 3_000 },
  { max: 50_000_000, duty: 15_000 },
  { max: Number.POSITIVE_INFINITY, duty: 50_000 },
] as const;

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateExciseDuty(principal: number): number {
  const bracket = EXCISE_BRACKETS.find(({ max }) => principal <= max);
  if (!bracket) {
    throw new Error("Principal is outside the supported excise-duty range.");
  }
  return bracket.duty;
}

export function calculateNetMaturity(input: {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  paymentFrequency: PaymentFrequency;
  hasTin: boolean;
}) {
  const { principal, annualRate, tenureMonths, paymentFrequency, hasTin } = input;
  if (!Number.isFinite(principal) || principal <= 0 || principal > 1_000_000_000) {
    throw new Error("Principal must be greater than 0 and no more than BDT 1,000,000,000.");
  }
  if (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 100) {
    throw new Error("Annual rate must be between 0 and 100 percent.");
  }
  if (!Number.isInteger(tenureMonths) || tenureMonths <= 0 || tenureMonths > 600) {
    throw new Error("Tenure must be an integer number of months between 1 and 600.");
  }

  const periodsPerYear = {
    MONTHLY: 12,
    QUARTERLY: 4,
    HALF_YEARLY: 2,
    MATURITY: 1,
  }[paymentFrequency];
  const years = tenureMonths / 12;
  const periodicRate = annualRate / 100 / periodsPerYear;
  const periods = tenureMonths / 12 * periodsPerYear;
  const grossInterest =
    paymentFrequency === "MATURITY"
      ? principal * (annualRate / 100) * years
      : principal * (Math.pow(1 + periodicRate, periods) - 1);
  const taxRate = hasTin ? 0.1 : 0.15;
  const withholdingTax = grossInterest * taxRate;
  const exciseDuty = calculateExciseDuty(principal);
  const netProfit = grossInterest - withholdingTax - exciseDuty;

  return {
    principal: money(principal),
    annual_rate: money(annualRate),
    tenure_months: tenureMonths,
    payment_frequency: paymentFrequency,
    gross_interest: money(grossInterest),
    withholding_tax_rate: taxRate,
    withholding_tax: money(withholdingTax),
    excise_duty: exciseDuty,
    total_deductions: money(withholdingTax + exciseDuty),
    net_profit: money(netProfit),
    net_payout: money(principal + netProfit),
  };
}
