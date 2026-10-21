import { NextRequest, NextResponse } from "next/server";
import { ALL_61_BANKS, filterBanks, calculateFdrMaturity } from "@/lib/bankRatesData";
import { z } from "zod";

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
  q: z.string().trim().max(100).optional(),
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

    // P1-6: Return structured 400 response on validation failure
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
      q,
    } = parsedQuery.data;

    const isShariah = shariah !== undefined ? shariah === "true" : undefined;
    const instantEncashmentOnly = instant_encashment === "true";
    const hasTinBool = has_tin === "true";

    // Filter and sort by highest yield for selected tenure
    const filtered = filterBanks({
      category: category as any,
      isShariah,
      instantEncashmentOnly,
      searchQuery: q || "",
      sortByTenure: tenure,
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
      };
    });

    return NextResponse.json(
      {
        status: "success",
        as_of_date: new Date().toISOString().split("T")[0],
        total_banks_tracked: ALL_61_BANKS.length,
        total_matched: enrichedData.length,
        central_bank_benchmarks: {
          policy_repo_rate: "8.50%",
          standing_lending_facility_slf: "10.00%",
          standing_deposit_facility_sdf: "7.00%",
          nbr_withholding_tax_tin: "10%",
          nbr_withholding_tax_no_tin: "15%",
        },
        top_yield_bank: enrichedData.length > 0 ? {
          bank_name: enrichedData[0].bank_name,
          short_code: enrichedData[0].short_code,
          rate: enrichedData[0].current_rate,
          tenure,
          category: enrichedData[0].category,
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
