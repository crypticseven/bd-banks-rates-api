/**
 * Bangladesh Bank Rates Intelligence Platform™ (BDRIP-API™ / Anik FinTech Engine™)
 * Copyright (c) 2024-2026 Fardin Ahsan Anik <fardinahsananik@gmail.com>. All Rights Reserved.
 *
 * COMMERCIAL FIXED DEPOSIT & SAVINGS RATES ENGINE
 */

import { NextRequest, NextResponse } from "next/server";
import { ALL_61_BANKS, filterBanks, calculateFdrMaturity } from "@/lib/bankRatesData";
import { getActiveBanksServer } from "@/lib/serverRatesPersistence";
import { validateCommercialHandshake, commercialUnauthorizedResponse, attachCommercialHeaders } from "@/lib/auth/commercialHandshake";
import { enforceRateLimit, detectMaliciousPayload, rateLimitExceededResponse, securityBlockResponse } from "@/lib/security/antiHackingGuard";
import { z } from "zod";
import crypto from "crypto";

const querySchema = z.object({
  category: z
    .enum(["ALL", "STATE_OWNED", "SPECIALIZED", "CONVENTIONAL_PCB", "ISLAMIC", "FOREIGN"])
    .default("ALL"),
  tenure: z
    .enum(["3_months", "6_months", "1_year", "3_years", "5_years"])
    .default("1_year"),
  principal: z.coerce.number().finite().positive().max(100_000_000_000).optional(),
  has_tin: z.enum(["true", "false"]).default("true"),
  shariah: z.enum(["true", "false"]).optional(),
  instant_encashment: z.enum(["true", "false"]).optional(),
  min_rating: z.coerce.number().min(1).max(5).optional(),
  sort_by: z.enum(["yield", "risk_adjusted", "rating"]).default("yield"),
  q: z.string().trim().max(100).optional(),
  api_key: z.string().optional(),
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

    // Extract query parameters object for Zod validation
    const queryObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const parsedQuery = querySchema.safeParse(queryObj);

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          status: "bad_request",
          message: "Invalid query parameters provided.",
          errors: parsedQuery.error.format(),
        },
        { status: 400 }
      );
    }

    const {
      category,
      tenure,
      principal,
      has_tin,
      shariah,
      instant_encashment,
      min_rating,
      sort_by,
      q,
    } = parsedQuery.data;

    const isShariah = shariah !== undefined ? shariah === "true" : undefined;
    const instantEncashmentOnly = instant_encashment === "true";
    const hasTinBool = has_tin === "true";

    // Filter and sort using active live dataset
    const activeBanks = getActiveBanksServer();
    const filtered = filterBanks({
      category,
      isShariah,
      instantEncashmentOnly,
      searchQuery: q || "",
      sortByTenure: tenure,
      minRating: min_rating,
      sortBy: sort_by,
      customList: activeBanks,
    });

    const tenureMonthsMap: Record<string, number> = {
      "3_months": 3,
      "6_months": 6,
      "1_year": 12,
      "3_years": 36,
      "5_years": 60,
    };
    const months = tenureMonthsMap[tenure] || 12;

    const enrichedData = filtered.map((bank) => {
      const rate = bank.fdr_rates[tenure] || 0;
      const calculation = principal && principal > 0
        ? calculateFdrMaturity(principal, rate, months, hasTinBool)
        : null;

      return {
        ...bank,
        selected_tenure: tenure,
        current_rate: rate,
        maturity_calculation: calculation,
        // Include privileged supervisory risk audit for authorized clients
        commercial_supervisory_audit: {
          capital_adequacy: bank.capital_adequacy_ratio_car,
          npl_tier: bank.npl_category,
          npl_ratio_pct: bank.npl_ratio_pct,
          sovereign_guarantee: bank.sovereign_backed,
          stability_tier: bank.stability_tier,
          audit_verified: true,
        },
      };
    });

    // Dynamic Market Intelligence Computations
    const ucbRecord = enrichedData.find((b) => b.short_code === "UCB") ||
      activeBanks.find((b) => b.short_code === "UCB");
    const topYieldBank = enrichedData[0] || null;

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
        total_banks_tracked: ALL_61_BANKS.length,
        total_matched: enrichedData.length,
        sort_mode: sort_by,
        central_bank_benchmarks: {
          policy_repo_rate: "10.00%",
          standing_lending_facility_slf: "11.50%",
          standing_deposit_facility_sdf: "8.50%",
          interbank_call_money_rate_avg: "9.85%",
          nbr_withholding_tax_tin: "10%",
          nbr_withholding_tax_no_tin: "15%",
        },
        dynamic_market_intelligence: {
          turnaround_candidate: ucbRecord ? {
            bank_name: ucbRecord.bank_name,
            short_code: ucbRecord.short_code,
            rate_1_year: ucbRecord.fdr_rates["1_year"],
            rating_score: ucbRecord.rating_score,
            credit_rating: ucbRecord.credit_rating,
            npl_ratio_pct: ucbRecord.npl_ratio_pct,
            verdict: `Dynamic Turnaround Yield: ${ucbRecord.bank_name} offers ${ucbRecord.fdr_rates["1_year"]}% on 1-year general retail term deposit. NPL stands at ${ucbRecord.npl_ratio_pct}%. Higher yield balances active balance sheet transition under 5-year recovery plan.`,
          } : null,
          top_ranked_bank: topYieldBank ? {
            bank_name: topYieldBank.bank_name,
            short_code: topYieldBank.short_code,
            rate: topYieldBank.current_rate,
            rating_score: topYieldBank.rating_score,
            credit_rating: topYieldBank.credit_rating,
            tenure,
            category: topYieldBank.category,
          } : null,
        },
        data: enrichedData,
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
    console.error("Error serving commercial 61 banks rates API:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch bank rates dataset." },
      { status: 500 }
    );
  }
}
