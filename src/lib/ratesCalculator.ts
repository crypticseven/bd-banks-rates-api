import fs from "node:fs";
import path from "node:path";

export type PaymentFrequency = "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "MATURITY";

export const EXCISE_BRACKETS = [
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

export function calculateExciseDuty(peakBalance: number, tenureYears: number = 1): number {
  const bracket = EXCISE_BRACKETS.find(({ max }) => peakBalance <= max);
  if (!bracket) {
    throw new Error("Peak balance is outside supported excise-duty range.");
  }
  const calendarYears = Math.max(1, Math.ceil(tenureYears));
  return bracket.duty * calendarYears;
}

export interface CalculationInput {
  principal: number;
  annualRate: number;
  tenureMonths: number;
  paymentFrequency: PaymentFrequency;
  hasTin: boolean;
  shariahCompliant?: boolean;
  productName?: string;
  bankCode?: string;
}

export function calculateNetMaturity(input: CalculationInput) {
  const { principal, annualRate, tenureMonths, paymentFrequency, hasTin, shariahCompliant, productName, bankCode } = input;
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

  const tenureYears = tenureMonths / 12;
  const periodicRate = annualRate / 100 / periodsPerYear;
  const totalPeriods = (tenureMonths / 12) * periodsPerYear;

  const grossInterest =
    paymentFrequency === "MATURITY"
      ? principal * (annualRate / 100) * tenureYears
      : principal * (Math.pow(1 + periodicRate, totalPeriods) - 1);

  const peakBalance = principal + grossInterest;
  const taxRate = hasTin ? 0.10 : 0.15;
  const withholdingTax = grossInterest * taxRate;
  const exciseDuty = calculateExciseDuty(peakBalance, tenureYears);
  const netProfit = grossInterest - withholdingTax - exciseDuty;
  const netPayable = principal + netProfit;

  return {
    product_name: productName || "Standard Term Deposit",
    bank_code: bankCode || "N/A",
    principal: money(principal),
    annual_rate: money(annualRate),
    headline_rate_pct: money(annualRate),
    tenure_months: tenureMonths,
    tenure_years: money(tenureYears),
    payment_frequency: paymentFrequency,
    gross_interest: money(grossInterest),
    gross_interest_earned: money(grossInterest),
    withholding_tax_rate: taxRate,
    withholding_tax_tds_pct: taxRate * 100,
    withholding_tax: money(withholdingTax),
    withholding_tax_tds_amount: money(withholdingTax),
    statutory_excise_duty_amount: exciseDuty,
    excise_duty: exciseDuty,
    total_deductions: money(withholdingTax + exciseDuty),
    net_profit: money(netProfit),
    net_payable_maturity_amount: money(netPayable),
    is_islamic_mudarabah: Boolean(shariahCompliant),
    rate_disclaimers: shariahCompliant
      ? "Provisional Profit Rate under Mudarabah principles. Subject to historical weightage adjustments; not guaranteed."
      : "Conventional Fixed Deposit Rate as per official Treasury Circular / Schedule of Interest.",
  };
}

export function findProductById(productId: string): { product: any; bank: any } | null {
  try {
    const dataPath = path.resolve(process.cwd(), "src", "data", "bangladesh_61_banks.json");
    if (!fs.existsSync(dataPath)) return null;
    const raw = fs.readFileSync(dataPath, "utf-8");
    const banks = JSON.parse(raw);
    for (const bank of banks) {
      if (Array.isArray(bank.products)) {
        const product = bank.products.find((p: any) => p.product_id === productId || p.product_slug === productId);
        if (product) {
          return { product, bank };
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}
