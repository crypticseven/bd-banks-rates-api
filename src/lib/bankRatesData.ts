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

export interface BankProduct {
  product_id: string;
  product_name: string;
  product_type: "FDR" | "DPS" | "SPECIAL_SCHEME";
  headline_rate: number;
  tenure_options: string[];
  best_tenure: string;
  minimum_amount: number;
  target_segment: "GENERAL_RETAIL" | "WOMEN" | "SENIOR_CITIZEN" | "NRB_EXPATRIATE" | "RETAIL_SAVINGS" | "ISLAMIC_SHARIAH" | "HNI_PREMIUM" | "LONG_TERM";
  features: string[];
  instant_encashment: boolean;
  shariah_compliant: boolean;
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
  rating_score: number;
  credit_rating: string;
  stability_tier: "TIER_1_PRIME" | "TIER_2_STRONG" | "TIER_3_MODERATE" | "TIER_4_WATCHLIST" | "TIER_5_DISTRESSED";
  npl_category: string;
  capital_adequacy_ratio_car: string;
  risk_label: string;
  sovereign_backed: boolean;
  rating_agency: string;
  risk_adjusted_yield_score: number;
  products: BankProduct[];
}

export const ALL_61_BANKS: BankRateRecord[] = banksData as BankRateRecord[];

/**
 * Calculates maturity value, gross interest, NBR withholding tax, and net return
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
 * Filter, search, and sort all 61 banks with rating & risk-adjusted options
 */
export function filterBanks({
  category,
  isShariah,
  instantEncashmentOnly,
  searchQuery,
  sortByTenure = "1_year",
  minRating,
  sortBy = "yield",
  customList,
}: {
  category?: string;
  isShariah?: boolean;
  instantEncashmentOnly?: boolean;
  searchQuery?: string;
  sortByTenure?: "3_months" | "6_months" | "1_year" | "3_years" | "5_years";
  minRating?: number;
  sortBy?: "yield" | "risk_adjusted" | "rating";
  customList?: BankRateRecord[];
}): BankRateRecord[] {
  let list = customList ? [...customList] : [...ALL_61_BANKS];

  if (category && category !== "ALL") {
    list = list.filter((b) => b.category === category);
  }

  if (typeof isShariah === "boolean") {
    list = list.filter((b) => b.is_shariah === isShariah || (isShariah && b.has_islamic_window));
  }

  if (instantEncashmentOnly) {
    list = list.filter((b) => b.instant_encashment);
  }

  if (minRating && minRating > 0) {
    list = list.filter((b) => b.rating_score >= minRating);
  }

  if (searchQuery && searchQuery.trim().length > 0) {
    const q = searchQuery.toLowerCase().trim();
    list = list.filter(
      (b) =>
        b.bank_name.toLowerCase().includes(q) ||
        b.short_code.toLowerCase().includes(q) ||
        b.headquarters.toLowerCase().includes(q) ||
        b.credit_rating.toLowerCase().includes(q) ||
        b.products.some((p) => p.product_name.toLowerCase().includes(q))
    );
  }

  // Sorting
  if (sortBy === "risk_adjusted") {
    // Balances yield against credit safety
    list.sort((a, b) => (b.risk_adjusted_yield_score || 0) - (a.risk_adjusted_yield_score || 0));
  } else if (sortBy === "rating") {
    // Pure stability rating (5.0 to 1.0)
    list.sort((a, b) => b.rating_score - a.rating_score);
  } else {
    // Standard yield for tenure
    list.sort((a, b) => {
      const rateA = a.fdr_rates[sortByTenure] || 0;
      const rateB = b.fdr_rates[sortByTenure] || 0;
      return rateB - rateA;
    });
  }

  return list;
}
