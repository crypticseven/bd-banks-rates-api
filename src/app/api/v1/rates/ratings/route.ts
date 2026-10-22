/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)
 * Copyright (c) 2024-2026 Fardin Ahsan Anik <fardinahsananik@gmail.com>. All Rights Reserved.
 *
 * COMMERCIAL STABILITY TIERS & RATINGS INTELLIGENCE ENDPOINT
 */

import { NextRequest, NextResponse } from "next/server";
import { getActiveBanksServer } from "@/lib/serverRatesPersistence";
import { validateCommercialHandshake, commercialUnauthorizedResponse, attachCommercialHeaders } from "@/lib/auth/commercialHandshake";
import { enforceRateLimit, detectMaliciousPayload, rateLimitExceededResponse, securityBlockResponse } from "@/lib/security/antiHackingGuard";
import { z } from "zod";
import crypto from "crypto";

const ratingsQuerySchema = z.object({
  tier: z.enum(["TIER_1_PRIME", "TIER_2_STRONG", "TIER_3_MODERATE", "TIER_4_WATCHLIST", "TIER_5_DISTRESSED"]).optional(),
  min_score: z.coerce.number().min(1).max(5).optional(),
  sovereign_only: z.enum(["true", "false"]).optional(),
});

export async function GET(req: NextRequest) {
  // 1. Anti-Hacking Guard: Intercept injection & malicious payload signatures
  const securityCheck = detectMaliciousPayload(req);
  if (!securityCheck.safe) {
    return securityBlockResponse(securityCheck.reason || "Payload failed security inspection.");
  }

  // 2. Commercial Credential Handshake Gateway
  const client = validateCommercialHandshake(req);
  if (!client.authorized) {
    return commercialUnauthorizedResponse(client.reason);
  }

  // 3. Sliding Token Bucket Rate Limiting per Tier
  const rateLimit = enforceRateLimit(client.clientId, client.rateLimitPerMinute);
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.resetSeconds);
  }

  try {
    const { searchParams } = new URL(req.url);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((v, k) => {
      queryObj[k] = v;
    });

    const parsed = ratingsQuerySchema.safeParse(queryObj);
    if (!parsed.success) {
      return NextResponse.json(
        { status: "bad_request", code: "VALIDATION_ERROR", message: "Invalid parameters.", errors: parsed.error.format() },
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
      npl_ratio_pct: b.npl_ratio_pct,
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

    // Dynamic algorithmic market intelligence
    const primeRecommendation = list.find((b) => (b.stability_tier === "TIER_1_PRIME" || b.stability_tier === "TIER_2_STRONG") && b.rate_1_year >= 8.0) || list[0];
    
    // Algorithmic turnaround candidate across all banks
    const turnaroundCandidates = list
      .filter((b) => b.npl_ratio_pct && b.npl_ratio_pct >= 10.0 && b.npl_ratio_pct <= 30.0)
      .sort((a, b) => b.rate_1_year - a.rate_1_year);
    const turnaroundRecommendation = turnaroundCandidates[0] || list.find((b) => b.short_code === "UCB") || list[0];

    const highestYieldOverall = [...list].sort((a, b) => b.rate_1_year - a.rate_1_year)[0];

    const requestId = crypto.randomUUID();

    const response = NextResponse.json(
      {
        status: "success",
        trademark: "Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)",
        licensing: "Proprietary Commercial License - Fardin Ahsan Anik <fardinahsananik@gmail.com>",
        as_of_date: new Date().toISOString().split("T")[0],
        request_id: requestId,
        client_context: {
          client_id: client.clientId,
          tier: client.tier,
          rate_limit_remaining: rateLimit.remaining,
        },
        total_rated_institutions: list.length,
        market_intelligence: {
          safest_highest_yield_sweetspot: {
            bank_name: primeRecommendation.bank_name,
            short_code: primeRecommendation.short_code,
            rating_score: primeRecommendation.rating_score,
            credit_rating: primeRecommendation.credit_rating,
            rate_1_year: primeRecommendation.rate_1_year,
            npl_ratio_pct: primeRecommendation.npl_ratio_pct,
            verdict: `Highest yield among prime financial institutions (${primeRecommendation.credit_rating} rated, NPL ${primeRecommendation.npl_ratio_pct}%). Optimal balance of return and depositor safety.`,
          },
          turnaround_high_yield_opportunity: {
            bank_name: turnaroundRecommendation.bank_name,
            short_code: turnaroundRecommendation.short_code,
            rate_1_year: turnaroundRecommendation.rate_1_year,
            npl_ratio_pct: turnaroundRecommendation.npl_ratio_pct,
            rating_score: turnaroundRecommendation.rating_score,
            credit_rating: turnaroundRecommendation.credit_rating,
            stability_tier: turnaroundRecommendation.stability_tier,
            verdict: `Algorithmic High-Yield Turnaround Leader: ${turnaroundRecommendation.bank_name} offers ${turnaroundRecommendation.rate_1_year}% on 1-year general retail term deposit with NPL at ${turnaroundRecommendation.npl_ratio_pct}%. Higher yield compensates for balance sheet transition under capital recovery plan.`,
          },
          nominal_highest_yield_alert: {
            bank_name: highestYieldOverall.bank_name,
            short_code: highestYieldOverall.short_code,
            rate_1_year: highestYieldOverall.rate_1_year,
            rating_score: highestYieldOverall.rating_score,
            stability_tier: highestYieldOverall.stability_tier,
            npl_category: highestYieldOverall.npl_category,
            npl_ratio_pct: highestYieldOverall.npl_ratio_pct,
            warning: highestYieldOverall.rating_score < 3.0
              ? `Elevated NPL (${highestYieldOverall.npl_ratio_pct}%) / watchlist status. High nominal interest reflects liquidity requirements rather than prime balance sheet strength.`
              : "Acceptable financial standing.",
          },
        },
        data: list,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
          "X-Request-ID": requestId,
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
        },
      }
    );

    return attachCommercialHeaders(response, client);
  } catch (error) {
    return NextResponse.json(
      { status: "error", code: "INTERNAL_ERROR", message: "Failed to generate ratings report." },
      { status: 500 }
    );
  }
}
