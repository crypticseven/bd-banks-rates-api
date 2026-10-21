import { NextRequest, NextResponse } from "next/server";
import { ALL_61_BANKS, filterBanks, calculateFdrMaturity } from "@/lib/bankRatesData";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || "ALL";
    const shariahParam = searchParams.get("shariah");
    const isShariah = shariahParam !== null ? shariahParam === "true" : undefined;
    const instantEncashmentOnly = searchParams.get("instant_encashment") === "true";
    const searchQuery = searchParams.get("q") || "";
    const tenure = (searchParams.get("tenure") || "1_year") as "3_months" | "6_months" | "1_year" | "3_years" | "5_years";
    const principalStr = searchParams.get("principal");
    const hasTin = searchParams.get("has_tin") !== "false";

    // Filter and sort by highest yield for selected tenure
    const filtered = filterBanks({
      category: category as any,
      isShariah,
      instantEncashmentOnly,
      searchQuery,
      sortByTenure: tenure,
    });

    const principal = principalStr ? parseFloat(principalStr) : null;
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
      const calculation = principal && !isNaN(principal) && principal > 0
        ? calculateFdrMaturity(principal, rate, months, hasTin)
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
