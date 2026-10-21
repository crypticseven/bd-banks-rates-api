import { NextRequest, NextResponse } from "next/server";
import { ALL_61_BANKS, filterBanks, calculateFdrMaturity } from "@/lib/bankRatesData";
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
      api_key,
    } = parsedQuery.data;

    // Check private key authentication using Double SHA-256 Constant-Time Verification
    const authHeader = req.headers.get("x-api-key") || req.headers.get("Authorization") || "";
    const bearerKey = authHeader.replace(/^Bearer\s+/i, "");
    const incomingKey = (api_key || req.headers.get("x-api-key") || bearerKey || "").trim();

    const rawPrivateSecret = process.env.PRIVATE_ACCESS_KEY || process.env.RATES_SYNC_SECRET;
    const preHashedPrivateSecret = process.env.PRIVATE_ACCESS_KEY_HASH;

    let isPrivateAuthorized = false;
    if (incomingKey && (rawPrivateSecret || preHashedPrivateSecret)) {
      try {
        const expectedHash = preHashedPrivateSecret
          ? Buffer.from(preHashedPrivateSecret, "hex")
          : crypto.createHash("sha256").update(rawPrivateSecret!).digest();

        const incomingHash = crypto.createHash("sha256").update(incomingKey).digest();

        if (expectedHash.length === 32 && crypto.timingSafeEqual(expectedHash, incomingHash)) {
          isPrivateAuthorized = true;
        }
      } catch {
        isPrivateAuthorized = false;
      }
    }

    const isShariah = shariah !== undefined ? shariah === "true" : undefined;
    const instantEncashmentOnly = instant_encashment === "true";
    const hasTinBool = has_tin === "true";

    // Filter and sort
    const filtered = filterBanks({
      category,
      isShariah,
      instantEncashmentOnly,
      searchQuery: q || "",
      sortByTenure: tenure,
      minRating: min_rating,
      sortBy: sort_by,
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
        // Include private risk audit if authorized
        private_supervisory_audit: isPrivateAuthorized
          ? {
              capital_adequacy: bank.capital_adequacy_ratio_car,
              npl_tier: bank.npl_category,
              sovereign_guarantee: bank.sovereign_backed,
              risk_tier: bank.stability_tier,
              audit_verified: true,
            }
          : undefined,
      };
    });

    // Market intelligence highlight
    const ucbRecord = enrichedData.find((b) => b.short_code === "UCB");
    const topYieldBank = enrichedData[0] || null;

    return NextResponse.json(
      {
        status: "success",
        as_of_date: new Date().toISOString().split("T")[0],
        total_banks_tracked: ALL_61_BANKS.length,
        total_matched: enrichedData.length,
        is_private_access: isPrivateAuthorized,
        sort_mode: sort_by,
        central_bank_benchmarks: {
          policy_repo_rate: "8.50%",
          standing_lending_facility_slf: "10.00%",
          standing_deposit_facility_sdf: "7.00%",
          nbr_withholding_tax_tin: "10%",
          nbr_withholding_tax_no_tin: "15%",
        },
        market_sweetspot: ucbRecord ? {
          bank_name: ucbRecord.bank_name,
          short_code: ucbRecord.short_code,
          rate: ucbRecord.fdr_rates["1_year"],
          rating_score: ucbRecord.rating_score,
          credit_rating: ucbRecord.credit_rating,
          verdict: "Recommended Prime-Yield Sweetspot: AA+ rated institution offering competitive top-tier yield (11.25% - 11.75%) with robust digital banking infrastructure.",
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
        data: enrichedData,
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
    console.error("Error serving 61 banks rates API:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to fetch bank rates dataset." },
      { status: 500 }
    );
  }
}
