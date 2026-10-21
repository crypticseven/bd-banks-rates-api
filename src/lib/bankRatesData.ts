import banksData from "@/data/bangladesh_61_banks.json";

export interface FdrRates {
  "3_months": number;
  "6_months": number;
  "1_year": number;
  "3_years": number;
  "5_years": number;
}

export interface DpsRates {
  "3_years": number;
  "5_years": number;
  "10_years"?: number;
}

export interface BankRateRecord {
  bank_id: string;
  bank_name: string;
  short_code: string;
  category: "STATE_OWNED" | "SPECIALIZED" | "CONVENTIONAL_PCB" | "ISLAMIC" | "FOREIGN";
  is_shariah: boolean;
  has_islamic_window: boolean;
  minimum_deposit: number;
  fdr_rates: FdrRates;
  dps_rates: DpsRates;
  instant_encashment: boolean;
  soc_url: string;
  headquarters: string;
  source_url: string;
  effective_date: string;
  fetched_at: string;
  verification_status: "VERIFIED_OFFICIAL" | "CIRCULAR_PENDING";
}

export const ALL_61_BANKS: BankRateRecord[] = banksData as BankRateRecord[];

/**
 * Calculates maturity value, gross interest, NBR withholding tax, and net return
 * @param principal Initial deposit amount in BDT
 * @param annualRate Annual interest/profit rate percentage (e.g. 10.5)
 * @param tenureMonths Deposit duration in months (3, 6, 12, 36, 60)
 * @param hasTin Whether the depositor has a valid e-TIN (10% tax) or no TIN (15% tax)
 */
export function calculateFdrMaturity(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  hasTin = true
): {
  principal: number;
  grossInterest: number;
  taxRate: number;
  taxAmount: number;
  netProfit: number;
  netMaturityValue: number;
  effectiveMonthlyProfit: number;
} {
  const years = tenureMonths / 12;
  const grossInterest = Math.round(principal * (annualRate / 100) * years);
  const taxRate = hasTin ? 0.10 : 0.15; // NBR Tax Code: 10% with TIN, 15% without
  const taxAmount = Math.round(grossInterest * taxRate);
  const netProfit = grossInterest - taxAmount;
  const netMaturityValue = principal + netProfit;
  const effectiveMonthlyProfit = Math.round(netProfit / tenureMonths);

  return {
    principal,
    grossInterest,
    taxRate,
    taxAmount,
    netProfit,
    netMaturityValue,
    effectiveMonthlyProfit,
  };
}

/**
 * Filter, search, and sort all 61 banks
 */
export function filterBanks({
  category,
  isShariah,
  instantEncashmentOnly,
  searchQuery,
  sortByTenure = "1_year",
}: {
  category?: string;
  isShariah?: boolean;
  instantEncashmentOnly?: boolean;
  searchQuery?: string;
  sortByTenure?: "3_months" | "6_months" | "1_year" | "3_years" | "5_years";
}): BankRateRecord[] {
  let list = [...ALL_61_BANKS];

  if (category && category !== "ALL") {
    list = list.filter((b) => b.category === category);
  }

  if (typeof isShariah === "boolean") {
    list = list.filter((b) => b.is_shariah === isShariah || (isShariah && b.has_islamic_window));
  }

  if (instantEncashmentOnly) {
    list = list.filter((b) => b.instant_encashment);
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(
      (b) =>
        b.bank_name.toLowerCase().includes(q) ||
        b.short_code.toLowerCase().includes(q) ||
        b.headquarters.toLowerCase().includes(q)
    );
  }

  // Sort by highest rate for selected tenure
  list.sort((a, b) => {
    const rateA = a.fdr_rates[sortByTenure] || 0;
    const rateB = b.fdr_rates[sortByTenure] || 0;
    return rateB - rateA;
  });

  return list;
}
