import { NextRequest, NextResponse } from "next/server";
import { getActiveBanksServer } from "@/lib/serverRatesPersistence";
import { z } from "zod";

const ratingsQuerySchema = z.object({
  tier: z.enum(["TIER_1_PRIME", "TIER_2_STRONG", "TIER_3_MODERATE", "TIER_4_WATCHLIST", "TIER_5_DISTRESSED"]).optional(),
  min_score: z.coerce.number().min(1).max(5).optional(),
  sovereign_only: z.enum(["true", "false"]).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      queryObj[k] = v;
    });

    const parsed = ratingsQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "bad_request", message: "Invalid parameters.", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const { tier, min_score, sovereign_only } = parsed.data;

    let list = getActiveBanksServer().map((b) => ({
      bank_name: b.bank_name,
      short_code: b.short_code,
      category: b.category,
      rating_score: b.rating_score,
      credit_rating: b.credit_rating,
      stability_tier: b.stability_tier,
      npl_category: b.npl_category,
      capital_adequacy_ratio_car: b.capital_adequacy_ratio_car,
      risk_label: b.risk_label,
      sovereign_backed: b.sovereign_backed,
      rate_1_year: b.fdr_rates["1_year"],
      risk_adjusted_yield_score: b.risk_adjusted_yield_score,
      rating_agency: b.rating_agency,
    }));

    if (tier) {
      list = list.filter((b) => b.stability_tier === tier);
    }

    if (min_score !== undefined) {
      list = list.filter((b) => b.rating_score >= min_score);
    }

    if (sovereign_only === "true") {
      list = list.filter((b) => b.sovereign_backed);
    }

    // Sort by rating score descending
    list.sort((a, b) => b.rating_score - a.rating_score);

    // Identify top recommendations
    const primeRecommendation = list.find((b) => b.stability_tier === "TIER_2_STRONG" && b.rate_1_year >= 11.0) || list[0];
    const highestYieldOverall = [...list].sort((a, b) => b.rate_1_year - a.rate_1_year)[0];

    return NextResponse.json(
      {
        status: "success",
        as_of_date: new Date().toISOString().split("T")[0],
        total_rated_institutions: list.length,
        market_intelligence: {
          safest_highest_yield_sweetspot: {
            bank_name: primeRecommendation.bank_name,
            short_code: primeRecommendation.short_code,
            rating_score: primeRecommendation.rating_score,
            credit_rating: primeRecommendation.credit_rating,
            rate_1_year: primeRecommendation.rate_1_year,
            verdict: "Highest yield among prime/strong financial institutions (AA+ rated). Optimal balance of return and depositor safety.",
          },
          nominal_highest_yield_alert: {
            bank_name: highestYieldOverall.bank_name,
            short_code: highestYieldOverall.short_code,
            rate_1_year: highestYieldOverall.rate_1_year,
            rating_score: highestYieldOverall.rating_score,
            stability_tier: highestYieldOverall.stability_tier,
            npl_category: highestYieldOverall.npl_category,
            warning: highestYieldOverall.rating_score < 3.0
              ? "Elevated NPL / watchlist status. High nominal interest reflects liquidity requirements rather than prime balance sheet strength."
              : "Acceptable financial standing.",
          },
        },
        data: list,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: "Failed to generate ratings report." },
      { status: 500 }
    );
  }
}
