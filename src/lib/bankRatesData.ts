import banksData from "@/data/bangladesh_61_banks.json";
import { BalanceSlab } from "@/services/maturityCalculator";

export type FdrTenure = "1_month" | "3_months" | "6_months" | "1_year" | "2_years" | "3_years" | "5_years";

export interface FdrRates {
  "1_month"?: number;
  "3_months": number;
  "6_months": number;
  "1_year": number;
  "2_years"?: number;
  "3_years": number;
  "5_years": number;
  [key: string]: number | undefined;
}

export interface DpsRates {
  "3_years": number;
  "5_years": number;
  "10_years"?: number;
  [key: string]: number | undefined;
}

export interface BankProduct {
  product_id: string;
  product_name: string;
  product_type: "FDR" | "DPS" | "SPECIAL_SCHEME" | string;
  archetype?: string;
  headline_rate: number;
  tenure_options: string[];
  best_tenure: string;
  minimum_amount: number;
  target_segment: "GENERAL_RETAIL" | "WOMEN" | "SENIOR_CITIZEN" | "NRB_EXPATRIATE" | "RETAIL_SAVINGS" | "ISLAMIC_SHARIAH" | "HNI_PREMIUM" | "LONG_TERM" | string;
  features: string[];
  instant_encashment: boolean;
  shariah_compliant: boolean;
  is_islamic?: boolean;
  provisional_profit_rate_pct?: number | null;
  shariah_disclosure?: string | null;
  balance_slabs?: BalanceSlab[];
  premature_encashment_terms?: any;
  eligibility?: {
    min_age?: number;
    gender_restricted?: "MALE" | "FEMALE" | "ALL" | string;
    nrb_only?: boolean;
    senior_citizen_min_age?: number;
    [key: string]: any;
  };
}

export interface BankRateRecord {
  bank_id: string;
  bank_name: string;
  short_code: string;
  category: "STATE_OWNED" | "SPECIALIZED" | "CONVENTIONAL_PCB" | "ISLAMIC" | "FOREIGN" | string;
  retail_banking_active?: boolean;
  operating_model?: string;
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
  verification_status: "VERIFIED_OFFICIAL" | "CIRCULAR_PENDING" | string;
  rating_score: number;
  credit_rating: string;
  stability_tier: "TIER_1_PRIME" | "TIER_2_STRONG" | "TIER_3_MODERATE" | "TIER_4_WATCHLIST" | "TIER_5_DISTRESSED" | string;
  npl_ratio_pct: number;
  npl_category: string;
  capital_adequacy_ratio_car: string;
  risk_label: string;
  sovereign_backed: boolean;
  rating_agency: string;
  risk_adjusted_yield_score: number;
  restricted_liquidity_warning?: boolean;
  regulatory_status?: string;
  day_count_convention?: string;
  confidence_score?: number;
  source_pdf_sha256?: string;
  products: BankProduct[];
  [key: string]: any;
}

export const ALL_61_BANKS: BankRateRecord[] = banksData as unknown as BankRateRecord[];

export const DATASET_PROVENANCE = {
  source_type: "repository_static_snapshot",
  source_url: "https://www.bb.org.bd/en/index.php/links/links/9",
  effective_date: null,
  fetched_at: null,
  source_sha256: null,
  verification_status: "unverified" as "verified" | "unverified",
  verification_note:
    "Rates require verification against each bank's dated official rate sheet before production use.",
};

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
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error("Principal must be a positive finite number.");
  }
  if (!Number.isFinite(annualRate) || annualRate < 0) {
    throw new Error("Annual rate must be a non-negative finite number.");
  }
  if (!Number.isInteger(tenureMonths) || tenureMonths <= 0) {
    throw new Error("Tenure must be a positive integer number of months.");
  }

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
  sortByTenure?: FdrTenure | string;
  minRating?: number;
  sortBy?: "yield" | "risk_adjusted" | "rating" | "rate_desc" | "rate_asc" | "npl_asc" | string;
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
        (b.products && b.products.some((p) => p.product_name.toLowerCase().includes(q)))
    );
  }

  // Sorting
  if (sortBy === "risk_adjusted") {
    list.sort((a, b) => (b.risk_adjusted_yield_score || 0) - (a.risk_adjusted_yield_score || 0));
  } else if (sortBy === "rating") {
    list.sort((a, b) => b.rating_score - a.rating_score);
  } else if (sortBy === "npl_asc") {
    list.sort((a, b) => (a.npl_ratio_pct || 0) - (b.npl_ratio_pct || 0));
  } else {
    // Standard yield for tenure
    list.sort((a, b) => {
      const tenureKey = sortByTenure as keyof FdrRates;
      const rateA = (a.fdr_rates && (a.fdr_rates[tenureKey] ?? 0)) || 0;
      const rateB = (b.fdr_rates && (b.fdr_rates[tenureKey] ?? 0)) || 0;
      return sortBy === "rate_asc" ? rateA - rateB : rateB - rateA;
    });
  }

  return list;
}
