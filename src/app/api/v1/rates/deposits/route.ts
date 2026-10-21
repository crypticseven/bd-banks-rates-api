import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  ALL_61_BANKS,
  DATASET_PROVENANCE,
  filterBanks,
  calculateFdrMaturity,
} from "@/lib/bankRatesData";

const querySchema = z.object({
  category: z
    .enum(["ALL", "STATE_OWNED", "SPECIALIZED", "CONVENTIONAL_PCB", "ISLAMIC", "FOREIGN"])
    .default("ALL"),
  shariah: z.enum(["true", "false"]).optional(),
  instant_encashment: z.enum(["true", "false"]).default("false"),
  q: z.string().trim().max(100).default(""),
  tenure: z.enum(["3_months", "6_months", "1_year", "3_years", "5_years"]).default("1_year"),
  principal: z.coerce.number().finite().positive().max(1_000_000_000).optional(),
  has_tin: z.enum(["true", "false"]).default("true"),
});

export async function GET(req: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    if (
      DATASET_PROVENANCE.verification_status !== "verified" &&
      process.env.ALLOW_UNVERIFIED_DATA !== "true"
    ) {
      return NextResponse.json(
        {
          status: "error",
          code: "DATASET_NOT_VERIFIED",
          message: "Rate data is blocked until each record is verified against a dated official source.",
          request_id: requestId,
        },
        { status: 503, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId } }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams.entries()));

    if (!parsed.success) {
      return NextResponse.json(
        { status: "bad_request", code: "INVALID_QUERY", errors: parsed.error.format(), request_id: requestId },
        { status: 400, headers: { "X-Request-ID": requestId } }
      );
    }

    const {
      category,
      q: searchQuery,
      tenure,
      principal,
      has_tin: hasTinParam,
      shariah: shariahParam,
      instant_encashment: instantParam,
    } = parsed.data;
    const isShariah = shariahParam === undefined ? undefined : shariahParam === "true";
    const instantEncashmentOnly = instantParam === "true";
    const hasTin = hasTinParam === "true";

    // Filter and sort by highest yield for selected tenure
    const filtered = filterBanks({
      category,
      isShariah,
      instantEncashmentOnly,
      searchQuery,
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
      const calculation = principal
        ? calculateFdrMaturity(principal, rate, months, hasTin)
        : null;

      return {
        ...bank,
        provenance: DATASET_PROVENANCE,
        selected_tenure: tenure,
        current_rate: rate,
        maturity_calculation: calculation,
      };
    });

    return NextResponse.json(
      {
        status: "success",
        as_of_date: DATASET_PROVENANCE.effective_date,
        data_status: "unverified_static_snapshot",
        provenance: DATASET_PROVENANCE,
        total_banks_tracked: ALL_61_BANKS.length,
        total_matched: enrichedData.length,
        central_bank_benchmarks: {
          policy_repo_rate: "9.50%",
          standing_lending_facility_slf: "11.00%",
          standing_deposit_facility_sdf: "7.50%",
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
          "X-Request-ID": requestId,
        },
      }
    );
  } catch (error) {
    console.error("Error serving 61 banks rates API:", error);
    return NextResponse.json(
      { status: "error", code: "DATASET_READ_FAILED", message: "Failed to fetch bank rates dataset.", request_id: requestId },
      { status: 500, headers: { "X-Request-ID": requestId } }
    );
  }
}
