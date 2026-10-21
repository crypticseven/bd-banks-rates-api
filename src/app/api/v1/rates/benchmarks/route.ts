import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  return NextResponse.json(
    {
      status: "success",
      as_of_date: new Date().toISOString().split("T")[0],
      regulatory_authority: "Bangladesh Bank (Central Bank of Bangladesh)",
      monetary_policy_benchmarks: {
        policy_repo_rate: 8.50,
        standing_lending_facility_slf: 10.00,
        standing_deposit_facility_sdf: 7.00,
        interbank_call_money_rate_avg: 9.85,
      },
      statutory_reserve_requirements: {
        cash_reserve_ratio_crr: "4.00%",
        statutory_liquidity_ratio_slr_conventional: "13.00%",
        statutory_liquidity_ratio_slr_islamic: "5.50%",
      },
      withholding_tax_regime: {
        statutory_body: "National Board of Revenue (NBR)",
        individual_with_tin: "10.00%",
        individual_without_tin: "15.00%",
        company_deposits: "20.00%",
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
}
